import { Button, Form, Input, Select, Space, Typography, message } from 'antd';
import { useMutation, useQuery } from '@tanstack/react-query';
import api from '../../api/client';

interface GymOption {
  id: string;
  name: string;
}

interface NotificationFormValues {
  title: string;
  body: string;
  gym_id?: string;
}

export default function NotificationsPage() {
  const [form] = Form.useForm<NotificationFormValues>();

  const { data: gyms = [] } = useQuery({
    queryKey: ['gyms'],
    queryFn: async () => {
      const { data } = await api.get<GymOption[]>('/admin/gyms');
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: NotificationFormValues) => {
      const { data } = await api.post('/admin/notifications', values);
      return data;
    },
    onSuccess: () => {
      form.resetFields();
      message.success('Уведомление отправлено');
    },
    onError: () => message.error('Не удалось отправить уведомление'),
  });

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Typography.Title level={4} style={{ margin: 0 }}>
        Рассылка уведомлений
      </Typography.Title>

      <Form<NotificationFormValues>
        form={form}
        layout="vertical"
        style={{ maxWidth: 520 }}
        onFinish={(values) => createMutation.mutate(values)}
      >
        <Form.Item
          name="title"
          label="Заголовок"
          rules={[{ required: true, message: 'Введите заголовок' }]}
        >
          <Input placeholder="Новое расписание" />
        </Form.Item>

        <Form.Item
          name="body"
          label="Текст"
          rules={[{ required: true, message: 'Введите текст' }]}
        >
          <Input.TextArea rows={4} placeholder="Текст уведомления" />
        </Form.Item>

        <Form.Item
          name="gym_id"
          label="Зал (опционально)"
          extra="Если выбран зал — уведомление получат только клиенты с активной связью в этом зале"
        >
          <Select
            allowClear
            placeholder="Все клиенты"
            options={gyms.map((gym) => ({ label: gym.name, value: gym.id }))}
          />
        </Form.Item>

        <Button
          type="primary"
          htmlType="submit"
          loading={createMutation.isPending}
        >
          Отправить
        </Button>
      </Form>
    </Space>
  );
}
