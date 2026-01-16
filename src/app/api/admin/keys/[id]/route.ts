import { NextRequest, NextResponse } from 'next/server';
import { db, apiKeys } from '@/lib/db';
import { eq } from 'drizzle-orm';

// Admin 认证
function verifyAdmin(request: NextRequest): boolean {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return false;

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;

  return match[1] === process.env.ADMIN_API_KEY;
}

// GET /api/admin/keys/[id] - 获取单个 Key
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const key = await db
      .select({
        id: apiKeys.id,
        userId: apiKeys.userId,
        keyPrefix: apiKeys.keyPrefix,
        name: apiKeys.name,
        status: apiKeys.status,
        allowedProviders: apiKeys.allowedProviders,
        quotaType: apiKeys.quotaType,
        quotaLimit: apiKeys.quotaLimit,
        quotaUsed: apiKeys.quotaUsed,
        lastUsedAt: apiKeys.lastUsedAt,
        createdAt: apiKeys.createdAt,
        expiresAt: apiKeys.expiresAt,
      })
      .from(apiKeys)
      .where(eq(apiKeys.id, id))
      .limit(1);

    if (key.length === 0) {
      return NextResponse.json({ error: 'Key not found' }, { status: 404 });
    }

    return NextResponse.json({ key: key[0] });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch key', detail: String(error) },
      { status: 500 }
    );
  }
}

// PUT /api/admin/keys/[id] - 更新 Key
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
    const { name, status, allowedProviders, quotaType, quotaLimit } = body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (status !== undefined) updateData.status = status;
    if (allowedProviders !== undefined) {
      updateData.allowedProviders = allowedProviders ? JSON.stringify(allowedProviders) : null;
    }
    if (quotaType !== undefined) updateData.quotaType = quotaType;
    if (quotaLimit !== undefined) updateData.quotaLimit = quotaLimit;

    await db.update(apiKeys).set(updateData).where(eq(apiKeys.id, id));

    const updated = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.id, id))
      .limit(1);

    if (updated.length === 0) {
      return NextResponse.json({ error: 'Key not found' }, { status: 404 });
    }

    return NextResponse.json({ key: updated[0] });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update key', detail: String(error) },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/keys/[id] - 吊销 Key (软删除)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    // 软删除：设置状态为 revoked
    await db
      .update(apiKeys)
      .set({ status: 'revoked' })
      .where(eq(apiKeys.id, id));

    return NextResponse.json({ success: true, message: 'Key revoked' });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to revoke key', detail: String(error) },
      { status: 500 }
    );
  }
}
