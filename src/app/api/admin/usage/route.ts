import { NextRequest, NextResponse } from 'next/server';
import { db, usageLogs, users, apiKeys, creditTransactions } from '@/lib/db';
import { eq, sql, and, gte, desc } from 'drizzle-orm';

// Admin 认证
function verifyAdmin(request: NextRequest): boolean {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return false;

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;

  return match[1] === process.env.ADMIN_API_KEY;
}

// GET /api/admin/usage - 获取使用统计
export async function GET(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('userId');
  const provider = searchParams.get('provider');
  const days = parseInt(searchParams.get('days') || '7');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');

  try {
    // 计算时间范围
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 构建查询条件
    const conditions = [gte(usageLogs.createdAt, startDate)];
    if (userId) conditions.push(eq(usageLogs.userId, userId));
    if (provider) conditions.push(eq(usageLogs.provider, provider));

    // 获取总体统计
    const overallStats = await db
      .select({
        totalRequests: sql<number>`count(*)`,
        successRequests: sql<number>`sum(case when ${usageLogs.responseStatus} < 400 then 1 else 0 end)`,
        failedRequests: sql<number>`sum(case when ${usageLogs.responseStatus} >= 400 then 1 else 0 end)`,
        totalCost: sql<number>`sum(${usageLogs.cost})`,
        avgLatency: sql<number>`avg(${usageLogs.latencyMs})`,
      })
      .from(usageLogs)
      .where(and(...conditions));

    // 按厂商统计
    const providerStats = await db
      .select({
        provider: usageLogs.provider,
        requests: sql<number>`count(*)`,
        successRate: sql<number>`round(sum(case when ${usageLogs.responseStatus} < 400 then 1.0 else 0 end) / count(*) * 100, 1)`,
        totalCost: sql<number>`sum(${usageLogs.cost})`,
        avgLatency: sql<number>`round(avg(${usageLogs.latencyMs}))`,
      })
      .from(usageLogs)
      .where(and(...conditions))
      .groupBy(usageLogs.provider);

    // 按用户统计
    const userStats = await db
      .select({
        userId: usageLogs.userId,
        userName: users.name,
        requests: sql<number>`count(*)`,
        totalCost: sql<number>`sum(${usageLogs.cost})`,
      })
      .from(usageLogs)
      .innerJoin(users, eq(usageLogs.userId, users.id))
      .where(and(...conditions))
      .groupBy(usageLogs.userId, users.name)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    // 按天统计趋势
    const dailyTrend = await db
      .select({
        date: sql<string>`date(${usageLogs.createdAt})`,
        requests: sql<number>`count(*)`,
        cost: sql<number>`sum(${usageLogs.cost})`,
      })
      .from(usageLogs)
      .where(and(...conditions))
      .groupBy(sql`date(${usageLogs.createdAt})`)
      .orderBy(sql`date(${usageLogs.createdAt})`);

    // 获取最近请求列表
    const offset = (page - 1) * limit;
    const recentLogs = await db
      .select({
        id: usageLogs.id,
        provider: usageLogs.provider,
        endpoint: usageLogs.endpoint,
        method: usageLogs.method,
        responseStatus: usageLogs.responseStatus,
        latencyMs: usageLogs.latencyMs,
        cost: usageLogs.cost,
        createdAt: usageLogs.createdAt,
        userName: users.name,
      })
      .from(usageLogs)
      .innerJoin(users, eq(usageLogs.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(usageLogs.createdAt))
      .limit(limit)
      .offset(offset);

    // ===== 积分消费统计（从 credit_transactions）=====
    const creditConditions = [
      gte(creditTransactions.createdAt, startDate),
      eq(creditTransactions.type, 'consumption'),
    ];

    // 积分总体统计
    const creditOverall = await db
      .select({
        totalCredits: sql<number>`coalesce(sum(abs(${creditTransactions.amount})), 0)`,
        transactionCount: sql<number>`count(*)`,
      })
      .from(creditTransactions)
      .where(and(...creditConditions));

    // 按厂商统计积分消费
    const creditsByProvider = await db
      .select({
        provider: creditTransactions.provider,
        credits: sql<number>`sum(abs(${creditTransactions.amount}))`,
        count: sql<number>`count(*)`,
      })
      .from(creditTransactions)
      .where(and(...creditConditions))
      .groupBy(creditTransactions.provider)
      .orderBy(desc(sql`sum(abs(${creditTransactions.amount}))`));

    // 按模型统计积分消费
    const creditsByModel = await db
      .select({
        provider: creditTransactions.provider,
        model: creditTransactions.model,
        credits: sql<number>`sum(abs(${creditTransactions.amount}))`,
        count: sql<number>`count(*)`,
      })
      .from(creditTransactions)
      .where(and(...creditConditions))
      .groupBy(creditTransactions.provider, creditTransactions.model)
      .orderBy(desc(sql`sum(abs(${creditTransactions.amount}))`))
      .limit(20);

    return NextResponse.json({
      period: {
        days,
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString(),
      },
      overview: overallStats[0] || {
        totalRequests: 0,
        successRequests: 0,
        failedRequests: 0,
        totalCost: 0,
        avgLatency: 0,
      },
      byProvider: providerStats,
      byUser: userStats,
      dailyTrend,
      recentLogs,
      pagination: {
        page,
        limit,
        hasMore: recentLogs.length === limit,
      },
      // 积分消费统计
      credits: {
        total: creditOverall[0]?.totalCredits || 0,
        transactions: creditOverall[0]?.transactionCount || 0,
        byProvider: creditsByProvider.filter(p => p.provider).map(p => ({
          provider: p.provider,
          credits: p.credits || 0,
          count: p.count || 0,
        })),
        byModel: creditsByModel.filter(m => m.model).map(m => ({
          provider: m.provider,
          model: m.model,
          credits: m.credits || 0,
          count: m.count || 0,
        })),
      },
    });
  } catch (error) {
    console.error('Usage stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch usage stats', detail: String(error) },
      { status: 500 }
    );
  }
}
