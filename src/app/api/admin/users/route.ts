import { NextRequest, NextResponse } from 'next/server';
import { db, users, apiKeys } from '@/lib/db';
import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';

// 简单的 Admin 认证中间件
function verifyAdmin(request: NextRequest): boolean {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return false;

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;

  const adminKey = process.env.ADMIN_API_KEY;
  return match[1] === adminKey;
}

// GET /api/admin/users - 获取用户列表（包含密钥信息）
export async function GET(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 查询用户并 LEFT JOIN 密钥信息
    const allUsers = await db.select().from(users);
    const allKeys = await db.select({
      userId: apiKeys.userId,
      keyPrefix: apiKeys.keyPrefix,
      status: apiKeys.status,
      quotaType: apiKeys.quotaType,
      quotaUsed: apiKeys.quotaUsed,
      quotaLimit: apiKeys.quotaLimit,
      lastUsedAt: apiKeys.lastUsedAt,
    }).from(apiKeys);

    // 将密钥信息合并到用户数据
    const usersWithKeys = allUsers.map(user => {
      const userKey = allKeys.find(k => k.userId === user.id);
      return {
        ...user,
        apiKey: userKey ? {
          keyPrefix: userKey.keyPrefix,
          status: userKey.status,
          quotaType: userKey.quotaType,
          quotaUsed: userKey.quotaUsed,
          quotaLimit: userKey.quotaLimit,
          lastUsedAt: userKey.lastUsedAt,
        } : null,
      };
    });

    return NextResponse.json({ users: usersWithKeys });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users', detail: String(error) },
      { status: 500 }
    );
  }
}

// POST /api/admin/users - 创建用户 (管理员手动创建)
export async function POST(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, email, phone, role = 'user' } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const now = new Date();
    const id = nanoid();
    const newUser = {
      id,
      provider: 'manual', // 管理员手动创建
      providerId: id,     // 使用自身ID作为provider_id
      name,
      email: email || null,
      phone: phone || null,
      avatar: null,
      role,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(users).values(newUser);

    return NextResponse.json({ user: newUser }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('unique') || message.includes('UNIQUE')) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create user', detail: message },
      { status: 500 }
    );
  }
}
