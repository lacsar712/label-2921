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

export const finePaymentSchema = z.object({
  amount: z.number().min(0.01, '支付金额必须大于0'),
  receiptNo: z.string().optional(),
  remark: z.string().optional(),
});

export const fineWaiveSchema = z.object({
  amount: z.number().min(0.01, '减免金额必须大于0').optional(),
  remark: z.string().min(1, '减免审批说明必填'),
});

export const fineSettingsSchema = z.object({
  dailyRate: z.number().min(0, '日费率不能小于0'),
  fineCap: z.number().min(0, '罚金上限不能小于0'),
  graceDays: z.number().int().min(0, '宽限天数不能小于0'),
  maxBorrowDays: z.number().int().min(1, '借阅期限至少1天'),
});

export const fineExportSchema = z.object({
  borrowerId: z.number().int().optional(),
  bookId: z.number().int().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});
