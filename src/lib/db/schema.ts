import { pgTable, text, integer, real, timestamp } from 'drizzle-orm/pg-core';

// 用户表 - 支持多认证源
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  // 认证源信息
  provider: text('provider').notNull(), // 'authing', 'tencent', 'manual'
  providerId: text('provider_id').notNull(), // 第三方用户ID
  // 用户信息
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  avatar: text('avatar'),
  // 业务字段
  role: text('role').default('user'), // admin, user
  status: text('status').default('active'), // active, suspended
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// API Keys 表
export const apiKeys = pgTable('api_keys', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  keyHash: text('key_hash').notNull(), // bcrypt hash
  keyPrefix: text('key_prefix').notNull(), // 前缀用于识别 (ua_xxxx)
  name: text('name'), // 可选名称
  status: text('status').default('active'), // active, revoked
  // 权限控制
  allowedProviders: text('allowed_providers'), // JSON: ["vidu", "volcengine"] 或 null 表示全部
  // 配额
  quotaType: text('quota_type').default('unlimited'), // unlimited, monthly, total
  quotaLimit: integer('quota_limit'),
  quotaUsed: real('quota_used').default(0),
  quotaResetAt: timestamp('quota_reset_at', { withTimezone: true }),
  // 元数据
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
});

// 使用记录表
export const usageLogs = pgTable('usage_logs', {
  id: text('id').primaryKey(),
  keyId: text('key_id').notNull().references(() => apiKeys.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(),
  endpoint: text('endpoint').notNull(),
  method: text('method').notNull(),
  // 请求信息
  requestSize: integer('request_size'),
  responseStatus: integer('response_status'),
  responseSize: integer('response_size'),
  latencyMs: integer('latency_ms'),
  // 计费
  cost: real('cost'),
  // 错误追踪
  errorCode: text('error_code'),
  errorMessage: text('error_message'),
  // 时间
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// 厂商 API Key 表 (管理员配置)
export const providerKeys = pgTable('provider_keys', {
  id: text('id').primaryKey(),
  provider: text('provider').notNull().unique(),
  apiKey: text('api_key').notNull(),
  baseUrl: text('base_url'), // 可选覆盖
  status: text('status').default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// 类型导出
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;
export type UsageLog = typeof usageLogs.$inferSelect;
export type NewUsageLog = typeof usageLogs.$inferInsert;
export type ProviderKey = typeof providerKeys.$inferSelect;
export type NewProviderKey = typeof providerKeys.$inferInsert;
