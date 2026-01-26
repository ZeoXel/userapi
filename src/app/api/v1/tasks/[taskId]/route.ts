/**
 * 单任务 API - 查询和更新
 * GET /api/v1/tasks/:taskId - 查询任务状态
 * PATCH /api/v1/tasks/:taskId - 更新任务状态
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyApiKey } from '@/lib/auth/verify';
import { getTaskByTaskId, updateTask } from '@/lib/tasks';
import { refreshTaskStatus } from '@/lib/tasks/polling';
import { TaskStatus } from '@/lib/db/schema';

export const runtime = 'nodejs';
export const maxDuration = 30;

interface RouteParams {
  params: Promise<{ taskId: string }>;
}

/**
 * GET /api/v1/tasks/:taskId
 * 查询单个任务状态
 * 支持 ?refresh=true 实时从上游刷新
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  // 验证 API Key
  const authHeader = request.headers.get('Authorization') || '';
  const authResult = await verifyApiKey(authHeader);
  if (!authResult.valid || !authResult.userId) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { taskId } = await params;
    const { searchParams } = new URL(request.url);
    const refresh = searchParams.get('refresh') === 'true';

    // 查询任务
    let task = await getTaskByTaskId(taskId, authResult.userId);

    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    // 如果请求刷新且任务未完成，实时查询上游状态
    if (refresh && task.status !== TaskStatus.SUCCESS && task.status !== TaskStatus.FAILURE) {
      const refreshedTask = await refreshTaskStatus(task.id);
      if (refreshedTask) {
        task = refreshedTask;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...task,
        requestData: task.requestData ? JSON.parse(task.requestData) : null,
        responseData: task.responseData ? JSON.parse(task.responseData) : null,
      },
    });
  } catch (error) {
    console.error('Failed to get task:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get task' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/v1/tasks/:taskId
 * 更新任务状态（主要用于内部调用）
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  // 验证 API Key
  const authHeader = request.headers.get('Authorization') || '';
  const authResult = await verifyApiKey(authHeader);
  if (!authResult.valid || !authResult.userId) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { taskId } = await params;
    const body = await request.json();

    // 查询任务
    const task = await getTaskByTaskId(taskId, authResult.userId);

    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    // 更新任务
    const {
      status,
      progress,
      failReason,
      quotaActual,
      responseData,
    } = body;

    const updated = await updateTask(task.id, {
      status,
      progress,
      failReason,
      quotaActual,
      responseData,
      finishTime: status === TaskStatus.SUCCESS || status === TaskStatus.FAILURE
        ? new Date()
        : undefined,
    });

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Failed to update task' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...updated,
        requestData: updated.requestData ? JSON.parse(updated.requestData) : null,
        responseData: updated.responseData ? JSON.parse(updated.responseData) : null,
      },
    });
  } catch (error) {
    console.error('Failed to update task:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update task' },
      { status: 500 }
    );
  }
}
