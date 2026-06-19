import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import router from './categories';
import prisma from '../utils/prisma';
import jwt from 'jsonwebtoken';

vi.mock('../utils/prisma', () => ({
  default: {
    category: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

const app = express();
app.use(express.json());
app.use('/categories', router);

const secret = process.env.JWT_SECRET || 'your_super_secret_jwt_key';
const adminToken = jwt.sign({ id: 1, username: 'admin', role: 'ADMIN' }, secret);
const librarianToken = jwt.sign({ id: 2, username: 'librarian', role: 'LIBRARIAN' }, secret);
const borrowerToken = jwt.sign({ id: 3, username: 'borrower', role: 'BORROWER' }, secret);

describe('Categories Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /categories', () => {
    it('should return all categories', async () => {
      const mockCategories = [{ id: 1, name: 'Science' }];
      (prisma.category.findMany as any).mockResolvedValue(mockCategories);

      const response = await request(app).get('/categories');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockCategories);
    });
  });

  describe('POST /categories', () => {
    it('should create a category for admin', async () => {
      const newCategory = { name: 'History' };
      const createdCategory = { id: 2, ...newCategory };
      (prisma.category.create as any).mockResolvedValue(createdCategory);

      const response = await request(app)
        .post('/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newCategory);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(createdCategory);
    });

    it('should return 403 for borrower', async () => {
      const response = await request(app)
        .post('/categories')
        .set('Authorization', `Bearer ${borrowerToken}`)
        .send({ name: 'History' });

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /categories/:id', () => {
    it('should delete a category for admin', async () => {
      (prisma.category.delete as any).mockResolvedValue({});

      const response = await request(app)
        .delete('/categories/1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Category deleted');
    });

    it('should return 403 for librarian', async () => {
      const response = await request(app)
        .delete('/categories/1')
        .set('Authorization', `Bearer ${librarianToken}`);

      expect(response.status).toBe(403);
    });
  });
});
