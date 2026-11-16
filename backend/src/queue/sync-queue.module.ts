import { Global, Module } from '@nestjs/common';
import { SyncQueueService } from './sync-queue.service';

@Global()
@Module({
  providers: [SyncQueueService],
  exports: [SyncQueueService],
})
export class SyncQueueModule {}
