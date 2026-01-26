import { SWRConfiguration } from 'swr';

export const swrConfig: SWRConfiguration = {
  revalidateOnFocus: false,     // Admin 场景不自动刷新
  revalidateOnReconnect: false, // 断网重连不刷新
  dedupingInterval: 5000,       // 5秒请求去重
  errorRetryCount: 3,           // 错误重试3次
  errorRetryInterval: 1000,     // 重试间隔1秒
  shouldRetryOnError: (error) => {
    // 401/403 不重试
    if (error?.status === 401 || error?.status === 403) {
      return false;
    }
    return true;
  },
};
