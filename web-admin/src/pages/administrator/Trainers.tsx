import { useState } from 'react';
import {
  Alert,
  Button,
  Empty,
  Form,
  Input,
  Modal,
  Space,
  Table,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../api/client';
import PhotoUpload from '../../components/PhotoUpload';
import type { PaginatedResponse } from '../../types/pagination';

interface Trainer {
  id: string;
  userId: string;
  phone: string;
  name: string;
  photoUrl: string | null;
  gyms: { id: string; gymId: string; gymName: string; isActive: boolean }[];
}

interface TrainerFormValues {
  phone: string;
  name: string;
  photoUrl?: string | null;
}

export default function AdministratorTrainersPage() {
  const [form] = Form.useForm<TrainerFormValues>();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Trainer | null>(null);

  const {
    data: trainers = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['administrator-trainers'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Trainer>>('/administrator/trainers', { params: { limit: 100 } });
      return data.items;
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['administrator-trainers'] });
  };

  const buildPayload = (values: TrainerFormValues) => ({
    phone: values.phone,
    name: values.name,
    photoUrl: values.photoUrl ?? null,
  });

  const createMutation = useMutation({
    mutationFn: async (values: TrainerFormValues) => {
      const { data } = await api.post<Trainer & { initial_password?: string }>(
        '/administrator/trainers',
        buildPayload(values),
      );
      return data;
    },
    onSuccess: (data) => {
      invalidate();
      setIsModalOpen(false);
      form.resetFields();
      message.success(
        data.initial_password
          ? `Тренер создан. Пароль: ${data.initial_password}`
          : 'Тренер создан',
      );
    },
    onError: () => message.error('Не удалось создать тренера'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string;
      values: TrainerFormValues;
    }) => {
      const { data } = await api.put<Trainer>(
        `/administrator/trainers/${id}`,
        buildPayload(values),
      );
      return data;
    },
    onSuccess: () => {
      invalidate();
      setIsModalOpen(false);
      setEditing(null);
      form.resetFields();
      message.success('Тренер обновлён');
    },
    onError: () => message.error('Не удалось обновить тренера'),
  });

  const openCreateModal = () => {
    setEditing(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const openEditModal = (trainer: Trainer) => {
    setEditing(trainer);
    form.setFieldsValue({
      phone: trainer.phone,
      name: trainer.name,
      photoUrl: trainer.photoUrl,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditing(null);
    form.resetFields();
  };

  const columns: ColumnsType<Trainer> = [
    {
      title: 'ФИО',
      dataIndex: 'name',
      key: 'name',
      render: (value: string, trainer) => (
        <Space>
          {trainer.photoUrl && (
            <img
              src={trainer.photoUrl}
              alt=""
              width={32}
              height={32}
              style={{ objectFit: 'cover', borderRadius: 4 }}
            />
          )}
          {value}
        </Space>
      ),
    },
    { title: 'Телефон', dataIndex: 'phone', key: 'phone' },
    {
      title: 'Зал',
      key: 'gym',
      render: (_, trainer) =>
        trainer.gyms.map((gym) => gym.gymName).join(', ') || '—',
    },
    {
      title: '',
      key: 'actions',
      width: 180,
      render: (_, trainer) => (
        <Button type="link" onClick={() => openEditModal(trainer)}>
          Редактировать
        </Button>
      ),
    },
  ];

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Button type="primary" onClick={openCreateModal}>
        Добавить тренера
      </Button>

      {isError && (
        <Alert
          type="error"
          showIcon
          message="Не удалось загрузить тренеров"
          action={
            <Button size="small" onClick={() => void refetch()}>
              Повторить
            </Button>
          }
        />
      )}

      {!isLoading && !isError && trainers.length === 0 ? (
        <Empty description="Тренеров пока нет" />
      ) : (
        <Table<Trainer>
          rowKey="id"
          columns={columns}
          dataSource={trainers}
          loading={isLoading}
          pagination={false}
        />
      )}

      <Modal
        title={editing ? 'Редактировать тренера' : 'Новый тренер'}
        open={isModalOpen}
        onCancel={closeModal}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        forceRender
      >
        <Form<TrainerFormValues>
          form={form}
          layout="vertical"
          onFinish={(values) =>
            editing
              ? updateMutation.mutate({ id: editing.id, values })
              : createMutation.mutate(values)
          }
        >
          <Form.Item
            name="name"
            label="ФИО"
            rules={[{ required: true, message: 'Введите ФИО' }]}
          >
            <Input placeholder="Петров Пётр" />
          </Form.Item>

          <Form.Item
            name="phone"
            label="Телефон"
            rules={[{ required: true, message: 'Введите телефон' }]}
          >
            <Input placeholder="+79990000002" />
          </Form.Item>

          <Form.Item name="photoUrl" label="Фото">
            <PhotoUpload alt="Фото тренера" />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
