import { Router } from 'express';
import prisma from '../utils/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { Role } from '@prisma/client';
import { publisherSchema, publisherUpdateSchema } from '../validators';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { search, cooperationLevel } = req.query;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: String(search) } },
        { location: { contains: String(search) } },
      ];
    }

    if (cooperationLevel) {
      where.cooperationLevel = String(cooperationLevel);
    }

    const now = new Date();
    const oneMonthAgo = new Date(now);
    oneMonthAgo.setMonth(now.getMonth() - 1);

    const publishers = await prisma.publisher.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { books: true },
        },
        books: {
          select: {
            stock: true,
            borrows: {
              where: {
                borrowDate: {
                  gte: oneMonthAgo,
                },
              },
              select: { id: true },
            },
          },
        },
      },
    });

    const publishersWithStats = publishers.map((pub) => {
      const totalStock = pub.books.reduce((sum, b) => sum + b.stock, 0);
      const recentBorrowCount = pub.books.reduce((sum, b) => sum + b.borrows.length, 0);
      return {
        id: pub.id,
        name: pub.name,
        location: pub.location,
        postalCode: pub.postalCode,
        phone: pub.phone,
        website: pub.website,
        cooperationLevel: pub.cooperationLevel,
        createdAt: pub.createdAt,
        updatedAt: pub.updatedAt,
        bookCount: pub._count.books,
        totalStock,
        recentBorrowCount,
      };
    });

    res.json(publishersWithStats);
  } catch (_error) {
    res.status(400).json({ message: '获取出版社列表失败', error: (_error as any).message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const publisherId = Number(req.params.id);
    const { sortBy = 'stock', sortOrder = 'desc' } = req.query;

    const publisher = await prisma.publisher.findUnique({
      where: { id: publisherId },
      include: {
        books: {
          include: {
            category: true,
            borrows: true,
          },
        },
      },
    });

    if (!publisher) {
      return res.status(404).json({ message: '出版社不存在' });
    }

    const now = new Date();
    const oneMonthAgo = new Date(now);
    oneMonthAgo.setMonth(now.getMonth() - 1);

    let books = publisher.books.map((book) => {
      const recentBorrows = book.borrows.filter(
        (b) => new Date(b.borrowDate) >= oneMonthAgo
      ).length;
      return {
        id: book.id,
        title: book.title,
        author: book.author,
        isbn: book.isbn,
        stock: book.stock,
        price: book.price,
        category: book.category.name,
        totalBorrows: book.borrows.length,
        recentBorrows,
      };
    });

    if (sortBy === 'stock') {
      books.sort((a, b) => sortOrder === 'desc' ? b.stock - a.stock : a.stock - b.stock);
    } else if (sortBy === 'borrow') {
      books.sort((a, b) => sortOrder === 'desc' ? b.totalBorrows - a.totalBorrows : a.totalBorrows - b.totalBorrows);
    }

    const totalStock = books.reduce((sum, b) => sum + b.stock, 0);
    const totalBorrows = books.reduce((sum, b) => sum + b.totalBorrows, 0);
    const recentBorrowCount = books.reduce((sum, b) => sum + b.recentBorrows, 0);

    res.json({
      id: publisher.id,
      name: publisher.name,
      location: publisher.location,
      postalCode: publisher.postalCode,
      phone: publisher.phone,
      website: publisher.website,
      cooperationLevel: publisher.cooperationLevel,
      createdAt: publisher.createdAt,
      updatedAt: publisher.updatedAt,
      books,
      statistics: {
        bookCount: books.length,
        totalStock,
        totalBorrows,
        recentBorrowCount,
      },
    });
  } catch (_error) {
    res.status(400).json({ message: '获取出版社详情失败', error: (_error as any).message });
  }
});

router.post('/', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req, res) => {
  try {
    const payload = publisherSchema.parse(req.body);
    const publisher = await prisma.publisher.create({ data: payload });
    res.status(201).json(publisher);
  } catch (_error) {
    res.status(400).json({ message: '创建出版社失败', error: (_error as any).message });
  }
});

router.put('/:id', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req, res) => {
  try {
    const publisherId = Number(req.params.id);
    const payload = publisherUpdateSchema.parse(req.body);
    const publisher = await prisma.publisher.update({
      where: { id: publisherId },
      data: payload,
    });
    res.json(publisher);
  } catch (_error) {
    res.status(400).json({ message: '更新出版社失败', error: (_error as any).message });
  }
});

router.delete('/:id', authenticate, authorize([Role.ADMIN]), async (req, res) => {
  try {
    const publisherId = Number(req.params.id);

    const bookCount = await prisma.book.count({ where: { publisherId } });
    if (bookCount > 0) {
      return res.status(400).json({
        message: '该出版社已关联图书，无法删除',
      });
    }

    await prisma.publisher.delete({ where: { id: publisherId } });
    res.json({ message: '出版社已删除' });
  } catch (_error) {
    res.status(400).json({ message: '删除出版社失败', error: (_error as any).message });
  }
});

export default router;
