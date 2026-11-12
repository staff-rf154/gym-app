import { useState } from 'react';
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

type ExerciseType = 'EQUIPMENT' | 'FREE_WEIGHT' | 'BODYWEIGHT' | 'CARDIO';

interface Exercise {
  id: string;
  name: string;
  type: ExerciseType;
  muscleGroup: string | null;
  requiresEquipment: boolean;
  videoUrl: string | null;
  description: string | null;
}

interface ExerciseFormValues {
  name: string;
  type: ExerciseType;
  muscleGroup?: string | null;
  requiresEquipment: boolean;
  videoUrl?: string | null;
  description?: string | null;
}

const TYPE_OPTIONS: { value: ExerciseType; label: string }[] = [
  { value: 'EQUIPMENT', label: 'На тренажёрах' },
  { value: 'FREE_WEIGHT', label: 'Свободные веса' },
  { value: 'BODYWEIGHT', label: 'С собственным весом' },
  { value: 'CARDIO', label: 'Кардио' },
];

const TYPE_LABELS: Record<ExerciseType, string> = {
  EQUIPMENT: 'На тренажёрах',
  FREE_WEIGHT: 'Свободные веса',
  BODYWEIGHT: 'С собственным весом',
  CARDIO: 'Кардио',
};

export default function ExercisesPage() {
  const [form] = Form.useForm<ExerciseFormValues>();
  const queryClient = useQueryClient();
  const {
    open: isModalOpen,
    editing: editingExercise,
    openCreate,
    openEdit,
    close,
  } = useCrudModal<Exercise>();

  const [type, setType] = useState<ExerciseType | undefined>();
  const [muscleGroup, setMuscleGroup] = useState('');

  const {
    data: exercises = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['exercises', { type, muscleGroup }],
    queryFn: async () => {
      const { data } = await api.get<Exercise[]>('/exercises', {
        params: {
          type,
          muscle_group: muscleGroup || undefined,
        },
      });
      return data;
    },
  });

  const { searchValue, setSearchValue, filteredRows } =
    useTableSearch(exercises);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['exercises'] });
  };

  const handleSuccess = () => {
    invalidate();
    close();
    form.resetFields();
  };

  const buildPayload = (values: ExerciseFormValues) => ({
    name: values.name,
    type: values.type,
    muscleGroup: values.muscleGroup || null,
    requiresEquipment: values.requiresEquipment,
    videoUrl: values.videoUrl?.trim() ? values.videoUrl : null,
    description: values.description?.trim() ? values.description : null,
  });

  const createMutation = useMutation({
    mutationFn: async (values: ExerciseFormValues) => {
      const { data } = await api.post<Exercise>(
        '/admin/exercises',
        buildPayload(values),
      );
      return data;
    },
    onSuccess: handleSuccess,
    onError: () => message.error('Не удалось сохранить упражнение'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string;
      values: ExerciseFormValues;
    }) => {
      const { data } = await api.put<Exercise>(
        `/admin/exercises/${id}`,
        buildPayload(values),
      );
      return data;
    },
    onSuccess: handleSuccess,
    onError: () => message.error('Не удалось сохранить упражнение'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/exercises/${id}`),
    onSuccess: () => {
      invalidate();
      message.success('Упражнение удалено');
    },
    onError: () => message.error('Не удалось удалить упражнение'),
  });

  const openCreateModal = () => {
    form.resetFields();
    form.setFieldsValue({ requiresEquipment: false });
    openCreate();
  };

  const openEditModal = (exercise: Exercise) => {
    form.setFieldsValue({
      name: exercise.name,
      type: exercise.type,
      muscleGroup: exercise.muscleGroup ?? undefined,
      requiresEquipment: exercise.requiresEquipment,
      videoUrl: exercise.videoUrl ?? undefined,
      description: exercise.description ?? undefined,
    });
    openEdit(exercise);
  };

  const closeModal = () => {
    close();
    form.resetFields();
  };

  const handleFinish = (values: ExerciseFormValues) => {
    if (editingExercise) {
      updateMutation.mutate({ id: editingExercise.id, values });
      return;
    }

    createMutation.mutate(values);
  };

  const columns: ColumnsType<Exercise> = [
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Тип',
      dataIndex: 'type',
      key: 'type',
      render: (value: ExerciseType) => <Tag>{TYPE_LABELS[value]}</Tag>,
    },
    {
      title: 'Группа мышц',
      dataIndex: 'muscleGroup',
      key: 'muscleGroup',
      render: (value: string | null) => value || '—',
    },
    {
      title: 'Оборудование',
      dataIndex: 'requiresEquipment',
      key: 'requiresEquipment',
      render: (value: boolean) => (value ? 'Да' : 'Нет'),
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      key: 'description',
      render: (value: string | null) => value || '—',
    },
    {
      title: '',
      key: 'actions',
      width: 220,
      render: (_, exercise) => (
        <Space>
          <Button type="link" onClick={() => openEditModal(exercise)}>
            Редактировать
          </Button>
          <Popconfirm
            title="Удалить упражнение?"
            okText="Удалить"
            cancelText="Отмена"
            onConfirm={() => deleteMutation.mutate(exercise.id)}
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

        <Select
          allowClear
          placeholder="Тип"
          options={TYPE_OPTIONS}
          value={type}
          onChange={setType}
          style={{ width: 180 }}
        />

        <Input
          allowClear
          placeholder="Группа мышц"
          value={muscleGroup}
          onChange={(event) => setMuscleGroup(event.target.value)}
          style={{ width: 200 }}
        />

        <Button type="primary" onClick={openCreateModal}>
          Добавить упражнение
        </Button>
      </Space>

      {isError && (
        <Alert
          type="error"
          showIcon
          message="Не удалось загрузить упражнения"
          action={
            <Button size="small" onClick={() => void refetch()}>
              Повторить
            </Button>
          }
        />
      )}

      {!isLoading && !isError && exercises.length === 0 ? (
        <Empty description="Упражнений пока нет" />
      ) : (
        <Table<Exercise>
          rowKey="id"
          columns={columns}
          dataSource={filteredRows}
          loading={isLoading}
          pagination={false}
        />
      )}

      <Modal
        title={
          editingExercise ? 'Редактировать упражнение' : 'Новое упражнение'
        }
        open={isModalOpen}
        onCancel={closeModal}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        forceRender
      >
        <Form<ExerciseFormValues>
          form={form}
          layout="vertical"
          onFinish={handleFinish}
        >
          <Form.Item
            name="name"
            label="Название"
            rules={[{ required: true, message: 'Введите название' }]}
          >
            <Input placeholder="Приседания со штангой" />
          </Form.Item>

          <Form.Item
            name="type"
            label="Тип"
            rules={[{ required: true, message: 'Выберите тип' }]}
          >
            <Select options={TYPE_OPTIONS} placeholder="Выберите тип" />
          </Form.Item>

          <Form.Item name="muscleGroup" label="Группа мышц">
            <Input placeholder="Ноги" />
          </Form.Item>

          <Form.Item
            name="requiresEquipment"
            label="Требуется оборудование"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item name="videoUrl" label="Ссылка на видео">
            <Input placeholder="/uploads/exercise.mp4" />
          </Form.Item>

          <Form.Item name="description" label="Описание">
            <Input.TextArea rows={3} placeholder="Описание упражнения" />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
