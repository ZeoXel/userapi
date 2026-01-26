'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode, useRef } from 'react';

interface AdminAuthContextType {
  adminKey: string;
  isAuthenticated: boolean;
  isReady: boolean; // 替代 isLoading，表示 session 已加载完成
  dbConnected: boolean;
  dbError: string | null;
  refresh: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState({
    adminKey: '',
    isReady: false,
    dbConnected: false,
    dbError: null as string | null,
  });

  // 使用 ref 防止重复请求
  const fetchedRef = useRef(false);

  const fetchSession = useCallback(async () => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    try {
      const res = await fetch('/api/admin/session');
      if (res.ok) {
        const data = await res.json();
        setState({
          adminKey: data.adminKey || '',
          isReady: true,
          dbConnected: data.database?.connected || false,
          dbError: data.database?.error || null,
        });
      } else {
        setState(prev => ({ ...prev, isReady: true }));
      }
    } catch (error) {
      console.error('Failed to fetch admin session:', error);
      setState(prev => ({
        ...prev,
        isReady: true,
        dbError: 'Failed to connect to server',
      }));
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // 使用单次 setState 批量更新，使用 useMemo 稳定 context value
  const contextValue = useMemo(() => ({
    adminKey: state.adminKey,
    isAuthenticated: !!state.adminKey,
    isReady: state.isReady,
    dbConnected: state.dbConnected,
    dbError: state.dbError,
    refresh: async () => {
      fetchedRef.current = false;
      await fetchSession();
    },
  }), [state, fetchSession]);

  return (
    <AdminAuthContext.Provider value={contextValue}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}

// 创建稳定的 fetcher - 在 hooks 中使用
export function useAuthFetcher() {
  const { adminKey } = useAdminAuth();

  return useMemo(() => {
    return async <T = unknown>(url: string): Promise<T> => {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${adminKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const info = await res.json().catch(() => ({}));
        const error = new Error(info.error || `API Error: ${res.status}`);
        (error as Error & { status: number; info: unknown }).status = res.status;
        (error as Error & { status: number; info: unknown }).info = info;
        throw error;
      }

      return res.json() as Promise<T>;
    };
  }, [adminKey]);
}
