import { NextRequest, NextResponse } from 'next/server';
import { getProviders } from '@/lib/proxy/router';

// Admin 认证
function verifyAdmin(request: NextRequest): boolean {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return false;

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;

  return match[1] === process.env.ADMIN_API_KEY;
}

// GET /api/admin/providers - 获取厂商配置详情
export async function GET(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const providers = getProviders();

    return NextResponse.json({
      providers: providers.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        base_url: p.base_url,
        auth: {
          type: p.auth.type,
          header: p.auth.header,
          prefix: p.auth.prefix,
          env_key: p.auth.env_key,
          configured: !!process.env[p.auth.env_key],
        },
      })),
    });
  } catch (error) {
    console.error('Providers fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch providers', detail: String(error) },
      { status: 500 }
    );
  }
}
