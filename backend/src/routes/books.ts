import { Router } from 'express';
import prisma from '../utils/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { Role } from '@prisma/client';
import { bookSchema, bookUpdateSchema, bookTagSchema } from '../validators';

const router = Router();

router.get('/', async (req, res) => {
  const { categoryId, search, tagIds, tagFilterMode = 'intersection' } = req.query;
  
  const tagIdArray = tagIds 
    ? Array.isArray(tagIds) 
      ? tagIds.map(Number) 
      : String(tagIds).split(',').map(Number).filter(Boolean)
    : [];

  const where: any = {
    ...(categoryId ? { categoryId: Number(categoryId) } : {}),
    ...(search ? {
      OR: [
        { title: { contains: String(search) } },
        { author: { contains: String(search) } },
        { isbn: { contains: String(search) } },
      ]
    } : {}),
  };

  if (tagIdArray.length > 0) {
    if (tagFilterMode === 'union') {
      where.bookTags = {
        some: {
          tagId: { in: tagIdArray },
        },
      };
    } else {
      where.AND = tagIdArray.map((tagId: number) => ({
        bookTags: {
          some: { tagId },
        },
      }));
    }
  }

  const books = await prisma.book.findMany({
    where,
    include: {
      category: true,
      bookTags: {
        include: { tag: true },
      },
    },
  });

  const booksWithTags = books.map((book) => ({
    ...book,
    tags: book.bookTags.map((bt) => bt.tag),
  }));

  res.json(booksWithTags);
});

router.get('/:id', async (req, res) => {
  const book = await prisma.book.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      category: true,
      bookTags: {
        include: { tag: true },
      },
    },
  });
  if (!book) return res.status(404).json({ message: 'Book not found' });
  
  const bookWithTags = {
    ...book,
    tags: book.bookTags.map((bt) => bt.tag),
  };
  
  res.json(bookWithTags);
});

router.post('/', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req, res) => {
  try {
    const { tagIds, ...bookData } = req.body;
    const payload = bookSchema.parse({
      ...bookData,
      categoryId: Number(bookData.categoryId),
      price: Number(bookData.price),
      stock: Number(bookData.stock),
    });

    const tagIdsArray = Array.isArray(tagIds) ? tagIds.map(Number) : [];

    const book = await prisma.book.create({
      data: {
        ...payload,
        bookTags: tagIdsArray.length > 0
          ? {
              create: tagIdsArray.map((tagId: number) => ({
                tag: { connect: { id: tagId } },
              })),
            }
          : undefined,
      },
      include: {
        bookTags: {
          include: { tag: true },
        },
      },
    });

    const bookWithTags = {
      ...book,
      tags: book.bookTags.map((bt) => bt.tag),
    };

    res.status(201).json(bookWithTags);
  } catch (_error) {
    res.status(400).json({ message: 'Failed to create book', error: (_error as any).message });
  }
});

router.put('/:id', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req, res) => {
  try {
    const bookId = Number(req.params.id);
    const { tagIds, ...bookData } = req.body;
    
    const payload = bookUpdateSchema.parse({
      ...bookData,
      price: bookData.price !== undefined ? Number(bookData.price) : undefined,
      stock: bookData.stock !== undefined ? Number(bookData.stock) : undefined,
      categoryId: bookData.categoryId !== undefined ? Number(bookData.categoryId) : undefined,
    });

    const tagIdsArray = Array.isArray(tagIds) ? tagIds.map(Number) : null;

    const book = await prisma.book.update({
      where: { id: bookId },
      data: {
        ...payload,
        ...(tagIdsArray !== null ? {
          bookTags: {
            deleteMany: {},
            create: tagIdsArray.map((tagId: number) => ({
              tag: { connect: { id: tagId } },
            })),
          },
        } : {}),
      },
      include: {
        bookTags: {
          include: { tag: true },
        },
      },
    });

    const bookWithTags = {
      ...book,
      tags: book.bookTags.map((bt) => bt.tag),
    };

    res.json(bookWithTags);
  } catch (_error) {
    res.status(400).json({ message: 'Failed to update book', error: (_error as any).message });
  }
});

router.delete('/:id', authenticate, authorize([Role.ADMIN]), async (req, res) => {
  try {
    const bookId = Number(req.params.id);
    await prisma.$transaction([
      prisma.bookTag.deleteMany({ where: { bookId } }),
      prisma.book.delete({ where: { id: bookId } }),
    ]);
    res.json({ message: 'Book deleted' });
  } catch (_error) {
    res.status(400).json({ message: 'Failed to delete book' });
  }
});

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
