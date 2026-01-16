import { NextRequest, NextResponse } from 'next/server';
import { db, apiKeys, users } from '@/lib/db';
import { generateApiKey } from '@/lib/auth/verify';
import { eq, and } from 'drizzle-orm';

// Admin 认证
function verifyAdmin(request: NextRequest): boolean {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return false;

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;

  return match[1] === process.env.ADMIN_API_KEY;
}

// GET /api/admin/keys - 获取 Key 列表
export async function GET(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('userId');

  try {
    let query = db
      .select({
        key: {
          id: apiKeys.id,
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
        },
        user: {
          id: users.id,
          name: users.name,
        },
      })
      .from(apiKeys)
      .innerJoin(users, eq(apiKeys.userId, users.id));

    if (userId) {
      query = query.where(eq(apiKeys.userId, userId)) as typeof query;
    }

    const keys = await query;
    return NextResponse.json({ keys });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch keys', detail: String(error) },
      { status: 500 }
    );
  }
}

// POST /api/admin/keys - 创建新 Key
export async function POST(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      userId,
      name,
      allowedProviders,
      quotaType = 'unlimited',
      quotaLimit,
      expiresAt,
    } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // 验证用户存在
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (user.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // 生成 Key
    const { key, hash, prefix } = await generateApiKey();
    const now = new Date();

    const newKey = {
      id: prefix.replace('ua_', 'key_'),
      userId,
      keyHash: hash,
      keyPrefix: prefix,
      name: name || null,
      status: 'active',
      allowedProviders: allowedProviders ? JSON.stringify(allowedProviders) : null,
      quotaType,
      quotaLimit: quotaLimit || null,
      quotaUsed: 0,
      quotaResetAt: quotaType === 'monthly' ? getNextMonthStart() : null,
      createdAt: now,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    };

    await db.insert(apiKeys).values(newKey);

    // 返回完整 Key (仅此一次显示)
    return NextResponse.json({
      key: {
        ...newKey,
        keyHash: undefined, // 不返回 hash
        fullKey: key, // 仅创建时返回完整 key
      },
      warning: '请保存此 Key，它不会再次显示！',
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create key', detail: String(error) },
      { status: 500 }
    );
  }
}

function getNextMonthStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}
