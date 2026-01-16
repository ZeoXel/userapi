import { NextRequest, NextResponse } from 'next/server';
import { db, users, apiKeys } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';

// 支持的认证源
const VALID_PROVIDERS = ['authing', 'tencent', 'wechat', 'manual'];

interface SyncRequest {
  provider: string;
  provider_id: string;
  provider_token?: string;
  phone?: string;
  email?: string;
  name?: string;
  avatar?: string;
}

// 生成 API Key
function generateApiKey(): { fullKey: string; keyHash: string; keyPrefix: string } {
  const prefix = 'ua_';
  const randomPart = nanoid(32);
  const fullKey = `${prefix}${randomPart}`;
  const keyHash = bcrypt.hashSync(fullKey, 10);
  const keyPrefix = fullKey.slice(0, 12);

  return { fullKey, keyHash, keyPrefix };
}

// POST /api/user/sync - 同步第三方认证用户
// 首次登录自动创建用户和 API Key，后续登录返回现有信息
export async function POST(request: NextRequest) {
  try {
    const body: SyncRequest = await request.json();
    const { provider, provider_id, phone, email, name, avatar } = body;

    // 验证必填字段
    if (!provider || !provider_id) {
      return NextResponse.json(
        { error: 'provider and provider_id are required' },
        { status: 400 }
      );
    }

    // 验证 provider 类型
    if (!VALID_PROVIDERS.includes(provider)) {
      return NextResponse.json(
        { error: `Invalid provider. Must be one of: ${VALID_PROVIDERS.join(', ')}` },
        { status: 400 }
      );
    }

    // TODO: 验证 provider_token (可选，根据安全需求决定)
    // 例如调用 Authing/腾讯云 API 验证 token 有效性

    const now = new Date();

    // 查找现有用户
    const existingUsers = await db
      .select()
      .from(users)
      .where(and(eq(users.provider, provider), eq(users.providerId, provider_id)));

    let user = existingUsers[0];
    let apiKey = null;
    let isNewUser = false;

    if (!user) {
      // 创建新用户
      isNewUser = true;
      const userId = nanoid();

      const newUser = {
        id: userId,
        provider,
        providerId: provider_id,
        name: name || phone || email || `用户${provider_id.slice(-6)}`,
        email: email || null,
        phone: phone || null,
        avatar: avatar || null,
        role: 'user',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      };

      await db.insert(users).values(newUser);
      user = newUser;

      // 为新用户自动创建 API Key
      const { fullKey, keyHash, keyPrefix } = generateApiKey();

      const newKey = {
        id: `key_${nanoid(9)}`,
        userId: userId,
        keyHash,
        keyPrefix,
        name: '默认密钥',
        status: 'active',
        allowedProviders: null, // 允许所有厂商
        quotaType: 'unlimited',
        quotaLimit: null,
        quotaUsed: 0,
        quotaResetAt: null,
        lastUsedAt: null,
        createdAt: now,
        expiresAt: null,
      };

      await db.insert(apiKeys).values(newKey);

      apiKey = {
        id: newKey.id,
        keyPrefix,
        fullKey, // 仅首次返回完整 key
        name: newKey.name,
        status: newKey.status,
        createdAt: newKey.createdAt,
      };
    } else {
      // 更新现有用户信息 (如果有变化)
      const updates: Record<string, unknown> = { updatedAt: now };
      if (name && name !== user.name) updates.name = name;
      if (email && email !== user.email) updates.email = email;
      if (phone && phone !== user.phone) updates.phone = phone;
      if (avatar && avatar !== user.avatar) updates.avatar = avatar;

      if (Object.keys(updates).length > 1) {
        await db.update(users).set(updates).where(eq(users.id, user.id));
        user = { ...user, ...updates };
      }

      // 获取用户的 API Key (仅返回前缀，不返回完整 key)
      const userKeys = await db
        .select()
        .from(apiKeys)
        .where(and(eq(apiKeys.userId, user.id), eq(apiKeys.status, 'active')));

      if (userKeys.length > 0) {
        apiKey = {
          id: userKeys[0].id,
          keyPrefix: userKeys[0].keyPrefix,
          name: userKeys[0].name,
          status: userKeys[0].status,
          createdAt: userKeys[0].createdAt,
        };
      }
    }

    return NextResponse.json({
      success: true,
      isNewUser,
      user: {
        id: user.id,
        provider: user.provider,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        role: user.role,
        status: user.status,
      },
      apiKey,
      message: isNewUser
        ? '用户创建成功，请保存您的 API Key（仅显示一次）'
        : '登录成功',
    });
  } catch (error) {
    console.error('User sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync user', detail: String(error) },
      { status: 500 }
    );
  }
}
