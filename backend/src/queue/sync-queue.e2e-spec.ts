import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../app.module';
import { SyncQueueService } from './sync-queue.service';

describe('Sync queue (e2e)', () => {
  let app: INestApplication;
  let queue: SyncQueueService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    queue = app.get(SyncQueueService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('выполняет зарегистрированную задачу и возвращает результат', async () => {
    queue.register('e2e.echo', async (payload) => ({
      value: (payload as { value: number }).value * 2,
    }));

    await expect(
      queue.run<{ value: number }>('e2e.echo', { value: 21 }),
    ).resolves.toEqual({ value: 42 });
  });

  it('сериализует локальные задачи при недоступной очереди', async () => {
    let active = 0;
    let maxActive = 0;

    const handler = async (): Promise<void> => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 10));
      active -= 1;
    };

    await Promise.all([
      queue.run('e2e.serial', undefined, handler),
      queue.run('e2e.serial', undefined, handler),
      queue.run('e2e.serial', undefined, handler),
    ]);

    expect(maxActive).toBe(1);
  });
});
