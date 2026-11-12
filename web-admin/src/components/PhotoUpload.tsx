import { Button, Image, Space, Upload, message } from 'antd';
import type { UploadProps } from 'antd';
import api from '../api/client';

interface PhotoUploadProps {
  value?: string | null;
  onChange?: (url: string | null) => void;
  alt?: string;
}

export default function PhotoUpload({
  value,
  onChange,
  alt = 'Фото',
}: PhotoUploadProps) {
  const uploadFile: UploadProps['customRequest'] = async ({
    file,
    onSuccess,
    onError,
  }) => {
    const formData = new FormData();
    formData.append('file', file as File);

    try {
      const { data } = await api.post<{ url: string }>('/admin/upload', formData);
      onChange?.(data.url);
      onSuccess?.(data);
    } catch (error) {
      onError?.(error as Error);
      message.error('Не удалось загрузить файл');
    }
  };

  return (
    <Space direction="vertical" size="small">
      <Space>
        <Upload
          accept="image/jpeg,image/png,image/webp"
          showUploadList={false}
          customRequest={uploadFile}
        >
          <Button>Загрузить фото</Button>
        </Upload>
        {value && (
          <Button danger type="link" onClick={() => onChange?.(null)}>
            Удалить
          </Button>
        )}
      </Space>

      {value && (
        <Image
          src={value}
          alt={alt}
          width={96}
          height={96}
          style={{ objectFit: 'cover' }}
        />
      )}
    </Space>
  );
}
