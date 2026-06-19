import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import authRoutes from './routes/auth';
import bookRoutes from './routes/books';
import categoryRoutes from './routes/categories';
import borrowRoutes from './routes/borrows';
import userRoutes from './routes/users';
import borrowerRoutes from './routes/borrowers';
import statsRoutes from './routes/stats';
import docsRoutes from './routes/docs';
import reservationRoutes from './routes/reservations';
import fineRoutes from './routes/fines';
import logger from './utils/logger';
import { exec } from 'child_process';

const app = express();
const port = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());
app.use(
  morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  })
);

// Routes
app.use('/auth', authRoutes);
app.use('/books', bookRoutes);
app.use('/categories', categoryRoutes);
app.use('/borrows', borrowRoutes);
app.use('/users', userRoutes);
app.use('/borrowers', borrowerRoutes);
app.use('/stats', statsRoutes);
app.use('/docs', docsRoutes);
app.use('/reservations', reservationRoutes);
app.use('/fines', fineRoutes);

// Error Handling
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, 'Unhandled error');
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
  });
});

app.listen(port, () => {
  logger.info(`Server is running on port ${port}`);
  
  // 自动检查并执行数据初始化
  exec('npm run seed', (error: any, stdout: string, stderr: string) => {
    if (error) {
      logger.error(`Seed error: ${error.message}`);
      return;
    }
    if (stderr) {
      logger.warn(`Seed stderr: ${stderr}`);
    }
    logger.info(`Seed output: ${stdout}`);
  });
});
