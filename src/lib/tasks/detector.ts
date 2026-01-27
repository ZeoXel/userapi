/**
 * 异步任务自动检测模块
 * 从网关响应中识别异步任务并自动创建记录
 */

import { NextResponse } from 'next/server';
import { createTask } from './index';

export interface TaskDetectionContext {
  provider: string;
  targetPath: string;
  method: string;
  response: NextResponse;
  userId: string;
  keyId?: string;
  userName?: string;
  requestBody?: unknown;
}

/**
 * 异步任务端点模式配置
 */
const ASYNC_ENDPOINT_PATTERNS: Record<string, {
  pattern: RegExp;
  methods: string[];
  extractTaskId: (data: any) => string | null;
  extractAction: (path: string, data: any) => string;
}[]> = {
  vidu: [
    {
      pattern: /\/ent\/v2\/tasks$/,
      methods: ['POST'],
      extractTaskId: (data) => data?.data?.id || data?.id || null,
      extractAction: () => 'text2video',
    },
    {
      pattern: /\/ent\/v2\/upscale$/,
      methods: ['POST'],
      extractTaskId: (data) => data?.data?.id || data?.id || null,
      extractAction: () => 'upscale',
    },
  ],
  suno: [
    {
      pattern: /\/api\/generate$/,
      methods: ['POST'],
      extractTaskId: (data) => {
        // Suno 可能返回数组
        if (Array.isArray(data)) {
          return data[0]?.id || null;
        }
        return data?.id || null;
      },
      extractAction: () => 'generate',
    },
  ],
  kling: [
    {
      pattern: /\/v1\/videos\/text2video$/,
      methods: ['POST'],
      extractTaskId: (data) => data?.data?.task_id || null,
      extractAction: () => 'text2video',
    },
    {
      pattern: /\/v1\/videos\/image2video$/,
      methods: ['POST'],
      extractTaskId: (data) => data?.data?.task_id || null,
      extractAction: () => 'image2video',
    },
  ],
};

/**
 * 检测并创建异步任务记录
 */
export async function detectAndCreateTask(
  context: TaskDetectionContext
): Promise<void> {
  const { provider, targetPath, method, response, userId, keyId, userName, requestBody } = context;

  // 1. 检查是否匹配异步任务端点
  const patterns = ASYNC_ENDPOINT_PATTERNS[provider.toLowerCase()];
  if (!patterns) {
    return; // 该平台未配置异步任务检测
  }

  const matchedPattern = patterns.find(
    (p) => p.pattern.test(targetPath) && p.methods.includes(method.toUpperCase())
  );

  if (!matchedPattern) {
    return; // 不是异步任务端点
  }

  try {
    // 2. 克隆响应以读取内容（不影响原响应）
    const responseClone = response.clone();
    const responseText = await responseClone.text();

    // 空响应直接返回
    if (!responseText) {
      return;
    }

    // 3. 解析响应数据
    let responseData: any;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      // 非 JSON 响应，跳过
      return;
    }

    // 4. 提取 taskId
    const taskId = matchedPattern.extractTaskId(responseData);
    if (!taskId) {
      console.warn(`[TaskDetector] No taskId found in response for ${provider}${targetPath}`);
      return;
    }

    // 5. 提取 action
    const action = matchedPattern.extractAction(targetPath, responseData);

    // 6. 创建任务记录
    await createTask({
      userId,
      keyId,
      userName,
      taskId,
      platform: provider,
      action,
      quotaPreConsumed: 0, // 透传模式下，配额在 usageLogs 中记录
      requestData: requestBody as Record<string, unknown>,
    });

    console.log(`[TaskDetector] Created task record: ${taskId} (${provider}/${action})`);
  } catch (error) {
    // 任务检测失败不应影响主流程
    console.error('[TaskDetector] Failed to detect task:', error);
  }
}
