/**
 * 异步任务自动检测模块
 * 从网关响应中识别异步任务并自动创建记录
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextResponse } from 'next/server';
import { createTask, updateTask } from './index';
import { TaskStatus } from '@/lib/db/schema';

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
 * 任务端点模式配置（包括异步和同步任务）
 */
const TASK_ENDPOINT_PATTERNS: Record<string, {
  pattern: RegExp;
  methods: string[];
  isSync: boolean; // true=同步任务（立即完成），false=异步任务（需要轮询）
  extractTaskId: (data: any, requestBody?: any) => string | null;
  extractAction: (path: string, data: any) => string;
  extractResponseData?: (data: any) => Record<string, unknown>;
}[]> = {
  // Vidu - 异步任务
  vidu: [
    {
      pattern: /\/ent\/v2\/tasks$/,
      methods: ['POST'],
      isSync: false,
      extractTaskId: (data) => data?.data?.id || data?.id || null,
      extractAction: () => 'text2video',
    },
    {
      pattern: /\/ent\/v2\/upscale$/,
      methods: ['POST'],
      isSync: false,
      extractTaskId: (data) => data?.data?.id || data?.id || null,
      extractAction: () => 'upscale',
    },
  ],

  // Suno - 异步任务
  suno: [
    {
      pattern: /\/api\/generate$/,
      methods: ['POST'],
      isSync: false,
      extractTaskId: (data) => {
        if (Array.isArray(data)) {
          return data[0]?.id || null;
        }
        return data?.id || null;
      },
      extractAction: () => 'generate',
    },
  ],

  // Kling - 异步任务
  kling: [
    {
      pattern: /\/v1\/videos\/text2video$/,
      methods: ['POST'],
      isSync: false,
      extractTaskId: (data) => data?.data?.task_id || null,
      extractAction: () => 'text2video',
    },
    {
      pattern: /\/v1\/videos\/image2video$/,
      methods: ['POST'],
      isSync: false,
      extractTaskId: (data) => data?.data?.task_id || null,
      extractAction: () => 'image2video',
    },
  ],

  // OpenAI 兼容端点 - 同步任务
  openai: [
    {
      pattern: /\/v1\/images\/generations$/,
      methods: ['POST'],
      isSync: true,
      extractTaskId: (data, req) => {
        // 同步任务使用请求时间戳 + 随机数作为 taskId
        return `sync_img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      },
      extractAction: () => 'image_generation',
      extractResponseData: (data) => ({
        images: data?.data || [],
        model: data?.model,
      }),
    },
    {
      pattern: /\/v1\/chat\/completions$/,
      methods: ['POST'],
      isSync: true,
      extractTaskId: (data) => {
        return `sync_chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      },
      extractAction: () => 'chat_completion',
      extractResponseData: (data) => ({
        choices: data?.choices,
        usage: data?.usage,
        model: data?.model,
      }),
    },
  ],

  // 火山引擎 - 图像同步，视频异步
  volcengine: [
    {
      pattern: /\/images\/generations$/,
      methods: ['POST'],
      isSync: true,
      extractTaskId: () => `sync_img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      extractAction: () => 'image_generation',
      extractResponseData: (data) => ({
        images: data?.data || [],
      }),
    },
    {
      pattern: /\/video\/submit_task$/,
      methods: ['POST'],
      isSync: false,
      extractTaskId: (data) => data?.task_id || null,
      extractAction: () => 'video_generation',
    },
  ],
};

/**
 * 检测并创建任务记录（支持同步和异步任务）
 */
export async function detectAndCreateTask(
  context: TaskDetectionContext
): Promise<void> {
  const { provider, targetPath, method, response, userId, keyId, userName, requestBody } = context;

  // 1. 检查是否匹配任务端点
  const patterns = TASK_ENDPOINT_PATTERNS[provider.toLowerCase()];
  if (!patterns) {
    return; // 该平台未配置任务检测
  }

  const matchedPattern = patterns.find(
    (p) => p.pattern.test(targetPath) && p.methods.includes(method.toUpperCase())
  );

  if (!matchedPattern) {
    return; // 不是任务端点
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
    const taskId = matchedPattern.extractTaskId(responseData, requestBody);
    if (!taskId) {
      console.warn(`[TaskDetector] No taskId found in response for ${provider}${targetPath}`);
      return;
    }

    // 5. 提取 action
    const action = matchedPattern.extractAction(targetPath, responseData);

    // 6. 提取响应数据（用于同步任务）
    const extractedResponseData = matchedPattern.extractResponseData
      ? matchedPattern.extractResponseData(responseData)
      : responseData;

    // 7. 创建任务记录
    const task = await createTask({
      userId,
      keyId,
      userName,
      taskId,
      platform: provider,
      action,
      quotaPreConsumed: 0, // 透传模式下，配额由自动计费处理
      requestData: requestBody as Record<string, unknown>,
    });

    // 8. 如果是同步任务，立即标记为成功
    if (matchedPattern.isSync) {
      await updateTask(task.id, {
        status: TaskStatus.SUCCESS,
        progress: '100%',
        startTime: new Date(),
        finishTime: new Date(),
        responseData: extractedResponseData,
      });
      console.log(`[TaskDetector] Created sync task: ${taskId} (${provider}/${action}) - completed`);
    } else {
      console.log(`[TaskDetector] Created async task: ${taskId} (${provider}/${action}) - pending`);
    }
  } catch (error) {
    // 任务检测失败不应影响主流程
    console.error('[TaskDetector] Failed to detect task:', error);
  }
}
