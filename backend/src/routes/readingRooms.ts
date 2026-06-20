import { Router } from 'express';
import prisma from '../utils/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { Role, SeatStatus, TimeSlot, SeatReservationStatus } from '@prisma/client';
import { readingRoomSchema, readingZoneSchema, seatSchema, seatBanSchema } from '../validators';

const router = Router();

const TIME_SLOT_LABELS: Record<TimeSlot, { label: string; start: string; end: string }> = {
  MORNING_1: { label: '上午1段', start: '08:00', end: '09:30' },
  MORNING_2: { label: '上午2段', start: '09:45', end: '11:15' },
  AFTERNOON_1: { label: '下午1段', start: '13:30', end: '15:00' },
  AFTERNOON_2: { label: '下午2段', start: '15:15', end: '16:45' },
  EVENING_1: { label: '晚间1段', start: '18:00', end: '19:30' },
  EVENING_2: { label: '晚间2段', start: '19:45', end: '21:15' },
};

router.get('/time-slots', authenticate, (req: AuthRequest, res) => {
  res.json(TIME_SLOT_LABELS);
});

router.get('/', authenticate, async (req: AuthRequest, res) => {
  const rooms = await prisma.readingRoom.findMany({
    include: {
      zones: {
        include: {
          _count: {
            select: { seats: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(rooms);
});

router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  const room = await prisma.readingRoom.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      zones: {
        include: {
          seats: true,
        },
      },
    },
  });

  if (!room) {
    return res.status(404).json({ message: '阅览室不存在' });
  }

  res.json(room);
});

router.post('/', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req: AuthRequest, res) => {
  try {
    const data = readingRoomSchema.parse(req.body);
    const room = await prisma.readingRoom.create({ data });
    res.status(201).json(room);
  } catch (_error) {
    res.status(400).json({ message: '创建失败', error: (_error as any).message });
  }
});

router.put('/:id', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req: AuthRequest, res) => {
  try {
    const data = readingRoomSchema.partial().parse(req.body);
    const room = await prisma.readingRoom.update({
      where: { id: Number(req.params.id) },
      data,
    });
    res.json(room);
  } catch (_error) {
    res.status(400).json({ message: '更新失败', error: (_error as any).message });
  }
});

router.delete('/:id', authenticate, authorize([Role.ADMIN]), async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);

    const zoneIds = (await prisma.readingZone.findMany({
      where: { readingRoomId: id },
      select: { id: true },
    })).map((z) => z.id);

    await prisma.$transaction(async (tx) => {
      await tx.seatReservation.deleteMany({
        where: { seat: { zoneId: { in: zoneIds } } },
      });
      await tx.seat.deleteMany({ where: { zoneId: { in: zoneIds } } });
      await tx.readingZone.deleteMany({ where: { readingRoomId: id } });
      await tx.readingRoom.delete({ where: { id } });
    });

    res.json({ message: '删除成功' });
  } catch (_error) {
    res.status(400).json({ message: '删除失败', error: (_error as any).message });
  }
});

router.get('/:id/zones', authenticate, async (req: AuthRequest, res) => {
  const zones = await prisma.readingZone.findMany({
    where: { readingRoomId: Number(req.params.id) },
    include: {
      _count: {
        select: { seats: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  });
  res.json(zones);
});

router.post('/zones', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req: AuthRequest, res) => {
  try {
    const data = readingZoneSchema.parse(req.body);
    const zone = await prisma.readingZone.create({ data });
    res.status(201).json(zone);
  } catch (_error) {
    res.status(400).json({ message: '创建失败', error: (_error as any).message });
  }
});

router.put('/zones/:id', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req: AuthRequest, res) => {
  try {
    const data = readingZoneSchema.partial().parse(req.body);
    const zone = await prisma.readingZone.update({
      where: { id: Number(req.params.id) },
      data,
    });
    res.json(zone);
  } catch (_error) {
    res.status(400).json({ message: '更新失败', error: (_error as any).message });
  }
});

router.delete('/zones/:id', authenticate, authorize([Role.ADMIN]), async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.$transaction(async (tx) => {
      await tx.seatReservation.deleteMany({ where: { seat: { zoneId: id } } });
      await tx.seat.deleteMany({ where: { zoneId: id } });
      await tx.readingZone.delete({ where: { id } });
    });
    res.json({ message: '删除成功' });
  } catch (_error) {
    res.status(400).json({ message: '删除失败', error: (_error as any).message });
  }
});

router.get('/zones/:id/seats', authenticate, async (req: AuthRequest, res) => {
  const { date } = req.query;
  const zoneId = Number(req.params.id);

  const seats = await prisma.seat.findMany({
    where: { zoneId },
    orderBy: { seatNumber: 'asc' },
  });

  if (date) {
    const targetDate = new Date(String(date));
    targetDate.setHours(0, 0, 0, 0);
    const nextDate = new Date(targetDate);
    nextDate.setDate(nextDate.getDate() + 1);

    const reservations = await prisma.seatReservation.findMany({
      where: {
        seatId: { in: seats.map((s) => s.id) },
        date: { gte: targetDate, lt: nextDate },
        status: { in: [SeatReservationStatus.BOOKED, SeatReservationStatus.CHECKED_IN] },
      },
    });

    const seatReservationMap = new Map<number, typeof reservations>();
    reservations.forEach((r) => {
      if (!seatReservationMap.has(r.seatId)) {
        seatReservationMap.set(r.seatId, []);
      }
      seatReservationMap.get(r.seatId)!.push(r);
    });

    const seatsWithStatus = seats.map((seat) => ({
      ...seat,
      reservedSlots: (seatReservationMap.get(seat.id) || []).map((r) => r.timeSlot),
    }));

    return res.json(seatsWithStatus);
  }

  res.json(seats);
});

router.post('/seats', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req: AuthRequest, res) => {
  try {
    const data = seatSchema.parse(req.body);
    const seat = await prisma.seat.create({ data });
    res.status(201).json(seat);
  } catch (_error) {
    res.status(400).json({ message: '创建失败', error: (_error as any).message });
  }
});

router.put('/seats/:id', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req: AuthRequest, res) => {
  try {
    const data = seatSchema.partial().parse(req.body);
    const seat = await prisma.seat.update({
      where: { id: Number(req.params.id) },
      data,
    });
    res.json(seat);
  } catch (_error) {
    res.status(400).json({ message: '更新失败', error: (_error as any).message });
  }
});

router.post('/seats/:id/ban', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req: AuthRequest, res) => {
  try {
    const { banReason } = seatBanSchema.parse(req.body);
    const seat = await prisma.seat.update({
      where: { id: Number(req.params.id) },
      data: {
        status: SeatStatus.BANNED,
        banReason,
      },
    });
    res.json(seat);
  } catch (_error) {
    res.status(400).json({ message: '封禁失败', error: (_error as any).message });
  }
});

router.post('/seats/:id/unban', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req: AuthRequest, res) => {
  try {
    const seat = await prisma.seat.update({
      where: { id: Number(req.params.id) },
      data: {
        status: SeatStatus.AVAILABLE,
        banReason: null,
      },
    });
    res.json(seat);
  } catch (_error) {
    res.status(400).json({ message: '解封失败', error: (_error as any).message });
  }
});

router.delete('/seats/:id', authenticate, authorize([Role.ADMIN]), async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.$transaction(async (tx) => {
      await tx.seatReservation.deleteMany({ where: { seatId: id } });
      await tx.seat.delete({ where: { id } });
    });
    res.json({ message: '删除成功' });
  } catch (_error) {
    res.status(400).json({ message: '删除失败', error: (_error as any).message });
  }
});

router.get('/:id/stats', authenticate, async (req: AuthRequest, res) => {
  const { date } = req.query;
  const roomId = Number(req.params.id);

  let targetDate = new Date();
  if (date) {
    targetDate = new Date(String(date));
  }
  targetDate.setHours(0, 0, 0, 0);
  const nextDate = new Date(targetDate);
  nextDate.setDate(nextDate.getDate() + 1);

  const zones = await prisma.readingZone.findMany({
    where: { readingRoomId: roomId },
    include: { seats: true },
  });

  const seatIds = zones.flatMap((z) => z.seats.map((s) => s.id));
  const totalSeats = seatIds.length;
  const availableSeats = zones.flatMap((z) => z.seats.filter((s) => s.status === SeatStatus.AVAILABLE)).length;
  const bannedSeats = totalSeats - availableSeats;

  const reservations = await prisma.seatReservation.findMany({
    where: {
      seatId: { in: seatIds },
      date: { gte: targetDate, lt: nextDate },
    },
  });

  const timeSlots = Object.values(TimeSlot);
  const slotStats: Record<string, { total: number; booked: number; checkedIn: number; utilization: number }> = {};

  for (const slot of timeSlots) {
    const slotReservations = reservations.filter((r) => r.timeSlot === slot);
    const booked = slotReservations.filter(
      (r) => r.status === SeatReservationStatus.BOOKED || r.status === SeatReservationStatus.CHECKED_IN,
    ).length;
    const checkedIn = slotReservations.filter((r) => r.status === SeatReservationStatus.CHECKED_IN).length;
    slotStats[slot] = {
      total: availableSeats,
      booked,
      checkedIn,
      utilization: availableSeats > 0 ? Number(((booked / availableSeats) * 100).toFixed(1)) : 0,
    };
  }

  const statusCounts = {
    BOOKED: reservations.filter((r) => r.status === SeatReservationStatus.BOOKED).length,
    CHECKED_IN: reservations.filter((r) => r.status === SeatReservationStatus.CHECKED_IN).length,
    CANCELLED: reservations.filter((r) => r.status === SeatReservationStatus.CANCELLED).length,
    NO_SHOW: reservations.filter((r) => r.status === SeatReservationStatus.NO_SHOW).length,
    RELEASED: reservations.filter((r) => r.status === SeatReservationStatus.RELEASED).length,
  };

  res.json({
    date: targetDate.toISOString().split('T')[0],
    totalSeats,
    availableSeats,
    bannedSeats,
    totalReservations: reservations.length,
    statusCounts,
    slotStats,
    timeSlotLabels: TIME_SLOT_LABELS,
  });
});

router.get('/:id/board', authenticate, async (req: AuthRequest, res) => {
  const { date } = req.query;
  const roomId = Number(req.params.id);

  let targetDate = new Date();
  if (date) {
    targetDate = new Date(String(date));
  }
  targetDate.setHours(0, 0, 0, 0);
  const nextDate = new Date(targetDate);
  nextDate.setDate(nextDate.getDate() + 1);

  const zones = await prisma.readingZone.findMany({
    where: { readingRoomId: roomId },
    include: { seats: true },
    orderBy: { id: 'asc' },
  });

  const seatIds = zones.flatMap((z) => z.seats.map((s) => s.id));

  const reservations = await prisma.seatReservation.findMany({
    where: {
      seatId: { in: seatIds },
      date: { gte: targetDate, lt: nextDate },
      status: { in: [SeatReservationStatus.BOOKED, SeatReservationStatus.CHECKED_IN] },
    },
    include: {
      borrower: { select: { id: true, name: true, phone: true } },
    },
  });

  const reservationMap = new Map<string, typeof reservations[number]>();
  reservations.forEach((r) => {
    reservationMap.set(`${r.seatId}-${r.timeSlot}`, r);
  });

  const timeSlots = Object.values(TimeSlot);

  const boardData = zones.map((zone) => ({
    zone: {
      id: zone.id,
      name: zone.name,
      type: zone.type,
    },
    seats: zone.seats.map((seat) => {
      const slots: Record<string, any> = {};
      for (const slot of timeSlots) {
        const reservation = reservationMap.get(`${seat.id}-${slot}`);
        slots[slot] = reservation || null;
      }
      return {
        seat,
        slots,
      };
    }),
  }));

  res.json({
    date: targetDate.toISOString().split('T')[0],
    timeSlots,
    timeSlotLabels: TIME_SLOT_LABELS,
    zones: boardData,
  });
});

export default router;
