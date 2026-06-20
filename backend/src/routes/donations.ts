import { Router, Request } from 'express';
import prisma from '../utils/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { Role, DonationStatus } from '@prisma/client';
import {
  donationSchema,
  donationUpdateSchema,
  donationQuerySchema,
  donationReviewSchema,
  donationStockInSchema,
} from '../validators';

const router = Router();

interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    role: Role;
  };
}

function calculateTotals(items: Array<{ quantity: number; estimatedValue: number }>) {
  const totalBooks = items.length;
  const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = items.reduce((sum, item) => sum + item.quantity * item.estimatedValue, 0);
  return { totalBooks, totalQty, totalValue };
}

router.get('/', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req: AuthRequest, res) => {
  try {
    const query = donationQuerySchema.parse(req.query);
    const { status, donorName, channel, startDate, endDate, page = 1, pageSize = 20 } = query;

    const where: any = {};

    if (status) {
      where.status = status;
    }
    if (donorName) {
      where.donorName = { contains: donorName };
    }
    if (channel) {
      where.channel = channel;
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate + 'T23:59:59');
      }
    }

    const [total, donations] = await Promise.all([
      prisma.donation.count({ where }),
      prisma.donation.findMany({
        where,
        include: {
          createdBy: { select: { id: true, username: true } },
          reviewedBy: { select: { id: true, username: true } },
          items: {
            include: {
              category: true,
              book: {
                select: {
                  id: true,
                  title: true,
                  isbn: true,
                  stock: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    res.json({
      data: donations,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (_error) {
    res.status(400).json({ message: '获取捐赠列表失败', error: (_error as any).message });
  }
});

router.get('/:id', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req, res) => {
  try {
    const donation = await prisma.donation.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        createdBy: { select: { id: true, username: true } },
        reviewedBy: { select: { id: true, username: true } },
        stockedBy: { select: { id: true, username: true } },
        items: {
          include: {
            category: true,
            book: {
              include: {
                category: true,
                publisher: true,
              },
            },
          },
        },
        statusLogs: {
          include: {
            operator: { select: { id: true, username: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!donation) {
      return res.status(404).json({ message: '捐赠记录不存在' });
    }

    res.json(donation);
  } catch (_error) {
    res.status(400).json({ message: '获取捐赠详情失败', error: (_error as any).message });
  }
});

router.post('/', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req: AuthRequest, res) => {
  try {
    const payload = donationSchema.parse(req.body);
    const userId = req.user?.id;

    const { totalBooks, totalQty, totalValue } = calculateTotals(
      payload.items.map((item) => ({
        quantity: item.quantity,
        estimatedValue: item.estimatedValue || 0,
      }))
    );

    const donation = await prisma.donation.create({
      data: {
        donorName: payload.donorName,
        donorUnit: payload.donorUnit || null,
        donorPhone: payload.donorPhone || null,
        donorEmail: payload.donorEmail || null,
        channel: payload.channel || 'INDIVIDUAL',
        remark: payload.remark,
        totalBooks,
        totalQty,
        totalValue,
        createdById: userId,
        items: {
          create: payload.items.map((item) => ({
            title: item.title,
            isbn: item.isbn || null,
            quantity: item.quantity,
            condition: item.condition || 'GOOD',
            estimatedValue: item.estimatedValue || 0,
            donationDate: item.donationDate ? new Date(item.donationDate) : new Date(),
            categoryId: item.categoryId || null,
            remark: item.remark,
          })),
        },
        statusLogs: {
          create: {
            toStatus: DonationStatus.PENDING,
            operatorId: userId,
            remark: '创建捐赠单',
          },
        },
      },
      include: {
        items: true,
        statusLogs: true,
      },
    });

    res.status(201).json(donation);
  } catch (_error) {
    res.status(400).json({ message: '创建捐赠单失败', error: (_error as any).message });
  }
});

router.put('/:id', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req, res) => {
  try {
    const donationId = Number(req.params.id);
    const payload = donationUpdateSchema.parse(req.body);

    const existingDonation = await prisma.donation.findUnique({
      where: { id: donationId },
      include: { items: true },
    });

    if (!existingDonation) {
      return res.status(404).json({ message: '捐赠记录不存在' });
    }

    if (existingDonation.status !== DonationStatus.PENDING) {
      return res.status(400).json({ message: '只有待审核状态的捐赠单可以编辑' });
    }

    const updateData: any = {};

    if (payload.donorName !== undefined) updateData.donorName = payload.donorName;
    if (payload.donorUnit !== undefined) updateData.donorUnit = payload.donorUnit;
    if (payload.donorPhone !== undefined) updateData.donorPhone = payload.donorPhone;
    if (payload.donorEmail !== undefined) updateData.donorEmail = payload.donorEmail;
    if (payload.channel !== undefined) updateData.channel = payload.channel;
    if (payload.remark !== undefined) updateData.remark = payload.remark;

    if (payload.items && payload.items.length > 0) {
      const { totalBooks, totalQty, totalValue } = calculateTotals(
        payload.items.map((item) => ({
          quantity: item.quantity,
          estimatedValue: item.estimatedValue || 0,
        }))
      );

      updateData.totalBooks = totalBooks;
      updateData.totalQty = totalQty;
      updateData.totalValue = totalValue;
      updateData.items = {
        deleteMany: {},
        create: payload.items.map((item) => ({
          title: item.title,
          isbn: item.isbn || null,
          quantity: item.quantity,
          condition: item.condition || 'GOOD',
          estimatedValue: item.estimatedValue || 0,
          donationDate: item.donationDate ? new Date(item.donationDate) : new Date(),
          categoryId: item.categoryId || null,
          remark: item.remark,
        })),
      };
    }

    const donation = await prisma.donation.update({
      where: { id: donationId },
      data: updateData,
      include: { items: true },
    });

    res.json(donation);
  } catch (_error) {
    res.status(400).json({ message: '更新捐赠单失败', error: (_error as any).message });
  }
});

router.delete('/:id', authenticate, authorize([Role.ADMIN]), async (req, res) => {
  try {
    const donationId = Number(req.params.id);

    const existingDonation = await prisma.donation.findUnique({
      where: { id: donationId },
    });

    if (!existingDonation) {
      return res.status(404).json({ message: '捐赠记录不存在' });
    }

    if (existingDonation.status !== DonationStatus.PENDING && existingDonation.status !== DonationStatus.REJECTED) {
      return res.status(400).json({ message: '只能删除待审核或已拒绝的捐赠单' });
    }

    await prisma.donation.delete({
      where: { id: donationId },
    });

    res.json({ message: '删除成功' });
  } catch (_error) {
    res.status(400).json({ message: '删除捐赠单失败', error: (_error as any).message });
  }
});

router.post('/:id/review', authenticate, authorize([Role.ADMIN]), async (req: AuthRequest, res) => {
  try {
    const donationId = Number(req.params.id);
    const payload = donationReviewSchema.parse(req.body);
    const userId = req.user?.id;

    const existingDonation = await prisma.donation.findUnique({
      where: { id: donationId },
    });

    if (!existingDonation) {
      return res.status(404).json({ message: '捐赠记录不存在' });
    }

    if (existingDonation.status !== DonationStatus.PENDING) {
      return res.status(400).json({ message: '只有待审核状态的捐赠单可以审核' });
    }

    const newStatus = payload.status === 'APPROVED' ? DonationStatus.APPROVED : DonationStatus.REJECTED;

    const donation = await prisma.donation.update({
      where: { id: donationId },
      data: {
        status: newStatus,
        reviewedById: userId,
        reviewedAt: new Date(),
        reviewRemark: payload.remark,
        statusLogs: {
          create: {
            fromStatus: DonationStatus.PENDING,
            toStatus: newStatus,
            operatorId: userId,
            remark: payload.remark || (payload.status === 'APPROVED' ? '审核通过' : '审核拒绝'),
          },
        },
      },
      include: {
        items: true,
        statusLogs: true,
      },
    });

    res.json(donation);
  } catch (_error) {
    res.status(400).json({ message: '审核失败', error: (_error as any).message });
  }
});

router.post('/:id/stock-in', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req: AuthRequest, res) => {
  try {
    const donationId = Number(req.params.id);
    const payload = donationStockInSchema.parse(req.body);
    const userId = req.user?.id;

    const existingDonation = await prisma.donation.findUnique({
      where: { id: donationId },
      include: { items: true },
    });

    if (!existingDonation) {
      return res.status(404).json({ message: '捐赠记录不存在' });
    }

    if (existingDonation.status !== DonationStatus.APPROVED && existingDonation.status !== DonationStatus.PARTIAL_STOCKED) {
      return res.status(400).json({ message: '只有已审核或部分入库状态的捐赠单可以入库' });
    }

    const donationInfo = existingDonation;

    const result = await prisma.$transaction(async (tx) => {
      for (const stockItem of payload.items) {
        const donationItem = await tx.donationBook.findUnique({
          where: { id: stockItem.itemId },
        });

        if (!donationItem || donationItem.donationId !== donationId) {
          throw new Error(`捐赠图书项不存在: ${stockItem.itemId}`);
        }

        const remainingQty = donationItem.quantity - donationItem.stockedQty;
        if (stockItem.quantity > remainingQty) {
          throw new Error(`图书《${donationItem.title}》剩余可入库数量不足，剩余 ${remainingQty} 册`);
        }

        let bookId = stockItem.bookId;
        const isbn = donationItem.isbn || undefined;

        if (!bookId && isbn) {
          const existingBook = await tx.book.findUnique({
            where: { isbn },
          });
          if (existingBook) {
            bookId = existingBook.id;
          }
        }

        const donationSourceDescription = `捐赠来源：${donationInfo.donorName}${donationInfo.donorUnit ? `（${donationInfo.donorUnit}）` : ''}，捐赠单编号：${donationId}`;

        if (!bookId) {
          const newBook = await tx.book.create({
            data: {
              title: donationItem.title,
              author: stockItem.author || '未知捐赠作者',
              isbn: isbn || `DONATION-${donationId}-${stockItem.itemId}`,
              categoryId: stockItem.categoryId,
              publisherId: stockItem.publisherId || undefined,
              price: stockItem.price ?? donationItem.estimatedValue,
              stock: stockItem.quantity,
              description: donationItem.remark 
                ? `${donationItem.remark}\n\n${donationSourceDescription}`
                : donationSourceDescription,
              isDonation: true,
              sourceDonationId: donationId,
              donorName: donationInfo.donorName,
              donationChannel: donationInfo.channel,
            },
          });
          bookId = newBook.id;
        } else {
          const existingBook = await tx.book.findUnique({
            where: { id: bookId },
          });
          
          const updateData: any = {
            stock: { increment: stockItem.quantity },
          };
          
          if (existingBook && !existingBook.isDonation) {
            updateData.isDonation = true;
            updateData.sourceDonationId = donationId;
            updateData.donorName = donationInfo.donorName;
            updateData.donationChannel = donationInfo.channel;
            if (existingBook.description) {
              updateData.description = `${existingBook.description}\n\n${donationSourceDescription}`;
            } else {
              updateData.description = donationSourceDescription;
            }
          }
          
          await tx.book.update({
            where: { id: bookId },
            data: updateData,
          });
        }

        const newStockedQty = donationItem.stockedQty + stockItem.quantity;
        const isFullyStocked = newStockedQty >= donationItem.quantity;

        await tx.donationBook.update({
          where: { id: stockItem.itemId },
          data: {
            bookId,
            stockedQty: newStockedQty,
            isStocked: isFullyStocked,
            categoryId: stockItem.categoryId,
          },
        });
      }

      const allItems = await tx.donationBook.findMany({
        where: { donationId },
      });

      const allStocked = allItems.every((item) => item.isStocked);
      const anyStocked = allItems.some((item) => item.stockedQty > 0);

      let newStatus = existingDonation.status;
      if (allStocked) {
        newStatus = DonationStatus.STOCKED;
      } else if (anyStocked) {
        newStatus = DonationStatus.PARTIAL_STOCKED;
      }

      const updatedDonation = await tx.donation.update({
        where: { id: donationId },
        data: {
          status: newStatus,
          stockedById: allStocked ? userId : existingDonation.stockedById,
          stockedAt: allStocked ? new Date() : existingDonation.stockedAt,
          statusLogs: {
            create: {
              fromStatus: existingDonation.status,
              toStatus: newStatus,
              operatorId: userId,
              remark: `入库 ${payload.items.length} 种图书`,
            },
          },
        },
        include: {
          items: {
            include: {
              book: {
                select: {
                  id: true,
                  title: true,
                  isbn: true,
                  stock: true,
                },
              },
            },
          },
          statusLogs: true,
        },
      });

      return updatedDonation;
    });

    res.json(result);
  } catch (_error) {
    res.status(400).json({ message: '入库失败', error: (_error as any).message });
  }
});

router.get('/:id/stock-info', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req, res) => {
  try {
    const donationId = Number(req.params.id);

    const donation = await prisma.donation.findUnique({
      where: { id: donationId },
      include: {
        items: {
          include: {
            book: {
              select: {
                id: true,
                title: true,
                isbn: true,
                stock: true,
                category: true,
              },
            },
            category: true,
          },
        },
      },
    });

    if (!donation) {
      return res.status(404).json({ message: '捐赠记录不存在' });
    }

    const stockInfo = donation.items.map((item) => ({
      ...item,
      remainingQty: item.quantity - item.stockedQty,
      canStockIn: item.quantity - item.stockedQty > 0,
      currentStock: item.book?.stock || 0,
    }));

    res.json(stockInfo);
  } catch (_error) {
    res.status(400).json({ message: '获取入库信息失败', error: (_error as any).message });
  }
});

export default router;
