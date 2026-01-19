import { NextRequest, NextResponse } from 'next/server';
import { verifyApiKey } from '@/lib/auth/verify';
import { db, creditTransactions } from '@/lib/db';
import { eq, desc, and, count } from 'drizzle-orm';

// GET /api/credits/transactions - 获取交易记录
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
  }

  const result = await verifyApiKey(authHeader);
  if (!result.valid) {
    return NextResponse.json({ error: result.error }, { status: 401 });
  }

  // Admin key 无法查询交易记录，需使用用户 API key
  if (result.userId === 'admin') {
    return NextResponse.json(
      { error: 'Admin key cannot query transactions. Please use a user API key.' },
      { status: 400 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const type = searchParams.get('type'); // 可选过滤: consumption, recharge, refund, reward

    // 构建查询条件
    const conditions = [eq(creditTransactions.userId, result.userId!)];
    if (type) {
      conditions.push(eq(creditTransactions.type, type));
    }

    // 查询交易记录
    const transactions = await db.select()
      .from(creditTransactions)
      .where(and(...conditions))
      .orderBy(desc(creditTransactions.createdAt))
      .limit(limit)
      .offset(offset);

    // 查询总数
    const [totalResult] = await db.select({ count: count() })
      .from(creditTransactions)
      .where(and(...conditions));

    return NextResponse.json({
      transactions: transactions.map(t => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        balanceAfter: t.balanceAfter,
        service: t.service,
        provider: t.provider,
        model: t.model,
        description: t.description,
        metadata: t.metadata ? JSON.parse(t.metadata) : null,
        createdAt: t.createdAt,
      })),
      pagination: {
        total: totalResult.count,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error('Failed to get transactions:', error);
    return NextResponse.json(
      { error: 'Failed to get transactions', detail: String(error) },
      { status: 500 }
    );
  }
}
