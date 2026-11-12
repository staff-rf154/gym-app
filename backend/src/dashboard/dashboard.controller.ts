import { Controller, Get } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { DashboardService, type DashboardStats } from './dashboard.service';

@Controller('admin/dashboard')
@Roles(Role.ADMIN)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  getStats(): Promise<DashboardStats> {
    return this.dashboardService.getStats();
  }
}
