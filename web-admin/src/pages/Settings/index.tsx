import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Form,
  InputNumber,
  Popconfirm,
  Select,
  Space,
  Tag,
  Typography,
  Upload,
  message,
} from 'antd';
import type { UploadFile } from 'antd';
import axios from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../api/client';
import { useAuthStore, type AuthUser } from '../../store/auth';
import { TIMEZONES } from '../../constants/options';

interface SettingsFormValues {
  timezone: string;
}

interface ServerCertificateInfo {
  source: 'builtin' | 'uploaded';
  subject: string;
  issuer: string;
  validFrom: string;
  validTo: string;
  daysLeft: number;
  subjectAltName: string;
  fingerprint256: string;
}

interface ServerSettings {
  port: number;
  activePort: number;
  restartRequired: boolean;
  certificate: ServerCertificateInfo | null;
  reservedPorts: number[];
  reloadSeconds: number;
  updatedAt: string | null;
}

interface DemoStatus {
  loaded: boolean;
  gyms: number;
  trainers: number;
  clients: number;
  administrators: number;
  workouts: number;
}

interface DemoLoadResult extends DemoStatus {
  equipment: number;
  exercises: number;
  templates: number;
  defaultEquipment: number;
  defaultExercises: number;
  defaultTemplates: number;
  measurements: number;
  nutrition: number;
}

export default function SettingsPage() {
  const [form] = Form.useForm<SettingsFormValues>();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const queryClient = useQueryClient();
  const [serverForm] = Form.useForm<{ port: number }>();
  const [certificateFile, setCertificateFile] = useState<UploadFile | null>(
    null,
  );
  const [privateKeyFile, setPrivateKeyFile] = useState<UploadFile | null>(null);

  const { data: serverSettings, isLoading: isServerSettingsLoading } = useQuery({
    queryKey: ['server', 'settings'],
    queryFn: async () => {
      const { data } = await api.get<ServerSettings>('/admin/server/settings');
      return data;
    },
  });

  const applyServerSettings = (data: ServerSettings) => {
    queryClient.setQueryData(['server', 'settings'], data);
    serverForm.setFieldsValue({ port: data.port });
  };

  const showServerError = (error: unknown, fallback: string) => {
    if (axios.isAxiosError(error) && error.response?.data?.message) {
      const serverMessage = error.response.data.message;
      message.error(
        Array.isArray(serverMessage)
          ? serverMessage.join(', ')
          : String(serverMessage),
      );
      return;
    }
    message.error(fallback);
  };

  const portMutation = useMutation({
    mutationFn: async (port: number) => {
      const { data } = await api.patch<ServerSettings>(
        '/admin/server/settings',
        { port },
      );
      return data;
    },
    onSuccess: (data) => {
      applyServerSettings(data);
      if (data.restartRequired) {
        message.warning(
          `Порт ${data.port} сохранён. Выполните make apply-server для перезапуска web-admin.`,
        );
      } else {
        message.success('Порт сохранён');
      }
    },
    onError: (error) =>
      showServerError(error, 'Не удалось сохранить порт сервера'),
  });

  const certificateMutation = useMutation({
    mutationFn: async () => {
      const cert = certificateFile?.originFileObj;
      const key = privateKeyFile?.originFileObj;

      if (!cert || !key) {
        throw new Error('Выберите сертификат и приватный ключ');
      }

      const formData = new FormData();
      formData.append('certificate', cert as File);
      formData.append('privateKey', key as File);

      const { data } = await api.post<ServerSettings>(
        '/admin/server/certificate',
        formData,
      );
      return data;
    },
    onSuccess: (data) => {
      applyServerSettings(data);
      setCertificateFile(null);
      setPrivateKeyFile(null);
      message.success(
        `Сертификат загружен, nginx применит его в течение ${data.reloadSeconds} с`,
      );
    },
    onError: (error) =>
      showServerError(error, 'Не удалось загрузить сертификат'),
  });

  const resetCertificateMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<ServerSettings>(
        '/admin/server/certificate/reset',
      );
      return data;
    },
    onSuccess: (data) => {
      applyServerSettings(data);
      message.success('Возвращён встроенный сертификат *.staff-rf.ru');
    },
    onError: (error) =>
      showServerError(error, 'Не удалось вернуть встроенный сертификат'),
  });

  useEffect(() => {
    if (serverSettings) {
      serverForm.setFieldsValue({ port: serverSettings.port });
    }
  }, [serverSettings, serverForm]);

  const { data: demoStatus, isLoading: isDemoStatusLoading } = useQuery({
    queryKey: ['demo', 'status'],
    queryFn: async () => {
      const { data } = await api.get<DemoStatus>('/admin/demo/status');
      return data;
    },
  });

  const demoLoaded = demoStatus?.loaded ?? false;

  const demoLoadMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<DemoLoadResult>('/admin/demo/load');
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries();
      message.success(
        `Демо-данные загружены: ${data.clients} клиентов, ${data.workouts} тренировок, ${data.defaultTemplates} общих шаблонов`,
      );
    },
    onError: (error: unknown) => {
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        message.error(String(error.response.data.message));
        return;
      }
      message.error('Не удалось загрузить демо-данные');
    },
  });

  const demoClearMutation = useMutation({
    mutationFn: async () => {
      await api.delete('/admin/demo');
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      message.success('Демо-данные очищены');
    },
    onError: () => message.error('Не удалось очистить демо-данные'),
  });

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

      <Card
        title="HTTPS-сервер"
        size="small"
        style={{ maxWidth: 760 }}
        loading={isServerSettingsLoading}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
            Web-admin и API отдаются по HTTPS. Сертификат применяется без
            перезапуска контейнера; новый порт — после перезапуска web-admin.
          </Typography.Paragraph>

          <Form
            form={serverForm}
            layout="inline"
            onFinish={(values) => portMutation.mutate(values.port)}
          >
            <Form.Item
              name="port"
              label="Порт HTTPS"
              rules={[
                { required: true, message: 'Укажите порт' },
                {
                  validator: (_, value: number | undefined) => {
                    if (
                      value &&
                      serverSettings?.reservedPorts.includes(value)
                    ) {
                      return Promise.reject(
                        new Error('Порт занят внутренним сервисом'),
                      );
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <InputNumber min={1} max={65535} style={{ width: 160 }} />
            </Form.Item>
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={portMutation.isPending}
              >
                Сохранить порт
              </Button>
            </Form.Item>
          </Form>

          {serverSettings?.restartRequired ? (
            <Alert
              type="warning"
              showIcon
              message={`Сохранён порт ${serverSettings.port}, сейчас активен ${serverSettings.activePort}`}
              description={
                <>
                  Выполните на сервере{' '}
                  <Typography.Text code>make apply-server</Typography.Text>,
                  затем откройте web-admin на новом порту.
                </>
              }
            />
          ) : null}

          {serverSettings?.certificate ? (
            <Descriptions
              title="Текущий сертификат"
              size="small"
              column={1}
              bordered
            >
              <Descriptions.Item label="Источник">
                <Tag
                  color={
                    serverSettings.certificate.source === 'uploaded'
                      ? 'blue'
                      : 'green'
                  }
                >
                  {serverSettings.certificate.source === 'uploaded'
                    ? 'Загружен через web-admin'
                    : 'Встроенный *.staff-rf.ru'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Субъект">
                {serverSettings.certificate.subject}
              </Descriptions.Item>
              <Descriptions.Item label="Издатель">
                {serverSettings.certificate.issuer}
              </Descriptions.Item>
              <Descriptions.Item label="Действует до">
                {new Date(
                  serverSettings.certificate.validTo,
                ).toLocaleDateString('ru-RU')}{' '}
                (осталось {serverSettings.certificate.daysLeft} дн.)
              </Descriptions.Item>
              <Descriptions.Item label="SAN">
                {serverSettings.certificate.subjectAltName || '—'}
              </Descriptions.Item>
            </Descriptions>
          ) : (
            <Alert
              type="error"
              showIcon
              message="Сертификат не найден"
              description="Проверьте каталог ssl/staff-rf или загрузите cert/key."
            />
          )}

          <Space direction="vertical" size="small">
            <Upload
              accept=".pem,.crt,.cer"
              maxCount={1}
              beforeUpload={() => false}
              fileList={certificateFile ? [certificateFile] : []}
              onChange={({ fileList }) =>
                setCertificateFile(fileList[0] ?? null)
              }
              onRemove={() => {
                setCertificateFile(null);
                return true;
              }}
            >
              <Button>Выбрать сертификат</Button>
            </Upload>

            <Upload
              accept=".pem,.key"
              maxCount={1}
              beforeUpload={() => false}
              fileList={privateKeyFile ? [privateKeyFile] : []}
              onChange={({ fileList }) =>
                setPrivateKeyFile(fileList[0] ?? null)
              }
              onRemove={() => {
                setPrivateKeyFile(null);
                return true;
              }}
            >
              <Button>Выбрать приватный ключ</Button>
            </Upload>

            <Space wrap>
              <Button
                type="primary"
                onClick={() => certificateMutation.mutate()}
                loading={certificateMutation.isPending}
                disabled={!certificateFile || !privateKeyFile}
              >
                Загрузить сертификат
              </Button>

              <Popconfirm
                title="Вернуть встроенный сертификат?"
                description="Загруженные файлы будут удалены, nginx применит сертификат *.staff-rf.ru."
                okText="Вернуть"
                cancelText="Отмена"
                onConfirm={() => resetCertificateMutation.mutate()}
                disabled={
                  serverSettings?.certificate?.source !== 'uploaded' ||
                  resetCertificateMutation.isPending
                }
              >
                <Button
                  danger
                  disabled={
                    serverSettings?.certificate?.source !== 'uploaded' ||
                    resetCertificateMutation.isPending
                  }
                  loading={resetCertificateMutation.isPending}
                >
                  Вернуть встроенный
                </Button>
              </Popconfirm>
            </Space>
          </Space>
        </Space>
      </Card>

      <Card title="Демо-данные" size="small" style={{ maxWidth: 640 }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
            3 зала с разными тренажёрами, 6 тренеров, 20 клиентов и 3 месяца
            тренировок с результатами, замерами веса и рекомендациями по
            питанию.
          </Typography.Paragraph>

          <Space wrap>
            <Tag color={demoLoaded ? 'green' : 'default'}>
              {demoLoaded ? 'Загружены' : 'Не загружены'}
            </Tag>
            {demoLoaded && demoStatus ? (
              <Typography.Text type="secondary">
                Залы: {demoStatus.gyms}, тренеры: {demoStatus.trainers}, клиенты:{' '}
                {demoStatus.clients}, администраторы: {demoStatus.administrators},
                тренировки: {demoStatus.workouts}
              </Typography.Text>
            ) : null}
          </Space>

          <Space wrap>
            <Popconfirm
              title="Загрузить демо-данные?"
              description="Будут созданы залы, тренеры, клиенты и тренировки за 3 месяца."
              okText="Загрузить"
              cancelText="Отмена"
              onConfirm={() => demoLoadMutation.mutate()}
              disabled={demoLoaded}
            >
              <Button
                type="primary"
                loading={demoLoadMutation.isPending}
                disabled={demoLoaded || isDemoStatusLoading}
              >
                Загрузить демо-данные
              </Button>
            </Popconfirm>

            <Popconfirm
              title="Очистить демо-данные?"
              description="Будут удалены только демонстрационные залы, тренеры, клиенты и тренировки."
              okText="Очистить"
              cancelText="Отмена"
              okButtonProps={{ danger: true }}
              onConfirm={() => demoClearMutation.mutate()}
              disabled={!demoLoaded}
            >
              <Button
                danger
                loading={demoClearMutation.isPending}
                disabled={!demoLoaded || isDemoStatusLoading}
              >
                Очистить демо-данные
              </Button>
            </Popconfirm>
          </Space>

          <Typography.Text type="secondary">
            Демо-аккаунты: тренеры +79995550001–+79995550006, клиенты
            +79995550101–+79995550120, администраторы +79995550201–+79995550203.
            Пароль — значение переменной DEFAULT_CLIENT_PASSWORD.
          </Typography.Text>
        </Space>
      </Card>
    </Space>
  );
}
