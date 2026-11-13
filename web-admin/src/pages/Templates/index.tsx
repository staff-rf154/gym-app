import { useState } from 'react';
import {
  Alert,
  Button,
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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../api/client';
import { useCrudModal } from '../../hooks/useCrudModal';
import { useAuthStore } from '../../store/auth';

type TemplateScope = 'GLOBAL' | 'GYM' | 'PERSONAL';

interface TemplateItem {
  id: string;
  exerciseId: string;
  plannedWeight: number | null;
  plannedSets: number;
  plannedReps: number;
  order: number;
}

interface WorkoutTemplate {
  id: string;
  trainerId: string | null;
  gymId: string | null;
  gymName: string | null;
  createdById: string | null;
  scope: TemplateScope;
  name: string;
  description: string | null;
  isActive: boolean;
  items: TemplateItem[];
}

interface Gym {
  id: string;
  name: string;
  address: string;
}

interface Exercise {
  id: string;
  name: string;
  muscleGroup: string | null;
  type: string;
}

interface TemplateItemForm {
  exerciseId: string;
  plannedWeight?: number | null;
  plannedSets: number;
  plannedReps: number;
}

interface TemplateFormValues {
  name: string;
  description?: string | null;
  gym_id?: string;
  items: TemplateItemForm[];
}

const GLOBAL_GYM_VALUE = '__global__';

const SCOPE_LABELS: Record<TemplateScope, string> = {
  GLOBAL: 'Глобальный',
  GYM: 'Зал',
  PERSONAL: 'Личный',
};

const SCOPE_COLORS: Record<TemplateScope, string> = {
  GLOBAL: 'blue',
  GYM: 'green',
  PERSONAL: 'default',
};

const DEFAULT_ITEM: TemplateItemForm = {
  exerciseId: '',
  plannedWeight: null,
  plannedSets: 3,
  plannedReps: 10,
};

export default function TemplatesPage() {
  const [form] = Form.useForm<TemplateFormValues>();
  const queryClient = useQueryClient();
  const role = useAuthStore((state) => state.user?.role);
  const isAdmin = role === 'ADMIN';
  const basePath = isAdmin ? '/admin/templates' : '/reception/templates';

  const {
    open: isModalOpen,
    editing: editingTemplate,
    openCreate,
    openEdit,
    close,
  } = useCrudModal<WorkoutTemplate>();

  const [exerciseSearch, setExerciseSearch] = useState('');

  const {
    data: templates = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['workout-templates', basePath],
    queryFn: async () => {
      const { data } = await api.get<WorkoutTemplate[]>(basePath);
      return data;
    },
  });

  const { data: exercises = [] } = useQuery({
    queryKey: ['exercises', { forTemplates: true }],
    queryFn: async () => {
      const { data } = await api.get<Exercise[]>('/exercises');
      return data;
    },
  });

  const { data: gyms = [] } = useQuery({
    queryKey: ['gyms'],
    queryFn: async () => {
      const { data } = await api.get<Gym[]>('/gyms');
      return data;
    },
    enabled: isAdmin,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['workout-templates'] });
  };

  const handleSuccess = () => {
    invalidate();
    close();
    form.resetFields();
  };

  const buildPayload = (values: TemplateFormValues) => {
    const gymId =
      values.gym_id && values.gym_id !== GLOBAL_GYM_VALUE
        ? values.gym_id
        : null;

    return {
      name: values.name,
      description: values.description?.trim() ? values.description : null,
      ...(isAdmin ? { gym_id: gymId } : {}),
      items: values.items.map((item, index) => ({
        exerciseId: item.exerciseId,
        plannedWeight: item.plannedWeight ?? null,
        plannedSets: item.plannedSets,
        plannedReps: item.plannedReps,
        order: index,
      })),
    };
  };

  const createMutation = useMutation({
    mutationFn: async (values: TemplateFormValues) => {
      const { data } = await api.post<WorkoutTemplate>(
        basePath,
        buildPayload(values),
      );
      return data;
    },
    onSuccess: handleSuccess,
    onError: () => message.error('Не удалось сохранить шаблон'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string;
      values: TemplateFormValues;
    }) => {
      const { data } = await api.put<WorkoutTemplate>(
        `${basePath}/${id}`,
        buildPayload(values),
      );
      return data;
    },
    onSuccess: handleSuccess,
    onError: () => message.error('Не удалось сохранить шаблон'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`${basePath}/${id}`),
    onSuccess: () => {
      invalidate();
      message.success('Шаблон архивирован');
    },
    onError: () => message.error('Не удалось архивировать шаблон'),
  });

  const openCreateModal = () => {
    form.resetFields();
    form.setFieldsValue({
      gym_id: isAdmin ? GLOBAL_GYM_VALUE : undefined,
      items: [{ ...DEFAULT_ITEM }],
    });
    openCreate();
  };

  const openEditModal = (template: WorkoutTemplate) => {
    form.setFieldsValue({
      name: template.name,
      description: template.description ?? undefined,
      gym_id: isAdmin
        ? (template.gymId ?? GLOBAL_GYM_VALUE)
        : undefined,
      items: template.items.map((item) => ({
        exerciseId: item.exerciseId,
        plannedWeight: item.plannedWeight,
        plannedSets: item.plannedSets,
        plannedReps: item.plannedReps,
      })),
    });
    openEdit(template);
  };

  const closeModal = () => {
    close();
    form.resetFields();
  };

  const handleFinish = (values: TemplateFormValues) => {
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, values });
      return;
    }

    createMutation.mutate(values);
  };

  const filteredExercises = exercises.filter((exercise) => {
    const query = exerciseSearch.trim().toLowerCase();
    if (!query) {
      return true;
    }

    return (
      exercise.name.toLowerCase().includes(query) ||
      (exercise.muscleGroup ?? '').toLowerCase().includes(query)
    );
  });

  const columns: ColumnsType<WorkoutTemplate> = [
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Область',
      dataIndex: 'scope',
      key: 'scope',
      render: (value: TemplateScope) => (
        <Tag color={SCOPE_COLORS[value]}>{SCOPE_LABELS[value]}</Tag>
      ),
    },
    {
      title: 'Зал',
      dataIndex: 'gymName',
      key: 'gymName',
      render: (value: string | null) => value || 'Все залы',
    },
    {
      title: 'Упражнений',
      key: 'items',
      render: (_, template) => template.items.length,
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (value: string | null) => value || '—',
    },
    {
      title: '',
      key: 'actions',
      width: 240,
      render: (_, template) => (
        <Space>
          <Button type="link" onClick={() => openEditModal(template)}>
            Редактировать
          </Button>
          <Popconfirm
            title="Архивировать шаблон?"
            description="Шаблон исчезнет из списков, история тренировок сохранится."
            okText="Архивировать"
            cancelText="Отмена"
            onConfirm={() => deleteMutation.mutate(template.id)}
          >
            <Button type="link" danger>
              Архивировать
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Space wrap>
        <Button type="primary" onClick={openCreateModal}>
          Добавить шаблон
        </Button>
      </Space>

      {isError && (
        <Alert
          type="error"
          showIcon
          message="Не удалось загрузить шаблоны"
          action={
            <Button size="small" onClick={() => void refetch()}>
              Повторить
            </Button>
          }
        />
      )}

      {!isLoading && !isError && templates.length === 0 ? (
        <Empty description="Шаблонов пока нет" />
      ) : (
        <Table<WorkoutTemplate>
          rowKey="id"
          columns={columns}
          dataSource={templates}
          loading={isLoading}
          pagination={false}
        />
      )}

      <Modal
        title={editingTemplate ? 'Редактировать шаблон' : 'Новый шаблон'}
        open={isModalOpen}
        onCancel={closeModal}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={900}
        forceRender
      >
        <Form<TemplateFormValues>
          form={form}
          layout="vertical"
          onFinish={handleFinish}
        >
          <Form.Item
            name="name"
            label="Название"
            rules={[{ required: true, message: 'Введите название' }]}
          >
            <Input placeholder="Вес вверх" />
          </Form.Item>

          <Form.Item name="description" label="Описание">
            <Input.TextArea rows={2} placeholder="Необязательно" />
          </Form.Item>

          {isAdmin && (
            <Form.Item name="gym_id" label="Область действия">
              <Select
                options={[
                  { value: GLOBAL_GYM_VALUE, label: 'Глобальный (все залы)' },
                  ...gyms.map((gym) => ({
                    value: gym.id,
                    label: gym.name,
                  })),
                ]}
              />
            </Form.Item>
          )}

          <Form.Item label="Упражнения" required>
            <Form.List
              name="items"
              rules={[
                {
                  validator: async (_, items: TemplateItemForm[] | undefined) => {
                    if (!items || items.length === 0) {
                      throw new Error('Добавьте хотя бы одно упражнение');
                    }
                  },
                },
              ]}
            >
              {(fields, { add, remove }, { errors }) => (
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Input.Search
                    allowClear
                    placeholder="Поиск упражнения"
                    value={exerciseSearch}
                    onChange={(event) =>
                      setExerciseSearch(event.target.value)
                    }
                    style={{ width: 280 }}
                  />

                  {fields.map((field) => (
                    <Space
                      key={field.key}
                      align="start"
                      style={{ width: '100%' }}
                    >
                      <Form.Item
                        name={[field.name, 'exerciseId']}
                        rules={[
                          { required: true, message: 'Выберите упражнение' },
                        ]}
                        style={{ marginBottom: 8, minWidth: 280 }}
                      >
                        <Select
                          showSearch
                          optionFilterProp="label"
                          placeholder="Упражнение"
                          options={filteredExercises.map((exercise) => ({
                            value: exercise.id,
                            label: exercise.muscleGroup
                              ? `${exercise.name} · ${exercise.muscleGroup}`
                              : exercise.name,
                          }))}
                        />
                      </Form.Item>

                      <Form.Item
                        name={[field.name, 'plannedWeight']}
                        style={{ marginBottom: 8 }}
                      >
                        <InputNumber
                          min={0}
                          step={2.5}
                          placeholder="Вес, кг"
                          style={{ width: 120 }}
                        />
                      </Form.Item>

                      <Form.Item
                        name={[field.name, 'plannedSets']}
                        rules={[
                          { required: true, message: 'Подходы' },
                        ]}
                        style={{ marginBottom: 8 }}
                      >
                        <InputNumber
                          min={1}
                          precision={0}
                          placeholder="Подходы"
                          style={{ width: 110 }}
                        />
                      </Form.Item>

                      <Form.Item
                        name={[field.name, 'plannedReps']}
                        rules={[
                          { required: true, message: 'Повторы' },
                        ]}
                        style={{ marginBottom: 8 }}
                      >
                        <InputNumber
                          min={1}
                          precision={0}
                          placeholder="Повторы"
                          style={{ width: 110 }}
                        />
                      </Form.Item>

                      <Button danger type="link" onClick={() => remove(field.name)}>
                        Удалить
                      </Button>
                    </Space>
                  ))}

                  <Button type="dashed" onClick={() => add({ ...DEFAULT_ITEM })}>
                    Добавить упражнение
                  </Button>
                  <Form.ErrorList errors={errors} />
                </Space>
              )}
            </Form.List>
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
