import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AttendanceQueryDto } from './dto/attendance-query.dto';
import { EquipmentUsageQueryDto } from './dto/equipment-usage-query.dto';
import { ExerciseProgressQueryDto } from './dto/exercise-progress-query.dto';
import { ExercisesSummaryQueryDto } from './dto/exercises-summary-query.dto';
import { ReportPdfQueryDto } from './dto/report-pdf-query.dto';
import { TrainersReportQueryDto } from './dto/trainers-report-query.dto';
import { WeightDynamicsQueryDto } from './dto/weight-dynamics-query.dto';
import { ReportsPdfService } from './reports-pdf.service';
import {
  AttendanceResponse,
  EquipmentUsageResponse,
  ExerciseProgressResponse,
  ExerciseSummaryItem,
  ReportsService,
  TrainerReportItem,
  WeightDynamicsPoint,
} from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@Roles(Role.CLIENT, Role.ADMINISTRATOR, Role.TRAINER, Role.ADMIN)
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly reportsPdfService: ReportsPdfService,
  ) {}

  @Get('weight-dynamics')
  @ApiOperation({ summary: 'Динамика веса и жира' })
  weightDynamics(
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: string,
    @Query() query: WeightDynamicsQueryDto,
  ): Promise<WeightDynamicsPoint[]> {
    return this.reportsService.weightDynamics(userId, role, query);
  }

  @Get('exercise-progress')
  @ApiOperation({ summary: 'Прогресс по упражнению (план vs факт)' })
  exerciseProgress(
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: string,
    @Query() query: ExerciseProgressQueryDto,
  ): Promise<ExerciseProgressResponse> {
    return this.reportsService.exerciseProgress(userId, role, query);
  }

  @Get('exercises-summary')
  @ApiOperation({ summary: 'Упражнения с историей' })
  exercisesSummary(
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: string,
    @Query() query: ExercisesSummaryQueryDto,
  ): Promise<ExerciseSummaryItem[]> {
    return this.reportsService.exercisesSummary(userId, role, query);
  }

  @Get('attendance')
  @Roles(Role.ADMIN, Role.ADMINISTRATOR, Role.TRAINER)
  @ApiOperation({ summary: 'Посещаемость' })
  attendance(
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: string,
    @Query() query: AttendanceQueryDto,
  ): Promise<AttendanceResponse> {
    return this.reportsService.attendance(userId, role, query);
  }

  @Get('equipment-usage')
  @Roles(Role.ADMIN, Role.ADMINISTRATOR, Role.TRAINER)
  @ApiOperation({ summary: 'Использование тренажёров' })
  equipmentUsage(
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: string,
    @Query() query: EquipmentUsageQueryDto,
  ): Promise<EquipmentUsageResponse> {
    return this.reportsService.equipmentUsage(userId, role, query);
  }

  @Get('trainers')
  @Roles(Role.ADMIN, Role.ADMINISTRATOR, Role.TRAINER)
  @ApiOperation({ summary: 'Отчёт по тренерам' })
  trainers(
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: string,
    @Query() query: TrainersReportQueryDto,
  ): Promise<TrainerReportItem[]> {
    return this.reportsService.trainersReport(userId, role, query);
  }

  @Get('pdf/weight')
  @ApiOperation({ summary: 'PDF-отчёт по весу' })
  async weightPdf(
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: string,
    @Query() query: ReportPdfQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const pdf = await this.reportsPdfService.weightPdf(userId, role, query);
    this.sendPdf(res, pdf, 'weight-report.pdf');
  }

  @Get('pdf/exercises')
  @ApiOperation({ summary: 'PDF-отчёт по выполнению упражнений' })
  async exercisesPdf(
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: string,
    @Query() query: ReportPdfQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const pdf = await this.reportsPdfService.exercisesPdf(userId, role, query);
    this.sendPdf(res, pdf, 'exercises-report.pdf');
  }

  @Get('pdf/attendance')
  @Roles(Role.ADMIN, Role.ADMINISTRATOR, Role.TRAINER)
  @ApiOperation({ summary: 'PDF-отчёт по посещаемости' })
  async attendancePdf(
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: string,
    @Query() query: ReportPdfQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const pdf = await this.reportsPdfService.attendancePdf(userId, role, query);
    this.sendPdf(res, pdf, 'attendance-report.pdf');
  }

  @Get('pdf/equipment')
  @Roles(Role.ADMIN, Role.ADMINISTRATOR, Role.TRAINER)
  @ApiOperation({ summary: 'PDF-отчёт по использованию тренажёров' })
  async equipmentPdf(
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: string,
    @Query() query: ReportPdfQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const pdf = await this.reportsPdfService.equipmentPdf(userId, role, query);
    this.sendPdf(res, pdf, 'equipment-report.pdf');
  }

  @Get('pdf/trainers')
  @Roles(Role.ADMIN, Role.ADMINISTRATOR, Role.TRAINER)
  @ApiOperation({ summary: 'PDF-отчёт по тренерам' })
  async trainersPdf(
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: string,
    @Query() query: ReportPdfQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const pdf = await this.reportsPdfService.trainersPdf(userId, role, query);
    this.sendPdf(res, pdf, 'trainers-report.pdf');
  }

  private sendPdf(res: Response, pdf: Buffer, filename: string): void {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdf.length);
    res.end(pdf);
  }
}
