import { NextRequest, NextResponse } from 'next/server';
import { db, users, apiKeys, usageLogs } from '@/lib/db';
import { eq, and, gte, sql } from 'drizzle-orm';

// GET /api/user/me - 获取当前用户信息
// 通过 API Key 或 provider/provider_id 认证
export async function GET(request: NextRequest) {
  try {
    // 方式1: 通过 API Key 认证
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ua_')) {
      const apiKeyValue = authHeader.replace('Bearer ', '');

      // 查找匹配的 key
      const allKeys = await db.select().from(apiKeys).where(eq(apiKeys.status, 'active'));
      const bcrypt = await import('bcryptjs');

      let matchedKey = null;
      for (const key of allKeys) {
        if (bcrypt.compareSync(apiKeyValue, key.keyHash)) {
          matchedKey = key;
          break;
        }
      }

      if (!matchedKey) {
        return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
      }

      // 获取用户信息
      const userResult = await db.select().from(users).where(eq(users.id, matchedKey.userId));
      if (!userResult[0]) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const user = userResult[0];

      // 获取用户所有 keys
      const userKeys = await db
        .select({
          id: apiKeys.id,
          keyPrefix: apiKeys.keyPrefix,
          name: apiKeys.name,
          status: apiKeys.status,
          quotaType: apiKeys.quotaType,
          quotaLimit: apiKeys.quotaLimit,
          quotaUsed: apiKeys.quotaUsed,
          lastUsedAt: apiKeys.lastUsedAt,
          createdAt: apiKeys.createdAt,
        })
        .from(apiKeys)
        .where(eq(apiKeys.userId, user.id));

      // 获取使用统计
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const usageStats = await db
        .select({
          totalRequests: sql<number>`count(*)`,
          totalCost: sql<number>`coalesce(sum(${usageLogs.cost}), 0)`,
        })
        .from(usageLogs)
        .where(
          and(
            eq(usageLogs.userId, user.id),
            gte(usageLogs.createdAt, thirtyDaysAgo)
          )
        );

      return NextResponse.json({
        user: {
          id: user.id,
          provider: user.provider,
          name: user.name,
          email: user.email,
          phone: user.phone,
          avatar: user.avatar,
          role: user.role,
          status: user.status,
          createdAt: user.createdAt,
        },
        keys: userKeys,
        usage: {
          last30Days: {
            totalRequests: Number(usageStats[0]?.totalRequests || 0),
            totalCost: Number(usageStats[0]?.totalCost || 0),
          },
        },
      });
    }

    // 方式2: 通过 provider/provider_id 查询 (需要在 query params 中传递)
    const provider = request.nextUrl.searchParams.get('provider');
    const providerId = request.nextUrl.searchParams.get('provider_id');

    if (provider && providerId) {
      const userResult = await db
        .select()
        .from(users)
        .where(and(eq(users.provider, provider), eq(users.providerId, providerId)));

      if (!userResult[0]) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const user = userResult[0];

      return NextResponse.json({
        user: {
          id: user.id,
          provider: user.provider,
          name: user.name,
          email: user.email,
          phone: user.phone,
          avatar: user.avatar,
          role: user.role,
          status: user.status,
          createdAt: user.createdAt,
        },
      });
    }

    return NextResponse.json(
      { error: 'Authentication required. Provide API key or provider/provider_id' },
      { status: 401 }
    );
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Failed to get user info', detail: String(error) },
      { status: 500 }
    );
  }
}
