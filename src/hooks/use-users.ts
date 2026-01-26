import useSWR from 'swr';
import { useCallback } from 'react';
import { useAdminAuth, useAuthFetcher } from '@/contexts/admin-auth';

export interface ApiKeyInfo {
  id: string;
  keyPrefix: string;
  status: string;
  quotaType: string;
  quotaUsed: number | null;
  quotaLimit: number | null;
  lastUsedAt: string | null;
}

export interface UserCredits {
  total: number;
  used: number;
  remaining: number;
}

export interface User {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  provider: string;
  role: string;
  status: string;
  createdAt: string;
  apiKey: ApiKeyInfo | null;
  credits: UserCredits;
}

export interface UserSummary {
  totalUsers: number;
  activeUsers: number;
  totalCredits: number;
  usedCredits: number;
}

interface UsersResponse {
  users: User[];
  summary: UserSummary;
}

interface CreateUserData {
  name: string;
  email?: string;
  role?: string;
}

interface UpdateUserData {
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  status?: string;
}

export function useUsers() {
  const { adminKey, isReady, isAuthenticated } = useAdminAuth();
  const fetcher = useAuthFetcher();

  const shouldFetch = isReady && isAuthenticated;

  const { data, error, isLoading, mutate } = useSWR<UsersResponse>(
    shouldFetch ? '/api/admin/users' : null,
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );

  const createUser = useCallback(async (userData: CreateUserData) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (res.ok) {
        mutate(); // 刷新列表
        return await res.json();
      }
      throw new Error('Failed to create user');
    } catch (error) {
      console.error('Failed to create user:', error);
      throw error;
    }
  }, [adminKey, mutate]);

  const updateUser = useCallback(async (id: string, userData: UpdateUserData) => {
    // 乐观更新
    mutate(
      (current) => current ? {
        ...current,
        users: current.users.map(u =>
          u.id === id ? { ...u, ...userData } : u
        ),
      } : current,
      false
    );

    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${adminKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!res.ok) throw new Error('Failed to update user');
      mutate();
    } catch (error) {
      console.error('Failed to update user:', error);
      mutate(); // 恢复原状态
      throw error;
    }
  }, [adminKey, mutate]);

  const deleteUser = useCallback(async (id: string) => {
    // 乐观更新：立即从 UI 移除
    mutate(
      (current) => current ? {
        ...current,
        users: current.users.filter(u => u.id !== id),
      } : current,
      false
    );

    try {
      await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminKey}` },
      });
      mutate();
    } catch (error) {
      console.error('Failed to delete user:', error);
      mutate(); // 恢复原状态
    }
  }, [adminKey, mutate]);

  const toggleUserStatus = useCallback(async (user: User) => {
    const newStatus = user.status === 'active' ? 'disabled' : 'active';
    await updateUser(user.id, { status: newStatus });
  }, [updateUser]);

  const rechargeCredits = useCallback(async (userId: string, amount: number, description?: string) => {
    try {
      const res = await fetch('/api/admin/credits/recharge', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          amount,
          description: description || '管理员充值',
        }),
      });

      if (res.ok) {
        mutate();
        return await res.json();
      }
      const error = await res.json();
      throw new Error(error.error || '充值失败');
    } catch (error) {
      console.error('Failed to recharge:', error);
      throw error;
    }
  }, [adminKey, mutate]);

  // 计算积分使用百分比
  const getCreditsPercentage = useCallback((credits: UserCredits) => {
    if (credits.total === 0) return 0;
    return Math.round((credits.used / credits.total) * 100);
  }, []);

  return {
    users: data?.users || [],
    summary: data?.summary,
    isLoading: !isReady || isLoading,
    error,
    createUser,
    updateUser,
    deleteUser,
    toggleUserStatus,
    rechargeCredits,
    getCreditsPercentage,
    refresh: mutate,
  };
}
