import { NextRequest, NextResponse } from 'next/server';
import { verifyApiKey } from '@/lib/auth/verify';
import { db, apiKeys, creditTransactions } from '@/lib/db';
import { eq, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

interface ConsumeRequest {
  service: 'video' | 'image' | 'audio' | 'chat';
  provider: string;
  model: string;
  credits: number;
  metadata?: Record<string, unknown>;
}

// POST /api/credits/consume - 扣除积分
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
  }

  const result = await verifyApiKey(authHeader);
  if (!result.valid) {
    return NextResponse.json({ error: result.error }, { status: 401 });
  }

  // Admin key 无法扣积分，需使用用户 API key
  if (result.userId === 'admin') {
    return NextResponse.json(
      { error: 'Admin key cannot consume credits. Please use a user API key.' },
      { status: 400 }
    );
  }

  try {
    const body: ConsumeRequest = await request.json();
    const { service, provider, model, credits, metadata } = body;

    // 验证请求参数
    if (!service || !provider || !model || typeof credits !== 'number' || credits <= 0) {
      return NextResponse.json(
        { error: 'Invalid request. Required: service, provider, model, credits (positive number)' },
        { status: 400 }
      );
    }

    // 查询当前配额
    const [key] = await db.select({
      id: apiKeys.id,
      quotaLimit: apiKeys.quotaLimit,
      quotaUsed: apiKeys.quotaUsed,
    })
    .from(apiKeys)
    .where(eq(apiKeys.id, result.keyId!))
    .limit(1);

    if (!key) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    const total = key.quotaLimit ?? 0;
    const used = key.quotaUsed ?? 0;
    const remaining = total - used;

    // 检查余额是否足够
    if (remaining < credits) {
      return NextResponse.json(
        { error: 'Insufficient credits', remaining, required: credits },
        { status: 402 }
      );
    }

    // 计算新余额
    const newUsed = used + credits;
    const balanceAfter = Math.max(0, total - newUsed);

    // 创建交易记录
    const transactionId = nanoid();
    const transaction = {
      id: transactionId,
      userId: result.userId!,
      userName: result.userName, // 冗余字段便于查看
      keyId: result.keyId!,
      type: 'consumption',
      amount: credits,
      balanceAfter: Math.floor(balanceAfter),
      service,
      provider,
      model,
      metadata: metadata ? JSON.stringify(metadata) : null,
      description: `${service} - ${provider}/${model}`,
    };

    // 事务：更新配额并插入交易记录
    await db.update(apiKeys)
      .set({ quotaUsed: sql`${apiKeys.quotaUsed} + ${credits}` })
      .where(eq(apiKeys.id, key.id));

    await db.insert(creditTransactions).values(transaction);

    return NextResponse.json({
      success: true,
      transaction: {
        id: transactionId,
        credits,
        balance: Math.floor(balanceAfter),
      },
    });
  } catch (error) {
    console.error('Failed to consume credits:', error);
    return NextResponse.json(
      { error: 'Failed to consume credits', detail: String(error) },
      { status: 500 }
    );
  }
}
