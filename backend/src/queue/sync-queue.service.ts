import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import Redis from 'ioredis';

type SyncJob = {
  id: string;
  name: string;
  payload: unknown;
};

type SyncHandler = (payload: unknown) => Promise<unknown>;

const QUEUE_KEY = 'queue:sync:pending';
const PROCESSING_KEY = 'queue:sync:processing';
const RESULT_KEY_PREFIX = 'queue:sync:result:';
const RESULT_TTL_SECONDS = 120;
const RESULT_TIMEOUT_SECONDS = 30;

@Injectable()
export class SyncQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SyncQueueService.name);
  private readonly handlers = new Map<string, SyncHandler>();
  private readonly url: string;
  private worker?: Redis;
  private stopping = false;
  private localChain: Promise<unknown> = Promise.resolve();

  constructor(configService: ConfigService) {
    const explicitUrl = configService.get<string>('REDIS_URL');
    const password = configService.get<string>('REDIS_PASSWORD') ?? '';
    const host = configService.get<string>('REDIS_HOST') ?? '127.0.0.1';
    const port = configService.get<string>('REDIS_PORT') ?? '6379';
    this.url =
      explicitUrl ??
      `redis://${password ? `:${encodeURIComponent(password)}@` : ''}${host}:${port}`;
  }

  async onModuleInit(): Promise<void> {
    if (process.env.ENABLE_SYNC_QUEUE === 'false') {
      return;
    }

    try {
      this.worker = new Redis(this.url, {
        maxRetriesPerRequest: null,
        enableOfflineQueue: true,
        retryStrategy: (times) => (times > 5 ? null : Math.min(times * 200, 2000)),
      });
      this.worker.on('error', () => undefined);
      await this.worker.connect().catch(() => undefined);
      await this.requeueProcessing();
      void this.processLoop();
      this.logger.log('Sync queue worker started');
    } catch {
      this.worker?.disconnect();
      this.worker = undefined;
      this.logger.warn('Sync queue unavailable, falling back to local execution');
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.stopping = true;
    this.worker?.disconnect();
    this.worker = undefined;
  }

  register(name: string, handler: SyncHandler): void {
    this.handlers.set(name, handler);
  }

  async run<T>(
    name: string,
    payload: unknown,
    fallback?: () => Promise<T>,
  ): Promise<T> {
    if (fallback && !this.handlers.has(name)) {
      this.register(name, fallback as SyncHandler);
    }

    const handler = this.handlers.get(name);

    if (!handler) {
      throw new Error(`No handler registered for ${name}`);
    }

    if (!this.worker || this.worker.status !== 'ready') {
      return this.runLocally(() => handler(payload) as Promise<T>);
    }

    const job: SyncJob = { id: randomUUID(), name, payload };
    const resultKey = `${RESULT_KEY_PREFIX}${job.id}`;

    try {
      await this.worker.lpush(QUEUE_KEY, JSON.stringify(job));
      const result = await this.worker.brpop(
        resultKey,
        RESULT_TIMEOUT_SECONDS,
      );

      if (!result?.[1]) {
        throw new Error('Sync queue job timed out');
      }

      const parsed = JSON.parse(result[1]) as {
        ok: boolean;
        value?: unknown;
        error?: string;
      };

      if (!parsed.ok) {
        throw new Error(parsed.error ?? 'Sync queue job failed');
      }

      return parsed.value as T;
    } catch (error) {
      this.logger.warn(
        `Sync queue job ${name} failed, running locally: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return this.runLocally(() => handler(payload) as Promise<T>);
    }
  }

  private runLocally<T>(fallback: () => Promise<T>): Promise<T> {
    const next = this.localChain.then(() => fallback());
    this.localChain = next.catch(() => undefined);

    return next;
  }

  private async processLoop(): Promise<void> {
    while (!this.stopping && this.worker) {
      let raw: string | null = null;

      try {
        raw = await this.worker.brpoplpush(QUEUE_KEY, PROCESSING_KEY, 1);
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }

      if (!raw) {
        continue;
      }

      let job: SyncJob | null = null;

      try {
        job = JSON.parse(raw) as SyncJob;
        const handler = this.handlers.get(job.name);

        if (!handler) {
          throw new Error(`No handler registered for ${job.name}`);
        }

        const result = await handler(job.payload);
        await this.pushResult(job.id, { ok: true, value: result });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        this.logger.error(`Sync queue job failed: ${message}`);

        if (job) {
          await this.pushResult(job.id, { ok: false, error: message });
        }
      } finally {
        await this.worker?.lrem(PROCESSING_KEY, 1, raw).catch(() => undefined);
      }
    }
  }

  private async pushResult(
    id: string,
    result: { ok: boolean; value?: unknown; error?: string },
  ): Promise<void> {
    const key = `${RESULT_KEY_PREFIX}${id}`;
    await this.worker
      ?.multi()
      .lpush(key, JSON.stringify(result))
      .expire(key, RESULT_TTL_SECONDS)
      .exec()
      .catch(() => undefined);
  }

  private async requeueProcessing(): Promise<void> {
    if (!this.worker) {
      return;
    }

    for (;;) {
      const moved = await this.worker
        .rpoplpush(PROCESSING_KEY, QUEUE_KEY)
        .catch(() => null);

      if (!moved) {
        return;
      }
    }
  }
}
