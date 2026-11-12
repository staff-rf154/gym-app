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
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AuthService, MeResponse, TokenResponse } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { UpdatePushTokenDto } from './dto/update-push-token.dto';
import { UpdateTimezoneDto } from './dto/update-timezone.dto';
import type { RefreshPayload } from './strategies/jwt-refresh.strategy';

interface RequestWithRefreshUser {
  user: RefreshPayload;
}

interface ResponseWithCookie {
  cookie: (
    name: string,
    value: string,
    options: Record<string, unknown>,
  ) => void;
}

const REFRESH_COOKIE = 'refresh_token';
const REFRESH_COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000;

function setRefreshCookie(
  response: ResponseWithCookie,
  token: string,
): void {
  response.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/api/v1/auth',
    maxAge: REFRESH_COOKIE_MAX_AGE,
  });
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
    @Res({ passthrough: true }) response: ResponseWithCookie,
  ): Promise<TokenResponse> {
    const tokens = await this.authService.login(dto);
    setRefreshCookie(response, tokens.refresh_token);
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
    const tokens = await this.authService.refresh(
      dto.refresh_token ?? '',
      request.user,
    );
    setRefreshCookie(response, tokens.refresh_token);
    return tokens;
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
