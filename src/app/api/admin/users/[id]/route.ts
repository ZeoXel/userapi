import { NextRequest, NextResponse } from 'next/server';
import { db, users, apiKeys, creditTransactions } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';

// 简单的 Admin 认证
function verifyAdmin(request: NextRequest): boolean {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return false;

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;

  return match[1] === process.env.ADMIN_API_KEY;
}

// GET /api/admin/users/[id] - 获取单个用户（含积分和交易记录）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const user = await db.select().from(users).where(eq(users.id, id)).limit(1);

    if (user.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 获取用户的 API Key 和积分信息
    const userKeys = await db.select().from(apiKeys).where(eq(apiKeys.userId, id));
    const userKey = userKeys[0] || null;

    // 计算积分
    const quotaLimit = userKey?.quotaLimit || 0;
    const quotaUsed = userKey?.quotaUsed || 0;
    const remaining = Math.max(0, quotaLimit - quotaUsed);

    // 获取最近交易记录
    const recentTransactions = await db
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.userId, id))
      .orderBy(desc(creditTransactions.createdAt))
      .limit(20);

    return NextResponse.json({
      user: user[0],
      apiKey: userKey ? {
        id: userKey.id,
        keyPrefix: userKey.keyPrefix,
        status: userKey.status,
        quotaType: userKey.quotaType,
        lastUsedAt: userKey.lastUsedAt,
      } : null,
      credits: {
        total: quotaLimit,
        used: quotaUsed,
        remaining: remaining,
      },
      recentTransactions: recentTransactions.map(t => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        balanceAfter: t.balanceAfter,
        service: t.service,
        provider: t.provider,
        model: t.model,
        description: t.description,
        createdAt: t.createdAt,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch user', detail: String(error) },
      { status: 500 }
    );
  }
}

// PUT /api/admin/users/[id] - 更新用户
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { name, email, phone, role, status } = body;

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (role !== undefined) updateData.role = role;
    if (status !== undefined) updateData.status = status;

    await db.update(users).set(updateData).where(eq(users.id, id));

    const updated = await db.select().from(users).where(eq(users.id, id)).limit(1);

    if (updated.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user: updated[0] });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update user', detail: String(error) },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users/[id] - 删除用户
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const result = await db.delete(users).where(eq(users.id, id));
    return NextResponse.json({ success: true, message: 'User deleted' });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete user', detail: String(error) },
      { status: 500 }
    );
  }
}
