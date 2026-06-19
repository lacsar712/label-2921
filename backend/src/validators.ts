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
  publisherId: z.number().int().optional().nullable(),
  price: z.number().min(0),
  stock: z.number().int().min(0),
  description: z.string().optional(),
  authorIds: z.array(z.number().int()).optional(),
  quickAuthors: z.array(z.object({
    name: z.string().min(1, '作者姓名必填'),
    nationality: z.string().optional(),
    birthYear: z.number().int().optional(),
    deathYear: z.number().int().optional(),
    biography: z.string().optional(),
    representativeWorks: z.string().optional(),
  })).optional(),
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

export const readingRoomSchema = z.object({
  name: z.string().min(1, '阅览室名称必填'),
  description: z.string().optional(),
  location: z.string().optional(),
  openTime: z.string().optional(),
  closeTime: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const readingZoneSchema = z.object({
  name: z.string().min(1, '区域名称必填'),
  type: z.enum(['SILENT', 'DISCUSSION', 'GENERAL', 'COMPUTER']).optional(),
  description: z.string().optional(),
  readingRoomId: z.number().int(),
});

export const seatSchema = z.object({
  seatNumber: z.string().min(1, '座位编号必填'),
  zoneId: z.number().int(),
  hasPowerOutlet: z.boolean().optional(),
  isWindowSide: z.boolean().optional(),
  status: z.enum(['AVAILABLE', 'BANNED']).optional(),
  banReason: z.string().optional(),
});

export const seatReservationSchema = z.object({
  seatId: z.number().int(),
  borrowerId: z.number().int(),
  date: z.string().min(1, '预约日期必填'),
  timeSlot: z.enum(['MORNING_1', 'MORNING_2', 'AFTERNOON_1', 'AFTERNOON_2', 'EVENING_1', 'EVENING_2']),
});

export const seatBanSchema = z.object({
  banReason: z.string().min(1, '封禁原因必填'),
});

export const seatReservationStatusSchema = z.object({
  remark: z.string().optional(),
});

export const tagSchema = z.object({
  name: z.string().min(1, '标签名称必填'),
  color: z.string().min(1, '标签颜色必填').optional(),
  description: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

export const tagUpdateSchema = tagSchema.partial();

export const bookTagSchema = z.object({
  tagIds: z.array(z.number().int()),
});

export const tagMergeSchema = z.object({
  sourceTagIds: z.array(z.number().int()).min(2, '至少选择2个标签进行合并'),
  targetTagId: z.number().int(),
});

export const authorSchema = z.object({
  name: z.string().min(1, '作者姓名必填'),
  nationality: z.string().optional(),
  birthYear: z.number().int().optional(),
  deathYear: z.number().int().optional(),
  biography: z.string().optional(),
  representativeWorks: z.string().optional(),
  pinyinInitial: z.string().optional(),
  status: z.enum(['ACTIVE', 'DISABLED']).optional(),
});

export const authorUpdateSchema = authorSchema.partial();

export const bookReviewSchema = z.object({
  borrowRecordId: z.number().int(),
  rating: z.number().int().min(1, '评分至少1分').max(5, '评分最多5分'),
  comment: z.string().optional(),
});

export const bookReviewUpdateSchema = z.object({
  rating: z.number().int().min(1, '评分至少1分').max(5, '评分最多5分').optional(),
  comment: z.string().optional(),
});

export const bookReviewReplySchema = z.object({
  reply: z.string().min(1, '回复内容必填'),
});

export const bookReviewQuerySchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  keyword: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isComplaint: z.boolean().optional(),
  hasOfficialReply: z.boolean().optional(),
  bookId: z.number().int().optional(),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
});

export const publisherSchema = z.object({
  name: z.string().min(1, '出版社名称必填'),
  location: z.string().optional(),
  postalCode: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  cooperationLevel: z.enum(['A', 'B', 'C', 'D']).optional(),
});

export const publisherUpdateSchema = publisherSchema.partial();

export const announcementSchema = z.object({
  title: z.string().min(1, '公告标题必填'),
  summary: z.string().optional(),
  content: z.string().min(1, '公告内容必填'),
  contentType: z.string().optional(),
  coverImage: z.string().optional(),
  scope: z.enum(['ALL', 'ADMIN', 'LIBRARIAN']).optional(),
  status: z.enum(['DRAFT', 'PENDING', 'PUBLISHED', 'ARCHIVED']).optional(),
  isPinned: z.boolean().optional(),
  pinWeight: z.number().int().optional(),
  publishAt: z.string().optional().nullable(),
  expireAt: z.string().optional().nullable(),
});

export const announcementUpdateSchema = announcementSchema.partial();

export const announcementQuerySchema = z.object({
  status: z.enum(['DRAFT', 'PENDING', 'PUBLISHED', 'ARCHIVED']).optional(),
  scope: z.enum(['ALL', 'ADMIN', 'LIBRARIAN']).optional(),
  keyword: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  isPinned: z.coerce.boolean().optional(),
});

export const stockTakeSchema = z.object({
  title: z.string().min(1, '盘点单标题必填'),
  categoryId: z.number().int().optional().nullable(),
  remark: z.string().optional(),
});

export const stockTakeUpdateSchema = stockTakeSchema.partial();

export const stockTakeQuerySchema = z.object({
  status: z.enum(['DRAFT', 'IN_PROGRESS', 'PENDING_REVIEW', 'COMPLETED']).optional(),
  keyword: z.string().optional(),
  month: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export const stockTakeItemSchema = z.object({
  actualStock: z.number().int().min(0, '实盘数量不能为负数'),
  diffReason: z.enum(['NORMAL', 'LOST', 'DAMAGED', 'MISPLACED', 'OTHER']).optional().nullable(),
  locationRemark: z.string().optional(),
});

export const stockTakeItemBatchSchema = z.object({
  items: z.array(z.object({
    bookId: z.number().int(),
    actualStock: z.number().int().min(0, '实盘数量不能为负数'),
    diffReason: z.enum(['NORMAL', 'LOST', 'DAMAGED', 'MISPLACED', 'OTHER']).optional().nullable(),
    locationRemark: z.string().optional(),
  })),
});

export const stockTakeReviewSchema = z.object({
  remark: z.string().optional(),
});

export const stockTakeTrendQuerySchema = z.object({
  startMonth: z.string().min(1, '开始月份必填'),
  endMonth: z.string().min(1, '结束月份必填'),
  categoryId: z.coerce.number().int().optional(),
});
