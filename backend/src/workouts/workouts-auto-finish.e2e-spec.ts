import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ExerciseType, GymEquipmentType, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { WorkoutsService } from './workouts.service';

const API_PREFIX = '/api/v1';
const TRAINER_PHONE = '+79990000901';
const CLIENT_PHONE = '+79990000902';
const TEST_PASSWORD = 'TestPass123!';
const PHONES = [TRAINER_PHONE, CLIENT_PHONE];
const HOUR_MS = 60 * 60 * 1000;

describe('Workout auto-finish (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let workoutsService: WorkoutsService;
  let trainerToken: string;
  let clientToken: string;
  let gymId: string;
  let equipmentId: string;
  let exerciseId: string;
  let clientId: string;
  let trainerId: string;

  const today = () => new Date().toISOString().slice(0, 10);

  const authed = (token: string) => ({
    get: (path: string) =>
      request(app.getHttpServer())
        .get(`${API_PREFIX}${path}`)
        .set('Authorization', `Bearer ${token}`),
    post: (path: string) =>
      request(app.getHttpServer())
        .post(`${API_PREFIX}${path}`)
        .set('Authorization', `Bearer ${token}`),
  });

  const createWorkout = async (): Promise<string> => {
    const response = await authed(trainerToken)
      .post('/trainer/workouts')
      .send({
        client_id: clientId,
        gym_id: gymId,
        date: today(),
        items: [
          {
            exerciseId,
            equipmentId,
            plannedWeight: 40,
            plannedSets: 3,
            plannedReps: 10,
            order: 0,
          },
        ],
      });

    expect(response.status).toBe(201);
    return response.body.id as string;
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
    workoutsService = app.get(WorkoutsService);

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
    await prisma.clientGym.deleteMany({
      where: { client: { user: { phone: { in: PHONES } } } },
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
    await prisma.exercise.deleteMany({
      where: { name: 'E2E Автозавершение' },
    });
    await prisma.gymEquipment.deleteMany({
      where: { name: 'E2E Авто Штанга' },
    });
    await prisma.gym.deleteMany({ where: { name: 'E2E Auto Gym' } });
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
        name: 'E2E Тренер Автозавершения',
      },
    });
    const trainer = await prisma.trainer.create({
      data: { userId: trainerUser.id },
    });
    trainerId = trainer.id;

    const clientUser = await prisma.user.create({
      data: {
        phone: CLIENT_PHONE,
        passwordHash,
        role: Role.CLIENT,
        name: 'E2E Клиент Автозавершения',
        timezone: 'UTC',
      },
    });
    const client = await prisma.client.create({
      data: { userId: clientUser.id },
    });
    clientId = client.id;

    const gym = await prisma.gym.create({
      data: { name: 'E2E Auto Gym', address: 'ул. Авто, 1' },
    });
    gymId = gym.id;

    const equipment = await prisma.gymEquipment.create({
      data: {
        gymId,
        name: 'E2E Авто Штанга',
        type: GymEquipmentType.FREE_WEIGHT,
        minWeight: 5,
        maxWeight: 200,
      },
    });
    equipmentId = equipment.id;

    const exercise = await prisma.exercise.create({
      data: {
        name: 'E2E Автозавершение',
        type: ExerciseType.FREE_WEIGHT,
        muscleGroup: 'Грудь',
        requiresEquipment: true,
      },
    });
    exerciseId = exercise.id;

    await prisma.clientTrainer.create({
      data: { clientId, trainerId, gymId },
    });
    await prisma.trainerGym.create({ data: { trainerId, gymId } });
    await prisma.clientGym.create({ data: { clientId, gymId } });

    const login = await request(app.getHttpServer())
      .post(`${API_PREFIX}/auth/login`)
      .send({ phone: TRAINER_PHONE, password: TEST_PASSWORD });
    trainerToken = login.body.access_token as string;

    const clientLogin = await request(app.getHttpServer())
      .post(`${API_PREFIX}/auth/login`)
      .send({ phone: CLIENT_PHONE, password: TEST_PASSWORD });
    clientToken = clientLogin.body.access_token as string;
  });

  afterAll(async () => {
    await prisma.workoutItemResult.deleteMany({
      where: { item: { workout: { clientId } } },
    });
    await prisma.workoutItem.deleteMany({ where: { workout: { clientId } } });
    await prisma.workout.deleteMany({ where: { clientId } });
    await prisma.clientTrainer.deleteMany({ where: { clientId } });
    await prisma.clientGym.deleteMany({ where: { clientId } });
    await prisma.trainerGym.deleteMany({ where: { trainerId } });
    await prisma.client.deleteMany({ where: { id: clientId } });
    await prisma.trainer.deleteMany({ where: { id: trainerId } });
    await prisma.exercise.deleteMany({ where: { id: exerciseId } });
    await prisma.gymEquipment.deleteMany({ where: { id: equipmentId } });
    await prisma.gym.deleteMany({ where: { id: gymId } });
    await prisma.refreshToken.deleteMany({
      where: { user: { phone: { in: PHONES } } },
    });
    await prisma.user.deleteMany({ where: { phone: { in: PHONES } } });
    await app.close();
    await prisma.$disconnect();
  });

  it('старт тренировки сохраняет startedAt и autoFinishAt (+2 часа)', async () => {
    const workoutId = await createWorkout();

    const response = await authed(clientToken).post(
      `/client/workouts/${workoutId}/start`,
    );

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('IN_PROGRESS');
    expect(response.body.startedAt).toEqual(expect.any(String));

    const startedAt = new Date(response.body.startedAt as string).getTime();
    const autoFinishAt = new Date(
      response.body.autoFinishAt as string,
    ).getTime();
    expect(autoFinishAt - startedAt).toBe(2 * HOUR_MS);
  });

  it('тренировка завершается автоматически через 2 часа', async () => {
    const workoutId = await createWorkout();
    await authed(clientToken).post(`/client/workouts/${workoutId}/start`);

    await prisma.workout.update({
      where: { id: workoutId },
      data: { startedAt: new Date(Date.now() - 2 * HOUR_MS - 60_000) },
    });

    const closed = await workoutsService.closeExpiredWorkouts();
    expect(closed).toBeGreaterThanOrEqual(1);

    const response = await authed(trainerToken).get(
      `/trainer/workouts/${workoutId}`,
    );
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('AUTO_CLOSED');
  });

  it('завершённая вручную тренировка не закрывается повторно', async () => {
    const workoutId = await createWorkout();
    await authed(clientToken).post(`/client/workouts/${workoutId}/start`);

    const finished = await authed(trainerToken).post(
      `/trainer/workouts/${workoutId}/finish`,
    );
    expect(finished.status).toBe(200);
    expect(finished.body.status).toBe('COMPLETED');

    await prisma.workout.update({
      where: { id: workoutId },
      data: { startedAt: new Date(Date.now() - 3 * HOUR_MS) },
    });
    await workoutsService.closeExpiredWorkouts();

    const response = await authed(trainerToken).get(
      `/trainer/workouts/${workoutId}`,
    );
    expect(response.body.status).toBe('COMPLETED');
  });

  it('клиент ведёт несколько тренировок одновременно', async () => {
    const firstId = await createWorkout();
    const secondId = await createWorkout();

    for (const id of [firstId, secondId]) {
      const started = await authed(clientToken).post(
        `/client/workouts/${id}/start`,
      );
      expect(started.status).toBe(200);
      expect(started.body.status).toBe('IN_PROGRESS');
    }

    const list = await authed(trainerToken).get(
      `/trainer/workouts?from=${today()}&to=${today()}`,
    );
    expect(list.status).toBe(200);
    const active = (list.body.items as Array<{ id: string; status: string }>)
      .filter((item) => [firstId, secondId].includes(item.id))
      .map((item) => item.status);
    expect(active).toEqual(['IN_PROGRESS', 'IN_PROGRESS']);

    await prisma.workout.update({
      where: { id: firstId },
      data: { startedAt: new Date(Date.now() - 2 * HOUR_MS - 60_000) },
    });
    await workoutsService.closeExpiredWorkouts();

    const first = await authed(trainerToken).get(
      `/trainer/workouts/${firstId}`,
    );
    const second = await authed(trainerToken).get(
      `/trainer/workouts/${secondId}`,
    );
    expect(first.body.status).toBe('AUTO_CLOSED');
    expect(second.body.status).toBe('IN_PROGRESS');
  });
});
