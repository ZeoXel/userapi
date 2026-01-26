/**
 * 管理员任务 API
 * GET /api/admin/tasks - 查询所有任务
 */

import { NextRequest, NextResponse } from 'next/server';
import { queryTasks, getTaskStats } from '@/lib/tasks';
import { TaskStatus } from '@/lib/db/schema';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * 验证 Admin Key
 */
function verifyAdminKey(request: NextRequest): boolean {
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey) return false;

  const authHeader = request.headers.get('authorization');
  const xAdminKey = request.headers.get('x-admin-key');

  return (
    authHeader === `Bearer ${adminKey}` ||
    xAdminKey === adminKey
  );
}

/**
 * GET /api/admin/tasks
 * 查询所有任务（管理员）
 */
export async function GET(request: NextRequest) {
  if (!verifyAdminKey(request)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || undefined;
    const platform = searchParams.get('platform') || undefined;
    const status = searchParams.get('status') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 查询任务
    const { tasks, total } = await queryTasks({
      userId,
      platform,
      status: status as typeof TaskStatus[keyof typeof TaskStatus] | undefined,
      limit: Math.min(limit, 200),
      offset,
    });

    // 获取统计
    const stats = await getTaskStats();

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
        stats,
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
