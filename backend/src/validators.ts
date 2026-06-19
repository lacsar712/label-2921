import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(1, '用户名必填'),
  password: z.string().min(1, '密码必填'),
});

export const registerSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  role: z.enum(['ADMIN', 'LIBRARIAN']).optional(),
});

export const bookSchema = z.object({
  title: z.string().min(1),
  author: z.string().min(1),
  isbn: z.string().min(5),
  categoryId: z.number().int(),
  price: z.number().min(0),
  stock: z.number().int().min(0),
  description: z.string().optional(),
});

export const bookUpdateSchema = bookSchema.partial().extend({ id: z.number().int().optional() });

export const categorySchema = z.object({
  name: z.string().min(1),
});

export const borrowSchema = z.object({
  bookId: z.number().int(),
});

export const reservationSchema = z.object({
  bookId: z.number().int(),
  borrowerId: z.number().int(),
});

export const reservationStatusSchema = z.object({
  remark: z.string().optional(),
});
