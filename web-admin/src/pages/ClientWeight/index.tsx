import {
  Alert,
  Button,
  DatePicker,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Space,
  Table,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import api from '../../api/client';
import { useCrudModal } from '../../hooks/useCrudModal';

interface WeightMeasurement {
  id: string;
  clientId: string;
  measuredBy: string;
  measuredAt: string;
  weight: number;
  fatMass: number | null;
  comment: string | null;
  createdAt: string;
}

interface MeasurementFormValues {
  weight: number;
  fatMass?: number | null;
  measuredAt: Dayjs;
  comment?: string;
}

const formatDateTime = (value: string) =>
  dayjs(value).format('DD.MM.YYYY HH:mm');

export default function ClientWeightPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [form] = Form.useForm<MeasurementFormValues>();
  const queryClient = useQueryClient();
  const { open: isModalOpen, openCreate, close } = useCrudModal<WeightMeasurement>();

  const clientName = (location.state as { name?: string } | null)?.name;

  const {
    data: measurements = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['weight-measurements', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<WeightMeasurement[]>(
        `/admin/clients/${id}/weight-measurements`,
      );
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: MeasurementFormValues) => {
      const { data } = await api.post<WeightMeasurement>(
        `/admin/clients/${id}/weight-measurements`,
        {
          weight: values.weight,
          fatMass: values.fatMass ?? null,
          measuredAt: values.measuredAt.toISOString(),
          comment: values.comment?.trim() ? values.comment : null,
        },
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['weight-measurements', id],
      });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      close();
      form.resetFields();
      message.success('Замер добавлен');
    },
    onError: () => message.error('Не удалось добавить замер'),
  });

  const openCreateModal = () => {
    form.resetFields();
    form.setFieldsValue({ measuredAt: dayjs() });
    openCreate();
  };

  const closeModal = () => {
    close();
    form.resetFields();
  };

  const columns: ColumnsType<WeightMeasurement> = [
    {
      title: 'Дата замера',
      dataIndex: 'measuredAt',
      key: 'measuredAt',
      render: (value: string) => formatDateTime(value),
    },
    {
      title: 'Вес, кг',
      dataIndex: 'weight',
      key: 'weight',
    },
    {
      title: 'Жир, %',
      dataIndex: 'fatMass',
      key: 'fatMass',
      render: (value: number | null) => (value ?? '—'),
    },
    {
      title: 'Комментарий',
      dataIndex: 'comment',
      key: 'comment',
      render: (value: string | null) => value || '—',
    },
  ];

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Space>
        <Button onClick={() => navigate('/protected/clients')}>Назад</Button>
        <Typography.Title level={4} style={{ margin: 0 }}>
          {clientName ? `Замеры веса: ${clientName}` : 'Замеры веса'}
        </Typography.Title>
      </Space>

      <Button type="primary" onClick={openCreateModal}>
        Добавить замер
      </Button>

      {isError && (
        <Alert
          type="error"
          showIcon
          message="Не удалось загрузить замеры"
          action={
            <Button size="small" onClick={() => void refetch()}>
              Повторить
            </Button>
          }
        />
      )}

      {!isLoading && !isError && measurements.length === 0 ? (
        <Empty description="Замеров пока нет" />
      ) : (
        <Table<WeightMeasurement>
          rowKey="id"
          columns={columns}
          dataSource={measurements}
          loading={isLoading}
          pagination={false}
        />
      )}

      <Modal
        title="Новый замер"
        open={isModalOpen}
        onCancel={closeModal}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending}
        forceRender
      >
        <Form<MeasurementFormValues>
          form={form}
          layout="vertical"
          onFinish={(values) => createMutation.mutate(values)}
        >
          <Form.Item
            name="weight"
            label="Вес, кг"
            rules={[{ required: true, message: 'Введите вес' }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="fatMass" label="Процент жира">
            <InputNumber min={0} max={100} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="measuredAt"
            label="Дата и время замера"
            rules={[{ required: true, message: 'Выберите дату и время' }]}
          >
            <DatePicker showTime style={{ width: '100%' }} format="DD.MM.YYYY HH:mm" />
          </Form.Item>

          <Form.Item name="comment" label="Комментарий">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
