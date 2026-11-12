import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import type { RefreshPayload } from './strategies/jwt-refresh.strategy';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '30d';
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const BCRYPT_ROUNDS = 12;
const DUMMY_PASSWORD_HASH =
  '$2b$12$6k8AKbZBQc8e064Ju6T6DuYbgMICWyrkxQ/n4/daFR.wOE0gmtXbO';

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  role: Role;
  user_id: string;
}

export interface MeResponse {
  user_id: string;
  role: Role;
  name: string;
  phone: string;
  timezone: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: LoginDto): Promise<TokenResponse> {
    const user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });

    if (!user) {
      await bcrypt.compare(dto.password, DUMMY_PASSWORD_HASH);
      throw new UnauthorizedException('Invalid phone or password');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid phone or password');
    }

    return this.issueTokens(user);
  }

  async refresh(
    refreshToken: string,
    payload: RefreshPayload,
  ): Promise<TokenResponse> {
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { id: payload.jti },
    });

    if (!storedToken) {
      await this.prisma.refreshToken.deleteMany({
        where: { userId: payload.sub },
      });
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    if (storedToken.userId !== payload.sub) {
      await this.prisma.refreshToken.deleteMany({
        where: { userId: payload.sub },
      });
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (storedToken.expiresAt.getTime() <= Date.now()) {
      await this.prisma.refreshToken.deleteMany({
        where: { id: storedToken.id },
      });
      throw new UnauthorizedException('Refresh token expired');
    }

    const expectedHash = Buffer.from(storedToken.tokenHash, 'hex');
    const actualHash = Buffer.from(this.hashRefreshToken(refreshToken), 'hex');

    if (
      expectedHash.length !== actualHash.length ||
      !timingSafeEqual(expectedHash, actualHash)
    ) {
      await this.prisma.refreshToken.deleteMany({
        where: { userId: payload.sub },
      });
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: storedToken.userId },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.prisma.refreshToken.deleteMany({
      where: { id: storedToken.id },
    });

    return this.issueTokens(user);
  }

  async getMe(userId: string): Promise<MeResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    return {
      user_id: user.id,
      role: user.role,
      name: user.name,
      phone: user.phone,
      timezone: user.timezone,
    };
  }

  async updateTimezone(userId: string, timezone: string): Promise<void> {
    const isValidTimezone = Intl.supportedValuesOf('timeZone').includes(
      timezone,
    );

    if (!isValidTimezone) {
      throw new BadRequestException('Invalid timezone');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { timezone },
    });
  }

  async updatePushToken(userId: string, token: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.user.updateMany({
        where: { pushToken: token, id: { not: userId } },
        data: { pushToken: null },
      });
      await tx.user.update({
        where: { id: userId },
        data: { pushToken: token },
      });
    });
  }

  private hashRefreshToken(token: string): string {
    return createHmac(
      'sha256',
      this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
    )
      .update(token)
      .digest('hex');
  }

  private async issueTokens(user: User): Promise<TokenResponse> {
    const payload = {
      sub: user.id,
      role: user.role,
      timezone: user.timezone,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      expiresIn: ACCESS_TOKEN_TTL,
    });

    const refreshTokenId = randomUUID();
    const refreshToken = await this.jwtService.signAsync(
      { ...payload, jti: refreshTokenId },
      {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: REFRESH_TOKEN_TTL,
      },
    );

    const tokenHash = this.hashRefreshToken(refreshToken);

    await this.prisma.refreshToken.create({
      data: {
        id: refreshTokenId,
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      role: user.role,
      user_id: user.id,
    };
  }
}
