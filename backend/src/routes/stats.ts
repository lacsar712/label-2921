import { Router } from 'express';
import prisma from '../utils/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

router.get('/dashboard', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req, res) => {
  const [bookCount, userCount, borrowCount, categoryCount] = await Promise.all([
    prisma.book.count(),
    prisma.borrower.count(),
    prisma.borrowRecord.count({ where: { status: 'BORROWED' } }),
    prisma.category.count(),
  ]);

  // Borrow trends (last 7 days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  }).reverse();

  const trends = await Promise.all(last7Days.map(async (date) => {
    const count = await prisma.borrowRecord.count({
      where: {
        borrowDate: {
          gte: new Date(date),
          lt: new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000),
        },
      },
    });
    return { date, count };
  }));

  // Category distribution
  const categories = await prisma.category.findMany({
    include: { _count: { select: { books: true } } },
  });

  // Low stock books (stock < 5)
  const lowStockBooks = await prisma.book.findMany({
    where: { stock: { lt: 5 } },
    take: 5,
    include: { category: true }
  });

  res.json({
    summary: { bookCount, userCount, borrowCount, categoryCount },
    trends,
    categories: categories.map(c => ({ name: c.name, count: c._count.books })),
    lowStockBooks
  });
});

export default router;
