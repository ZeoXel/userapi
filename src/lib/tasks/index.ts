/**
 * 任务管理核心模块
 * 处理异步任务的创建、查询、更新
 */

import { db } from '@/lib/db';
import { tasks, Task, NewTask, TaskStatus, TaskStatusType } from '@/lib/db/schema';
import { eq, and, desc, ne, or, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

// 任务创建参数
export interface CreateTaskParams {
  userId: string;
  keyId?: string;
  userName?: string;
  taskId: string;           // 上游平台返回的任务ID
  platform: string;         // vidu, suno, kling...
  action: string;           // text2video, generate...
  quotaPreConsumed?: number;
  requestData?: Record<string, unknown>;
}

// 任务更新参数
export interface UpdateTaskParams {
  status?: TaskStatusType;
  progress?: string;
  failReason?: string;
  quotaActual?: number;
  startTime?: Date;
  finishTime?: Date;
  responseData?: Record<string, unknown>;
}

// 任务查询参数
export interface QueryTaskParams {
  userId?: string;
  platform?: string;
  status?: TaskStatusType | TaskStatusType[];
  limit?: number;
  offset?: number;
}

/**
 * 创建新任务
 */
export async function createTask(params: CreateTaskParams): Promise<Task> {
  const id = `task_${nanoid(12)}`;

  const [task] = await db.insert(tasks).values({
    id,
    userId: params.userId,
    keyId: params.keyId,
    userName: params.userName,
    taskId: params.taskId,
    platform: params.platform,
    action: params.action,
    status: TaskStatus.SUBMITTED,
    quotaPreConsumed: params.quotaPreConsumed || 0,
    requestData: params.requestData ? JSON.stringify(params.requestData) : null,
  }).returning();

  return task;
}

/**
 * 根据上游任务ID查询任务
 */
export async function getTaskByTaskId(taskId: string, userId?: string): Promise<Task | null> {
  const conditions = [eq(tasks.taskId, taskId)];
  if (userId) {
    conditions.push(eq(tasks.userId, userId));
  }

  const [task] = await db.select()
    .from(tasks)
    .where(and(...conditions))
    .limit(1);

  return task || null;
}

/**
 * 根据内部ID查询任务
 */
export async function getTaskById(id: string): Promise<Task | null> {
  const [task] = await db.select()
    .from(tasks)
    .where(eq(tasks.id, id))
    .limit(1);

  return task || null;
}

/**
 * 查询任务列表
 */
export async function queryTasks(params: QueryTaskParams): Promise<{ tasks: Task[]; total: number }> {
  const conditions = [];

  if (params.userId) {
    conditions.push(eq(tasks.userId, params.userId));
  }

  if (params.platform) {
    conditions.push(eq(tasks.platform, params.platform));
  }

  if (params.status) {
    if (Array.isArray(params.status)) {
      conditions.push(or(...params.status.map(s => eq(tasks.status, s))));
    } else {
      conditions.push(eq(tasks.status, params.status));
    }
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // 查询数据
  const taskList = await db.select()
    .from(tasks)
    .where(whereClause)
    .orderBy(desc(tasks.createdAt))
    .limit(params.limit || 20)
    .offset(params.offset || 0);

  // 查询总数
  const [{ count }] = await db.select({ count: sql<number>`count(*)` })
    .from(tasks)
    .where(whereClause);

  return { tasks: taskList, total: Number(count) };
}

/**
 * 获取未完成的任务（用于轮询）
 */
export async function getPendingTasks(limit = 100): Promise<Task[]> {
  return db.select()
    .from(tasks)
    .where(
      and(
        ne(tasks.status, TaskStatus.SUCCESS),
        ne(tasks.status, TaskStatus.FAILURE)
      )
    )
    .orderBy(tasks.createdAt)
    .limit(limit);
}

/**
 * 按平台获取未完成任务
 */
export async function getPendingTasksByPlatform(platform: string, limit = 50): Promise<Task[]> {
  return db.select()
    .from(tasks)
    .where(
      and(
        eq(tasks.platform, platform),
        ne(tasks.status, TaskStatus.SUCCESS),
        ne(tasks.status, TaskStatus.FAILURE)
      )
    )
    .orderBy(tasks.createdAt)
    .limit(limit);
}

/**
 * 更新任务状态
 */
export async function updateTask(id: string, params: UpdateTaskParams): Promise<Task | null> {
  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (params.status !== undefined) updateData.status = params.status;
  if (params.progress !== undefined) updateData.progress = params.progress;
  if (params.failReason !== undefined) updateData.failReason = params.failReason;
  if (params.quotaActual !== undefined) updateData.quotaActual = params.quotaActual;
  if (params.startTime !== undefined) updateData.startTime = params.startTime;
  if (params.finishTime !== undefined) updateData.finishTime = params.finishTime;
  if (params.responseData !== undefined) {
    updateData.responseData = JSON.stringify(params.responseData);
  }

  const [updated] = await db.update(tasks)
    .set(updateData)
    .where(eq(tasks.id, id))
    .returning();

  return updated || null;
}

/**
 * 批量更新任务状态（用于轮询后批量更新）
 */
export async function batchUpdateTasks(
  taskIds: string[],
  updates: UpdateTaskParams
): Promise<number> {
  if (taskIds.length === 0) return 0;

  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (updates.status !== undefined) updateData.status = updates.status;
  if (updates.progress !== undefined) updateData.progress = updates.progress;
  if (updates.failReason !== undefined) updateData.failReason = updates.failReason;
  if (updates.finishTime !== undefined) updateData.finishTime = updates.finishTime;

  const result = await db.update(tasks)
    .set(updateData)
    .where(or(...taskIds.map(id => eq(tasks.id, id))));

  return taskIds.length;
}

/**
 * 获取任务统计
 */
export async function getTaskStats(userId?: string): Promise<{
  total: number;
  pending: number;
  success: number;
  failure: number;
}> {
  const conditions = userId ? [eq(tasks.userId, userId)] : [];
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [stats] = await db.select({
    total: sql<number>`count(*)`,
    pending: sql<number>`count(*) filter (where ${tasks.status} in ('submitted', 'queued', 'in_progress'))`,
    success: sql<number>`count(*) filter (where ${tasks.status} = 'success')`,
    failure: sql<number>`count(*) filter (where ${tasks.status} = 'failure')`,
  })
    .from(tasks)
    .where(whereClause);

  return {
    total: Number(stats.total),
    pending: Number(stats.pending),
    success: Number(stats.success),
    failure: Number(stats.failure),
  };
}
