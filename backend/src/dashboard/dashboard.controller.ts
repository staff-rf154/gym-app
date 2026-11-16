import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { DashboardService, type DashboardStats } from './dashboard.service';
import { DashboardQueryDto } from './dto/dashboard-query.dto';

@Controller('admin/dashboard')
@Roles(Role.ADMIN, Role.ADMINISTRATOR)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  getStats(
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: string,
    @Query() query: DashboardQueryDto,
  ): Promise<DashboardStats> {
    return this.dashboardService.getStats(userId, role, query);
  }
}
