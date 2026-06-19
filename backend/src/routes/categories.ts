import { Router } from 'express';
import prisma from '../utils/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { Role } from '@prisma/client';
import { categorySchema } from '../validators';

const router = Router();

router.get('/', async (req, res) => {
  const categories = await prisma.category.findMany();
  res.json(categories);
});

router.post('/', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req, res) => {
  try {
    const payload = categorySchema.parse(req.body);
    const category = await prisma.category.create({ data: payload });
    res.status(201).json(category);
  } catch (_error) {
    res.status(400).json({ message: 'Failed to create category', error: (_error as any).message });
  }
});

router.put('/:id', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req, res) => {
  try {
    const payload = categorySchema.parse(req.body);
    const category = await prisma.category.update({
      where: { id: Number(req.params.id) },
      data: payload
    });
    res.json(category);
  } catch (_error) {
    res.status(400).json({ message: 'Failed to update category', error: (_error as any).message });
  }
});

router.delete('/:id', authenticate, authorize([Role.ADMIN]), async (req, res) => {
  try {
    await prisma.category.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Category deleted' });
  } catch (_error) {
    res.status(400).json({ message: 'Failed to delete category' });
  }
});

export default router;
