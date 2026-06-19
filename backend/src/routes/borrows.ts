import { Router } from 'express';
import prisma from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { borrowSchema } from '../validators';
import { ReservationStatus } from '@prisma/client';
import { upsertFine, calculateFine } from './fines';

const router = Router();

const DEFAULT_MAX_BORROW_DAYS = 30;

const getMaxBorrowDays = async () => {
  const setting = await prisma.systemSettings.findUnique({
    where: { key: 'maxBorrowDays' },
  });
  return setting ? parseInt(setting.value) : DEFAULT_MAX_BORROW_DAYS;
};

router.get('/', authenticate, async (req: AuthRequest, res) => {
  const borrows = await prisma.borrowRecord.findMany({
    include: {
      book: true,
      borrower: true,
      fines: true,
    },
    orderBy: { borrowDate: 'desc' },
  });
  res.json(borrows);
});

router.get('/current', authenticate, async (req: AuthRequest, res) => {
  const borrows = await prisma.borrowRecord.findMany({
    where: { status: 'BORROWED' },
    include: {
      book: {
        include: { category: true },
      },
      borrower: true,
      fines: true,
    },
    orderBy: { borrowDate: 'desc' },
  });

  const now = new Date();
  const enriched = await Promise.all(
    borrows.map(async (b) => {
      const fineInfo = b.fines && b.fines.length > 0 ? b.fines[0] : null;
      let liveFine: any = null;
      if (!fineInfo || now.getTime() - new Date(fineInfo.lastCalculated || 0).getTime() > 12 * 3600 * 1000) {
        liveFine = await calculateFine(b.id, now);
      } else {
        liveFine = {
          overdueDays: fineInfo.overdueDays,
          totalAmount: fineInfo.totalAmount,
          dailyRate: fineInfo.dailyRate,
          graceDays: fineInfo.graceDays,
          lastCalculated: fineInfo.lastCalculated,
        };
      }
      return {
        ...b,
        fine: liveFine,
      };
    }),
  );

  res.json(enriched);
});

router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { bookId, borrowerId } = req.body;

    if (!borrowerId) {
      return res.status(400).json({ message: 'borrowerId is required' });
    }

    const { bookId: validatedBookId } = borrowSchema.parse({
      bookId: Number(bookId),
    });

    const borrower = await prisma.borrower.findUnique({
      where: { id: Number(borrowerId) },
    });

    if (!borrower) {
      return res.status(404).json({ message: 'Borrower not found' });
    }

    const book = await prisma.book.findUnique({ where: { id: validatedBookId } });
    if (!book || book.stock <= 0) {
      return res.status(400).json({ message: 'Book out of stock' });
    }

    const maxDays = await getMaxBorrowDays();
    const borrowDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + maxDays);

    const [record] = await prisma.$transaction([
      prisma.borrowRecord.create({
        data: {
          bookId: validatedBookId,
          borrowerId: borrower.id,
          status: 'BORROWED',
          borrowDate,
          dueDate,
        },
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

router.post('/:id/return', authenticate, async (req: AuthRequest, res) => {
  try {
    const record = await prisma.borrowRecord.findUnique({ where: { id: Number(req.params.id) } });
    if (!record || record.status === 'RETURNED') {
      return res.status(400).json({ message: 'Invalid record' });
    }

    await prisma.$transaction(async (tx) => {
      const returnDate = new Date();
      await tx.borrowRecord.update({
        where: { id: record.id },
        data: { status: 'RETURNED', returnDate },
      });

      await tx.book.update({
        where: { id: record.bookId },
        data: { stock: { increment: 1 } },
      });

      const pendingReservation = await tx.reservation.findFirst({
        where: {
          bookId: record.bookId,
          status: ReservationStatus.PENDING,
        },
        orderBy: { createdAt: 'asc' },
      });

      if (pendingReservation) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 3);

        await tx.reservation.update({
          where: { id: pendingReservation.id },
          data: {
            status: ReservationStatus.PENDING_PICKUP,
            expiresAt,
          },
        });

        await tx.reservationStatusLog.create({
          data: {
            reservationId: pendingReservation.id,
            fromStatus: ReservationStatus.PENDING,
            toStatus: ReservationStatus.PENDING_PICKUP,
            operatorId: req.user?.id,
            remark: '图书归还，自动流转为待领取',
          },
        });
      }
    });

    await upsertFine(record.id);

    res.json({ message: 'Book returned' });
  } catch (_error) {
    res.status(400).json({ message: 'Failed to return', error: (_error as any).message });
  }
});

export default router;
