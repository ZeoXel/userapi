/**
 * 自动计费模块
 * 从网关响应中识别服务类型、提取用量信息并自动扣费
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextResponse } from 'next/server';
import { db, apiKeys, creditTransactions } from '@/lib/db';
import { eq, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { calculateCredits, UsageRequest } from '@/lib/pricing';

export interface ChargeContext {
  provider: string;
  targetPath: string;
  method: string;
  requestBody?: unknown;
  response: NextResponse;
  userId: string;
  keyId?: string;
  userName?: string;
}

export interface ChargeResult {
  charged: boolean;
  credits?: number;
  service?: string;
  error?: string;
}

/**
 * 计费端点配置
 * 定义哪些端点需要自动计费以及如何提取用量信息
 */
const BILLABLE_ENDPOINTS: Record<string, {
  pattern: RegExp;
  methods: string[];
  service: 'video' | 'image' | 'audio' | 'chat';
  extractUsage: (requestBody: unknown, responseData: unknown) => Record<string, unknown>;
  extractModel: (requestBody: unknown, responseData: unknown) => string;
}[]> = {
  // OpenAI 兼容端点
  openai: [
    {
      pattern: /\/v1\/images\/generations$/,
      methods: ['POST'],
      service: 'image',
      extractUsage: (req, res) => {
        const request = req as Record<string, any>;
        const response = res as Record<string, any>;
        return {
          imageCount: response?.data?.length || request?.n || 1,
          quality: request?.size || '1024x1024',
        };
      },
      extractModel: (req) => {
        const request = req as Record<string, any>;
        return request?.model || 'nano-banana';
      },
    },
    {
      pattern: /\/v1\/chat\/completions$/,
      methods: ['POST'],
      service: 'chat',
      extractUsage: (req, res) => {
        const response = res as Record<string, any>;
        return {
          inputTokens: response?.usage?.prompt_tokens || 0,
          outputTokens: response?.usage?.completion_tokens || 0,
        };
      },
      extractModel: (req) => {
        const request = req as Record<string, any>;
        return request?.model || 'gpt-4o-mini';
      },
    },
  ],

  // 火山引擎
  volcengine: [
    {
      pattern: /\/images\/generations$/,
      methods: ['POST'],
      service: 'image',
      extractUsage: (req, res) => {
        const response = res as Record<string, any>;
        return {
          imageCount: response?.data?.length || 1,
        };
      },
      extractModel: (req) => {
        const request = req as Record<string, any>;
        return request?.model || 'doubao-seedream-3-0-t2i-250415';
      },
    },
    {
      pattern: /\/video\/submit_task$/,
      methods: ['POST'],
      service: 'video',
      extractUsage: (req) => {
        const request = req as Record<string, any>;
        return {
          durationSeconds: request?.duration || 4,
          resolution: request?.resolution || '720p',
        };
      },
      extractModel: (req) => {
        const request = req as Record<string, any>;
        return request?.model || 'seedance-1.0-turbo';
      },
    },
  ],

  // Vidu (异步任务，在任务完成时计费)
  vidu: [
    {
      pattern: /\/ent\/v2\/tasks$/,
      methods: ['POST'],
      service: 'video',
      extractUsage: (req) => {
        const request = req as Record<string, any>;
        return {
          durationSeconds: request?.duration || 4,
          resolution: '720p',
        };
      },
      extractModel: (req) => {
        const request = req as Record<string, any>;
        return request?.model || 'viduq2-turbo';
      },
    },
  ],

  // Suno (异步任务)
  suno: [
    {
      pattern: /\/api\/generate$/,
      methods: ['POST'],
      service: 'audio',
      extractUsage: () => ({
        songCount: 1,
      }),
      extractModel: (req) => {
        const request = req as Record<string, any>;
        return request?.model || 'chirp-v3.5';
      },
    },
  ],

  // MiniMax
  minimax: [
    {
      pattern: /\/v1\/text_to_speech$/,
      methods: ['POST'],
      service: 'audio',
      extractUsage: (req) => {
        const request = req as Record<string, any>;
        return {
          characterCount: request?.text?.length || 0,
        };
      },
      extractModel: (req) => {
        const request = req as Record<string, any>;
        return request?.model || 'speech-02-turbo';
      },
    },
  ],
};

/**
 * 自动计费主函数
 */
export async function autoCharge(context: ChargeContext): Promise<ChargeResult> {
  const { provider, targetPath, method, requestBody, response, userId, keyId, userName } = context;

  // 1. 检查是否匹配计费端点
  const endpoints = BILLABLE_ENDPOINTS[provider.toLowerCase()];
  if (!endpoints) {
    return { charged: false }; // 该平台未配置计费
  }

  const matchedEndpoint = endpoints.find(
    (ep) => ep.pattern.test(targetPath) && ep.methods.includes(method.toUpperCase())
  );

  if (!matchedEndpoint) {
    return { charged: false }; // 不是计费端点
  }

  try {
    // 2. 克隆响应以读取内容
    const responseClone = response.clone();
    const responseText = await responseClone.text();

    let responseData: any = null;
    if (responseText) {
      try {
        responseData = JSON.parse(responseText);
      } catch {
        // 非 JSON 响应
      }
    }

    // 3. 提取用量信息
    const usage = matchedEndpoint.extractUsage(requestBody, responseData);
    const model = matchedEndpoint.extractModel(requestBody, responseData);

    // 4. 计算积分
    const usageRequest: UsageRequest = {
      service: matchedEndpoint.service,
      provider,
      model,
      ...usage,
    };

    const credits = calculateCredits(usageRequest);

    if (credits <= 0) {
      console.warn(`[AutoCharge] Calculated 0 credits for ${provider}${targetPath}`);
      return { charged: false };
    }

    // 5. 扣除积分
    if (!keyId) {
      console.warn(`[AutoCharge] No keyId provided, skipping charge`);
      return { charged: false };
    }

    await deductCredits({
      userId,
      keyId,
      userName,
      credits,
      service: matchedEndpoint.service,
      provider,
      model,
      metadata: usage,
    });

    console.log(`[AutoCharge] Charged ${credits} credits for ${provider}/${model} (${matchedEndpoint.service})`);

    return {
      charged: true,
      credits,
      service: matchedEndpoint.service,
    };
  } catch (error) {
    console.error('[AutoCharge] Failed to charge:', error);
    return {
      charged: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 扣除积分（内部函数）
 */
async function deductCredits(params: {
  userId: string;
  keyId: string;
  userName?: string;
  credits: number;
  service: string;
  provider: string;
  model: string;
  metadata: any;
}): Promise<void> {
  const { userId, keyId, userName, credits, service, provider, model, metadata } = params;

  // 查询当前配额
  const [key] = await db.select({
    id: apiKeys.id,
    quotaLimit: apiKeys.quotaLimit,
    quotaUsed: apiKeys.quotaUsed,
  })
  .from(apiKeys)
  .where(eq(apiKeys.id, keyId))
  .limit(1);

  if (!key) {
    throw new Error('API key not found');
  }

  const total = key.quotaLimit ?? 0;
  const used = key.quotaUsed ?? 0;
  const remaining = total - used;

  // 检查余额
  if (remaining < credits) {
    throw new Error(`Insufficient credits: required ${credits}, available ${remaining}`);
  }

  // 计算新余额
  const newUsed = used + credits;
  const balanceAfter = Math.max(0, total - newUsed);

  // 创建交易记录
  const transactionId = nanoid();
  const transaction = {
    id: transactionId,
    userId,
    userName,
    keyId,
    type: 'consumption' as const,
    amount: credits,
    balanceAfter: Math.floor(balanceAfter),
    service,
    provider,
    model,
    metadata: JSON.stringify(metadata),
    description: `${service} - ${provider}/${model} (auto)`,
  };

  // 更新配额并插入交易记录
  await db.update(apiKeys)
    .set({ quotaUsed: sql`${apiKeys.quotaUsed} + ${credits}` })
    .where(eq(apiKeys.id, key.id));

  await db.insert(creditTransactions).values(transaction);
}
