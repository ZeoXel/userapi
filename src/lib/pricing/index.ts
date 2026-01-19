import { readFileSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';

export interface PricingConfig {
  video: Record<string, Record<string, { per_second: number; min_charge: number }>>;
  image: Record<string, Record<string, number | Record<string, number | Record<string, number>>>>;
  audio: Record<string, Record<string, { per_song: number }>>;
  chat: Record<string, Record<string, { input_per_1k: number; output_per_1k: number }>>;
  multipliers: {
    default: number;
    [key: string]: number;
  };
}

let cachedConfig: PricingConfig | null = null;

/**
 * 加载定价配置
 */
export function loadPricingConfig(): PricingConfig {
  if (cachedConfig) return cachedConfig;

  try {
    const configPath = join(process.cwd(), 'src/config/pricing.yaml');
    const fileContent = readFileSync(configPath, 'utf8');
    cachedConfig = yaml.load(fileContent) as PricingConfig;
    return cachedConfig;
  } catch (error) {
    console.error('Failed to load pricing config:', error);
    // 返回默认配置
    return {
      video: {},
      image: {},
      audio: {},
      chat: {},
      multipliers: { default: 1.0 },
    };
  }
}

/**
 * 计算视频积分
 */
export function calculateVideoCredits(
  provider: string,
  model: string,
  durationSeconds: number
): number {
  const config = loadPricingConfig();
  const providerConfig = config.video[provider];
  if (!providerConfig) return 0;

  const modelConfig = providerConfig[model];
  if (!modelConfig) return 0;

  const credits = Math.ceil(durationSeconds * modelConfig.per_second);
  return Math.max(credits, modelConfig.min_charge) * config.multipliers.default;
}

/**
 * 计算图像积分
 */
export function calculateImageCredits(
  provider: string,
  model: string,
  options?: { quality?: string; size?: string; count?: number }
): number {
  const config = loadPricingConfig();
  const providerConfig = config.image[provider];
  if (!providerConfig) return 0;

  const modelConfig = providerConfig[model];
  if (!modelConfig) return 0;

  const count = options?.count ?? 1;
  let perImage: number;

  if (typeof modelConfig === 'number') {
    perImage = modelConfig;
  } else if (options?.quality && options?.size) {
    const qualityConfig = modelConfig[options.quality] as Record<string, number>;
    perImage = qualityConfig?.[options.size] ?? 0;
  } else {
    perImage = 0;
  }

  return perImage * count * config.multipliers.default;
}

/**
 * 计算音频积分
 */
export function calculateAudioCredits(
  provider: string,
  model: string,
  songCount: number = 1
): number {
  const config = loadPricingConfig();
  const providerConfig = config.audio[provider];
  if (!providerConfig) return 0;

  const modelConfig = providerConfig[model];
  if (!modelConfig) return 0;

  return modelConfig.per_song * songCount * config.multipliers.default;
}

/**
 * 计算对话积分
 */
export function calculateChatCredits(
  provider: string,
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const config = loadPricingConfig();
  const providerConfig = config.chat[provider];
  if (!providerConfig) return 0;

  const modelConfig = providerConfig[model];
  if (!modelConfig) return 0;

  const inputCredits = (inputTokens / 1000) * modelConfig.input_per_1k;
  const outputCredits = (outputTokens / 1000) * modelConfig.output_per_1k;

  return Math.ceil((inputCredits + outputCredits) * config.multipliers.default);
}

/**
 * 清除缓存（热更新时使用）
 */
export function clearPricingCache(): void {
  cachedConfig = null;
}
