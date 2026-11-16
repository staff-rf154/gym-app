import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Role, WorkoutStatus } from '@prisma/client';
import PDFDocument from 'pdfkit';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaService } from '../prisma/prisma.service';
import { dateStringInTimezone } from '../common/timezone';
import { ReportPdfQueryDto } from './dto/report-pdf-query.dto';
import { ReportsService } from './reports.service';

interface Period {
  from: Date;
  to: Date;
  label: string;
}

interface ReportClient {
  id: string;
  name: string;
  timezone: string;
  trainerId?: string;
}

interface TableColumn {
  title: string;
  fraction: number;
}

const FONT_CANDIDATES = [
  join(process.cwd(), 'assets', 'DejaVuSans.ttf'),
  join(__dirname, '..', '..', '..', 'assets', 'DejaVuSans.ttf'),
  join(__dirname, '..', '..', 'assets', 'DejaVuSans.ttf'),
];

function resolveFontPath(): string | null {
  return FONT_CANDIDATES.find((candidate) => existsSync(candidate)) ?? null;
}

@Injectable()
export class ReportsPdfService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reportsService: ReportsService,
  ) {}

  async weightPdf(
    userId: string,
    role: string,
    query: ReportPdfQueryDto,
  ): Promise<Buffer> {
    const client = await this.resolveClient(userId, role, query.client_id);
    const period = this.resolvePeriod(query, client.timezone);
    const measurements = await this.prisma.weightMeasurement.findMany({
      where: {
        clientId: client.id,
        ...(role === Role.TRAINER ? { measuredBy: userId } : {}),
        measuredAt: { gte: period.from, lte: period.to },
      },
      orderBy: { measuredAt: 'asc' },
    });

    return this.renderTable(
      `Отчёт по весу — ${client.name}`,
      period.label,
      [
        { title: 'Дата', fraction: 0.3 },
        { title: 'Вес, кг', fraction: 0.25 },
        { title: 'Жир, %', fraction: 0.25 },
        { title: 'Комментарий', fraction: 0.2 },
      ],
      measurements.length === 0
        ? [['За выбранный период замеров нет.', '', '', '']]
        : measurements.map((measurement) => [
            dateStringInTimezone(measurement.measuredAt, client.timezone),
            measurement.weight.toFixed(1),
            measurement.fatMass?.toFixed(1) ?? '—',
            measurement.comment ?? '',
          ]),
    );
  }

  async exercisesPdf(
    userId: string,
    role: string,
    query: ReportPdfQueryDto,
  ): Promise<Buffer> {
    const client = await this.resolveClient(userId, role, query.client_id);
    const period = this.resolvePeriod(query, client.timezone);
    const items = await this.prisma.workoutItem.findMany({
      where: {
        workout: {
          clientId: client.id,
          date: { gte: period.from, lte: period.to },
          status: {
            in: [WorkoutStatus.COMPLETED, WorkoutStatus.AUTO_CLOSED],
          },
          ...(client.trainerId ? { trainerId: client.trainerId } : {}),
        },
      },
      include: {
        exercise: { select: { name: true } },
        workout: { select: { date: true } },
        result: true,
      },
      orderBy: [{ workout: { date: 'asc' } }, { order: 'asc' }],
    });

    const rows =
      items.length === 0
        ? [['За выбранный период выполненных тренировок нет.', '', '', '', '']]
        : items.map((item) => {
            const actualWeight =
              item.result?.actualWeight ?? item.plannedWeight ?? 0;
            const actualReps = item.result?.actualReps ?? item.plannedReps;
            return [
              item.workout.date.toISOString().slice(0, 10),
              item.exercise.name,
              `${item.plannedSets}×${item.plannedReps} @ ${item.plannedWeight ?? 0} кг`,
              `${actualReps} @ ${actualWeight} кг`,
              item.result?.done ? 'Выполнено' : 'Не выполнено',
            ];
          });

    return this.renderTable(
      `Отчёт по упражнениям — ${client.name}`,
      period.label,
      [
        { title: 'Дата', fraction: 0.15 },
        { title: 'Упражнение', fraction: 0.35 },
        { title: 'План', fraction: 0.2 },
        { title: 'Факт', fraction: 0.18 },
        { title: 'Статус', fraction: 0.12 },
      ],
      rows,
    );
  }

  async attendancePdf(
    userId: string,
    role: string,
    query: ReportPdfQueryDto,
  ): Promise<Buffer> {
    const period = this.resolvePeriod(query, this.reportTimezone());
    const report = await this.reportsService.attendance(userId, role, {
      from: this.dateKey(period.from),
      to: this.dateKey(period.to),
      gym_id: query.gym_id,
      trainer_id: query.trainer_id,
      client_id: query.client_id,
      group_by: 'day',
    });
    const rows: string[][] = [
      ['Всего посещений', String(report.totalVisits), ''],
      ['Уникальных клиентов', String(report.uniqueClients), ''],
      ...report.byClient.map((item) => [
        item.clientName,
        String(item.visits),
        item.lastVisitDate,
      ]),
    ];

    return this.renderTable(
      'Отчёт по посещаемости',
      period.label,
      [
        { title: 'Клиент', fraction: 0.6 },
        { title: 'Посещений', fraction: 0.2 },
        { title: 'Последний визит', fraction: 0.2 },
      ],
      rows,
    );
  }

  async equipmentPdf(
    userId: string,
    role: string,
    query: ReportPdfQueryDto,
  ): Promise<Buffer> {
    const period = this.resolvePeriod(query, this.reportTimezone());
    const report = await this.reportsService.equipmentUsage(userId, role, {
      from: this.dateKey(period.from),
      to: this.dateKey(period.to),
      gym_id: query.gym_id,
      trainer_id: query.trainer_id,
      client_id: query.client_id,
      group_by: 'equipment',
      period: 'day',
    });
    const rows: string[][] = [
      ['Всего использований', String(report.totalUsage), '', ''],
      ...report.byEquipment.map((item) => [
        item.equipmentName,
        item.type,
        String(item.usageCount),
        `${(item.share * 100).toFixed(1)}%`,
      ]),
    ];

    return this.renderTable(
      'Отчёт по использованию тренажёров',
      period.label,
      [
        { title: 'Тренажёр', fraction: 0.5 },
        { title: 'Тип', fraction: 0.2 },
        { title: 'Использований', fraction: 0.18 },
        { title: 'Доля', fraction: 0.12 },
      ],
      rows,
    );
  }

  async trainersPdf(
    userId: string,
    role: string,
    query: ReportPdfQueryDto,
  ): Promise<Buffer> {
    const period = this.resolvePeriod(query, this.reportTimezone());
    const report = await this.reportsService.trainersReport(userId, role, {
      from: this.dateKey(period.from),
      to: this.dateKey(period.to),
      gym_id: query.gym_id,
      trainer_id: query.trainer_id,
    });
    const rows: string[][] =
      report.length === 0
        ? [['За выбранный период данных нет.', '', '']]
        : report.map((item) => [
            item.trainerName,
            String(item.visits),
            String(item.uniqueClients),
          ]);

    return this.renderTable(
      'Отчёт по тренерам',
      period.label,
      [
        { title: 'Тренер', fraction: 0.6 },
        { title: 'Посещений', fraction: 0.2 },
        { title: 'Клиентов', fraction: 0.2 },
      ],
      rows,
    );
  }

  private async resolveClient(
    userId: string,
    role: string,
    clientId?: string,
  ): Promise<ReportClient> {
    if (role === Role.CLIENT) {
      const client = await this.prisma.client.findUnique({
        where: { userId },
        include: { user: { select: { name: true, timezone: true } } },
      });

      if (!client) {
        throw new ForbiddenException('Client profile not found');
      }

      if (clientId && clientId !== client.id) {
        throw new ForbiddenException('Report belongs to another client');
      }

      return {
        id: client.id,
        name: client.user.name,
        timezone: client.user.timezone,
      };
    }

    if (!clientId) {
      throw new BadRequestException('client_id is required');
    }

    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      include: { user: { select: { name: true, timezone: true } } },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    let trainerId: string | undefined;

    if (role === Role.TRAINER) {
      const trainer = await this.prisma.trainer.findUnique({
        where: { userId },
        select: { id: true },
      });
      const link = trainer
        ? await this.prisma.clientTrainer.findFirst({
            where: { clientId, trainerId: trainer.id, isActive: true },
            select: { id: true },
          })
        : null;

      if (!link || !trainer) {
        throw new ForbiddenException('Trainer not linked to client');
      }

      trainerId = trainer.id;
    }

    if (role === Role.ADMINISTRATOR) {
      const administrator = await this.prisma.administrator.findUnique({
        where: { userId },
        select: { gymId: true },
      });
      const link = administrator
        ? await this.prisma.clientGym.findFirst({
            where: {
              clientId,
              gymId: administrator.gymId,
              isActive: true,
            },
            select: { id: true },
          })
        : null;

      if (!link) {
        throw new ForbiddenException('Client is not active in your gym');
      }
    }

    return {
      id: client.id,
      name: client.user.name,
      timezone: client.user.timezone,
      trainerId,
    };
  }

  private resolvePeriod(
    query: ReportPdfQueryDto,
    timezone: string,
  ): Period {
    if (query.period === 'custom' || query.from || query.to) {
      if (!query.from || !query.to) {
        throw new BadRequestException(
          'from and to are required for a custom period',
        );
      }

      const from = new Date(`${query.from}T00:00:00.000Z`);
      const to = new Date(`${query.to}T23:59:59.999Z`);

      if (from.getTime() > to.getTime()) {
        throw new BadRequestException('from must be less than or equal to to');
      }

      return {
        from,
        to,
        label: `${query.from} — ${query.to}`,
      };
    }

    const todayLabel = dateStringInTimezone(new Date(), timezone);
    const year = Number(todayLabel.slice(0, 4));
    const month = Number(todayLabel.slice(5, 7)) - 1;
    const today = new Date(`${todayLabel}T00:00:00.000Z`);
    const to = new Date(`${todayLabel}T23:59:59.999Z`);
    const preset = query.period ?? 'week';
    let from: Date;

    if (preset === 'week') {
      const weekday = (today.getUTCDay() + 6) % 7;
      const monday = new Date(today);
      monday.setUTCDate(today.getUTCDate() - weekday);
      const sunday = new Date(monday);
      sunday.setUTCDate(monday.getUTCDate() + 6);

      return {
        from: monday,
        to: new Date(`${sunday.toISOString().slice(0, 10)}T23:59:59.999Z`),
        label: `${monday.toISOString().slice(0, 10)} — ${sunday
          .toISOString()
          .slice(0, 10)}`,
      };
    }

    if (preset === 'previousWeek') {
      const weekday = (today.getUTCDay() + 6) % 7;
      const monday = new Date(today);
      monday.setUTCDate(today.getUTCDate() - weekday - 7);
      const sunday = new Date(monday);
      sunday.setUTCDate(monday.getUTCDate() + 6);

      return {
        from: monday,
        to: new Date(`${sunday.toISOString().slice(0, 10)}T23:59:59.999Z`),
        label: `${monday.toISOString().slice(0, 10)} — ${sunday
          .toISOString()
          .slice(0, 10)}`,
      };
    }

    if (preset === '3months') {
      from = new Date(Date.UTC(year, month - 2, 1));
    } else if (preset === 'year') {
      from = new Date(Date.UTC(year, 0, 1));
    } else {
      from = new Date(Date.UTC(year, month, 1));
    }

    from.setUTCHours(0, 0, 0, 0);

    return {
      from,
      to,
      label: `${from.toISOString().slice(0, 10)} — ${to
        .toISOString()
        .slice(0, 10)}`,
    };
  }

  private reportTimezone(): string {
    const timezone = process.env.DEFAULT_TIMEZONE ?? 'UTC';
    try {
      dateStringInTimezone(new Date(), timezone);
      return timezone;
    } catch {
      return 'UTC';
    }
  }

  private dateKey(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private renderTable(
    title: string,
    periodLabel: string,
    columns: TableColumn[],
    rows: string[][],
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const fontPath = resolveFontPath();

      if (!fontPath) {
        reject(new InternalServerErrorException('PDF font is not available'));
        return;
      }

      const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.registerFont('DejaVu', fontPath);
      doc.font('DejaVu');

      const left = doc.page.margins.left;
      const usable =
        doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const widths = columns.map((column) => column.fraction * usable);
      const bottom = doc.page.height - doc.page.margins.bottom;

      let y = doc.page.margins.top;
      doc.fontSize(16).fillColor('#000000').text(title, left, y, {
        width: usable,
      });
      y += doc.heightOfString(title, { width: usable }) + 6;
      doc.fontSize(10).fillColor('#555555').text(`Период: ${periodLabel}`, left, y, {
        width: usable,
      });
      y += doc.heightOfString(`Период: ${periodLabel}`, { width: usable }) + 12;

      const drawHeader = (top: number): number => {
        doc.save().rect(left, top, usable, 24).fill('#37474f').restore();
        doc.fontSize(9).fillColor('#ffffff');
        let x = left;

        columns.forEach((column, index) => {
          doc.text(column.title, x + 4, top + 7, {
            width: widths[index] - 8,
          });
          x += widths[index];
        });

        return top + 24;
      };

      y = drawHeader(y);

      for (const row of rows) {
        const cellHeights = row.map((cell, index) =>
          doc.heightOfString(cell || '—', { width: widths[index] - 8 }),
        );
        const rowHeight = Math.max(20, ...cellHeights) + 8;

        if (y + rowHeight > bottom) {
          doc.addPage();
          y = drawHeader(doc.page.margins.top);
        }

        let x = left;
        row.forEach((cell, index) => {
          doc
            .rect(x, y, widths[index], rowHeight)
            .lineWidth(0.5)
            .strokeColor('#b0bec5')
            .stroke();
          doc.fontSize(9).fillColor('#000000').text(cell || '—', x + 4, y + 4, {
            width: widths[index] - 8,
          });
          x += widths[index];
        });

        y += rowHeight;
      }

      doc.end();
    });
  }
}
