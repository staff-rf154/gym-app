import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ExerciseType, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';

const API_PREFIX = '/api/v1';
const ADMIN_PHONE = '+79990000301';
const TRAINER_PHONE = '+79990000302';
const TEST_PASSWORD = 'TestPass123!';
const NAME_PREFIX = 'E2E Exercise';

describe('Exercises (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminId: string;
  let trainerId: string;
  let adminToken: string;
  let trainerToken: string;
  let exerciseId: string;

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

    await prisma.exercise.deleteMany({
      where: { name: { startsWith: NAME_PREFIX } },
    });
    await prisma.refreshToken.deleteMany({
      where: { user: { phone: { in: [ADMIN_PHONE, TRAINER_PHONE] } } },
    });
    await prisma.user.deleteMany({
      where: { phone: { in: [ADMIN_PHONE, TRAINER_PHONE] } },
    });

    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
    const admin = await prisma.user.create({
      data: {
        phone: ADMIN_PHONE,
        passwordHash,
        role: Role.ADMIN,
        name: 'E2E Администратор',
      },
    });
    adminId = admin.id;
    const trainer = await prisma.user.create({
      data: {
        phone: TRAINER_PHONE,
        passwordHash,
        role: Role.TRAINER,
        name: 'E2E Тренер',
      },
    });
    trainerId = trainer.id;

    adminToken = await login(ADMIN_PHONE);
    trainerToken = await login(TRAINER_PHONE);
  });

  afterAll(async () => {
    await prisma.exercise.deleteMany({
      where: { name: { startsWith: NAME_PREFIX } },
    });
    await prisma.refreshToken.deleteMany({
      where: { userId: { in: [adminId, trainerId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [adminId, trainerId] } },
    });
    await app.close();
    await prisma.$disconnect();
  });

  it('GET /admin/exercises без токена → 401', async () => {
    const response = await request(app.getHttpServer()).get(
      `${API_PREFIX}/admin/exercises`,
    );

    expect(response.status).toBe(401);
  });

  it('POST /admin/exercises тренером → 403', async () => {
    const response = await authed(trainerToken)
      .post('/admin/exercises')
      .send({ name: 'Запрещено', type: ExerciseType.CARDIO, requiresEquipment: false });

    expect(response.status).toBe(403);
  });

  it('POST /admin/exercises с невалидным type → 400', async () => {
    const response = await authed(adminToken)
      .post('/admin/exercises')
      .send({ name: 'Неверный тип', type: 'INVALID', requiresEquipment: false });

    expect(response.status).toBe(400);
  });

  it('админ: полный CRUD упражнения', async () => {
    const created = await authed(adminToken)
      .post('/admin/exercises')
      .send({
        name: `${NAME_PREFIX} Жим лёжа`,
        type: ExerciseType.FREE_WEIGHT,
        muscleGroup: 'Грудь',
        requiresEquipment: true,
        description: 'Базовое упражнение',
      });

    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      name: `${NAME_PREFIX} Жим лёжа`,
      type: ExerciseType.FREE_WEIGHT,
      muscleGroup: 'Грудь',
      requiresEquipment: true,
    });

    exerciseId = created.body.id as string;

    const list = await authed(adminToken).get('/admin/exercises');
    expect(list.status).toBe(200);
    expect(list.body).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: exerciseId })]),
    );

    const updated = await authed(adminToken)
      .put(`/admin/exercises/${exerciseId}`)
      .send({ name: `${NAME_PREFIX} Жим лёжа обновлён`, requiresEquipment: false });

    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({
      id: exerciseId,
      name: `${NAME_PREFIX} Жим лёжа обновлён`,
      requiresEquipment: false,
      muscleGroup: 'Грудь',
    });
  });

  it('GET /exercises доступен тренеру и фильтрует type/muscle_group/q', async () => {
    const byType = await authed(trainerToken).get(
      `/exercises?type=${ExerciseType.FREE_WEIGHT}`,
    );
    expect(byType.status).toBe(200);
    expect(byType.body).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: exerciseId })]),
    );

    const byMuscle = await authed(trainerToken).get(
      '/exercises?muscle_group=%D0%93%D1%80%D1%83%D0%B4%D1%8C',
    );
    expect(byMuscle.status).toBe(200);
    expect(byMuscle.body).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: exerciseId })]),
    );

    const byQuery = await authed(trainerToken).get('/exercises?q=обновл');
    expect(byQuery.status).toBe(200);
    expect(byQuery.body).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: exerciseId })]),
    );

    const noMatch = await authed(trainerToken).get('/exercises?q=zzz-no-match');
    expect(noMatch.status).toBe(200);
    expect(noMatch.body).toEqual([]);
  });

  it('DELETE /admin/exercises/:id → 204 и 404 на повтор', async () => {
    const deleted = await authed(adminToken).delete(
      `/admin/exercises/${exerciseId}`,
    );
    expect(deleted.status).toBe(204);

    const again = await authed(adminToken).delete(
      `/admin/exercises/${exerciseId}`,
    );
    expect(again.status).toBe(404);
  });
});
