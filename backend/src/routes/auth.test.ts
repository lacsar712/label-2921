import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import authRoutes from './auth';
import prisma from '../utils/prisma';
import bcrypt from 'bcryptjs';

// Mock prisma
vi.mock('../utils/prisma', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

const app = express();
app.use(express.json());
app.use('/auth', authRoutes);

describe('Auth Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const password = 'password123';
      const hashedPassword = await bcrypt.hash(password, 10);
      
      (prisma.user.findUnique as any).mockResolvedValue({
        id: 1,
        username: 'admin',
        password: hashedPassword,
        role: 'ADMIN',
      });

      const response = await request(app)
        .post('/auth/login')
        .send({ username: 'admin', password });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.username).toBe('admin');
    });

    it('should return 401 for invalid credentials', async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);

      const response = await request(app)
        .post('/auth/login')
        .send({ username: 'nonexistent', password: 'password' });

      expect(response.status).toBe(401);
    });
  });
});
