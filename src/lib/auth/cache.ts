/**
 * API Key 验证结果缓存
 * 使用 LRU 缓存减少数据库查询和 bcrypt 计算
 */

import type { VerifyResult } from './verify';

interface CacheEntry {
  result: VerifyResult;
  expireAt: number;
}

// 简单的 LRU 缓存实现
class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private readonly maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // 移到最后（最近使用）
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // 删除最旧的条目
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  delete(key: K): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

// 缓存配置
const CACHE_MAX_SIZE = 1000;      // 最多缓存 1000 个 key
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 分钟过期

// 全局缓存实例
const keyCache = new LRUCache<string, CacheEntry>(CACHE_MAX_SIZE);

/**
 * 从缓存获取验证结果
 */
export function getCachedResult(key: string): VerifyResult | null {
  const entry = keyCache.get(key);
  if (!entry) return null;

  // 检查是否过期
  if (Date.now() > entry.expireAt) {
    keyCache.delete(key);
    return null;
  }

  return entry.result;
}

/**
 * 缓存验证结果
 */
export function setCachedResult(key: string, result: VerifyResult): void {
  // 只缓存成功的验证结果
  if (!result.valid) return;

  keyCache.set(key, {
    result,
    expireAt: Date.now() + CACHE_TTL_MS,
  });
}

/**
 * 使缓存失效（key 被撤销时调用）
 */
export function invalidateCache(key: string): void {
  keyCache.delete(key);
}

/**
 * 清空所有缓存
 */
export function clearCache(): void {
  keyCache.clear();
}
