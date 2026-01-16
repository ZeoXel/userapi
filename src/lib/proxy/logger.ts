import { db, usageLogs, apiKeys } from '@/lib/db';
import { eq, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export interface LogUsageOptions {
  keyId: string;
  userId: string;
  provider: string;
  endpoint: string;
  method: string;
  requestSize?: number;
  responseStatus: number;
  responseSize?: number;
  latencyMs: number;
  cost?: number;
  errorCode?: string;
  errorMessage?: string;
}

// 简单的成本估算 (可配置)
const COST_PER_REQUEST: Record<string, number> = {
  vidu: 0.5,      // 视频生成较贵
  volcengine: 0.3,
  openai: 0.01,   // 按请求估算
  minimax: 0.05,
  suno: 0.2,
  default: 0.01,
};

/**
 * 记录 API 使用日志
 */
export async function logUsage(options: LogUsageOptions): Promise<void> {
  try {
    // 如果是 admin key，只打印日志
    if (options.keyId === 'admin') {
      console.log('[Usage]', {
        provider: options.provider,
        endpoint: options.endpoint,
        method: options.method,
        status: options.responseStatus,
        latency: options.latencyMs,
      });
      return;
    }

    // 估算成本
    const estimatedCost = options.cost ??
      (options.responseStatus < 400
        ? (COST_PER_REQUEST[options.provider] || COST_PER_REQUEST.default)
        : 0);

    // 插入日志
    await db.insert(usageLogs).values({
      id: nanoid(),
      keyId: options.keyId,
      userId: options.userId,
      provider: options.provider,
      endpoint: options.endpoint,
      method: options.method,
      requestSize: options.requestSize,
      responseStatus: options.responseStatus,
      responseSize: options.responseSize,
      latencyMs: options.latencyMs,
      cost: estimatedCost,
      errorCode: options.errorCode,
      errorMessage: options.errorMessage,
      createdAt: new Date(),
    });

    // 更新配额使用量
    if (options.responseStatus < 400) {
      await updateQuotaUsage(options.keyId, estimatedCost);
    }
  } catch (error) {
    console.error('[Usage Log Error]', error);
  }
}

/**
 * 更新用户配额使用量
 */
export async function updateQuotaUsage(
  keyId: string,
  cost: number
): Promise<void> {
  try {
    await db
      .update(apiKeys)
      .set({
        quotaUsed: sql`${apiKeys.quotaUsed} + ${cost}`,
      })
      .where(eq(apiKeys.id, keyId));
  } catch (error) {
    console.error('[Quota Update Error]', error);
  }
}

/**
 * 检查并重置月度配额
 */
export async function checkAndResetMonthlyQuota(keyId: string): Promise<void> {
  try {
    const key = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.id, keyId))
      .limit(1);

    if (key.length === 0) return;

    const keyData = key[0];
    if (keyData.quotaType !== 'monthly' || !keyData.quotaResetAt) return;

    const now = new Date();
    if (now >= keyData.quotaResetAt) {
      // 重置配额
      const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      await db
        .update(apiKeys)
        .set({
          quotaUsed: 0,
          quotaResetAt: nextReset,
        })
        .where(eq(apiKeys.id, keyId));
    }
  } catch (error) {
    console.error('[Quota Reset Error]', error);
  }
}
