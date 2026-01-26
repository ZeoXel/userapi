import useSWR from 'swr';
import { useAdminAuth, useAuthFetcher } from '@/contexts/admin-auth';

export interface DashboardData {
  stats: {
    users: { total: number; active: number };
    keys: { total: number; active: number };
    credits: { total: number; used: number; remaining: number };
    today: { consumption: number; transactions: number };
  };
  providers: { id: string; name: string; configured: boolean }[];
  recentTransactions: {
    id: string;
    type: string;
    amount: number;
    service: string | null;
    provider: string | null;
    model: string | null;
    createdAt: string;
    userName: string;
  }[];
}

export function useDashboard() {
  const { isReady, isAuthenticated } = useAdminAuth();
  const fetcher = useAuthFetcher();

  // 只有在 session 加载完成且已认证时才请求
  const shouldFetch = isReady && isAuthenticated;

  const { data, error, isLoading, mutate } = useSWR<DashboardData>(
    shouldFetch ? '/api/admin/dashboard' : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000,
    }
  );

  return {
    data,
    stats: data?.stats,
    providers: data?.providers || [],
    recentTransactions: data?.recentTransactions || [],
    isLoading: !isReady || isLoading,
    error,
    refresh: mutate,
  };
}
