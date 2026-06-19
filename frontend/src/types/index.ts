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
  returnDate?: string;
  status: 'BORROWED' | 'RETURNED';
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
