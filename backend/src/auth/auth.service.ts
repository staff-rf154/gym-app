import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import type { RefreshPayload } from './strategies/jwt-refresh.strategy';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '30d';
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const BCRYPT_ROUNDS = 10;

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

    if (!storedToken || storedToken.userId !== payload.sub) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (storedToken.expiresAt.getTime() <= Date.now()) {
      await this.prisma.refreshToken.deleteMany({
        where: { id: storedToken.id },
      });
      throw new UnauthorizedException('Refresh token expired');
    }

    const isTokenValid = await bcrypt.compare(
      refreshToken,
      storedToken.tokenHash,
    );

    if (!isTokenValid) {
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
    await this.prisma.user.update({
      where: { id: userId },
      data: { pushToken: token },
    });
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

    const tokenHash = await bcrypt.hash(refreshToken, BCRYPT_ROUNDS);

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
