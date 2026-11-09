import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const adminPhone = process.env.ADMIN_PHONE;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const timezone = process.env.DEFAULT_TIMEZONE;

  if (!adminPhone || !adminPassword || !timezone) {
    throw new Error(
      'ADMIN_PHONE, ADMIN_PASSWORD and DEFAULT_TIMEZONE must be set',
    );
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.user.upsert({
    where: { phone: adminPhone },
    update: {
      role: Role.ADMIN,
      name: 'Администратор',
      passwordHash,
      timezone,
    },
    create: {
      phone: adminPhone,
      role: Role.ADMIN,
      name: 'Администратор',
      passwordHash,
      timezone,
    },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
