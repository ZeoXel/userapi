import useSWR from 'swr';
import { useAdminAuth, useAuthFetcher } from '@/contexts/admin-auth';

export interface UsageStats {
  period: {
    days: number;
    startDate: string;
    endDate: string;
  };
  overview: {
    totalRequests: number;
    successRequests: number;
    failedRequests: number;
    totalCost: number;
    avgLatency: number;
  };
  byProvider: {
    provider: string;
    requests: number;
    successRate: number;
    totalCost: number;
    avgLatency: number;
  }[];
  byUser: {
    userId: string;
    userName: string;
    requests: number;
    totalCost: number;
  }[];
  dailyTrend: {
    date: string;
    requests: number;
    cost: number;
  }[];
  recentLogs: {
    id: string;
    provider: string;
    endpoint: string;
    method: string;
    responseStatus: number;
    latencyMs: number;
    cost: number;
    createdAt: string;
    userName: string;
  }[];
  credits: {
    total: number;
    transactions: number;
    byProvider: {
      provider: string;
      credits: number;
      count: number;
    }[];
    byModel: {
      provider: string;
      model: string;
      credits: number;
      count: number;
    }[];
  };
}

export function useUsage(days: number = 7) {
  const { isReady, isAuthenticated } = useAdminAuth();
  const fetcher = useAuthFetcher();

  const shouldFetch = isReady && isAuthenticated;

  const { data, error, isLoading, mutate } = useSWR<UsageStats>(
    shouldFetch ? `/api/admin/usage?days=${days}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );

  const overview = data?.overview || {
    totalRequests: 0,
    successRequests: 0,
    failedRequests: 0,
    totalCost: 0,
    avgLatency: 0,
  };

  const successRate = overview.totalRequests > 0
    ? ((overview.successRequests / overview.totalRequests) * 100).toFixed(1)
    : '0';

  return {
    stats: data,
    overview,
    successRate,
    byProvider: data?.byProvider || [],
    byUser: data?.byUser || [],
    recentLogs: data?.recentLogs || [],
    credits: data?.credits,
    isLoading: !isReady || isLoading,
    error,
    refresh: mutate,
  };
}
