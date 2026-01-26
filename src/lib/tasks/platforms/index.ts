/**
 * 平台适配器索引
 * 统一管理各平台的任务状态查询
 */

import { Task, TaskStatusType, TaskStatus } from '@/lib/db/schema';

// 平台任务状态结果
export interface PlatformTaskResult {
  taskId: string;
  status: TaskStatusType;
  progress: string;
  failReason?: string;
  data?: Record<string, unknown>;
  // 实际消耗的积分（如果平台返回）
  actualCredits?: number;
}

// 平台适配器接口
export interface PlatformAdapter {
  name: string;
  // 查询单个任务状态
  queryTaskStatus(taskId: string, action?: string): Promise<PlatformTaskResult>;
  // 批量查询任务状态
  queryBatchTaskStatus?(taskIds: string[]): Promise<PlatformTaskResult[]>;
}

// Vidu 适配器
const viduAdapter: PlatformAdapter = {
  name: 'vidu',

  async queryTaskStatus(taskId: string, action?: string): Promise<PlatformTaskResult> {
    const baseUrl = process.env.VIDU_BASE_URL || 'https://api.vidu.cn';
    const apiKey = process.env.VIDU_API_KEY;

    if (!apiKey) {
      throw new Error('VIDU_API_KEY not configured');
    }

    // 根据 action 确定查询端点
    const endpoint = action?.includes('upscale')
      ? `/ent/v2/upscale/${taskId}`
      : `/ent/v2/tasks/${taskId}`;

    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'GET',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Vidu API error: ${response.status}`);
    }

    const data = await response.json();

    // 映射 Vidu 状态到统一状态
    const statusMap: Record<string, TaskStatusType> = {
      'pending': TaskStatus.QUEUED,
      'processing': TaskStatus.IN_PROGRESS,
      'success': TaskStatus.SUCCESS,
      'failed': TaskStatus.FAILURE,
      'error': TaskStatus.FAILURE,
    };

    return {
      taskId,
      status: statusMap[data.state] || TaskStatus.IN_PROGRESS,
      progress: data.state === 'success' ? '100%' : `${data.progress || 0}%`,
      failReason: data.err_msg || data.error,
      data,
    };
  },
};

// Suno 适配器
const sunoAdapter: PlatformAdapter = {
  name: 'suno',

  async queryTaskStatus(taskId: string): Promise<PlatformTaskResult> {
    const baseUrl = process.env.SUNO_BASE_URL || 'https://api.suno.ai';
    const apiKey = process.env.SUNO_API_KEY;

    if (!apiKey) {
      throw new Error('SUNO_API_KEY not configured');
    }

    const response = await fetch(`${baseUrl}/api/feed/${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Suno API error: ${response.status}`);
    }

    const data = await response.json();
    const item = Array.isArray(data) ? data[0] : data;

    // 映射 Suno 状态
    const statusMap: Record<string, TaskStatusType> = {
      'queued': TaskStatus.QUEUED,
      'streaming': TaskStatus.IN_PROGRESS,
      'complete': TaskStatus.SUCCESS,
      'error': TaskStatus.FAILURE,
    };

    return {
      taskId,
      status: statusMap[item.status] || TaskStatus.IN_PROGRESS,
      progress: item.status === 'complete' ? '100%' : '50%',
      failReason: item.error_message,
      data: item,
    };
  },
};

// MiniMax 适配器 (语音合成通常是同步的，这里预留)
const minimaxAdapter: PlatformAdapter = {
  name: 'minimax',

  async queryTaskStatus(taskId: string): Promise<PlatformTaskResult> {
    // MiniMax TTS 通常是同步返回，不需要轮询
    // 这里返回成功状态
    return {
      taskId,
      status: TaskStatus.SUCCESS,
      progress: '100%',
    };
  },
};

// Kling 适配器
const klingAdapter: PlatformAdapter = {
  name: 'kling',

  async queryTaskStatus(taskId: string): Promise<PlatformTaskResult> {
    const baseUrl = process.env.KLING_BASE_URL;
    const apiKey = process.env.KLING_API_KEY;

    if (!apiKey || !baseUrl) {
      throw new Error('KLING configuration not complete');
    }

    const response = await fetch(`${baseUrl}/v1/videos/text2video/${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Kling API error: ${response.status}`);
    }

    const data = await response.json();

    const statusMap: Record<string, TaskStatusType> = {
      'submitted': TaskStatus.SUBMITTED,
      'processing': TaskStatus.IN_PROGRESS,
      'succeed': TaskStatus.SUCCESS,
      'failed': TaskStatus.FAILURE,
    };

    return {
      taskId,
      status: statusMap[data.data?.task_status] || TaskStatus.IN_PROGRESS,
      progress: data.data?.task_status === 'succeed' ? '100%' : '50%',
      failReason: data.data?.task_status_msg,
      data: data.data,
    };
  },
};

// 适配器注册表
const adapters: Record<string, PlatformAdapter> = {
  vidu: viduAdapter,
  suno: sunoAdapter,
  minimax: minimaxAdapter,
  kling: klingAdapter,
};

/**
 * 获取平台适配器
 */
export function getPlatformAdapter(platform: string): PlatformAdapter | null {
  return adapters[platform.toLowerCase()] || null;
}

/**
 * 获取所有支持的平台
 */
export function getSupportedPlatforms(): string[] {
  return Object.keys(adapters);
}

/**
 * 查询任务状态（通用入口）
 */
export async function queryTaskStatus(
  platform: string,
  taskId: string,
  action?: string
): Promise<PlatformTaskResult> {
  const adapter = getPlatformAdapter(platform);

  if (!adapter) {
    throw new Error(`Unsupported platform: ${platform}`);
  }

  return adapter.queryTaskStatus(taskId, action);
}
