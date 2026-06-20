import 'dotenv/config';
import { Role, ZoneType, SeatStatus, TimeSlot, SeatReservationStatus, CooperationLevel, AnnouncementStatus, AnnouncementScope } from '@prisma/client';
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

  // Create Publishers
  console.log('Generating publishers...');
  const publishersData = [
    { name: '人民邮电出版社', location: '北京市西城区', postalCode: '100061', phone: '010-81055666', website: 'https://www.ptpress.com.cn', cooperationLevel: CooperationLevel.A },
    { name: '机械工业出版社', location: '北京市西城区', postalCode: '100037', phone: '010-88379639', website: 'https://www.cmpbook.com', cooperationLevel: CooperationLevel.A },
    { name: '电子工业出版社', location: '北京市海淀区', postalCode: '100036', phone: '010-88254888', website: 'https://www.phei.com.cn', cooperationLevel: CooperationLevel.B },
    { name: '清华大学出版社', location: '北京市海淀区', postalCode: '100084', phone: '010-62770175', website: 'https://www.tup.com.cn', cooperationLevel: CooperationLevel.A },
    { name: '北京大学出版社', location: '北京市海淀区', postalCode: '100871', phone: '010-62752922', website: 'https://www.pup.cn', cooperationLevel: CooperationLevel.B },
    { name: '中信出版社', location: '北京市朝阳区', postalCode: '100029', phone: '010-84263318', website: 'https://www.citicpub.com', cooperationLevel: CooperationLevel.A },
    { name: '上海译文出版社', location: '上海市长宁区', postalCode: '200050', phone: '021-62241064', website: 'https://www.yiwen.com.cn', cooperationLevel: CooperationLevel.B },
    { name: '商务印书馆', location: '北京市东城区', postalCode: '100710', phone: '010-65256815', website: 'https://www.cp.com.cn', cooperationLevel: CooperationLevel.A },
    { name: '人民文学出版社', location: '北京市东城区', postalCode: '100705', phone: '010-65256841', website: 'https://www.rw-cn.com', cooperationLevel: CooperationLevel.B },
    { name: '中华书局', location: '北京市丰台区', postalCode: '100073', phone: '010-63267312', website: 'https://www.zhbc.com.cn', cooperationLevel: CooperationLevel.C },
  ];

  const publishers = [];
  for (const pubData of publishersData) {
    const pub = await prisma.publisher.upsert({
      where: { name: pubData.name },
      update: {},
      create: pubData,
    });
    publishers.push(pub);
  }

  // Create 100+ Books
  console.log('Generating 100+ books...');
  const bookTitles = [
    '深入浅出', '实战指南', '核心技术', '从入门到精通', '精要', '艺术', '哲学', '指南', '通史', '原理'
  ];
  const subjects = [
    'Vue 3', 'React', 'Node.js', 'TypeScript', 'Python', 'AI 编程', '算法', '设计模式', '微服务', 'Docker',
    '唐诗', '宋词', '明清小说', '世界文学', '中国历史', '古希腊文明', '文艺复兴', '现代艺术', '行为心理学', '宏观经济'
  ];
  const authorNames = [
    '张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十', 'Robert Smith', 'John Doe', 'Emily White'
  ];

  const booksData = [];
  for (let i = 1; i <= 100; i++) {
    const title = `${subjects[i % subjects.length]}${bookTitles[i % bookTitles.length]} Vol.${Math.floor(i / subjects.length) + 1}`;
    const author = authorNames[i % authorNames.length];
    const category = categories[i % categories.length];
    const publisher = publishers[i % publishers.length];
    
    booksData.push({
      title,
      author,
      isbn: `9787${Math.floor(Math.random() * 1000000000).toString().padStart(9, '0')}`,
      stock: Math.floor(Math.random() * 50) + 1,
      price: parseFloat((Math.random() * 100 + 20).toFixed(2)),
      categoryId: category.id,
      publisherId: publisher.id,
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

  const authorRecords = [];
  for (const authorData of authorsData) {
    try {
      const author = await prisma.author.upsert({
        where: { name_birthYear: { name: authorData.name, birthYear: authorData.birthYear } },
        update: {},
        create: authorData,
      });
      authorRecords.push(author);
    } catch (e) {
      console.log(`Author ${authorData.name} exists, skipping`);
    }
  }

  // Associate books with authors
  console.log('Associating books with authors...');
  const allBooksForAuthors = await prisma.book.findMany();
  
  for (let i = 0; i < allBooksForAuthors.length; i++) {
    const book = allBooksForAuthors[i];
    const authorIndex = i % authorRecords.length;
    try {
      await prisma.bookAuthor.upsert({
        where: {
          bookId_authorId: { bookId: book.id, authorId: authorRecords[authorIndex].id },
        },
        update: {},
        create: {
          bookId: book.id,
          authorId: authorRecords[authorIndex].id,
        },
      });
      
      if (i % 7 === 0 && authorIndex + 1 < authorRecords.length) {
        await prisma.bookAuthor.upsert({
          where: {
            bookId_authorId: { bookId: book.id, authorId: authorRecords[(authorIndex + 1) % authorRecords.length].id },
          },
          update: {},
          create: {
            bookId: book.id,
            authorId: authorRecords[(authorIndex + 1) % authorRecords.length].id,
          },
        });
      }
    } catch (e) {
      // Ignore duplicates
    }
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

  // Create Book Reviews (requires existing borrow records)
  console.log('Generating book reviews...');
  const existingReviews = await prisma.bookReview.count();
  if (existingReviews === 0) {
    const returnedBorrows = await prisma.borrowRecord.findMany({
      where: { status: 'RETURNED' },
      take: 80,
    });

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

    const reviewsToCreate = returnedBorrows.map((record) => ({
      bookId: record.bookId,
      borrowerId: record.borrowerId,
      borrowRecordId: record.id,
      rating: Math.floor(Math.random() * 3) + 3,
      comment: Math.random() > 0.3 ? comments[Math.floor(Math.random() * comments.length)] : null,
    }));

    if (reviewsToCreate.length > 0) {
      await prisma.bookReview.createMany({
        data: reviewsToCreate,
        skipDuplicates: true,
      });
      console.log(`Created ${reviewsToCreate.length} book reviews.`);
    }
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
    type SeatReservationSeed = {
      seatId: number;
      borrowerId: number;
      date: Date;
      timeSlot: TimeSlot;
      status: SeatReservationStatus;
      checkedInAt?: Date;
      cancelledAt?: Date;
      noShowAt?: Date;
      releasedAt?: Date;
    };

    const reservationsToCreate: SeatReservationSeed[] = [];
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

        let status: SeatReservationStatus = SeatReservationStatus.BOOKED;
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

        const reservation: SeatReservationSeed = {
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

  // Create Sample Announcements
  console.log('Generating sample announcements...');
  const adminUser = await prisma.user.findUnique({ where: { username: 'admin' } });
  const adminId = adminUser?.id;

  const announcementsData = [
    {
      title: '系统升级通知',
      summary: '图书馆管理系统将于本周末进行系统升级维护，届时部分功能可能无法使用。',
      content: `# 系统升级通知

尊敬的读者：

为提升系统性能和用户体验，**图书馆管理系统**将于本周末进行系统升级维护。

## 升级时间
2024年1月20日（周六）22:00 - 1月21日（周日）06:00

## 升级内容
- 系统性能优化
- 新增公告中心功能
- 修复已知问题
- 安全漏洞修复

## 注意事项
1. 升级期间系统将暂停服务
2. 请提前完成相关操作
3. 如有紧急事项请联系管理员

感谢您的理解与支持！

> 图书馆管理团队`,
      scope: AnnouncementScope.ALL,
      status: AnnouncementStatus.PUBLISHED,
      isPinned: true,
      pinWeight: 100,
      publishAt: new Date()
    },
    {
      title: '寒假借阅规则调整',
      summary: '寒假期间图书借阅期限将延长，欢迎各位读者前来借阅。',
      content: `# 寒假借阅规则调整

各位读者：

寒假将至，为方便大家假期阅读，图书馆对借阅规则做出如下调整：

## 调整内容
- 借阅期限延长至 **60天**
- 每人最大借阅数量提升至 **10本**
- 预约图书保留时间延长至 **7天**

## 适用时间
2024年1月15日 - 2024年2月28日

## 温馨提示
1. 请爱护图书，避免损坏
2. 到期前可通过线上续借
3. 逾期仍将产生罚金

祝大家寒假愉快！`,
      scope: AnnouncementScope.ALL,
      status: AnnouncementStatus.PUBLISHED,
      isPinned: true,
      pinWeight: 80,
      publishAt: new Date()
    },
    {
      title: '新书上架：计算机类',
      summary: '本周新到一批计算机类图书，包括人工智能、前端开发、数据库等方向。',
      content: `# 新书上架通知

本周新增以下计算机类图书：

## 人工智能方向
- 《深度学习》（Ian Goodfellow）
- 《机器学习实战》（Peter Harrington）
- 《神经网络与深度学习》

## 前端开发方向
- 《Vue.js 设计与实现》
- 《React 设计原理》
- 《现代前端工程化实践》

## 数据库方向
- 《MySQL 必知必会》
- 《Redis 设计与实现》
- 《数据库系统概念》

欢迎各位读者前来借阅！`,
      scope: AnnouncementScope.ALL,
      status: AnnouncementStatus.PUBLISHED,
      isPinned: false,
      pinWeight: 0,
      publishAt: new Date()
    },
    {
      title: '管理员工作会议通知',
      summary: '定于下周一召开管理员工作会议，请相关人员准时参加。',
      content: `# 管理员工作会议通知

各位管理员：

兹定于下周一召开管理员工作会议，具体安排如下：

## 会议时间
2024年1月22日（周一）上午 9:00 - 11:00

## 会议地点
图书馆三楼会议室

## 会议内容
1. 上月工作总结
2. 本月工作计划
3. 新系统使用培训
4. 问题讨论与交流

请准时参加！`,
      scope: AnnouncementScope.ADMIN,
      status: AnnouncementStatus.PUBLISHED,
      isPinned: false,
      pinWeight: 0,
      publishAt: new Date()
    },
    {
      title: '图书管理员培训',
      summary: '本周六将进行图书管理员业务培训，请相关人员准时参加。',
      content: `# 图书管理员培训通知

各位图书管理员：

为提升业务水平，定于本周六进行业务培训。

## 培训时间
2024年1月20日（周六）下午 14:00 - 17:00

## 培训地点
图书馆二楼电子阅览室

## 培训内容
1. 新书编目流程
2. 读者服务规范
3. 系统操作技巧
4. 常见问题处理

请提前安排好工作，准时参加。`,
      scope: AnnouncementScope.LIBRARIAN,
      status: AnnouncementStatus.PUBLISHED,
      isPinned: false,
      pinWeight: 0,
      publishAt: new Date()
    },
    {
      title: '春节闭馆安排',
      summary: '春节期间图书馆闭馆时间安排，请读者合理安排借阅时间。',
      content: `# 春节闭馆安排

尊敬的读者：

根据国家法定节假日安排，结合图书馆实际情况，2024年春节期间闭馆安排如下：

## 闭馆时间
2024年2月9日（除夕）- 2月17日（正月初八）

## 开放时间
2024年2月18日（正月初九）起正常开放

## 温馨提示
1. 请提前归还到期图书
2. 假期借阅的图书可顺延至节后归还
3. 线上服务照常运行

祝大家新春快乐！`,
      scope: AnnouncementScope.ALL,
      status: AnnouncementStatus.DRAFT,
      isPinned: false,
      pinWeight: 0
    }
  ];

  for (const annData of announcementsData) {
    const exists = await prisma.announcement.findFirst({
      where: { title: annData.title }
    });
    if (!exists) {
      await prisma.announcement.create({
        data: {
          ...annData,
          createdById: adminId
        }
      });
    }
  }
  console.log('Sample announcements created.');

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
