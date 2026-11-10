import { useEffect } from 'react';
import { Button, Form, Select, Space, Typography, message } from 'antd';
import { useMutation } from '@tanstack/react-query';
import api from '../../api/client';
import { useAuthStore, type AuthUser } from '../../store/auth';

interface SettingsFormValues {
  timezone: string;
}

const TIMEZONES = [
  'UTC',
  'Europe/Kaliningrad',
  'Europe/Moscow',
  'Europe/Samara',
  'Asia/Yekaterinburg',
  'Asia/Omsk',
  'Asia/Novosibirsk',
  'Asia/Krasnoyarsk',
  'Asia/Irkutsk',
  'Asia/Yakutsk',
  'Asia/Vladivostok',
  'Asia/Magadan',
  'Asia/Kamchatka',
];

export default function SettingsPage() {
  const [form] = Form.useForm<SettingsFormValues>();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

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
    </Space>
  );
}
