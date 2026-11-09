import { Button, Layout, Menu, Space, Typography } from 'antd';
import type { MenuProps } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';

const { Header, Sider, Content } = Layout;

const menuItems: MenuProps['items'] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'trainers', label: 'Тренеры' },
  { key: 'clients', label: 'Клиенты' },
  { key: 'gyms', label: 'Залы' },
  { key: 'equipment', label: 'Тренажёры' },
  { key: 'exercises', label: 'Упражнения' },
  { key: 'products', label: 'Продукты' },
  { key: 'notifications', label: 'Уведомления' },
  { key: 'chats', label: 'Чаты' },
];

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const selectedKey = location.pathname.split('/').filter(Boolean).at(-1);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
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
          Gym Admin
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={selectedKey ? [selectedKey] : []}
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
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
