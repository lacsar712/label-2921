import { Router } from 'express';
import prisma from '../utils/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { Role } from '@prisma/client';
import { bookSchema, bookUpdateSchema } from '../validators';

const router = Router();

/**
 * @route GET /api/books
 * @desc Get all books with optional category filter and search
 * @access Public
 */
router.get('/', async (req, res) => {
  const { categoryId, search } = req.query;
  const books = await prisma.book.findMany({
    where: {
      ...(categoryId ? { categoryId: Number(categoryId) } : {}),
      ...(search ? {
        OR: [
          { title: { contains: String(search) } },
          { author: { contains: String(search) } },
          { isbn: { contains: String(search) } },
        ]
      } : {}),
    },
    include: { category: true },
  });
  res.json(books);
});

/**
 * @route GET /api/books/:id
 * @desc Get a single book by ID
 * @access Public
 */
router.get('/:id', async (req, res) => {
  const book = await prisma.book.findUnique({
    where: { id: Number(req.params.id) },
    include: { category: true },
  });
  if (!book) return res.status(404).json({ message: 'Book not found' });
  res.json(book);
});

/**
 * @route POST /api/books
 * @desc Create a new book
 * @access Admin, Librarian
 */
router.post('/', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req, res) => {
  try {
    const payload = bookSchema.parse({
      ...req.body,
      categoryId: Number(req.body.categoryId),
      price: Number(req.body.price),
      stock: Number(req.body.stock),
    });
    const book = await prisma.book.create({
      data: payload,
    });
    res.status(201).json(book);
  } catch (_error) {
    res.status(400).json({ message: 'Failed to create book', error: (_error as any).message });
  }
});

/**
 * @route PUT /api/books/:id
 * @desc Update an existing book
 * @access Admin, Librarian
 */
router.put('/:id', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req, res) => {
  try {
    const payload = bookUpdateSchema.parse({
      ...req.body,
      price: req.body.price !== undefined ? Number(req.body.price) : undefined,
      stock: req.body.stock !== undefined ? Number(req.body.stock) : undefined,
      categoryId: req.body.categoryId !== undefined ? Number(req.body.categoryId) : undefined,
    });
    const book = await prisma.book.update({
      where: { id: Number(req.params.id) },
      data: payload,
    });
    res.json(book);
  } catch (_error) {
    res.status(400).json({ message: 'Failed to update book', error: (_error as any).message });
  }
});

/**
 * @route DELETE /api/books/:id
 * @desc Delete a book
 * @access Admin
 */
router.delete('/:id', authenticate, authorize([Role.ADMIN]), async (req, res) => {
  try {
    await prisma.book.delete({
      where: { id: Number(req.params.id) },
    });
    res.json({ message: 'Book deleted' });
  } catch (_error) {
    res.status(400).json({ message: 'Failed to delete book' });
  }
});

/**
 * @route GET /api/books/:id/borrow-count
 * @desc Get current borrow count for a specific book
 * @access Admin, Librarian
 */
router.get('/:id/borrow-count', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req, res) => {
  try {
    const count = await prisma.borrowRecord.count({
      where: {
        bookId: Number(req.params.id),
        status: 'BORROWED'
      }
    });
    res.json({ count });
  } catch (_error) {
    res.status(400).json({ message: 'Failed to get borrow count' });
  }
});

// Get book current borrow records
router.get('/:id/current-borrows', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req, res) => {
  try {
    const records = await prisma.borrowRecord.findMany({
      where: {
        bookId: Number(req.params.id),
        status: 'BORROWED'
      },
      include: {
        borrower: true
      }
    });
    res.json(records);
  } catch (error) {
    res.status(400).json({ message: 'Failed to get borrow records' });
  }
});

export default router;
