import useSWR from 'swr';
import { useCallback } from 'react';
import { useAdminAuth, useAuthFetcher } from '@/contexts/admin-auth';

export interface PricingItem {
  service: string;
  provider: string;
  model: string;
  pricing: Record<string, unknown>;
}

export interface Multipliers {
  default: number;
  [key: string]: number;
}

interface PricingResponse {
  list: PricingItem[];
  multipliers: Multipliers;
}

export type ServiceType = 'video' | 'image' | 'audio' | 'chat';

export function usePricing() {
  const { adminKey, isReady, isAuthenticated } = useAdminAuth();
  const fetcher = useAuthFetcher();

  const shouldFetch = isReady && isAuthenticated;

  const { data, error, isLoading, mutate } = useSWR<PricingResponse>(
    shouldFetch ? '/api/admin/pricing?format=list' : null,
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );

  const pricingList = data?.list || [];
  const multipliers = data?.multipliers || { default: 1.0 };

  const updateMultipliers = useCallback(async (newMultipliers: Multipliers) => {
    // 乐观更新
    mutate(
      (current) => current ? { ...current, multipliers: newMultipliers } : current,
      false
    );

    try {
      const res = await fetch('/api/admin/pricing', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminKey}`,
        },
        body: JSON.stringify({
          action: 'update_multipliers',
          multipliers: newMultipliers,
        }),
      });

      if (!res.ok) throw new Error('Failed to save multipliers');
      mutate();
    } catch (error) {
      console.error('Failed to save multipliers:', error);
      mutate(); // 恢复原状态
      throw error;
    }
  }, [adminKey, mutate]);

  const updateModel = useCallback(async (
    item: Pick<PricingItem, 'service' | 'provider' | 'model'>,
    newPricing: Record<string, unknown>
  ) => {
    // 乐观更新
    mutate(
      (current) => current ? {
        ...current,
        list: current.list.map(p =>
          p.provider === item.provider && p.model === item.model
            ? { ...p, pricing: newPricing }
            : p
        ),
      } : current,
      false
    );

    try {
      const res = await fetch('/api/admin/pricing', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminKey}`,
        },
        body: JSON.stringify({
          action: 'update_model',
          service: item.service,
          provider: item.provider,
          model: item.model,
          pricing: newPricing,
        }),
      });

      if (!res.ok) throw new Error('Failed to save model');
      mutate();
    } catch (error) {
      console.error('Failed to save model:', error);
      mutate();
      throw error;
    }
  }, [adminKey, mutate]);

  const deleteModel = useCallback(async (item: Pick<PricingItem, 'service' | 'provider' | 'model'>) => {
    // 乐观更新
    mutate(
      (current) => current ? {
        ...current,
        list: current.list.filter(p =>
          !(p.provider === item.provider && p.model === item.model)
        ),
      } : current,
      false
    );

    try {
      const res = await fetch('/api/admin/pricing', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminKey}`,
        },
        body: JSON.stringify({
          action: 'delete_model',
          service: item.service,
          provider: item.provider,
          model: item.model,
        }),
      });

      if (!res.ok) throw new Error('Failed to delete model');
      mutate();
    } catch (error) {
      console.error('Failed to delete model:', error);
      mutate();
      throw error;
    }
  }, [adminKey, mutate]);

  const calculateCredits = useCallback(async (
    service: string,
    provider: string,
    model: string,
    usage: Record<string, unknown>
  ) => {
    const res = await fetch('/api/admin/pricing', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminKey}`,
      },
      body: JSON.stringify({ service, provider, model, usage }),
    });

    if (res.ok) {
      const data = await res.json();
      return data.calculatedCredits as number;
    }
    throw new Error('Failed to calculate');
  }, [adminKey]);

  // 按服务类型过滤
  const getByService = useCallback((service: ServiceType) => {
    return pricingList.filter(item => item.service === service);
  }, [pricingList]);

  // 按 provider 分组
  const groupByProvider = useCallback((items: PricingItem[]) => {
    const grouped: Record<string, PricingItem[]> = {};
    items.forEach(item => {
      if (!grouped[item.provider]) {
        grouped[item.provider] = [];
      }
      grouped[item.provider].push(item);
    });
    return grouped;
  }, []);

  return {
    pricingList,
    multipliers,
    isLoading: !isReady || isLoading,
    error,
    updateMultipliers,
    updateModel,
    deleteModel,
    calculateCredits,
    getByService,
    groupByProvider,
    refresh: mutate,
  };
}
