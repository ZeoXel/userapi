import { pgTable, text, integer, real, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';

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
}, (table) => [
  // 第三方登录查询：通过 provider + providerId 查找用户
  uniqueIndex('users_provider_provider_id_idx').on(table.provider, table.providerId),
  // 邮箱查询
  index('users_email_idx').on(table.email),
  // 状态筛选
  index('users_status_idx').on(table.status),
]);

// API Keys 表（积分在这里管理）
export const apiKeys = pgTable('api_keys', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  // ★ 冗余字段 - 方便直接查看
  userName: text('user_name'),
  userPhone: text('user_phone'),
  // Key 信息
  keyHash: text('key_hash').notNull(),
  keyPrefix: text('key_prefix').notNull(), // ua_xxxx
  name: text('name'),
  status: text('status').default('active'), // active/revoked
  allowedProviders: text('allowed_providers'), // JSON 或 null=全部
  // ★ 积分配额
  quotaLimit: integer('quota_limit'), // 总积分
  quotaUsed: real('quota_used').default(0), // 已用积分
  quotaType: text('quota_type').default('unlimited'),
  quotaResetAt: timestamp('quota_reset_at', { withTimezone: true }),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
}, (table) => [
  // 核心索引：API Key 验证（前缀 + 状态）
  index('api_keys_prefix_status_idx').on(table.keyPrefix, table.status),
  // 用户的所有 Key 查询
  index('api_keys_user_id_idx').on(table.userId),
  // 按状态筛选
  index('api_keys_status_idx').on(table.status),
]);

// 使用记录表
export const usageLogs = pgTable('usage_logs', {
  id: text('id').primaryKey(),
  keyId: text('key_id').notNull().references(() => apiKeys.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  userName: text('user_name'), // ★ 冗余字段
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
}, (table) => [
  // 用户使用记录查询（时间倒序）
  index('usage_logs_user_created_idx').on(table.userId, table.createdAt),
  // Key 使用记录
  index('usage_logs_key_created_idx').on(table.keyId, table.createdAt),
  // 按厂商统计
  index('usage_logs_provider_created_idx').on(table.provider, table.createdAt),
  // 错误查询
  index('usage_logs_error_idx').on(table.errorCode),
]);

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

// 积分交易记录表
export const creditTransactions = pgTable('credit_transactions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  userName: text('user_name'), // ★ 冗余字段
  keyId: text('key_id').references(() => apiKeys.id, { onDelete: 'set null' }),
  type: text('type').notNull(), // consumption/recharge/refund/reward
  amount: integer('amount').notNull(), // 正=消耗, 负=充值
  balanceAfter: integer('balance_after').notNull(),
  service: text('service'), // video/image/audio/chat
  provider: text('provider'),
  model: text('model'),
  metadata: text('metadata'),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  // 用户交易记录查询（时间倒序）
  index('credit_tx_user_created_idx').on(table.userId, table.createdAt),
  // 按类型筛选
  index('credit_tx_user_type_idx').on(table.userId, table.type),
  // 按服务统计
  index('credit_tx_service_idx').on(table.service, table.createdAt),
]);

// 异步任务表 - 跟踪视频/音乐等长时任务
export const tasks = pgTable('tasks', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  keyId: text('key_id').references(() => apiKeys.id, { onDelete: 'set null' }),
  // ★ 冗余字段 - 方便查询展示
  userName: text('user_name'),

  // 任务标识
  taskId: text('task_id').notNull(),           // 上游平台任务ID
  platform: text('platform').notNull(),         // vidu, suno, kling, minimax...
  action: text('action').notNull(),             // text2video, img2video, generate...

  // 状态管理
  status: text('status').notNull().default('submitted'),
  // submitted → queued → in_progress → success/failure
  progress: text('progress').default('0%'),
  failReason: text('fail_reason'),

  // 积分相关
  quotaPreConsumed: integer('quota_pre_consumed').default(0),  // 预扣积分
  quotaActual: integer('quota_actual'),                         // 实际消耗

  // 时间戳
  submitTime: timestamp('submit_time', { withTimezone: true }).notNull().defaultNow(),
  startTime: timestamp('start_time', { withTimezone: true }),
  finishTime: timestamp('finish_time', { withTimezone: true }),

  // 任务数据
  requestData: text('request_data'),            // JSON: 请求参数
  responseData: text('response_data'),          // JSON: 响应结果

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  // 上游任务ID查询
  index('tasks_task_id_idx').on(table.taskId),
  // 用户任务列表
  index('tasks_user_id_status_idx').on(table.userId, table.status),
  // 平台任务查询（用于轮询）
  index('tasks_platform_status_idx').on(table.platform, table.status),
  // 时间排序
  index('tasks_created_at_idx').on(table.createdAt),
]);

// 类型导出
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;
export type UsageLog = typeof usageLogs.$inferSelect;
export type NewUsageLog = typeof usageLogs.$inferInsert;
export type ProviderKey = typeof providerKeys.$inferSelect;
export type NewProviderKey = typeof providerKeys.$inferInsert;
export type CreditTransaction = typeof creditTransactions.$inferSelect;
export type NewCreditTransaction = typeof creditTransactions.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;

// 任务状态枚举
export const TaskStatus = {
  SUBMITTED: 'submitted',
  QUEUED: 'queued',
  IN_PROGRESS: 'in_progress',
  SUCCESS: 'success',
  FAILURE: 'failure',
} as const;
export type TaskStatusType = typeof TaskStatus[keyof typeof TaskStatus];
