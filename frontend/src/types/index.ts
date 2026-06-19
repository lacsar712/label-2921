export interface Category {
  id: number;
  name: string;
}

export interface Tag {
  id: number;
  name: string;
  color: string;
  description?: string;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
  _count?: { bookTags: number };
  bookCount?: number;
  recentBorrowCount?: number;
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
  publisherId?: number;
  publisher?: Publisher;
  tags?: Tag[];
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

export type ZoneType = 'SILENT' | 'DISCUSSION' | 'GENERAL' | 'COMPUTER';
export type SeatStatus = 'AVAILABLE' | 'BANNED';
export type SeatReservationStatus = 'BOOKED' | 'CANCELLED' | 'CHECKED_IN' | 'NO_SHOW' | 'RELEASED';
export type TimeSlot = 'MORNING_1' | 'MORNING_2' | 'AFTERNOON_1' | 'AFTERNOON_2' | 'EVENING_1' | 'EVENING_2';

export interface TimeSlotInfo {
  label: string;
  start: string;
  end: string;
}

export interface ReadingRoom {
  id: number;
  name: string;
  description?: string;
  location?: string;
  openTime?: string;
  closeTime?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  zones?: ReadingZone[];
}

export interface ReadingZone {
  id: number;
  name: string;
  type: ZoneType;
  description?: string;
  readingRoomId: number;
  readingRoom?: ReadingRoom;
  seats?: Seat[];
  createdAt: string;
  updatedAt: string;
  _count?: { seats: number };
}

export interface Seat {
  id: number;
  seatNumber: string;
  zoneId: number;
  zone?: ReadingZone;
  hasPowerOutlet: boolean;
  isWindowSide: boolean;
  status: SeatStatus;
  banReason?: string;
  createdAt: string;
  updatedAt: string;
  reservedSlots?: TimeSlot[];
}

export interface SeatReservation {
  id: number;
  seatId: number;
  seat: Seat & {
    zone: ReadingZone & {
      readingRoom: ReadingRoom;
    };
  };
  borrowerId: number;
  borrower: {
    id: number;
    name: string;
    phone?: string;
    email?: string;
  };
  date: string;
  timeSlot: TimeSlot;
  status: SeatReservationStatus;
  checkedInAt?: string;
  cancelledAt?: string;
  noShowAt?: string;
  releasedAt?: string;
  operatorId?: number;
  operator?: {
    id: number;
    username: string;
  };
  remark?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SeatBoardSlot {
  zone: { id: number; name: string; type: ZoneType };
  seats: Array<{
    seat: Seat;
    slots: Record<string, SeatReservation | null>;
  }>;
}

export interface SeatBoardData {
  date: string;
  timeSlots: TimeSlot[];
  timeSlotLabels: Record<TimeSlot, TimeSlotInfo>;
  zones: SeatBoardSlot[];
}

export interface SlotStats {
  total: number;
  booked: number;
  checkedIn: number;
  utilization: number;
}

export interface ReadingRoomStats {
  date: string;
  totalSeats: number;
  availableSeats: number;
  bannedSeats: number;
  totalReservations: number;
  statusCounts: Record<SeatReservationStatus, number>;
  slotStats: Record<TimeSlot, SlotStats>;
  timeSlotLabels: Record<TimeSlot, TimeSlotInfo>;
}

export type CooperationLevel = 'A' | 'B' | 'C' | 'D';

export interface Publisher {
  id: number;
  name: string;
  location?: string;
  postalCode?: string;
  phone?: string;
  website?: string;
  cooperationLevel: CooperationLevel;
  createdAt: string;
  updatedAt: string;
  bookCount?: number;
  totalStock?: number;
  recentBorrowCount?: number;
}

export interface PublisherBook {
  id: number;
  title: string;
  author: string;
  isbn: string;
  stock: number;
  price: number;
  category: string;
  totalBorrows: number;
  recentBorrows: number;
}

export interface PublisherDetail extends Publisher {
  books: PublisherBook[];
  statistics: {
    bookCount: number;
    totalStock: number;
    totalBorrows: number;
    recentBorrowCount: number;
  };
}

export interface Borrower {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BookReview {
  id: number;
  bookId: number;
  book?: {
    id: number;
    title: string;
    author: string;
    isbn?: string;
  };
  borrowerId: number;
  borrower?: Borrower;
  borrowRecordId: number;
  rating: number;
  comment?: string;
  isComplaint: boolean;
  officialReply?: string;
  officialReplyAt?: string;
  officialReplyById?: number;
  officialReplyBy?: {
    id: number;
    username: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface BookReviewSummaryItem {
  bookId: number;
  title: string;
  author: string;
  isbn: string;
  avgRating: number;
  reviewCount: number;
  ratingDistribution: Record<number, number>;
  complaintCount: number;
  unrepliedCount: number;
}

export interface BookReviewListResponse {
  data: BookReview[];
  total: number;
  page: number;
  pageSize: number;
}

export interface RatingDistribution {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
}

export interface BookWithRating extends Book {
  avgRating: number;
  reviewCount: number;
  ratingDistribution?: RatingDistribution;
  reviews?: BookReview[];
}

export interface EligibleBorrowRecord {
  id: number;
  bookId: number;
  borrowerId: number;
  borrowDate: string;
  dueDate: string;
  returnDate?: string;
  status: string;
  book: {
    id: number;
    title: string;
    author: string;
    isbn: string;
  };
}

export interface ReviewEditConfig {
  editDays: number;
}
