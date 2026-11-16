import { Button, Layout, Menu, Space, Typography } from 'antd';
import type { MenuProps } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import api from '../api/client';
import QuickActions from '../components/QuickActions';
import { useAuthStore } from '../store/auth';

const { Header, Sider, Content } = Layout;

const adminMenuItems: MenuProps['items'] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'trainers', label: 'Тренеры' },
  { key: 'clients', label: 'Клиенты' },
  { key: 'goals', label: 'Цели' },
  { key: 'reports/attendance', label: 'Отчёт: посещаемость' },
  { key: 'reports/equipment', label: 'Отчёт: тренажёры' },
  { key: 'reports/trainers', label: 'Отчёт: тренеры' },
  { key: 'administrators', label: 'Администраторы' },
  { key: 'gyms', label: 'Залы' },
  { key: 'equipment', label: 'Тренажёры' },
  { key: 'exercises', label: 'Упражнения' },
  { key: 'templates', label: 'Шаблоны' },
  { key: 'products', label: 'Продукты' },
  { key: 'notifications', label: 'Уведомления' },
  { key: 'chats', label: 'Чаты' },
  { key: 'settings', label: 'Настройки' },
];

const administratorMenuItems: MenuProps['items'] = [
  { key: 'administrator/clients', label: 'Клиенты' },
  { key: 'administrator/trainers', label: 'Тренеры' },
  { key: 'administrator/templates', label: 'Шаблоны' },
  { key: 'chats', label: 'Чаты' },
  { key: 'reports/attendance', label: 'Отчёт: посещаемость' },
  { key: 'reports/equipment', label: 'Отчёт: тренажёры' },
  { key: 'reports/trainers', label: 'Отчёт: тренеры' },
];

const trainerMenuItems: MenuProps['items'] = [
  { key: 'reports/attendance', label: 'Отчёт: посещаемость' },
  { key: 'reports/equipment', label: 'Отчёт: тренажёры' },
  { key: 'reports/trainers', label: 'Отчёт: тренеры' },
];

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const isAdministrator = user?.role === 'ADMINISTRATOR';
  const isTrainer = user?.role === 'TRAINER';
  const menuItems = isAdministrator
    ? administratorMenuItems
    : isTrainer
      ? trainerMenuItems
      : adminMenuItems;
  const selectedKey = location.pathname.replace('/protected/', '');

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // сессия всё равно очищается на клиенте
    } finally {
      logout();
      navigate('/login', { replace: true });
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider breakpoint="lg" collapsedWidth="0">
        <div
          style={{
            height: 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 18,
            fontWeight: 600,
          }}
        >
          {isAdministrator
            ? 'Gym Administrator'
            : isTrainer
              ? 'Gym Trainer'
              : 'Gym Admin'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(`/protected/${key}`)}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            paddingInline: 24,
          }}
        >
          <Space size="middle">
            <Typography.Text strong>{user?.name}</Typography.Text>
            <Typography.Text type="secondary">{user?.timezone}</Typography.Text>
            <Button onClick={handleLogout}>Выход</Button>
          </Space>
        </Header>

        <Content style={{ margin: 24 }}>
          <div
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 10,
              background: '#f5f5f5',
              paddingBottom: 12,
            }}
          >
            <QuickActions />
          </div>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
