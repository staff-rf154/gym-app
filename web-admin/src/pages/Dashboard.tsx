import { Alert, Button, Card, Col, Row, Space, Statistic, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

interface DashboardSummary {
  gyms: number;
  activeGyms: number;
  trainers: number;
  clients: number;
  equipment: number;
  workouts: number;
}

export default function Dashboard() {
  const navigate = useNavigate();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: async () => {
      const { data } = await api.get<DashboardSummary>(
        '/admin/dashboard/stats',
      );
      return data;
    },
  });

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div>
        <Typography.Title level={3} style={{ marginTop: 0, marginBottom: 4 }}>
          Дашборд
        </Typography.Title>
        <Typography.Text type="secondary">
          Сводка по залам, сотрудникам и клиентам
        </Typography.Text>
      </div>

      {isError && (
        <Alert
          type="error"
          showIcon
          message="Не удалось загрузить статистику"
          action={
            <Button size="small" onClick={() => void refetch()}>
              Повторить
            </Button>
          }
        />
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={isLoading}>
            <Statistic
              title={
                data ? `Залы · активных ${data.activeGyms}` : 'Залы'
              }
              value={data?.gyms}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card loading={isLoading}>
            <Statistic title="Тренеры" value={data?.trainers} />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card loading={isLoading}>
            <Statistic title="Клиенты" value={data?.clients} />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card loading={isLoading}>
            <Statistic title="Тренажёры" value={data?.equipment} />
          </Card>
        </Col>
      </Row>

      <Card title="Быстрые действия">
        <Space wrap>
          <Button onClick={() => navigate('/protected/gyms')}>Залы</Button>
          <Button onClick={() => navigate('/protected/equipment')}>
            Тренажёры
          </Button>
          <Button onClick={() => navigate('/protected/trainers')}>
            Тренеры
          </Button>
          <Button onClick={() => navigate('/protected/clients')}>
            Клиенты
          </Button>
        </Space>
      </Card>
    </Space>
  );
}
