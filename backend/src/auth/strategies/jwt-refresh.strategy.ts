import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import type { JwtPayload } from './jwt.strategy';

export interface RefreshPayload extends JwtPayload {
  jti: string;
}

interface RequestWithRefresh {
  headers?: { cookie?: string };
  body?: { refresh_token?: string };
}

function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) {
    return {};
  }

  return header.split(';').reduce<Record<string, string>>((acc, part) => {
    const index = part.indexOf('=');

    if (index > 0) {
      acc[part.slice(0, index).trim()] = decodeURIComponent(
        part.slice(index + 1).trim(),
      );
    }

    return acc;
  }, {});
}

function extractRefreshToken(request: RequestWithRefresh): string | null {
  const cookieToken = parseCookies(request.headers?.cookie).refresh_token;

  return cookieToken ?? request.body?.refresh_token ?? null;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: (request: unknown) =>
        extractRefreshToken(request as RequestWithRefresh),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      algorithms: ['HS256'],
    });
  }

  validate(payload: RefreshPayload): RefreshPayload {
    return payload;
  }
}
