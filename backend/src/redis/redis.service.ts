import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import Redis from 'ioredis';

export const CACHE_TTL = {
  reference: 300,
  reports: 60,
} as const;

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;
  private readonly keyPrefix: string;
  private ready = false;

  constructor(configService: ConfigService) {
    const explicitUrl = configService.get<string>('REDIS_URL');
    const password = configService.get<string>('REDIS_PASSWORD') ?? '';
    const host = configService.get<string>('REDIS_HOST') ?? '127.0.0.1';
    const port = configService.get<string>('REDIS_PORT') ?? '6379';
    const url =
      explicitUrl ??
      `redis://${password ? `:${encodeURIComponent(password)}@` : ''}${host}:${port}`;

    this.client = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      retryStrategy: (times) => (times > 5 ? null : Math.min(times * 200, 2000)),
    });
    this.client.on('error', () => undefined);

    const configuredPrefix = configService
      .get<string>('REDIS_KEY_PREFIX')
      ?.trim();
    const testPrefix =
      process.env.NODE_ENV === 'test'
        ? `test:${process.pid}:${randomUUID().slice(0, 8)}`
        : '';

    this.keyPrefix = configuredPrefix
      ? `${configuredPrefix}:`
      : testPrefix
        ? `${testPrefix}:`
        : '';
  }

  namespaced(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.client.connect();
      this.ready = true;
      this.logger.log('Redis connected');
    } catch {
      this.ready = false;
      this.logger.warn('Redis unavailable, cache and Redis throttling disabled');
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.client.disconnect();
  }

  get isReady(): boolean {
    return this.ready && this.client.status === 'ready';
  }

  get connection(): Redis {
    return this.client;
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isReady) {
      return null;
    }

    try {
      const value = await this.client.get(this.namespaced(key));
      return value ? (JSON.parse(value) as T) : null;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    if (!this.isReady) {
      return;
    }

    try {
      await this.client.set(
        this.namespaced(key),
        JSON.stringify(value),
        'EX',
        ttlSeconds,
      );
    } catch {
      return;
    }
  }

  async getOrSet<T>(
    key: string,
    ttlSeconds: number,
    loader: () => Promise<T>,
  ): Promise<T> {
    const cached = await this.get<T>(key);

    if (cached !== null) {
      return cached;
    }

    const value = await loader();
    await this.set(key, value, ttlSeconds);

    return value;
  }

  async delete(key: string): Promise<void> {
    if (!this.isReady) {
      return;
    }

    try {
      await this.client.del(this.namespaced(key));
    } catch {
      return;
    }
  }

  async invalidatePrefix(prefix: string): Promise<void> {
    if (!this.isReady) {
      return;
    }

    try {
      let cursor = '0';
      do {
        const [nextCursor, keys] = await this.client.scan(
          cursor,
          'MATCH',
          `${this.namespaced(prefix)}*`,
          'COUNT',
          100,
        );
        cursor = nextCursor;
        if (keys.length > 0) {
          await this.client.del(...keys);
        }
      } while (cursor !== '0');
    } catch {
      return;
    }
  }
}
