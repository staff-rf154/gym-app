import { useState } from 'react';
import {
  Alert,
  Button,
  DatePicker,
  Drawer,
  Empty,
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
import PhotoUpload from '../../components/PhotoUpload';
import { GENDER_OPTIONS, type Gender } from '../../constants/options';
import { formatDate } from '../../utils/format';
import type { PaginatedResponse } from '../../types/pagination';

interface ClientTrainerLink {
  id: string;
  trainerId: string;
  trainerName: string;
  gymId: string;
  gymName: string;
  isActive: boolean;
  assignedBy: string;
  assignedById: string | null;
  assignedAt: string;
}

interface Client {
  id: string;
  userId: string;
  phone: string;
  name: string;
  photoUrl: string | null;
  gender: Gender | null;
  height: number | null;
  birthdate: string | null;
  age: number | null;
  startWeight: number | null;
  startFatMass: number | null;
  goal: { id: string; name: string; description: string | null } | null;
  goalText: string | null;
  notes: string | null;
  gyms: { id: string; gymId: string; gymName: string; isActive: boolean }[];
  active_trainers: ClientTrainerLink[];
}

interface Trainer {
  id: string;
  name: string;
  phone: string;
}

interface GoalOption {
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
  goalId?: string | null;
  notes?: string | null;
  photoUrl?: string | null;
}

export default function ReceptionClientsPage() {
  const navigate = useNavigate();
  const [form] = Form.useForm<ClientFormValues>();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [trainersClient, setTrainersClient] = useState<Client | null>(null);
  const [trainerId, setTrainerId] = useState<string | undefined>();

  const {
    data: clients = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['reception-clients'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Client>>('/reception/clients', { params: { limit: 100 } });
      return data.items;
    },
  });

  const { data: trainers = [] } = useQuery({
    queryKey: ['reception-trainers'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Trainer>>('/reception/trainers', { params: { limit: 100 } });
      return data.items;
    },
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['reception-goals'],
    queryFn: async () => {
      const { data } = await api.get<GoalOption[]>('/goals');
      return data;
    },
  });

  const goalOptions = goals.map((goal) => ({
    label: goal.name,
    value: goal.id,
  }));

  const {
    data: links = [],
    isLoading: linksLoading,
    refetch: refetchLinks,
  } = useQuery({
    queryKey: ['reception-client-trainers', trainersClient?.id],
    enabled: Boolean(trainersClient),
    queryFn: async () => {
      const { data } = await api.get<ClientTrainerLink[]>(
        `/reception/clients/${trainersClient?.id}/trainers`,
      );
      return data;
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['reception-clients'] });
  };

  const buildPayload = (values: ClientFormValues) => ({
    phone: values.phone,
    name: values.name,
    gender: values.gender ?? null,
    height: values.height ?? null,
    birthdate: values.birthdate
      ? values.birthdate.format('YYYY-MM-DD')
      : null,
    startWeight: values.startWeight ?? null,
    startFatMass: values.startFatMass ?? null,
    goalId: values.goalId ?? null,
    notes: values.notes?.trim() ? values.notes : null,
    photoUrl: values.photoUrl ?? null,
  });

  const createMutation = useMutation({
    mutationFn: async (values: ClientFormValues) => {
      const { data } = await api.post<Client & { initial_password?: string }>(
        '/reception/clients',
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
          ? `Клиент создан. Пароль: ${data.initial_password}`
          : 'Клиент создан',
      );
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
      const { data } = await api.put<Client>(
        `/reception/clients/${id}`,
        buildPayload(values),
      );
      return data;
    },
    onSuccess: () => {
      invalidate();
      setIsModalOpen(false);
      setEditing(null);
      form.resetFields();
      message.success('Клиент обновлён');
    },
    onError: () => message.error('Не удалось обновить клиента'),
  });

  const linkMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/reception/clients/${trainersClient?.id}/trainers`, {
        trainer_id: trainerId,
      });
    },
    onSuccess: () => {
      setTrainerId(undefined);
      queryClient.invalidateQueries({
        queryKey: ['reception-client-trainers', trainersClient?.id],
      });
      invalidate();
      message.success('Тренер назначен');
    },
    onError: () => message.error('Не удалось назначить тренера'),
  });

  const unlinkMutation = useMutation({
    mutationFn: async (linkId: string) => {
      await api.delete(
        `/reception/clients/${trainersClient?.id}/trainers/${linkId}`,
      );
    },
    onSuccess: () => {
      void refetchLinks();
      invalidate();
      message.success('Тренер отвязан');
    },
    onError: () => message.error('Не удалось отвязать тренера'),
  });

  const openCreateModal = () => {
    setEditing(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const openEditModal = (client: Client) => {
    setEditing(client);
    form.setFieldsValue({
      phone: client.phone,
      name: client.name,
      gender: client.gender,
      height: client.height,
      birthdate: client.birthdate ? dayjs(client.birthdate) : null,
      startWeight: client.startWeight,
      startFatMass: client.startFatMass,
      goalId: client.goal?.id ?? null,
      notes: client.notes,
      photoUrl: client.photoUrl,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditing(null);
    form.resetFields();
  };

  const columns: ColumnsType<Client> = [
    {
      title: 'ФИО',
      dataIndex: 'name',
      key: 'name',
      render: (value: string, client) => (
        <Space>
          {client.photoUrl && (
            <img
              src={client.photoUrl}
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
      title: 'Цель',
      key: 'goal',
      render: (_, client) => client.goal?.name || client.goalText || '—',
    },
    {
      title: 'Зал',
      key: 'gym',
      render: (_, client) => client.gyms.map((gym) => gym.gymName).join(', ') || '—',
    },
    {
      title: 'Тренеры',
      key: 'trainers',
      render: (_, client) =>
        client.active_trainers.length === 0 ? (
          '—'
        ) : (
          <Space size={[0, 4]} wrap>
            {client.active_trainers.map((link) => (
              <Tag key={link.id}>{link.trainerName}</Tag>
            ))}
          </Space>
        ),
    },
    {
      title: 'Дата рождения',
      dataIndex: 'birthdate',
      key: 'birthdate',
      render: (value: string | null) => (value ? formatDate(value) : '—'),
    },
    {
      title: '',
      key: 'actions',
      width: 300,
      render: (_, client) => (
        <Space>
          <Button
            type="link"
            onClick={() => {
              setTrainersClient(client);
              setTrainerId(undefined);
            }}
          >
            Тренеры
          </Button>
          <Button
            type="link"
            onClick={() =>
              navigate(`/protected/reception/clients/${client.id}/weight`, {
                state: { name: client.name },
              })
            }
          >
            Вес
          </Button>
          <Button type="link" onClick={() => openEditModal(client)}>
            Редактировать
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Button type="primary" onClick={openCreateModal}>
        Добавить клиента
      </Button>

      {isError && (
        <Alert
          type="error"
          showIcon
          message="Не удалось загрузить клиентов"
          action={
            <Button size="small" onClick={() => void refetch()}>
              Повторить
            </Button>
          }
        />
      )}

      {!isLoading && !isError && clients.length === 0 ? (
        <Empty description="Клиентов пока нет" />
      ) : (
        <Table<Client>
          rowKey="id"
          columns={columns}
          dataSource={clients}
          loading={isLoading}
          pagination={false}
        />
      )}

      <Modal
        title={editing ? 'Редактировать клиента' : 'Новый клиент'}
        open={isModalOpen}
        onCancel={closeModal}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        forceRender
        width={640}
      >
        <Form<ClientFormValues>
          form={form}
          layout="vertical"
          onFinish={(values) =>
            editing
              ? updateMutation.mutate({ id: editing.id, values })
              : createMutation.mutate(values)
          }
        >
          <Space size="middle" style={{ display: 'flex' }} align="start">
            <Form.Item
              name="name"
              label="ФИО"
              rules={[{ required: true, message: 'Введите ФИО' }]}
              style={{ flex: 1 }}
            >
              <Input placeholder="Иванов Иван" />
            </Form.Item>
            <Form.Item
              name="phone"
              label="Телефон"
              rules={[{ required: true, message: 'Введите телефон' }]}
              style={{ flex: 1 }}
            >
              <Input placeholder="+79990000001" />
            </Form.Item>
          </Space>

          <Space size="middle" style={{ display: 'flex' }} align="start">
            <Form.Item name="gender" label="Пол" style={{ flex: 1 }}>
              <Select allowClear placeholder="Не указан" options={GENDER_OPTIONS} />
            </Form.Item>
            <Form.Item name="birthdate" label="Дата рождения" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
            </Form.Item>
            <Form.Item name="height" label="Рост, см" style={{ flex: 1 }}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </Space>

          <Space size="middle" style={{ display: 'flex' }} align="start">
            <Form.Item name="startWeight" label="Начальный вес" style={{ flex: 1 }}>
              <InputNumber min={0} step={0.1} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="startFatMass" label="Начальный жир, %" style={{ flex: 1 }}>
              <InputNumber min={0} max={100} step={0.1} style={{ width: '100%' }} />
            </Form.Item>
          </Space>

          <Form.Item name="goalId" label="Цель">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Выберите цель"
              options={goalOptions}
            />
          </Form.Item>

          <Form.Item name="notes" label="Заметки">
            <Input.TextArea rows={2} />
          </Form.Item>

          <Form.Item name="photoUrl" label="Фото">
            <PhotoUpload alt="Фото клиента" />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title={trainersClient ? `Тренеры: ${trainersClient.name}` : 'Тренеры'}
        open={Boolean(trainersClient)}
        onClose={() => setTrainersClient(null)}
        width={520}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Space.Compact style={{ width: '100%' }}>
            <Select
              style={{ flex: 1 }}
              placeholder="Выберите тренера"
              value={trainerId}
              onChange={setTrainerId}
              options={trainers.map((trainer) => ({
                label: `${trainer.name} (${trainer.phone})`,
                value: trainer.id,
              }))}
            />
            <Button
              type="primary"
              disabled={!trainerId}
              loading={linkMutation.isPending}
              onClick={() => linkMutation.mutate()}
            >
              Назначить
            </Button>
          </Space.Compact>

          <Table<ClientTrainerLink>
            rowKey="id"
            loading={linksLoading}
            dataSource={links.filter((link) => link.isActive)}
            pagination={false}
            columns={[
              { title: 'Тренер', dataIndex: 'trainerName', key: 'trainerName' },
              {
                title: 'Назначил',
                dataIndex: 'assignedBy',
                key: 'assignedBy',
                render: (value: string) =>
                  value === 'RECEPTION' ? 'Ресепшен' : value,
              },
              {
                title: '',
                key: 'actions',
                width: 100,
                render: (_, link) => (
                  <Popconfirm
                    title="Отвязать тренера?"
                    okText="Отвязать"
                    cancelText="Отмена"
                    onConfirm={() => unlinkMutation.mutate(link.id)}
                  >
                    <Button type="link" danger>
                      Отвязать
                    </Button>
                  </Popconfirm>
                ),
              },
            ]}
          />
        </Space>
      </Drawer>
    </Space>
  );
}
