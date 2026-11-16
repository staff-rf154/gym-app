import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';

const API_PREFIX = '/api/v1';
const ADMIN_PHONE = '+79990002901';
const TRAINER_PHONE = '+79990002902';
const TEST_PASSWORD = 'TestPass123!';
const PHONES = [ADMIN_PHONE, TRAINER_PHONE];

function findSslDir(): string {
  const candidates = [
    process.env.SSL_DIR,
    resolve(process.cwd(), 'ssl'),
    resolve(process.cwd(), '..', 'ssl'),
    '/app/ssl',
  ].filter((value): value is string => Boolean(value));

  const found = candidates.find((candidate) =>
    existsSync(join(candidate, 'staff-rf', 'fullchain.pem')),
  );

  if (!found) {
    throw new Error('ssl/staff-rf/fullchain.pem not found for e2e test');
  }

  return found;
}

describe('Server settings (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let trainerToken: string;
  let tempDir: string;
  let sslDir: string;
  const previousConfigDir = process.env.SERVER_CONFIG_DIR;
  const previousSslDir = process.env.SSL_DIR;

  const login = async (phone: string): Promise<string> => {
    const response = await request(app.getHttpServer())
      .post(`${API_PREFIX}/auth/login`)
      .send({ phone, password: TEST_PASSWORD });

    return response.body.access_token as string;
  };

  const getSettings = (token: string) =>
    request(app.getHttpServer())
      .get(`${API_PREFIX}/admin/server/settings`)
      .set('Authorization', `Bearer ${token}`);

  const patchPort = (token: string, port: number) =>
    request(app.getHttpServer())
      .patch(`${API_PREFIX}/admin/server/settings`)
      .set('Authorization', `Bearer ${token}`)
      .send({ port });

  beforeAll(async () => {
    sslDir = findSslDir();
    tempDir = await mkdtemp(join(tmpdir(), 'gym-server-settings-'));
    process.env.SERVER_CONFIG_DIR = tempDir;
    process.env.SSL_DIR = sslDir;

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

    await prisma.refreshToken.deleteMany({
      where: { user: { phone: { in: PHONES } } },
    });
    await prisma.user.deleteMany({ where: { phone: { in: PHONES } } });

    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

    await prisma.user.create({
      data: {
        phone: ADMIN_PHONE,
        passwordHash,
        name: 'E2E Server Admin',
        role: Role.ADMIN,
      },
    });
    await prisma.user.create({
      data: {
        phone: TRAINER_PHONE,
        passwordHash,
        name: 'E2E Server Trainer',
        role: Role.TRAINER,
      },
    });

    adminToken = await login(ADMIN_PHONE);
    trainerToken = await login(TRAINER_PHONE);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    if (prisma) {
      await prisma.refreshToken.deleteMany({
        where: { user: { phone: { in: PHONES } } },
      });
      await prisma.user.deleteMany({ where: { phone: { in: PHONES } } });
    }
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }

    if (previousConfigDir === undefined) {
      delete process.env.SERVER_CONFIG_DIR;
    } else {
      process.env.SERVER_CONFIG_DIR = previousConfigDir;
    }
    if (previousSslDir === undefined) {
      delete process.env.SSL_DIR;
    } else {
      process.env.SSL_DIR = previousSslDir;
    }
  });

  it('возвращает порт и встроенный сертификат', async () => {
    const response = await getSettings(adminToken).expect(200);

    expect(response.body).toMatchObject({
      port: 3000,
      activePort: 3000,
      restartRequired: false,
      certificate: {
        source: 'builtin',
      },
    });
    expect(response.body.certificate.subject).toContain('*.staff-rf.ru');
    expect(response.body.certificate.daysLeft).toBeGreaterThan(0);
  });

  it('не пускает тренера к настройкам сервера', async () => {
    await getSettings(trainerToken).expect(403);
  });

  it('отклоняет недопустимые и занятые порты', async () => {
    await patchPort(adminToken, 0).expect(400);
    await patchPort(adminToken, 70000).expect(400);
    await patchPort(adminToken, 8080).expect(400);
    await patchPort(adminToken, 5432).expect(400);
  });

  it('сохраняет порт и требует перезапуск', async () => {
    const response = await patchPort(adminToken, 3443).expect(200);

    expect(response.body.port).toBe(3443);
    expect(response.body.activePort).toBe(3000);
    expect(response.body.restartRequired).toBe(true);

    const stored = JSON.parse(
      await readFile(join(tempDir, 'server-settings.json'), 'utf8'),
    ) as { port: number };
    expect(stored.port).toBe(3443);
  });

  it('отклоняет запрос без файлов и неверную пару cert/key', async () => {
    await request(app.getHttpServer())
      .post(`${API_PREFIX}/admin/server/certificate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);

    await request(app.getHttpServer())
      .post(`${API_PREFIX}/admin/server/certificate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('certificate', join(sslDir, 'staff-rf', 'fullchain.pem'))
      .attach('privateKey', join(sslDir, 'privkey.key'))
      .expect(400);
  });

  it('загружает валидный сертификат и применяет его', async () => {
    const response = await request(app.getHttpServer())
      .post(`${API_PREFIX}/admin/server/certificate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('certificate', join(sslDir, 'staff-rf', 'fullchain.pem'))
      .attach('privateKey', join(sslDir, 'staff-rf', 'privkey.pem'))
      .expect(200);

    expect(response.body.certificate).toMatchObject({
      source: 'uploaded',
      subject: expect.stringContaining('*.staff-rf.ru') as unknown,
    });

    const cert = await readFile(join(tempDir, 'tls', 'cert.pem'), 'utf8');
    const key = await readFile(join(tempDir, 'tls', 'key.pem'), 'utf8');
    expect(cert).toContain('BEGIN CERTIFICATE');
    expect(key).toContain('PRIVATE KEY');

    const settings = await getSettings(adminToken).expect(200);
    expect(settings.body.certificate.source).toBe('uploaded');
  });

  it('возвращает встроенный сертификат и удаляет загруженные файлы', async () => {
    const response = await request(app.getHttpServer())
      .post(`${API_PREFIX}/admin/server/certificate/reset`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.certificate.source).toBe('builtin');
    expect(existsSync(join(tempDir, 'tls', 'cert.pem'))).toBe(false);
    expect(existsSync(join(tempDir, 'tls', 'key.pem'))).toBe(false);
  });
});
