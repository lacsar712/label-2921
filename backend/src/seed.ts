import 'dotenv/config';
import { Role, ZoneType, SeatStatus, TimeSlot, SeatReservationStatus } from '@prisma/client';
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

  // Create Authors
  console.log('Generating authors...');
  const authorsData = [
    { name: '张三', nationality: '中国', birthYear: 1965, deathYear: null, biography: '当代著名作家，中国作协成员，作品多次获得国家级文学奖项。', representativeWorks: '《春秋》、《岁月长河》', pinyinInitial: 'Z' },
    { name: '李四', nationality: '中国', birthYear: 1972, deathYear: null, biography: '历史学者，北京大学历史学系教授，专攻唐宋史研究。', representativeWorks: '《唐代政治制度研究》', pinyinInitial: 'L' },
    { name: '王五', nationality: '中国', birthYear: 1958, deathYear: 2020, biography: '已故著名翻译家，精通英法德三门外语，译著等身。', representativeWorks: '《百年孤独》中译本、《追忆似水年华》中译本', pinyinInitial: 'W' },
    { name: '赵六', nationality: '中国', birthYear: 1980, deathYear: null, biography: '青年计算机科学家，清华大学计算机系副教授，AI领域专家。', representativeWorks: '《深度学习原理与实践》', pinyinInitial: 'Z' },
    { name: '钱七', nationality: '中国', birthYear: 1975, deathYear: null, biography: '经济学博士，中国社会科学院研究员，宏观经济政策专家。', representativeWorks: '《中国经济转型论》', pinyinInitial: 'Q' },
    { name: '孙八', nationality: '中国', birthYear: 1968, deathYear: null, biography: '心理学教授，北京师范大学心理学院院长，临床心理学家。', representativeWorks: '《认知心理学导论》', pinyinInitial: 'S' },
    { name: '周九', nationality: '中国', birthYear: 1955, deathYear: null, biography: '美术学院教授，著名油画家，作品多次入选国际艺术展。', representativeWorks: '油画《晨曦》、《秋韵》', pinyinInitial: 'Z' },
    { name: '吴十', nationality: '中国', birthYear: 1983, deathYear: null, biography: '新锐科幻作家，作品被翻译成多国语言出版。', representativeWorks: '《星际迷航之中国故事》', pinyinInitial: 'W' },
    { name: 'Robert Smith', nationality: '美国', birthYear: 1960, deathYear: null, biography: 'MIT计算机科学教授，图灵奖获得者，算法设计领域权威。', representativeWorks: '《算法导论》合著者', pinyinInitial: 'R' },
    { name: 'John Doe', nationality: '英国', birthYear: 1970, deathYear: null, biography: '牛津大学文学教授，莎士比亚研究专家。', representativeWorks: '《莎士比亚戏剧研究》', pinyinInitial: 'J' },
    { name: 'Emily White', nationality: '法国', birthYear: 1985, deathYear: null, biography: '当代女性作家，龚古尔文学奖获得者。', representativeWorks: '《巴黎的冬天》', pinyinInitial: 'E' },
  ];

  const authors = [];
  for (const authorData of authorsData) {
    try {
      const author = await prisma.author.upsert({
        where: { name_birthYear: { name: authorData.name, birthYear: authorData.birthYear } },
        update: {},
        create: authorData,
      });
      authors.push(author);
    } catch (e) {
      console.log(`Author ${authorData.name} exists, skipping`);
    }
  }

  // Associate books with authors
  console.log('Associating books with authors...');
  const allBooksForAuthors = await prisma.book.findMany();
  
  for (let i = 0; i < allBooksForAuthors.length; i++) {
    const book = allBooksForAuthors[i];
    const authorIndex = i % authors.length;
    try {
      await prisma.bookAuthor.upsert({
        where: {
          bookId_authorId: { bookId: book.id, authorId: authors[authorIndex].id },
        },
        update: {},
        create: {
          bookId: book.id,
          authorId: authors[authorIndex].id,
        },
      });
      
      if (i % 7 === 0 && authorIndex + 1 < authors.length) {
        await prisma.bookAuthor.upsert({
          where: {
            bookId_authorId: { bookId: book.id, authorId: authors[(authorIndex + 1) % authors.length].id },
          },
          update: {},
          create: {
            bookId: book.id,
            authorId: authors[(authorIndex + 1) % authors.length].id,
          },
        });
      }
    } catch (e) {
      // Ignore duplicates
    }
  }

  // Create Book Reviews
  console.log('Generating book reviews...');
  const booksForReviews = await prisma.book.findMany({ take: 40 });
  const borrowersForReviews = await prisma.borrower.findMany();
  const existingReviews = await prisma.bookReview.count();
  
  if (existingReviews === 0 && booksForReviews.length > 0 && borrowersForReviews.length > 0) {
    const reviewsToCreate = [];
    for (let i = 0; i < 80; i++) {
      const book = booksForReviews[i % booksForReviews.length];
      const borrower = borrowersForReviews[Math.floor(Math.random() * borrowersForReviews.length)];
      
      const exists = reviewsToCreate.find(
        (r) => r.bookId === book.id && r.borrowerId === borrower.id,
      );
      if (exists) continue;
      
      const comments = [
        '这本书内容丰富，值得一读！',
        '作者文笔流畅，故事引人入胜。',
        '专业知识扎实，受益匪浅。',
        '观点独到，令人耳目一新。',
        '适合入门者，讲解清晰。',
        '装帧精美，纸质优良。',
        '翻译准确，读起来很顺畅。',
        '逻辑严密，论证有力。',
      ];
      
      reviewsToCreate.push({
        bookId: book.id,
        borrowerId: borrower.id,
        rating: Math.floor(Math.random() * 3) + 3, // 3-5 stars
        comment: Math.random() > 0.3 ? comments[Math.floor(Math.random() * comments.length)] : null,
      });
    }
    
    await prisma.bookReview.createMany({
      data: reviewsToCreate,
      skipDuplicates: true,
    });
    console.log(`Created ${reviewsToCreate.length} book reviews.`);
  }

  // Create Tags
  console.log('Generating tags...');
  const tagsData = [
    { name: '热门推荐', color: '#f56c6c', description: '图书馆热门推荐图书', sortOrder: 1 },
    { name: '新书上架', color: '#e6a23c', description: '新到馆的图书', sortOrder: 2 },
    { name: '经典必读', color: '#67c23a', description: '经典必读书目', sortOrder: 3 },
    { name: '考试必备', color: '#409eff', description: '考试复习必备书籍', sortOrder: 4 },
    { name: '轻松阅读', color: '#909399', description: '休闲轻松读物', sortOrder: 5 },
    { name: '深度思考', color: '#9b59b6', description: '深度思考类书籍', sortOrder: 6 },
    { name: '实践指南', color: '#16a085', description: '实用技术实践指南', sortOrder: 7 },
    { name: '获奖作品', color: '#f39c12', description: '获得各类奖项的作品', sortOrder: 8 },
  ];

  const tags = [];
  for (const tagData of tagsData) {
    const tag = await prisma.tag.upsert({
      where: { name: tagData.name },
      update: {},
      create: tagData,
    });
    tags.push(tag);
  }

  // Add tags to books
  console.log('Associating tags with books...');
  const booksForTags = await prisma.book.findMany();
  
  for (let i = 0; i < booksForTags.length; i++) {
    const book = booksForTags[i];
    const numTags = Math.floor(Math.random() * 3) + 1; // 1-3 tags per book
    const shuffledTags = [...tags].sort(() => Math.random() - 0.5);
    const selectedTags = shuffledTags.slice(0, numTags);
    
    for (const tag of selectedTags) {
      try {
        await prisma.bookTag.upsert({
          where: {
            bookId_tagId: { bookId: book.id, tagId: tag.id },
          },
          update: {},
          create: {
            bookId: book.id,
            tagId: tag.id,
          },
        });
      } catch (e) {
        // Ignore duplicates
      }
    }
  }

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
        const isReturned = Math.random() > 0.3;
        const dueDate = new Date(date);
        dueDate.setDate(dueDate.getDate() + 30);
        const returnDate = isReturned ? new Date(date.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000) : null;

        borrowRecords.push({
          bookId: book.id,
          borrowerId: borrower.id,
          borrowDate: date,
          dueDate,
          status: isReturned ? 'RETURNED' : 'BORROWED',
          returnDate,
        });
      }
    }
    
    await prisma.borrowRecord.createMany({
      data: borrowRecords,
    });
  }

  console.log('Generating reading rooms, zones, and seats...');
  const existingRooms = await prisma.readingRoom.count();
  if (existingRooms === 0) {
    const roomsData = [
      { name: '第一阅览室', description: '综合阅览室，适合各类阅读', location: '图书馆1楼东侧', openTime: '08:00', closeTime: '21:30' },
      { name: '第二阅览室', description: '安静阅览室，专注学习', location: '图书馆2楼西侧', openTime: '08:00', closeTime: '22:00' },
      { name: '电子阅览室', description: '配备电脑设备，支持数字资源访问', location: '图书馆3楼', openTime: '09:00', closeTime: '21:00' },
    ];

    for (const roomData of roomsData) {
      const room = await prisma.readingRoom.create({ data: roomData });

      const zonesData = room.name === '电子阅览室'
        ? [
            { name: 'A区', type: ZoneType.COMPUTER, description: '电脑区' },
            { name: 'B区', type: ZoneType.GENERAL, description: '普通座位区' },
          ]
        : [
            { name: 'A区', type: ZoneType.SILENT, description: '静音区' },
            { name: 'B区', type: ZoneType.GENERAL, description: '普通区' },
            { name: 'C区', type: ZoneType.DISCUSSION, description: '讨论区' },
          ];

      for (const zoneData of zonesData) {
        const zone = await prisma.readingZone.create({
          data: {
            ...zoneData,
            readingRoomId: room.id,
          },
        });

        const seatCount = 12;
        const seatsToCreate = [];
        for (let i = 1; i <= seatCount; i++) {
          const row = Math.ceil(i / 4);
          const col = ((i - 1) % 4) + 1;
          seatsToCreate.push({
            seatNumber: `${zone.name}${row}${String.fromCharCode(64 + col)}`,
            zoneId: zone.id,
            hasPowerOutlet: i % 2 === 0,
            isWindowSide: col === 1 || col === 4,
            status: i === 8 ? SeatStatus.BANNED : SeatStatus.AVAILABLE,
            banReason: i === 8 ? '座椅损坏待维修' : null,
          });
        }
        await prisma.seat.createMany({ data: seatsToCreate });
      }
    }
    console.log('Reading rooms, zones, and seats created.');
  }

  console.log('Generating sample seat reservations...');
  const seats = await prisma.seat.findMany({ take: 30 });
  const borrowers = await prisma.borrower.findMany();
  const now = new Date();

  const existingSeatReservations = await prisma.seatReservation.count();
  if (existingSeatReservations === 0 && seats.length > 0 && borrowers.length > 0) {
    const reservationsToCreate = [];
    const timeSlots = Object.values(TimeSlot);

    for (let dayOffset = -1; dayOffset <= 1; dayOffset++) {
      const date = new Date(now);
      date.setDate(date.getDate() + dayOffset);
      date.setHours(0, 0, 0, 0);

      const reservationCount = 8 + Math.floor(Math.random() * 8);
      for (let i = 0; i < reservationCount; i++) {
        const seat = seats[Math.floor(Math.random() * seats.length)];
        const borrower = borrowers[Math.floor(Math.random() * borrowers.length)];
        const timeSlot = timeSlots[Math.floor(Math.random() * timeSlots.length)];

        const exists = reservationsToCreate.find(
          (r) => r.seatId === seat.id && r.date.getTime() === date.getTime() && r.timeSlot === timeSlot,
        );
        if (exists) continue;

        let status = SeatReservationStatus.BOOKED;
        if (dayOffset < 0) {
          const rand = Math.random();
          if (rand < 0.4) status = SeatReservationStatus.CHECKED_IN;
          else if (rand < 0.6) status = SeatReservationStatus.CANCELLED;
          else if (rand < 0.8) status = SeatReservationStatus.NO_SHOW;
          else status = SeatReservationStatus.RELEASED;
        } else if (dayOffset === 0) {
          if (Math.random() < 0.3) status = SeatReservationStatus.CHECKED_IN;
          else if (Math.random() < 0.2) status = SeatReservationStatus.CANCELLED;
        }

        const reservation: any = {
          seatId: seat.id,
          borrowerId: borrower.id,
          date,
          timeSlot,
          status,
        };

        if (status === SeatReservationStatus.CHECKED_IN || status === SeatReservationStatus.RELEASED) {
          reservation.checkedInAt = new Date(date.getTime() + Math.random() * 8 * 60 * 60 * 1000);
        }
        if (status === SeatReservationStatus.RELEASED) {
          reservation.releasedAt = new Date(date.getTime() + Math.random() * 10 * 60 * 60 * 1000);
        }
        if (status === SeatReservationStatus.CANCELLED) {
          reservation.cancelledAt = new Date(date.getTime() - Math.random() * 2 * 24 * 60 * 60 * 1000);
        }
        if (status === SeatReservationStatus.NO_SHOW) {
          reservation.noShowAt = new Date(date.getTime() + Math.random() * 6 * 60 * 60 * 1000);
        }

        reservationsToCreate.push(reservation);
      }
    }

    await prisma.seatReservation.createMany({ data: reservationsToCreate });
    console.log('Seat reservations created.');
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
