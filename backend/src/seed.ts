import 'dotenv/config';
import { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import prisma from './utils/prisma';

async function main() {
  console.log('Initializing database with seed data...');
  
  // Create System Users
  const adminExists = await prisma.user.findUnique({ where: { username: 'admin' } });
  if (!adminExists) {
    const adminPassword = await bcrypt.hash('123456', 10);
    await prisma.user.create({
      data: {
        username: 'admin',
        password: adminPassword,
        role: Role.ADMIN,
      },
    });
  }

  const librarianExists = await prisma.user.findUnique({ where: { username: 'librarian' } });
  if (!librarianExists) {
    const librarianPassword = await bcrypt.hash('123456', 10);
    await prisma.user.create({
      data: {
        username: 'librarian',
        password: librarianPassword,
        role: Role.LIBRARIAN,
      },
    });
  }

  // Create sample borrower users in Borrower table
  const borrowerNames = ['zhangsan', 'lisi', 'wangwu', 'zhaoliu', 'qianqi', 'sunba', 'zhoujiu', 'wushi', 'zhengshi', 'fengshi', 'chushi', 'weishi'];
  
  for (const name of borrowerNames) {
    const exists = await prisma.borrower.findUnique({ where: { name } });
    if (!exists) {
      await prisma.borrower.create({
        data: {
          name: name,
          phone: `138${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
          email: `${name}@example.com`,
        },
      });
    }
  }

  // Create Categories
  const categories = await Promise.all([
    prisma.category.upsert({ where: { id: 1 }, update: {}, create: { name: '计算机科学' } }),
    prisma.category.upsert({ where: { id: 2 }, update: {}, create: { name: '文学' } }),
    prisma.category.upsert({ where: { id: 3 }, update: {}, create: { name: '历史' } }),
    prisma.category.upsert({ where: { id: 4 }, update: {}, create: { name: '艺术' } }),
    prisma.category.upsert({ where: { id: 5 }, update: {}, create: { name: '心理学' } }),
    prisma.category.upsert({ where: { id: 6 }, update: {}, create: { name: '经济学' } }),
  ]);

  // Create 100+ Books
  console.log('Generating 100+ books...');
  const bookTitles = [
    '深入浅出', '实战指南', '核心技术', '从入门到精通', '精要', '艺术', '哲学', '指南', '通史', '原理'
  ];
  const subjects = [
    'Vue 3', 'React', 'Node.js', 'TypeScript', 'Python', 'AI 编程', '算法', '设计模式', '微服务', 'Docker',
    '唐诗', '宋词', '明清小说', '世界文学', '中国历史', '古希腊文明', '文艺复兴', '现代艺术', '行为心理学', '宏观经济'
  ];
  const authors = [
    '张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十', 'Robert Smith', 'John Doe', 'Emily White'
  ];

  const booksData = [];
  for (let i = 1; i <= 100; i++) {
    const title = `${subjects[i % subjects.length]}${bookTitles[i % bookTitles.length]} Vol.${Math.floor(i / subjects.length) + 1}`;
    const author = authors[i % authors.length];
    const category = categories[i % categories.length];
    
    booksData.push({
      title,
      author,
      isbn: `9787${Math.floor(Math.random() * 1000000000).toString().padStart(9, '0')}`,
      stock: Math.floor(Math.random() * 50) + 1,
      price: parseFloat((Math.random() * 100 + 20).toFixed(2)),
      categoryId: category.id,
    });
  }

  // Use createMany for efficiency
  await prisma.book.createMany({
    data: booksData,
    skipDuplicates: true,
  });

  // Create Borrow Records for the last 7 days
  console.log('Generating borrow records for the last 7 days...');
  const allBooks = await prisma.book.findMany({ take: 50 });
  const allBorrowers = await prisma.borrower.findMany();
  
  if (allBorrowers.length > 0 && allBooks.length > 0) {
    const borrowRecords = [];
    const now = new Date();
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      
      // Generate 3-8 records per day
      const dailyCount = Math.floor(Math.random() * 6) + 3;
      for (let j = 0; j < dailyCount; j++) {
        const book = allBooks[Math.floor(Math.random() * allBooks.length)];
        const borrower = allBorrowers[Math.floor(Math.random() * allBorrowers.length)];
        
        borrowRecords.push({
          bookId: book.id,
          borrowerId: borrower.id,
          borrowDate: date,
          status: Math.random() > 0.3 ? 'RETURNED' : 'BORROWED',
          returnDate: Math.random() > 0.3 ? new Date(date.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000) : null,
        });
      }
    }
    
    await prisma.borrowRecord.createMany({
      data: borrowRecords,
    });
  }

  console.log('Seed data created successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
