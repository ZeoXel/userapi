import { NextRequest, NextResponse } from 'next/server';
import { Provider, getProviderApiKey } from './router';

export interface ForwardOptions {
  request: NextRequest;
  provider: Provider;
  targetPath: string;
}

export interface ForwardResult {
  response: NextResponse;
  status: number;
  error?: string;
  latencyMs: number;
}

// 需要跳过的请求头
const SKIP_REQUEST_HEADERS = new Set([
  'host',
  'authorization',
  'connection',
  'keep-alive',
  'transfer-encoding',
  'te',
  'trailer',
  'upgrade',
]);

// 需要跳过的响应头
const SKIP_RESPONSE_HEADERS = new Set([
  'content-encoding',
  'transfer-encoding',
  'connection',
]);

/**
 * 透传请求到目标厂商
 */
export async function forwardRequest(options: ForwardOptions): Promise<ForwardResult> {
  const { request, provider, targetPath } = options;
  const startTime = Date.now();

  // 获取厂商 API Key
  const providerKey = getProviderApiKey(provider);
  if (!providerKey) {
    return {
      response: NextResponse.json(
        {
          error: 'Provider not configured',
          detail: `API key for provider "${provider.id}" is not configured`,
        },
        { status: 500 }
      ),
      status: 500,
      error: 'Provider not configured',
      latencyMs: Date.now() - startTime,
    };
  }

  // 构建目标 URL
  const targetUrl = `${provider.base_url}${targetPath}`;
  const url = new URL(targetUrl);

  // 附加查询参数
  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.append(key, value);
  });

  // 准备请求头 (透传原始头，替换认证)
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!SKIP_REQUEST_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  // 设置厂商认证头
  const authValue = `${provider.auth.prefix}${providerKey}`;
  headers.set(provider.auth.header, authValue);

  try {
    // 获取请求体 (原样透传)
    let body: BodyInit | null = null;
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      body = await request.text();
    }

    // 发送请求
    const response = await fetch(url.toString(), {
      method: request.method,
      headers,
      body,
    });

    // 准备响应头
    const responseHeaders = new Headers();
    response.headers.forEach((value, key) => {
      if (!SKIP_RESPONSE_HEADERS.has(key.toLowerCase())) {
        responseHeaders.set(key, value);
      }
    });

    // 添加网关标识头
    responseHeaders.set('X-Gateway-Provider', provider.id);
    responseHeaders.set('X-Gateway-Latency', String(Date.now() - startTime));

    // 获取响应体
    const responseBody = await response.arrayBuffer();

    return {
      response: new NextResponse(responseBody, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      }),
      status: response.status,
      latencyMs: Date.now() - startTime,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return {
      response: NextResponse.json(
        {
          error: 'Gateway error',
          detail: errorMessage,
          provider: provider.id,
          target: targetUrl,
        },
        { status: 502 }
      ),
      status: 502,
      error: errorMessage,
      latencyMs: Date.now() - startTime,
    };
  }
}
