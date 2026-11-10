import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ExerciseType, GymEquipmentType, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';

const API_PREFIX = '/api/v1';
const TRAINER_PHONE = '+79990000701';
const OTHER_TRAINER_PHONE = '+79990000702';
const CLIENT_PHONE = '+79990000703';
const OTHER_CLIENT_PHONE = '+79990000704';
const TEST_PASSWORD = 'TestPass123!';
const PHONES = [
  TRAINER_PHONE,
  OTHER_TRAINER_PHONE,
  CLIENT_PHONE,
  OTHER_CLIENT_PHONE,
];

describe('Workouts (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let trainerUserId: string;
  let clientUserId: string;
  let otherClientUserId: string;
  let trainerToken: string;
  let otherTrainerToken: string;
  let clientToken: string;
  let otherClientToken: string;
  let gymId: string;
  let equipmentId: string;
  let exerciseId: string;
  let secondExerciseId: string;
  let clientId: string;
  let otherClientId: string;
  let templateId: string;
  let workoutId: string;
  let secondWorkoutId: string;

  const login = async (phone: string): Promise<string> => {
    const response = await request(app.getHttpServer())
      .post(`${API_PREFIX}/auth/login`)
      .send({ phone, password: TEST_PASSWORD });

    return response.body.access_token as string;
  };

  const authed = (token: string) => ({
    get: (path: string) =>
      request(app.getHttpServer())
        .get(`${API_PREFIX}${path}`)
        .set('Authorization', `Bearer ${token}`),
    post: (path: string) =>
      request(app.getHttpServer())
        .post(`${API_PREFIX}${path}`)
        .set('Authorization', `Bearer ${token}`),
    put: (path: string) =>
      request(app.getHttpServer())
        .put(`${API_PREFIX}${path}`)
        .set('Authorization', `Bearer ${token}`),
  });

  const item = (overrides: Record<string, unknown> = {}) => ({
    exerciseId,
    equipmentId,
    plannedWeight: 40,
    plannedSets: 3,
    plannedReps: 10,
    order: 0,
    ...overrides,
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

    await prisma.workoutItemResult.deleteMany({
      where: { item: { workout: { trainer: { user: { phone: { in: PHONES } } } } } },
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
    await prisma.client.deleteMany({
      where: { user: { phone: { in: PHONES } } },
    });
    await prisma.trainer.deleteMany({
      where: { user: { phone: { in: PHONES } } },
    });
    await prisma.exercise.deleteMany({
      where: { name: { in: ['E2E Жим лёжа', 'E2E Присед'] } },
    });
    await prisma.gymEquipment.deleteMany({
      where: { name: 'E2E Штанга' },
    });
    await prisma.gym.deleteMany({ where: { name: 'E2E Workout Gym' } });
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
        name: 'E2E Тренер Тренировок',
      },
    });
    trainerUserId = trainerUser.id;
    const trainer = await prisma.trainer.create({
      data: { userId: trainerUser.id },
    });

    const otherTrainerUser = await prisma.user.create({
      data: {
        phone: OTHER_TRAINER_PHONE,
        passwordHash,
        role: Role.TRAINER,
        name: 'E2E Другой тренер',
      },
    });
    await prisma.trainer.create({ data: { userId: otherTrainerUser.id } });

    const clientUser = await prisma.user.create({
      data: {
        phone: CLIENT_PHONE,
        passwordHash,
        role: Role.CLIENT,
        name: 'E2E Клиент Тренировок',
      },
    });
    clientUserId = clientUser.id;
    const client = await prisma.client.create({
      data: { userId: clientUser.id },
    });
    clientId = client.id;

    const otherClientUser = await prisma.user.create({
      data: {
        phone: OTHER_CLIENT_PHONE,
        passwordHash,
        role: Role.CLIENT,
        name: 'E2E Другой клиент',
      },
    });
    otherClientUserId = otherClientUser.id;
    const otherClient = await prisma.client.create({
      data: { userId: otherClientUser.id },
    });
    otherClientId = otherClient.id;

    const gym = await prisma.gym.create({
      data: { name: 'E2E Workout Gym', address: 'ул. Тренировочная, 1' },
    });
    gymId = gym.id;

    const equipment = await prisma.gymEquipment.create({
      data: {
        gymId,
        name: 'E2E Штанга',
        type: GymEquipmentType.FREE_WEIGHT,
        minWeight: 5,
        maxWeight: 200,
      },
    });
    equipmentId = equipment.id;

    const exercise = await prisma.exercise.create({
      data: {
        name: 'E2E Жим лёжа',
        type: ExerciseType.FREE_WEIGHT,
        muscleGroup: 'Грудь',
        requiresEquipment: true,
      },
    });
    exerciseId = exercise.id;

    const secondExercise = await prisma.exercise.create({
      data: {
        name: 'E2E Присед',
        type: ExerciseType.FREE_WEIGHT,
        muscleGroup: 'Ноги',
        requiresEquipment: true,
      },
    });
    secondExerciseId = secondExercise.id;

    await prisma.clientTrainer.create({
      data: { clientId, trainerId: trainer.id, gymId },
    });

    trainerToken = await login(TRAINER_PHONE);
    otherTrainerToken = await login(OTHER_TRAINER_PHONE);
    clientToken = await login(CLIENT_PHONE);
    otherClientToken = await login(OTHER_CLIENT_PHONE);
  });

  afterAll(async () => {
    await prisma.workoutItemResult.deleteMany({
      where: {
        item: { workout: { clientId: { in: [clientId, otherClientId] } } },
      },
    });
    await prisma.workoutItem.deleteMany({
      where: { workout: { clientId: { in: [clientId, otherClientId] } } },
    });
    await prisma.workout.deleteMany({
      where: { clientId: { in: [clientId, otherClientId] } },
    });
    await prisma.workoutTemplateItem.deleteMany({
      where: { templateId },
    });
    await prisma.workoutTemplate.deleteMany({ where: { id: templateId } });
    await prisma.clientTrainer.deleteMany({ where: { clientId } });
    await prisma.client.deleteMany({
      where: { id: { in: [clientId, otherClientId] } },
    });
    await prisma.trainer.deleteMany({
      where: { user: { phone: { in: PHONES } } },
    });
    await prisma.exercise.deleteMany({
      where: { id: { in: [exerciseId, secondExerciseId] } },
    });
    await prisma.gymEquipment.deleteMany({ where: { id: equipmentId } });
    await prisma.gym.deleteMany({ where: { id: gymId } });
    await prisma.refreshToken.deleteMany({
      where: { user: { phone: { in: PHONES } } },
    });
    await prisma.user.deleteMany({
      where: {
        id: {
          in: [trainerUserId, clientUserId, otherClientUserId],
        },
      },
    });
    await prisma.user.deleteMany({
      where: { phone: { in: PHONES } },
    });
    await app.close();
    await prisma.$disconnect();
  });

  it('POST /trainer/templates создаёт шаблон', async () => {
    const response = await authed(trainerToken)
      .post('/trainer/templates')
      .send({
        name: 'E2E Шаблон',
        description: 'Силовая',
        items: [item(), item({ exerciseId: secondExerciseId, order: 1 })],
      });

    expect(response.status).toBe(201);
    expect(response.body.items).toHaveLength(2);
    templateId = response.body.id as string;
  });

  it('POST /trainer/workouts с нуля → 201', async () => {
    const response = await authed(trainerToken)
      .post('/trainer/workouts')
      .send({
        client_id: clientId,
        gym_id: gymId,
        date: '2026-11-01',
        comment: 'Первая тренировка',
        items: [item()],
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      clientId,
      gymId,
      date: '2026-11-01',
      status: 'PLANNED',
      templateId: null,
      comment: 'Первая тренировка',
    });
    expect(response.body.items).toHaveLength(1);
    workoutId = response.body.id as string;
  });

  it('POST /trainer/workouts из шаблона → 201 с templateId', async () => {
    const template = await authed(trainerToken).get(
      `/trainer/templates/${templateId}`,
    );

    const response = await authed(trainerToken)
      .post('/trainer/workouts')
      .send({
        client_id: clientId,
        gym_id: gymId,
        date: '2026-11-05',
        template_id: templateId,
        items: template.body.items.map(
          (templateItem: Record<string, unknown>) => ({
            exerciseId: templateItem.exerciseId,
            equipmentId: templateItem.equipmentId,
            plannedWeight: templateItem.plannedWeight,
            plannedSets: templateItem.plannedSets,
            plannedReps: templateItem.plannedReps,
            order: templateItem.order,
          }),
        ),
      });

    expect(response.status).toBe(201);
    expect(response.body.templateId).toBe(templateId);
    expect(response.body.items).toHaveLength(2);
    secondWorkoutId = response.body.id as string;
  });

  it('POST /trainer/workouts непривязанному клиенту → 403', async () => {
    const response = await authed(trainerToken)
      .post('/trainer/workouts')
      .send({
        client_id: otherClientId,
        gym_id: gymId,
        date: '2026-11-07',
        items: [item()],
      });

    expect(response.status).toBe(403);
  });

  it('POST /trainer/workouts с несуществующим exercise → 400', async () => {
    const response = await authed(trainerToken)
      .post('/trainer/workouts')
      .send({
        client_id: clientId,
        gym_id: gymId,
        date: '2026-11-07',
        items: [
          item({ exerciseId: '00000000-0000-4000-8000-000000000000' }),
        ],
      });

    expect(response.status).toBe(400);
  });

  it('POST /trainer/workouts другим тренером → 403', async () => {
    const response = await authed(otherTrainerToken)
      .post('/trainer/workouts')
      .send({
        client_id: clientId,
        gym_id: gymId,
        date: '2026-11-08',
        items: [item()],
      });

    expect(response.status).toBe(403);
  });

  it('PUT /trainer/workouts/:id обновляет тренировку', async () => {
    const response = await authed(trainerToken)
      .put(`/trainer/workouts/${workoutId}`)
      .send({
        client_id: clientId,
        gym_id: gymId,
        date: '2026-11-10',
        comment: 'Обновлённая тренировка',
        items: [item({ plannedWeight: 45, plannedSets: 4 })],
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: workoutId,
      date: '2026-11-10',
      comment: 'Обновлённая тренировка',
    });
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].plannedWeight).toBe(45);
    expect(response.body.items[0].plannedSets).toBe(4);
  });

  it('PUT /trainer/workouts/:id чужим тренером → 404', async () => {
    const response = await authed(otherTrainerToken)
      .put(`/trainer/workouts/${workoutId}`)
      .send({
        client_id: clientId,
        gym_id: gymId,
        date: '2026-11-11',
        items: [item()],
      });

    expect(response.status).toBe(404);
  });

  it('GET /client/workouts?from=&to= возвращает тренировки клиента', async () => {
    const response = await authed(clientToken).get(
      '/client/workouts?from=2026-11-01&to=2026-11-30',
    );

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(
      response.body.map((workout: { id: string }) => workout.id),
    ).toEqual([secondWorkoutId, workoutId]);
  });

  it('GET /client/workouts/:id своей тренировки → 200', async () => {
    const response = await authed(clientToken).get(
      `/client/workouts/${workoutId}`,
    );

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(workoutId);
  });

  it('GET /client/workouts/:id чужой тренировки → 403', async () => {
    const response = await authed(otherClientToken).get(
      `/client/workouts/${workoutId}`,
    );

    expect(response.status).toBe(403);
  });
});
