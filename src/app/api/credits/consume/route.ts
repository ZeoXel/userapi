import { NextRequest, NextResponse } from 'next/server';
import { verifyApiKey } from '@/lib/auth/verify';
import { db, apiKeys, creditTransactions } from '@/lib/db';
import { eq, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { calculateCredits, UsageRequest } from '@/lib/pricing';

/**
 * 消费请求 - 支持两种模式：
 * 1. 直接传 credits（向后兼容）
 * 2. 传 usage 用量信息，由服务端计算 credits
 */
interface ConsumeRequest {
  service: 'video' | 'image' | 'audio' | 'chat';
  provider: string;
  model: string;
  // 模式1：直接传积分（向后兼容）
  credits?: number;
  // 模式2：传用量信息
  usage?: {
    // 视频
    durationSeconds?: number;
    resolution?: string;
    // 图像
    imageCount?: number;
    quality?: string;
    // 音频
    songCount?: number;
    characterCount?: number;
    // 对话
    inputTokens?: number;
    outputTokens?: number;
  };
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
    const { service, provider, model, credits: directCredits, usage, metadata } = body;

    // 验证基础参数
    if (!service || !provider || !model) {
      return NextResponse.json(
        { error: 'Invalid request. Required: service, provider, model' },
        { status: 400 }
      );
    }

    // 计算积分
    let credits: number;

    if (typeof directCredits === 'number' && directCredits > 0) {
      // 模式1：直接传积分（向后兼容）
      credits = directCredits;
    } else if (usage) {
      // 模式2：根据用量计算积分
      const usageRequest: UsageRequest = {
        service,
        provider,
        model,
        durationSeconds: usage.durationSeconds,
        resolution: usage.resolution,
        imageCount: usage.imageCount,
        quality: usage.quality,
        songCount: usage.songCount,
        characterCount: usage.characterCount,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
      };
      credits = calculateCredits(usageRequest);

      if (credits <= 0) {
        return NextResponse.json(
          { error: 'Could not calculate credits from usage. Check service/provider/model and usage parameters.' },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid request. Provide either "credits" (number > 0) or "usage" object.' },
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
      keyId: result.keyId!,
      type: 'consumption',
      amount: credits,
      balanceAfter: Math.floor(balanceAfter),
      service,
      provider,
      model,
      metadata: metadata ? JSON.stringify(metadata) : (usage ? JSON.stringify(usage) : null),
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
      // 如果是用量计算模式，返回计算详情
      ...(usage && {
        calculation: {
          service,
          provider,
          model,
          usage,
          calculatedCredits: credits,
        },
      }),
    });
  } catch (error) {
    console.error('Failed to consume credits:', error);
    return NextResponse.json(
      { error: 'Failed to consume credits', detail: String(error) },
      { status: 500 }
    );
  }
}
