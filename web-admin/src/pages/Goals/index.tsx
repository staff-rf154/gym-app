import {
  Alert,
  Button,
  Empty,
  Form,
  Input,
  InputNumber,
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
import { useCrudModal } from '../../hooks/useCrudModal';
import { useTableSearch } from '../../hooks/useTableSearch';

interface Goal {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
}

interface GoalFormValues {
  name: string;
  description?: string | null;
  isActive: boolean;
  sortOrder: number;
}

export default function GoalsPage() {
  const [form] = Form.useForm<GoalFormValues>();
  const queryClient = useQueryClient();
  const {
    open: isModalOpen,
    editing,
    openCreate,
    openEdit,
    close,
  } = useCrudModal<Goal>();

  const {
    data: goals = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['goals'],
    queryFn: async () => {
      const { data } = await api.get<Goal[]>('/admin/goals');
      return data;
    },
  });

  const { searchValue, setSearchValue, filteredRows } = useTableSearch(goals);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['goals'] });
  };

  const closeModal = () => {
    close();
    form.resetFields();
  };

  const buildPayload = (values: GoalFormValues) => ({
    name: values.name,
    description: values.description?.trim() ? values.description : null,
    isActive: values.isActive,
    sortOrder: values.sortOrder ?? 0,
  });

  const createMutation = useMutation({
    mutationFn: async (values: GoalFormValues) => {
      const { data } = await api.post<Goal>(
        '/admin/goals',
        buildPayload(values),
      );
      return data;
    },
    onSuccess: () => {
      invalidate();
      closeModal();
    },
    onError: () => message.error('Не удалось создать цель'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string;
      values: GoalFormValues;
    }) => {
      const { data } = await api.put<Goal>(
        `/admin/goals/${id}`,
        buildPayload(values),
      );
      return data;
    },
    onSuccess: () => {
      invalidate();
      closeModal();
    },
    onError: () => message.error('Не удалось сохранить цель'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/goals/${id}`),
    onSuccess: () => {
      invalidate();
      message.success('Цель удалена');
    },
    onError: () =>
      message.error('Не удалось удалить цель (возможно, она назначена клиентам)'),
  });

  const openCreateModal = () => {
    form.resetFields();
    form.setFieldsValue({ isActive: true, sortOrder: 0 });
    openCreate();
  };

  const openEditModal = (goal: Goal) => {
    form.setFieldsValue({
      name: goal.name,
      description: goal.description,
      isActive: goal.isActive,
      sortOrder: goal.sortOrder,
    });
    openEdit(goal);
  };

  const handleFinish = (values: GoalFormValues) => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, values });
      return;
    }

    createMutation.mutate(values);
  };

  const columns: ColumnsType<Goal> = [
    { title: 'Название', dataIndex: 'name', key: 'name' },
    {
      title: 'Описание',
      dataIndex: 'description',
      key: 'description',
      render: (value: string | null) => value || '—',
    },
    { title: 'Порядок', dataIndex: 'sortOrder', key: 'sortOrder', width: 110 },
    {
      title: 'Статус',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 130,
      render: (value: boolean) =>
        value ? <Tag color="green">Активна</Tag> : <Tag>Скрыта</Tag>,
    },
    {
      title: '',
      key: 'actions',
      width: 200,
      render: (_, goal) => (
        <Space>
          <Button type="link" onClick={() => openEditModal(goal)}>
            Редактировать
          </Button>
          <Popconfirm
            title="Удалить цель?"
            okText="Удалить"
            cancelText="Отмена"
            onConfirm={() => deleteMutation.mutate(goal.id)}
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
          Создать цель
        </Button>
      </Space>

      {isError && (
        <Alert
          type="error"
          showIcon
          message="Не удалось загрузить цели"
          action={
            <Button size="small" onClick={() => void refetch()}>
              Повторить
            </Button>
          }
        />
      )}

      {!isLoading && !isError && goals.length === 0 ? (
        <Empty description="Целей пока нет" />
      ) : (
        <Table<Goal>
          rowKey="id"
          columns={columns}
          dataSource={filteredRows}
          loading={isLoading}
          pagination={false}
        />
      )}

      <Modal
        title={editing ? 'Редактировать цель' : 'Новая цель'}
        open={isModalOpen}
        onCancel={closeModal}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        forceRender
      >
        <Form<GoalFormValues>
          form={form}
          layout="vertical"
          onFinish={handleFinish}
        >
          <Form.Item
            name="name"
            label="Название"
            rules={[{ required: true, message: 'Введите название' }]}
          >
            <Input placeholder="Похудение" />
          </Form.Item>

          <Form.Item name="description" label="Описание">
            <Input.TextArea rows={3} />
          </Form.Item>

          <Form.Item name="sortOrder" label="Порядок сортировки">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="isActive"
            label="Активна"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
