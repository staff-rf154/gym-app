import { Drawer, Space, Switch, Table, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';

interface GymOption {
  id: string;
  name: string;
  address: string;
}

interface GymLink {
  id: string;
  gymId: string;
  gymName: string;
  isActive: boolean;
}

interface GymRow {
  id: string;
  name: string;
  address: string;
  link: GymLink | null;
}

interface GymsDrawerProps {
  open: boolean;
  onClose: () => void;
  kind: 'trainer' | 'client';
  entityId: string;
  entityName: string;
  invalidateKey: string[];
}

export default function GymsDrawer({
  open,
  onClose,
  kind,
  entityId,
  entityName,
  invalidateKey,
}: GymsDrawerProps) {
  const queryClient = useQueryClient();

  const { data: gyms = [], isLoading: gymsLoading } = useQuery({
    queryKey: ['gyms'],
    enabled: open,
    queryFn: async () => {
      const { data } = await api.get<GymOption[]>('/admin/gyms');
      return data;
    },
  });

  const { data: links = [], isLoading: linksLoading } = useQuery({
    queryKey: ['gym-links', kind, entityId],
    enabled: open,
    queryFn: async () => {
      const { data } = await api.get<GymLink[]>(
        `/admin/${kind === 'trainer' ? 'trainers' : 'clients'}/${entityId}/gyms`,
      );
      return data;
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: ['gym-links', kind, entityId],
    });
    queryClient.invalidateQueries({ queryKey: invalidateKey });
  };

  const linkMutation = useMutation({
    mutationFn: (gymId: string) =>
      api.post(
        `/admin/${kind === 'trainer' ? 'trainers' : 'clients'}/${entityId}/gyms`,
        { gym_id: gymId },
      ),
    onSuccess: invalidate,
    onError: () => message.error('Не удалось привязать зал'),
  });

  const unlinkMutation = useMutation({
    mutationFn: (gymId: string) =>
      api.delete(
        `/admin/${kind === 'trainer' ? 'trainers' : 'clients'}/${entityId}/gyms/${gymId}`,
      ),
    onSuccess: invalidate,
    onError: () => message.error('Не удалось отвязать зал'),
  });

  const rows: GymRow[] = gyms.map((gym) => ({
    ...gym,
    link: links.find((link) => link.gymId === gym.id && link.isActive) ?? null,
  }));

  const columns: ColumnsType<GymRow> = [
    { title: 'Зал', dataIndex: 'name', key: 'name' },
    { title: 'Адрес', dataIndex: 'address', key: 'address' },
    {
      title: 'Активен',
      key: 'isActive',
      width: 120,
      render: (_, row) =>
        row.link ? <Tag color="green">Да</Tag> : <Tag>Нет</Tag>,
    },
    {
      title: '',
      key: 'actions',
      width: 110,
      render: (_, row) => (
        <Switch
          checked={Boolean(row.link)}
          loading={linkMutation.isPending || unlinkMutation.isPending}
          onChange={(checked) => {
            if (checked) {
              linkMutation.mutate(row.id);
            } else {
              unlinkMutation.mutate(row.id);
            }
          }}
        />
      ),
    },
  ];

  return (
    <Drawer
      title={`Залы: ${entityName}`}
      open={open}
      onClose={onClose}
      width={560}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Table<GymRow>
          rowKey="id"
          size="small"
          pagination={false}
          columns={columns}
          dataSource={rows}
          loading={gymsLoading || linksLoading}
        />
      </Space>
    </Drawer>
  );
}
