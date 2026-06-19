import { Router } from 'express';
import prisma from '../utils/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { Role, SeatStatus, SeatReservationStatus, TimeSlot } from '@prisma/client';
import { seatReservationSchema, seatReservationStatusSchema } from '../validators';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res) => {
  const { borrowerId, seatId, status, date, startDate, endDate, readingRoomId } = req.query;

  const where: any = {};
  if (borrowerId) where.borrowerId = Number(borrowerId);
  if (seatId) where.seatId = Number(seatId);
  if (status) where.status = status as SeatReservationStatus;

  if (date) {
    const targetDate = new Date(String(date));
    targetDate.setHours(0, 0, 0, 0);
    const nextDate = new Date(targetDate);
    nextDate.setDate(nextDate.getDate() + 1);
    where.date = { gte: targetDate, lt: nextDate };
  } else if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(String(startDate));
    if (endDate) where.date.lte = new Date(String(endDate));
  }

  if (readingRoomId) {
    where.seat = {
      zone: {
        readingRoomId: Number(readingRoomId),
      },
    };
  }

  const reservations = await prisma.seatReservation.findMany({
    where,
    include: {
      seat: {
        include: {
          zone: {
            include: {
              readingRoom: true,
            },
          },
        },
      },
      borrower: true,
      operator: { select: { id: true, username: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json(reservations);
});

router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  const reservation = await prisma.seatReservation.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      seat: {
        include: {
          zone: {
            include: {
              readingRoom: true,
            },
          },
        },
      },
      borrower: true,
      operator: { select: { id: true, username: true } },
    },
  });

  if (!reservation) {
    return res.status(404).json({ message: '预约记录不存在' });
  }

  res.json(reservation);
});

router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { seatId, borrowerId, date, timeSlot } = seatReservationSchema.parse(req.body);

    const borrower = await prisma.borrower.findUnique({ where: { id: borrowerId } });
    if (!borrower) {
      return res.status(404).json({ message: '借阅用户不存在' });
    }

    const seat = await prisma.seat.findUnique({
      where: { id: seatId },
      include: { zone: true },
    });
    if (!seat) {
      return res.status(404).json({ message: '座位不存在' });
    }

    if (seat.status === SeatStatus.BANNED) {
      return res.status(400).json({ message: '该座位已被封禁，无法预约' });
    }

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const nextDate = new Date(targetDate);
    nextDate.setDate(nextDate.getDate() + 1);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (targetDate < today) {
      return res.status(400).json({ message: '不能预约过去的日期' });
    }

    const existingReservation = await prisma.seatReservation.findFirst({
      where: {
        seatId,
        date: { gte: targetDate, lt: nextDate },
        timeSlot,
        status: { in: [SeatReservationStatus.BOOKED, SeatReservationStatus.CHECKED_IN] },
      },
    });

    if (existingReservation) {
      return res.status(400).json({ message: '该座位此时段已被预约' });
    }

    const borrowerDayReservations = await prisma.seatReservation.count({
      where: {
        borrowerId,
        date: { gte: targetDate, lt: nextDate },
        status: { in: [SeatReservationStatus.BOOKED, SeatReservationStatus.CHECKED_IN] },
      },
    });

    if (borrowerDayReservations >= 3) {
      return res.status(400).json({ message: '每人每天最多可预约3个时段' });
    }

    const reservation = await prisma.seatReservation.create({
      data: {
        seatId,
        borrowerId,
        date: targetDate,
        timeSlot: timeSlot as TimeSlot,
        status: SeatReservationStatus.BOOKED,
      },
      include: {
        seat: { include: { zone: { include: { readingRoom: true } } } },
        borrower: true,
      },
    });

    res.status(201).json(reservation);
  } catch (_error) {
    res.status(400).json({ message: '预约失败', error: (_error as any).message });
  }
});

router.post('/:id/check-in', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req: AuthRequest, res) => {
  try {
    const { remark } = seatReservationStatusSchema.parse(req.body);
    const id = Number(req.params.id);

    const reservation = await prisma.seatReservation.findUnique({ where: { id } });
    if (!reservation) {
      return res.status(404).json({ message: '预约记录不存在' });
    }

    if (reservation.status !== SeatReservationStatus.BOOKED) {
      return res.status(400).json({ message: '当前状态不可签到' });
    }

    const updated = await prisma.seatReservation.update({
      where: { id },
      data: {
        status: SeatReservationStatus.CHECKED_IN,
        checkedInAt: new Date(),
        operatorId: req.user?.id,
        remark,
      },
      include: {
        seat: { include: { zone: { include: { readingRoom: true } } } },
        borrower: true,
      },
    });

    res.json({ message: '签到成功', reservation: updated });
  } catch (_error) {
    res.status(400).json({ message: '签到失败', error: (_error as any).message });
  }
});

router.post('/:id/cancel', authenticate, async (req: AuthRequest, res) => {
  try {
    const { remark } = seatReservationStatusSchema.parse(req.body);
    const id = Number(req.params.id);

    const reservation = await prisma.seatReservation.findUnique({ where: { id } });
    if (!reservation) {
      return res.status(404).json({ message: '预约记录不存在' });
    }

    if (reservation.status !== SeatReservationStatus.BOOKED) {
      return res.status(400).json({ message: '当前状态不可取消' });
    }

    const updated = await prisma.seatReservation.update({
      where: { id },
      data: {
        status: SeatReservationStatus.CANCELLED,
        cancelledAt: new Date(),
        operatorId: req.user?.id,
        remark,
      },
      include: {
        seat: { include: { zone: { include: { readingRoom: true } } } },
        borrower: true,
      },
    });

    res.json({ message: '取消成功', reservation: updated });
  } catch (_error) {
    res.status(400).json({ message: '取消失败', error: (_error as any).message });
  }
});

router.post('/:id/no-show', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req: AuthRequest, res) => {
  try {
    const { remark } = seatReservationStatusSchema.parse(req.body);
    const id = Number(req.params.id);

    const reservation = await prisma.seatReservation.findUnique({ where: { id } });
    if (!reservation) {
      return res.status(404).json({ message: '预约记录不存在' });
    }

    if (reservation.status !== SeatReservationStatus.BOOKED) {
      return res.status(400).json({ message: '当前状态不可标记爽约' });
    }

    const updated = await prisma.seatReservation.update({
      where: { id },
      data: {
        status: SeatReservationStatus.NO_SHOW,
        noShowAt: new Date(),
        operatorId: req.user?.id,
        remark,
      },
      include: {
        seat: { include: { zone: { include: { readingRoom: true } } } },
        borrower: true,
      },
    });

    res.json({ message: '已标记爽约', reservation: updated });
  } catch (_error) {
    res.status(400).json({ message: '标记失败', error: (_error as any).message });
  }
});

router.post('/:id/release', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req: AuthRequest, res) => {
  try {
    const { remark } = seatReservationStatusSchema.parse(req.body);
    const id = Number(req.params.id);

    const reservation = await prisma.seatReservation.findUnique({ where: { id } });
    if (!reservation) {
      return res.status(404).json({ message: '预约记录不存在' });
    }

    if (reservation.status !== SeatReservationStatus.CHECKED_IN) {
      return res.status(400).json({ message: '当前状态不可释放' });
    }

    const updated = await prisma.seatReservation.update({
      where: { id },
      data: {
        status: SeatReservationStatus.RELEASED,
        releasedAt: new Date(),
        operatorId: req.user?.id,
        remark,
      },
      include: {
        seat: { include: { zone: { include: { readingRoom: true } } } },
        borrower: true,
      },
    });

    res.json({ message: '释放成功', reservation: updated });
  } catch (_error) {
    res.status(400).json({ message: '释放失败', error: (_error as any).message });
  }
});

router.post('/batch-no-show', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req: AuthRequest, res) => {
  try {
    const { remark } = seatReservationStatusSchema.parse(req.body);

    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const timeSlots = Object.values(TimeSlot);
    const slotStartTimes: Record<TimeSlot, [number, number]> = {
      MORNING_1: [8, 0],
      MORNING_2: [9, 45],
      AFTERNOON_1: [13, 30],
      AFTERNOON_2: [15, 15],
      EVENING_1: [18, 0],
      EVENING_2: [19, 45],
    };

    const expiredSlots: TimeSlot[] = [];
    for (const slot of timeSlots) {
      const [hour, minute] = slotStartTimes[slot];
      const slotStart = new Date(today);
      slotStart.setHours(hour, minute + 30, 0, 0);
      if (now >= slotStart) {
        expiredSlots.push(slot);
      }
    }

    if (expiredSlots.length === 0) {
      return res.json({ message: '暂无过期未签到的预约', count: 0 });
    }

    const result = await prisma.seatReservation.updateMany({
      where: {
        date: { gte: today, lt: tomorrow },
        timeSlot: { in: expiredSlots },
        status: SeatReservationStatus.BOOKED,
      },
      data: {
        status: SeatReservationStatus.NO_SHOW,
        noShowAt: new Date(),
        operatorId: req.user?.id,
        remark: remark || '系统自动标记爽约',
      },
    });

    res.json({ message: `已标记${result.count}条爽约记录`, count: result.count });
  } catch (_error) {
    res.status(400).json({ message: '批量标记失败', error: (_error as any).message });
  }
});

export default router;
