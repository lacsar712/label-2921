import { Router } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma';
import { authenticate, AuthRequest, authorize } from '../middleware/auth';
import { registerSchema } from '../validators';
import { Role } from '@prisma/client';

const router = Router();

// Get all system users (Admin only)
router.get('/', authenticate, authorize([Role.ADMIN]), async (req: AuthRequest, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(users);
  } catch (_error) {
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// Get user by ID (Admin only)
router.get('/:id', authenticate, authorize([Role.ADMIN]), async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: Number(req.params.id),
      },
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      }
    });
    if (!user) {
      return res.status(404).json({ message: 'System user not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch user' });
  }
});

// Create system user (Admin only)
router.post('/', authenticate, authorize([Role.ADMIN]), async (req: AuthRequest, res) => {
  try {
    const { username, password, role } = registerSchema.parse({
      username: req.body.username,
      password: req.body.password,
      role: req.body.role || 'LIBRARIAN'
    });

    const exists = await prisma.user.findUnique({ where: { username } });
    if (exists) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        role: role as Role,
      },
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });
    res.status(201).json(user);
  } catch (_error) {
    res.status(400).json({ message: 'Validation failed or user already exists' });
  }
});

// Update system user (Admin only)
router.put('/:id', authenticate, authorize([Role.ADMIN]), async (req: AuthRequest, res) => {
  try {
    const { username, password, role } = req.body;
    const userId = Number(req.params.id);

    const data: any = {};
    if (username) data.username = username;
    if (role) data.role = role as Role;
    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });
    res.json(user);
  } catch (_error) {
    res.status(400).json({ message: 'Update failed' });
  }
});

// Delete system user (Admin only)
router.delete('/:id', authenticate, authorize([Role.ADMIN]), async (req: AuthRequest, res) => {
  try {
    const userId = Number(req.params.id);
    
    // Check if user is deleting themselves
    if (userId === req.user!.id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    await prisma.user.delete({ where: { id: userId } });
    res.json({ message: 'User deleted' });
  } catch (_error) {
    res.status(400).json({ message: 'Delete failed' });
  }
});

export default router;
