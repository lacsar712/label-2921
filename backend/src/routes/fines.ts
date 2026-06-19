import { Router } from 'express';
import prisma from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { finePaymentSchema, fineWaiveSchema, fineSettingsSchema } from '../validators';
import { FineStatus } from '@prisma/client';

const router = Router();

const DEFAULT_SETTINGS = {
  dailyRate: 0.5,
  fineCap: 50,
  graceDays: 3,
  maxBorrowDays: 30,
};

const getSettings = async () => {
  const settings = await prisma.systemSettings.findMany();
  const result: any = { ...DEFAULT_SETTINGS };
  for (const s of settings) {
    if (s.key === 'dailyRate' || s.key === 'fineCap') {
      result[s.key] = parseFloat(s.value);
    } else if (s.key === 'graceDays' || s.key === 'maxBorrowDays') {
      result[s.key] = parseInt(s.value);
    } else {
      result[s.key] = s.value;
    }
  }
  return result;
};

const saveSettings = async (settings: any) => {
  const keys = ['dailyRate', 'fineCap', 'graceDays', 'maxBorrowDays'];
  for (const key of keys) {
    await prisma.systemSettings.upsert({
      where: { key },
      update: { value: String(settings[key]) },
      create: { key, value: String(settings[key]) },
    });
  }
};

export const calculateFine = async (borrowRecordId: number, asOf?: Date) => {
  const settings = await getSettings();
  const record = await prisma.borrowRecord.findUnique({
    where: { id: borrowRecordId },
  });
  if (!record) return null;

  const now = asOf || new Date();
  const dueDate = new Date(record.dueDate);
  const graceEnd = new Date(dueDate);
  graceEnd.setDate(graceEnd.getDate() + settings.graceDays);

  if (now <= graceEnd) {
    return {
      overdueDays: 0,
      totalAmount: 0,
      dailyRate: settings.dailyRate,
      graceDays: settings.graceDays,
      lastCalculated: now,
    };
  }

  const diffTime = now.getTime() - graceEnd.getTime();
  const overdueDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
  let totalAmount = overdueDays * settings.dailyRate;
  if (settings.fineCap > 0) {
    totalAmount = Math.min(totalAmount, settings.fineCap);
  }
  totalAmount = Math.round(totalAmount * 100) / 100;

  return {
    overdueDays,
    totalAmount,
    dailyRate: settings.dailyRate,
    graceDays: settings.graceDays,
    lastCalculated: now,
  };
};

export const upsertFine = async (borrowRecordId: number) => {
  const record = await prisma.borrowRecord.findUnique({
    where: { id: borrowRecordId },
  });
  if (!record) return null;

  const calc = await calculateFine(borrowRecordId);
  if (!calc) return null;

  const existing = await prisma.fine.findFirst({
    where: { borrowRecordId },
  });

  if (!existing) {
    if (calc.totalAmount <= 0) return null;
    return prisma.fine.create({
      data: {
        borrowRecordId,
        borrowerId: record.borrowerId,
        totalAmount: calc.totalAmount,
        overdueDays: calc.overdueDays,
        dailyRate: calc.dailyRate,
        graceDays: calc.graceDays,
        lastCalculated: calc.lastCalculated,
      },
      include: { borrowRecord: { include: { book: true } }, borrower: true, payments: true },
    });
  }

  const newTotal = Math.max(existing.totalAmount, calc.totalAmount);
  let status = existing.status;
  if (status !== FineStatus.WAIVED) {
    if (existing.paidAmount >= newTotal && newTotal > 0) {
      status = FineStatus.PAID;
    } else if (existing.paidAmount > 0) {
      status = FineStatus.PARTIAL;
    } else {
      status = FineStatus.PENDING;
    }
  }

  return prisma.fine.update({
    where: { id: existing.id },
    data: {
      totalAmount: newTotal,
      overdueDays: Math.max(existing.overdueDays, calc.overdueDays),
      lastCalculated: calc.lastCalculated,
      status,
    },
    include: { borrowRecord: { include: { book: true } }, borrower: true, payments: true },
  });
};

router.get('/settings', authenticate, async (_req, res) => {
  const settings = await getSettings();
  res.json(settings);
});

router.put('/settings', authenticate, async (req: AuthRequest, res) => {
  try {
    const validated = fineSettingsSchema.parse(req.body);
    await saveSettings(validated);
    res.json({ message: '配置已保存', settings: validated });
  } catch (error: any) {
    res.status(400).json({ message: '配置参数无效', error: error.errors });
  }
});

router.get('/', authenticate, async (req: AuthRequest, res) => {
  const { status, borrowerId, keyword } = req.query as any;
  const where: any = {};

  if (status) {
    where.status = status;
  }
  if (borrowerId) {
    where.borrowerId = Number(borrowerId);
  }
  if (keyword) {
    where.OR = [
      { borrower: { name: { contains: keyword } } },
      { borrowRecord: { book: { title: { contains: keyword } } } },
      { borrowRecord: { book: { isbn: { contains: keyword } } } },
    ];
  }

  const fines = await prisma.fine.findMany({
    where,
    include: {
      borrowRecord: {
        include: { book: true },
      },
      borrower: true,
      payments: {
        include: { operator: true },
        orderBy: { createdAt: 'desc' },
      },
      waiveOperator: true,
    },
    orderBy: { updatedAt: 'desc' },
  });

  res.json(fines);
});

router.get('/stats', authenticate, async (_req: AuthRequest, res) => {
  const [pending, partial, paid, waived] = await Promise.all([
    prisma.fine.count({ where: { status: FineStatus.PENDING } }),
    prisma.fine.count({ where: { status: FineStatus.PARTIAL } }),
    prisma.fine.count({ where: { status: FineStatus.PAID } }),
    prisma.fine.count({ where: { status: FineStatus.WAIVED } }),
  ]);

  const totalPendingAmount = await prisma.fine.aggregate({
    where: { status: { in: [FineStatus.PENDING, FineStatus.PARTIAL] } },
    _sum: { totalAmount: true, paidAmount: true },
  });

  res.json({
    counts: { pending, partial, paid, waived },
    totalPendingAmount: (totalPendingAmount._sum.totalAmount || 0) - (totalPendingAmount._sum.paidAmount || 0),
  });
});

router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  const fine = await prisma.fine.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      borrowRecord: { include: { book: true } },
      borrower: true,
      payments: { include: { operator: true }, orderBy: { createdAt: 'desc' } },
      waiveOperator: true,
    },
  });
  if (!fine) {
    return res.status(404).json({ message: '罚金记录不存在' });
  }
  res.json(fine);
});

router.post('/:id/recalculate', authenticate, async (req: AuthRequest, res) => {
  const fine = await upsertFine(Number(req.params.id));
  if (!fine) {
    return res.status(404).json({ message: '罚金记录不存在或无需计算' });
  }
  res.json(fine);
});

router.post('/:id/pay', authenticate, async (req: AuthRequest, res) => {
  try {
    const { amount, receiptNo, remark } = finePaymentSchema.parse(req.body);
    const fineId = Number(req.params.id);

    const fine = await prisma.fine.findUnique({ where: { id: fineId } });
    if (!fine) {
      return res.status(404).json({ message: '罚金记录不存在' });
    }
    if (fine.status === FineStatus.WAIVED || fine.status === FineStatus.PAID) {
      return res.status(400).json({ message: '该罚金已结清或已减免' });
    }

    const remaining = fine.totalAmount - fine.paidAmount;
    const actualPay = Math.min(amount, remaining);
    if (actualPay <= 0) {
      return res.status(400).json({ message: '支付金额无效' });
    }

    const newPaidAmount = fine.paidAmount + actualPay;
    const newStatus = newPaidAmount >= fine.totalAmount ? FineStatus.PAID : FineStatus.PARTIAL;

    const [, updatedFine] = await prisma.$transaction([
      prisma.finePayment.create({
        data: {
          fineId,
          amount: actualPay,
          receiptNo,
          remark,
          operatorId: req.user?.id,
        },
      }),
      prisma.fine.update({
        where: { id: fineId },
        data: {
          paidAmount: newPaidAmount,
          status: newStatus,
          receiptNo: receiptNo || fine.receiptNo,
        },
        include: {
          borrowRecord: { include: { book: true } },
          borrower: true,
          payments: { include: { operator: true }, orderBy: { createdAt: 'desc' } },
          waiveOperator: true,
        },
      }),
    ]);

    res.json(updatedFine);
  } catch (error: any) {
    res.status(400).json({ message: error.errors?.[0]?.message || '登记失败', error: error.errors });
  }
});

router.post('/:id/waive', authenticate, async (req: AuthRequest, res) => {
  try {
    const { amount, remark } = fineWaiveSchema.parse(req.body);
    const fineId = Number(req.params.id);

    const fine = await prisma.fine.findUnique({ where: { id: fineId } });
    if (!fine) {
      return res.status(404).json({ message: '罚金记录不存在' });
    }
    if (fine.status === FineStatus.WAIVED) {
      return res.status(400).json({ message: '该罚金已减免' });
    }

    const remaining = fine.totalAmount - fine.paidAmount;
    const waiveAmount = amount ? Math.min(amount, remaining) : remaining;
    if (waiveAmount <= 0) {
      return res.status(400).json({ message: '减免金额无效' });
    }

    const newWaivedAmount = fine.waivedAmount + waiveAmount;
    const newStatus = (fine.paidAmount + newWaivedAmount) >= fine.totalAmount
      ? FineStatus.WAIVED
      : (fine.paidAmount > 0 ? FineStatus.PARTIAL : FineStatus.PENDING);

    const updatedFine = await prisma.fine.update({
      where: { id: fineId },
      data: {
        waivedAmount: newWaivedAmount,
        status: newStatus,
        waiveRemark: remark,
        waiveOperatorId: req.user?.id,
      },
      include: {
        borrowRecord: { include: { book: true } },
        borrower: true,
        payments: { include: { operator: true }, orderBy: { createdAt: 'desc' } },
        waiveOperator: true,
      },
    });

    res.json(updatedFine);
  } catch (error: any) {
    res.status(400).json({ message: error.errors?.[0]?.message || '减免失败', error: error.errors });
  }
});

router.get('/export/data', authenticate, async (req: AuthRequest, res) => {
  const { borrowerId, bookId, startDate, endDate } = req.query as any;
  const where: any = {};

  if (borrowerId) {
    where.borrowerId = Number(borrowerId);
  }
  if (bookId) {
    where.borrowRecord = { bookId: Number(bookId) };
  }
  if (startDate) {
    where.createdAt = { ...(where.createdAt || {}), gte: new Date(startDate) };
  }
  if (endDate) {
    where.createdAt = { ...(where.createdAt || {}), lte: new Date(endDate) };
  }

  const fines = await prisma.fine.findMany({
    where,
    include: {
      borrowRecord: { include: { book: true } },
      borrower: true,
      payments: { include: { operator: true } },
      waiveOperator: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const data = fines.map((f) => ({
    id: f.id,
    borrower: f.borrower.name,
    phone: f.borrower.phone || '',
    email: f.borrower.email || '',
    bookTitle: f.borrowRecord.book.title,
    bookIsbn: f.borrowRecord.book.isbn,
    borrowDate: f.borrowRecord.borrowDate.toISOString().slice(0, 10),
    dueDate: f.borrowRecord.dueDate.toISOString().slice(0, 10),
    returnDate: f.borrowRecord.returnDate ? f.borrowRecord.returnDate.toISOString().slice(0, 10) : '',
    overdueDays: f.overdueDays,
    dailyRate: f.dailyRate,
    totalAmount: f.totalAmount,
    paidAmount: f.paidAmount,
    waivedAmount: f.waivedAmount,
    remainingAmount: f.totalAmount - f.paidAmount - f.waivedAmount,
    status: f.status,
    receiptNo: f.receiptNo || '',
    waiveRemark: f.waiveRemark || '',
    createdAt: f.createdAt.toISOString().slice(0, 10),
    lastCalculated: f.lastCalculated ? f.lastCalculated.toISOString().slice(0, 10) : '',
  }));

  res.json(data);
});

export default router;
