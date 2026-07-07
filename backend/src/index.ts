import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cron from 'node-cron';
import jwt from 'jsonwebtoken';

import routes from './routes/index.js';
import { setSocketServer, sendFollowUpReminders } from './services/notification.service.js';
import logger from './utils/logger.js';
import { JWTPayload } from './types/index.js';

const app = express();
const httpServer = createServer(app);

// Trust Railway / Vercel reverse proxy so rate limiting and IPs work correctly
app.set('trust proxy', 1);

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:4173',
].filter(Boolean) as string[];

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

setSocketServer(io);

app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", ...allowedOrigins],
    },
  },
}));
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(cookieParser());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

// General API rate limit
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false });
app.use('/api', limiter);

// Strict auth rate limit — prevents brute-force login attacks
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false,
  message: { success: false, error: 'Too many login attempts — try again in 15 minutes' },
});
app.use('/api/auth/login', authLimiter);

app.use('/api', routes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'Travel CRM API' });
});

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication error'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    (socket as Record<string, unknown> & typeof socket).user = decoded;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  const user = (socket as Record<string, unknown> & typeof socket).user as JWTPayload;
  logger.info(`Socket connected: ${user.name} (${user.id})`);
  socket.join(`user:${user.id}`);
  if (user.role === 'ADMIN') socket.join('admin');

  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${user.name}`);
  });
});

cron.schedule('*/30 * * * *', async () => {
  logger.info('Running follow-up reminder check...');
  await sendFollowUpReminders();
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  logger.info(`Travel CRM API running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export { io };
