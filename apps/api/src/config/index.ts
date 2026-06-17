import { z } from 'zod';
import { config } from 'dotenv';
import logger from '../utils/logger';

config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000'),
  MONGO_URI: z.string().url().default('mongodb://localhost:27017/monetely'),
  JWT_SECRET: z.string().min(10).default('super-secret-jwt-key-for-dev-only'),
  JWT_REFRESH_SECRET: z.string().min(10).default('super-secret-jwt-refresh-key-for-dev-only'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  REDIS_URI: z.string().url().default('redis://localhost:6379'),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  logger.error('Invalid environment variables:', _env.error.format());
  process.exit(1);
}

export const env = _env.data;
