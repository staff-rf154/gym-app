import { BadRequestException, Injectable } from '@nestjs/common';
import {
  createPrivateKey,
  createPublicKey,
  X509Certificate,
} from 'node:crypto';
import { existsSync } from 'node:fs';
import {
  chmod,
  mkdir,
  readFile,
  rename,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { join, resolve } from 'node:path';

const DEFAULT_PORT = 3000;
const RESERVED_PORTS = [5432, 6379, 8080];
const RELOAD_SECONDS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

type CertificateSource = 'builtin' | 'uploaded';

interface StoredSettings {
  port: number;
  certificate: CertificateSource;
  updatedAt: string;
}

export interface CertificateInfo {
  source: CertificateSource;
  subject: string;
  issuer: string;
  validFrom: string;
  validTo: string;
  daysLeft: number;
  subjectAltName: string;
  fingerprint256: string;
}

export interface ServerSettingsResponse {
  port: number;
  activePort: number;
  restartRequired: boolean;
  certificate: CertificateInfo | null;
  reservedPorts: number[];
  reloadSeconds: number;
  updatedAt: string | null;
}

function isValidPort(port: unknown): port is number {
  return Number.isInteger(port) && Number(port) >= 1 && Number(port) <= 65535;
}

function normalizeName(value: string): string {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join(', ');
}

@Injectable()
export class ServerSettingsService {
  private readonly configDir = resolve(
    process.env.SERVER_CONFIG_DIR ?? join(process.cwd(), 'server-config'),
  );

  private readonly settingsPath = join(
    this.configDir,
    'server-settings.json',
  );

  private readonly runtimePath = join(this.configDir, 'runtime.json');

  private readonly tlsDir = join(this.configDir, 'tls');

  private get sslDir(): string {
    if (process.env.SSL_DIR) {
      return resolve(process.env.SSL_DIR);
    }

    const local = resolve(process.cwd(), 'ssl');
    if (existsSync(local)) {
      return local;
    }

    return resolve(process.cwd(), '..', 'ssl');
  }

  async getSettings(): Promise<ServerSettingsResponse> {
    const stored = await this.readSettings();
    const activePort = await this.readActivePort();
    const certificate = await this.readCertificateInfo(
      stored.certificate,
    ).catch(() => null);

    return {
      port: stored.port,
      activePort,
      restartRequired: activePort !== stored.port,
      certificate,
      reservedPorts: RESERVED_PORTS,
      reloadSeconds: RELOAD_SECONDS,
      updatedAt: stored.updatedAt || null,
    };
  }

  async updatePort(port: number): Promise<ServerSettingsResponse> {
    if (!isValidPort(port)) {
      throw new BadRequestException('Порт должен быть от 1 до 65535');
    }

    if (RESERVED_PORTS.includes(port)) {
      throw new BadRequestException(
        `Порт ${port} занят внутренним сервисом (backend, PostgreSQL или Redis)`,
      );
    }

    const current = await this.readSettings();
    await this.writeSettings({
      ...current,
      port,
      updatedAt: new Date().toISOString(),
    });

    return this.getSettings();
  }

  async uploadCertificate(
    certBuffer: Buffer,
    keyBuffer: Buffer,
  ): Promise<ServerSettingsResponse> {
    if (!certBuffer.length || !keyBuffer.length) {
      throw new BadRequestException(
        'Нужно загрузить сертификат и приватный ключ',
      );
    }

    const certPem = certBuffer.toString('utf8').trim();
    const keyPem = keyBuffer.toString('utf8').trim();

    if (!certPem.includes('-----BEGIN CERTIFICATE-----')) {
      throw new BadRequestException('Файл сертификата не в PEM-формате');
    }

    if (
      !/-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/.test(keyPem) ||
      !keyPem.includes('PRIVATE KEY-----')
    ) {
      throw new BadRequestException('Файл ключа не в PEM-формате');
    }

    let certificate: X509Certificate;
    try {
      certificate = new X509Certificate(certPem);
    } catch {
      throw new BadRequestException('Не удалось прочитать сертификат');
    }

    const validTo = new Date(certificate.validTo);
    if (Number.isNaN(validTo.getTime()) || validTo.getTime() <= Date.now()) {
      throw new BadRequestException('Срок действия сертификата истёк');
    }

    try {
      const privateKey = createPrivateKey(keyPem);
      const certPublicKey = certificate.publicKey.export({
        type: 'spki',
        format: 'der',
      });
      const keyPublicKey = createPublicKey(privateKey).export({
        type: 'spki',
        format: 'der',
      });

      if (!Buffer.from(certPublicKey).equals(Buffer.from(keyPublicKey))) {
        throw new BadRequestException(
          'Приватный ключ не соответствует сертификату',
        );
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        'Не удалось прочитать приватный ключ или он не соответствует сертификату',
      );
    }

    await mkdir(this.tlsDir, { recursive: true });
    await this.writeFileAtomic(
      join(this.tlsDir, 'cert.pem'),
      `${certPem}\n`,
      0o644,
    );
    await this.writeFileAtomic(
      join(this.tlsDir, 'key.pem'),
      `${keyPem}\n`,
      0o600,
    );

    const current = await this.readSettings();
    await this.writeSettings({
      ...current,
      certificate: 'uploaded',
      updatedAt: new Date().toISOString(),
    });

    return this.getSettings();
  }

  async resetCertificate(): Promise<ServerSettingsResponse> {
    const current = await this.readSettings();
    await this.writeSettings({
      ...current,
      certificate: 'builtin',
      updatedAt: new Date().toISOString(),
    });

    await Promise.all([
      unlink(join(this.tlsDir, 'cert.pem')).catch(() => undefined),
      unlink(join(this.tlsDir, 'key.pem')).catch(() => undefined),
    ]);

    return this.getSettings();
  }

  private async readSettings(): Promise<StoredSettings> {
    try {
      const raw = await readFile(this.settingsPath, 'utf8');
      const parsed = JSON.parse(raw) as Partial<StoredSettings>;
      const port = isValidPort(parsed.port) ? parsed.port : DEFAULT_PORT;
      const certificate: CertificateSource =
        parsed.certificate === 'uploaded' ? 'uploaded' : 'builtin';

      return {
        port,
        certificate,
        updatedAt:
          typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '',
      };
    } catch {
      return {
        port: DEFAULT_PORT,
        certificate: 'builtin',
        updatedAt: '',
      };
    }
  }

  private async writeSettings(settings: StoredSettings): Promise<void> {
    await mkdir(this.configDir, { recursive: true });
    await this.writeFileAtomic(
      this.settingsPath,
      `${JSON.stringify(settings, null, 2)}\n`,
      0o644,
    );
  }

  private async readActivePort(): Promise<number> {
    try {
      const raw = await readFile(this.runtimePath, 'utf8');
      const parsed = JSON.parse(raw) as { port?: unknown };
      return isValidPort(parsed.port) ? parsed.port : DEFAULT_PORT;
    } catch {
      return DEFAULT_PORT;
    }
  }

  private async readCertificateInfo(
    source: CertificateSource,
  ): Promise<CertificateInfo> {
    const builtinCert = join(this.sslDir, 'staff-rf', 'fullchain.pem');
    const builtinKey = join(this.sslDir, 'staff-rf', 'privkey.pem');
    const uploadedCert = join(this.tlsDir, 'cert.pem');
    const uploadedKey = join(this.tlsDir, 'key.pem');

    let actualSource: CertificateSource = source;
    let certPath = source === 'uploaded' ? uploadedCert : builtinCert;

    if (
      source === 'uploaded' &&
      (!existsSync(uploadedCert) || !existsSync(uploadedKey))
    ) {
      actualSource = 'builtin';
      certPath = builtinCert;
    }

    const pem = await readFile(certPath);
    const certificate = new X509Certificate(pem);
    const validTo = new Date(certificate.validTo);
    const daysLeft = Number.isNaN(validTo.getTime())
      ? 0
      : Math.max(0, Math.ceil((validTo.getTime() - Date.now()) / DAY_MS));

    return {
      source: actualSource,
      subject: normalizeName(certificate.subject),
      issuer: normalizeName(certificate.issuer),
      validFrom: Number.isNaN(new Date(certificate.validFrom).getTime())
        ? certificate.validFrom
        : new Date(certificate.validFrom).toISOString(),
      validTo: Number.isNaN(validTo.getTime())
        ? certificate.validTo
        : validTo.toISOString(),
      daysLeft,
      subjectAltName: certificate.subjectAltName ?? '',
      fingerprint256: certificate.fingerprint256,
    };
  }

  private async writeFileAtomic(
    path: string,
    data: string,
    mode: number,
  ): Promise<void> {
    const tempPath = `${path}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(tempPath, data, { mode });
    await rename(tempPath, path);
    await chmod(path, mode);
  }
}
