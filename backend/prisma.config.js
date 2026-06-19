module.exports = {
  schema: './prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:root@localhost:5432/library_db',
  },
};
