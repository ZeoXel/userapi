import { NextRequest, NextResponse } from 'next/server';
import { db, users, apiKeys, creditTransactions } from '@/lib/db';
import { getProviders } from '@/lib/proxy/router';
import { eq, desc, gte, sql, and } from 'drizzle-orm';

// Admin 认证
function verifyAdmin(request: NextRequest): boolean {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return false;

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;

  return match[1] === process.env.ADMIN_API_KEY;
}

// GET /api/admin/dashboard - 聚合仪表盘数据
export async function GET(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 并行获取所有数据
    const [
      allUsers,
      allKeys,
      todayTransactions,
      recentTransactions,
    ] = await Promise.all([
      // 用户统计
      db.select().from(users),

      // API Keys 统计
      db.select().from(apiKeys),

      // 今日交易统计
      db.select({
        count: sql<number>`count(*)`,
        totalAmount: sql<number>`sum(${creditTransactions.amount})`,
      })
        .from(creditTransactions)
        .where(
          and(
            gte(creditTransactions.createdAt, new Date(new Date().setHours(0, 0, 0, 0))),
            eq(creditTransactions.type, 'consumption')
          )
        ),

      // 最近交易
      db.select({
        id: creditTransactions.id,
        type: creditTransactions.type,
        amount: creditTransactions.amount,
        service: creditTransactions.service,
        provider: creditTransactions.provider,
        model: creditTransactions.model,
        createdAt: creditTransactions.createdAt,
        userId: creditTransactions.userId,
        userName: users.name,
      })
        .from(creditTransactions)
        .leftJoin(users, eq(creditTransactions.userId, users.id))
        .orderBy(desc(creditTransactions.createdAt))
        .limit(10),
    ]);

    // 计算统计数据
    const totalUsers = allUsers.length;
    const activeUsers = allUsers.filter(u => u.status === 'active').length;
    const totalKeys = allKeys.length;
    const activeKeys = allKeys.filter(k => k.status === 'active').length;

    // 积分统计
    const totalCredits = allKeys.reduce((sum, k) => sum + (k.quotaLimit || 0), 0);
    const usedCredits = allKeys.reduce((sum, k) => sum + (k.quotaUsed || 0), 0);
    const remainingCredits = totalCredits - usedCredits;

    // 今日消费
    const todayConsumption = todayTransactions[0]?.totalAmount || 0;
    const todayTransactionCount = todayTransactions[0]?.count || 0;

    // 厂商状态 - 检查环境变量是否已设置
    const providers = getProviders().map(p => ({
      id: p.id,
      name: p.name,
      configured: !!process.env[p.auth?.env_key || ''],
    }));

    return NextResponse.json({
      stats: {
        users: {
          total: totalUsers,
          active: activeUsers,
        },
        keys: {
          total: totalKeys,
          active: activeKeys,
        },
        credits: {
          total: totalCredits,
          used: usedCredits,
          remaining: remainingCredits,
        },
        today: {
          consumption: Math.abs(todayConsumption),
          transactions: todayTransactionCount,
        },
      },
      providers,
      recentTransactions: recentTransactions.map(t => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        service: t.service,
        provider: t.provider,
        model: t.model,
        createdAt: t.createdAt,
        userName: t.userName || '未知用户',
      })),
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data', detail: String(error) },
      { status: 500 }
    );
  }
}
