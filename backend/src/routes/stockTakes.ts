import { Router } from 'express';
import prisma from '../utils/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { Role, StockTakeStatus, DiffReason } from '@prisma/client';
import {
  stockTakeSchema,
  stockTakeUpdateSchema,
  stockTakeQuerySchema,
  stockTakeItemSchema,
  stockTakeItemBatchSchema,
  stockTakeReviewSchema,
  stockTakeTrendQuerySchema,
} from '../validators';

const router = Router();

const calculateStockTakeStats = async (stockTakeId: number) => {
  const items = await prisma.stockTakeItem.findMany({
    where: { stockTakeId },
  });

  const totalBooks = items.length;
  const totalExpectedQty = items.reduce((sum, item) => sum + item.expectedStock, 0);
  const countedItems = items.filter((item) => item.isCounted);
  const totalActualQty = countedItems.reduce((sum, item) => sum + (item.actualStock || 0), 0);
  const totalDiffQty = countedItems.reduce((sum, item) => sum + item.diffQty, 0);
  const totalDiffAmount = countedItems.reduce((sum, item) => sum + item.diffAmount, 0);

  return {
    totalBooks,
    totalExpectedQty,
    totalActualQty,
    totalDiffQty,
    totalDiffAmount: parseFloat(totalDiffAmount.toFixed(2)),
  };
};

const createStatusLog = async (
  stockTakeId: number,
  fromStatus: StockTakeStatus | null,
  toStatus: StockTakeStatus,
  operatorId: number | undefined,
  remark?: string
) => {
  await prisma.stockTakeStatusLog.create({
    data: {
      stockTakeId,
      fromStatus: fromStatus || undefined,
      toStatus,
      operatorId,
      remark,
    },
  });
};

router.get('/trend/summary', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req, res) => {
  try {
    const query = stockTakeTrendQuerySchema.parse(req.query);

    const startDate = new Date(query.startMonth + '-01');
    const endDate = new Date(query.endMonth + '-01');
    endDate.setMonth(endDate.getMonth() + 1);

    const where: any = {
      status: StockTakeStatus.COMPLETED,
      completedAt: {
        gte: startDate,
        lt: endDate,
      },
    };

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    const stockTakes = await prisma.stockTake.findMany({
      where,
      orderBy: { completedAt: 'asc' },
      include: {
        items: {
          select: {
            bookId: true,
            expectedStock: true,
            actualStock: true,
            diffQty: true,
            diffAmount: true,
          },
        },
      },
    });

    const monthlyData: Record<string, {
      month: string;
      stockTakeCount: number;
      totalBooks: number;
      totalExpectedQty: number;
      totalActualQty: number;
      totalDiffQty: number;
      totalDiffAmount: number;
    }> = {};

    for (const st of stockTakes) {
      const monthKey = st.completedAt!.toISOString().slice(0, 7);
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthKey,
          stockTakeCount: 0,
          totalBooks: 0,
          totalExpectedQty: 0,
          totalActualQty: 0,
          totalDiffQty: 0,
          totalDiffAmount: 0,
        };
      }
      monthlyData[monthKey].stockTakeCount++;
      monthlyData[monthKey].totalBooks += st.totalBooks;
      monthlyData[monthKey].totalExpectedQty += st.totalExpectedQty;
      monthlyData[monthKey].totalActualQty += st.totalActualQty;
      monthlyData[monthKey].totalDiffQty += st.totalDiffQty;
      monthlyData[monthKey].totalDiffAmount += st.totalDiffAmount;
    }

    const trend = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));

    res.json({
      data: trend.map((item) => ({
        ...item,
        totalDiffAmount: parseFloat(item.totalDiffAmount.toFixed(2)),
      })),
    });
  } catch (_error) {
    res.status(500).json({ message: '获取库存波动趋势失败', error: (_error as any).message });
  }
});

router.get('/', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req: AuthRequest, res) => {
  try {
    const query = stockTakeQuerySchema.parse(req.query);
    const page = query.page || 1;
    const pageSize = query.pageSize || 10;

    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.keyword) {
      where.OR = [
        { title: { contains: query.keyword, mode: 'insensitive' } },
      ];
    }

    if (query.month) {
      const [year, month] = query.month.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 1);
      where.createdAt = {
        gte: startDate,
        lt: endDate,
      };
    }

    const [total, stockTakes] = await Promise.all([
      prisma.stockTake.count({ where }),
      prisma.stockTake.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: {
            select: { id: true, username: true },
          },
          reviewedBy: {
            select: { id: true, username: true },
          },
          category: true,
        },
      }),
    ]);

    res.json({
      data: stockTakes,
      total,
      page,
      pageSize,
    });
  } catch (_error) {
    res.status(500).json({ message: '获取盘点单列表失败', error: (_error as any).message });
  }
});

router.get('/:id', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req, res) => {
  try {
    const stockTake = await prisma.stockTake.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        createdBy: { select: { id: true, username: true } },
        reviewedBy: { select: { id: true, username: true } },
        category: true,
        statusLogs: {
          orderBy: { createdAt: 'asc' },
          include: {
            operator: { select: { id: true, username: true } },
          },
        },
      },
    });

    if (!stockTake) {
      return res.status(404).json({ message: '盘点单不存在' });
    }

    res.json(stockTake);
  } catch (_error) {
    res.status(500).json({ message: '获取盘点单详情失败' });
  }
});

router.get('/:id/items', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req, res) => {
  try {
    const stockTakeId = Number(req.params.id);
    const { isCounted, search, page, pageSize } = req.query;

    const where: any = { stockTakeId };

    if (isCounted !== undefined) {
      where.isCounted = isCounted === 'true';
    }

    if (search) {
      where.OR = [
        { bookTitle: { contains: String(search), mode: 'insensitive' } },
        { bookIsbn: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    const pageNum = Number(page) || 1;
    const pageSizeNum = Number(pageSize) || 50;

    const [total, items] = await Promise.all([
      prisma.stockTakeItem.count({ where }),
      prisma.stockTakeItem.findMany({
        where,
        skip: (pageNum - 1) * pageSizeNum,
        take: pageSizeNum,
        orderBy: { id: 'asc' },
        include: {
          countedBy: { select: { id: true, username: true } },
        },
      }),
    ]);

    res.json({
      data: items,
      total,
      page: pageNum,
      pageSize: pageSizeNum,
    });
  } catch (_error) {
    res.status(500).json({ message: '获取盘点明细失败' });
  }
});

router.get('/:id/diff-summary', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req, res) => {
  try {
    const stockTakeId = Number(req.params.id);

    const stockTake = await prisma.stockTake.findUnique({
      where: { id: stockTakeId },
    });

    if (!stockTake) {
      return res.status(404).json({ message: '盘点单不存在' });
    }

    const items = await prisma.stockTakeItem.findMany({
      where: { stockTakeId, isCounted: true },
    });

    const lossItems = items.filter((item) => item.diffQty < 0);
    const gainItems = items.filter((item) => item.diffQty > 0);
    const normalItems = items.filter((item) => item.diffQty === 0);

    const lossTotalQty = lossItems.reduce((sum, item) => sum + Math.abs(item.diffQty), 0);
    const gainTotalQty = gainItems.reduce((sum, item) => sum + item.diffQty, 0);
    const lossTotalAmount = lossItems.reduce((sum, item) => sum + Math.abs(item.diffAmount), 0);
    const gainTotalAmount = gainItems.reduce((sum, item) => sum + item.diffAmount, 0);

    const reasonStats: Record<string, { count: number; qty: number; amount: number }> = {};
    for (const reason of Object.values(DiffReason)) {
      reasonStats[reason] = { count: 0, qty: 0, amount: 0 };
    }

    for (const item of lossItems) {
      const reason = item.diffReason || DiffReason.OTHER;
      reasonStats[reason].count++;
      reasonStats[reason].qty += Math.abs(item.diffQty);
      reasonStats[reason].amount += Math.abs(item.diffAmount);
    }

    res.json({
      totalCounted: items.length,
      normalCount: normalItems.length,
      lossCount: lossItems.length,
      gainCount: gainItems.length,
      lossTotalQty,
      gainTotalQty,
      lossTotalAmount: parseFloat(lossTotalAmount.toFixed(2)),
      gainTotalAmount: parseFloat(gainTotalAmount.toFixed(2)),
      reasonStats: Object.entries(reasonStats).map(([reason, stats]) => ({
        reason,
        count: stats.count,
        qty: stats.qty,
        amount: parseFloat(stats.amount.toFixed(2)),
      })),
    });
  } catch (_error) {
    res.status(500).json({ message: '获取差异汇总失败' });
  }
});

router.post('/', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req: AuthRequest, res) => {
  try {
    const payload = stockTakeSchema.parse(req.body);

    const stockTake = await prisma.stockTake.create({
      data: {
        title: payload.title,
        categoryId: payload.categoryId || undefined,
        remark: payload.remark,
        createdById: req.user?.id,
      },
      include: {
        createdBy: { select: { id: true, username: true } },
        category: true,
      },
    });

    await createStatusLog(stockTake.id, null, StockTakeStatus.DRAFT, req.user?.id, '创建盘点单');

    res.status(201).json(stockTake);
  } catch (_error) {
    res.status(400).json({ message: '创建盘点单失败', error: (_error as any).message });
  }
});

router.post('/:id/generate-snapshot', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req: AuthRequest, res) => {
  try {
    const stockTakeId = Number(req.params.id);

    const stockTake = await prisma.stockTake.findUnique({
      where: { id: stockTakeId },
    });

    if (!stockTake) {
      return res.status(404).json({ message: '盘点单不存在' });
    }

    if (stockTake.status !== StockTakeStatus.DRAFT) {
      return res.status(400).json({ message: '只能在草稿状态生成库存快照' });
    }

    const existingItems = await prisma.stockTakeItem.findMany({ where: { stockTakeId } });
    if (existingItems.length > 0) {
      return res.status(400).json({ message: '已生成库存快照，请勿重复生成' });
    }

    const bookWhere: any = {};
    if (stockTake.categoryId) {
      bookWhere.categoryId = stockTake.categoryId;
    }

    const books = await prisma.book.findMany({
      where: bookWhere,
      select: {
        id: true,
        title: true,
        isbn: true,
        price: true,
        stock: true,
      },
    });

    if (books.length === 0) {
      return res.status(400).json({ message: '没有可盘点的图书' });
    }

    await prisma.$transaction([
      prisma.stockTakeItem.createMany({
        data: books.map((book) => ({
          stockTakeId,
          bookId: book.id,
          bookTitle: book.title,
          bookIsbn: book.isbn,
          bookPrice: book.price,
          expectedStock: book.stock,
        })),
      }),
      prisma.stockTake.update({
        where: { id: stockTakeId },
        data: {
          totalBooks: books.length,
          totalExpectedQty: books.reduce((sum, b) => sum + b.stock, 0),
        },
      }),
    ]);

    const updatedStockTake = await prisma.stockTake.findUnique({
      where: { id: stockTakeId },
      include: {
        createdBy: { select: { id: true, username: true } },
        category: true,
      },
    });

    res.json(updatedStockTake);
  } catch (_error) {
    res.status(400).json({ message: '生成库存快照失败', error: (_error as any).message });
  }
});

router.post('/:id/start', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req: AuthRequest, res) => {
  try {
    const stockTakeId = Number(req.params.id);

    const stockTake = await prisma.stockTake.findUnique({
      where: { id: stockTakeId },
      include: { items: true },
    });

    if (!stockTake) {
      return res.status(404).json({ message: '盘点单不存在' });
    }

    if (stockTake.status !== StockTakeStatus.DRAFT) {
      return res.status(400).json({ message: '只能从草稿状态开始盘点' });
    }

    if (stockTake.items.length === 0) {
      return res.status(400).json({ message: '请先生成库存快照' });
    }

    const updatedStockTake = await prisma.stockTake.update({
      where: { id: stockTakeId },
      data: {
        status: StockTakeStatus.IN_PROGRESS,
        startedAt: new Date(),
      },
      include: {
        createdBy: { select: { id: true, username: true } },
        reviewedBy: { select: { id: true, username: true } },
        category: true,
      },
    });

    await createStatusLog(stockTakeId, StockTakeStatus.DRAFT, StockTakeStatus.IN_PROGRESS, req.user?.id, '开始盘点');

    res.json(updatedStockTake);
  } catch (_error) {
    res.status(400).json({ message: '开始盘点失败', error: (_error as any).message });
  }
});

router.put('/:id/items/:itemId', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req: AuthRequest, res) => {
  try {
    const stockTakeId = Number(req.params.id);
    const itemId = Number(req.params.itemId);
    const payload = stockTakeItemSchema.parse(req.body);

    const stockTake = await prisma.stockTake.findUnique({
      where: { id: stockTakeId },
    });

    if (!stockTake) {
      return res.status(404).json({ message: '盘点单不存在' });
    }

    if (stockTake.status !== StockTakeStatus.IN_PROGRESS) {
      return res.status(400).json({ message: '只能在盘点中状态录入明细' });
    }

    const item = await prisma.stockTakeItem.findUnique({
      where: { id: itemId },
    });

    if (!item || item.stockTakeId !== stockTakeId) {
      return res.status(404).json({ message: '盘点明细不存在' });
    }

    const diffQty = payload.actualStock - item.expectedStock;
    const diffAmount = parseFloat((diffQty * item.bookPrice).toFixed(2));

    const updatedItem = await prisma.stockTakeItem.update({
      where: { id: itemId },
      data: {
        actualStock: payload.actualStock,
        diffQty,
        diffAmount,
        diffReason: payload.diffReason || undefined,
        locationRemark: payload.locationRemark,
        isCounted: true,
        countedById: req.user?.id,
        countedAt: new Date(),
      },
      include: {
        countedBy: { select: { id: true, username: true } },
      },
    });

    const stats = await calculateStockTakeStats(stockTakeId);
    await prisma.stockTake.update({
      where: { id: stockTakeId },
      data: stats,
    });

    res.json(updatedItem);
  } catch (_error) {
    res.status(400).json({ message: '更新盘点明细失败', error: (_error as any).message });
  }
});

router.post('/:id/items/batch', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req: AuthRequest, res) => {
  try {
    const stockTakeId = Number(req.params.id);
    const payload = stockTakeItemBatchSchema.parse(req.body);

    const stockTake = await prisma.stockTake.findUnique({
      where: { id: stockTakeId },
    });

    if (!stockTake) {
      return res.status(404).json({ message: '盘点单不存在' });
    }

    if (stockTake.status !== StockTakeStatus.IN_PROGRESS) {
      return res.status(400).json({ message: '只能在盘点中状态录入明细' });
    }

    const items = await prisma.stockTakeItem.findMany({
      where: { stockTakeId },
    });

    const itemMap = new Map(items.map((item) => [item.bookId, item]));

    const updatePromises = payload.items.map(async (inputItem) => {
      const existingItem = itemMap.get(inputItem.bookId);
      if (!existingItem) return null;

      const diffQty = inputItem.actualStock - existingItem.expectedStock;
      const diffAmount = parseFloat((diffQty * existingItem.bookPrice).toFixed(2));

      return prisma.stockTakeItem.update({
        where: { id: existingItem.id },
        data: {
          actualStock: inputItem.actualStock,
          diffQty,
          diffAmount,
          diffReason: inputItem.diffReason || undefined,
          locationRemark: inputItem.locationRemark,
          isCounted: true,
          countedById: req.user?.id,
          countedAt: new Date(),
        },
      });
    });

    await Promise.all(updatePromises.filter(Boolean));

    const stats = await calculateStockTakeStats(stockTakeId);
    await prisma.stockTake.update({
      where: { id: stockTakeId },
      data: stats,
    });

    const updatedItems = await prisma.stockTakeItem.findMany({
      where: { stockTakeId },
      orderBy: { id: 'asc' },
    });

    res.json({ data: updatedItems, updatedCount: payload.items.length });
  } catch (_error) {
    res.status(400).json({ message: '批量更新盘点明细失败', error: (_error as any).message });
  }
});

router.post('/:id/submit', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req: AuthRequest, res) => {
  try {
    const stockTakeId = Number(req.params.id);

    const stockTake = await prisma.stockTake.findUnique({
      where: { id: stockTakeId },
      include: { items: true },
    });

    if (!stockTake) {
      return res.status(404).json({ message: '盘点单不存在' });
    }

    if (stockTake.status !== StockTakeStatus.IN_PROGRESS) {
      return res.status(400).json({ message: '只能在盘点中状态提交复核' });
    }

    const uncountedItems = stockTake.items.filter((item) => !item.isCounted);
    if (uncountedItems.length > 0) {
      return res.status(400).json({
        message: `还有 ${uncountedItems.length} 本图书未盘点，请完成全部盘点后提交`,
        uncountedCount: uncountedItems.length,
      });
    }

    const updatedStockTake = await prisma.stockTake.update({
      where: { id: stockTakeId },
      data: {
        status: StockTakeStatus.PENDING_REVIEW,
        submittedAt: new Date(),
      },
      include: {
        createdBy: { select: { id: true, username: true } },
        reviewedBy: { select: { id: true, username: true } },
        category: true,
      },
    });

    await createStatusLog(
      stockTakeId,
      StockTakeStatus.IN_PROGRESS,
      StockTakeStatus.PENDING_REVIEW,
      req.user?.id,
      '提交复核'
    );

    res.json(updatedStockTake);
  } catch (_error) {
    res.status(400).json({ message: '提交复核失败', error: (_error as any).message });
  }
});

router.post('/:id/review', authenticate, authorize([Role.ADMIN]), async (req: AuthRequest, res) => {
  try {
    const stockTakeId = Number(req.params.id);
    const payload = stockTakeReviewSchema.parse(req.body);

    const stockTake = await prisma.stockTake.findUnique({
      where: { id: stockTakeId },
      include: { items: true },
    });

    if (!stockTake) {
      return res.status(404).json({ message: '盘点单不存在' });
    }

    if (stockTake.status !== StockTakeStatus.PENDING_REVIEW) {
      return res.status(400).json({ message: '只能在待复核状态进行复核' });
    }

    await prisma.$transaction(async (tx) => {
      for (const item of stockTake.items) {
        if (item.diffQty !== 0) {
          await tx.book.update({
            where: { id: item.bookId },
            data: {
              stock: {
                increment: item.diffQty,
              },
            },
          });
        }
      }

      await tx.stockTake.update({
        where: { id: stockTakeId },
        data: {
          status: StockTakeStatus.COMPLETED,
          reviewedById: req.user?.id,
          reviewedAt: new Date(),
          completedAt: new Date(),
        },
      });
    });

    await createStatusLog(
      stockTakeId,
      StockTakeStatus.PENDING_REVIEW,
      StockTakeStatus.COMPLETED,
      req.user?.id,
      payload.remark || '复核通过'
    );

    const updatedStockTake = await prisma.stockTake.findUnique({
      where: { id: stockTakeId },
      include: {
        createdBy: { select: { id: true, username: true } },
        reviewedBy: { select: { id: true, username: true } },
        category: true,
      },
    });

    res.json(updatedStockTake);
  } catch (_error) {
    res.status(400).json({ message: '复核失败', error: (_error as any).message });
  }
});

router.post('/:id/reject', authenticate, authorize([Role.ADMIN]), async (req: AuthRequest, res) => {
  try {
    const stockTakeId = Number(req.params.id);
    const { remark } = req.body;

    const stockTake = await prisma.stockTake.findUnique({
      where: { id: stockTakeId },
    });

    if (!stockTake) {
      return res.status(404).json({ message: '盘点单不存在' });
    }

    if (stockTake.status !== StockTakeStatus.PENDING_REVIEW) {
      return res.status(400).json({ message: '只能在待复核状态驳回' });
    }

    const updatedStockTake = await prisma.stockTake.update({
      where: { id: stockTakeId },
      data: {
        status: StockTakeStatus.IN_PROGRESS,
      },
      include: {
        createdBy: { select: { id: true, username: true } },
        reviewedBy: { select: { id: true, username: true } },
        category: true,
      },
    });

    await createStatusLog(
      stockTakeId,
      StockTakeStatus.PENDING_REVIEW,
      StockTakeStatus.IN_PROGRESS,
      req.user?.id,
      remark || '驳回复核'
    );

    res.json(updatedStockTake);
  } catch (_error) {
    res.status(400).json({ message: '驳回失败', error: (_error as any).message });
  }
});

router.put('/:id', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req, res) => {
  try {
    const stockTakeId = Number(req.params.id);
    const payload = stockTakeUpdateSchema.parse(req.body);

    const stockTake = await prisma.stockTake.findUnique({
      where: { id: stockTakeId },
    });

    if (!stockTake) {
      return res.status(404).json({ message: '盘点单不存在' });
    }

    if (stockTake.status !== StockTakeStatus.DRAFT) {
      return res.status(400).json({ message: '只能在草稿状态编辑盘点单' });
    }

    const data: any = { ...payload };
    if (payload.categoryId === null) {
      data.categoryId = undefined;
    }

    const updatedStockTake = await prisma.stockTake.update({
      where: { id: stockTakeId },
      data,
      include: {
        createdBy: { select: { id: true, username: true } },
        reviewedBy: { select: { id: true, username: true } },
        category: true,
      },
    });

    res.json(updatedStockTake);
  } catch (_error) {
    res.status(400).json({ message: '更新盘点单失败', error: (_error as any).message });
  }
});

router.delete('/:id', authenticate, authorize([Role.ADMIN]), async (req, res) => {
  try {
    const stockTakeId = Number(req.params.id);

    const stockTake = await prisma.stockTake.findUnique({
      where: { id: stockTakeId },
    });

    if (!stockTake) {
      return res.status(404).json({ message: '盘点单不存在' });
    }

    if (stockTake.status === StockTakeStatus.COMPLETED) {
      return res.status(400).json({ message: '已完成的盘点单不能删除' });
    }

    await prisma.stockTake.delete({
      where: { id: stockTakeId },
    });

    res.json({ message: '盘点单已删除' });
  } catch (_error) {
    res.status(400).json({ message: '删除盘点单失败' });
  }
});

export default router;
