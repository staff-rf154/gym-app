import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const TEST_PHONE_PREFIX = '+7999000';
const NOTIFICATION_SPEC_PREFIXES = ['+799900011', '+799900033'];
const CLEANUP_ATTEMPTS = 10;
const CLEANUP_DELAY_MS = 50;

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const cleanupTestNotifications = async (): Promise<void> => {
  const users = await prisma.user.findMany({
    where: { phone: { startsWith: TEST_PHONE_PREFIX } },
    select: { id: true, phone: true },
  });

  const userIds = users
    .filter(
      (user) =>
        !NOTIFICATION_SPEC_PREFIXES.some((prefix) =>
          user.phone.startsWith(prefix),
        ),
    )
    .map((user) => user.id);

  if (userIds.length === 0) {
    return;
  }

  for (let attempt = 0; attempt < CLEANUP_ATTEMPTS; attempt += 1) {
    await delay(CLEANUP_DELAY_MS);

    const notifications = await prisma.notification.findMany({
      where: {
        OR: [
          { senderId: { in: userIds } },
          { recipients: { some: { userId: { in: userIds } } } },
        ],
      },
      select: { id: true },
    });
    const notificationIds = notifications.map((notification) => notification.id);

    if (notificationIds.length === 0) {
      return;
    }

    await prisma.notificationRecipient.deleteMany({
      where: {
        OR: [
          { userId: { in: userIds } },
          { notificationId: { in: notificationIds } },
        ],
      },
    });
    await prisma.notification.deleteMany({
      where: { id: { in: notificationIds } },
    });
  }
};

beforeAll(async () => {
  await cleanupTestNotifications();
});

afterEach(async () => {
  await cleanupTestNotifications();
});
