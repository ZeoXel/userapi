# Task Plan: USERAPI 用量/任务状态跟踪系统

## Goal
为 USERAPI 网关实现完整的异步任务状态跟踪系统，包括数据库设计、API 接口、轮询服务、预扣费机制，以及 ZeoCanvas 和 USERAPI 管理后台的前端 UI 组件。

## Phases

### Phase 1: 数据库设计 ✅
- [x] 1.1 更新 schema.ts 添加 tasks 表
- [ ] 1.2 生成并执行数据库迁移 (待部署时执行)
- [x] 1.3 导出类型定义

### Phase 2: 核心任务 API ✅
- [x] 2.1 创建 `/api/v1/tasks` 路由 (GET/POST)
- [x] 2.2 创建 `/api/v1/tasks/[taskId]` 路由 (GET/PATCH)
- [x] 2.3 创建任务管理核心模块 `src/lib/tasks/index.ts`

### Phase 3: 预扣费机制 ✅
- [x] 3.1 创建 `src/lib/quota/preConsume.ts`
- [x] 3.2 实现预扣费、返还、调整函数
- [x] 3.3 集成到任务创建流程

### Phase 4: 轮询服务 ✅
- [x] 4.1 创建平台适配器 `src/lib/tasks/platforms/`
- [x] 4.2 实现轮询逻辑 `src/lib/tasks/polling.ts`
- [x] 4.3 创建 Cron 端点 `/api/cron/poll-tasks`
- [x] 4.4 配置 vercel.json Cron

### Phase 5: ZeoCanvas 前端 ✅
- [x] 5.1 创建 taskService.ts 服务
- [x] 5.2 创建 useTaskPolling.ts Hook
- [x] 5.3 创建 TaskStatusPanel 组件
- [x] 5.4 TaskItem 和 TaskProgress 已整合到 TaskStatusPanel
- [x] 5.5 集成到用户中心页面 (UserDashboard)

### Phase 6: USERAPI 管理后台 ✅
- [x] 6.1 创建 `/api/admin/tasks` 管理 API
- [x] 6.2 创建 `/dashboard/tasks` 页面
- [ ] 6.3 添加任务统计到 Dashboard 概览 (可选)

### Phase 7: 集成与测试 ✅
- [x] 7.1 USERAPI 构建验证 ✅
- [x] 7.2 ZeoCanvas 构建验证 ✅
- [x] 7.3 更新文档 (task_plan.md)

## Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    ZeoCanvas (用户端)                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ TaskStatusPanel → useTaskPolling → taskService      │   │
│  └─────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │ GET/POST /api/v1/tasks
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                      USERAPI 网关                            │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐               │
│  │ 任务 API  │  │ 预扣费    │  │ Cron轮询  │               │
│  │ /v1/tasks │  │ preConsume│  │ poll-tasks│               │
│  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘               │
│        │              │              │                       │
│        └──────────────┼──────────────┘                       │
│                       ↓                                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   tasks 表                           │   │
│  │  id | taskId | platform | status | progress | quota  │   │
│  └─────────────────────────────────────────────────────┘   │
│                       ↓                                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │             平台适配器 (vidu, suno, ...)             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │         管理后台 /dashboard/tasks                     │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Task Status Flow
```
SUBMITTED ──→ QUEUED ──→ IN_PROGRESS ──→ SUCCESS
                    │                       │
                    └──→ FAILURE ←──────────┘
```

## Key Decisions
1. **任务状态**: submitted → queued → in_progress → success/failure
2. **轮询频率**: Vercel Cron 每分钟，前端每5秒
3. **预扣费**: 任务提交时预扣，成功时调整差额，失败时全额返还
4. **平台适配**: 使用适配器模式，支持 vidu/suno/minimax 等

## Errors Encountered
(执行过程中记录)

## Status
**COMPLETED** - 所有阶段已完成，两个项目构建验证通过

## Files Created/Modified

### USERAPI
- `src/lib/db/schema.ts` - 添加 tasks 表
- `src/lib/tasks/index.ts` - 任务管理核心模块
- `src/lib/quota/preConsume.ts` - 预扣费机制
- `src/lib/tasks/platforms/index.ts` - 平台适配器
- `src/lib/tasks/polling.ts` - 轮询服务
- `src/app/api/v1/tasks/route.ts` - 任务列表 API
- `src/app/api/v1/tasks/[taskId]/route.ts` - 单任务 API
- `src/app/api/cron/poll-tasks/route.ts` - Cron 轮询端点
- `src/app/api/admin/tasks/route.ts` - 管理 API
- `src/app/dashboard/tasks/page.tsx` - 管理后台任务页面
- `src/app/dashboard/layout.tsx` - 添加任务导航
- `vercel.json` - Cron 配置

### ZeoCanvas
- `src/services/taskService.ts` - 任务服务
- `src/hooks/useTaskPolling.ts` - 任务轮询 Hook
- `src/components/tasks/TaskStatusPanel.tsx` - 任务状态面板
- `src/components/tasks/index.ts` - 组件导出
- `src/components/user/UserDashboard.tsx` - 集成任务面板
