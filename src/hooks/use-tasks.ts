import useSWR from 'swr';
import { useCallback, useState } from 'react';
import { useAdminAuth, useAuthFetcher } from '@/contexts/admin-auth';

export interface Task {
  id: string;
  taskId: string;
  userId: string;
  userName: string | null;
  platform: string;
  action: string;
  status: string;
  progress: string;
  quotaPreConsumed: number;
  quotaActual: number | null;
  failReason: string | null;
  submitTime: string;
  startTime: string | null;
  finishTime: string | null;
  createdAt: string;
}

export interface TaskStats {
  total: number;
  pending: number;
  success: number;
  failure: number;
}

interface TasksResponse {
  data: {
    tasks: Task[];
    total: number;
    stats: TaskStats;
  };
}

interface TaskFilters {
  platform: string;
  status: string;
}

export function useTasks(pageSize: number = 20) {
  const { isReady, isAuthenticated } = useAdminAuth();
  const fetcher = useAuthFetcher();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<TaskFilters>({
    platform: '',
    status: '',
  });

  const shouldFetch = isReady && isAuthenticated;

  const buildUrl = useCallback(() => {
    const params = new URLSearchParams();
    params.set('limit', String(pageSize));
    params.set('offset', String((page - 1) * pageSize));
    if (filters.platform) params.set('platform', filters.platform);
    if (filters.status) params.set('status', filters.status);
    return `/api/admin/tasks?${params}`;
  }, [page, pageSize, filters]);

  const { data, error, isLoading, mutate } = useSWR<TasksResponse>(
    shouldFetch ? buildUrl() : null,
    fetcher,
    {
      revalidateOnFocus: false,
      refreshInterval: 30000, // 自动刷新30秒
    }
  );

  const tasks = data?.data?.tasks || [];
  const total = data?.data?.total || 0;
  const stats = data?.data?.stats || null;
  const totalPages = Math.ceil(total / pageSize);

  const updateFilters = useCallback((newFilters: Partial<TaskFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPage(1); // 重置页码
  }, []);

  const goToPage = useCallback((newPage: number) => {
    setPage(Math.max(1, Math.min(newPage, totalPages)));
  }, [totalPages]);

  return {
    tasks,
    total,
    stats,
    page,
    totalPages,
    filters,
    isLoading: !isReady || isLoading,
    error,
    setPage: goToPage,
    updateFilters,
    refresh: mutate,
  };
}
