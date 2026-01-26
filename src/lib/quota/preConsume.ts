/**
 * 预扣费模块
 * 处理任务提交时的积分预扣和返还
 */

import { db } from '@/lib/db';
import { apiKeys, creditTransactions } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export interface PreConsumeResult {
  success: boolean;
  error?: string;
  remaining?: number;
}

/**
 * 预扣费 - 任务提交时调用
 * @param keyId API Key ID
 * @param credits 预扣积分数量
 * @returns 预扣结果
 */
export async function preConsumeQuota(
  keyId: string,
  credits: number
): Promise<PreConsumeResult> {
  // 获取当前配额
  const [key] = await db.select({
    quotaLimit: apiKeys.quotaLimit,
    quotaUsed: apiKeys.quotaUsed,
    quotaType: apiKeys.quotaType,
  })
    .from(apiKeys)
    .where(eq(apiKeys.id, keyId))
    .limit(1);

  if (!key) {
    return { success: false, error: 'API Key not found' };
  }

  // 无限制配额，直接成功
  if (key.quotaLimit === null || key.quotaType === 'unlimited') {
    return { success: true };
  }

  // 检查余额
  const remaining = key.quotaLimit - (key.quotaUsed || 0);
  if (remaining < credits) {
    return {
      success: false,
      error: `Insufficient quota: ${remaining.toFixed(2)} < ${credits}`,
      remaining,
    };
  }

  // 执行预扣费（原子操作）
  await db.update(apiKeys)
    .set({
      quotaUsed: sql`${apiKeys.quotaUsed} + ${credits}`,
    })
    .where(eq(apiKeys.id, keyId));

  return {
    success: true,
    remaining: remaining - credits,
  };
}

/**
 * 返还预扣费 - 任务失败时调用
 * @param keyId API Key ID
 * @param userId 用户ID
 * @param userName 用户名
 * @param credits 返还积分数量
 * @param taskId 关联任务ID
 * @param reason 返还原因
 */
export async function refundPreConsumedQuota(
  keyId: string,
  userId: string,
  userName: string | null,
  credits: number,
  taskId?: string,
  reason?: string
): Promise<void> {
  if (credits <= 0) return;

  // 返还积分
  await db.update(apiKeys)
    .set({
      quotaUsed: sql`GREATEST(0, ${apiKeys.quotaUsed} - ${credits})`,
    })
    .where(eq(apiKeys.id, keyId));

  // 获取更新后的余额
  const [key] = await db.select({
    quotaLimit: apiKeys.quotaLimit,
    quotaUsed: apiKeys.quotaUsed,
  })
    .from(apiKeys)
    .where(eq(apiKeys.id, keyId))
    .limit(1);

  const balanceAfter = key ? (key.quotaLimit || 0) - (key.quotaUsed || 0) : 0;

  // 记录返还交易
  await db.insert(creditTransactions).values({
    id: `tx_${nanoid(12)}`,
    userId,
    userName,
    keyId,
    type: 'refund',
    amount: -credits,  // 负数表示返还
    balanceAfter: Math.round(balanceAfter),
    description: reason || `Task refund${taskId ? `: ${taskId}` : ''}`,
    metadata: taskId ? JSON.stringify({ taskId }) : null,
  });
}

/**
 * 调整配额 - 任务完成时调用
 * 根据实际消耗调整预扣费差额
 * @param keyId API Key ID
 * @param userId 用户ID
 * @param userName 用户名
 * @param preConsumed 预扣积分
 * @param actualCredits 实际消耗积分
 * @param taskId 关联任务ID
 */
export async function adjustQuota(
  keyId: string,
  userId: string,
  userName: string | null,
  preConsumed: number,
  actualCredits: number,
  taskId?: string
): Promise<void> {
  const delta = actualCredits - preConsumed;

  // 没有差额，无需调整
  if (delta === 0) return;

  if (delta > 0) {
    // 实际消耗 > 预扣：需要补扣
    await db.update(apiKeys)
      .set({
        quotaUsed: sql`${apiKeys.quotaUsed} + ${delta}`,
      })
      .where(eq(apiKeys.id, keyId));
  } else {
    // 实际消耗 < 预扣：需要返还部分
    await db.update(apiKeys)
      .set({
        quotaUsed: sql`GREATEST(0, ${apiKeys.quotaUsed} + ${delta})`,
      })
      .where(eq(apiKeys.id, keyId));
  }

  // 获取更新后的余额
  const [key] = await db.select({
    quotaLimit: apiKeys.quotaLimit,
    quotaUsed: apiKeys.quotaUsed,
  })
    .from(apiKeys)
    .where(eq(apiKeys.id, keyId))
    .limit(1);

  const balanceAfter = key ? (key.quotaLimit || 0) - (key.quotaUsed || 0) : 0;

  // 记录调整交易（如果有差额）
  if (delta !== 0) {
    await db.insert(creditTransactions).values({
      id: `tx_${nanoid(12)}`,
      userId,
      userName,
      keyId,
      type: delta > 0 ? 'consumption' : 'refund',
      amount: delta,  // 正=补扣，负=返还
      balanceAfter: Math.round(balanceAfter),
      description: `Quota adjustment${taskId ? ` for task: ${taskId}` : ''}`,
      metadata: taskId ? JSON.stringify({ taskId, preConsumed, actualCredits }) : null,
    });
  }
}

/**
 * 检查配额是否足够
 * @param keyId API Key ID
 * @param requiredCredits 需要的积分
 */
export async function checkQuotaSufficient(
  keyId: string,
  requiredCredits: number
): Promise<{ sufficient: boolean; remaining: number }> {
  const [key] = await db.select({
    quotaLimit: apiKeys.quotaLimit,
    quotaUsed: apiKeys.quotaUsed,
    quotaType: apiKeys.quotaType,
  })
    .from(apiKeys)
    .where(eq(apiKeys.id, keyId))
    .limit(1);

  if (!key) {
    return { sufficient: false, remaining: 0 };
  }

  // 无限制配额
  if (key.quotaLimit === null || key.quotaType === 'unlimited') {
    return { sufficient: true, remaining: Infinity };
  }

  const remaining = key.quotaLimit - (key.quotaUsed || 0);
  return {
    sufficient: remaining >= requiredCredits,
    remaining,
  };
}
