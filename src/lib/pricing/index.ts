import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import yaml from 'yaml';

// ============================================
// 类型定义
// ============================================

export interface VideoModelPricing {
  per_second: number;
  min_charge: number;
  resolution_multiplier?: Record<string, number>;
}

export interface ImageModelPricing {
  per_image: number;
  resolution_multiplier?: Record<string, number>;
  quality_resolution?: Record<string, Record<string, number>>;
}

export interface AudioModelPricing {
  per_song?: number;
  per_k_chars?: number;
  per_second?: number;
}

export interface ChatModelPricing {
  input_per_1k: number;
  output_per_1k: number;
}

export interface PricingConfig {
  video: Record<string, Record<string, VideoModelPricing>>;
  image: Record<string, Record<string, ImageModelPricing>>;
  audio: Record<string, Record<string, AudioModelPricing>>;
  chat: Record<string, Record<string, ChatModelPricing>>;
  multipliers: {
    default: number;
    [key: string]: number;
  };
}

// 用量请求类型
export interface UsageRequest {
  service: 'video' | 'image' | 'audio' | 'chat';
  provider: string;
  model: string;
  // 视频用量
  durationSeconds?: number;
  resolution?: string;
  // 图像用量
  imageCount?: number;
  quality?: string;
  // 音频用量
  songCount?: number;
  characterCount?: number;
  // 对话用量
  inputTokens?: number;
  outputTokens?: number;
}

// ============================================
// 配置加载
// ============================================

let cachedConfig: PricingConfig | null = null;
let configLoadTime = 0;
const CONFIG_CACHE_TTL = 60000; // 1 分钟缓存

function getConfigPath(): string {
  return join(process.cwd(), 'src/config/pricing.yaml');
}

/**
 * 加载定价配置
 */
export function loadPricingConfig(): PricingConfig {
  const now = Date.now();

  // 检查缓存
  if (cachedConfig && now - configLoadTime < CONFIG_CACHE_TTL) {
    return cachedConfig;
  }

  try {
    const configPath = getConfigPath();
    const fileContent = readFileSync(configPath, 'utf8');
    cachedConfig = yaml.parse(fileContent) as PricingConfig;
    configLoadTime = now;
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
 * 保存定价配置
 */
export function savePricingConfig(config: PricingConfig): void {
  const configPath = getConfigPath();
  const yamlContent = yaml.stringify(config, { indent: 2 });
  writeFileSync(configPath, yamlContent, 'utf8');
  // 清除缓存
  cachedConfig = config;
  configLoadTime = Date.now();
}

/**
 * 清除缓存（热更新时使用）
 */
export function clearPricingCache(): void {
  cachedConfig = null;
  configLoadTime = 0;
}

// ============================================
// 积分计算函数
// ============================================

/**
 * 计算视频积分
 */
export function calculateVideoCredits(
  provider: string,
  model: string,
  durationSeconds: number,
  resolution: string = '720p'
): number {
  const config = loadPricingConfig();
  const providerConfig = config.video[provider];
  if (!providerConfig) {
    console.warn(`Unknown video provider: ${provider}, using default pricing`);
    return Math.ceil(durationSeconds * 10); // 默认每秒10积分
  }

  const modelConfig = providerConfig[model];
  if (!modelConfig) {
    console.warn(`Unknown video model: ${provider}/${model}, using default pricing`);
    return Math.ceil(durationSeconds * 10);
  }

  // 获取分辨率倍率
  const resMultiplier = modelConfig.resolution_multiplier?.[resolution] ?? 1.0;

  // 计算积分
  const credits = Math.ceil(durationSeconds * modelConfig.per_second * resMultiplier);
  const finalCredits = Math.max(credits, modelConfig.min_charge);

  return Math.ceil(finalCredits * config.multipliers.default);
}

/**
 * 计算图像积分
 */
export function calculateImageCredits(
  provider: string,
  model: string,
  imageCount: number = 1,
  options?: { quality?: string; resolution?: string }
): number {
  const config = loadPricingConfig();
  const providerConfig = config.image[provider];
  if (!providerConfig) {
    console.warn(`Unknown image provider: ${provider}, using default pricing`);
    return imageCount * 3; // 默认每张3积分
  }

  const modelConfig = providerConfig[model];
  if (!modelConfig) {
    console.warn(`Unknown image model: ${provider}/${model}, using default pricing`);
    return imageCount * 3;
  }

  let perImage = modelConfig.per_image;

  // 处理 quality_resolution 配置（如 DALL-E 3）
  if (modelConfig.quality_resolution && options?.quality && options?.resolution) {
    const qualityConfig = modelConfig.quality_resolution[options.quality];
    if (qualityConfig && qualityConfig[options.resolution]) {
      perImage = qualityConfig[options.resolution];
    }
  }
  // 处理普通 resolution_multiplier
  else if (modelConfig.resolution_multiplier && options?.resolution) {
    const resMultiplier = modelConfig.resolution_multiplier[options.resolution] ?? 1.0;
    perImage = perImage * resMultiplier;
  }

  return Math.ceil(perImage * imageCount * config.multipliers.default);
}

/**
 * 计算音频积分
 */
export function calculateAudioCredits(
  provider: string,
  model: string,
  options: {
    songCount?: number;
    durationSeconds?: number;
    characterCount?: number;
  }
): number {
  const config = loadPricingConfig();
  const providerConfig = config.audio[provider];
  if (!providerConfig) {
    console.warn(`Unknown audio provider: ${provider}, using default pricing`);
    return options.songCount ? options.songCount * 30 : 10;
  }

  const modelConfig = providerConfig[model];
  if (!modelConfig) {
    console.warn(`Unknown audio model: ${provider}/${model}, using default pricing`);
    return options.songCount ? options.songCount * 30 : 10;
  }

  let credits = 0;

  if (modelConfig.per_song && options.songCount) {
    credits = modelConfig.per_song * options.songCount;
  } else if (modelConfig.per_second && options.durationSeconds) {
    credits = modelConfig.per_second * options.durationSeconds;
  } else if (modelConfig.per_k_chars && options.characterCount) {
    credits = modelConfig.per_k_chars * (options.characterCount / 1000);
  }

  return Math.ceil(credits * config.multipliers.default);
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
  if (!providerConfig) {
    console.warn(`Unknown chat provider: ${provider}, using default pricing`);
    return Math.ceil((inputTokens + outputTokens) / 1000);
  }

  const modelConfig = providerConfig[model];
  if (!modelConfig) {
    console.warn(`Unknown chat model: ${provider}/${model}, using default pricing`);
    return Math.ceil((inputTokens + outputTokens) / 1000);
  }

  const inputCredits = (inputTokens / 1000) * modelConfig.input_per_1k;
  const outputCredits = (outputTokens / 1000) * modelConfig.output_per_1k;

  return Math.ceil((inputCredits + outputCredits) * config.multipliers.default);
}

/**
 * 根据用量请求计算积分（统一入口）
 */
export function calculateCredits(usage: UsageRequest): number {
  switch (usage.service) {
    case 'video':
      return calculateVideoCredits(
        usage.provider,
        usage.model,
        usage.durationSeconds ?? 0,
        usage.resolution ?? '720p'
      );
    case 'image':
      return calculateImageCredits(
        usage.provider,
        usage.model,
        usage.imageCount ?? 1,
        { quality: usage.quality, resolution: usage.resolution }
      );
    case 'audio':
      return calculateAudioCredits(
        usage.provider,
        usage.model,
        {
          songCount: usage.songCount,
          characterCount: usage.characterCount,
        }
      );
    case 'chat':
      return calculateChatCredits(
        usage.provider,
        usage.model,
        usage.inputTokens ?? 0,
        usage.outputTokens ?? 0
      );
    default:
      console.warn(`Unknown service type: ${usage.service}`);
      return 0;
  }
}

// ============================================
// 配置查询函数
// ============================================

/**
 * 获取所有定价配置
 */
export function getAllPricing(): PricingConfig {
  return loadPricingConfig();
}

/**
 * 获取指定服务的定价配置
 */
export function getServicePricing(service: 'video' | 'image' | 'audio' | 'chat') {
  const config = loadPricingConfig();
  return config[service];
}

/**
 * 获取指定模型的定价配置
 */
export function getModelPricing(
  service: 'video' | 'image' | 'audio' | 'chat',
  provider: string,
  model: string
) {
  const config = loadPricingConfig();
  return config[service]?.[provider]?.[model] ?? null;
}

/**
 * 获取倍率配置
 */
export function getMultipliers() {
  const config = loadPricingConfig();
  return config.multipliers;
}

/**
 * 更新倍率配置
 */
export function updateMultipliers(multipliers: Record<string, number>): void {
  const config = loadPricingConfig();
  config.multipliers = { ...config.multipliers, ...multipliers };
  savePricingConfig(config);
}

/**
 * 更新模型定价
 */
export function updateModelPricing(
  service: 'video' | 'image' | 'audio' | 'chat',
  provider: string,
  model: string,
  pricing: VideoModelPricing | ImageModelPricing | AudioModelPricing | ChatModelPricing
): void {
  const config = loadPricingConfig();
  if (!config[service][provider]) {
    config[service][provider] = {};
  }
  (config[service][provider] as Record<string, unknown>)[model] = pricing;
  savePricingConfig(config);
}

/**
 * 获取定价配置的扁平化列表（用于前端展示）
 */
export function getPricingList() {
  const config = loadPricingConfig();
  const list: Array<{
    service: string;
    provider: string;
    model: string;
    pricing: unknown;
  }> = [];

  for (const [provider, models] of Object.entries(config.video)) {
    for (const [model, pricing] of Object.entries(models)) {
      list.push({ service: 'video', provider, model, pricing });
    }
  }

  for (const [provider, models] of Object.entries(config.image)) {
    for (const [model, pricing] of Object.entries(models)) {
      list.push({ service: 'image', provider, model, pricing });
    }
  }

  for (const [provider, models] of Object.entries(config.audio)) {
    for (const [model, pricing] of Object.entries(models)) {
      list.push({ service: 'audio', provider, model, pricing });
    }
  }

  for (const [provider, models] of Object.entries(config.chat)) {
    for (const [model, pricing] of Object.entries(models)) {
      list.push({ service: 'chat', provider, model, pricing });
    }
  }

  return list;
}
