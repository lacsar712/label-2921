import { Router } from 'express';
import prisma from '../utils/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { Role, AuthorStatus } from '@prisma/client';
import { bookSchema, bookUpdateSchema, bookTagSchema } from '../validators';

const router = Router();

function getPinyinInitial(name: string): string {
  if (!name) return '';
  const char = name.charAt(0);
  const code = char.charCodeAt(0);
  if (code >= 65 && code <= 90) return char;
  if (code >= 97 && code <= 122) return char.toUpperCase();
  return '#';
}

router.get('/', async (req, res) => {
  const { categoryId, search, tagIds, tagFilterMode = 'intersection', authorId } = req.query;
  
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
    ...(authorId ? {
      bookAuthors: {
        some: {
          authorId: Number(authorId),
        },
      },
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
      publisher: true,
      bookTags: {
        include: { tag: true },
      },
      bookAuthors: {
        include: { author: true },
      },
      reviews: {
        select: {
          rating: true,
        },
      },
    },
  });

  const booksWithTags = books.map((book) => {
    const reviewCount = book.reviews.length;
    const avgRating = reviewCount > 0
      ? parseFloat((book.reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount).toFixed(2))
      : 0;
    return {
      ...book,
      tags: book.bookTags.map((bt) => bt.tag),
      authors: book.bookAuthors.map((ba) => ba.author),
      reviewCount,
      avgRating,
    };
  });

  res.json(booksWithTags);
});

router.get('/:id', async (req, res) => {
  const book = await prisma.book.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      category: true,
      publisher: true,
      bookTags: {
        include: { tag: true },
      },
      bookAuthors: {
        include: { author: true },
      },
      reviews: {
        include: {
          borrower: true,
          officialReplyBy: {
            select: {
              id: true,
              username: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
  if (!book) return res.status(404).json({ message: 'Book not found' });
  
  const reviewCount = book.reviews.length;
  const avgRating = reviewCount > 0
    ? book.reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
    : 0;

  const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of book.reviews) {
    ratingDistribution[r.rating] = (ratingDistribution[r.rating] || 0) + 1;
  }

  const bookWithTags = {
    ...book,
    tags: book.bookTags.map((bt) => bt.tag),
    authors: book.bookAuthors.map((ba) => ba.author),
    avgRating: parseFloat(avgRating.toFixed(2)),
    reviewCount,
    ratingDistribution,
  };
  
  res.json(bookWithTags);
});

router.post('/', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req, res) => {
  try {
    const { tagIds, authorIds, quickAuthors, publisherId, ...bookData } = req.body;
    const payload = bookSchema.parse({
      ...bookData,
      categoryId: Number(bookData.categoryId),
      publisherId: Number(publisherId),
      price: Number(bookData.price),
      stock: Number(bookData.stock),
    });

    const tagIdsArray = Array.isArray(tagIds) ? tagIds.map(Number) : [];
    const existingAuthorIds = Array.isArray(authorIds) ? authorIds.map(Number) : [];
    const quickAuthorList = Array.isArray(quickAuthors) ? quickAuthors : [];

    if (existingAuthorIds.length > 0) {
      const disabledAuthors = await prisma.author.findMany({
        where: {
          id: { in: existingAuthorIds },
          status: AuthorStatus.DISABLED,
        },
        select: { id: true, name: true },
      });
      if (disabledAuthors.length > 0) {
        return res.status(400).json({
          message: '以下作者已停用，不可挂靠新书：' + disabledAuthors.map((a) => a.name).join('、'),
        });
      }
    }

    let allAuthorIds = [...existingAuthorIds];

    if (quickAuthorList.length > 0) {
      for (const qa of quickAuthorList) {
        const createdAuthor = await prisma.author.create({
          data: {
            name: qa.name,
            nationality: qa.nationality,
            birthYear: qa.birthYear,
            deathYear: qa.deathYear,
            biography: qa.biography,
            representativeWorks: qa.representativeWorks,
            pinyinInitial: getPinyinInitial(qa.name),
          },
        });
        allAuthorIds.push(createdAuthor.id);
      }
    }

    const book = await prisma.book.create({
      data: {
        ...payload,
        publisherId: payload.publisherId || undefined,
        bookTags: tagIdsArray.length > 0
          ? {
              create: tagIdsArray.map((tagId: number) => ({
                tag: { connect: { id: tagId } },
              })),
            }
          : undefined,
        bookAuthors: allAuthorIds.length > 0
          ? {
              create: allAuthorIds.map((authorId: number) => ({
                author: { connect: { id: authorId } },
              })),
            }
          : undefined,
      },
      include: {
        publisher: true,
        bookTags: {
          include: { tag: true },
        },
        bookAuthors: {
          include: { author: true },
        },
      },
    });

    const bookWithTags = {
      ...book,
      tags: book.bookTags.map((bt) => bt.tag),
      authors: book.bookAuthors.map((ba) => ba.author),
    };

    res.status(201).json(bookWithTags);
  } catch (_error) {
    res.status(400).json({ message: 'Failed to create book', error: (_error as any).message });
  }
});

router.put('/:id', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req, res) => {
  try {
    const bookId = Number(req.params.id);
    const { tagIds, authorIds, quickAuthors, publisherId, ...bookData } = req.body;
    
    const payload = bookUpdateSchema.parse({
      ...bookData,
      price: bookData.price !== undefined ? Number(bookData.price) : undefined,
      stock: bookData.stock !== undefined ? Number(bookData.stock) : undefined,
      categoryId: bookData.categoryId !== undefined ? Number(bookData.categoryId) : undefined,
      publisherId: publisherId !== undefined ? Number(publisherId) : undefined,
    });

    const tagIdsArray = Array.isArray(tagIds) ? tagIds.map(Number) : null;
    const existingAuthorIds = Array.isArray(authorIds) ? authorIds.map(Number) : null;
    const quickAuthorList = Array.isArray(quickAuthors) ? quickAuthors : [];

    if (existingAuthorIds && existingAuthorIds.length > 0) {
      const disabledAuthors = await prisma.author.findMany({
        where: {
          id: { in: existingAuthorIds },
          status: AuthorStatus.DISABLED,
        },
        select: { id: true, name: true },
      });
      if (disabledAuthors.length > 0) {
        return res.status(400).json({
          message: '以下作者已停用，不可挂靠：' + disabledAuthors.map((a) => a.name).join('、'),
        });
      }
    }

    const bookAuthorData: any = {};
    if (existingAuthorIds !== null) {
      let allAuthorIds = [...existingAuthorIds];

      if (quickAuthorList.length > 0) {
        for (const qa of quickAuthorList) {
          const createdAuthor = await prisma.author.create({
            data: {
              name: qa.name,
              nationality: qa.nationality,
              birthYear: qa.birthYear,
              deathYear: qa.deathYear,
              biography: qa.biography,
              representativeWorks: qa.representativeWorks,
              pinyinInitial: getPinyinInitial(qa.name),
            },
          });
          allAuthorIds.push(createdAuthor.id);
        }
      }

      bookAuthorData.deleteMany = {};
      bookAuthorData.create = allAuthorIds.map((authorId: number) => ({
        author: { connect: { id: authorId } },
      }));
    }

    const book = await prisma.book.update({
      where: { id: bookId },
      data: {
        ...payload,
        ...(payload.publisherId !== undefined ? {
          publisherId: payload.publisherId || undefined,
        } : {}),
        ...(tagIdsArray !== null ? {
          bookTags: {
            deleteMany: {},
            create: tagIdsArray.map((tagId: number) => ({
              tag: { connect: { id: tagId } },
            })),
          },
        } : {}),
        ...(Object.keys(bookAuthorData).length > 0 ? {
          bookAuthors: bookAuthorData,
        } : {}),
      },
      include: {
        publisher: true,
        bookTags: {
          include: { tag: true },
        },
        bookAuthors: {
          include: { author: true },
        },
      },
    });

    const bookWithTags = {
      ...book,
      tags: book.bookTags.map((bt) => bt.tag),
      authors: book.bookAuthors.map((ba) => ba.author),
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
      prisma.bookAuthor.deleteMany({ where: { bookId } }),
      prisma.bookReview.deleteMany({ where: { bookId } }),
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
