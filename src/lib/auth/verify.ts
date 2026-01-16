import bcrypt from 'bcryptjs';
import { db, apiKeys, users } from '@/lib/db';
import { eq, and } from 'drizzle-orm';

export interface VerifyResult {
  valid: boolean;
  error?: string;
  keyId?: string;
  userId?: string;
  userName?: string;
  allowedProviders?: string[] | null;
  quotaRemaining?: number | null;
}

// Admin Key 前缀
const ADMIN_KEY_PREFIX = 'ua_admin_';

/**
 * 验证 API Key
 */
export async function verifyApiKey(authHeader: string): Promise<VerifyResult> {
  // 解析 Authorization header
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return {
      valid: false,
      error: 'Invalid authorization format. Expected: Bearer <key>',
    };
  }

  const key = match[1];

  // 检查是否是 Admin Key (Phase 1 简化版)
  const adminKey = process.env.ADMIN_API_KEY;
  if (adminKey && key === adminKey) {
    return {
      valid: true,
      keyId: 'admin',
      userId: 'admin',
      userName: 'Administrator',
      allowedProviders: null, // null 表示允许所有
      quotaRemaining: null, // null 表示无限制
    };
  }

  // 检查 Key 前缀格式
  if (!key.startsWith('ua_')) {
    return {
      valid: false,
      error: 'Invalid key format. Key must start with "ua_"',
    };
  }

  // 从数据库查询 (Phase 2)
  try {
    const keyPrefix = key.substring(0, 12); // ua_xxxxxxxx

    // 查找匹配前缀的 Key
    const results = await db
      .select({
        key: apiKeys,
        user: users,
      })
      .from(apiKeys)
      .innerJoin(users, eq(apiKeys.userId, users.id))
      .where(
        and(
          eq(apiKeys.keyPrefix, keyPrefix),
          eq(apiKeys.status, 'active'),
          eq(users.status, 'active')
        )
      )
      .limit(10);

    // 验证完整 Key (bcrypt 比较)
    for (const result of results) {
      const isMatch = await bcrypt.compare(key, result.key.keyHash);
      if (isMatch) {
        // 解析允许的厂商
        let allowedProviders: string[] | null = null;
        if (result.key.allowedProviders) {
          try {
            allowedProviders = JSON.parse(result.key.allowedProviders);
          } catch {
            allowedProviders = null;
          }
        }

        // 计算剩余配额
        let quotaRemaining: number | null = null;
        if (result.key.quotaType !== 'unlimited' && result.key.quotaLimit) {
          quotaRemaining = result.key.quotaLimit - (result.key.quotaUsed || 0);
        }

        // 更新最后使用时间
        await db
          .update(apiKeys)
          .set({ lastUsedAt: new Date() })
          .where(eq(apiKeys.id, result.key.id));

        return {
          valid: true,
          keyId: result.key.id,
          userId: result.user.id,
          userName: result.user.name,
          allowedProviders,
          quotaRemaining,
        };
      }
    }

    return {
      valid: false,
      error: 'Invalid API key',
    };
  } catch (error) {
    // 数据库未初始化时回退到 Admin Key 模式
    console.warn('Database not initialized, using admin-only mode');
    return {
      valid: false,
      error: 'Invalid API key (database not initialized)',
    };
  }
}

/**
 * 生成新的 API Key
 */
export async function generateApiKey(): Promise<{ key: string; hash: string; prefix: string }> {
  const { nanoid } = await import('nanoid');

  // 生成随机部分
  const randomPart = nanoid(32);
  const key = `ua_${randomPart}`;
  const prefix = key.substring(0, 12);

  // 生成 hash
  const hash = await bcrypt.hash(key, 10);

  return { key, hash, prefix };
}
