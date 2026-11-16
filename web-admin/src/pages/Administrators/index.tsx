import {
  Alert,
  Button,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../api/client';
import { useCrudModal } from '../../hooks/useCrudModal';
import { useTableSearch } from '../../hooks/useTableSearch';
import { formatDate } from '../../utils/format';

interface Administrator {
  id: string;
  userId: string;
  phone: string;
  name: string;
  gymId: string;
  gymName: string;
  createdAt: string;
}

interface AdministratorFormValues {
  phone: string;
  name: string;
  gym_id: string;
  password?: string;
}

interface Gym {
  id: string;
  name: string;
}

export default function AdministratorsPage() {
  const [form] = Form.useForm<AdministratorFormValues>();
  const queryClient = useQueryClient();
  const {
    open: isModalOpen,
    editing,
    openCreate,
    openEdit,
    close,
  } = useCrudModal<Administrator>();

  const {
    data: administrators = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['administrators'],
    queryFn: async () => {
      const { data } = await api.get<Administrator[]>('/admin/administrators');
      return data;
    },
  });

  const { searchValue, setSearchValue, filteredRows } =
    useTableSearch(administrators);

  const { data: gyms = [] } = useQuery({
    queryKey: ['gyms'],
    queryFn: async () => {
      const { data } = await api.get<Gym[]>('/admin/gyms');
      return data;
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['administrators'] });
  };

  const createMutation = useMutation({
    mutationFn: async (values: AdministratorFormValues) => {
      const { data } = await api.post<Administrator & { initial_password?: string }>(
        '/admin/administrators',
        values,
      );
      return data;
    },
    onSuccess: (data) => {
      invalidate();
      close();
      form.resetFields();
      message.success(
        data.initial_password
          ? `Администратор создан. Пароль: ${data.initial_password}`
          : 'Администратор создан',
      );
    },
    onError: () => message.error('Не удалось создать администратора'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string;
      values: AdministratorFormValues;
    }) => {
      const { data } = await api.put<Administrator>(
        `/admin/administrators/${id}`,
        values.password ? values : { ...values, password: undefined },
      );
      return data;
    },
    onSuccess: () => {
      invalidate();
      close();
      form.resetFields();
      message.success('Администратор обновлён');
    },
    onError: () => message.error('Не удалось обновить администратора'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/administrators/${id}`);
    },
    onSuccess: () => {
      invalidate();
      message.success('Администратор удалён');
    },
    onError: () => message.error('Не удалось удалить администратора'),
  });

  const openCreateModal = () => {
    form.resetFields();
    openCreate();
  };

  const openEditModal = (item: Administrator) => {
    form.setFieldsValue({
      phone: item.phone,
      name: item.name,
      gym_id: item.gymId,
      password: undefined,
    });
    openEdit(item);
  };

  const closeModal = () => {
    close();
    form.resetFields();
  };

  const columns: ColumnsType<Administrator> = [
    { title: 'ФИО', dataIndex: 'name', key: 'name' },
    { title: 'Телефон', dataIndex: 'phone', key: 'phone' },
    { title: 'Зал', dataIndex: 'gymName', key: 'gymName' },
    {
      title: 'Создан',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (value: string) => formatDate(value),
    },
    {
      title: '',
      key: 'actions',
      width: 220,
      render: (_, item) => (
        <Space>
          <Button type="link" onClick={() => openEditModal(item)}>
            Редактировать
          </Button>
          <Popconfirm
            title="Удалить администратора?"
            okText="Удалить"
            cancelText="Отмена"
            onConfirm={() => deleteMutation.mutate(item.id)}
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
          Добавить администратора
        </Button>
      </Space>

      {isError && (
        <Alert
          type="error"
          showIcon
          message="Не удалось загрузить администраторов"
          action={
            <Button size="small" onClick={() => void refetch()}>
              Повторить
            </Button>
          }
        />
      )}

      {!isLoading && !isError && administrators.length === 0 ? (
        <Empty description="Администраторов пока нет" />
      ) : (
        <Table<Administrator>
          rowKey="id"
          columns={columns}
          dataSource={filteredRows}
          loading={isLoading}
          pagination={false}
        />
      )}

      <Modal
        title={editing ? 'Редактировать администратора' : 'Новый администратор'}
        open={isModalOpen}
        onCancel={closeModal}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        forceRender
      >
        <Form<AdministratorFormValues>
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
            <Input placeholder="Иванов Иван" />
          </Form.Item>

          <Form.Item
            name="phone"
            label="Телефон"
            rules={[{ required: true, message: 'Введите телефон' }]}
          >
            <Input placeholder="+79990000004" />
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

          <Form.Item
            name="password"
            label={editing ? 'Новый пароль (не обязательно)' : 'Пароль (не обязательно)'}
            rules={[{ min: 8, message: 'Минимум 8 символов' }]}
          >
            <Input.Password placeholder="Оставьте пустым для пароля по умолчанию" />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
