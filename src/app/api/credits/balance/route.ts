import { NextRequest, NextResponse } from 'next/server';
import { verifyApiKey } from '@/lib/auth/verify';
import { db, apiKeys } from '@/lib/db';
import { eq } from 'drizzle-orm';

// GET /api/credits/balance - 获取用户积分余额
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
  }

  const result = await verifyApiKey(authHeader);
  if (!result.valid) {
    return NextResponse.json({ error: result.error }, { status: 401 });
  }

  // Admin key 无法查询积分，需使用用户 API key
  if (result.userId === 'admin') {
    return NextResponse.json(
      { error: 'Admin key cannot query credits. Please use a user API key.' },
      { status: 400 }
    );
  }

  try {
    // 查询用户的 API Key 配额信息
    const key = await db.select({
      quotaLimit: apiKeys.quotaLimit,
      quotaUsed: apiKeys.quotaUsed,
    })
    .from(apiKeys)
    .where(eq(apiKeys.id, result.keyId!))
    .limit(1);

    if (!key.length) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    const total = key[0].quotaLimit ?? 0;
    const used = Math.floor(key[0].quotaUsed ?? 0);
    const remaining = total - used;

    return NextResponse.json({
      total,
      used,
      remaining: Math.max(0, remaining),
    });
  } catch (error) {
    console.error('Failed to get balance:', error);
    return NextResponse.json(
      { error: 'Failed to get balance', detail: String(error) },
      { status: 500 }
    );
  }
}
