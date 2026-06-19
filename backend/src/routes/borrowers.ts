import { Router } from 'express';
import prisma from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Get all borrowers
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const borrowers = await prisma.borrower.findMany({
      include: {
        _count: {
          select: {
            borrows: {
              where: {
                status: 'BORROWED'
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(borrowers);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch borrowers' });
  }
});

// Get borrower by ID
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const borrower = await prisma.borrower.findUnique({
      where: {
        id: Number(req.params.id),
      },
      include: {
        borrows: {
          include: { book: true },
          orderBy: { borrowDate: 'desc' }
        }
      }
    });
    if (!borrower) {
      return res.status(404).json({ message: 'Borrower not found' });
    }
    res.json(borrower);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch borrower' });
  }
});

// Create borrower
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { name, phone, email } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }

    const exists = await prisma.borrower.findUnique({ where: { name } });
    if (exists) {
      return res.status(400).json({ message: 'Borrower with this name already exists' });
    }

    const borrower = await prisma.borrower.create({
      data: {
        name,
        phone,
        email,
      }
    });
    res.status(201).json(borrower);
  } catch (error) {
    res.status(400).json({ message: 'Failed to create borrower', error: (error as any).message });
  }
});

// Update borrower
router.put('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { name, phone, email } = req.body;
    const borrowerId = Number(req.params.id);

    const borrower = await prisma.borrower.update({
      where: {
        id: borrowerId,
      },
      data: {
        name,
        phone,
        email,
      }
    });

    res.json(borrower);
  } catch (_error) {
    res.status(400).json({ message: 'Update failed' });
  }
});

// Delete borrower
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const borrowerId = Number(req.params.id);

    // Check if borrower has active borrows
    const activeBorrows = await prisma.borrowRecord.count({
      where: {
        borrowerId,
        status: 'BORROWED'
      }
    });

    if (activeBorrows > 0) {
      return res.status(400).json({ message: 'Cannot delete borrower with active borrow records' });
    }

    await prisma.borrower.delete({
      where: {
        id: borrowerId,
      }
    });

    res.json({ message: 'Borrower deleted successfully' });
  } catch (_error) {
    res.status(400).json({ message: 'Delete failed' });
  }
});

// Get borrower's current borrow records
router.get('/:id/borrows', authenticate, async (req: AuthRequest, res) => {
  try {
    const borrowerId = Number(req.params.id);
    const borrows = await prisma.borrowRecord.findMany({
      where: {
        borrowerId,
        status: 'BORROWED'
      },
      include: {
        book: {
          include: {
            category: true
          }
        }
      },
      orderBy: { borrowDate: 'desc' }
    });
    res.json(borrows);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch borrow records' });
  }
});

export default router;