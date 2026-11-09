import { useState } from 'react';
import {
  Button,
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
  muscleGroup?: string;
  requiresEquipment: boolean;
  videoUrl?: string;
  description?: string;
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);

  const [type, setType] = useState<ExerciseType | undefined>();
  const [muscleGroup, setMuscleGroup] = useState('');
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');

  const { data: exercises = [], isLoading } = useQuery({
    queryKey: ['exercises', { type, muscleGroup, q }],
    queryFn: async () => {
      const { data } = await api.get<Exercise[]>('/exercises', {
        params: {
          type,
          muscle_group: muscleGroup || undefined,
          q: q || undefined,
        },
      });
      return data;
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['exercises'] });
  };

  const handleSuccess = () => {
    invalidate();
    setIsModalOpen(false);
    setEditingExercise(null);
    form.resetFields();
  };

  const createMutation = useMutation({
    mutationFn: async (values: ExerciseFormValues) => {
      const { data } = await api.post<Exercise>('/admin/exercises', values);
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
        values,
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
    setEditingExercise(null);
    form.resetFields();
    form.setFieldsValue({ requiresEquipment: false });
    setIsModalOpen(true);
  };

  const openEditModal = (exercise: Exercise) => {
    setEditingExercise(exercise);
    form.setFieldsValue({
      name: exercise.name,
      type: exercise.type,
      muscleGroup: exercise.muscleGroup ?? undefined,
      requiresEquipment: exercise.requiresEquipment,
      videoUrl: exercise.videoUrl ?? undefined,
      description: exercise.description ?? undefined,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingExercise(null);
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
          placeholder="Поиск по названию"
          value={qInput}
          onChange={(event) => {
            setQInput(event.target.value);
            if (!event.target.value) {
              setQ('');
            }
          }}
          onSearch={setQ}
          style={{ width: 260 }}
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

      <Table<Exercise>
        rowKey="id"
        columns={columns}
        dataSource={exercises}
        loading={isLoading}
        pagination={false}
      />

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
