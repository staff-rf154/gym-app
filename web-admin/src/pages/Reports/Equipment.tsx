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
import { useQuery } from '@tanstack/react-query';
import api from '../../api/client';
import { currentWeekRange } from '../../utils/format';
import { useReportLookups } from './useReportLookups';

type EquipmentType = 'MACHINE' | 'FREE_WEIGHT' | 'CARDIO' | 'OTHER';

interface EquipmentUsageTypeItem {
  type: EquipmentType;
  usageCount: number;
  uniqueClients: number;
  share: number;
}

interface EquipmentUsageEquipmentItem {
  equipmentId: string;
  equipmentName: string;
  type: EquipmentType;
  usageCount: number;
  uniqueClients: number;
  share: number;
}

interface EquipmentUsageClientItem {
  clientId: string;
  clientName: string;
  equipmentId: string;
  equipmentName: string;
  usageCount: number;
  lastUsedDate: string;
}

interface EquipmentUsageDynamicsPoint {
  period: string;
  usageCount: number;
}

interface EquipmentUsageItemRef {
  equipmentId: string;
  equipmentName: string;
  usageCount: number;
}

interface EquipmentUsageResponse {
  totalUsage: number;
  byType: EquipmentUsageTypeItem[];
  byEquipment: EquipmentUsageEquipmentItem[];
  byClient: EquipmentUsageClientItem[];
  dynamics: EquipmentUsageDynamicsPoint[];
  mostUsed: EquipmentUsageItemRef | null;
  leastUsed: EquipmentUsageItemRef | null;
}

const TYPE_LABELS: Record<EquipmentType, string> = {
  MACHINE: 'Тренажёр',
  FREE_WEIGHT: 'Свободные веса',
  CARDIO: 'Кардио',
  OTHER: 'Другое',
};

const GROUP_OPTIONS = [
  { value: 'type', label: 'По типу' },
  { value: 'equipment', label: 'По тренажёру' },
  { value: 'client', label: 'По клиенту' },
];

const PERIOD_OPTIONS = [
  { value: 'day', label: 'По дням' },
  { value: 'week', label: 'По неделям' },
  { value: 'month', label: 'По месяцам' },
];

const formatShare = (share: number) => `${Math.round(share * 1000) / 10}%`;

export default function EquipmentUsageReportPage() {
  const { gyms, trainers, clients } = useReportLookups();
  const [range, setRange] = useState<[Dayjs, Dayjs]>(currentWeekRange());
  const [gymId, setGymId] = useState<string | undefined>();
  const [trainerId, setTrainerId] = useState<string | undefined>();
  const [clientId, setClientId] = useState<string | undefined>();
  const [groupBy, setGroupBy] = useState<'type' | 'equipment' | 'client'>(
    'equipment',
  );
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');

  const params = useMemo(
    () => ({
      from: range[0].format('YYYY-MM-DD'),
      to: range[1].format('YYYY-MM-DD'),
      gym_id: gymId,
      trainer_id: trainerId,
      client_id: clientId,
      group_by: groupBy,
      period,
    }),
    [range, gymId, trainerId, clientId, groupBy, period],
  );

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['report-equipment-usage', params],
    queryFn: async () => {
      const response = await api.get<EquipmentUsageResponse>(
        '/reports/equipment-usage',
        { params },
      );
      return response.data;
    },
  });

  const typeColumns: ColumnsType<EquipmentUsageTypeItem> = [
    {
      title: 'Тип',
      dataIndex: 'type',
      key: 'type',
      render: (value: EquipmentType) => TYPE_LABELS[value] ?? value,
    },
    { title: 'Использований', dataIndex: 'usageCount', key: 'usageCount' },
    {
      title: 'Уникальные клиенты',
      dataIndex: 'uniqueClients',
      key: 'uniqueClients',
    },
    {
      title: 'Доля',
      dataIndex: 'share',
      key: 'share',
      render: (value: number) => formatShare(value),
    },
  ];

  const equipmentColumns: ColumnsType<EquipmentUsageEquipmentItem> = [
    { title: 'Тренажёр', dataIndex: 'equipmentName', key: 'equipmentName' },
    {
      title: 'Тип',
      dataIndex: 'type',
      key: 'type',
      render: (value: EquipmentType) => TYPE_LABELS[value] ?? value,
    },
    { title: 'Использований', dataIndex: 'usageCount', key: 'usageCount' },
    {
      title: 'Уникальные клиенты',
      dataIndex: 'uniqueClients',
      key: 'uniqueClients',
    },
    {
      title: 'Доля',
      dataIndex: 'share',
      key: 'share',
      render: (value: number) => formatShare(value),
    },
  ];

  const clientColumns: ColumnsType<EquipmentUsageClientItem> = [
    { title: 'Клиент', dataIndex: 'clientName', key: 'clientName' },
    { title: 'Тренажёр', dataIndex: 'equipmentName', key: 'equipmentName' },
    { title: 'Использований', dataIndex: 'usageCount', key: 'usageCount' },
    {
      title: 'Последнее использование',
      dataIndex: 'lastUsedDate',
      key: 'lastUsedDate',
      width: 200,
    },
  ];

  const dynamicsColumns: ColumnsType<EquipmentUsageDynamicsPoint> = [
    { title: 'Период', dataIndex: 'period', key: 'period' },
    { title: 'Использований', dataIndex: 'usageCount', key: 'usageCount' },
  ];

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Typography.Title level={4}>Использование тренажёров</Typography.Title>

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
          style={{ minWidth: 160 }}
          onChange={setGroupBy}
          options={GROUP_OPTIONS}
        />
        <Select
          value={period}
          style={{ minWidth: 150 }}
          onChange={setPeriod}
          options={PERIOD_OPTIONS}
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
        <Col xs={24} md={8}>
          <Card loading={isLoading}>
            <Statistic
              title="Всего использований"
              value={data?.totalUsage ?? 0}
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card loading={isLoading}>
            <Statistic
              title="Популярный тренажёр"
              value={data?.mostUsed?.equipmentName ?? '—'}
              suffix={
                data?.mostUsed ? `(${data.mostUsed.usageCount})` : undefined
              }
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card loading={isLoading}>
            <Statistic
              title="Реже всего"
              value={data?.leastUsed?.equipmentName ?? '—'}
              suffix={
                data?.leastUsed ? `(${data.leastUsed.usageCount})` : undefined
              }
            />
          </Card>
        </Col>
      </Row>

      <Card title="По типам тренажёров" loading={isLoading}>
        <Table<EquipmentUsageTypeItem>
          rowKey="type"
          size="small"
          pagination={false}
          dataSource={data?.byType ?? []}
          columns={typeColumns}
        />
      </Card>

      <Card title="По тренажёрам" loading={isLoading}>
        <Table<EquipmentUsageEquipmentItem>
          rowKey="equipmentId"
          size="small"
          pagination={false}
          dataSource={data?.byEquipment ?? []}
          columns={equipmentColumns}
        />
      </Card>

      <Card title="Использование по клиентам" loading={isLoading}>
        <Table<EquipmentUsageClientItem>
          rowKey={(item) => `${item.clientId}:${item.equipmentId}`}
          size="small"
          pagination={false}
          dataSource={data?.byClient ?? []}
          columns={clientColumns}
        />
      </Card>

      <Card title="Динамика использования" loading={isLoading}>
        <Table<EquipmentUsageDynamicsPoint>
          rowKey="period"
          size="small"
          pagination={false}
          dataSource={data?.dynamics ?? []}
          columns={dynamicsColumns}
        />
      </Card>
    </Space>
  );
}
