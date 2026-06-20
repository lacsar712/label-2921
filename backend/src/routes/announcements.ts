import { Router } from 'express';
import prisma from '../utils/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { Role, AnnouncementStatus, AnnouncementScope } from '@prisma/client';
import { announcementSchema, announcementUpdateSchema, announcementQuerySchema } from '../validators';

const router = Router();

const autoArchiveExpired = async () => {
  const now = new Date();
  await prisma.announcement.updateMany({
    where: {
      status: AnnouncementStatus.PUBLISHED,
      expireAt: { not: null, lte: now }
    },
    data: { status: AnnouncementStatus.ARCHIVED }
  });
};

router.get('/active', authenticate, async (req: AuthRequest, res) => {
  try {
    await autoArchiveExpired();
    const now = new Date();
    const userRole = req.user?.role;

    const where: any = {
      status: AnnouncementStatus.PUBLISHED,
      AND: [
        {
          OR: [
            { publishAt: null },
            { publishAt: { lte: now } }
          ]
        },
        {
          OR: [
            { expireAt: null },
            { expireAt: { gt: now } }
          ]
        }
      ]
    };

    if (userRole) {
      where.AND.push({
        OR: [
          { scope: AnnouncementScope.ALL },
          { scope: userRole as any }
        ]
      });
    } else {
      where.scope = AnnouncementScope.ALL;
    }

    const announcements = await prisma.announcement.findMany({
      where,
      orderBy: [
        { isPinned: 'desc' },
        { pinWeight: 'desc' },
        { publishAt: 'desc' },
        { createdAt: 'desc' }
      ],
      include: {
        createdBy: {
          select: {
            id: true,
            username: true
          }
        }
      }
    });

    res.json(announcements);
  } catch (_error) {
    res.status(500).json({ message: 'Failed to fetch active announcements' });
  }
});

router.get('/', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req: AuthRequest, res) => {
  try {
    await autoArchiveExpired();
    const query = announcementQuerySchema.parse(req.query);
    const page = query.page || 1;
    const pageSize = query.pageSize || 10;

    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.scope) {
      where.scope = query.scope;
    }

    if (query.keyword) {
      where.OR = [
        { title: { contains: query.keyword, mode: 'insensitive' } },
        { summary: { contains: query.keyword, mode: 'insensitive' } }
      ];
    }

    if (query.isPinned !== undefined) {
      where.isPinned = query.isPinned;
    }

    const [total, announcements] = await Promise.all([
      prisma.announcement.count({ where }),
      prisma.announcement.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [
          { isPinned: 'desc' },
          { pinWeight: 'desc' },
          { createdAt: 'desc' }
        ],
        include: {
          createdBy: {
            select: {
              id: true,
              username: true
            }
          }
        }
      })
    ]);

    res.json({
      data: announcements,
      total,
      page,
      pageSize
    });
  } catch (_error) {
    res.status(500).json({ message: 'Failed to fetch announcements', error: (_error as any).message });
  }
});

router.get('/:id', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req, res) => {
  try {
    await autoArchiveExpired();
    const announcement = await prisma.announcement.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true
          }
        }
      }
    });

    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    res.json(announcement);
  } catch (_error) {
    res.status(500).json({ message: 'Failed to fetch announcement' });
  }
});

router.post('/', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req: AuthRequest, res) => {
  try {
    const payload = announcementSchema.parse(req.body);

    const data: any = {
      title: payload.title,
      summary: payload.summary,
      content: payload.content,
      contentType: payload.contentType || 'markdown',
      coverImage: payload.coverImage,
      scope: payload.scope || AnnouncementScope.ALL,
      status: payload.status || AnnouncementStatus.DRAFT,
      isPinned: payload.isPinned || false,
      pinWeight: payload.pinWeight || 0,
      createdById: req.user?.id
    };

    if (payload.publishAt) {
      data.publishAt = new Date(payload.publishAt);
    }

    if (payload.expireAt) {
      data.expireAt = new Date(payload.expireAt);
    }

    const announcement = await prisma.announcement.create({ data });
    res.status(201).json(announcement);
  } catch (_error) {
    res.status(400).json({ message: 'Failed to create announcement', error: (_error as any).message });
  }
});

router.put('/:id', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req, res) => {
  try {
    const payload = announcementUpdateSchema.parse(req.body);

    const data: any = { ...payload };

    if (payload.publishAt) {
      data.publishAt = new Date(payload.publishAt);
    } else if (payload.publishAt === null) {
      data.publishAt = null;
    }

    if (payload.expireAt) {
      data.expireAt = new Date(payload.expireAt);
    } else if (payload.expireAt === null) {
      data.expireAt = null;
    }

    const announcement = await prisma.announcement.update({
      where: { id: Number(req.params.id) },
      data
    });

    res.json(announcement);
  } catch (_error) {
    res.status(400).json({ message: 'Failed to update announcement', error: (_error as any).message });
  }
});

router.patch('/:id/status', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req, res) => {
  try {
    const { status } = req.body;

    if (!['DRAFT', 'PENDING', 'PUBLISHED', 'ARCHIVED'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const announcement = await prisma.announcement.update({
      where: { id: Number(req.params.id) },
      data: { status: status as AnnouncementStatus }
    });

    res.json(announcement);
  } catch (_error) {
    res.status(400).json({ message: 'Failed to update announcement status' });
  }
});

router.delete('/:id', authenticate, authorize([Role.ADMIN]), async (req, res) => {
  try {
    await prisma.announcement.delete({
      where: { id: Number(req.params.id) }
    });

    res.json({ message: 'Announcement deleted' });
  } catch (_error) {
    res.status(400).json({ message: 'Failed to delete announcement' });
  }
});

router.post('/:id/publish', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req, res) => {
  try {
    const announcement = await prisma.announcement.update({
      where: { id: Number(req.params.id) },
      data: {
        status: AnnouncementStatus.PUBLISHED,
        publishAt: req.body.publishAt ? new Date(req.body.publishAt) : new Date()
      }
    });

    res.json(announcement);
  } catch (_error) {
    res.status(400).json({ message: 'Failed to publish announcement' });
  }
});

router.post('/:id/archive', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req, res) => {
  try {
    const announcement = await prisma.announcement.update({
      where: { id: Number(req.params.id) },
      data: { status: AnnouncementStatus.ARCHIVED }
    });

    res.json(announcement);
  } catch (_error) {
    res.status(400).json({ message: 'Failed to archive announcement' });
  }
});

export default router;
