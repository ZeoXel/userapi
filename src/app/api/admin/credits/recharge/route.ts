import { NextRequest, NextResponse } from 'next/server';
import { db, users, apiKeys, creditTransactions } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

// Admin 认证
function verifyAdmin(request: NextRequest): boolean {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return false;

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;

  const adminKey = process.env.ADMIN_API_KEY;
  return match[1] === adminKey;
}

interface RechargeRequest {
  userId: string;
  amount: number;
  description?: string;
}

// POST /api/admin/credits/recharge - 管理员充值
export async function POST(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body: RechargeRequest = await request.json();
    const { userId, amount, description } = body;

    // 验证参数
    if (!userId || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid request. Required: userId, amount (positive number)' },
        { status: 400 }
      );
    }

    // 验证用户存在
    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 查找用户的 API Key
    const [key] = await db.select()
      .from(apiKeys)
      .where(eq(apiKeys.userId, userId))
      .limit(1);

    if (!key) {
      return NextResponse.json({ error: 'User has no API key' }, { status: 404 });
    }

    // 计算新余额
    const currentLimit = key.quotaLimit ?? 0;
    const currentUsed = key.quotaUsed ?? 0;
    const newLimit = currentLimit + amount;
    const newBalance = newLimit - currentUsed;

    // 更新配额限制（充值增加 quotaLimit）
    await db.update(apiKeys)
      .set({ quotaLimit: newLimit })
      .where(eq(apiKeys.id, key.id));

    // 创建充值记录（amount 为负数表示充值/增加余额）
    const transactionId = nanoid();
    const transaction = {
      id: transactionId,
      userId,
      userName: user.name, // 冗余字段便于查看
      keyId: key.id,
      type: 'recharge',
      amount: -amount, // 负数表示充值（余额增加）
      balanceAfter: Math.floor(newBalance),
      description: description || '管理员充值',
    };

    await db.insert(creditTransactions).values(transaction);

    return NextResponse.json({
      success: true,
      newBalance: Math.floor(newBalance),
      transaction: {
        id: transactionId,
        amount,
        balanceAfter: Math.floor(newBalance),
        type: 'recharge',
        description: transaction.description,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Failed to recharge credits:', error);
    return NextResponse.json(
      { error: 'Failed to recharge credits', detail: String(error) },
      { status: 500 }
    );
  }
}
