import { useState } from 'react';
import axios from 'axios';
import {
  Alert,
  Button,
  Empty,
  Form,
  Image,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Upload,
  message,
} from 'antd';
import type { UploadProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import api from '../../api/client';
import { useCrudModal } from '../../hooks/useCrudModal';
import { useTableSearch } from '../../hooks/useTableSearch';

type EquipmentType = 'CARDIO' | 'MACHINE' | 'FREE_WEIGHT' | 'OTHER';

interface Equipment {
  id: string;
  gymId: string;
  name: string;
  type: EquipmentType;
  minWeight: number | null;
  maxWeight: number | null;
  photoUrl: string | null;
  description: string | null;
}

interface EquipmentFormValues {
  name: string;
  type: EquipmentType;
  minWeight?: number;
  maxWeight?: number;
  photoUrl?: string;
  description?: string;
}

interface Gym {
  id: string;
  name: string;
}

const TYPE_OPTIONS: { value: EquipmentType; label: string }[] = [
  { value: 'CARDIO', label: 'Кардио' },
  { value: 'MACHINE', label: 'Тренажёр' },
  { value: 'FREE_WEIGHT', label: 'Свободные веса' },
  { value: 'OTHER', label: 'Другое' },
];

const TYPE_LABELS: Record<EquipmentType, string> = {
  CARDIO: 'Кардио',
  MACHINE: 'Тренажёр',
  FREE_WEIGHT: 'Свободные веса',
  OTHER: 'Другое',
};

export default function EquipmentPage() {
  const { id: routeGymId } = useParams<{ id: string }>();
  const [selectedGymId, setSelectedGymId] = useState('');
  const [form] = Form.useForm<EquipmentFormValues>();
  const queryClient = useQueryClient();
  const {
    open: isModalOpen,
    editing: editingEquipment,
    openCreate,
    openEdit,
    close,
  } = useCrudModal<Equipment>();

  const photoUrl = Form.useWatch('photoUrl', form);

  const { data: gyms = [], isLoading: gymsLoading } = useQuery({
    queryKey: ['gyms'],
    enabled: !routeGymId,
    queryFn: async () => {
      const { data } = await api.get<Gym[]>('/admin/gyms');
      return data;
    },
  });

  const gymId = routeGymId || selectedGymId || gyms[0]?.id || '';
  const queryKey = ['gyms', gymId, 'equipment'];

  const {
    data: equipment = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey,
    enabled: Boolean(gymId),
    queryFn: async () => {
      const { data } = await api.get<Equipment[]>(
        `/admin/gyms/${gymId}/equipment`,
      );
      return data;
    },
  });

  const { searchValue, setSearchValue, filteredRows } =
    useTableSearch(equipment);

  const handleError = (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 409) {
      message.error('Конфликт: тренажёр с такими данными уже существует');
      return;
    }

    message.error('Не удалось сохранить тренажёр');
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey });
    close();
    form.resetFields();
  };

  const buildPayload = (values: EquipmentFormValues) => ({
    name: values.name,
    type: values.type,
    minWeight: values.minWeight ?? null,
    maxWeight: values.maxWeight ?? null,
    photoUrl: values.photoUrl ?? null,
    description: values.description ?? null,
  });

  const createMutation = useMutation({
    mutationFn: async (values: EquipmentFormValues) => {
      const { data } = await api.post<Equipment>(
        `/admin/gyms/${gymId}/equipment`,
        buildPayload(values),
      );
      return data;
    },
    onSuccess: handleSuccess,
    onError: handleError,
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string;
      values: EquipmentFormValues;
    }) => {
      const { data } = await api.put<Equipment>(
        `/admin/equipment/${id}`,
        buildPayload(values),
      );
      return data;
    },
    onSuccess: handleSuccess,
    onError: handleError,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/equipment/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      message.success('Тренажёр удалён');
    },
    onError: handleError,
  });

  const uploadFile: UploadProps['customRequest'] = async ({
    file,
    onSuccess,
    onError,
  }) => {
    const formData = new FormData();
    formData.append('file', file as File);

    try {
      const { data } = await api.post<{ url: string }>(
        '/admin/upload',
        formData,
      );
      form.setFieldValue('photoUrl', data.url);
      onSuccess?.(data);
    } catch (error) {
      onError?.(error as Error);
      message.error('Не удалось загрузить файл');
    }
  };

  const openCreateModal = () => {
    if (!gymId) {
      message.warning('Сначала выберите зал');
      return;
    }

    form.resetFields();
    openCreate();
  };

  const openEditModal = (item: Equipment) => {
    form.setFieldsValue({
      name: item.name,
      type: item.type,
      minWeight: item.minWeight ?? undefined,
      maxWeight: item.maxWeight ?? undefined,
      photoUrl: item.photoUrl ?? undefined,
      description: item.description ?? undefined,
    });
    openEdit(item);
  };

  const closeModal = () => {
    close();
    form.resetFields();
  };

  const handleFinish = (values: EquipmentFormValues) => {
    if (editingEquipment) {
      updateMutation.mutate({ id: editingEquipment.id, values });
      return;
    }

    createMutation.mutate(values);
  };

  const columns: ColumnsType<Equipment> = [
    {
      title: 'Фото',
      dataIndex: 'photoUrl',
      key: 'photoUrl',
      width: 88,
      render: (url: string | null) =>
        url ? (
          <Image src={url} alt="" width={56} height={56} style={{ objectFit: 'cover' }} />
        ) : (
          '—'
        ),
    },
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Тип',
      dataIndex: 'type',
      key: 'type',
      render: (type: EquipmentType) => <Tag>{TYPE_LABELS[type]}</Tag>,
    },
    {
      title: 'Вес, кг',
      key: 'weight',
      render: (_, item) => {
        if (item.minWeight == null && item.maxWeight == null) {
          return '—';
        }

        return `${item.minWeight ?? 0} – ${item.maxWeight ?? '∞'}`;
      },
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      key: 'description',
      render: (description: string | null) => description || '—',
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
            title="Удалить тренажёр?"
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
        {!routeGymId && (
          <Select
            style={{ minWidth: 260 }}
            placeholder="Выберите зал"
            value={gymId || undefined}
            onChange={setSelectedGymId}
            options={gyms.map((gym) => ({ value: gym.id, label: gym.name }))}
            loading={gymsLoading}
            showSearch
            optionFilterProp="label"
          />
        )}

        <Input.Search
          allowClear
          placeholder="Поиск по всем полям (от 3 символов)"
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          style={{ width: 280 }}
        />

        <Button type="primary" onClick={openCreateModal} disabled={!gymId}>
          Добавить тренажёр
        </Button>
      </Space>

      {isError && (
        <Alert
          type="error"
          showIcon
          message="Не удалось загрузить оборудование"
          action={
            <Button size="small" onClick={() => void refetch()}>
              Повторить
            </Button>
          }
        />
      )}

      {!routeGymId && !gymsLoading && gyms.length === 0 ? (
        <Empty description="Нет доступных залов. Сначала создайте зал." />
      ) : !isLoading && !isError && equipment.length === 0 ? (
        <Empty description="Оборудования пока нет" />
      ) : (
        <Table<Equipment>
          rowKey="id"
          columns={columns}
          dataSource={filteredRows}
          loading={isLoading}
          pagination={false}
        />
      )}

      <Modal
        title={editingEquipment ? 'Редактировать тренажёр' : 'Новый тренажёр'}
        open={isModalOpen}
        onCancel={closeModal}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        forceRender
      >
        <Form<EquipmentFormValues>
          form={form}
          layout="vertical"
          onFinish={handleFinish}
        >
          <Form.Item
            name="name"
            label="Название"
            rules={[{ required: true, message: 'Введите название' }]}
          >
            <Input placeholder="Беговая дорожка" />
          </Form.Item>

          <Form.Item
            name="type"
            label="Тип"
            rules={[{ required: true, message: 'Выберите тип' }]}
          >
            <Select options={TYPE_OPTIONS} placeholder="Выберите тип" />
          </Form.Item>

          <Space size="middle" style={{ display: 'flex' }}>
            <Form.Item name="minWeight" label="Мин. вес, кг" style={{ flex: 1 }}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              name="maxWeight"
              label="Макс. вес, кг"
              style={{ flex: 1 }}
              dependencies={['minWeight']}
              rules={[
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    const min = getFieldValue('minWeight');
                    if (value == null || min == null || value >= min) {
                      return Promise.resolve();
                    }
                    return Promise.reject(
                      new Error('Макс. вес не может быть меньше минимального'),
                    );
                  },
                }),
              ]}
            >
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </Space>

          <Form.Item label="Фото">
            <Space direction="vertical" size="small">
              <Upload
                accept="image/jpeg,image/png,image/webp"
                showUploadList={false}
                customRequest={uploadFile}
              >
                <Button>Загрузить фото</Button>
              </Upload>

              {photoUrl && (
                <Image
                  src={photoUrl}
                  alt="Фото тренажёра"
                  width={96}
                  height={96}
                  style={{ objectFit: 'cover' }}
                />
              )}
            </Space>
          </Form.Item>

          <Form.Item name="photoUrl" hidden>
            <Input />
          </Form.Item>

          <Form.Item name="description" label="Описание">
            <Input.TextArea rows={3} placeholder="Описание тренажёра" />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
