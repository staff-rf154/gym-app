import { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/client';
import { useReportLookups } from './useReportLookups';

interface AttendanceDynamicsPoint {
  period: string;
  visits: number;
  uniqueClients: number;
}

interface AttendanceClientItem {
  clientId: string;
  clientName: string;
  visits: number;
  lastVisitDate: string;
}

interface AttendanceResponse {
  totalVisits: number;
  uniqueClients: number;
  dynamics: AttendanceDynamicsPoint[];
  byClient: AttendanceClientItem[];
}

const GROUP_OPTIONS = [
  { value: 'day', label: 'По дням' },
  { value: 'week', label: 'По неделям' },
  { value: 'month', label: 'По месяцам' },
];

export default function AttendanceReportPage() {
  const { gyms, trainers, clients } = useReportLookups();
  const [range, setRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(29, 'day'),
    dayjs(),
  ]);
  const [gymId, setGymId] = useState<string | undefined>();
  const [trainerId, setTrainerId] = useState<string | undefined>();
  const [clientId, setClientId] = useState<string | undefined>();
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day');

  const params = useMemo(
    () => ({
      from: range[0].format('YYYY-MM-DD'),
      to: range[1].format('YYYY-MM-DD'),
      gym_id: gymId,
      trainer_id: trainerId,
      client_id: clientId,
      group_by: groupBy,
    }),
    [range, gymId, trainerId, clientId, groupBy],
  );

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['report-attendance', params],
    queryFn: async () => {
      const response = await api.get<AttendanceResponse>(
        '/reports/attendance',
        { params },
      );
      return response.data;
    },
  });

  const dynamicsColumns: ColumnsType<AttendanceDynamicsPoint> = [
    { title: 'Период', dataIndex: 'period', key: 'period' },
    { title: 'Посещения', dataIndex: 'visits', key: 'visits' },
    {
      title: 'Уникальные клиенты',
      dataIndex: 'uniqueClients',
      key: 'uniqueClients',
    },
  ];

  const clientColumns: ColumnsType<AttendanceClientItem> = [
    { title: 'Клиент', dataIndex: 'clientName', key: 'clientName' },
    { title: 'Посещения', dataIndex: 'visits', key: 'visits', width: 140 },
    {
      title: 'Последний визит',
      dataIndex: 'lastVisitDate',
      key: 'lastVisitDate',
      width: 180,
    },
  ];

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Typography.Title level={4}>Посещаемость</Typography.Title>

      <Space wrap>
        <DatePicker.RangePicker
          value={range}
          format="DD.MM.YYYY"
          onChange={(value) => {
            if (value?.[0] && value?.[1]) {
              setRange([value[0], value[1]]);
            }
          }}
        />
        {gyms.length > 0 && (
          <Select
            allowClear
            placeholder="Зал"
            style={{ minWidth: 180 }}
            value={gymId}
            onChange={setGymId}
            options={gyms.map((gym) => ({ value: gym.id, label: gym.name }))}
          />
        )}
        {trainers.length > 0 && (
          <Select
            allowClear
            placeholder="Тренер"
            style={{ minWidth: 180 }}
            value={trainerId}
            onChange={setTrainerId}
            options={trainers.map((trainer) => ({
              value: trainer.id,
              label: trainer.name,
            }))}
          />
        )}
        {clients.length > 0 && (
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Клиент"
            style={{ minWidth: 180 }}
            value={clientId}
            onChange={setClientId}
            options={clients.map((client) => ({
              value: client.id,
              label: client.name,
            }))}
          />
        )}
        <Select
          value={groupBy}
          style={{ minWidth: 150 }}
          onChange={setGroupBy}
          options={GROUP_OPTIONS}
        />
      </Space>

      {isError && (
        <Alert
          type="error"
          showIcon
          message="Не удалось загрузить отчёт"
          action={
            <Button size="small" onClick={() => void refetch()}>
              Повторить
            </Button>
          }
        />
      )}

      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Card loading={isLoading}>
            <Statistic title="Всего посещений" value={data?.totalVisits ?? 0} />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card loading={isLoading}>
            <Statistic
              title="Уникальных клиентов"
              value={data?.uniqueClients ?? 0}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Динамика посещений" loading={isLoading}>
        <Table<AttendanceDynamicsPoint>
          rowKey="period"
          size="small"
          pagination={false}
          dataSource={data?.dynamics ?? []}
          columns={dynamicsColumns}
        />
      </Card>

      <Card title="Посещения по клиентам" loading={isLoading}>
        <Table<AttendanceClientItem>
          rowKey="clientId"
          size="small"
          pagination={false}
          dataSource={data?.byClient ?? []}
          columns={clientColumns}
        />
      </Card>
    </Space>
  );
}
