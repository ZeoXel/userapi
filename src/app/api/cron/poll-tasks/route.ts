/**
 * Cron 任务轮询端点
 * 由 Vercel Cron 每分钟调用
 * GET /api/cron/poll-tasks
 */

import { NextRequest, NextResponse } from 'next/server';
import { pollTasks } from '@/lib/tasks/polling';

export const runtime = 'nodejs';
export const maxDuration = 60; // 最大 60 秒

/**
 * GET /api/cron/poll-tasks
 * Cron 任务入口
 */
export async function GET(request: NextRequest) {
  // 验证 Cron 密钥
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // 如果配置了 CRON_SECRET，则验证
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // 也检查 Vercel 的自动 Cron 认证
    const vercelCronAuth = request.headers.get('x-vercel-cron-auth');
    if (vercelCronAuth !== cronSecret) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
  }

  try {
    console.log('[Cron] Starting task polling...');
    const startTime = Date.now();

    // 执行轮询
    const result = await pollTasks(100);

    const duration = Date.now() - startTime;
    console.log(`[Cron] Polling completed in ${duration}ms:`, result);

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        duration,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[Cron] Polling failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Polling failed',
      },
      { status: 500 }
    );
  }
}

// 也支持 POST 方法（用于手动触发）
export async function POST(request: NextRequest) {
  return GET(request);
}
