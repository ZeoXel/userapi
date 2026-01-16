import { NextRequest, NextResponse } from 'next/server';
import { db, users } from '@/lib/db';
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

// GET /api/admin/users - 获取用户列表
export async function GET(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const allUsers = await db.select().from(users);
    return NextResponse.json({ users: allUsers });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch users', detail: String(error) },
      { status: 500 }
    );
  }
}

// POST /api/admin/users - 创建用户
export async function POST(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, email, role = 'user' } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const now = new Date();
    const newUser = {
      id: nanoid(),
      name,
      email: email || null,
      role,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(users).values(newUser);

    return NextResponse.json({ user: newUser }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('UNIQUE constraint failed')) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create user', detail: message },
      { status: 500 }
    );
  }
}
