import { Router } from 'express';
import prisma from '../utils/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { Role } from '@prisma/client';
import { tagSchema, tagUpdateSchema, tagMergeSchema } from '../validators';

const router = Router();

router.get('/', async (req, res) => {
  const { sortBy = 'sortOrder', sortOrder = 'asc' } = req.query;
  const tags = await prisma.tag.findMany({
    orderBy: {
      [String(sortBy)]: sortOrder === 'desc' ? 'desc' : 'asc',
    },
    include: {
      _count: {
        select: { bookTags: true },
      },
    },
  });
  res.json(tags);
});

router.get('/hot', async (req, res) => {
  const { limit = 10 } = req.query;
  const tags = await prisma.tag.findMany({
    take: Number(limit),
    orderBy: {
      bookTags: {
        _count: 'desc',
      },
    },
    include: {
      _count: {
        select: { bookTags: true },
      },
    },
  });
  res.json(tags);
});

router.get('/with-stats', async (req, res) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const tags = await prisma.tag.findMany({
    orderBy: { sortOrder: 'asc' },
    include: {
      _count: {
        select: { bookTags: true },
      },
      bookTags: {
        include: {
          book: {
            include: {
              borrows: {
                where: {
                  borrowDate: {
                    gte: thirtyDaysAgo,
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const tagsWithStats = tags.map((tag) => {
    const borrowCount = tag.bookTags.reduce((total, bookTag) => {
      return total + bookTag.book.borrows.length;
    }, 0);
    return {
      id: tag.id,
      name: tag.name,
      color: tag.color,
      description: tag.description,
      sortOrder: tag.sortOrder,
      bookCount: tag._count.bookTags,
      recentBorrowCount: borrowCount,
    };
  });

  res.json(tagsWithStats);
});

router.get('/:id', async (req, res) => {
  const tag = await prisma.tag.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      _count: {
        select: { bookTags: true },
      },
    },
  });
  if (!tag) return res.status(404).json({ message: 'Tag not found' });
  res.json(tag);
});

router.post('/', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req, res) => {
  try {
    const payload = tagSchema.parse(req.body);
    const tag = await prisma.tag.create({ data: payload });
    res.status(201).json(tag);
  } catch (_error) {
    res.status(400).json({ message: 'Failed to create tag', error: (_error as any).message });
  }
});

router.put('/:id', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req, res) => {
  try {
    const payload = tagUpdateSchema.parse(req.body);
    const tag = await prisma.tag.update({
      where: { id: Number(req.params.id) },
      data: payload,
    });
    res.json(tag);
  } catch (_error) {
    res.status(400).json({ message: 'Failed to update tag', error: (_error as any).message });
  }
});

router.delete('/:id', authenticate, authorize([Role.ADMIN]), async (req, res) => {
  try {
    const tagId = Number(req.params.id);
    await prisma.$transaction([
      prisma.bookTag.deleteMany({ where: { tagId } }),
      prisma.tag.delete({ where: { id: tagId } }),
    ]);
    res.json({ message: 'Tag deleted' });
  } catch (_error) {
    res.status(400).json({ message: 'Failed to delete tag' });
  }
});

router.post('/merge', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req, res) => {
  try {
    const { sourceTagIds, targetTagId } = tagMergeSchema.parse(req.body);

    const affectedBooks = await prisma.bookTag.findMany({
      where: { tagId: { in: sourceTagIds } },
      select: { bookId: true },
      distinct: ['bookId'],
    });

    await prisma.$transaction(async (tx) => {
      for (const book of affectedBooks) {
        const existing = await tx.bookTag.findUnique({
          where: { bookId_tagId: { bookId: book.bookId, tagId: targetTagId } },
        });
        if (!existing) {
          await tx.bookTag.create({
            data: { bookId: book.bookId, tagId: targetTagId },
          });
        }
      }

      await tx.bookTag.deleteMany({
        where: { tagId: { in: sourceTagIds } },
      });

      for (const sourceId of sourceTagIds) {
        await tx.tag.delete({ where: { id: sourceId } });
      }
    });

    res.json({
      message: 'Tags merged successfully',
      affectedBookCount: affectedBooks.length,
    });
  } catch (_error) {
    res.status(400).json({ message: 'Failed to merge tags', error: (_error as any).message });
  }
});

router.post('/merge/preview', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req, res) => {
  try {
    const { sourceTagIds } = req.body;
    const ids = Array.isArray(sourceTagIds) ? sourceTagIds.map(Number) : [];

    const affectedBooks = await prisma.bookTag.findMany({
      where: { tagId: { in: ids } },
      include: {
        book: {
          select: { id: true, title: true, isbn: true },
        },
      },
      distinct: ['bookId'],
    });

    const sourceTags = await prisma.tag.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true },
    });

    res.json({
      sourceTags,
      affectedBookCount: affectedBooks.length,
      affectedBooks: affectedBooks.map((ab) => ab.book),
    });
  } catch (_error) {
    res.status(400).json({ message: 'Failed to preview merge', error: (_error as any).message });
  }
});

export default router;
