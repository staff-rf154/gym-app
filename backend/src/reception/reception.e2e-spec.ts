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
const RECEPTION_A_PHONE = `${PHONE_PREFIX}02`;
const RECEPTION_B_PHONE = `${PHONE_PREFIX}03`;
const CLIENT_PHONE = `${PHONE_PREFIX}10`;
const TRAINER_PHONE = `${PHONE_PREFIX}11`;
const TEST_PASSWORD = 'TestPass123!';
const GYM_PREFIX = 'E2E Reception Gym';

describe('Reception isolation and access revocation (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let receptionAToken: string;
  let receptionBToken: string;
  let gymAId: string;
  let gymBId: string;
  let receptionAId: string;
  let receptionBId: string;
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
    await prisma.reception.deleteMany({
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
        name: 'E2E Reception Admin',
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
      .post('/admin/receptions')
      .send({
        phone: RECEPTION_A_PHONE,
        name: 'Ресепшен A',
        gym_id: gymAId,
        password: TEST_PASSWORD,
      })
      .expect(201);
    receptionAId = responseA.body.id as string;

    const responseB = await authed(adminToken)
      .post('/admin/receptions')
      .send({
        phone: RECEPTION_B_PHONE,
        name: 'Ресепшен B',
        gym_id: gymBId,
        password: TEST_PASSWORD,
      })
      .expect(201);
    receptionBId = responseB.body.id as string;

    receptionAToken = await login(RECEPTION_A_PHONE);
    receptionBToken = await login(RECEPTION_B_PHONE);
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  it('admin creates receptions bound to gyms', async () => {
    const response = await authed(adminToken).get('/admin/receptions').expect(200);
    const ids = (response.body as { id: string }[]).map((item) => item.id);

    expect(ids).toEqual(expect.arrayContaining([receptionAId, receptionBId]));
  });

  it('reception sees only its own gym', async () => {
    const response = await authed(receptionAToken)
      .get('/reception/gyms')
      .expect(200);

    expect(response.body).toMatchObject({ id: gymAId });
    expect(response.body.id).not.toBe(gymBId);
  });

  it('reception creates client and trainer inside its gym', async () => {
    const clientResponse = await authed(receptionAToken)
      .post('/reception/clients')
      .send({ name: 'E2E Клиент', phone: CLIENT_PHONE })
      .expect(201);
    clientId = clientResponse.body.id as string;
    expect(clientResponse.body.gyms).toEqual([
      expect.objectContaining({ gymId: gymAId, isActive: true }),
    ]);

    const trainerResponse = await authed(receptionAToken)
      .post('/reception/trainers')
      .send({ name: 'E2E Тренер', phone: TRAINER_PHONE })
      .expect(201);
    trainerId = trainerResponse.body.id as string;
    expect(trainerResponse.body.gyms).toEqual([
      expect.objectContaining({ gymId: gymAId, isActive: true }),
    ]);
  });

  it('reception links trainer with assignedBy RECEPTION', async () => {
    const response = await authed(receptionAToken)
      .post(`/reception/clients/${clientId}/trainers`)
      .send({ trainer_id: trainerId })
      .expect(201);

    linkId = response.body.id as string;
    expect(response.body).toMatchObject({
      trainerId,
      gymId: gymAId,
      isActive: true,
      assignedBy: 'RECEPTION',
    });

    const list = await authed(receptionAToken)
      .get(`/reception/clients/${clientId}/trainers`)
      .expect(200);
    expect(list.body).toHaveLength(1);
  });

  it('other reception cannot read or modify foreign client', async () => {
    const clients = await authed(receptionBToken)
      .get('/reception/clients')
      .expect(200);
    expect(clients.body.items).toEqual([]);

    await authed(receptionBToken)
      .put(`/reception/clients/${clientId}`)
      .send({ name: 'Взлом' })
      .expect(403);

    await authed(receptionBToken)
      .post(`/reception/clients/${clientId}/trainers`)
      .send({ trainer_id: trainerId })
      .expect(403);

    await authed(receptionBToken)
      .get(`/reception/clients/${clientId}/trainers`)
      .expect(403);
  });

  it('unlink trainer revokes access', async () => {
    await authed(receptionAToken)
      .delete(`/reception/clients/${clientId}/trainers/${linkId}`)
      .expect(204);

    const list = await authed(receptionAToken)
      .get(`/reception/clients/${clientId}/trainers`)
      .expect(200);
    expect(list.body).toEqual([]);

    const link = await prisma.clientTrainer.findUnique({
      where: { id: linkId },
    });
    expect(link?.isActive).toBe(false);
  });

  it('admin removes reception together with its user', async () => {
    await authed(adminToken)
      .delete(`/admin/receptions/${receptionBId}`)
      .expect(204);

    const reception = await prisma.reception.findUnique({
      where: { id: receptionBId },
    });
    const user = await prisma.user.findUnique({
      where: { phone: RECEPTION_B_PHONE },
    });
    expect(reception).toBeNull();
    expect(user).toBeNull();
  });
});
