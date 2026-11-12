import { useState } from 'react';
import {
  Alert,
  Button,
  Empty,
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
import GymsDrawer from '../../components/GymsDrawer';
import PhotoUpload from '../../components/PhotoUpload';
import { useCrudModal } from '../../hooks/useCrudModal';
import { useTableSearch } from '../../hooks/useTableSearch';

interface Trainer {
  id: string;
  userId: string;
  phone: string;
  name: string;
  photoUrl: string | null;
}

interface TrainerFormValues {
  phone: string;
  name: string;
  photoUrl?: string | null;
}

export default function TrainersPage() {
  const [form] = Form.useForm<TrainerFormValues>();
  const queryClient = useQueryClient();
  const {
    open: isModalOpen,
    editing: editingTrainer,
    openCreate,
    openEdit,
    close,
  } = useCrudModal<Trainer>();
  const [gymsTrainer, setGymsTrainer] = useState<Trainer | null>(null);

  const {
    data: trainers = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['trainers'],
    queryFn: async () => {
      const { data } = await api.get<Trainer[]>('/admin/trainers');
      return data;
    },
  });

  const { searchValue, setSearchValue, filteredRows } =
    useTableSearch(trainers);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['trainers'] });
  };

  const closeModal = () => {
    close();
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
    form.resetFields();
    openCreate();
  };

  const openEditModal = (trainer: Trainer) => {
    form.setFieldsValue({
      phone: trainer.phone,
      name: trainer.name,
      photoUrl: trainer.photoUrl,
    });
    openEdit(trainer);
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
      title: 'Фото',
      dataIndex: 'photoUrl',
      key: 'photoUrl',
      width: 88,
      render: (value: string | null) =>
        value ? (
          <img
            src={value}
            alt=""
            width={48}
            height={48}
            style={{ objectFit: 'cover', borderRadius: 4 }}
          />
        ) : (
          '—'
        ),
    },
    {
      title: '',
      key: 'actions',
      width: 320,
      render: (_, trainer) => (
        <Space>
          <Button type="link" onClick={() => setGymsTrainer(trainer)}>
            Залы
          </Button>
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
      <Space wrap>
        <Input.Search
          allowClear
          placeholder="Поиск по всем полям (от 3 символов)"
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          style={{ width: 280 }}
        />

        <Button type="primary" onClick={openCreateModal}>
          Создать тренера
        </Button>
      </Space>

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
          dataSource={filteredRows}
          loading={isLoading}
          pagination={false}
        />
      )}

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

          <Form.Item name="photoUrl" label="Фото">
            <PhotoUpload alt="Фото тренера" />
          </Form.Item>
        </Form>
      </Modal>

      <GymsDrawer
        open={Boolean(gymsTrainer)}
        onClose={() => setGymsTrainer(null)}
        kind="trainer"
        entityId={gymsTrainer?.id ?? ''}
        entityName={gymsTrainer?.name ?? ''}
        invalidateKey={['trainers']}
      />
    </Space>
  );
}
