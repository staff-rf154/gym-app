import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AuthService, MeResponse, TokenResponse } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { UpdatePushTokenDto } from './dto/update-push-token.dto';
import { UpdateTimezoneDto } from './dto/update-timezone.dto';
import type { RefreshPayload } from './strategies/jwt-refresh.strategy';

interface RequestWithProtocol {
  secure?: boolean;
  headers?: { 'x-forwarded-proto'?: string | string[] };
}

interface RequestWithRefreshUser extends RequestWithProtocol {
  user: RefreshPayload;
  headers?: {
    cookie?: string;
    'x-forwarded-proto'?: string | string[];
  };
  body?: { refresh_token?: string };
}

interface ResponseWithCookie {
  cookie: (
    name: string,
    value: string,
    options: Record<string, unknown>,
  ) => void;
  clearCookie: (name: string, options: Record<string, unknown>) => void;
}

const REFRESH_COOKIE = 'refresh_token';
const REFRESH_COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000;

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'strict' as const,
  path: '/api/v1/auth',
};

function isSecureRequest(request?: RequestWithProtocol): boolean {
  const forwarded = request?.headers?.['x-forwarded-proto'];
  const proto = Array.isArray(forwarded)
    ? forwarded[0]
    : forwarded?.split(',')[0]?.trim();

  if (proto) {
    return proto.toLowerCase() === 'https';
  }

  return request?.secure === true;
}

function refreshCookieOptions(
  request?: RequestWithProtocol,
): Record<string, unknown> {
  return {
    ...REFRESH_COOKIE_OPTIONS,
    secure: isSecureRequest(request),
  };
}

function setRefreshCookie(
  response: ResponseWithCookie,
  token: string,
  request?: RequestWithProtocol,
): void {
  response.cookie(REFRESH_COOKIE, token, {
    ...refreshCookieOptions(request),
    maxAge: REFRESH_COOKIE_MAX_AGE,
  });
}

function clearRefreshCookie(
  response: ResponseWithCookie,
  request?: RequestWithProtocol,
): void {
  response.clearCookie(REFRESH_COOKIE, refreshCookieOptions(request));
}

function extractRefreshToken(
  request: RequestWithRefreshUser,
): string | undefined {
  const cookieHeader = request.headers?.cookie;
  const cookies = cookieHeader
    ? cookieHeader.split(';').reduce<Record<string, string>>((acc, part) => {
        const index = part.indexOf('=');

        if (index > 0) {
          acc[part.slice(0, index).trim()] = decodeURIComponent(
            part.slice(index + 1).trim(),
          );
        }

        return acc;
      }, {})
    : {};

  return cookies[REFRESH_COOKIE] ?? request.body?.refresh_token;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Вход по телефону и паролю' })
  async login(
    @Body() dto: LoginDto,
    @Req() request: RequestWithProtocol,
    @Res({ passthrough: true }) response: ResponseWithCookie,
  ): Promise<TokenResponse> {
    const tokens = await this.authService.login(dto);
    setRefreshCookie(response, tokens.refresh_token, request);
    return tokens;
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Обновление токенов (rotation)' })
  async refresh(
    @Body() dto: RefreshDto,
    @Req() request: RequestWithRefreshUser,
    @Res({ passthrough: true }) response: ResponseWithCookie,
  ): Promise<TokenResponse> {
    const refreshToken = extractRefreshToken(request) ?? dto.refresh_token;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing');
    }

    const tokens = await this.authService.refresh(
      refreshToken,
      request.user,
    );
    setRefreshCookie(response, tokens.refresh_token, request);
    return tokens;
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Выход и отзыв refresh-токенов' })
  async logout(
    @CurrentUser('userId') userId: string,
    @Req() request: RequestWithProtocol,
    @Res({ passthrough: true }) response: ResponseWithCookie,
  ): Promise<void> {
    await this.authService.logout(userId);
    clearRefreshCookie(response, request);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Сменить свой пароль' })
  async changePassword(
    @CurrentUser('userId') userId: string,
    @Body() dto: ChangePasswordDto,
    @Req() request: RequestWithProtocol,
    @Res({ passthrough: true }) response: ResponseWithCookie,
  ): Promise<void> {
    await this.authService.changePassword(
      userId,
      dto.current_password,
      dto.new_password,
    );
    clearRefreshCookie(response, request);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Текущий пользователь' })
  getMe(@CurrentUser('userId') userId: string): Promise<MeResponse> {
    return this.authService.getMe(userId);
  }

  @Patch('timezone')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Обновить часовой пояс' })
  updateTimezone(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateTimezoneDto,
  ): Promise<void> {
    return this.authService.updateTimezone(userId, dto.timezone);
  }

  @Patch('push-token')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Обновить FCM-токен устройства' })
  updatePushToken(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdatePushTokenDto,
  ): Promise<void> {
    return this.authService.updatePushToken(userId, dto.token);
  }
}
