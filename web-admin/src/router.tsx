import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Navigate, Outlet, createBrowserRouter } from 'react-router-dom';
import { Spin } from 'antd';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import GymsPage from './pages/Gyms';
import EquipmentPage from './pages/Equipment';
import ExercisesPage from './pages/Exercises';
import FoodProductsPage from './pages/FoodProducts';
import ClientsPage from './pages/Clients';
import ClientWeightPage from './pages/ClientWeight';
import TrainersPage from './pages/Trainers';
import NotificationsPage from './pages/Notifications';
import ChatsPage from './pages/Chats';
import SettingsPage from './pages/Settings';
import Forbidden from './pages/Forbidden';
import ReceptionsPage from './pages/Receptions';
import GoalsPage from './pages/Goals';
import AttendanceReportPage from './pages/Reports/Attendance';
import EquipmentUsageReportPage from './pages/Reports/Equipment';
import TrainersReportPage from './pages/Reports/Trainers';
import ReceptionClientsPage from './pages/reception/Clients';
import ReceptionTrainersPage from './pages/reception/Trainers';
import MainLayout from './layouts/MainLayout';
import api, { refreshAccessToken } from './api/client';
import { useAuthStore, type AuthUser } from './store/auth';

const ALLOWED_ROLES = ['ADMIN', 'RECEPTION', 'TRAINER'];
const ADMIN_HOME = '/protected/dashboard';
const RECEPTION_HOME = '/protected/reception/clients';
const TRAINER_HOME = '/protected/reports/attendance';

function homeFor(role: string | undefined) {
  if (role === 'RECEPTION') {
    return RECEPTION_HOME;
  }

  if (role === 'TRAINER') {
    return TRAINER_HOME;
  }

  return ADMIN_HOME;
}

function HomeRedirect() {
  const role = useAuthStore((state) => state.user?.role);
  return <Navigate to={homeFor(role)} replace />;
}

function RoleRoute({
  roles,
  children,
}: {
  roles: string[];
  children: ReactNode;
}) {
  const user = useAuthStore((state) => state.user);

  if (!user) {
    return <Spin fullscreen />;
  }

  if (!roles.includes(user.role)) {
    return <Navigate to={homeFor(user.role)} replace />;
  }

  return <>{children}</>;
}

function ProtectedRoute() {
  const access = useAuthStore((state) => state.access);
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const logout = useAuthStore((state) => state.logout);
  const bootstrapped = useRef(false);
  const [checking, setChecking] = useState(!access);

  useEffect(() => {
    if (bootstrapped.current) {
      return;
    }

    bootstrapped.current = true;

    if (access && user) {
      setChecking(false);
      return;
    }

    let cancelled = false;

    const bootstrap = async () => {
      try {
        if (!access) {
          await refreshAccessToken();
        }

        const me = await api.get<AuthUser>('/auth/me');

        if (!cancelled) {
          setUser(me.data);
        }
      } catch {
        if (!cancelled) {
          logout();
        }
      } finally {
        if (!cancelled) {
          setChecking(false);
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [access, logout, setUser, user]);

  if (checking) {
    return <Spin fullscreen />;
  }

  if (!useAuthStore.getState().access) {
    return <Navigate to="/login" replace />;
  }

  if (user && !ALLOWED_ROLES.includes(user.role)) {
    return <Forbidden />;
  }

  return <Outlet />;
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
            element: <HomeRedirect />,
          },
          {
            path: 'dashboard',
            element: (
              <RoleRoute roles={['ADMIN']}>
                <Dashboard />
              </RoleRoute>
            ),
          },
          {
            path: 'trainers',
            element: (
              <RoleRoute roles={['ADMIN']}>
                <TrainersPage />
              </RoleRoute>
            ),
          },
          {
            path: 'clients',
            element: (
              <RoleRoute roles={['ADMIN']}>
                <ClientsPage />
              </RoleRoute>
            ),
          },
          {
            path: 'clients/:id/weight',
            element: (
              <RoleRoute roles={['ADMIN']}>
                <ClientWeightPage />
              </RoleRoute>
            ),
          },
          {
            path: 'goals',
            element: (
              <RoleRoute roles={['ADMIN']}>
                <GoalsPage />
              </RoleRoute>
            ),
          },
          {
            path: 'reports/attendance',
            element: (
              <RoleRoute roles={['ADMIN', 'RECEPTION', 'TRAINER']}>
                <AttendanceReportPage />
              </RoleRoute>
            ),
          },
          {
            path: 'reports/equipment',
            element: (
              <RoleRoute roles={['ADMIN', 'RECEPTION', 'TRAINER']}>
                <EquipmentUsageReportPage />
              </RoleRoute>
            ),
          },
          {
            path: 'reports/trainers',
            element: (
              <RoleRoute roles={['ADMIN', 'RECEPTION', 'TRAINER']}>
                <TrainersReportPage />
              </RoleRoute>
            ),
          },
          {
            path: 'gyms',
            element: (
              <RoleRoute roles={['ADMIN']}>
                <GymsPage />
              </RoleRoute>
            ),
          },
          {
            path: 'gyms/:id/equipment',
            element: (
              <RoleRoute roles={['ADMIN']}>
                <EquipmentPage />
              </RoleRoute>
            ),
          },
          {
            path: 'equipment',
            element: (
              <RoleRoute roles={['ADMIN']}>
                <EquipmentPage />
              </RoleRoute>
            ),
          },
          {
            path: 'exercises',
            element: (
              <RoleRoute roles={['ADMIN']}>
                <ExercisesPage />
              </RoleRoute>
            ),
          },
          {
            path: 'products',
            element: (
              <RoleRoute roles={['ADMIN']}>
                <FoodProductsPage />
              </RoleRoute>
            ),
          },
          {
            path: 'notifications',
            element: (
              <RoleRoute roles={['ADMIN']}>
                <NotificationsPage />
              </RoleRoute>
            ),
          },
          {
            path: 'chats',
            element: (
              <RoleRoute roles={['ADMIN']}>
                <ChatsPage />
              </RoleRoute>
            ),
          },
          {
            path: 'settings',
            element: (
              <RoleRoute roles={['ADMIN']}>
                <SettingsPage />
              </RoleRoute>
            ),
          },
          {
            path: 'receptions',
            element: (
              <RoleRoute roles={['ADMIN']}>
                <ReceptionsPage />
              </RoleRoute>
            ),
          },
          {
            path: 'reception/clients',
            element: (
              <RoleRoute roles={['RECEPTION']}>
                <ReceptionClientsPage />
              </RoleRoute>
            ),
          },
          {
            path: 'reception/trainers',
            element: (
              <RoleRoute roles={['RECEPTION']}>
                <ReceptionTrainersPage />
              </RoleRoute>
            ),
          },
        ],
      },
    ],
  },
  {
    path: '/',
    element: <Navigate to="/protected" replace />,
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
