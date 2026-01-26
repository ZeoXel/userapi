/**
 * 任务轮询服务
 * 定期检查未完成任务的状态
 */

import { Task, TaskStatus } from '@/lib/db/schema';
import {
  getPendingTasks,
  updateTask,
  getTaskById,
} from './index';
import {
  getPlatformAdapter,
  queryTaskStatus,
  PlatformTaskResult,
} from './platforms';
import {
  refundPreConsumedQuota,
  adjustQuota,
} from '@/lib/quota/preConsume';

// 轮询结果
export interface PollingResult {
  processed: number;
  success: number;
  failed: number;
  errors: string[];
}

/**
 * 执行任务轮询
 * @param limit 每次处理的最大任务数
 */
export async function pollTasks(limit = 100): Promise<PollingResult> {
  const result: PollingResult = {
    processed: 0,
    success: 0,
    failed: 0,
    errors: [],
  };

  try {
    // 获取所有未完成任务
    const pendingTasks = await getPendingTasks(limit);

    if (pendingTasks.length === 0) {
      return result;
    }

    // 按平台分组
    const tasksByPlatform = groupTasksByPlatform(pendingTasks);

    // 并行处理各平台任务
    const promises = Object.entries(tasksByPlatform).map(
      ([platform, tasks]) => processPlatformTasks(platform, tasks, result)
    );

    await Promise.allSettled(promises);

    result.processed = pendingTasks.length;
  } catch (error) {
    result.errors.push(`Polling error: ${error instanceof Error ? error.message : String(error)}`);
  }

  return result;
}

/**
 * 按平台分组任务
 */
function groupTasksByPlatform(tasks: Task[]): Record<string, Task[]> {
  return tasks.reduce((acc, task) => {
    const platform = task.platform.toLowerCase();
    if (!acc[platform]) {
      acc[platform] = [];
    }
    acc[platform].push(task);
    return acc;
  }, {} as Record<string, Task[]>);
}

/**
 * 处理单个平台的所有任务
 */
async function processPlatformTasks(
  platform: string,
  tasks: Task[],
  result: PollingResult
): Promise<void> {
  const adapter = getPlatformAdapter(platform);

  if (!adapter) {
    result.errors.push(`No adapter for platform: ${platform}`);
    return;
  }

  // 逐个处理任务
  for (const task of tasks) {
    try {
      await processTask(task, result);
    } catch (error) {
      result.errors.push(
        `Task ${task.taskId} error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

/**
 * 处理单个任务
 */
async function processTask(task: Task, result: PollingResult): Promise<void> {
  try {
    // 查询上游状态
    const platformResult = await queryTaskStatus(
      task.platform,
      task.taskId,
      task.action
    );

    // 根据状态更新任务
    await updateTaskFromResult(task, platformResult, result);
  } catch (error) {
    // 查询失败，记录错误但不改变任务状态
    console.error(`Failed to query task ${task.taskId}:`, error);
    result.errors.push(`Query failed for ${task.taskId}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 根据平台结果更新任务
 */
async function updateTaskFromResult(
  task: Task,
  platformResult: PlatformTaskResult,
  result: PollingResult
): Promise<void> {
  const now = new Date();

  // 状态没变化，只更新进度
  if (platformResult.status === task.status && platformResult.status !== TaskStatus.SUCCESS) {
    await updateTask(task.id, {
      progress: platformResult.progress,
    });
    return;
  }

  // 任务成功
  if (platformResult.status === TaskStatus.SUCCESS) {
    await updateTask(task.id, {
      status: TaskStatus.SUCCESS,
      progress: '100%',
      finishTime: now,
      responseData: platformResult.data,
      quotaActual: platformResult.actualCredits,
    });

    // 处理积分调整
    if (task.keyId && task.quotaPreConsumed) {
      const actualCredits = platformResult.actualCredits || task.quotaPreConsumed;
      await adjustQuota(
        task.keyId,
        task.userId,
        task.userName,
        task.quotaPreConsumed,
        actualCredits,
        task.taskId
      );
    }

    result.success++;
    return;
  }

  // 任务失败
  if (platformResult.status === TaskStatus.FAILURE) {
    await updateTask(task.id, {
      status: TaskStatus.FAILURE,
      progress: '100%',
      finishTime: now,
      failReason: platformResult.failReason,
      responseData: platformResult.data,
    });

    // 返还预扣费
    if (task.keyId && task.quotaPreConsumed && task.quotaPreConsumed > 0) {
      await refundPreConsumedQuota(
        task.keyId,
        task.userId,
        task.userName,
        task.quotaPreConsumed,
        task.taskId,
        platformResult.failReason || 'Task failed'
      );
    }

    result.failed++;
    return;
  }

  // 其他状态变更（如 queued → in_progress）
  await updateTask(task.id, {
    status: platformResult.status,
    progress: platformResult.progress,
    startTime: platformResult.status === TaskStatus.IN_PROGRESS ? now : undefined,
  });
}

/**
 * 手动触发单个任务的状态更新
 */
export async function refreshTaskStatus(taskId: string): Promise<Task | null> {
  const task = await getTaskById(taskId);

  if (!task) {
    return null;
  }

  // 已完成的任务不需要刷新
  if (task.status === TaskStatus.SUCCESS || task.status === TaskStatus.FAILURE) {
    return task;
  }

  try {
    const platformResult = await queryTaskStatus(
      task.platform,
      task.taskId,
      task.action
    );

    const result: PollingResult = { processed: 0, success: 0, failed: 0, errors: [] };
    await updateTaskFromResult(task, platformResult, result);

    // 返回更新后的任务
    return getTaskById(taskId);
  } catch (error) {
    console.error(`Failed to refresh task ${taskId}:`, error);
    return task;
  }
}
