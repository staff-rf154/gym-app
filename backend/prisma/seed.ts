import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { ensureDefaultConfiguration } from '../src/default-config/default-config';

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

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { phone: adminPhone },
    update: {
      role: Role.ADMIN,
      name: 'Администратор',
    },
    create: {
      phone: adminPhone,
      role: Role.ADMIN,
      name: 'Администратор',
      passwordHash,
      timezone,
    },
  });

  await ensureDefaultConfiguration(prisma, admin.id);

  const administratorPhone = process.env.ADMINISTRATOR_PHONE;
  const administratorPassword = process.env.ADMINISTRATOR_PASSWORD;
  const administratorGymId = process.env.ADMINISTRATOR_GYM_ID;

  if (administratorPhone && administratorPassword && administratorGymId) {
    const gym = await prisma.gym.findUnique({ where: { id: administratorGymId } });

    if (!gym) {
      throw new Error('ADMINISTRATOR_GYM_ID does not reference an existing gym');
    }

    const administratorHash = await bcrypt.hash(administratorPassword, 12);

    const administratorUser = await prisma.user.upsert({
      where: { phone: administratorPhone },
      update: {
        role: Role.ADMINISTRATOR,
        name: 'Администратор',
      },
      create: {
        phone: administratorPhone,
        role: Role.ADMINISTRATOR,
        name: 'Администратор',
        passwordHash: administratorHash,
        timezone,
      },
    });

    await prisma.administrator.upsert({
      where: { userId: administratorUser.id },
      update: { gymId: administratorGymId },
      create: { userId: administratorUser.id, gymId: administratorGymId },
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
