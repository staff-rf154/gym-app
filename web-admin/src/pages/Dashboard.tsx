import { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Row,
  Segmented,
  Space,
  Statistic,
  Typography,
} from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import dayjs, { type Dayjs } from 'dayjs';
import api from '../api/client';

interface DashboardReport {
  from: string;
  to: string;
  visits: number;
  uniqueClients: number;
  activeTrainers: number;
  equipmentUsage: number;
  workouts: number;
}

interface DashboardSummary {
  gyms: number;
  activeGyms: number;
  trainers: number;
  clients: number;
  equipment: number;
  workouts: number;
  report: DashboardReport;
}

type PeriodValue = 'previousWeek' | 'currentWeek' | 'previousMonth' | 'currentMonth';

const PERIOD_OPTIONS = [
  { value: 'previousWeek', label: 'Прошлая неделя' },
  { value: 'currentWeek', label: 'Текущая неделя' },
  { value: 'previousMonth', label: 'Прошлый месяц' },
  { value: 'currentMonth', label: 'Текущий месяц' },
];

function periodRange(period: PeriodValue): [Dayjs, Dayjs] {
  const now = dayjs();
  const weekStart = now
    .subtract((now.day() + 6) % 7, 'day')
    .startOf('day');

  switch (period) {
    case 'previousWeek': {
      const start = weekStart.subtract(1, 'week');
      return [start, weekStart.subtract(1, 'day')];
    }
    case 'currentWeek':
      return [weekStart, weekStart.add(6, 'day')];
    case 'previousMonth': {
      const start = now.subtract(1, 'month').startOf('month');
      return [start, start.endOf('month')];
    }
    default:
      return [now.startOf('month'), now.endOf('month')];
  }
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<PeriodValue>('previousWeek');
  const range = useMemo(() => periodRange(period), [period]);
  const params = useMemo(
    () => ({
      from: range[0].format('YYYY-MM-DD'),
      to: range[1].format('YYYY-MM-DD'),
    }),
    [range],
  );

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard', 'summary', params],
    queryFn: async () => {
      const { data } = await api.get<DashboardSummary>(
        '/admin/dashboard/stats',
        { params },
      );
      return data;
    },
  });

  const report = data?.report;

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div>
        <Typography.Title level={3} style={{ marginTop: 0, marginBottom: 4 }}>
          Дашборд
        </Typography.Title>
        <Typography.Text type="secondary">
          Сводка по залам, сотрудникам и клиентам
        </Typography.Text>
      </div>

      <Space wrap align="center">
        <Segmented
          value={period}
          onChange={(value) => setPeriod(value as PeriodValue)}
          options={PERIOD_OPTIONS}
        />
        <Typography.Text type="secondary">
          {range[0].format('DD.MM.YYYY')} — {range[1].format('DD.MM.YYYY')}
        </Typography.Text>
      </Space>

      {isError && (
        <Alert
          type="error"
          showIcon
          message="Не удалось загрузить статистику"
          action={
            <Button size="small" onClick={() => void refetch()}>
              Повторить
            </Button>
          }
        />
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={isLoading}>
            <Statistic
              title={
                data ? `Залы · активных ${data.activeGyms}` : 'Залы'
              }
              value={data?.gyms}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card loading={isLoading}>
            <Statistic title="Тренеры" value={data?.trainers} />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card loading={isLoading}>
            <Statistic title="Клиенты" value={data?.clients} />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card loading={isLoading}>
            <Statistic title="Тренажёры" value={data?.equipment} />
          </Card>
        </Col>
      </Row>

      <Typography.Title level={5} style={{ margin: 0 }}>
        Отчёт за период
      </Typography.Title>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={8} xl={6}>
          <Card loading={isLoading}>
            <Statistic title="Посещения" value={report?.visits ?? 0} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8} xl={6}>
          <Card loading={isLoading}>
            <Statistic
              title="Уникальные клиенты"
              value={report?.uniqueClients ?? 0}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8} xl={6}>
          <Card loading={isLoading}>
            <Statistic
              title="Активные тренеры"
              value={report?.activeTrainers ?? 0}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8} xl={6}>
          <Card loading={isLoading}>
            <Statistic
              title="Использование тренажёров"
              value={report?.equipmentUsage ?? 0}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8} xl={6}>
          <Card loading={isLoading}>
            <Statistic title="Тренировки" value={report?.workouts ?? 0} />
          </Card>
        </Col>
      </Row>

      <Card title="Отчёты">
        <Space wrap>
          <Button onClick={() => navigate('/protected/reports/attendance')}>
            Посещаемость
          </Button>
          <Button onClick={() => navigate('/protected/reports/equipment')}>
            Использование тренажёров
          </Button>
          <Button onClick={() => navigate('/protected/reports/trainers')}>
            По тренерам
          </Button>
        </Space>
      </Card>
    </Space>
  );
}
