export interface Category {
  id: number;
  name: string;
}

export type AuthorStatus = 'ACTIVE' | 'DISABLED';

export interface Author {
  id: number;
  name: string;
  nationality?: string;
  birthYear?: number;
  deathYear?: number;
  biography?: string;
  representativeWorks?: string;
  pinyinInitial?: string;
  status: AuthorStatus;
  createdAt: string;
  updatedAt: string;
  bookCount?: number;
  _count?: { bookAuthors: number };
}

export interface AuthorBook {
  id: number;
  title: string;
  isbn: string;
  stock: number;
  price: number;
  category: string;
  totalBorrows: number;
  avgRating: number;
  reviewCount: number;
}

export interface AuthorDetail extends Author {
  books: AuthorBook[];
  statistics: {
    bookCount: number;
    totalStock: number;
    totalBorrows: number;
    overallAvgRating: number;
  };
}

export interface AuthorListResponse {
  data: Author[];
  total: number;
  page: number;
  pageSize: number;
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
  isDonation: boolean;
  sourceDonationId?: number;
  donorName?: string;
  donationChannel?: string;
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

export type AnnouncementStatus = 'DRAFT' | 'PENDING' | 'PUBLISHED' | 'ARCHIVED';
export type AnnouncementScope = 'ALL' | 'ADMIN' | 'LIBRARIAN';

export interface Announcement {
  id: number;
  title: string;
  summary?: string;
  content: string;
  contentType?: string;
  coverImage?: string;
  scope: AnnouncementScope;
  status: AnnouncementStatus;
  isPinned: boolean;
  pinWeight: number;
  publishAt?: string;
  expireAt?: string;
  createdById?: number;
  createdBy?: {
    id: number;
    username: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AnnouncementListResponse {
  data: Announcement[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AnnouncementForm {
  title: string;
  summary?: string;
  content: string;
  contentType?: string;
  coverImage?: string;
  scope: AnnouncementScope;
  status: AnnouncementStatus;
  isPinned: boolean;
  pinWeight: number;
  publishAt?: string | null;
  expireAt?: string | null;
}

export type DonationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PARTIAL_STOCKED' | 'STOCKED';
export type BookCondition = 'NEW' | 'LIKE_NEW' | 'GOOD' | 'FAIR' | 'POOR';
export type DonationChannel = 'INDIVIDUAL' | 'ORGANIZATION' | 'ONLINE' | 'EVENT' | 'OTHER';

export interface DonationBook {
  id: number;
  donationId: number;
  bookId?: number;
  book?: Book;
  title: string;
  isbn?: string;
  quantity: number;
  condition: BookCondition;
  estimatedValue: number;
  donationDate: string;
  categoryId?: number;
  category?: Category;
  stockedQty: number;
  isStocked: boolean;
  remark?: string;
  createdAt: string;
  updatedAt: string;
  remainingQty?: number;
  canStockIn?: boolean;
  currentStock?: number;
}

export interface DonationStatusLog {
  id: number;
  donationId: number;
  fromStatus?: DonationStatus;
  toStatus: DonationStatus;
  operatorId?: number;
  operator?: {
    id: number;
    username: string;
  };
  remark?: string;
  createdAt: string;
}

export interface Donation {
  id: number;
  donorName: string;
  donorUnit?: string;
  donorPhone?: string;
  donorEmail?: string;
  channel: DonationChannel;
  status: DonationStatus;
  totalBooks: number;
  totalQty: number;
  totalValue: number;
  remark?: string;
  createdById?: number;
  createdBy?: {
    id: number;
    username: string;
  };
  reviewedById?: number;
  reviewedBy?: {
    id: number;
    username: string;
  };
  reviewedAt?: string;
  reviewRemark?: string;
  stockedById?: number;
  stockedBy?: {
    id: number;
    username: string;
  };
  stockedAt?: string;
  items: DonationBook[];
  statusLogs?: DonationStatusLog[];
  createdAt: string;
  updatedAt: string;
}

export interface DonationListResponse {
  data: Donation[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DonationBookForm {
  title: string;
  isbn?: string | null;
  quantity: number;
  condition?: BookCondition;
  estimatedValue?: number;
  donationDate?: string;
  categoryId?: number | null;
  remark?: string;
}

export interface DonationForm {
  donorName: string;
  donorUnit?: string | null;
  donorPhone?: string | null;
  donorEmail?: string | null;
  channel?: DonationChannel;
  remark?: string;
  items: DonationBookForm[];
}

export interface DonationStockInItem {
  itemId: number;
  bookId?: number;
  categoryId: number;
  quantity: number;
  price?: number;
  publisherId?: number | null;
  author?: string;
}

export interface DonationStockInForm {
  items: DonationStockInItem[];
}

export type StockTakeStatus = 'DRAFT' | 'IN_PROGRESS' | 'PENDING_REVIEW' | 'COMPLETED';
export type DiffReason = 'NORMAL' | 'LOST' | 'DAMAGED' | 'MISPLACED' | 'OTHER';

export interface StockTakeStatusLog {
  id: number;
  stockTakeId: number;
  fromStatus?: StockTakeStatus;
  toStatus: StockTakeStatus;
  operatorId?: number;
  operator?: {
    id: number;
    username: string;
  };
  remark?: string;
  createdAt: string;
}

export interface StockTake {
  id: number;
  title: string;
  status: StockTakeStatus;
  totalBooks: number;
  totalExpectedQty: number;
  totalActualQty: number;
  totalDiffQty: number;
  totalDiffAmount: number;
  categoryId?: number;
  category?: Category;
  remark?: string;
  createdById?: number;
  createdBy?: {
    id: number;
    username: string;
  };
  startedAt?: string;
  submittedAt?: string;
  reviewedById?: number;
  reviewedBy?: {
    id: number;
    username: string;
  };
  reviewedAt?: string;
  completedAt?: string;
  statusLogs?: StockTakeStatusLog[];
  createdAt: string;
  updatedAt: string;
}

export interface StockTakeItem {
  id: number;
  stockTakeId: number;
  bookId: number;
  bookTitle: string;
  bookIsbn: string;
  bookPrice: number;
  expectedStock: number;
  actualStock?: number;
  diffQty: number;
  diffAmount: number;
  diffReason?: DiffReason;
  locationRemark?: string;
  isCounted: boolean;
  countedById?: number;
  countedBy?: {
    id: number;
    username: string;
  };
  countedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockTakeListResponse {
  data: StockTake[];
  total: number;
  page: number;
  pageSize: number;
}

export interface StockTakeItemListResponse {
  data: StockTakeItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface StockTakeDiffSummary {
  totalCounted: number;
  normalCount: number;
  lossCount: number;
  gainCount: number;
  lossTotalQty: number;
  gainTotalQty: number;
  lossTotalAmount: number;
  gainTotalAmount: number;
  reasonStats: Array<{
    reason: DiffReason;
    count: number;
    qty: number;
    amount: number;
  }>;
}

export interface StockTakeTrendItem {
  month: string;
  stockTakeCount: number;
  totalBooks: number;
  totalExpectedQty: number;
  totalActualQty: number;
  totalDiffQty: number;
  totalDiffAmount: number;
}
