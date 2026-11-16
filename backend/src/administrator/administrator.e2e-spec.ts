import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';

const API_PREFIX = '/api/v1';
const PHONE_PREFIX = '+799900020';
const ADMIN_PHONE = `${PHONE_PREFIX}01`;
const ADMINISTRATOR_A_PHONE = `${PHONE_PREFIX}02`;
const ADMINISTRATOR_B_PHONE = `${PHONE_PREFIX}03`;
const CLIENT_PHONE = `${PHONE_PREFIX}10`;
const TRAINER_PHONE = `${PHONE_PREFIX}11`;
const TEST_PASSWORD = 'TestPass123!';
const GYM_PREFIX = 'E2E Administrator Gym';

describe('Administrator isolation and access revocation (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let administratorAToken: string;
  let administratorBToken: string;
  let gymAId: string;
  let gymBId: string;
  let administratorAId: string;
  let administratorBId: string;
  let clientId: string;
  let trainerId: string;
  let linkId: string;

  const login = async (phone: string): Promise<string> => {
    const response = await request(app.getHttpServer())
      .post(`${API_PREFIX}/auth/login`)
      .send({ phone, password: TEST_PASSWORD })
      .expect(200);

    return response.body.access_token as string;
  };

  const cleanup = async () => {
    await prisma.clientTrainer.deleteMany({
      where: {
        OR: [
          { client: { user: { phone: { startsWith: PHONE_PREFIX } } } },
          { trainer: { user: { phone: { startsWith: PHONE_PREFIX } } } },
        ],
      },
    });
    await prisma.clientGym.deleteMany({
      where: { client: { user: { phone: { startsWith: PHONE_PREFIX } } } },
    });
    await prisma.trainerGym.deleteMany({
      where: { trainer: { user: { phone: { startsWith: PHONE_PREFIX } } } },
    });
    await prisma.administrator.deleteMany({
      where: { user: { phone: { startsWith: PHONE_PREFIX } } },
    });
    await prisma.refreshToken.deleteMany({
      where: { user: { phone: { startsWith: PHONE_PREFIX } } },
    });
    await prisma.client.deleteMany({
      where: { user: { phone: { startsWith: PHONE_PREFIX } } },
    });
    await prisma.trainer.deleteMany({
      where: { user: { phone: { startsWith: PHONE_PREFIX } } },
    });
    await prisma.user.deleteMany({
      where: { phone: { startsWith: PHONE_PREFIX } },
    });
    await prisma.gym.deleteMany({
      where: { name: { startsWith: GYM_PREFIX } },
    });
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
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);
    await cleanup();

    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
    await prisma.user.create({
      data: {
        phone: ADMIN_PHONE,
        passwordHash,
        role: Role.ADMIN,
        name: 'E2E Administrator Admin',
      },
    });

    const gymA = await prisma.gym.create({
      data: { name: `${GYM_PREFIX} A`, address: 'A' },
    });
    const gymB = await prisma.gym.create({
      data: { name: `${GYM_PREFIX} B`, address: 'B' },
    });
    gymAId = gymA.id;
    gymBId = gymB.id;

    adminToken = await login(ADMIN_PHONE);

    const responseA = await authed(adminToken)
      .post('/admin/administrators')
      .send({
        phone: ADMINISTRATOR_A_PHONE,
        name: 'Администратор A',
        gym_id: gymAId,
        password: TEST_PASSWORD,
      })
      .expect(201);
    administratorAId = responseA.body.id as string;

    const responseB = await authed(adminToken)
      .post('/admin/administrators')
      .send({
        phone: ADMINISTRATOR_B_PHONE,
        name: 'Администратор B',
        gym_id: gymBId,
        password: TEST_PASSWORD,
      })
      .expect(201);
    administratorBId = responseB.body.id as string;

    administratorAToken = await login(ADMINISTRATOR_A_PHONE);
    administratorBToken = await login(ADMINISTRATOR_B_PHONE);
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  it('admin creates administrators bound to gyms', async () => {
    const response = await authed(adminToken).get('/admin/administrators').expect(200);
    const ids = (response.body as { id: string }[]).map((item) => item.id);

    expect(ids).toEqual(expect.arrayContaining([administratorAId, administratorBId]));
  });

  it('administrator sees only its own gym', async () => {
    const response = await authed(administratorAToken)
      .get('/administrator/gyms')
      .expect(200);

    expect(response.body).toMatchObject({ id: gymAId });
    expect(response.body.id).not.toBe(gymBId);
  });

  it('administrator creates client and trainer inside its gym', async () => {
    const clientResponse = await authed(administratorAToken)
      .post('/administrator/clients')
      .send({ name: 'E2E Клиент', phone: CLIENT_PHONE })
      .expect(201);
    clientId = clientResponse.body.id as string;
    expect(clientResponse.body.gyms).toEqual([
      expect.objectContaining({ gymId: gymAId, isActive: true }),
    ]);

    const trainerResponse = await authed(administratorAToken)
      .post('/administrator/trainers')
      .send({ name: 'E2E Тренер', phone: TRAINER_PHONE })
      .expect(201);
    trainerId = trainerResponse.body.id as string;
    expect(trainerResponse.body.gyms).toEqual([
      expect.objectContaining({ gymId: gymAId, isActive: true }),
    ]);
  });

  it('administrator links trainer with assignedBy ADMINISTRATOR', async () => {
    const response = await authed(administratorAToken)
      .post(`/administrator/clients/${clientId}/trainers`)
      .send({ trainer_id: trainerId })
      .expect(201);

    linkId = response.body.id as string;
    expect(response.body).toMatchObject({
      trainerId,
      gymId: gymAId,
      isActive: true,
      assignedBy: 'ADMINISTRATOR',
    });

    const list = await authed(administratorAToken)
      .get(`/administrator/clients/${clientId}/trainers`)
      .expect(200);
    expect(list.body).toHaveLength(1);
  });

  it('other administrator cannot read or modify foreign client', async () => {
    const clients = await authed(administratorBToken)
      .get('/administrator/clients')
      .expect(200);
    expect(clients.body.items).toEqual([]);

    await authed(administratorBToken)
      .put(`/administrator/clients/${clientId}`)
      .send({ name: 'Взлом' })
      .expect(403);

    await authed(administratorBToken)
      .post(`/administrator/clients/${clientId}/trainers`)
      .send({ trainer_id: trainerId })
      .expect(403);

    await authed(administratorBToken)
      .get(`/administrator/clients/${clientId}/trainers`)
      .expect(403);
  });

  it('unlink trainer revokes access', async () => {
    await authed(administratorAToken)
      .delete(`/administrator/clients/${clientId}/trainers/${linkId}`)
      .expect(204);

    const list = await authed(administratorAToken)
      .get(`/administrator/clients/${clientId}/trainers`)
      .expect(200);
    expect(list.body).toEqual([]);

    const link = await prisma.clientTrainer.findUnique({
      where: { id: linkId },
    });
    expect(link?.isActive).toBe(false);
  });

  it('admin removes administrator together with its user', async () => {
    await authed(adminToken)
      .delete(`/admin/administrators/${administratorBId}`)
      .expect(204);

    const administrator = await prisma.administrator.findUnique({
      where: { id: administratorBId },
    });
    const user = await prisma.user.findUnique({
      where: { phone: ADMINISTRATOR_B_PHONE },
    });
    expect(administrator).toBeNull();
    expect(user).toBeNull();
  });
});
