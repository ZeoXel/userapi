import { NextRequest, NextResponse } from 'next/server';
import { db, apiKeys, users } from '@/lib/db';
import { generateApiKey } from '@/lib/auth/verify';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

// POST /api/user/keys/regenerate - 重新生成 API Key
// 通过 provider 认证，为老用户重新生成 API Key
export async function POST(request: NextRequest) {
  try {
    // 通过 provider 认证
    const body = await request.json();
    const { provider, provider_id } = body;

    if (!provider || !provider_id) {
      return NextResponse.json(
        { error: 'provider and provider_id are required' },
        { status: 400 }
      );
    }

    // 查找用户
    const userResult = await db
      .select()
      .from(users)
      .where(and(eq(users.provider, provider), eq(users.providerId, provider_id)));

    if (!userResult[0]) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = userResult[0];

    // 生成新的 API Key
    const { key, hash, prefix } = await generateApiKey();
    const now = new Date();

    const newKey = {
      id: prefix.replace('ua_', 'key_'),
      userId: user.id,
      userName: user.name,
      userPhone: user.phone,
      keyHash: hash,
      keyPrefix: prefix,
      name: '重新生成的密钥',
      status: 'active',
      allowedProviders: null,
      quotaType: 'unlimited',
      quotaLimit: null,
      quotaUsed: 0,
      quotaResetAt: null,
      lastUsedAt: null,
      createdAt: now,
      expiresAt: null,
    };

    await db.insert(apiKeys).values(newKey);

    return NextResponse.json({
      success: true,
      apiKey: {
        id: newKey.id,
        keyPrefix: prefix,
        fullKey: key, // 仅此一次返回完整 key
        name: newKey.name,
        status: newKey.status,
        createdAt: newKey.createdAt,
      },
      warning: '请保存此 API Key，它不会再次显示！',
    });
  } catch (error) {
    console.error('Regenerate key error:', error);
    return NextResponse.json(
      { error: 'Failed to regenerate key', detail: String(error) },
      { status: 500 }
    );
  }
}
