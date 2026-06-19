import { Router } from 'express';
import prisma from '../utils/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { Role } from '@prisma/client';
import { bookReviewSchema, bookReviewUpdateSchema, bookReviewReplySchema } from '../validators';

const router = Router();

const DEFAULT_REVIEW_EDIT_DAYS = 30;

const getReviewEditDays = async () => {
  const setting = await prisma.systemSettings.findUnique({
    where: { key: 'reviewEditDays' },
  });
  return setting ? parseInt(setting.value) : DEFAULT_REVIEW_EDIT_DAYS;
};

const isWithinEditWindow = (createdAt: Date, editDays: number): boolean => {
  const now = new Date();
  const deadline = new Date(createdAt);
  deadline.setDate(deadline.getDate() + editDays);
  return now <= deadline;
};

router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { borrowRecordId, rating, comment } = bookReviewSchema.parse(req.body);

    const borrowRecord = await prisma.borrowRecord.findUnique({
      where: { id: borrowRecordId },
      include: { review: true },
    });

    if (!borrowRecord) {
      return res.status(404).json({ message: '借阅记录不存在' });
    }

    if (borrowRecord.status !== 'RETURNED') {
      return res.status(400).json({ message: '借阅记录未归还，暂不可评价' });
    }

    if (borrowRecord.review) {
      return res.status(400).json({ message: '该借阅记录已评价过，不可重复评价' });
    }

    const isComplaint = rating <= 2;

    const review = await prisma.bookReview.create({
      data: {
        bookId: borrowRecord.bookId,
        borrowerId: borrowRecord.borrowerId,
        borrowRecordId,
        rating,
        comment,
        isComplaint,
      },
      include: {
        borrower: true,
        book: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    res.status(201).json(review);
  } catch (_error) {
    res.status(400).json({ message: '提交评价失败', error: (_error as any).message });
  }
});

router.put('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const reviewId = Number(req.params.id);
    const payload = bookReviewUpdateSchema.parse(req.body);

    const existingReview = await prisma.bookReview.findUnique({
      where: { id: reviewId },
    });

    if (!existingReview) {
      return res.status(404).json({ message: '评价不存在' });
    }

    const editDays = await getReviewEditDays();
    if (!isWithinEditWindow(existingReview.createdAt, editDays)) {
      return res.status(400).json({
        message: `评价已超过可修改期限（${editDays}天），不可修改`,
      });
    }

    const finalData: any = { ...payload };
    if (payload.rating !== undefined) {
      finalData.isComplaint = payload.rating <= 2;
    }

    const updatedReview = await prisma.bookReview.update({
      where: { id: reviewId },
      data: finalData,
      include: {
        borrower: true,
        book: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    res.json(updatedReview);
  } catch (_error) {
    res.status(400).json({ message: '修改评价失败', error: (_error as any).message });
  }
});

router.get('/', authenticate, async (req: AuthRequest, res) => {
  const {
    rating,
    keyword,
    startDate,
    endDate,
    isComplaint,
    hasOfficialReply,
    bookId,
    page = 1,
    pageSize = 20,
  } = req.query;

  const where: any = {};

  if (rating) {
    where.rating = Number(rating);
  }

  if (keyword) {
    where.OR = [
      { comment: { contains: String(keyword) } },
      {
        book: {
          title: { contains: String(keyword) },
        },
      },
      {
        borrower: {
          name: { contains: String(keyword) },
        },
      },
    ];
  }

  if (startDate) {
    where.createdAt = { ...where.createdAt, gte: new Date(String(startDate)) };
  }

  if (endDate) {
    const end = new Date(String(endDate));
    end.setHours(23, 59, 59, 999);
    where.createdAt = { ...where.createdAt, lte: end };
  }

  if (isComplaint !== undefined) {
    where.isComplaint = String(isComplaint) === 'true';
  }

  if (hasOfficialReply !== undefined) {
    where.officialReply = String(hasOfficialReply) === 'true'
      ? { not: null }
      : null;
  }

  if (bookId) {
    where.bookId = Number(bookId);
  }

  const skip = (Number(page) - 1) * Number(pageSize);
  const take = Number(pageSize);

  const [reviews, total] = await Promise.all([
    prisma.bookReview.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        borrower: true,
        book: {
          select: {
            id: true,
            title: true,
            author: true,
          },
        },
        officialReplyBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    }),
    prisma.bookReview.count({ where }),
  ]);

  res.json({
    data: reviews,
    total,
    page: Number(page),
    pageSize: Number(pageSize),
  });
});

router.get('/summary', authenticate, async (_req: AuthRequest, res) => {
  try {
    const allReviews = await prisma.bookReview.findMany({
      include: {
        book: {
          select: {
            id: true,
            title: true,
            author: true,
            isbn: true,
          },
        },
      },
    });

    const bookMap = new Map<number, {
      bookId: number;
      title: string;
      author: string;
      isbn: string;
      reviews: typeof allReviews;
      avgRating: number;
      reviewCount: number;
      ratingDistribution: Record<number, number>;
      complaintCount: number;
      unrepliedCount: number;
    }>();

    for (const review of allReviews) {
      if (!bookMap.has(review.bookId)) {
        bookMap.set(review.bookId, {
          bookId: review.bookId,
          title: review.book.title,
          author: review.book.author,
          isbn: review.book.isbn,
          reviews: [],
          avgRating: 0,
          reviewCount: 0,
          ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          complaintCount: 0,
          unrepliedCount: 0,
        });
      }
      const entry = bookMap.get(review.bookId)!;
      entry.reviews.push(review);
    }

    const summary = Array.from(bookMap.values()).map((entry) => {
      const total = entry.reviews.length;
      const sum = entry.reviews.reduce((acc, r) => acc + r.rating, 0);
      entry.reviewCount = total;
      entry.avgRating = total > 0 ? parseFloat((sum / total).toFixed(2)) : 0;
      for (const r of entry.reviews) {
        entry.ratingDistribution[r.rating] = (entry.ratingDistribution[r.rating] || 0) + 1;
        if (r.isComplaint) entry.complaintCount++;
        if (r.isComplaint && !r.officialReply) entry.unrepliedCount++;
      }
      delete (entry as any).reviews;
      return entry;
    });

    summary.sort((a, b) => b.reviewCount - a.reviewCount);

    res.json(summary);
  } catch (_error) {
    res.status(400).json({ message: '获取评价汇总失败', error: (_error as any).message });
  }
});

router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  const review = await prisma.bookReview.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      borrower: true,
      book: {
        select: {
          id: true,
          title: true,
          author: true,
          isbn: true,
        },
      },
      officialReplyBy: {
        select: {
          id: true,
          username: true,
        },
      },
    },
  });

  if (!review) {
    return res.status(404).json({ message: '评价不存在' });
  }

  res.json(review);
});

router.post('/:id/reply', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req: AuthRequest, res) => {
  try {
    const reviewId = Number(req.params.id);
    const { reply } = bookReviewReplySchema.parse(req.body);

    const existingReview = await prisma.bookReview.findUnique({
      where: { id: reviewId },
    });

    if (!existingReview) {
      return res.status(404).json({ message: '评价不存在' });
    }

    const updatedReview = await prisma.bookReview.update({
      where: { id: reviewId },
      data: {
        officialReply: reply,
        officialReplyAt: new Date(),
        officialReplyById: req.user?.id,
      },
      include: {
        borrower: true,
        book: {
          select: {
            id: true,
            title: true,
          },
        },
        officialReplyBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    res.json(updatedReview);
  } catch (_error) {
    res.status(400).json({ message: '回复评价失败', error: (_error as any).message });
  }
});

router.get('/borrower/:borrowerId/eligible', authenticate, async (req: AuthRequest, res) => {
  try {
    const borrowerId = Number(req.params.borrowerId);

    const returnedRecords = await prisma.borrowRecord.findMany({
      where: {
        borrowerId,
        status: 'RETURNED',
        review: null,
      },
      include: {
        book: {
          select: {
            id: true,
            title: true,
            author: true,
            isbn: true,
          },
        },
      },
      orderBy: { returnDate: 'desc' },
    });

    res.json(returnedRecords);
  } catch (_error) {
    res.status(400).json({ message: '获取可评价借阅记录失败' });
  }
});

router.get('/edit-config', authenticate, async (_req: AuthRequest, res) => {
  const editDays = await getReviewEditDays();
  res.json({ editDays });
});

export default router;
