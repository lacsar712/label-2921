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
