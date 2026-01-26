/**
 * Admin Session API
 * 提供服务端认证状态，Admin Key 从环境变量获取
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export const runtime = 'nodejs';

// 带超时的数据库检查
async function checkDbWithTimeout(timeoutMs: number = 5000): Promise<{ connected: boolean; error: string | null }> {
  const timeoutPromise = new Promise<{ connected: boolean; error: string | null }>((_, reject) => {
    setTimeout(() => reject(new Error('Database connection timeout')), timeoutMs);
  });

  const checkPromise = (async () => {
    try {
      await db.execute(sql`SELECT 1`);
      return { connected: true, error: null };
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown database error',
      };
    }
  })();

  try {
    return await Promise.race([checkPromise, timeoutPromise]);
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Connection check failed',
    };
  }
}

/**
 * GET /api/admin/session
 * 检查服务端配置状态和数据库连接
 */
export async function GET() {
  const adminKey = process.env.ADMIN_API_KEY;

  // 检查数据库连接（带超时）
  const dbStatus = await checkDbWithTimeout(5000);

  if (dbStatus.error) {
    console.error('Database connection error:', dbStatus.error);
  }

  return NextResponse.json({
    authenticated: !!adminKey,
    adminKey: adminKey || null,
    database: {
      connected: dbStatus.connected,
      error: dbStatus.error,
    },
  });
}
