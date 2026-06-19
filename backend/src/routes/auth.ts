import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';
import { loginSchema, registerSchema } from '../validators';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key';

/**
 * @route POST /api/auth/login
 * @desc User login and JWT token generation
 * @access Public
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: { id: user.id, username: user.username, role: user.role },
    });
  } catch (_error) {
    res.status(400).json({ message: 'Validation failed' });
  }
});

/**
 * @route POST /api/auth/register
 * @desc User registration (Internal/Admin only in a real scenario)
 * @access Public
 */
router.post('/register', async (req, res) => {
  try {
    const { username, password, role } = registerSchema.parse(req.body);
    const exists = await prisma.user.findUnique({ where: { username } });
    if (exists) return res.status(400).json({ message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        role: role || 'LIBRARIAN',
      },
    });

    res.status(201).json({ message: 'User created' });
  } catch (_error) {
    res.status(400).json({ message: 'User already exists or validation failed' });
  }
});

export default router;
