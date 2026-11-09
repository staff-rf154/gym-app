import { useState } from 'react';
import {
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Table,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../api/client';

interface Trainer {
  id: string;
  userId: string;
  phone: string;
  name: string;
}

interface TrainerFormValues {
  phone: string;
  name: string;
}

export default function TrainersPage() {
  const [form] = Form.useForm<TrainerFormValues>();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTrainer, setEditingTrainer] = useState<Trainer | null>(null);

  const { data: trainers = [], isLoading } = useQuery({
    queryKey: ['trainers'],
    queryFn: async () => {
      const { data } = await api.get<Trainer[]>('/admin/trainers');
      return data;
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['trainers'] });
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTrainer(null);
    form.resetFields();
  };

  const createMutation = useMutation({
    mutationFn: async (values: TrainerFormValues) => {
      const { data } = await api.post<Trainer & { initial_password?: string }>(
        '/admin/trainers',
        values,
      );
      return data;
    },
    onSuccess: (data) => {
      invalidate();
      closeModal();
      if (data.initial_password) {
        Modal.success({
          title: 'Тренер создан',
          content: `Пароль: ${data.initial_password}`,
        });
      }
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
        `/admin/trainers/${id}`,
        values,
      );
      return data;
    },
    onSuccess: () => {
      invalidate();
      closeModal();
    },
    onError: () => message.error('Не удалось сохранить тренера'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/trainers/${id}`),
    onSuccess: () => {
      invalidate();
      message.success('Тренер удалён');
    },
    onError: () => message.error('Не удалось удалить тренера'),
  });

  const openCreateModal = () => {
    setEditingTrainer(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const openEditModal = (trainer: Trainer) => {
    setEditingTrainer(trainer);
    form.setFieldsValue({
      phone: trainer.phone,
      name: trainer.name,
    });
    setIsModalOpen(true);
  };

  const handleFinish = (values: TrainerFormValues) => {
    if (editingTrainer) {
      updateMutation.mutate({ id: editingTrainer.id, values });
      return;
    }

    createMutation.mutate(values);
  };

  const columns: ColumnsType<Trainer> = [
    { title: 'ФИО', dataIndex: 'name', key: 'name' },
    { title: 'Телефон', dataIndex: 'phone', key: 'phone' },
    {
      title: '',
      key: 'actions',
      width: 220,
      render: (_, trainer) => (
        <Space>
          <Button type="link" onClick={() => openEditModal(trainer)}>
            Редактировать
          </Button>
          <Popconfirm
            title="Удалить тренера?"
            okText="Удалить"
            cancelText="Отмена"
            onConfirm={() => deleteMutation.mutate(trainer.id)}
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
        Создать тренера
      </Button>

      <Table<Trainer>
        rowKey="id"
        columns={columns}
        dataSource={trainers}
        loading={isLoading}
        pagination={false}
      />

      <Modal
        title={editingTrainer ? 'Редактировать тренера' : 'Новый тренер'}
        open={isModalOpen}
        onCancel={closeModal}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        forceRender
      >
        <Form<TrainerFormValues>
          form={form}
          layout="vertical"
          onFinish={handleFinish}
        >
          <Form.Item
            name="name"
            label="ФИО"
            rules={[{ required: true, message: 'Введите ФИО' }]}
          >
            <Input placeholder="Пётр Петров" />
          </Form.Item>

          <Form.Item
            name="phone"
            label="Телефон"
            rules={[{ required: true, message: 'Введите телефон' }]}
          >
            <Input placeholder="+79990000002" />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
