import { env } from '../../config';
import logger from '../../utils/logger';

let RedisClass: any = null;
try {
  RedisClass = require('ioredis');
} catch (err) {
  logger.warn('⚠️ ioredis module not found in container node_modules. Using in-memory fallback cache.');
}

class CacheService {
  private redis: any = null;
  private memoryCache = new Map<string, { value: string; expiresAt: number }>();
  private isRedisAvailable = false;

  constructor() {
    if (env.NODE_ENV === 'test') {
      logger.info('Skipping Redis initialization in test environment');
      return;
    }

    if (!RedisClass) {
      this.isRedisAvailable = false;
      return;
    }

    try {
      this.redis = new RedisClass(env.REDIS_URI, {
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
        reconnectOnError: () => false,
      });

      this.redis.on('connect', () => {
        this.isRedisAvailable = true;
        logger.info('✅ Redis Cache connected successfully');
      });

      this.redis.on('error', (err: any) => {
        this.isRedisAvailable = false;
        logger.warn('⚠️ Redis connection error, falling back to memory cache:', err.message);
      });
    } catch (err: any) {
      this.isRedisAvailable = false;
      logger.warn('⚠️ Redis initialization failed, using in-memory cache:', err.message);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.isRedisAvailable && this.redis) {
      try {
        const data = await this.redis.get(key);
        return data ? JSON.parse(data) : null;
      } catch (err) {
        logger.warn('Failed to GET from Redis, falling back to memory:', err);
      }
    }

    const cached = this.memoryCache.get(key);
    if (!cached) return null;

    if (Date.now() > cached.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }

    return JSON.parse(cached.value) as T;
  }

  async set<T>(key: string, value: T, ttlSeconds = 300): Promise<void> {
    const stringified = JSON.stringify(value);

    if (this.isRedisAvailable && this.redis) {
      try {
        await this.redis.set(key, stringified, 'EX', ttlSeconds);
        return;
      } catch (err) {
        logger.warn('Failed to SET in Redis, falling back to memory:', err);
      }
    }

    this.memoryCache.set(key, {
      value: stringified,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async del(key: string): Promise<void> {
    if (this.isRedisAvailable && this.redis) {
      try {
        await this.redis.del(key);
        return;
      } catch (err) {
        logger.warn('Failed to DEL from Redis:', err);
      }
    }

    this.memoryCache.delete(key);
  }

  async invalidatePrefix(prefix: string): Promise<void> {
    if (this.isRedisAvailable && this.redis) {
      try {
        const keys = await this.redis.keys(`${prefix}*`);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
        return;
      } catch (err) {
        logger.warn('Failed to invalidate Redis prefix cache:', err);
      }
    }

    // Memory cache invalidation
    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(prefix)) {
        this.memoryCache.delete(key);
      }
    }
  }

  async flushAll(): Promise<void> {
    if (this.isRedisAvailable && this.redis) {
      try {
        await this.redis.flushall();
        return;
      } catch (err) {
        logger.warn('Failed to flush Redis:', err);
      }
    }

    this.memoryCache.clear();
  }
}

export const cacheService = new CacheService();
