import { useState } from 'react';
import {
  Alert,
  Button,
  Drawer,
  Empty,
  Form,
  Input,
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

type ChatType = 'CLIENT_TRAINER' | 'CLIENT_ADMIN' | 'TRAINER_ADMIN';

interface Chat {
  id: string;
  type: ChatType;
  peerId: string;
  peerName: string;
  lastMessage: string | null;
  unreadCount: number;
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
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((state) => state.user?.user_id);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);

  const {
    data: chats = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['chats'],
    queryFn: async () => {
      const { data } = await api.get<Chat[]>('/chats');
      return data;
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
        <Button type="link" onClick={() => setActiveChat(chat)}>
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
      <Typography.Title level={4} style={{ margin: 0 }}>
        Чаты
      </Typography.Title>

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
        <Empty description="Чатов пока нет" />
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
                <Input.TextArea rows={3} placeholder="Введите сообщение" />
              </Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={sendMutation.isPending}
              >
                Отправить
              </Button>
            </Form>
          </Space>
        )}
      </Drawer>
    </Space>
  );
}
