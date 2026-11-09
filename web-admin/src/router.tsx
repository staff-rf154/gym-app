import { Navigate, Outlet, createBrowserRouter } from 'react-router-dom';
import { Typography } from 'antd';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import GymsPage from './pages/Gyms';
import EquipmentPage from './pages/Equipment';
import ExercisesPage from './pages/Exercises';
import FoodProductsPage from './pages/FoodProducts';
import ClientsPage from './pages/Clients';
import ClientWeightPage from './pages/ClientWeight';
import TrainersPage from './pages/Trainers';
import MainLayout from './layouts/MainLayout';
import { useAuthStore } from './store/auth';

function ProtectedRoute() {
  const access = useAuthStore((state) => state.access);

  if (!access) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

function PlaceholderPage() {
  return <Typography.Text type="secondary">Раздел в разработке</Typography.Text>;
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/protected',
    element: <ProtectedRoute />,
    children: [
      {
        element: <MainLayout />,
        children: [
          {
            index: true,
            element: <Navigate to="/protected/dashboard" replace />,
          },
          {
            path: 'dashboard',
            element: <Dashboard />,
          },
          {
            path: 'trainers',
            element: <TrainersPage />,
          },
          {
            path: 'clients',
            element: <ClientsPage />,
          },
          {
            path: 'clients/:id/weight',
            element: <ClientWeightPage />,
          },
          {
            path: 'gyms',
            element: <GymsPage />,
          },
          {
            path: 'gyms/:id/equipment',
            element: <EquipmentPage />,
          },
          {
            path: 'equipment',
            element: <PlaceholderPage />,
          },
          {
            path: 'exercises',
            element: <ExercisesPage />,
          },
          {
            path: 'products',
            element: <FoodProductsPage />,
          },
          {
            path: 'notifications',
            element: <PlaceholderPage />,
          },
          {
            path: 'chats',
            element: <PlaceholderPage />,
          },
        ],
      },
    ],
  },
  {
    path: '/',
    element: <Navigate to="/protected/dashboard" replace />,
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
