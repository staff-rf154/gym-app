import { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Select,
  Space,
  Table,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/client';
import { currentWeekRange } from '../../utils/format';
import { useReportLookups } from './useReportLookups';

interface TrainerReportClientItem {
  clientId: string;
  clientName: string;
  visits: number;
}

interface TrainerReportItem {
  trainerId: string;
  trainerName: string;
  visits: number;
  uniqueClients: number;
  clients: TrainerReportClientItem[];
}

const clientColumns: ColumnsType<TrainerReportClientItem> = [
  { title: 'Клиент', dataIndex: 'clientName', key: 'clientName' },
  { title: 'Посещения', dataIndex: 'visits', key: 'visits', width: 140 },
];

export default function TrainersReportPage() {
  const { gyms, trainers } = useReportLookups();
  const [range, setRange] = useState<[Dayjs, Dayjs]>(currentWeekRange());
  const [gymId, setGymId] = useState<string | undefined>();
  const [trainerId, setTrainerId] = useState<string | undefined>();

  const params = useMemo(
    () => ({
      from: range[0].format('YYYY-MM-DD'),
      to: range[1].format('YYYY-MM-DD'),
      gym_id: gymId,
      trainer_id: trainerId,
    }),
    [range, gymId, trainerId],
  );

  const { data = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['report-trainers', params],
    queryFn: async () => {
      const response = await api.get<TrainerReportItem[]>(
        '/reports/trainers',
        { params },
      );
      return response.data;
    },
  });

  const columns: ColumnsType<TrainerReportItem> = [
    { title: 'Тренер', dataIndex: 'trainerName', key: 'trainerName' },
    { title: 'Посещения', dataIndex: 'visits', key: 'visits', width: 140 },
    {
      title: 'Уникальные клиенты',
      dataIndex: 'uniqueClients',
      key: 'uniqueClients',
      width: 190,
    },
  ];

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Typography.Title level={4}>Отчёт по тренерам</Typography.Title>

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

      <Card>
        <Table<TrainerReportItem>
          rowKey="trainerId"
          loading={isLoading}
          pagination={false}
          dataSource={data}
          columns={columns}
          expandable={{
            expandedRowRender: (record) => (
              <Table<TrainerReportClientItem>
                rowKey="clientId"
                size="small"
                pagination={false}
                dataSource={record.clients}
                columns={clientColumns}
              />
            ),
            rowExpandable: (record) => record.clients.length > 0,
          }}
        />
      </Card>
    </Space>
  );
}
