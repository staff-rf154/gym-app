import { useState } from 'react';
import {
  Alert,
  Button,
  Drawer,
  Empty,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import api from '../../api/client';
import { useAuthStore } from '../../store/auth';
import type { PaginatedResponse } from '../../types/pagination';

type ChatType = 'CLIENT_TRAINER' | 'CLIENT_ADMIN' | 'TRAINER_ADMIN';

interface Chat {
  id: string;
  type: ChatType;
  peerId: string;
  peerName: string;
  lastMessage: string | null;
  unreadCount: number;
  isBlocked: boolean;
}

interface PeerOption {
  id: string;
  name: string;
}

interface CreateChatFormValues {
  type: 'CLIENT_ADMIN' | 'TRAINER_ADMIN';
  peer_id: string;
}

interface Message {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  attachmentUrl: string | null;
  createdAt: string;
  readAt: string | null;
}

interface MessageFormValues {
  text: string;
}

const TYPE_LABELS: Record<ChatType, string> = {
  CLIENT_TRAINER: 'Клиент ↔ тренер',
  CLIENT_ADMIN: 'Клиент ↔ админ',
  TRAINER_ADMIN: 'Тренер ↔ админ',
};

export default function ChatsPage() {
  const [form] = Form.useForm<MessageFormValues>();
  const [createForm] = Form.useForm<CreateChatFormValues>();
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((state) => state.user?.user_id);
  const currentRole = useAuthStore((state) => state.user?.role);
  const isAdmin = currentRole === 'ADMIN';
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createType, setCreateType] =
    useState<CreateChatFormValues['type']>('CLIENT_ADMIN');

  const { data: clients = [] } = useQuery({
    queryKey: ['chat-clients'],
    enabled: isAdmin,
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<PeerOption>>(
        '/admin/clients',
        { params: { limit: 100 } },
      );
      return data.items;
    },
  });

  const { data: trainers = [] } = useQuery({
    queryKey: ['chat-trainers'],
    enabled: isAdmin,
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<PeerOption>>(
        '/admin/trainers',
        { params: { limit: 100 } },
      );
      return data.items;
    },
  });

  const createChatMutation = useMutation({
    mutationFn: async (values: CreateChatFormValues) => {
      const { data } = await api.post<Chat>('/chats', {
        type: values.type,
        ...(values.type === 'CLIENT_ADMIN'
          ? { client_id: values.peer_id }
          : { trainer_id: values.peer_id }),
      });
      return data;
    },
    onSuccess: (chat) => {
      setCreateOpen(false);
      createForm.resetFields();
      setActiveChat(chat);
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
    onError: () => message.error('Не удалось создать чат'),
  });

  const markReadMutation = useMutation({
    mutationFn: async (chatId: string) => {
      await api.post(`/chats/${chatId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
  });

  const openChat = (chat: Chat) => {
    setActiveChat(chat);
    if (chat.unreadCount > 0) {
      markReadMutation.mutate(chat.id);
    }
  };

  const {
    data: chats = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['chats'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Chat>>('/chats', { params: { limit: 100 } });
      return data.items;
    },
    refetchInterval: 10000,
  });

  const {
    data: messages = [],
    isLoading: messagesLoading,
    isError: messagesError,
    refetch: refetchMessages,
  } = useQuery({
    queryKey: ['chat-messages', activeChat?.id],
    enabled: Boolean(activeChat),
    queryFn: async () => {
      const { data } = await api.get<Message[]>(
        `/chats/${activeChat?.id}/messages`,
        { params: { limit: 50 } },
      );
      return data;
    },
    refetchInterval: activeChat ? 5000 : false,
  });

  const sendMutation = useMutation({
    mutationFn: async (text: string) => {
      const { data } = await api.post(`/chats/${activeChat?.id}/messages`, {
        text,
      });
      return data;
    },
    onSuccess: () => {
      form.resetFields();
      queryClient.invalidateQueries({
        queryKey: ['chat-messages', activeChat?.id],
      });
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
    onError: () => message.error('Не удалось отправить сообщение'),
  });

  const columns: ColumnsType<Chat> = [
    {
      title: 'Собеседник',
      dataIndex: 'peerName',
      key: 'peerName',
      render: (value: string) => value || '—',
    },
    {
      title: 'Тип',
      dataIndex: 'type',
      key: 'type',
      render: (type: ChatType) => <Tag>{TYPE_LABELS[type] ?? type}</Tag>,
    },
    {
      title: 'Последнее сообщение',
      dataIndex: 'lastMessage',
      key: 'lastMessage',
      render: (value: string | null) => value || '—',
    },
    {
      title: 'Непрочитанных',
      dataIndex: 'unreadCount',
      key: 'unreadCount',
      width: 140,
    },
    {
      title: '',
      key: 'actions',
      width: 100,
      render: (_, chat) => (
        <Button type="link" onClick={() => openChat(chat)}>
          Открыть
        </Button>
      ),
    },
  ];

  const closeDrawer = () => {
    setActiveChat(null);
    form.resetFields();
  };

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Space
        align="center"
        style={{ width: '100%', justifyContent: 'space-between' }}
      >
        <Typography.Title level={4} style={{ margin: 0 }}>
          Чаты
        </Typography.Title>
        {isAdmin && (
          <Button type="primary" onClick={() => setCreateOpen(true)}>
            Новый чат
          </Button>
        )}
      </Space>

      {isError && (
        <Alert
          type="error"
          showIcon
          message="Не удалось загрузить чаты"
          action={
            <Button size="small" onClick={() => void refetch()}>
              Повторить
            </Button>
          }
        />
      )}

      {!isLoading && !isError && chats.length === 0 ? (
        <Empty description="Чатов пока нет">
          {isAdmin && (
            <Button type="primary" onClick={() => setCreateOpen(true)}>
              Начать чат
            </Button>
          )}
        </Empty>
      ) : (
        <Table<Chat>
          rowKey="id"
          columns={columns}
          dataSource={chats}
          loading={isLoading}
          pagination={false}
        />
      )}

      <Drawer
        title={activeChat ? activeChat.peerName : 'Чат'}
        open={Boolean(activeChat)}
        onClose={closeDrawer}
        width={560}
      >
        {activeChat && (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {activeChat.isBlocked && (
              <Alert
                type="warning"
                showIcon
                message="Переписка заблокирована: нет будущей тренировки и прошло более 10 дней с последней."
              />
            )}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                maxHeight: 420,
                overflowY: 'auto',
                width: '100%',
              }}
            >
              {messagesError ? (
                <Alert
                  type="error"
                  showIcon
                  message="Не удалось загрузить сообщения"
                  action={
                    <Button
                      size="small"
                      onClick={() => void refetchMessages()}
                    >
                      Повторить
                    </Button>
                  }
                />
              ) : messagesLoading ? (
                <Typography.Text type="secondary">Загрузка…</Typography.Text>
              ) : messages.length === 0 ? (
                <Typography.Text type="secondary">
                  Сообщений пока нет
                </Typography.Text>
              ) : (
                messages.map((item) => {
                  const own = item.senderId === currentUserId;
                  return (
                    <div
                      key={item.id}
                      style={{
                        alignSelf: own ? 'flex-end' : 'flex-start',
                        maxWidth: '80%',
                        background: own ? '#e6f4ff' : '#f5f5f5',
                        borderRadius: 8,
                        padding: '8px 12px',
                      }}
                    >
                      <div>{item.text}</div>
                      {item.attachmentUrl && (
                        <div>
                          <Typography.Link
                            href={item.attachmentUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Вложение
                          </Typography.Link>
                        </div>
                      )}
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {dayjs(item.createdAt).format('DD.MM.YYYY HH:mm')}
                      </Typography.Text>
                    </div>
                  );
                })
              )}
            </div>

            <Form<MessageFormValues>
              form={form}
              layout="vertical"
              onFinish={(values) => sendMutation.mutate(values.text)}
            >
              <Form.Item
                name="text"
                rules={[{ required: true, message: 'Введите сообщение' }]}
              >
                <Input.TextArea
                  rows={3}
                  placeholder="Введите сообщение"
                  disabled={activeChat.isBlocked}
                />
              </Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={sendMutation.isPending}
                disabled={activeChat.isBlocked}
              >
                Отправить
              </Button>
            </Form>
          </Space>
        )}
      </Drawer>

      <Modal
        title="Новый чат"
        open={createOpen}
        onCancel={() => {
          setCreateOpen(false);
          createForm.resetFields();
        }}
        onOk={() => createForm.submit()}
        confirmLoading={createChatMutation.isPending}
        okText="Создать"
      >
        <Form<CreateChatFormValues>
          form={createForm}
          layout="vertical"
          initialValues={{ type: 'CLIENT_ADMIN' }}
          onFinish={(values) => createChatMutation.mutate(values)}
        >
          <Form.Item name="type" label="Собеседник" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'CLIENT_ADMIN', label: 'Клиент' },
                { value: 'TRAINER_ADMIN', label: 'Тренер' },
              ]}
              onChange={(value: CreateChatFormValues['type']) => {
                setCreateType(value);
                createForm.setFieldValue('peer_id', undefined);
              }}
            />
          </Form.Item>
          <Form.Item
            name="peer_id"
            label={createType === 'CLIENT_ADMIN' ? 'Клиент' : 'Тренер'}
            rules={[{ required: true, message: 'Выберите собеседника' }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Начните вводить имя"
              options={(createType === 'CLIENT_ADMIN' ? clients : trainers).map(
                (item) => ({ value: item.id, label: item.name }),
              )}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
