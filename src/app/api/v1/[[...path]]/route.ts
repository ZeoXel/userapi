import { NextRequest, NextResponse } from 'next/server';
import { verifyApiKey } from '@/lib/auth/verify';
import { matchProvider, getProviders } from '@/lib/proxy/router';
import { forwardRequest } from '@/lib/proxy/forwarder';
import { logUsage } from '@/lib/proxy/logger';
import { detectAndCreateTask } from '@/lib/tasks/detector';

export const maxDuration = 300; // 5分钟超时
export const dynamic = 'force-dynamic';

/**
 * 处理所有请求的核心逻辑
 */
async function handleRequest(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const resolvedParams = await params;
  const pathParts = resolvedParams.path || [];
  const fullPath = '/' + pathParts.join('/');

  // 处理根路径 - 返回可用厂商列表
  if (pathParts.length === 0) {
    const providers = getProviders();
    return NextResponse.json({
      message: 'USERAPI Gateway',
      version: '1.0.0',
      providers: providers.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
      })),
      usage: 'GET/POST /api/v1/{provider}/{path}',
    });
  }

  // 1. 验证 API Key
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return NextResponse.json(
      {
        error: 'Unauthorized',
        detail: 'Missing Authorization header',
      },
      { status: 401 }
    );
  }

  const keyResult = await verifyApiKey(authHeader);
  if (!keyResult.valid) {
    return NextResponse.json(
      {
        error: 'Unauthorized',
        detail: keyResult.error,
      },
      { status: 401 }
    );
  }

  // 2. 匹配目标厂商
  const match = matchProvider(fullPath);
  if (!match) {
    const providers = getProviders();
    return NextResponse.json(
      {
        error: 'Provider not found',
        detail: `Unknown provider in path: ${fullPath}`,
        available_providers: providers.map((p) => p.id),
      },
      { status: 404 }
    );
  }

  const { provider, targetPath } = match;

  // 3. 检查厂商权限
  if (
    keyResult.allowedProviders &&
    !keyResult.allowedProviders.includes(provider.id)
  ) {
    return NextResponse.json(
      {
        error: 'Forbidden',
        detail: `Access denied for provider: ${provider.id}`,
        allowed_providers: keyResult.allowedProviders,
      },
      { status: 403 }
    );
  }

  // 4. 检查配额
  if (keyResult.quotaRemaining !== null && keyResult.quotaRemaining !== undefined && keyResult.quotaRemaining <= 0) {
    return NextResponse.json(
      {
        error: 'Quota exceeded',
        detail: 'Your API quota has been exhausted',
      },
      { status: 429 }
    );
  }

  // 5. 读取请求体（用于任务检测）
  let requestBody: unknown = null;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    try {
      const clonedRequest = request.clone();
      requestBody = await clonedRequest.json();
    } catch {
      // 非 JSON 请求体，忽略
    }
  }

  // 6. 透传请求
  const result = await forwardRequest({
    request,
    provider,
    targetPath,
  });

  // 7. 检测并创建异步任务记录（成功响应才检测）
  if (result.status >= 200 && result.status < 300) {
    await detectAndCreateTask({
      provider: provider.id,
      targetPath,
      method: request.method,
      response: result.response,
      userId: keyResult.userId!,
      keyId: keyResult.keyId,
      userName: keyResult.userName,
      requestBody,
    });
  }

  // 8. 记录使用日志
  await logUsage({
    keyId: keyResult.keyId!,
    userId: keyResult.userId!,
    provider: provider.id,
    endpoint: targetPath,
    method: request.method,
    responseStatus: result.status,
    latencyMs: result.latencyMs,
    errorMessage: result.error,
  });

  return result.response;
}

// 导出所有 HTTP 方法
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> }
) {
  return handleRequest(request, context);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> }
) {
  return handleRequest(request, context);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> }
) {
  return handleRequest(request, context);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> }
) {
  return handleRequest(request, context);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> }
) {
  return handleRequest(request, context);
}
