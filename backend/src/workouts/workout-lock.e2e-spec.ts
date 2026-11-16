import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  ExerciseType,
  GymEquipmentType,
  Role,
  WorkoutStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';

const API_PREFIX = '/api/v1';
const TRAINER_PHONE = '+79990000801';
const OTHER_TRAINER_PHONE = '+79990000802';
const CLIENT_A_PHONE = '+79990000803';
const CLIENT_B_PHONE = '+79990000804';
const CLIENT_C_PHONE = '+79990000805';
const TEST_PASSWORD = 'TestPass123!';

const futureDate = () => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
};
const PHONES = [
  TRAINER_PHONE,
  OTHER_TRAINER_PHONE,
  CLIENT_A_PHONE,
  CLIENT_B_PHONE,
  CLIENT_C_PHONE,
];
const GYM_NAME = 'E2E Workout Lock Gym';
const EQUIPMENT_NAME = 'E2E Lock Barbell';
const EXERCISE_NAME = 'E2E Lock Bench';

describe('Workout lock (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let trainerId: string;
  let otherTrainerId: string;
  let clientAId: string;
  let clientBId: string;
  let clientCId: string;
  let trainerToken: string;
  let otherTrainerToken: string;
  let clientAToken: string;
  let clientBToken: string;
  let clientCToken: string;
  let gymId: string;
  let equipmentId: string;
  let exerciseId: string;
  const workoutIds: string[] = [];

  const login = async (phone: string): Promise<string> => {
    const response = await request(app.getHttpServer())
      .post(`${API_PREFIX}/auth/login`)
      .send({ phone, password: TEST_PASSWORD });

    return response.body.access_token as string;
  };

  const start = (token: string, role: 'client' | 'trainer', id: string) =>
    request(app.getHttpServer())
      .post(`${API_PREFIX}/${role}/workouts/${id}/start`)
      .set('Authorization', `Bearer ${token}`);

  const finish = (token: string, role: 'client' | 'trainer', id: string) =>
    request(app.getHttpServer())
      .post(`${API_PREFIX}/${role}/workouts/${id}/finish`)
      .set('Authorization', `Bearer ${token}`);

  const putResult = (
    token: string,
    role: 'client' | 'trainer',
    itemId: string,
    body: object,
  ) =>
    request(app.getHttpServer())
      .put(`${API_PREFIX}/${role}/workout-items/${itemId}/result`)
      .set('Authorization', `Bearer ${token}`)
      .send(body);

  const getWorkout = (token: string, role: 'client' | 'trainer', id: string) =>
    request(app.getHttpServer())
      .get(`${API_PREFIX}/${role}/workouts/${id}`)
      .set('Authorization', `Bearer ${token}`);

  const updateWorkout = (token: string, id: string, body: object) =>
    request(app.getHttpServer())
      .put(`${API_PREFIX}/trainer/workouts/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send(body);

  const createWorkout = async (
    clientId: string,
    ownerTrainerId: string,
    status: WorkoutStatus = WorkoutStatus.PLANNED,
  ) => {
    const workout = await prisma.workout.create({
      data: {
        clientId,
        trainerId: ownerTrainerId,
        gymId,
        date: new Date(`${futureDate()}T00:00:00.000Z`),
        status,
        items: {
          create: [
            {
              exerciseId,
              equipmentId,
              plannedWeight: 40,
              plannedSets: 3,
              plannedReps: 10,
              order: 0,
            },
            {
              exerciseId,
              equipmentId,
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

    workoutIds.push(workout.id);
    return workout;
  };

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
      where: { item: { workout: { trainer: { user: { phone: { in: PHONES } } } } } },
    });
    await prisma.workoutItem.deleteMany({
      where: { workout: { trainer: { user: { phone: { in: PHONES } } } } },
    });
    await prisma.workout.deleteMany({
      where: { trainer: { user: { phone: { in: PHONES } } } },
    });
    await prisma.clientTrainer.deleteMany({
      where: {
        OR: [
          { trainer: { user: { phone: { in: PHONES } } } },
          { client: { user: { phone: { in: PHONES } } } },
        ],
      },
    });
    await prisma.trainerGym.deleteMany({
      where: { trainer: { user: { phone: { in: PHONES } } } },
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
        name: 'E2E Тренер Блокировки',
      },
    });
    const trainer = await prisma.trainer.create({
      data: { userId: trainerUser.id },
    });
    trainerId = trainer.id;

    const otherTrainerUser = await prisma.user.create({
      data: {
        phone: OTHER_TRAINER_PHONE,
        passwordHash,
        role: Role.TRAINER,
        name: 'E2E Другой тренер блокировки',
      },
    });
    const otherTrainer = await prisma.trainer.create({
      data: { userId: otherTrainerUser.id },
    });
    otherTrainerId = otherTrainer.id;

    const clientAUser = await prisma.user.create({
      data: {
        phone: CLIENT_A_PHONE,
        passwordHash,
        role: Role.CLIENT,
        name: 'E2E Клиент A',
      },
    });
    const clientA = await prisma.client.create({
      data: { userId: clientAUser.id },
    });
    clientAId = clientA.id;

    const clientBUser = await prisma.user.create({
      data: {
        phone: CLIENT_B_PHONE,
        passwordHash,
        role: Role.CLIENT,
        name: 'E2E Клиент B',
      },
    });
    const clientB = await prisma.client.create({
      data: { userId: clientBUser.id },
    });
    clientBId = clientB.id;

    const clientCUser = await prisma.user.create({
      data: {
        phone: CLIENT_C_PHONE,
        passwordHash,
        role: Role.CLIENT,
        name: 'E2E Клиент C',
      },
    });
    const clientC = await prisma.client.create({
      data: { userId: clientCUser.id },
    });
    clientCId = clientC.id;

    const gym = await prisma.gym.create({
      data: { name: GYM_NAME, address: 'ул. Блокировки, 1' },
    });
    gymId = gym.id;

    const equipment = await prisma.gymEquipment.create({
      data: {
        gymId,
        name: EQUIPMENT_NAME,
        type: GymEquipmentType.FREE_WEIGHT,
        minWeight: 5,
        maxWeight: 200,
      },
    });
    equipmentId = equipment.id;

    const exercise = await prisma.exercise.create({
      data: {
        name: EXERCISE_NAME,
        type: ExerciseType.FREE_WEIGHT,
        muscleGroup: 'Грудь',
        requiresEquipment: true,
      },
    });
    exerciseId = exercise.id;

    await prisma.clientTrainer.createMany({
      data: [
        { clientId: clientAId, trainerId, gymId },
        { clientId: clientBId, trainerId, gymId },
        { clientId: clientCId, trainerId: otherTrainerId, gymId },
      ],
    });
    await prisma.trainerGym.createMany({
      data: [
        { trainerId, gymId },
        { trainerId: otherTrainerId, gymId },
      ],
    });

    trainerToken = await login(TRAINER_PHONE);
    otherTrainerToken = await login(OTHER_TRAINER_PHONE);
    clientAToken = await login(CLIENT_A_PHONE);
    clientBToken = await login(CLIENT_B_PHONE);
    clientCToken = await login(CLIENT_C_PHONE);
  });

  afterAll(async () => {
    await prisma.workoutItemResult.deleteMany({
      where: { item: { workoutId: { in: workoutIds } } },
    });
    await prisma.workoutItem.deleteMany({
      where: { workoutId: { in: workoutIds } },
    });
    await prisma.workout.deleteMany({ where: { id: { in: workoutIds } } });
    await prisma.clientTrainer.deleteMany({
      where: {
        OR: [
          { trainer: { user: { phone: { in: PHONES } } } },
          { client: { user: { phone: { in: PHONES } } } },
        ],
      },
    });
    await prisma.trainerGym.deleteMany({
      where: { trainer: { user: { phone: { in: PHONES } } } },
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
    await app.close();
    await prisma.$disconnect();
  });

  it('клиент начинает тренировку: PLANNED → IN_PROGRESS', async () => {
    const workout = await createWorkout(clientAId, trainerId);

    const response = await start(clientAToken, 'client', workout.id);

    expect(response.status).toBe(200);
    expect(response.body.status).toBe(WorkoutStatus.IN_PROGRESS);
  });

  it('до старта PUT result возвращает 409', async () => {
    const workout = await createWorkout(clientAId, trainerId);

    const response = await putResult(
      clientAToken,
      'client',
      workout.items[0].id,
      { done: true },
    );

    expect(response.status).toBe(409);
    expect(response.body.message).toBe('Сначала начните тренировку');
  });

  it('после старта PUT result сохраняет результат', async () => {
    const workout = await createWorkout(clientAId, trainerId);
    await start(clientAToken, 'client', workout.id);

    const response = await putResult(
      clientAToken,
      'client',
      workout.items[0].id,
      { done: true, actualWeight: 42.5, actualReps: 10 },
    );

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      itemId: workout.items[0].id,
      done: true,
      actualWeight: 42.5,
      actualReps: 10,
    });
  });

  it('после finish статус COMPLETED, повторный PUT result — 409', async () => {
    const workout = await createWorkout(clientAId, trainerId);
    await start(clientAToken, 'client', workout.id);
    const finished = await finish(clientAToken, 'client', workout.id);

    expect(finished.status).toBe(200);
    expect(finished.body.status).toBe(WorkoutStatus.COMPLETED);

    const response = await putResult(
      clientAToken,
      'client',
      workout.items[0].id,
      { done: true },
    );

    expect(response.status).toBe(409);
    expect(response.body.message).toBe(
      'Результаты завершённой тренировки изменять нельзя',
    );
  });

  it('повторный start/finish возвращает 409', async () => {
    const workout = await createWorkout(clientAId, trainerId);
    await start(clientAToken, 'client', workout.id);

    const repeatedStart = await start(clientAToken, 'client', workout.id);
    expect(repeatedStart.status).toBe(409);

    await finish(clientAToken, 'client', workout.id);

    const repeatedFinish = await finish(clientAToken, 'client', workout.id);
    expect(repeatedFinish.status).toBe(409);
  });

  it('чужой клиент не может начать/завершить тренировку (403)', async () => {
    const workout = await createWorkout(clientAId, trainerId);

    const foreignStart = await start(clientCToken, 'client', workout.id);
    expect(foreignStart.status).toBe(403);

    await start(clientAToken, 'client', workout.id);

    const foreignFinish = await finish(clientCToken, 'client', workout.id);
    expect(foreignFinish.status).toBe(403);
  });

  it('тренер не может изменить тренировку в статусе COMPLETED (409)', async () => {
    const workout = await createWorkout(clientAId, trainerId);
    await start(clientAToken, 'client', workout.id);
    await finish(clientAToken, 'client', workout.id);

    const response = await updateWorkout(trainerToken, workout.id, {
      client_id: clientAId,
      gym_id: gymId,
      date: futureDate(),
      items: [
        {
          exerciseId,
          equipmentId,
          plannedWeight: 50,
          plannedSets: 3,
          plannedReps: 10,
          order: 0,
        },
      ],
    });

    expect(response.status).toBe(409);
  });

  it('MISSED также блокирует изменение результатов', async () => {
    const workout = await createWorkout(
      clientAId,
      trainerId,
      WorkoutStatus.MISSED,
    );

    const clientResponse = await putResult(
      clientAToken,
      'client',
      workout.items[0].id,
      { done: true },
    );
    expect(clientResponse.status).toBe(409);

    const trainerResponse = await putResult(
      trainerToken,
      'trainer',
      workout.items[0].id,
      { done: true },
    );
    expect(trainerResponse.status).toBe(409);
  });

  it('тренер не может начать тренировку, клиент начинает успешно', async () => {
    const workout = await createWorkout(clientBId, trainerId);

    const trainerStart = await start(trainerToken, 'trainer', workout.id);
    expect(trainerStart.status).toBe(403);

    const clientStart = await start(clientBToken, 'client', workout.id);
    expect(clientStart.status).toBe(200);
    expect(clientStart.body.status).toBe(WorkoutStatus.IN_PROGRESS);
  });

  it('тренер не может начать/завершить тренировку чужого клиента (403)', async () => {
    const workout = await createWorkout(clientAId, trainerId);

    const foreignStart = await start(otherTrainerToken, 'trainer', workout.id);
    expect(foreignStart.status).toBe(403);

    await start(clientAToken, 'client', workout.id);

    const foreignFinish = await finish(otherTrainerToken, 'trainer', workout.id);
    expect(foreignFinish.status).toBe(403);
  });

  it('клиент ведёт две тренировки, тренер фиксирует результаты', async () => {
    const workoutA = await createWorkout(clientAId, trainerId);
    const workoutB = await createWorkout(clientBId, trainerId);

    const [startA, startB] = await Promise.all([
      start(clientAToken, 'client', workoutA.id),
      start(clientBToken, 'client', workoutB.id),
    ]);

    expect(startA.status).toBe(200);
    expect(startB.status).toBe(200);
    expect(startA.body.status).toBe(WorkoutStatus.IN_PROGRESS);
    expect(startB.body.status).toBe(WorkoutStatus.IN_PROGRESS);

    const resultA = await putResult(
      trainerToken,
      'trainer',
      workoutA.items[0].id,
      { done: true, actualWeight: 50 },
    );
    const resultB = await putResult(
      trainerToken,
      'trainer',
      workoutB.items[0].id,
      { done: true, actualWeight: 60 },
    );

    expect(resultA.status).toBe(200);
    expect(resultB.status).toBe(200);

    const results = await prisma.workoutItemResult.findMany({
      where: {
        itemId: { in: [workoutA.items[0].id, workoutB.items[0].id] },
      },
    });
    const byItem = new Map(
      results.map((result) => [result.itemId, result.actualWeight]),
    );
    expect(byItem.get(workoutA.items[0].id)).toBe(50);
    expect(byItem.get(workoutB.items[0].id)).toBe(60);
  });

  it('тренер записывает результат, после finish получает 409', async () => {
    const workout = await createWorkout(clientBId, trainerId);
    await start(clientBToken, 'client', workout.id);

    const saved = await putResult(
      trainerToken,
      'trainer',
      workout.items[0].id,
      { done: true, actualWeight: 55 },
    );
    expect(saved.status).toBe(200);

    const finished = await finish(trainerToken, 'trainer', workout.id);
    expect(finished.status).toBe(200);
    expect(finished.body.status).toBe(WorkoutStatus.COMPLETED);

    const locked = await putResult(
      trainerToken,
      'trainer',
      workout.items[0].id,
      { done: false },
    );
    expect(locked.status).toBe(409);
  });

  it('тренер не может начать тренировку, клиент видит её в PLANNED', async () => {
    const workout = await createWorkout(clientAId, trainerId);

    const trainerStart = await start(trainerToken, 'trainer', workout.id);
    expect(trainerStart.status).toBe(403);

    const response = await getWorkout(clientAToken, 'client', workout.id);
    expect(response.status).toBe(200);
    expect(response.body.status).toBe(WorkoutStatus.PLANNED);
  });
});
