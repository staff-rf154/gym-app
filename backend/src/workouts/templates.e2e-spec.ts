import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ExerciseType, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';

const API_PREFIX = '/api/v1';
const TRAINER_PHONE = '+79990000801';
const OTHER_TRAINER_PHONE = '+79990000802';
const TEST_PASSWORD = 'TestPass123!';
const PHONES = [TRAINER_PHONE, OTHER_TRAINER_PHONE];
const EXERCISE_NAME = 'E2E Template Exercise';

describe('Workout templates (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let trainerToken: string;
  let otherTrainerToken: string;
  let exerciseId: string;
  let secondExerciseId: string;
  let templateId: string;

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
    delete: (path: string) =>
      request(app.getHttpServer())
        .delete(`${API_PREFIX}${path}`)
        .set('Authorization', `Bearer ${token}`),
  });

  const item = (overrides: Record<string, unknown> = {}) => ({
    exerciseId,
    plannedWeight: 30,
    plannedSets: 3,
    plannedReps: 12,
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

    await prisma.workoutTemplateItem.deleteMany({
      where: { template: { trainer: { user: { phone: { in: PHONES } } } } },
    });
    await prisma.workoutTemplate.deleteMany({
      where: { trainer: { user: { phone: { in: PHONES } } } },
    });
    await prisma.trainer.deleteMany({
      where: { user: { phone: { in: PHONES } } },
    });
    await prisma.exercise.deleteMany({ where: { name: EXERCISE_NAME } });
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
        name: 'E2E Тренер Шаблонов',
      },
    });
    await prisma.trainer.create({ data: { userId: trainerUser.id } });

    const otherTrainerUser = await prisma.user.create({
      data: {
        phone: OTHER_TRAINER_PHONE,
        passwordHash,
        role: Role.TRAINER,
        name: 'E2E Другой тренер шаблонов',
      },
    });
    await prisma.trainer.create({ data: { userId: otherTrainerUser.id } });

    const exercise = await prisma.exercise.create({
      data: {
        name: EXERCISE_NAME,
        type: ExerciseType.BODYWEIGHT,
        muscleGroup: 'Спина',
      },
    });
    exerciseId = exercise.id;

    const secondExercise = await prisma.exercise.create({
      data: {
        name: `${EXERCISE_NAME} 2`,
        type: ExerciseType.BODYWEIGHT,
        muscleGroup: 'Пресс',
      },
    });
    secondExerciseId = secondExercise.id;

    trainerToken = await login(TRAINER_PHONE);
    otherTrainerToken = await login(OTHER_TRAINER_PHONE);
  });

  afterAll(async () => {
    await prisma.workoutTemplateItem.deleteMany({
      where: { template: { trainer: { user: { phone: { in: PHONES } } } } },
    });
    await prisma.workoutTemplate.deleteMany({
      where: { trainer: { user: { phone: { in: PHONES } } } },
    });
    await prisma.trainer.deleteMany({
      where: { user: { phone: { in: PHONES } } },
    });
    await prisma.exercise.deleteMany({
      where: { name: { startsWith: EXERCISE_NAME } },
    });
    await prisma.refreshToken.deleteMany({
      where: { user: { phone: { in: PHONES } } },
    });
    await prisma.user.deleteMany({ where: { phone: { in: PHONES } } });
    await app.close();
    await prisma.$disconnect();
  });

  it('GET /trainer/templates изначально не содержит личных шаблонов', async () => {
    const response = await authed(trainerToken).get('/trainer/templates');

    expect(response.status).toBe(200);
    const personal = (response.body as Array<{ trainerId: string | null }>).filter(
      (template) => template.trainerId !== null,
    );
    expect(personal).toEqual([]);
  });

  it('POST /trainer/templates создаёт шаблон', async () => {
    const response = await authed(trainerToken)
      .post('/trainer/templates')
      .send({
        name: 'E2E Шаблон Спина',
        description: 'Тяговый день',
        items: [
          item(),
          item({ exerciseId: secondExerciseId, order: 1, plannedWeight: null }),
        ],
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      name: 'E2E Шаблон Спина',
      description: 'Тяговый день',
    });
    expect(response.body.items).toHaveLength(2);
    templateId = response.body.id as string;
  });

  it('POST /trainer/templates с несуществующим exercise → 400', async () => {
    const response = await authed(trainerToken)
      .post('/trainer/templates')
      .send({
        name: 'E2E Битый шаблон',
        items: [
          item({ exerciseId: '00000000-0000-4000-8000-000000000000' }),
        ],
      });

    expect(response.status).toBe(400);
  });

  it('GET /trainer/templates возвращает созданный шаблон', async () => {
    const response = await authed(trainerToken).get('/trainer/templates');

    expect(response.status).toBe(200);
    const personal = (response.body as Array<{ id: string; trainerId: string | null }>).filter(
      (template) => template.trainerId !== null,
    );
    expect(personal).toHaveLength(1);
    expect(personal[0].id).toBe(templateId);
  });

  it('GET /trainer/templates/:id возвращает шаблон с items', async () => {
    const response = await authed(trainerToken).get(
      `/trainer/templates/${templateId}`,
    );

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(templateId);
    expect(response.body.items).toHaveLength(2);
  });

  it('PUT /trainer/templates/:id обновляет шаблон и items', async () => {
    const response = await authed(trainerToken)
      .put(`/trainer/templates/${templateId}`)
      .send({
        name: 'E2E Шаблон Обновлён',
        description: null,
        items: [item({ plannedSets: 5, plannedReps: 5 })],
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: templateId,
      name: 'E2E Шаблон Обновлён',
      description: null,
    });
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].plannedSets).toBe(5);
  });

  it('GET /trainer/templates/:id чужим тренером → 404', async () => {
    const response = await authed(otherTrainerToken).get(
      `/trainer/templates/${templateId}`,
    );

    expect(response.status).toBe(404);
  });

  it('PUT /trainer/templates/:id чужим тренером → 404', async () => {
    const response = await authed(otherTrainerToken)
      .put(`/trainer/templates/${templateId}`)
      .send({ name: 'Взлом', items: [item()] });

    expect(response.status).toBe(404);
  });

  it('DELETE /trainer/templates/:id чужим тренером → 404', async () => {
    const response = await authed(otherTrainerToken).delete(
      `/trainer/templates/${templateId}`,
    );

    expect(response.status).toBe(404);
  });

  it('DELETE /trainer/templates/:id удаляет шаблон', async () => {
    const response = await authed(trainerToken).delete(
      `/trainer/templates/${templateId}`,
    );

    expect(response.status).toBe(204);

    const list = await authed(trainerToken).get('/trainer/templates');
    const personal = (list.body as Array<{ trainerId: string | null }>).filter(
      (template) => template.trainerId !== null,
    );

    expect(personal).toEqual([]);
  });

  it('GET /trainer/templates/:id удалённого шаблона → 404', async () => {
    const response = await authed(trainerToken).get(
      `/trainer/templates/${templateId}`,
    );

    expect(response.status).toBe(404);
  });
});
