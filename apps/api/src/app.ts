import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import { rateLimit } from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import { env } from './config';
import { swaggerSpec } from './config/swagger';
import { errorHandler } from './core/middlewares/errorHandler';
import { AppError } from './core/errors/AppError';
import { requestLogger } from './core/middlewares/requestLogger';

const app = express();

app.use(requestLogger);

app.disable('x-powered-by');

// Global Rate Limiter
// const globalLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: 100,
//   standardHeaders: true,
//   legacyHeaders: false,
//   message: {
//     status: 'error',
//     message: 'Too many requests from this IP, please try again after 15 minutes'
//   }
// });

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many authentication attempts from this IP, please try again after an hour'
  }
});

app.use(helmet());
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

app.use(cookieParser());

app.use(mongoSanitize());

app.use(hpp());

// Apply Rate Limiters
// app.use('/api', globalLimiter);
app.use('/api/v1/auth', authLimiter);

import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/users/user.routes';
import groupRoutes from './modules/groups/group.routes';
import notificationRoutes from './modules/notifications/notification.routes';
import inviteRoutes from './modules/invites/invite.routes';
import retentionRoutes from './modules/retention/retention.routes';
import exportRoutes from './modules/export/export.routes';
import chatRoutes from './modules/chat/chat.routes';

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/users/retention', retentionRoutes);
app.use('/api/v1/groups', groupRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/invites', inviteRoutes);
app.use('/api/v1/exports', exportRoutes);
app.use('/api/v1/chat', chatRoutes);

app.all('*', (req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found`, 404));
});

app.use(errorHandler);

export default app;
