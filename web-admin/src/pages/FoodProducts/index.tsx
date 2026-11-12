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
  Table,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../api/client';
import { useCrudModal } from '../../hooks/useCrudModal';
import { useTableSearch } from '../../hooks/useTableSearch';

interface FoodProduct {
  id: string;
  name: string;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
}

interface FoodProductFormValues {
  name: string;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
}

export default function FoodProductsPage() {
  const [form] = Form.useForm<FoodProductFormValues>();
  const queryClient = useQueryClient();
  const {
    open: isModalOpen,
    editing: editingProduct,
    openCreate,
    openEdit,
    close,
  } = useCrudModal<FoodProduct>();

  const {
    data: products = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['food-products'],
    queryFn: async () => {
      const { data } = await api.get<FoodProduct[]>('/admin/food-products');
      return data;
    },
  });

  const { searchValue, setSearchValue, filteredRows } =
    useTableSearch(products);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['food-products'] });
  };

  const handleSuccess = () => {
    invalidate();
    close();
    form.resetFields();
  };

  const createMutation = useMutation({
    mutationFn: async (values: FoodProductFormValues) => {
      const { data } = await api.post<FoodProduct>(
        '/admin/food-products',
        values,
      );
      return data;
    },
    onSuccess: handleSuccess,
    onError: () => message.error('Не удалось сохранить продукт'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string;
      values: FoodProductFormValues;
    }) => {
      const { data } = await api.put<FoodProduct>(
        `/admin/food-products/${id}`,
        values,
      );
      return data;
    },
    onSuccess: handleSuccess,
    onError: () => message.error('Не удалось сохранить продукт'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/food-products/${id}`),
    onSuccess: () => {
      invalidate();
      message.success('Продукт удалён');
    },
    onError: () => message.error('Не удалось удалить продукт'),
  });

  const openCreateModal = () => {
    form.resetFields();
    openCreate();
  };

  const openEditModal = (product: FoodProduct) => {
    form.setFieldsValue({
      name: product.name,
      kcal: product.kcal,
      protein: product.protein,
      fat: product.fat,
      carbs: product.carbs,
    });
    openEdit(product);
  };

  const closeModal = () => {
    close();
    form.resetFields();
  };

  const handleFinish = (values: FoodProductFormValues) => {
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, values });
      return;
    }

    createMutation.mutate(values);
  };

  const columns: ColumnsType<FoodProduct> = [
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Ккал',
      dataIndex: 'kcal',
      key: 'kcal',
    },
    {
      title: 'Белки',
      dataIndex: 'protein',
      key: 'protein',
    },
    {
      title: 'Жиры',
      dataIndex: 'fat',
      key: 'fat',
    },
    {
      title: 'Углеводы',
      dataIndex: 'carbs',
      key: 'carbs',
    },
    {
      title: '',
      key: 'actions',
      width: 220,
      render: (_, product) => (
        <Space>
          <Button type="link" onClick={() => openEditModal(product)}>
            Редактировать
          </Button>
          <Popconfirm
            title="Удалить продукт?"
            okText="Удалить"
            cancelText="Отмена"
            onConfirm={() => deleteMutation.mutate(product.id)}
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
          Добавить продукт
        </Button>
      </Space>

      {isError && (
        <Alert
          type="error"
          showIcon
          message="Не удалось загрузить продукты"
          action={
            <Button size="small" onClick={() => void refetch()}>
              Повторить
            </Button>
          }
        />
      )}

      {!isLoading && !isError && products.length === 0 ? (
        <Empty description="Продуктов пока нет" />
      ) : (
        <Table<FoodProduct>
          rowKey="id"
          columns={columns}
          dataSource={filteredRows}
          loading={isLoading}
          pagination={false}
        />
      )}

      <Modal
        title={editingProduct ? 'Редактировать продукт' : 'Новый продукт'}
        open={isModalOpen}
        onCancel={closeModal}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        forceRender
      >
        <Form<FoodProductFormValues>
          form={form}
          layout="vertical"
          onFinish={handleFinish}
        >
          <Form.Item
            name="name"
            label="Название"
            rules={[{ required: true, message: 'Введите название' }]}
          >
            <Input placeholder="Куриная грудка" />
          </Form.Item>

          <Form.Item
            name="kcal"
            label="Ккал"
            rules={[{ required: true, message: 'Введите калорийность' }]}
          >
            <InputNumber min={0} precision={0} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="protein"
            label="Белки, г"
            rules={[{ required: true, message: 'Введите белки' }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="fat"
            label="Жиры, г"
            rules={[{ required: true, message: 'Введите жиры' }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="carbs"
            label="Углеводы, г"
            rules={[{ required: true, message: 'Введите углеводы' }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
