import { Button, Result } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';

export default function Forbidden() {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);

  const handleBack = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <Result
      status="403"
      title="403"
      subTitle="Недостаточно прав для доступа к разделу"
      extra={
        <Button type="primary" onClick={handleBack}>
          На страницу входа
        </Button>
      }
    />
  );
}
