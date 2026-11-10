import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  App,
  cert,
  getApps,
  initializeApp,
  ServiceAccount,
} from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaService } from '../prisma/prisma.service';

const BATCH_SIZE = 500;
const DEFAULT_CREDENTIALS_FILE = join(process.cwd(), 'secrets', 'fcm.json');

@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private app: App | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit(): void {
    const credentials = this.loadCredentials();

    if (!credentials) {
      return;
    }

    try {
      this.app =
        getApps()[0] ??
        initializeApp({ credential: cert(credentials) });
    } catch (error) {
      this.logger.error('Failed to initialize Firebase Admin', error);
    }
  }

  private loadCredentials(): ServiceAccount | null {
    const raw = this.configService.get<string>('FCM_CREDENTIALS_JSON');

    if (raw) {
      try {
        return JSON.parse(raw) as ServiceAccount;
      } catch (error) {
        this.logger.error('Failed to parse FCM_CREDENTIALS_JSON', error);
        return null;
      }
    }

    const filePath =
      this.configService.get<string>('FCM_CREDENTIALS_FILE') ??
      DEFAULT_CREDENTIALS_FILE;

    if (!existsSync(filePath)) {
      this.logger.error(
        `FCM credentials not found (FCM_CREDENTIALS_JSON is empty and ${filePath} does not exist), push disabled`,
      );
      return null;
    }

    try {
      return JSON.parse(
        readFileSync(filePath, 'utf8'),
      ) as ServiceAccount;
    } catch (error) {
      this.logger.error(
        `Failed to read FCM credentials from ${filePath}`,
        error,
      );
      return null;
    }
  }

  async sendToUsers(
    userIds: string[],
    title: string,
    body: string,
  ): Promise<void> {
    if (!this.app || userIds.length === 0) {
      return;
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds }, pushToken: { not: null } },
      select: { id: true, pushToken: true },
    });

    const tokens = users
      .map((user) => user.pushToken)
      .filter((token): token is string => Boolean(token));

    if (tokens.length === 0) {
      return;
    }

    const messaging = getMessaging(this.app);

    for (let offset = 0; offset < tokens.length; offset += BATCH_SIZE) {
      const batch = tokens.slice(offset, offset + BATCH_SIZE);

      try {
        const result = await messaging.sendEachForMulticast({
          tokens: batch,
          notification: { title, body },
        });

        this.logger.log(
          `fcm: sent ${result.successCount}/${batch.length}`,
        );

        const staleTokens: string[] = [];
        result.responses.forEach((response, index) => {
          if (
            !response.success &&
            response.error?.code ===
              'messaging/registration-token-not-registered'
          ) {
            staleTokens.push(batch[index]);
          }
        });

        if (staleTokens.length > 0) {
          await this.prisma.user.updateMany({
            where: { pushToken: { in: staleTokens } },
            data: { pushToken: null },
          });
        }
      } catch (error) {
        this.logger.error('Failed to send push notification', error);
      }
    }
  }
}
