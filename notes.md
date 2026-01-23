# Notes: USERAPI Dashboard 优化研究

## 当前架构分析

### Dashboard 页面结构
```
/dashboard             - 概览页（统计卡片 + 厂商状态）
/dashboard/users       - 用户管理（列表 + 创建/删除）
/dashboard/usage       - 使用统计（请求统计 + 厂商/用户分析）
/dashboard/keys        - API Keys 管理
/dashboard/providers   - 厂商配置
```

### 数据存储
- `users` 表：用户基本信息
- `api_keys` 表：密钥 + 积分（quota_limit/quota_used）
- `usage_logs` 表：请求日志
- `credit_transactions` 表：积分交易记录（新增）

---

## 问题分析

### 1. 加载速度慢
**原因:**
- 概览页并行请求 4 个 API（providers, users, keys, usage）
- 用户页每次都查询全部用户 + 全部密钥
- 使用统计页查询复杂（多表 JOIN + 聚合）
- 没有服务端缓存或增量加载

**解决方案:**
- [ ] 合并 API 端点：新增 `/api/admin/dashboard` 一次返回概览数据
- [ ] 用户列表分页加载
- [ ] 统计数据后端缓存（Redis 或内存缓存）
- [ ] 骨架屏 + 渐进式加载

### 2. 数据不真实
**原因:**
- `usage_logs` 表可能没有数据（透传时未记录）
- 统计依赖 `usageLogs` 表，但透传网关可能没有写入

**验证:**
- 检查 `forwarder.ts` 是否在透传后写入日志
- 检查 `credit_transactions` 表是否有数据

**解决方案:**
- [ ] 使用 `credit_transactions` 表作为真实消费数据来源
- [ ] 统计页从积分交易记录计算，而非 usage_logs

### 3. 用户信息缺少积分展示
**当前状态:**
- 用户列表只显示 `keyPrefix` 和 `status`
- 有 `quotaUsed/quotaLimit` 但未展示

**解决方案:**
- [ ] 用户列表添加积分列（剩余/总量）
- [ ] 用户详情页显示积分余额和消费记录
- [ ] 添加积分进度条可视化

### 4. 几乎无可编辑性
**当前能力:**
- ✅ 创建用户
- ✅ 删除用户
- ❌ 编辑用户信息
- ❌ 编辑积分/配额
- ❌ 禁用/启用用户
- ❌ 重置密钥

**解决方案:**
- [ ] 用户编辑弹窗（姓名、邮箱、角色、状态）
- [ ] 积分充值功能（调用 /api/admin/credits/recharge）
- [ ] 批量操作（启用/禁用/删除）
- [ ] 密钥管理（重新生成、禁用）

---

## 设计方案

### 新增 API 端点

#### 1. GET `/api/admin/dashboard` - 概览数据
```typescript
// 一次返回所有概览数据
{
  stats: {
    userCount: number,
    activeUserCount: number,
    keyCount: number,
    totalCredits: number,        // 平台总积分
    usedCredits: number,         // 已消耗积分
    todayTransactions: number,   // 今日交易数
  },
  providers: [...],              // 厂商状态
  recentTransactions: [...],     // 最近交易（替代 recentLogs）
}
```

#### 2. PATCH `/api/admin/users/[id]` - 编辑用户
```typescript
// 支持编辑的字段
{
  name?: string,
  email?: string,
  phone?: string,
  role?: 'user' | 'admin',
  status?: 'active' | 'disabled',
}
```

#### 3. GET `/api/admin/users/[id]/transactions` - 用户交易记录
```typescript
// 获取单个用户的积分交易记录
{
  transactions: [...],
  summary: { total, used, remaining }
}
```

### 前端组件优化

#### 用户列表表格新增列
| 列 | 内容 |
|----|------|
| 积分 | 剩余/总量 + 进度条 |
| 操作 | 编辑、充值、禁用、删除 |

#### 用户编辑弹窗
- 基本信息编辑
- 积分充值输入
- 状态切换开关

#### 概览页优化
- 使用新的聚合 API
- 添加积分统计卡片
- 最近交易替代最近请求

---

## 实现优先级

### P0 - 核心功能
1. 用户列表添加积分展示
2. 用户编辑功能
3. 积分充值功能

### P1 - 性能优化
4. 合并概览 API
5. 用户列表分页

### P2 - 增强功能
6. 批量操作
7. 统计数据使用真实交易记录
