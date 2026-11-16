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
import { WorkoutsService } from './workouts.service';

const API_PREFIX = '/api/v1';
const TRAINER_PHONE = '+79990000911';
const CLIENT_PHONE = '+79990000912';
const TEST_PASSWORD = 'TestPass123!';
const PHONES = [TRAINER_PHONE, CLIENT_PHONE];

const dateKey = (offsetDays = 0) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
};

describe('Workout TZ rules (e2e)', () => {
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

  const createWorkout = (date = dateKey()) =>
    authed(trainerToken)
      .post('/trainer/workouts')
      .send({
        client_id: clientId,
        gym_id: gymId,
        date,
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
      where: {
        item: { workout: { trainer: { user: { phone: { in: PHONES } } } } },
      },
    });
    await prisma.workoutItem.deleteMany({
      where: { workout: { trainer: { user: { phone: { in: PHONES } } } } },
    });
    await prisma.workout.deleteMany({
      where: { trainer: { user: { phone: { in: PHONES } } } },
    });
    await prisma.workoutTemplateItem.deleteMany({
      where: { template: { trainer: { user: { phone: { in: PHONES } } } } },
    });
    await prisma.workoutTemplate.deleteMany({
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
    await prisma.exercise.deleteMany({ where: { name: 'E2E TZ Правила' } });
    await prisma.gymEquipment.deleteMany({
      where: { name: 'E2E TZ Штанга' },
    });
    await prisma.gym.deleteMany({ where: { name: 'E2E TZ Gym' } });
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
        name: 'E2E TZ Тренер',
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
        name: 'E2E TZ Клиент',
        timezone: 'UTC',
      },
    });
    const client = await prisma.client.create({
      data: { userId: clientUser.id },
    });
    clientId = client.id;

    const gym = await prisma.gym.create({
      data: { name: 'E2E TZ Gym', address: 'ул. ТЗ, 1' },
    });
    gymId = gym.id;

    const equipment = await prisma.gymEquipment.create({
      data: {
        gymId,
        name: 'E2E TZ Штанга',
        type: GymEquipmentType.FREE_WEIGHT,
        minWeight: 5,
        maxWeight: 200,
      },
    });
    equipmentId = equipment.id;

    const exercise = await prisma.exercise.create({
      data: {
        name: 'E2E TZ Правила',
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

    const trainerLogin = await request(app.getHttpServer())
      .post(`${API_PREFIX}/auth/login`)
      .send({ phone: TRAINER_PHONE, password: TEST_PASSWORD });
    trainerToken = trainerLogin.body.access_token as string;

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
    await prisma.workoutTemplateItem.deleteMany({
      where: { template: { trainerId } },
    });
    await prisma.workoutTemplate.deleteMany({ where: { trainerId } });
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

  it('назначение на прошедшую дату отклоняется', async () => {
    const response = await createWorkout(dateKey(-1));

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('прошедшую дату');
  });

  it('тренер не может завершить PLANNED тренировку', async () => {
    const created = await createWorkout();
    expect(created.status).toBe(201);

    const finished = await authed(trainerToken).post(
      `/trainer/workouts/${created.body.id as string}/finish`,
    );

    expect(finished.status).toBe(409);
  });

  it('PLANNED закрывается как MISSED в 00:00 следующего дня', async () => {
    const workout = await prisma.workout.create({
      data: {
        clientId,
        trainerId,
        gymId,
        date: new Date(`${dateKey(-1)}T00:00:00.000Z`),
        status: WorkoutStatus.PLANNED,
      },
    });

    const closed = await workoutsService.closeMissedWorkouts();
    expect(closed).toBeGreaterThanOrEqual(1);

    const updated = await prisma.workout.findUnique({
      where: { id: workout.id },
    });
    expect(updated?.status).toBe(WorkoutStatus.MISSED);
  });

  it('MISSED не блокирует старт следующей тренировки', async () => {
    await prisma.workout.create({
      data: {
        clientId,
        trainerId,
        gymId,
        date: new Date(`${dateKey(-1)}T00:00:00.000Z`),
        status: WorkoutStatus.MISSED,
      },
    });

    const created = await createWorkout();
    const started = await authed(clientToken).post(
      `/client/workouts/${created.body.id as string}/start`,
    );

    expect(started.status).toBe(200);
    expect(started.body.status).toBe(WorkoutStatus.IN_PROGRESS);
  });

  it('нельзя создать 11-й личный шаблон', async () => {
    const body = {
      name: 'E2E TZ шаблон',
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
    };

    for (let index = 0; index < 10; index += 1) {
      const response = await authed(trainerToken)
        .post('/trainer/templates')
        .send({ ...body, name: `E2E TZ шаблон ${index + 1}` });
      expect(response.status).toBe(201);
    }

    const eleventh = await authed(trainerToken)
      .post('/trainer/templates')
      .send({ ...body, name: 'E2E TZ шаблон 11' });

    expect(eleventh.status).toBe(409);
  });
});
