import { NextRequest, NextResponse } from 'next/server';
import {
  getAllPricing,
  getPricingList,
  getMultipliers,
  updateMultipliers,
  updateModelPricing,
  savePricingConfig,
  loadPricingConfig,
  clearPricingCache,
  VideoModelPricing,
  ImageModelPricing,
  AudioModelPricing,
  ChatModelPricing,
  PricingConfig,
} from '@/lib/pricing';

// Admin 认证
function verifyAdmin(request: NextRequest): boolean {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return false;

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;

  return match[1] === process.env.ADMIN_API_KEY;
}

// GET /api/admin/pricing - 获取所有定价配置
export async function GET(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format');

    if (format === 'list') {
      // 扁平化列表格式（便于前端表格展示）
      const list = getPricingList();
      const multipliers = getMultipliers();
      return NextResponse.json({ list, multipliers });
    }

    // 完整配置格式
    const config = getAllPricing();
    return NextResponse.json(config);
  } catch (error) {
    console.error('Failed to get pricing:', error);
    return NextResponse.json(
      { error: 'Failed to get pricing config', detail: String(error) },
      { status: 500 }
    );
  }
}

// PUT /api/admin/pricing - 更新定价配置
export async function PUT(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, service, provider, model, pricing, multipliers, fullConfig } = body;

    switch (action) {
      case 'update_model': {
        // 更新单个模型定价
        if (!service || !provider || !model || !pricing) {
          return NextResponse.json(
            { error: 'Required: service, provider, model, pricing' },
            { status: 400 }
          );
        }
        updateModelPricing(
          service as 'video' | 'image' | 'audio' | 'chat',
          provider,
          model,
          pricing as VideoModelPricing | ImageModelPricing | AudioModelPricing | ChatModelPricing
        );
        return NextResponse.json({ success: true, message: 'Model pricing updated' });
      }

      case 'update_multipliers': {
        // 更新倍率配置
        if (!multipliers || typeof multipliers !== 'object') {
          return NextResponse.json(
            { error: 'Required: multipliers object' },
            { status: 400 }
          );
        }
        updateMultipliers(multipliers);
        return NextResponse.json({ success: true, message: 'Multipliers updated' });
      }

      case 'replace_all': {
        // 完全替换配置
        if (!fullConfig) {
          return NextResponse.json(
            { error: 'Required: fullConfig object' },
            { status: 400 }
          );
        }
        savePricingConfig(fullConfig as PricingConfig);
        return NextResponse.json({ success: true, message: 'Full config replaced' });
      }

      case 'add_model': {
        // 添加新模型
        if (!service || !provider || !model || !pricing) {
          return NextResponse.json(
            { error: 'Required: service, provider, model, pricing' },
            { status: 400 }
          );
        }
        const config = loadPricingConfig();
        const serviceConfig = config[service as keyof typeof config];
        if (typeof serviceConfig === 'object' && serviceConfig !== null) {
          if (!(serviceConfig as Record<string, unknown>)[provider]) {
            (serviceConfig as Record<string, Record<string, unknown>>)[provider] = {};
          }
          (serviceConfig as Record<string, Record<string, unknown>>)[provider][model] = pricing;
          savePricingConfig(config);
        }
        return NextResponse.json({ success: true, message: 'Model added' });
      }

      case 'delete_model': {
        // 删除模型
        if (!service || !provider || !model) {
          return NextResponse.json(
            { error: 'Required: service, provider, model' },
            { status: 400 }
          );
        }
        const config = loadPricingConfig();
        const svcConfig = config[service as keyof typeof config];
        if (typeof svcConfig === 'object' && svcConfig !== null) {
          const providerConfig = (svcConfig as Record<string, Record<string, unknown>>)[provider];
          if (providerConfig && providerConfig[model]) {
            delete providerConfig[model];
            // 如果 provider 下没有模型了，也删除 provider
            if (Object.keys(providerConfig).length === 0) {
              delete (svcConfig as Record<string, unknown>)[provider];
            }
            savePricingConfig(config);
          }
        }
        return NextResponse.json({ success: true, message: 'Model deleted' });
      }

      case 'refresh_cache': {
        // 刷新缓存
        clearPricingCache();
        return NextResponse.json({ success: true, message: 'Cache cleared' });
      }

      default:
        return NextResponse.json(
          { error: 'Unknown action. Valid: update_model, update_multipliers, replace_all, add_model, delete_model, refresh_cache' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Failed to update pricing:', error);
    return NextResponse.json(
      { error: 'Failed to update pricing config', detail: String(error) },
      { status: 500 }
    );
  }
}

// POST /api/admin/pricing - 计算积分预览
export async function POST(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { service, provider, model, usage } = body;

    if (!service || !provider || !model || !usage) {
      return NextResponse.json(
        { error: 'Required: service, provider, model, usage' },
        { status: 400 }
      );
    }

    // 动态导入避免循环依赖
    const { calculateCredits } = await import('@/lib/pricing');

    const credits = calculateCredits({
      service,
      provider,
      model,
      ...usage,
    });

    return NextResponse.json({
      service,
      provider,
      model,
      usage,
      calculatedCredits: credits,
    });
  } catch (error) {
    console.error('Failed to calculate preview:', error);
    return NextResponse.json(
      { error: 'Failed to calculate preview', detail: String(error) },
      { status: 500 }
    );
  }
}
