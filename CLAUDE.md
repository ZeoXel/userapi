# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

USERAPI 是一个多厂商 API 透传网关，基于 Next.js 16 构建。它提供统一的 API 入口，将请求透传到多个 AI 服务提供商（Vidu、火山引擎、OpenAI、MiniMax、Suno 等）。

## 常用命令

```bash
# 开发
bun dev                 # 启动开发服务器 (端口 3001)
bun run lint            # ESLint 检查

# 数据库 (Drizzle + PostgreSQL)
bun run db:generate     # 生成迁移文件
bun run db:migrate      # 执行迁移
bun run db:push         # 直接推送 schema 到数据库
bun run db:studio       # 打开 Drizzle Studio

# 构建
bun run build           # 生产构建
bun run start           # 生产运行 (端口 3001)
```

## 架构

### 核心请求流程

```
客户端请求 → /api/v1/{provider}/{path}
         → middleware.ts (CORS)
         → route.ts (认证 + 路由)
         → forwarder.ts (透传)
         → 目标厂商 API
```

### 关键模块

- **`src/app/api/v1/[[...path]]/route.ts`** - 主网关入口，处理所有 HTTP 方法的透传
- **`src/lib/proxy/router.ts`** - 厂商配置加载和路由匹配
- **`src/lib/proxy/forwarder.ts`** - 请求透传逻辑，处理头部转换和认证注入
- **`src/lib/auth/verify.ts`** - API Key 验证（支持 Admin Key 和用户 Key）
- **`src/config/providers.yaml`** - 厂商配置（无需修改代码即可添加新厂商）

### 数据模型

四张核心表（`src/lib/db/schema.ts`）：
- `users` - 用户表，支持多认证源（authing/tencent/manual）
- `apiKeys` - 用户 API Key，带配额和厂商权限控制
- `usageLogs` - 使用记录
- `providerKeys` - 管理员配置的厂商 API Key

### API Key 格式

- 用户 Key: `ua_` + 32位随机字符（如 `ua_abc123...`）
- Admin Key: 环境变量 `ADMIN_API_KEY` 配置

## 添加新厂商

只需在 `src/config/providers.yaml` 添加配置：

```yaml
new_provider:
  name: "厂商名称"
  base_url: "https://api.example.com"
  auth:
    type: "bearer"
    header: "Authorization"
    prefix: "Bearer "
    env_key: "NEW_PROVIDER_API_KEY"
  description: "厂商描述"
```

然后在 `.env.local` 添加对应的 `NEW_PROVIDER_API_KEY`。

## 环境变量

必需：
- `DATABASE_URL` - PostgreSQL 连接字符串
- `ADMIN_API_KEY` - 管理员 API Key

厂商 Key（按需配置）：
- `VIDU_API_KEY`
- `VOLCENGINE_API_KEY`
- `OPENAI_API_KEY`
- `MINIMAX_API_KEY`
- `SUNO_API_KEY`
