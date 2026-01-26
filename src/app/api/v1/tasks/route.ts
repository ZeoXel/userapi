/**
 * 任务 API - 列表和创建
 * GET /api/v1/tasks - 查询用户任务列表
 * POST /api/v1/tasks - 创建新任务
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyApiKey } from '@/lib/auth/verify';
import { createTask, queryTasks, getTaskStats } from '@/lib/tasks';
import { preConsumeQuota } from '@/lib/quota/preConsume';
import { TaskStatus } from '@/lib/db/schema';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * GET /api/v1/tasks
 * 查询用户任务列表
 */
export async function GET(request: NextRequest) {
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
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform') || undefined;
    const status = searchParams.get('status') || undefined;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const includeStats = searchParams.get('stats') === 'true';

    // 查询任务
    const { tasks, total } = await queryTasks({
      userId: authResult.userId,
      platform,
      status: status as typeof TaskStatus[keyof typeof TaskStatus] | undefined,
      limit: Math.min(limit, 100),
      offset,
    });

    // 可选：获取统计
    let stats;
    if (includeStats) {
      stats = await getTaskStats(authResult.userId);
    }

    // 解析 JSON 字段
    const formattedTasks = tasks.map(task => ({
      ...task,
      requestData: task.requestData ? JSON.parse(task.requestData) : null,
      responseData: task.responseData ? JSON.parse(task.responseData) : null,
    }));

    return NextResponse.json({
      success: true,
      data: {
        tasks: formattedTasks,
        total,
        limit,
        offset,
        ...(stats && { stats }),
      },
    });
  } catch (error) {
    console.error('Failed to query tasks:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to query tasks' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/tasks
 * 创建新任务
 */
export async function POST(request: NextRequest) {
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
    const body = await request.json();
    const {
      taskId,
      platform,
      action,
      quotaPreConsumed,
      requestData,
    } = body;

    // 验证必填字段
    if (!taskId || !platform || !action) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: taskId, platform, action' },
        { status: 400 }
      );
    }

    // 预扣费（如果有配额要求）
    if (quotaPreConsumed && quotaPreConsumed > 0 && authResult.keyId) {
      const preConsumeResult = await preConsumeQuota(authResult.keyId, quotaPreConsumed);
      if (!preConsumeResult.success) {
        return NextResponse.json(
          {
            success: false,
            error: preConsumeResult.error || 'Insufficient quota',
            code: 'INSUFFICIENT_QUOTA',
          },
          { status: 402 }
        );
      }
    }

    // 创建任务
    const task = await createTask({
      userId: authResult.userId,
      keyId: authResult.keyId,
      userName: authResult.userName,
      taskId,
      platform,
      action,
      quotaPreConsumed: quotaPreConsumed || 0,
      requestData,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...task,
        requestData: task.requestData ? JSON.parse(task.requestData) : null,
      },
    });
  } catch (error) {
    console.error('Failed to create task:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create task' },
      { status: 500 }
    );
  }
}
