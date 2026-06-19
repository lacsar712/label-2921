import { Router } from 'express';
import prisma from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { borrowSchema } from '../validators';

const router = Router();

// Get all borrow records
router.get('/', authenticate, async (req: AuthRequest, res) => {
  const borrows = await prisma.borrowRecord.findMany({
    include: { book: true, borrower: true },
    orderBy: { borrowDate: 'desc' },
  });
  res.json(borrows);
});

// Get current borrows (only BORROWED status)
router.get('/current', authenticate, async (req: AuthRequest, res) => {
  const borrows = await prisma.borrowRecord.findMany({
    where: { status: 'BORROWED' },
    include: {
      book: {
        include: { category: true }
      },
      borrower: true
    },
    orderBy: { borrowDate: 'desc' }
  });
  res.json(borrows);
});

// Borrow a book
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { bookId, borrowerId } = req.body;

    if (!borrowerId) {
      return res.status(400).json({ message: 'borrowerId is required' });
    }

    // Validate bookId
    const { bookId: validatedBookId } = borrowSchema.parse({
      bookId: Number(bookId),
    });

    // Check if the borrower exists
    const borrower = await prisma.borrower.findUnique({
      where: { id: Number(borrowerId) }
    });

    if (!borrower) {
      return res.status(404).json({ message: 'Borrower not found' });
    }

    const book = await prisma.book.findUnique({ where: { id: validatedBookId } });
    if (!book || book.stock <= 0) {
      return res.status(400).json({ message: 'Book out of stock' });
    }

    const [record] = await prisma.$transaction([
      prisma.borrowRecord.create({
        data: { bookId: validatedBookId, borrowerId: borrower.id, status: 'BORROWED' },
      }),
      prisma.book.update({
        where: { id: validatedBookId },
        data: { stock: { decrement: 1 } },
      }),
    ]);

    res.status(201).json(record);
  } catch (_error) {
    res.status(400).json({ message: 'Failed to borrow', error: (_error as any).message });
  }
});

// Return a book
router.post('/:id/return', authenticate, async (req, res) => {
  try {
    const record = await prisma.borrowRecord.findUnique({ where: { id: Number(req.params.id) } });
    if (!record || record.status === 'RETURNED') {
      return res.status(400).json({ message: 'Invalid record' });
    }

    await prisma.$transaction([
      prisma.borrowRecord.update({
        where: { id: record.id },
        data: { status: 'RETURNED', returnDate: new Date() },
      }),
      prisma.book.update({
        where: { id: record.bookId },
        data: { stock: { increment: 1 } },
      }),
    ]);

    res.json({ message: 'Book returned' });
  } catch (_error) {
    res.status(400).json({ message: 'Failed to return', error: (_error as any).message });
  }
});

export default router;
