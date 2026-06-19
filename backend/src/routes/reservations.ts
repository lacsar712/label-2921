import { Router } from 'express';
import prisma from '../utils/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { Role, ReservationStatus } from '@prisma/client';
import { reservationSchema, reservationStatusSchema } from '../validators';

const router = Router();

const getQueueInfo = async (bookId: number, reservationId: number) => {
  const pendingCount = await prisma.reservation.count({
    where: {
      bookId,
      status: ReservationStatus.PENDING,
      createdAt: {
        lt: (await prisma.reservation.findUnique({ where: { id: reservationId } }))!.createdAt
      }
    }
  });
  return {
    position: pendingCount + 1,
    aheadCount: pendingCount
  };
};

router.get('/', authenticate, async (req: AuthRequest, res) => {
  const { bookId, borrowerId, status, startDate, endDate } = req.query;

  const where: any = {};
  if (bookId) where.bookId = Number(bookId);
  if (borrowerId) where.borrowerId = Number(borrowerId);
  if (status) where.status = status as ReservationStatus;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(String(startDate));
    if (endDate) where.createdAt.lte = new Date(String(endDate));
  }

  const reservations = await prisma.reservation.findMany({
    where,
    include: {
      book: { include: { category: true } },
      borrower: true
    },
    orderBy: { createdAt: 'desc' }
  });

  const result = await Promise.all(
    reservations.map(async (r) => {
      let queueInfo = { position: 0, aheadCount: 0 };
      if (r.status === ReservationStatus.PENDING) {
        queueInfo = await getQueueInfo(r.bookId, r.id);
      }
      return { ...r, ...queueInfo };
    })
  );

  res.json(result);
});

router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  const reservation = await prisma.reservation.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      book: { include: { category: true } },
      borrower: true,
      statusLogs: {
        include: { operator: { select: { id: true, username: true } } },
        orderBy: { createdAt: 'asc' }
      }
    }
  });

  if (!reservation) {
    return res.status(404).json({ message: '预约记录不存在' });
  }

  let queueInfo = { position: 0, aheadCount: 0 };
  if (reservation.status === ReservationStatus.PENDING) {
    queueInfo = await getQueueInfo(reservation.bookId, reservation.id);
  }

  res.json({ ...reservation, ...queueInfo });
});

router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { bookId, borrowerId } = reservationSchema.parse({
      bookId: Number(req.body.bookId),
      borrowerId: Number(req.body.borrowerId),
    });

    const borrower = await prisma.borrower.findUnique({
      where: { id: borrowerId }
    });
    if (!borrower) {
      return res.status(404).json({ message: '借阅用户不存在' });
    }

    const book = await prisma.book.findUnique({
      where: { id: bookId }
    });
    if (!book) {
      return res.status(404).json({ message: '图书不存在' });
    }

    const borrowedCount = await prisma.borrowRecord.count({
      where: { bookId, status: 'BORROWED' }
    });

    const availableStock = book.stock;
    if (availableStock > 0) {
      return res.status(400).json({ message: '该书仍有库存，可直接借阅' });
    }

    const existingPending = await prisma.reservation.findFirst({
      where: {
        bookId,
        borrowerId,
        status: { in: [ReservationStatus.PENDING, ReservationStatus.PENDING_PICKUP] }
      }
    });
    if (existingPending) {
      return res.status(400).json({ message: '您已对该书进行有效预约' });
    }

    const maxQueueNumber = await prisma.reservation.aggregate({
      where: { bookId },
      _max: { queueNumber: true }
    });
    const queueNumber = (maxQueueNumber._max.queueNumber || 0) + 1;

    const reservation = await prisma.$transaction(async (tx) => {
      const res = await tx.reservation.create({
        data: {
          bookId,
          borrowerId,
          queueNumber,
          status: ReservationStatus.PENDING,
        },
        include: { book: true, borrower: true }
      });

      await tx.reservationStatusLog.create({
        data: {
          reservationId: res.id,
          toStatus: ReservationStatus.PENDING,
          operatorId: req.user?.id,
          remark: '用户发起预约'
        }
      });

      return res;
    });

    const queueInfo = await getQueueInfo(bookId, reservation.id);
    res.status(201).json({ ...reservation, ...queueInfo });
  } catch (_error) {
    res.status(400).json({ message: '预约失败', error: (_error as any).message });
  }
});

router.post('/:id/pickup', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req: AuthRequest, res) => {
  try {
    const { remark } = reservationStatusSchema.parse(req.body);
    const id = Number(req.params.id);

    const reservation = await prisma.reservation.findUnique({ where: { id } });
    if (!reservation) {
      return res.status(404).json({ message: '预约记录不存在' });
    }
    if (reservation.status !== ReservationStatus.PENDING_PICKUP) {
      return res.status(400).json({ message: '当前状态不可领取' });
    }

    const book = await prisma.book.findUnique({ where: { id: reservation.bookId } });
    if (!book || book.stock <= 0) {
      return res.status(400).json({ message: '图书库存不足，无法领取' });
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.reservation.update({
        where: { id },
        data: {
          status: ReservationStatus.COMPLETED,
          pickedUpAt: new Date(),
        }
      });

      await tx.reservationStatusLog.create({
        data: {
          reservationId: id,
          fromStatus: ReservationStatus.PENDING_PICKUP,
          toStatus: ReservationStatus.COMPLETED,
          operatorId: req.user?.id,
          remark: remark || '领取确认'
        }
      });

      const borrowRecord = await tx.borrowRecord.create({
        data: {
          bookId: reservation.bookId,
          borrowerId: reservation.borrowerId,
          status: 'BORROWED'
        },
        include: { book: true, borrower: true }
      });

      await tx.book.update({
        where: { id: reservation.bookId },
        data: { stock: { decrement: 1 } }
      });

      return borrowRecord;
    });

    res.json({ message: '领取确认成功', borrowRecord: result });
  } catch (_error) {
    res.status(400).json({ message: '领取确认失败', error: (_error as any).message });
  }
});

router.post('/:id/cancel', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req: AuthRequest, res) => {
  try {
    const { remark } = reservationStatusSchema.parse(req.body);
    const id = Number(req.params.id);

    const reservation = await prisma.reservation.findUnique({ where: { id } });
    if (!reservation) {
      return res.status(404).json({ message: '预约记录不存在' });
    }
    if (reservation.status === ReservationStatus.COMPLETED ||
        reservation.status === ReservationStatus.CANCELLED ||
        reservation.status === ReservationStatus.EXPIRED) {
      return res.status(400).json({ message: '当前状态不可取消' });
    }

    const fromStatus = reservation.status;
    const returnToStock = fromStatus === ReservationStatus.PENDING_PICKUP;

    await prisma.$transaction(async (tx) => {
      await tx.reservation.update({
        where: { id },
        data: {
          status: ReservationStatus.CANCELLED,
          cancelledAt: new Date(),
        }
      });

      await tx.reservationStatusLog.create({
        data: {
          reservationId: id,
          fromStatus,
          toStatus: ReservationStatus.CANCELLED,
          operatorId: req.user?.id,
          remark: remark || '馆员协助取消'
        }
      });

      if (returnToStock) {
        const pendingReservation = await tx.reservation.findFirst({
          where: {
            bookId: reservation.bookId,
            status: ReservationStatus.PENDING
          },
          orderBy: { createdAt: 'asc' }
        });

        if (pendingReservation) {
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 3);

          await tx.reservation.update({
            where: { id: pendingReservation.id },
            data: {
              status: ReservationStatus.PENDING_PICKUP,
              expiresAt
            }
          });

          await tx.reservationStatusLog.create({
            data: {
              reservationId: pendingReservation.id,
              fromStatus: ReservationStatus.PENDING,
              toStatus: ReservationStatus.PENDING_PICKUP,
              operatorId: req.user?.id,
              remark: '图书归还，自动流转为待领取'
            }
          });
        }
      }
    });

    res.json({ message: '取消成功' });
  } catch (_error) {
    res.status(400).json({ message: '取消失败', error: (_error as any).message });
  }
});

router.post('/:id/expire', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req: AuthRequest, res) => {
  try {
    const { remark } = reservationStatusSchema.parse(req.body);
    const id = Number(req.params.id);

    const reservation = await prisma.reservation.findUnique({ where: { id } });
    if (!reservation) {
      return res.status(404).json({ message: '预约记录不存在' });
    }
    if (reservation.status !== ReservationStatus.PENDING_PICKUP) {
      return res.status(400).json({ message: '只有待领取状态可标记过期' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.reservation.update({
        where: { id },
        data: {
          status: ReservationStatus.EXPIRED,
        }
      });

      await tx.reservationStatusLog.create({
        data: {
          reservationId: id,
          fromStatus: ReservationStatus.PENDING_PICKUP,
          toStatus: ReservationStatus.EXPIRED,
          operatorId: req.user?.id,
          remark: remark || '标记过期未取'
        }
      });

      const pendingReservation = await tx.reservation.findFirst({
        where: {
          bookId: reservation.bookId,
          status: ReservationStatus.PENDING
        },
        orderBy: { createdAt: 'asc' }
      });

      if (pendingReservation) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 3);

        await tx.reservation.update({
          where: { id: pendingReservation.id },
          data: {
            status: ReservationStatus.PENDING_PICKUP,
            expiresAt
          }
        });

        await tx.reservationStatusLog.create({
          data: {
            reservationId: pendingReservation.id,
            fromStatus: ReservationStatus.PENDING,
            toStatus: ReservationStatus.PENDING_PICKUP,
            operatorId: req.user?.id,
            remark: '图书归还，自动流转为待领取'
          }
        });
      }
    });

    res.json({ message: '已标记过期未取' });
  } catch (_error) {
    res.status(400).json({ message: '标记失败', error: (_error as any).message });
  }
});

export default router;
