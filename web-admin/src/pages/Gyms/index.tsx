import axios from 'axios';
import {
  Alert,
  Button,
  Empty,
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
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { useCrudModal } from '../../hooks/useCrudModal';
import { useTableSearch } from '../../hooks/useTableSearch';

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
  const navigate = useNavigate();
  const {
    open: isModalOpen,
    editing: editingGym,
    openCreate,
    openEdit,
    close,
  } = useCrudModal<Gym>();

  const {
    data: gyms = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['gyms'],
    queryFn: async () => {
      const { data } = await api.get<Gym[]>('/admin/gyms');
      return data;
    },
  });

  const { searchValue, setSearchValue, filteredRows } = useTableSearch(gyms);

  const handleError = (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 409) {
      message.error('Конфликт: зал с такими данными уже существует');
      return;
    }

    message.error('Не удалось сохранить зал');
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['gyms'] });
    close();
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
    form.resetFields();
    form.setFieldsValue({ isActive: true });
    openCreate();
  };

  const openEditModal = (gym: Gym) => {
    form.setFieldsValue({
      name: gym.name,
      address: gym.address,
      isActive: gym.isActive,
    });
    openEdit(gym);
  };

  const closeModal = () => {
    close();
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
      width: 300,
      render: (_, gym) => (
        <Space>
          <Button
            type="link"
            onClick={() => navigate(`/protected/gyms/${gym.id}/equipment`)}
          >
            Тренажёры
          </Button>
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
      <Space wrap>
        <Input.Search
          allowClear
          placeholder="Поиск по всем полям (от 3 символов)"
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          style={{ width: 280 }}
        />

        <Button type="primary" onClick={openCreateModal}>
          Добавить зал
        </Button>
      </Space>

      {isError && (
        <Alert
          type="error"
          showIcon
          message="Не удалось загрузить залы"
          action={
            <Button size="small" onClick={() => void refetch()}>
              Повторить
            </Button>
          }
        />
      )}

      {!isLoading && !isError && gyms.length === 0 ? (
        <Empty description="Залов пока нет" />
      ) : (
        <Table<Gym>
          rowKey="id"
          columns={columns}
          dataSource={filteredRows}
          loading={isLoading}
          pagination={false}
        />
      )}

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
