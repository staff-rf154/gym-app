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

  const passwordHash = await bcrypt.hash(adminPassword, 12);

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

  const receptionPhone = process.env.RECEPTION_PHONE;
  const receptionPassword = process.env.RECEPTION_PASSWORD;
  const receptionGymId = process.env.RECEPTION_GYM_ID;

  if (!receptionPhone || !receptionPassword || !receptionGymId) {
    return;
  }

  const gym = await prisma.gym.findUnique({ where: { id: receptionGymId } });

  if (!gym) {
    throw new Error('RECEPTION_GYM_ID does not reference an existing gym');
  }

  const receptionHash = await bcrypt.hash(receptionPassword, 12);

  const receptionUser = await prisma.user.upsert({
    where: { phone: receptionPhone },
    update: {
      role: Role.RECEPTION,
      name: 'Ресепшен',
      passwordHash: receptionHash,
      timezone,
    },
    create: {
      phone: receptionPhone,
      role: Role.RECEPTION,
      name: 'Ресепшен',
      passwordHash: receptionHash,
      timezone,
    },
  });

  await prisma.reception.upsert({
    where: { userId: receptionUser.id },
    update: { gymId: receptionGymId },
    create: { userId: receptionUser.id, gymId: receptionGymId },
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
