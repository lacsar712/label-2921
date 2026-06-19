import { describe, it, expect } from 'vitest';
import { categorySchema, bookSchema, bookUpdateSchema } from './validators';

describe('Validators', () => {
  describe('categorySchema', () => {
    it('should validate valid category', () => {
      const validCategory = { name: 'Science' };
      expect(categorySchema.parse(validCategory)).toEqual(validCategory);
    });

    it('should reject empty category name', () => {
      expect(() => categorySchema.parse({ name: '' })).toThrow();
    });
  });

  describe('bookSchema', () => {
    it('should validate valid book', () => {
      const validBook = {
        title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        isbn: '9780743273565',
        categoryId: 1,
        price: 15.99,
        stock: 10,
        description: 'A classic novel'
      };
      expect(bookSchema.parse(validBook)).toEqual(validBook);
    });

    it('should reject missing required fields', () => {
      const invalidBook = {
        title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald'
        // missing isbn, categoryId, price, stock
      };
      expect(() => bookSchema.parse(invalidBook)).toThrow();
    });

    it('should reject negative price', () => {
      const invalidBook = {
        title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        isbn: '9780743273565',
        categoryId: 1,
        price: -1,
        stock: 10
      };
      expect(() => bookSchema.parse(invalidBook)).toThrow();
    });
  });

  describe('bookUpdateSchema', () => {
    it('should validate partial book update', () => {
      const partialUpdate = { title: 'Updated Title' };
      expect(bookUpdateSchema.parse(partialUpdate)).toEqual(partialUpdate);
    });

    it('should validate full book update with id', () => {
      const fullUpdate = {
        id: 1,
        title: 'Updated Title',
        author: 'Updated Author',
        isbn: '1234567890',
        categoryId: 2,
        price: 20,
        stock: 5
      };
      expect(bookUpdateSchema.parse(fullUpdate)).toEqual(fullUpdate);
    });
  });
});
