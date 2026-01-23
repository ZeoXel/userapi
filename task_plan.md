# Task Plan: 统一计费系统

## Goal
将 USERAPI 作为计费权威，统一两个项目的定价逻辑，并添加前端价格管理界面。

## Phases

### Phase 1: 更新 USERAPI 计费 API ✅
- [x] 修改 `/api/credits/consume` 支持两种模式：传积分 / 传用量自动计算
- [x] 完善 `pricing.yaml` 覆盖所有模型（视频/图像/音频/对话）
- [x] 更新 `src/lib/pricing/index.ts` 计算逻辑（支持分辨率倍率）

### Phase 2: 创建价格管理 API ✅
- [x] `GET /api/admin/pricing` - 获取所有定价配置
- [x] `PUT /api/admin/pricing` - 更新定价配置
- [x] `POST /api/admin/pricing` - 积分计算预览

### Phase 3: 前端价格管理页面 ✅
- [x] 创建 `/dashboard/pricing` 页面
- [x] 视频/图像/音频/对话四类定价编辑
- [x] 全局倍率配置
- [x] 积分计算器

### Phase 4: 更新 ZeoCanvas 调用方式 ✅
- [x] 修改 `consumptionTracker.ts` 传用量而非积分
- [x] `creditsPricing.ts` 添加废弃说明

### Phase 5: 测试验证 ✅
- [x] USERAPI 构建验证
- [x] ZeoCanvas 构建验证

## Key Decisions
1. **USERAPI 为计费权威**：`pricing.yaml` 为唯一定价来源
2. **向后兼容**：`/api/credits/consume` 支持两种模式
   - 模式1：直接传 `credits`（旧方式，向后兼容）
   - 模式2：传 `usage` 对象，服务端自动计算
3. **前端管理**：通过 `/dashboard/pricing` 可视化管理定价

## 架构变化

### Before
```
ZeoCanvas                          USERAPI
┌──────────────────┐              ┌──────────────────┐
│ creditsPricing.ts │              │ pricing.yaml     │
│ (计算积分)        │  ────────>   │ (重复定价配置)   │
│                  │  传 credits  │                  │
└──────────────────┘              └──────────────────┘
```

### After
```
ZeoCanvas                          USERAPI
┌──────────────────┐              ┌──────────────────┐
│ consumptionTracker│              │ pricing.yaml     │
│ (传用量信息)      │  ────────>   │ (唯一定价来源)   │
│                  │  传 usage    │ pricing/index.ts │
└──────────────────┘              │ (计算积分)       │
                                  └──────────────────┘
```

## Status
**✅ 全部完成**
