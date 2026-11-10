import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
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

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Вход по телефону и паролю' })
  login(@Body() dto: LoginDto): Promise<TokenResponse> {
    return this.authService.login(dto);
  }

  @Public()
  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Обновление токенов (rotation)' })
  refresh(
    @Body() dto: RefreshDto,
    @Req() request: RequestWithRefreshUser,
  ): Promise<TokenResponse> {
    return this.authService.refresh(dto.refresh_token, request.user);
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
