import { useEffect } from 'react';
import {
  Button,
  Card,
  Form,
  Popconfirm,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from 'antd';
import axios from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../api/client';
import { useAuthStore, type AuthUser } from '../../store/auth';
import { TIMEZONES } from '../../constants/options';

interface SettingsFormValues {
  timezone: string;
}

interface DemoStatus {
  loaded: boolean;
  gyms: number;
  trainers: number;
  clients: number;
  workouts: number;
}

interface DemoLoadResult extends DemoStatus {
  equipment: number;
  exercises: number;
  templates: number;
  defaultEquipment: number;
  defaultExercises: number;
  defaultTemplates: number;
  measurements: number;
  nutrition: number;
}

export default function SettingsPage() {
  const [form] = Form.useForm<SettingsFormValues>();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const queryClient = useQueryClient();

  const { data: demoStatus, isLoading: isDemoStatusLoading } = useQuery({
    queryKey: ['demo', 'status'],
    queryFn: async () => {
      const { data } = await api.get<DemoStatus>('/admin/demo/status');
      return data;
    },
  });

  const demoLoaded = demoStatus?.loaded ?? false;

  const demoLoadMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<DemoLoadResult>('/admin/demo/load');
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries();
      message.success(
        `Демо-данные загружены: ${data.clients} клиентов, ${data.workouts} тренировок, ${data.defaultTemplates} общих шаблонов`,
      );
    },
    onError: (error: unknown) => {
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        message.error(String(error.response.data.message));
        return;
      }
      message.error('Не удалось загрузить демо-данные');
    },
  });

  const demoClearMutation = useMutation({
    mutationFn: async () => {
      await api.delete('/admin/demo');
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      message.success('Демо-данные очищены');
    },
    onError: () => message.error('Не удалось очистить демо-данные'),
  });

  useEffect(() => {
    if (user) {
      form.setFieldsValue({ timezone: user.timezone });
    }
  }, [user, form]);

  const updateMutation = useMutation({
    mutationFn: async (timezone: string) => {
      await api.patch('/auth/timezone', { timezone });
      const { data } = await api.get<AuthUser>('/auth/me');
      return data;
    },
    onSuccess: (data) => {
      setUser(data);
      form.setFieldsValue({ timezone: data.timezone });
      message.success('Часовой пояс сохранён');
    },
    onError: () => message.error('Не удалось сохранить часовой пояс'),
  });

  const options = Array.from(
    new Set([...(user ? [user.timezone] : []), ...TIMEZONES]),
  ).map((timezone) => ({ label: timezone, value: timezone }));

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Typography.Title level={4} style={{ margin: 0 }}>
        Настройки
      </Typography.Title>

      <Form<SettingsFormValues>
        form={form}
        layout="vertical"
        style={{ maxWidth: 400 }}
        onFinish={(values) => updateMutation.mutate(values.timezone)}
      >
        <Form.Item
          name="timezone"
          label="Часовой пояс"
          rules={[{ required: true, message: 'Выберите часовой пояс' }]}
        >
          <Select
            showSearch
            options={options}
            placeholder="Выберите часовой пояс"
          />
        </Form.Item>

        <Button
          type="primary"
          htmlType="submit"
          loading={updateMutation.isPending}
        >
          Сохранить
        </Button>
      </Form>

      <Card title="Демо-данные" size="small" style={{ maxWidth: 640 }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
            3 зала с разными тренажёрами, 6 тренеров, 20 клиентов и 3 месяца
            тренировок с результатами, замерами веса и рекомендациями по
            питанию.
          </Typography.Paragraph>

          <Space wrap>
            <Tag color={demoLoaded ? 'green' : 'default'}>
              {demoLoaded ? 'Загружены' : 'Не загружены'}
            </Tag>
            {demoLoaded && demoStatus ? (
              <Typography.Text type="secondary">
                Залы: {demoStatus.gyms}, тренеры: {demoStatus.trainers}, клиенты:{' '}
                {demoStatus.clients}, тренировки: {demoStatus.workouts}
              </Typography.Text>
            ) : null}
          </Space>

          <Space wrap>
            <Popconfirm
              title="Загрузить демо-данные?"
              description="Будут созданы залы, тренеры, клиенты и тренировки за 3 месяца."
              okText="Загрузить"
              cancelText="Отмена"
              onConfirm={() => demoLoadMutation.mutate()}
              disabled={demoLoaded}
            >
              <Button
                type="primary"
                loading={demoLoadMutation.isPending}
                disabled={demoLoaded || isDemoStatusLoading}
              >
                Загрузить демо-данные
              </Button>
            </Popconfirm>

            <Popconfirm
              title="Очистить демо-данные?"
              description="Будут удалены только демонстрационные залы, тренеры, клиенты и тренировки."
              okText="Очистить"
              cancelText="Отмена"
              okButtonProps={{ danger: true }}
              onConfirm={() => demoClearMutation.mutate()}
              disabled={!demoLoaded}
            >
              <Button
                danger
                loading={demoClearMutation.isPending}
                disabled={!demoLoaded || isDemoStatusLoading}
              >
                Очистить демо-данные
              </Button>
            </Popconfirm>
          </Space>

          <Typography.Text type="secondary">
            Демо-аккаунты: тренеры +79995550001–+79995550006, клиенты
            +79995550101–+79995550120. Пароль — значение переменной
            DEFAULT_CLIENT_PASSWORD.
          </Typography.Text>
        </Space>
      </Card>
    </Space>
  );
}
