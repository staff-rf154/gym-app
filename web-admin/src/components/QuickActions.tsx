import { Button, Card, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';

interface QuickAction {
  label: string;
  path: string;
}

const ADMIN_ACTIONS: QuickAction[] = [
  { label: 'Дашборд', path: '/protected/dashboard' },
  { label: 'Залы', path: '/protected/gyms' },
  { label: 'Тренажёры', path: '/protected/equipment' },
  { label: 'Тренеры', path: '/protected/trainers' },
  { label: 'Клиенты', path: '/protected/clients' },
  { label: 'Отчёты', path: '/protected/reports/attendance' },
  { label: 'Чаты', path: '/protected/chats' },
];

const ADMINISTRATOR_ACTIONS: QuickAction[] = [
  { label: 'Клиенты', path: '/protected/administrator/clients' },
  { label: 'Тренеры', path: '/protected/administrator/trainers' },
  { label: 'Отчёты', path: '/protected/reports/attendance' },
  { label: 'Чаты', path: '/protected/chats' },
];

const TRAINER_ACTIONS: QuickAction[] = [
  { label: 'Отчёты', path: '/protected/reports/attendance' },
];

export default function QuickActions() {
  const navigate = useNavigate();
  const role = useAuthStore((state) => state.user?.role);

  const actions =
    role === 'ADMINISTRATOR'
      ? ADMINISTRATOR_ACTIONS
      : role === 'TRAINER'
        ? TRAINER_ACTIONS
        : ADMIN_ACTIONS;

  return (
    <Card size="small" title="Быстрые действия">
      <Space wrap>
        {actions.map((action) => (
          <Button key={action.path} onClick={() => navigate(action.path)}>
            {action.label}
          </Button>
        ))}
      </Space>
    </Card>
  );
}
