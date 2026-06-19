import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import router from './books';
import prisma from '../utils/prisma';
import jwt from 'jsonwebtoken';

vi.mock('../utils/prisma', () => ({
  default: {
    book: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    borrowRecord: {
      count: vi.fn(),
    },
  },
}));

const app = express();
app.use(express.json());
app.use('/books', router);

const secret = process.env.JWT_SECRET || 'your_super_secret_jwt_key';
const adminToken = jwt.sign({ id: 1, username: 'admin', role: 'ADMIN' }, secret);
const librarianToken = jwt.sign({ id: 2, username: 'librarian', role: 'LIBRARIAN' }, secret);
const borrowerToken = jwt.sign({ id: 3, username: 'borrower', role: 'BORROWER' }, secret);

describe('Books Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /books', () => {
    it('should return all books', async () => {
      const mockBooks = [{ id: 1, title: 'Book 1' }];
      (prisma.book.findMany as any).mockResolvedValue(mockBooks);

      const response = await request(app).get('/books');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockBooks);
    });
  });

  describe('POST /books', () => {
    it('should create a book for admin', async () => {
      const newBook = {
        title: 'New Book',
        author: 'Author',
        isbn: '1234567890',
        categoryId: 1,
        price: 10,
        stock: 5,
      };
      const createdBook = { id: 1, ...newBook };
      (prisma.book.create as any).mockResolvedValue(createdBook);

      const response = await request(app)
        .post('/books')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newBook);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(createdBook);
    });

    it('should return 400 for invalid data', async () => {
      const response = await request(app)
        .post('/books')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: '' }); // Invalid data

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /books/:id', () => {
    it('should delete a book for admin', async () => {
      (prisma.book.delete as any).mockResolvedValue({});

      const response = await request(app)
        .delete('/books/1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Book deleted');
    });

    it('should return 403 for borrower', async () => {
      const response = await request(app)
        .delete('/books/1')
        .set('Authorization', `Bearer ${borrowerToken}`);

      expect(response.status).toBe(403);
    });
  });
});
