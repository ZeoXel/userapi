import useSWR from 'swr';
import { useCallback, useState } from 'react';
import { useAdminAuth, useAuthFetcher } from '@/contexts/admin-auth';

export interface ApiKey {
  key: {
    id: string;
    keyPrefix: string;
    name: string | null;
    status: string;
    allowedProviders: string | null;
    quotaType: string;
    quotaLimit: number | null;
    quotaUsed: number;
    lastUsedAt: string | null;
    createdAt: string;
  };
  user: {
    id: string;
    name: string;
  };
}

interface KeysResponse {
  keys: ApiKey[];
}

interface CreateKeyData {
  userId: string;
  name?: string;
  quotaType?: string;
  quotaLimit?: number | null;
}

export function useKeys(userIdFilter?: string | null) {
  const { adminKey, isReady, isAuthenticated } = useAdminAuth();
  const fetcher = useAuthFetcher();
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const shouldFetch = isReady && isAuthenticated;

  const url = userIdFilter
    ? `/api/admin/keys?userId=${userIdFilter}`
    : '/api/admin/keys';

  const { data, error, isLoading, mutate } = useSWR<KeysResponse>(
    shouldFetch ? url : null,
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );

  const createKey = useCallback(async (keyData: CreateKeyData) => {
    try {
      const res = await fetch('/api/admin/keys', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(keyData),
      });

      if (res.ok) {
        const result = await res.json();
        setCreatedKey(result.key.fullKey);
        mutate(); // 刷新列表
        return result.key.fullKey;
      }
      throw new Error('Failed to create key');
    } catch (error) {
      console.error('Failed to create key:', error);
      throw error;
    }
  }, [adminKey, mutate]);

  const revokeKey = useCallback(async (id: string) => {
    // 乐观更新：立即从 UI 移除
    mutate(
      (current) => current ? {
        ...current,
        keys: current.keys.map(k =>
          k.key.id === id ? { ...k, key: { ...k.key, status: 'revoked' } } : k
        ),
      } : current,
      false
    );

    try {
      await fetch(`/api/admin/keys/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminKey}` },
      });
      mutate(); // 重新验证
    } catch (error) {
      console.error('Failed to revoke key:', error);
      mutate(); // 恢复原状态
    }
  }, [adminKey, mutate]);

  const clearCreatedKey = useCallback(() => {
    setCreatedKey(null);
  }, []);

  return {
    keys: data?.keys || [],
    isLoading: !isReady || isLoading,
    error,
    createdKey,
    createKey,
    revokeKey,
    clearCreatedKey,
    refresh: mutate,
  };
}
