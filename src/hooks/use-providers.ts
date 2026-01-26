import useSWR from 'swr';
import { useState, useCallback } from 'react';
import { useAdminAuth, useAuthFetcher } from '@/contexts/admin-auth';

export interface Provider {
  id: string;
  name: string;
  description?: string;
  base_url: string;
  auth: {
    type: string;
    header: string;
    prefix: string;
    env_key: string;
    configured: boolean;
  };
}

export interface TestResult {
  id: string;
  status: 'success' | 'error' | 'skipped';
  latency?: number;
  error?: string;
}

interface ProvidersResponse {
  providers: Provider[];
}

export function useProviders() {
  const { adminKey, isReady, isAuthenticated } = useAdminAuth();
  const fetcher = useAuthFetcher();
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [testing, setTesting] = useState(false);

  const shouldFetch = isReady && isAuthenticated;

  const { data, error, isLoading, mutate } = useSWR<ProvidersResponse>(
    shouldFetch ? '/api/admin/providers' : null,
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );

  const testConnections = useCallback(async () => {
    if (!isAuthenticated) return;

    setTesting(true);
    setTestResults({});

    try {
      const res = await fetch('/api/admin/providers/test', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminKey}` },
      });
      if (res.ok) {
        const result = await res.json();
        const results: Record<string, TestResult> = {};
        for (const r of result.results) {
          results[r.id] = r;
        }
        setTestResults(results);
      }
    } catch (err) {
      console.error('Test failed:', err);
    } finally {
      setTesting(false);
    }
  }, [adminKey, isAuthenticated]);

  return {
    providers: data?.providers || [],
    isLoading: !isReady || isLoading,
    error,
    testResults,
    testing,
    testConnections,
    refresh: mutate,
  };
}
