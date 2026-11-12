import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ExerciseType, GymEquipmentType, Role, WorkoutStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';

const API_PREFIX = '/api/v1';
const TRAINER_PHONE = '+79990000901';
const CLIENT_PHONE = '+79990000902';
const OTHER_CLIENT_PHONE = '+79990000903';
const TEST_PASSWORD = 'TestPass123!';
const PHONES = [TRAINER_PHONE, CLIENT_PHONE, OTHER_CLIENT_PHONE];
const GYM_NAME = 'E2E Workout Result Gym';
const EQUIPMENT_NAME = 'E2E Result Barbell';
const EXERCISE_NAME = 'E2E Result Bench';

describe('Workout results (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let clientId: string;
  let otherClientId: string;
  let clientToken: string;
  let otherClientToken: string;
  let ownItemId: string;
  let foreignItemId: string;

  const login = async (phone: string): Promise<string> => {
    const response = await request(app.getHttpServer())
      .post(`${API_PREFIX}/auth/login`)
      .send({ phone, password: TEST_PASSWORD });

    return response.body.access_token as string;
  };

  const putResult = (token: string, itemId: string, body: object) =>
    request(app.getHttpServer())
      .put(`${API_PREFIX}/client/workout-items/${itemId}/result`)
      .set('Authorization', `Bearer ${token}`)
      .send(body);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    prisma = app.get(PrismaService);

    await prisma.workoutItemResult.deleteMany({
      where: { item: { workout: { client: { user: { phone: { in: PHONES } } } } } },
    });
    await prisma.workoutItem.deleteMany({
      where: { workout: { client: { user: { phone: { in: PHONES } } } } },
    });
    await prisma.workout.deleteMany({
      where: { client: { user: { phone: { in: PHONES } } } },
    });
    await prisma.clientTrainer.deleteMany({
      where: {
        OR: [
          { trainer: { user: { phone: { in: PHONES } } } },
          { client: { user: { phone: { in: PHONES } } } },
        ],
      },
    });
    await prisma.client.deleteMany({
      where: { user: { phone: { in: PHONES } } },
    });
    await prisma.trainer.deleteMany({
      where: { user: { phone: { in: PHONES } } },
    });
    await prisma.exercise.deleteMany({ where: { name: EXERCISE_NAME } });
    await prisma.gymEquipment.deleteMany({ where: { name: EQUIPMENT_NAME } });
    await prisma.gym.deleteMany({ where: { name: GYM_NAME } });
    await prisma.refreshToken.deleteMany({
      where: { user: { phone: { in: PHONES } } },
    });
    await prisma.user.deleteMany({ where: { phone: { in: PHONES } } });

    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

    const trainerUser = await prisma.user.create({
      data: {
        phone: TRAINER_PHONE,
        passwordHash,
        role: Role.TRAINER,
        name: 'E2E Тренер Результатов',
      },
    });
    const trainer = await prisma.trainer.create({
      data: { userId: trainerUser.id },
    });

    const clientUser = await prisma.user.create({
      data: {
        phone: CLIENT_PHONE,
        passwordHash,
        role: Role.CLIENT,
        name: 'E2E Клиент Результатов',
      },
    });
    const client = await prisma.client.create({
      data: { userId: clientUser.id },
    });
    clientId = client.id;

    const otherClientUser = await prisma.user.create({
      data: {
        phone: OTHER_CLIENT_PHONE,
        passwordHash,
        role: Role.CLIENT,
        name: 'E2E Другой клиент результатов',
      },
    });
    const otherClient = await prisma.client.create({
      data: { userId: otherClientUser.id },
    });
    otherClientId = otherClient.id;

    const gym = await prisma.gym.create({
      data: { name: GYM_NAME, address: 'ул. Результатов, 1' },
    });

    const equipment = await prisma.gymEquipment.create({
      data: {
        gymId: gym.id,
        name: EQUIPMENT_NAME,
        type: GymEquipmentType.FREE_WEIGHT,
        minWeight: 5,
        maxWeight: 200,
      },
    });

    const exercise = await prisma.exercise.create({
      data: {
        name: EXERCISE_NAME,
        type: ExerciseType.FREE_WEIGHT,
        muscleGroup: 'Грудь',
        requiresEquipment: true,
      },
    });

    await prisma.clientTrainer.create({
      data: { clientId, trainerId: trainer.id, gymId: gym.id },
    });

    const ownWorkout = await prisma.workout.create({
      data: {
        clientId,
        trainerId: trainer.id,
        gymId: gym.id,
        date: new Date('2026-11-10T00:00:00.000Z'),
        status: WorkoutStatus.IN_PROGRESS,
        items: {
          create: [
            {
              exerciseId: exercise.id,
              equipmentId: equipment.id,
              plannedWeight: 40,
              plannedSets: 3,
              plannedReps: 10,
              order: 0,
            },
            {
              exerciseId: exercise.id,
              equipmentId: equipment.id,
              plannedWeight: 45,
              plannedSets: 3,
              plannedReps: 8,
              order: 1,
            },
          ],
        },
      },
      include: { items: { orderBy: { order: 'asc' } } },
    });
    ownItemId = ownWorkout.items[0].id;

    const foreignWorkout = await prisma.workout.create({
      data: {
        clientId: otherClientId,
        trainerId: trainer.id,
        gymId: gym.id,
        date: new Date('2026-11-10T00:00:00.000Z'),
        items: {
          create: [
            {
              exerciseId: exercise.id,
              equipmentId: equipment.id,
              plannedWeight: 30,
              plannedSets: 3,
              plannedReps: 12,
              order: 0,
            },
          ],
        },
      },
      include: { items: true },
    });
    foreignItemId = foreignWorkout.items[0].id;

    clientToken = await login(CLIENT_PHONE);
    otherClientToken = await login(OTHER_CLIENT_PHONE);
  });

  afterAll(async () => {
    await prisma.workoutItemResult.deleteMany({
      where: { itemId: { in: [ownItemId, foreignItemId] } },
    });
    await prisma.workoutItem.deleteMany({
      where: { workout: { clientId: { in: [clientId, otherClientId] } } },
    });
    await prisma.workout.deleteMany({
      where: { clientId: { in: [clientId, otherClientId] } },
    });
    await prisma.clientTrainer.deleteMany({
      where: { clientId: { in: [clientId, otherClientId] } },
    });
    await prisma.client.deleteMany({
      where: { id: { in: [clientId, otherClientId] } },
    });
    await prisma.trainer.deleteMany({
      where: { user: { phone: { in: PHONES } } },
    });
    await prisma.exercise.deleteMany({ where: { name: EXERCISE_NAME } });
    await prisma.gymEquipment.deleteMany({ where: { name: EQUIPMENT_NAME } });
    await prisma.gym.deleteMany({ where: { name: GYM_NAME } });
    await prisma.refreshToken.deleteMany({
      where: { user: { phone: { in: PHONES } } },
    });
    await prisma.user.deleteMany({ where: { phone: { in: PHONES } } });
    await app.close();
    await prisma.$disconnect();
  });

  it('PUT /client/workout-items/:id/result сохраняет результат', async () => {
    const response = await putResult(clientToken, ownItemId, {
      done: true,
      actualWeight: 42.5,
      actualReps: 10,
      clientComment: 'Легко',
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      itemId: ownItemId,
      done: true,
      actualWeight: 42.5,
      actualReps: 10,
      clientComment: 'Легко',
    });
  });

  it('повторный PUT обновляет существующий результат', async () => {
    const response = await putResult(clientToken, ownItemId, {
      done: true,
      actualWeight: 50,
      actualReps: 8,
      clientComment: 'Тяжелее',
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      itemId: ownItemId,
      actualWeight: 50,
      actualReps: 8,
      clientComment: 'Тяжелее',
    });

    const results = await prisma.workoutItemResult.findMany({
      where: { itemId: ownItemId },
    });
    expect(results).toHaveLength(1);
  });

  it('PUT с done=true без actualWeight допустим', async () => {
    const response = await putResult(clientToken, ownItemId, { done: true });

    expect(response.status).toBe(200);
    expect(response.body.done).toBe(true);
    expect(response.body.actualWeight).toBeNull();
    expect(response.body.actualReps).toBeNull();
  });

  it('PUT чужого item → 403', async () => {
    const response = await putResult(otherClientToken, ownItemId, {
      done: true,
    });

    expect(response.status).toBe(403);
  });

  it('PUT несуществующего item → 404', async () => {
    const response = await putResult(
      clientToken,
      '00000000-0000-4000-8000-000000000000',
      { done: true },
    );

    expect(response.status).toBe(404);
  });
});
