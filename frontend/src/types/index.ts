export interface Category {
  id: number;
  name: string;
}

export interface Book {
  id: number;
  title: string;
  author: string;
  isbn: string;
  stock: number;
  price: number;
  description?: string;
  categoryId: number;
  category: Category;
  createdAt: string;
  updatedAt: string;
}

export interface BorrowRecord {
  id: number;
  bookId: number;
  book: Book;
  borrowerId: number;
  borrower: {
    id: number;
    name: string;
  };
  borrowDate: string;
  dueDate: string;
  returnDate?: string;
  status: 'BORROWED' | 'RETURNED';
  fine?: FineInfo;
}

export type FineStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'WAIVED';

export interface FineInfo {
  overdueDays: number;
  totalAmount: number;
  dailyRate: number;
  graceDays: number;
  lastCalculated?: string;
}

export interface FinePayment {
  id: number;
  fineId: number;
  amount: number;
  receiptNo?: string;
  operatorId?: number;
  operator?: {
    id: number;
    username: string;
  };
  remark?: string;
  createdAt: string;
}

export interface Fine {
  id: number;
  borrowRecordId: number;
  borrowRecord: {
    id: number;
    book: Book;
    borrowDate: string;
    dueDate: string;
    returnDate?: string;
  };
  borrowerId: number;
  borrower: {
    id: number;
    name: string;
    phone?: string;
    email?: string;
  };
  totalAmount: number;
  paidAmount: number;
  waivedAmount: number;
  overdueDays: number;
  dailyRate: number;
  graceDays: number;
  status: FineStatus;
  lastCalculated?: string;
  receiptNo?: string;
  waiveRemark?: string;
  waiveOperatorId?: number;
  waiveOperator?: {
    id: number;
    username: string;
  };
  payments: FinePayment[];
  createdAt: string;
  updatedAt: string;
}

export interface FineSettings {
  dailyRate: number;
  fineCap: number;
  graceDays: number;
  maxBorrowDays: number;
}

export interface FineStats {
  counts: {
    pending: number;
    partial: number;
    paid: number;
    waived: number;
  };
  totalPendingAmount: number;
}

export type ReservationStatus = 'PENDING' | 'PENDING_PICKUP' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';

export interface ReservationStatusLog {
  id: number;
  reservationId: number;
  fromStatus?: ReservationStatus;
  toStatus: ReservationStatus;
  operatorId?: number;
  operator?: {
    id: number;
    username: string;
  };
  remark?: string;
  createdAt: string;
}

export interface Reservation {
  id: number;
  bookId: number;
  book: Book;
  borrowerId: number;
  borrower: {
    id: number;
    name: string;
    phone?: string;
    email?: string;
  };
  status: ReservationStatus;
  queueNumber: number;
  createdAt: string;
  expiresAt?: string;
  pickedUpAt?: string;
  cancelledAt?: string;
  position?: number;
  aheadCount?: number;
  statusLogs?: ReservationStatusLog[];
}
