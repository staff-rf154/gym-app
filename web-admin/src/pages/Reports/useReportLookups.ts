import { useQuery } from '@tanstack/react-query';
import api from '../../api/client';
import type { PaginatedResponse } from '../../types/pagination';
import { useAuthStore } from '../../store/auth';

export interface ReportOption {
  id: string;
  name: string;
}

export function useReportLookups() {
  const role = useAuthStore((state) => state.user?.role);
  const isAdmin = role === 'ADMIN';
  const isReception = role === 'RECEPTION';
  const isTrainer = role === 'TRAINER';

  const gymsQuery = useQuery({
    queryKey: ['report-gyms', role],
    enabled: isAdmin || isReception,
    queryFn: async () => {
      if (isReception) {
        const { data } = await api.get<ReportOption>('/reception/gyms');
        return [data];
      }

      const { data } = await api.get<ReportOption[]>('/admin/gyms');
      return data;
    },
  });

  const trainersQuery = useQuery({
    queryKey: ['report-trainers', role],
    enabled: isAdmin || isReception,
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<ReportOption>>(
        isAdmin ? '/admin/trainers' : '/reception/trainers',
        { params: { limit: 100 } },
      );
      return data.items.map((trainer) => ({ id: trainer.id, name: trainer.name }));
    },
  });

  const clientsQuery = useQuery({
    queryKey: ['report-clients', role],
    enabled: isAdmin || isReception || isTrainer,
    queryFn: async () => {
      const path = isAdmin
        ? '/admin/clients'
        : isReception
          ? '/reception/clients'
          : '/trainer/clients';
      if (isTrainer) {
        const { data } = await api.get<ReportOption[]>(path);
        return data.map((client) => ({ id: client.id, name: client.name }));
      }
      const { data } = await api.get<PaginatedResponse<ReportOption>>(path, {
        params: { limit: 100 },
      });
      return data.items.map((client) => ({ id: client.id, name: client.name }));
    },
  });

  return {
    role,
    isAdmin,
    isReception,
    isTrainer,
    gyms: gymsQuery.data ?? [],
    trainers: trainersQuery.data ?? [],
    clients: clientsQuery.data ?? [],
  };
}
