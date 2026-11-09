import { useState } from 'react';
import axios from 'axios';
import { Button, Card, Form, Input, Typography, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuthStore, type AuthUser } from '../store/auth';

interface LoginFormValues {
  phone: string;
  password: string;
}

interface LoginResponse {
  access_token: string;
  refresh_token: string;
  role: string;
  user_id: string;
}

export default function Login() {
  const navigate = useNavigate();
  const setTokens = useAuthStore((state) => state.setTokens);
  const setUser = useAuthStore((state) => state.setUser);
  const [loading, setLoading] = useState(false);

  const handleFinish = async (values: LoginFormValues) => {
    setLoading(true);

    try {
      const { data } = await api.post<LoginResponse>('/auth/login', values);
      setTokens(data.access_token, data.refresh_token);

      const me = await api.get<AuthUser>('/auth/me');
      setUser(me.data);

      navigate('/');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const data = error.response?.data as { message?: string | string[] };
        const errorMessage = Array.isArray(data?.message)
          ? data.message.join(', ')
          : data?.message;
        message.error(errorMessage ?? 'Не удалось войти');
      } else {
        message.error('Не удалось войти');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f5f5',
        padding: 16,
      }}
    >
      <Card style={{ width: 360 }}>
        <Typography.Title level={3} style={{ textAlign: 'center' }}>
          Gym Admin
        </Typography.Title>

        <Form<LoginFormValues>
          layout="vertical"
          onFinish={handleFinish}
          requiredMark={false}
        >
          <Form.Item
            name="phone"
            label="Телефон"
            rules={[{ required: true, message: 'Введите телефон' }]}
          >
            <Input placeholder="+70000000000" autoComplete="username" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Пароль"
            rules={[{ required: true, message: 'Введите пароль' }]}
          >
            <Input.Password
              placeholder="Пароль"
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" block loading={loading}>
              Войти
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
