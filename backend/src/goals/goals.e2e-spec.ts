import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';

const API_PREFIX = '/api/v1';
const ADMIN_PHONE = '+79990000901';
const ADMINISTRATOR_PHONE = '+79990000902';
const CLIENT_PHONE = '+79990000903';
const CREATED_CLIENT_PHONE = '+79990000904';
const TEST_PASSWORD = 'TestPass123!';
const GYM_NAME = 'E2E Goals Gym';
const GOAL_PREFIX = 'E2E Goal';

describe('Goals (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminId: string;
  let administratorUserId: string;
  let clientUserId: string;
  let clientId: string;
  let gymId: string;
  let goalId: string;
  let inactiveGoalId: string;
  let adminToken: string;
  let administratorToken: string;
  let clientToken: string;

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
    post: (path: string, body: unknown) =>
      request(app.getHttpServer())
        .post(`${API_PREFIX}${path}`)
        .set('Authorization', `Bearer ${token}`)
        .send(body as object),
    put: (path: string, body: unknown) =>
      request(app.getHttpServer())
        .put(`${API_PREFIX}${path}`)
        .set('Authorization', `Bearer ${token}`)
        .send(body as object),
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

    const phones = [
      ADMIN_PHONE,
      ADMINISTRATOR_PHONE,
      CLIENT_PHONE,
      CREATED_CLIENT_PHONE,
    ];

    await prisma.clientGym.deleteMany({
      where: { client: { user: { phone: { in: phones } } } },
    });
    await prisma.client.deleteMany({
      where: { user: { phone: { in: phones } } },
    });
    await prisma.administrator.deleteMany({
      where: { user: { phone: { in: phones } } },
    });
    await prisma.gym.deleteMany({ where: { name: GYM_NAME } });
    await prisma.goal.deleteMany({ where: { name: { startsWith: GOAL_PREFIX } } });
    await prisma.refreshToken.deleteMany({
      where: { user: { phone: { in: phones } } },
    });
    await prisma.user.deleteMany({ where: { phone: { in: phones } } });

    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

    const admin = await prisma.user.create({
      data: {
        phone: ADMIN_PHONE,
        passwordHash,
        role: Role.ADMIN,
        name: 'E2E Goals Admin',
      },
    });
    adminId = admin.id;

    const administratorUser = await prisma.user.create({
      data: {
        phone: ADMINISTRATOR_PHONE,
        passwordHash,
        role: Role.ADMINISTRATOR,
        name: 'E2E Goals Administrator',
      },
    });
    administratorUserId = administratorUser.id;

    gymId = (
      await prisma.gym.create({
        data: { name: GYM_NAME, address: 'ул. Целевая, 1' },
      })
    ).id;

    await prisma.administrator.create({
      data: { userId: administratorUser.id, gymId },
    });

    const clientUser = await prisma.user.create({
      data: {
        phone: CLIENT_PHONE,
        passwordHash,
        role: Role.CLIENT,
        name: 'E2E Goals Client',
      },
    });
    clientUserId = clientUser.id;
    clientId = (
      await prisma.client.create({ data: { userId: clientUser.id } })
    ).id;

    await prisma.clientGym.create({ data: { clientId, gymId } });

    adminToken = await login(ADMIN_PHONE);
    administratorToken = await login(ADMINISTRATOR_PHONE);
    clientToken = await login(CLIENT_PHONE);
  });

  afterAll(async () => {
    const phones = [
      ADMIN_PHONE,
      ADMINISTRATOR_PHONE,
      CLIENT_PHONE,
      CREATED_CLIENT_PHONE,
    ];

    await prisma.clientGym.deleteMany({
      where: { client: { user: { phone: { in: phones } } } },
    });
    await prisma.client.deleteMany({
      where: { user: { phone: { in: phones } } },
    });
    await prisma.administrator.deleteMany({
      where: { user: { phone: { in: phones } } },
    });
    await prisma.gym.deleteMany({ where: { id: gymId } });
    await prisma.goal.deleteMany({ where: { name: { startsWith: GOAL_PREFIX } } });
    await prisma.refreshToken.deleteMany({
      where: { user: { phone: { in: phones } } },
    });
    await prisma.user.deleteMany({ where: { phone: { in: phones } } });
    await app.close();
    await prisma.$disconnect();
  });

  it('ADMIN создаёт цель, повтор имени → 409', async () => {
    const created = await authed(adminToken).post('/admin/goals', {
      name: `${GOAL_PREFIX} Похудение`,
      description: 'Снижение веса',
      sortOrder: 1,
    });

    expect(created.status).toBe(201);
    expect(created.body.name).toBe(`${GOAL_PREFIX} Похудение`);
    goalId = created.body.id;

    const duplicate = await authed(adminToken).post('/admin/goals', {
      name: `${GOAL_PREFIX} Похудение`,
    });

    expect(duplicate.status).toBe(409);
  });

  it('ADMIN видит все цели, клиент получает только активные', async () => {
    const created = await authed(adminToken).post('/admin/goals', {
      name: `${GOAL_PREFIX} Архивная`,
      isActive: false,
    });
    inactiveGoalId = created.body.id;

    const adminList = await authed(adminToken).get('/admin/goals');
    expect(adminList.status).toBe(200);
    expect(
      adminList.body.some((goal: { id: string }) => goal.id === inactiveGoalId),
    ).toBe(true);

    const sharedList = await authed(clientToken).get('/goals');
    expect(sharedList.status).toBe(200);
    expect(
      sharedList.body.some((goal: { id: string }) => goal.id === goalId),
    ).toBe(true);
    expect(
      sharedList.body.some(
        (goal: { id: string }) => goal.id === inactiveGoalId,
      ),
    ).toBe(false);
  });

  it('клиент не может выбрать неактивную цель', async () => {
    const response = await authed(clientToken).put('/client/goal', {
      goalId: inactiveGoalId,
    });

    expect(response.status).toBe(404);
  });

  it('клиент выбирает активную цель и видит её в профиле', async () => {
    const set = await authed(clientToken).put('/client/goal', { goalId });
    expect(set.status).toBe(200);
    expect(set.body).toMatchObject({
      id: goalId,
      name: `${GOAL_PREFIX} Похудение`,
    });

    const current = await authed(clientToken).get('/client/goal');
    expect(current.status).toBe(200);
    expect(current.body.id).toBe(goalId);
  });

  it('ADMIN обновляет клиента с goalId, ответ содержит объект цели', async () => {
    const response = await authed(adminToken).put(
      `/admin/clients/${clientId}`,
      { goalId },
    );

    expect(response.status).toBe(200);
    expect(response.body.goal).toMatchObject({
      id: goalId,
      name: `${GOAL_PREFIX} Похудение`,
    });
    expect(response.body.goalText).toBe(`${GOAL_PREFIX} Похудение`);
  });

  it('ADMINISTRATOR создаёт клиента с goalId в своём зале', async () => {
    const response = await authed(administratorToken).post('/administrator/clients', {
      phone: CREATED_CLIENT_PHONE,
      name: 'E2E Goals New Client',
      goalId,
    });

    expect(response.status).toBe(201);
    expect(response.body.goal).toMatchObject({ id: goalId });
    expect(response.body.gyms[0].gymId).toBe(gymId);
  });

  it('нельзя удалить цель, назначенную клиентам', async () => {
    const response = await authed(adminToken).delete(
      `/admin/goals/${goalId}`,
    );

    expect(response.status).toBe(409);
  });

  it('неиспользуемую цель можно удалить', async () => {
    const created = await authed(adminToken).post('/admin/goals', {
      name: `${GOAL_PREFIX} Временная`,
    });

    const removed = await authed(adminToken).delete(
      `/admin/goals/${created.body.id}`,
    );

    expect(removed.status).toBe(204);
  });

  it('клиент не имеет доступа к админскому справочнику целей', async () => {
    const response = await authed(clientToken).get('/admin/goals');
    expect(response.status).toBe(403);
  });

  it('ADMINISTRATOR имеет доступ к активным целям', async () => {
    const response = await authed(administratorToken).get('/goals');
    expect(response.status).toBe(200);
    expect(response.body.some((goal: { id: string }) => goal.id === goalId)).toBe(
      true,
    );
  });
});
