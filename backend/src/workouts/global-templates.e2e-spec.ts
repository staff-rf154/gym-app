import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ExerciseType, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../app.module';
import {
  DEFAULT_EXERCISES,
  ensureDefaultConfiguration,
} from '../default-config/default-config';
import { PrismaService } from '../prisma/prisma.service';

const API_PREFIX = '/api/v1';
const ADMIN_PHONE = '+79990000901';
const RECEPTION_PHONE = '+79990000902';
const TRAINER_PHONE = '+79990000903';
const TEST_PASSWORD = 'TestPass123!';
const PHONES = [ADMIN_PHONE, RECEPTION_PHONE, TRAINER_PHONE];
const EXERCISE_NAME = 'E2E Global Template Exercise';
const GYM_NAME = 'E2E Global Templates Gym';

describe('Global workout templates (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let receptionToken: string;
  let trainerToken: string;
  let gymId: string;
  let exerciseId: string;
  let globalTemplateId: string;
  let gymTemplateId: string;
  let receptionTemplateId: string;

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

    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
    const adminUser = await prisma.user.create({
      data: {
        phone: ADMIN_PHONE,
        passwordHash,
        role: Role.ADMIN,
        name: 'E2E Админ шаблонов',
      },
    });
    const receptionUser = await prisma.user.create({
      data: {
        phone: RECEPTION_PHONE,
        passwordHash,
        role: Role.RECEPTION,
        name: 'E2E Ресепшен шаблонов',
      },
    });
    const trainerUser = await prisma.user.create({
      data: {
        phone: TRAINER_PHONE,
        passwordHash,
        role: Role.TRAINER,
        name: 'E2E Тренер глобальных шаблонов',
      },
    });

    const gym = await prisma.gym.create({
      data: { name: GYM_NAME, address: 'E2E address' },
    });
    gymId = gym.id;

    await prisma.reception.create({
      data: { userId: receptionUser.id, gymId },
    });
    const trainer = await prisma.trainer.create({
      data: { userId: trainerUser.id },
    });
    await prisma.trainerGym.create({
      data: { trainerId: trainer.id, gymId },
    });

    const exercise = await prisma.exercise.create({
      data: {
        name: EXERCISE_NAME,
        type: ExerciseType.BODYWEIGHT,
        muscleGroup: 'Спина',
      },
    });
    exerciseId = exercise.id;

    adminToken = await login(ADMIN_PHONE);
    receptionToken = await login(RECEPTION_PHONE);
    trainerToken = await login(TRAINER_PHONE);
  });

  afterAll(async () => {
    const testTemplateIds = [
      globalTemplateId,
      gymTemplateId,
      receptionTemplateId,
    ].filter((id): id is string => Boolean(id));
    await prisma.workoutTemplateItem.deleteMany({
      where: { templateId: { in: testTemplateIds } },
    });
    await prisma.workoutTemplate.deleteMany({
      where: { id: { in: testTemplateIds } },
    });
    await prisma.workoutTemplateItem.deleteMany({
      where: {
        template: { trainer: { user: { phone: { in: PHONES } } } },
      },
    });
    await prisma.workoutTemplate.deleteMany({
      where: { trainer: { user: { phone: { in: PHONES } } } },
    });
    await prisma.workoutTemplateItem.deleteMany({
      where: { template: { gymId } },
    });
    await prisma.workoutTemplate.deleteMany({ where: { gymId } });
    await prisma.trainerGym.deleteMany({ where: { gymId } });
    await prisma.reception.deleteMany({ where: { gymId } });
    await prisma.trainer.deleteMany({
      where: { user: { phone: { in: PHONES } } },
    });
    await prisma.gymEquipment.deleteMany({ where: { gymId } });
    await prisma.gym.deleteMany({ where: { id: gymId } });
    await prisma.exercise.deleteMany({ where: { name: EXERCISE_NAME } });
    await prisma.refreshToken.deleteMany({
      where: { user: { phone: { in: PHONES } } },
    });
    await prisma.user.deleteMany({ where: { phone: { in: PHONES } } });
    await app.close();
    await prisma.$disconnect();
  });

  it('ADMIN создаёт глобальный шаблон', async () => {
    const response = await authed(adminToken)
      .post('/admin/templates')
      .send({
        name: 'E2E Глобальный шаблон',
        description: 'Виден всем тренерам',
        gym_id: null,
        items: [item()],
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      name: 'E2E Глобальный шаблон',
      scope: 'GLOBAL',
      gymId: null,
      trainerId: null,
    });
    globalTemplateId = response.body.id as string;
  });

  it('ADMIN создаёт шаблон зала', async () => {
    const response = await authed(adminToken)
      .post('/admin/templates')
      .send({
        name: 'E2E Шаблон зала',
        gym_id: gymId,
        items: [item()],
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      scope: 'GYM',
      gymId,
    });
    gymTemplateId = response.body.id as string;
  });

  it('RECEPTION создаёт шаблон только своего зала', async () => {
    const response = await authed(receptionToken)
      .post('/reception/templates')
      .send({ name: 'E2E Шаблон ресепшена', items: [item()] });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      scope: 'GYM',
      gymId,
    });
    receptionTemplateId = response.body.id as string;
  });

  it('RECEPTION видит шаблоны своего зала, но не глобальные', async () => {
    const response = await authed(receptionToken).get('/reception/templates');

    expect(response.status).toBe(200);
    const ids = (response.body as Array<{ id: string }>).map((t) => t.id);
    expect(ids).toContain(gymTemplateId);
    expect(ids).toContain(receptionTemplateId);
    expect(ids).not.toContain(globalTemplateId);
  });

  it('TRAINER видит глобальные и шаблоны своего зала', async () => {
    const response = await authed(trainerToken).get('/trainer/templates');

    expect(response.status).toBe(200);
    const templates = response.body as Array<{ id: string; scope: string }>;
    expect(templates.find((t) => t.id === globalTemplateId)?.scope).toBe(
      'GLOBAL',
    );
    expect(templates.find((t) => t.id === gymTemplateId)?.scope).toBe('GYM');
    expect(
      templates.find((t) => t.id === receptionTemplateId)?.scope,
    ).toBe('GYM');
  });

  it('TRAINER не может изменить или удалить общий шаблон', async () => {
    const update = await authed(trainerToken)
      .put(`/trainer/templates/${globalTemplateId}`)
      .send({ name: 'Взлом', items: [item()] });
    expect(update.status).toBe(404);

    const remove = await authed(trainerToken).delete(
      `/trainer/templates/${gymTemplateId}`,
    );
    expect(remove.status).toBe(404);
  });

  it('RECEPTION не может изменить шаблон другого зала', async () => {
    const response = await authed(receptionToken)
      .put(`/reception/templates/${globalTemplateId}`)
      .send({ name: 'Взлом', items: [item()] });

    expect(response.status).toBe(404);
  });

  it('ADMIN архивирует глобальный шаблон (мягкое удаление)', async () => {
    const response = await authed(adminToken).delete(
      `/admin/templates/${globalTemplateId}`,
    );
    expect(response.status).toBe(204);

    const list = await authed(trainerToken).get('/trainer/templates');
    expect(
      (list.body as Array<{ id: string }>).some(
        (template) => template.id === globalTemplateId,
      ),
    ).toBe(false);

    const stored = await prisma.workoutTemplate.findUnique({
      where: { id: globalTemplateId },
    });
    expect(stored?.isActive).toBe(false);
    expect(stored?.archivedAt).not.toBeNull();
  });

  it('дефолтная конфигурация идемпотентна', async () => {
    await ensureDefaultConfiguration(prisma, null);

    const templates = await prisma.workoutTemplate.findMany({
      where: { defaultKey: { not: null } },
    });
    const names = templates.map((template) => template.name);

    expect(names).toEqual(
      expect.arrayContaining(['Вес вверх', 'Вес вниз', 'Тонус']),
    );

    const second = await ensureDefaultConfiguration(prisma, null);
    expect(second).toEqual({ exercises: 0, equipment: 0, templates: 0 });

    const exerciseNames = await prisma.exercise.findMany({
      where: { name: { in: DEFAULT_EXERCISES.map((e) => e.name) } },
      select: { name: true },
    });
    expect(exerciseNames.length).toBeGreaterThan(0);
  });

  it('архивированное упражнение исчезает из справочника', async () => {
    const response = await authed(adminToken).delete(
      `/admin/exercises/${exerciseId}`,
    );
    expect(response.status).toBe(204);

    const list = await authed(adminToken).get('/exercises');
    expect(
      (list.body as Array<{ id: string }>).some(
        (exercise) => exercise.id === exerciseId,
      ),
    ).toBe(false);

    const stored = await prisma.exercise.findUnique({
      where: { id: exerciseId },
    });
    expect(stored?.isActive).toBe(false);
    expect(stored?.archivedAt).not.toBeNull();
  });
});
