import { NextRequest, NextResponse } from 'next/server';
import { getProviders, type Provider } from '@/lib/proxy/router';

function verifyAdmin(request: NextRequest): boolean {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return false;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;
  return match[1] === process.env.ADMIN_API_KEY;
}

interface TestResult {
  id: string;
  name: string;
  configured: boolean;
  status: 'success' | 'error' | 'skipped';
  latency?: number;
  error?: string;
}

async function testProvider(provider: Provider): Promise<TestResult> {
  const apiKey = process.env[provider.auth.env_key];

  if (!apiKey) {
    return {
      id: provider.id,
      name: provider.name,
      configured: false,
      status: 'skipped',
      error: `环境变量 ${provider.auth.env_key} 未配置`,
    };
  }

  const startTime = Date.now();

  try {
    // 根据不同厂商选择合适的测试端点
    let testUrl = provider.base_url;
    const testMethod = 'GET';

    switch (provider.id) {
      case 'openai':
        testUrl = `${provider.base_url}/v1/models`;
        break;
      case 'vidu':
        testUrl = `${provider.base_url}/ent/v2/tasks?limit=1`;
        break;
      case 'volcengine':
        testUrl = `${provider.base_url}/models`;
        break;
      case 'minimax':
        testUrl = `${provider.base_url}/v1/models`;
        break;
      case 'suno':
        testUrl = `${provider.base_url}/suno/v1/models`;
        break;
      default:
        // 默认只测试能否建立连接
        testUrl = provider.base_url;
    }

    const response = await fetch(testUrl, {
      method: testMethod,
      headers: {
        [provider.auth.header]: `${provider.auth.prefix}${apiKey}`,
      },
      signal: AbortSignal.timeout(10000), // 10秒超时
    });

    const latency = Date.now() - startTime;

    // 2xx 或 4xx（表示连接成功但可能权限/参数问题）都算连接成功
    if (response.ok || (response.status >= 400 && response.status < 500)) {
      return {
        id: provider.id,
        name: provider.name,
        configured: true,
        status: 'success',
        latency,
      };
    }

    return {
      id: provider.id,
      name: provider.name,
      configured: true,
      status: 'error',
      latency,
      error: `HTTP ${response.status}`,
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    return {
      id: provider.id,
      name: provider.name,
      configured: true,
      status: 'error',
      latency,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// POST /api/admin/providers/test - 测试所有厂商连接
export async function POST(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const providers = getProviders();

  // 并行测试所有厂商
  const results = await Promise.all(providers.map(testProvider));

  const summary = {
    total: results.length,
    success: results.filter((r) => r.status === 'success').length,
    error: results.filter((r) => r.status === 'error').length,
    skipped: results.filter((r) => r.status === 'skipped').length,
  };

  return NextResponse.json({ results, summary });
}

// GET /api/admin/providers/test?id=xxx - 测试单个厂商
export async function GET(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const providerId = request.nextUrl.searchParams.get('id');
  if (!providerId) {
    return NextResponse.json({ error: 'Provider ID required' }, { status: 400 });
  }

  const providers = getProviders();
  const provider = providers.find((p) => p.id === providerId);

  if (!provider) {
    return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
  }

  const result = await testProvider(provider);
  return NextResponse.json(result);
}
