import { useState } from 'react';
import {
  Button,
  DatePicker,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';

type Gender = 'MALE' | 'FEMALE' | 'OTHER';

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'MALE', label: 'Мужской' },
  { value: 'FEMALE', label: 'Женский' },
  { value: 'OTHER', label: 'Другой' },
];

const GENDER_LABELS: Record<Gender, string> = {
  MALE: 'Мужской',
  FEMALE: 'Женский',
  OTHER: 'Другой',
};

interface TrainerLink {
  id: string;
  clientId?: string;
  trainerId: string;
  trainerName: string;
  gymId: string;
  gymName: string;
  isActive: boolean;
}

interface Client {
  id: string;
  userId: string;
  phone: string;
  name: string;
  gender: Gender | null;
  height: number | null;
  birthdate: string | null;
  age: number | null;
  startWeight: number | null;
  startFatMass: number | null;
  currentWeight: number | null;
  currentFatMass: number | null;
  goal: string | null;
  notes: string | null;
  active_trainers: TrainerLink[];
}

interface TrainerOption {
  id: string;
  name: string;
}

interface GymOption {
  id: string;
  name: string;
}

interface ClientFormValues {
  phone: string;
  name: string;
  gender?: Gender | null;
  height?: number | null;
  birthdate?: Dayjs | null;
  startWeight?: number | null;
  startFatMass?: number | null;
  goal?: string;
  notes?: string;
}

interface AssignFormValues {
  trainer_id: string;
  gym_id: string;
}

const formatDate = (value: string | null) =>
  value ? dayjs(value).format('DD.MM.YYYY') : '—';

export default function ClientsPage() {
  const [form] = Form.useForm<ClientFormValues>();
  const [assignForm] = Form.useForm<AssignFormValues>();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [drawerClient, setDrawerClient] = useState<Client | null>(null);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data } = await api.get<Client[]>('/admin/clients');
      return data;
    },
  });

  const { data: trainers = [] } = useQuery({
    queryKey: ['trainers'],
    queryFn: async () => {
      const { data } = await api.get<TrainerOption[]>('/admin/trainers');
      return data;
    },
  });

  const { data: gyms = [] } = useQuery({
    queryKey: ['gyms'],
    queryFn: async () => {
      const { data } = await api.get<GymOption[]>('/admin/gyms');
      return data;
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['clients'] });
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingClient(null);
    form.resetFields();
  };

  const createMutation = useMutation({
    mutationFn: async (values: ClientFormValues) => {
      const payload = {
        ...values,
        birthdate: values.birthdate
          ? values.birthdate.format('YYYY-MM-DD')
          : undefined,
      };
      const { data } = await api.post<Client & { initial_password?: string }>(
        '/admin/clients',
        payload,
      );
      return data;
    },
    onSuccess: (data) => {
      invalidate();
      closeModal();
      if (data.initial_password) {
        Modal.success({
          title: 'Клиент создан',
          content: `Пароль: ${data.initial_password}`,
        });
      }
    },
    onError: () => message.error('Не удалось создать клиента'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string;
      values: ClientFormValues;
    }) => {
      const payload = {
        ...values,
        birthdate: values.birthdate
          ? values.birthdate.format('YYYY-MM-DD')
          : undefined,
      };
      const { data } = await api.put<Client>(
        `/admin/clients/${id}`,
        payload,
      );
      return data;
    },
    onSuccess: () => {
      invalidate();
      closeModal();
    },
    onError: () => message.error('Не удалось сохранить клиента'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/clients/${id}`),
    onSuccess: () => {
      invalidate();
      message.success('Клиент удалён');
    },
    onError: () => message.error('Не удалось удалить клиента'),
  });

  const assignMutation = useMutation({
    mutationFn: async (values: AssignFormValues) => {
      if (!drawerClient) {
        return;
      }
      const { data } = await api.post(
        `/admin/clients/${drawerClient.id}/trainers`,
        values,
      );
      return data;
    },
    onSuccess: () => {
      invalidate();
      assignForm.resetFields();
    },
    onError: () => message.error('Не удалось назначить тренера'),
  });

  const unlinkMutation = useMutation({
    mutationFn: ({ clientId, linkId }: { clientId: string; linkId: string }) =>
      api.delete(`/admin/clients/${clientId}/trainers/${linkId}`),
    onSuccess: () => {
      invalidate();
    },
    onError: () => message.error('Не удалось отвязать тренера'),
  });

  const openCreateModal = () => {
    setEditingClient(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const openEditModal = (client: Client) => {
    setEditingClient(client);
    form.setFieldsValue({
      phone: client.phone,
      name: client.name,
      gender: client.gender ?? undefined,
      height: client.height ?? undefined,
      birthdate: client.birthdate ? dayjs(client.birthdate) : null,
      startWeight: client.startWeight ?? undefined,
      startFatMass: client.startFatMass ?? undefined,
      goal: client.goal ?? undefined,
      notes: client.notes ?? undefined,
    });
    setIsModalOpen(true);
  };

  const handleFinish = (values: ClientFormValues) => {
    if (editingClient) {
      updateMutation.mutate({ id: editingClient.id, values });
      return;
    }

    createMutation.mutate(values);
  };

  const openDrawer = (client: Client) => {
    setDrawerClient(client);
    assignForm.resetFields();
  };

  const activeDrawerClient = drawerClient
    ? clients.find((client) => client.id === drawerClient.id) ?? drawerClient
    : null;

  const columns: ColumnsType<Client> = [
    { title: 'ФИО', dataIndex: 'name', key: 'name' },
    { title: 'Телефон', dataIndex: 'phone', key: 'phone' },
    {
      title: 'Пол',
      dataIndex: 'gender',
      key: 'gender',
      render: (value: Gender | null) =>
        value ? GENDER_LABELS[value] : '—',
    },
    {
      title: 'Дата рождения',
      dataIndex: 'birthdate',
      key: 'birthdate',
      render: (value: string | null) => formatDate(value),
    },
    {
      title: 'Возраст',
      dataIndex: 'age',
      key: 'age',
      render: (value: number | null) => (value ?? '—'),
    },
    {
      title: 'Вес, кг',
      dataIndex: 'currentWeight',
      key: 'currentWeight',
      render: (value: number | null) => (value ?? '—'),
    },
    {
      title: 'Жир, %',
      dataIndex: 'currentFatMass',
      key: 'currentFatMass',
      render: (value: number | null) => (value ?? '—'),
    },
    {
      title: 'Цель',
      dataIndex: 'goal',
      key: 'goal',
      render: (value: string | null) => value || '—',
    },
    {
      title: 'Тренеры',
      key: 'trainers',
      render: (_, client) => (
        <Space size={[0, 4]} wrap>
          {client.active_trainers.length === 0 ? (
            <Tag>Нет</Tag>
          ) : (
            client.active_trainers.map((link) => (
              <Tag key={link.id} color="blue">
                {link.trainerName}
              </Tag>
            ))
          )}
        </Space>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 320,
      render: (_, client) => (
        <Space>
          <Button type="link" onClick={() => openDrawer(client)}>
            Тренеры
          </Button>
          <Button
            type="link"
            onClick={() =>
              navigate(`/protected/clients/${client.id}/weight`, {
                state: { name: client.name },
              })
            }
          >
            Вес
          </Button>
          <Button type="link" onClick={() => openEditModal(client)}>
            Редактировать
          </Button>
          <Popconfirm
            title="Удалить клиента?"
            okText="Удалить"
            cancelText="Отмена"
            onConfirm={() => deleteMutation.mutate(client.id)}
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
        Создать клиента
      </Button>

      <Table<Client>
        rowKey="id"
        columns={columns}
        dataSource={clients}
        loading={isLoading}
        pagination={false}
      />

      <Modal
        title={editingClient ? 'Редактировать клиента' : 'Новый клиент'}
        open={isModalOpen}
        onCancel={closeModal}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        forceRender
      >
        <Form<ClientFormValues>
          form={form}
          layout="vertical"
          onFinish={handleFinish}
        >
          <Form.Item
            name="name"
            label="ФИО"
            rules={[{ required: true, message: 'Введите ФИО' }]}
          >
            <Input placeholder="Иван Иванов" />
          </Form.Item>

          <Form.Item
            name="phone"
            label="Телефон"
            rules={[{ required: true, message: 'Введите телефон' }]}
          >
            <Input placeholder="+79990000001" />
          </Form.Item>

          <Form.Item name="gender" label="Пол">
            <Select
              allowClear
              placeholder="Выберите пол"
              options={GENDER_OPTIONS}
            />
          </Form.Item>

          <Form.Item name="height" label="Рост, см">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="birthdate" label="Дата рождения">
            <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
          </Form.Item>

          <Form.Item name="startWeight" label="Начальный вес, кг">
            <InputNumber
              min={0}
              style={{ width: '100%' }}
              disabled={Boolean(editingClient)}
            />
          </Form.Item>

          <Form.Item name="startFatMass" label="Начальный процент жира">
            <InputNumber
              min={0}
              max={100}
              style={{ width: '100%' }}
              disabled={Boolean(editingClient)}
            />
          </Form.Item>

          <Form.Item name="goal" label="Цель">
            <Input placeholder="Похудение" />
          </Form.Item>

          <Form.Item name="notes" label="Заметки">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title={activeDrawerClient ? `Тренеры: ${activeDrawerClient.name}` : 'Тренеры'}
        open={Boolean(drawerClient)}
        onClose={() => setDrawerClient(null)}
        width={520}
      >
        {activeDrawerClient && (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {activeDrawerClient.active_trainers.length === 0 ? (
              <Tag>Связей нет</Tag>
            ) : (
              <Table<TrainerLink>
                rowKey="id"
                size="small"
                pagination={false}
                dataSource={activeDrawerClient.active_trainers}
                columns={[
                  {
                    title: 'Тренер',
                    key: 'trainer',
                    render: (_, link) => link.trainerName ?? link.trainerId,
                  },
                  {
                    title: 'Зал',
                    key: 'gym',
                    render: (_, link) => link.gymName ?? link.gymId,
                  },
                  {
                    title: '',
                    key: 'actions',
                    width: 110,
                    render: (_, link) => (
                      <Popconfirm
                        title="Отвязать тренера?"
                        okText="Отвязать"
                        cancelText="Отмена"
                        onConfirm={() =>
                          unlinkMutation.mutate({
                            clientId: activeDrawerClient.id,
                            linkId: link.id,
                          })
                        }
                      >
                        <Button type="link" danger>
                          Отвязать
                        </Button>
                      </Popconfirm>
                    ),
                  },
                ]}
              />
            )}

            <Form<AssignFormValues>
              form={assignForm}
              layout="vertical"
              onFinish={(values) => assignMutation.mutate(values)}
            >
              <Form.Item
                name="trainer_id"
                label="Тренер"
                rules={[{ required: true, message: 'Выберите тренера' }]}
              >
                <Select
                  placeholder="Выберите тренера"
                  options={trainers.map((trainer) => ({
                    label: trainer.name,
                    value: trainer.id,
                  }))}
                />
              </Form.Item>

              <Form.Item
                name="gym_id"
                label="Зал"
                rules={[{ required: true, message: 'Выберите зал' }]}
              >
                <Select
                  placeholder="Выберите зал"
                  options={gyms.map((gym) => ({
                    label: gym.name,
                    value: gym.id,
                  }))}
                />
              </Form.Item>

              <Button
                type="primary"
                htmlType="submit"
                loading={assignMutation.isPending}
              >
                Назначить
              </Button>
            </Form>
          </Space>
        )}
      </Drawer>
    </Space>
  );
}
