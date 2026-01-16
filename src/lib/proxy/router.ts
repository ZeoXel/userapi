import fs from 'fs';
import path from 'path';
import YAML from 'yaml';

export interface ProviderAuth {
  type: 'bearer' | 'token' | 'api-key';
  header: string;
  prefix: string;
  env_key: string;
}

export interface Provider {
  id: string;
  name: string;
  base_url: string;
  auth: ProviderAuth;
  description?: string;
}

export interface ProvidersConfig {
  providers: Record<string, Omit<Provider, 'id'>>;
}

// 缓存配置
let cachedConfig: ProvidersConfig | null = null;
let configLoadTime = 0;
const CONFIG_CACHE_TTL = 60000; // 1 分钟缓存

/**
 * 加载厂商配置
 */
export function loadProvidersConfig(): ProvidersConfig {
  const now = Date.now();

  // 检查缓存
  if (cachedConfig && now - configLoadTime < CONFIG_CACHE_TTL) {
    return cachedConfig;
  }

  const configPath = path.join(process.cwd(), 'src', 'config', 'providers.yaml');
  const configContent = fs.readFileSync(configPath, 'utf-8');
  cachedConfig = YAML.parse(configContent) as ProvidersConfig;
  configLoadTime = now;

  return cachedConfig;
}

/**
 * 获取所有厂商列表
 */
export function getProviders(): Provider[] {
  const config = loadProvidersConfig();
  return Object.entries(config.providers).map(([id, provider]) => ({
    id,
    ...provider,
  }));
}

/**
 * 根据厂商 ID 获取配置
 */
export function getProviderById(providerId: string): Provider | null {
  const config = loadProvidersConfig();
  const provider = config.providers[providerId];

  if (!provider) {
    return null;
  }

  return {
    id: providerId,
    ...provider,
  };
}

/**
 * 从路径中提取厂商 ID 和目标路径
 *
 * 输入: /vidu/ent/v2/text2video
 * 输出: { providerId: 'vidu', targetPath: '/ent/v2/text2video' }
 */
export function parseRoutePath(fullPath: string): { providerId: string; targetPath: string } | null {
  // 移除开头的斜杠并分割
  const parts = fullPath.replace(/^\/+/, '').split('/');

  if (parts.length === 0 || !parts[0]) {
    return null;
  }

  const providerId = parts[0];
  const targetPath = '/' + parts.slice(1).join('/');

  return { providerId, targetPath };
}

/**
 * 匹配厂商并返回完整路由信息
 */
export function matchProvider(fullPath: string): {
  provider: Provider;
  targetPath: string;
} | null {
  const parsed = parseRoutePath(fullPath);

  if (!parsed) {
    return null;
  }

  const provider = getProviderById(parsed.providerId);

  if (!provider) {
    return null;
  }

  return {
    provider,
    targetPath: parsed.targetPath,
  };
}

/**
 * 获取厂商的 API Key
 * 优先从环境变量获取，后续可扩展从数据库获取
 */
export function getProviderApiKey(provider: Provider): string | null {
  // 从环境变量获取
  const envKey = process.env[provider.auth.env_key];

  if (envKey) {
    return envKey;
  }

  // TODO: 从数据库获取 (Phase 2)

  return null;
}
