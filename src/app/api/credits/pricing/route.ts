import { NextResponse } from 'next/server';
import { loadPricingConfig } from '@/lib/pricing';

// GET /api/credits/pricing - 获取定价配置（公开接口）
export async function GET() {
  try {
    const config = loadPricingConfig();
    return NextResponse.json(config);
  } catch (error) {
    console.error('Failed to load pricing config:', error);
    return NextResponse.json(
      { error: 'Failed to load pricing config' },
      { status: 500 }
    );
  }
}
