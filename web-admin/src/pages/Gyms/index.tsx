import { useState } from 'react';
import axios from 'axios';
import {
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Switch,
  Table,
  Tag,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../api/client';

interface Gym {
  id: string;
  name: string;
  address: string;
  isActive: boolean;
}

interface GymFormValues {
  name: string;
  address: string;
  isActive: boolean;
}

export default function GymsPage() {
  const [form] = Form.useForm<GymFormValues>();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGym, setEditingGym] = useState<Gym | null>(null);

  const { data: gyms = [], isLoading } = useQuery({
    queryKey: ['gyms'],
    queryFn: async () => {
      const { data } = await api.get<Gym[]>('/admin/gyms');
      return data;
    },
  });

  const handleError = (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 409) {
      message.error('Конфликт: зал с такими данными уже существует');
      return;
    }

    message.error('Не удалось сохранить зал');
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['gyms'] });
    setIsModalOpen(false);
    setEditingGym(null);
    form.resetFields();
  };

  const createMutation = useMutation({
    mutationFn: async (values: GymFormValues) => {
      const { data } = await api.post<Gym>('/admin/gyms', values);
      return data;
    },
    onSuccess: handleSuccess,
    onError: handleError,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: GymFormValues }) => {
      const { data } = await api.put<Gym>(`/admin/gyms/${id}`, values);
      return data;
    },
    onSuccess: handleSuccess,
    onError: handleError,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/gyms/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gyms'] });
      message.success('Зал удалён');
    },
    onError: (error: unknown) => {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        message.error('Нельзя удалить зал: в нём есть тренажёры');
        return;
      }
      message.error('Не удалось удалить зал');
    },
  });

  const openCreateModal = () => {
    setEditingGym(null);
    form.resetFields();
    form.setFieldsValue({ isActive: true });
    setIsModalOpen(true);
  };

  const openEditModal = (gym: Gym) => {
    setEditingGym(gym);
    form.setFieldsValue({
      name: gym.name,
      address: gym.address,
      isActive: gym.isActive,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingGym(null);
    form.resetFields();
  };

  const handleFinish = (values: GymFormValues) => {
    if (editingGym) {
      updateMutation.mutate({ id: editingGym.id, values });
      return;
    }

    createMutation.mutate(values);
  };

  const columns: ColumnsType<Gym> = [
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Адрес',
      dataIndex: 'address',
      key: 'address',
    },
    {
      title: 'Активен',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'Да' : 'Нет'}
        </Tag>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 220,
      render: (_, gym) => (
        <Space>
          <Button type="link" onClick={() => openEditModal(gym)}>
            Редактировать
          </Button>
          <Popconfirm
            title="Удалить зал?"
            okText="Удалить"
            cancelText="Отмена"
            onConfirm={() => deleteMutation.mutate(gym.id)}
          >
            <Button type="link" danger>
              Удалить
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Button type="primary" onClick={openCreateModal}>
        Добавить зал
      </Button>

      <Table<Gym>
        rowKey="id"
        columns={columns}
        dataSource={gyms}
        loading={isLoading}
        pagination={false}
      />

      <Modal
        title={editingGym ? 'Редактировать зал' : 'Новый зал'}
        open={isModalOpen}
        onCancel={closeModal}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        forceRender
      >
        <Form<GymFormValues>
          form={form}
          layout="vertical"
          onFinish={handleFinish}
        >
          <Form.Item
            name="name"
            label="Название"
            rules={[{ required: true, message: 'Введите название' }]}
          >
            <Input placeholder="Зал на Ленина" />
          </Form.Item>

          <Form.Item
            name="address"
            label="Адрес"
            rules={[{ required: true, message: 'Введите адрес' }]}
          >
            <Input placeholder="ул. Ленина, 10" />
          </Form.Item>

          <Form.Item name="isActive" label="Активен" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
