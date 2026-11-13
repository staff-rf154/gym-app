import { Injectable } from '@nestjs/common';
import {
  ThrottlerStorage,
  ThrottlerStorageService,
} from '@nestjs/throttler';
import { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';
import { RedisService } from './redis.service';

@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  private readonly fallback = new ThrottlerStorageService();

  constructor(private readonly redis: RedisService) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    if (!this.redis.isReady) {
      return this.fallback.increment(
        key,
        ttl,
        limit,
        blockDuration,
        throttlerName,
      );
    }

    try {
      const client = this.redis.connection;
      const hitsKey = this.redis.namespaced(
        `throttle:${throttlerName}:${key}`,
      );
      const blockKey = `${hitsKey}:block`;
      const blockTtl = await client.pttl(blockKey);

      if (blockTtl > 0) {
        const timeToExpire = Math.max(1, Math.ceil(blockTtl / 1000));
        return {
          totalHits: limit + 1,
          timeToExpire,
          isBlocked: true,
          timeToBlockExpire: timeToExpire,
        };
      }

      const totalHits = await client.incr(hitsKey);
      if (totalHits === 1) {
        await client.pexpire(hitsKey, ttl);
      }

      const pttl = await client.pttl(hitsKey);
      const timeToExpire = Math.max(1, Math.ceil(pttl / 1000));
      const isBlocked = totalHits > limit;

      if (isBlocked && blockDuration > 0) {
        await client.set(blockKey, '1', 'PX', blockDuration);
        return {
          totalHits,
          timeToExpire,
          isBlocked: true,
          timeToBlockExpire: Math.ceil(blockDuration / 1000),
        };
      }

      return {
        totalHits,
        timeToExpire,
        isBlocked,
        timeToBlockExpire: 0,
      };
    } catch {
      return this.fallback.increment(
        key,
        ttl,
        limit,
        blockDuration,
        throttlerName,
      );
    }
  }
}
