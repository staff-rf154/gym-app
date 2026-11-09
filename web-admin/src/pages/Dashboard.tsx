import { Card, Typography } from 'antd';

export default function Dashboard() {
  return (
    <Card>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        Dashboard
      </Typography.Title>
      <Typography.Text type="secondary">
        Раздел находится в разработке
      </Typography.Text>
    </Card>
  );
}
