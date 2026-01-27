# USERAPI 网关自动计费问题分析

## 问题现象

- ✅ Studio 通过网关生成图像成功
- ✅ 网关日志显示请求已转发到 `https://api.zeoxel.cn/api/v1/openai/v1/images/generations`
- ❌ 用户积分没有扣除
- ❌ USERAPI 前端没有任务记录

## 根本原因

**USERAPI 网关缺少自动计费逻辑**

### 当前网关流程

```typescript
// /Users/g/Desktop/探索/USERAPI/src/app/api/v1/[[...path]]/route.ts

1. ✅ 验证 API Key (verifyApiKey)
2. ✅ 匹配 Provider (matchProvider)
3. ✅ 检查权限和配额
4. ✅ 透传请求 (forwardRequest)
5. ✅ 检测异步任务 (detectAndCreateTask) - 仅支持 vidu/suno/kling
6. ✅ 记录使用日志 (logUsage) - 只记录，不扣费
7. ❌ 缺少：自动计费逻辑
```

### 问题代码位置

**文件**: `/Users/g/Desktop/探索/USERAPI/src/app/api/v1/[[...path]]/route.ts:114-146`

```typescript
// 6. 透传请求
const result = await forwardRequest({
  request,
  provider,
  targetPath,
});

// 7. 检测并创建异步任务记录（成功响应才检测）
if (result.status >= 200 && result.status < 300) {
  await detectAndCreateTask({
    provider: provider.id,
    targetPath,
    method: request.method,
    response: result.response,
    userId: keyResult.userId!,
    keyId: keyResult.keyId,
    userName: keyResult.userName,
    requestBody,
  });
}

// 8. 记录使用日志
await logUsage({
  keyId: keyResult.keyId!,
  userId: keyResult.userId!,
  provider: provider.id,
  endpoint: targetPath,
  method: request.method,
  responseStatus: result.status,
  latencyMs: result.latencyMs,
  errorMessage: result.error,
});

// ❌ 问题：这里应该有自动计费逻辑，但是没有！
// 应该：
// - 从响应中提取用量信息（图像数量、分辨率等）
// - 调用 calculateCredits 计算积分
// - 扣除用户积分
// - 创建交易记录

return result.response;
```

## 现有的计费系统

USERAPI 已经有完整的计费系统，但**没有被网关自动调用**：

### 1. 计费 API
**文件**: `/Users/g/Desktop/探索/USERAPI/src/app/api/credits/consume/route.ts`

```typescript
POST /api/credits/consume
{
  "service": "image",
  "provider": "nano-banana",
  "model": "nano-banana",
  "usage": {
    "imageCount": 1,
    "quality": "1024x1024"
  }
}
```

### 2. 积分计算函数
**文件**: `/Users/g/Desktop/探索/USERAPI/src/lib/pricing/index.ts`

```typescript
export function calculateCredits(usage: UsageRequest): number {
  // 根据 pricing.yaml 自动计算积分
}
```

### 3. 定价配置
**文件**: `/Users/g/Desktop/探索/USERAPI/src/config/pricing.yaml`

```yaml
image:
  nano-banana:
    nano-banana:
      per_image: 3
      resolution_multiplier:
        512x512: 0.5
        1024x1024: 1.0
        2048x2048: 2.0
```

## 解决方案

### 方案 1: 在网关中添加自动计费（推荐）

在 `route.ts` 的透传请求后，添加自动计费逻辑：

```typescript
// 6. 透传请求
const result = await forwardRequest({...});

// 7. 自动计费（新增）
if (result.status >= 200 && result.status < 300) {
  await autoCharge({
    provider: provider.id,
    targetPath,
    method: request.method,
    requestBody,
    response: result.response,
    userId: keyResult.userId!,
    keyId: keyResult.keyId,
  });
}

// 8. 检测异步任务
// 9. 记录日志
```

**需要创建的文件**: `/Users/g/Desktop/探索/USERAPI/src/lib/billing/auto-charge.ts`

```typescript
export async function autoCharge(context: ChargeContext) {
  // 1. 识别服务类型（图像/视频/音频/对话）
  const serviceType = detectServiceType(context.provider, context.targetPath);

  // 2. 从请求和响应中提取用量信息
  const usage = extractUsage(serviceType, context.requestBody, context.response);

  // 3. 计算积分
  const credits = calculateCredits({
    service: serviceType,
    provider: context.provider,
    model: extractModel(context.requestBody),
    ...usage,
  });

  // 4. 扣除积分（调用现有的 consume API 逻辑）
  await deductCredits({
    userId: context.userId,
    keyId: context.keyId,
    credits,
    service: serviceType,
    provider: context.provider,
    model: extractModel(context.requestBody),
    metadata: usage,
  });
}
```

### 方案 2: 应用端手动调用（当前 ZeoCanvas 的做法）

应用端在收到响应后，手动调用 `/api/credits/consume`：

```typescript
// Studio API
const result = await generateImageViaGateway({...});

// 手动计费
await fetch('https://api.zeoxel.cn/api/credits/consume', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${apiKey}` },
  body: JSON.stringify({
    service: 'image',
    provider: 'nano-banana',
    model: 'nano-banana',
    usage: { imageCount: result.data.length }
  })
});
```

**缺点**：
- 应用端需要知道如何计费
- 容易出现漏计费或重复计费
- 违反了"网关自动计费"的架构原则

## 推荐实施步骤

### Step 1: 创建自动计费模块

**文件**: `/Users/g/Desktop/探索/USERAPI/src/lib/billing/auto-charge.ts`

实现：
- `detectServiceType()` - 识别服务类型
- `extractUsage()` - 提取用量信息
- `autoCharge()` - 自动计费主函数

### Step 2: 修改网关路由

**文件**: `/Users/g/Desktop/探索/USERAPI/src/app/api/v1/[[...path]]/route.ts`

在透传请求后添加：
```typescript
if (result.status >= 200 && result.status < 300) {
  await autoCharge({...});
}
```

### Step 3: 配置计费规则

在 `auto-charge.ts` 中配置哪些端点需要自动计费：

```typescript
const BILLABLE_ENDPOINTS = {
  'openai': {
    '/v1/images/generations': 'image',
    '/v1/chat/completions': 'chat',
  },
  'volcengine': {
    '/images/generations': 'image',
    '/video/submit_task': 'video',
  },
  'vidu': {
    '/ent/v2/text2video': 'video',
    '/ent/v2/img2video': 'video',
  },
};
```

### Step 4: 测试

1. 通过网关生成图像
2. 检查积分是否自动扣除
3. 检查交易记录是否创建

## 临时解决方案（Studio 端）

在 USERAPI 网关修复之前，Studio 可以暂时手动调用计费 API：

**文件**: `/Users/g/Desktop/探索/studio/src/app/api/studio/image/route.ts`

```typescript
// 通过网关生成图像
const result = await generateImageViaGateway({...}, apiKey);

// 临时方案：手动计费
try {
  await fetch('https://api.zeoxel.cn/api/credits/consume', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      service: 'image',
      provider: usedModel.includes('seedream') ? 'volcengine' : 'nano-banana',
      model: usedModel,
      usage: {
        imageCount: result.data.length,
      },
    }),
  });
} catch (err) {
  console.warn('[Studio Image API] Failed to record consumption:', err);
}
```

## 总结

- **问题**: USERAPI 网关缺少自动计费逻辑
- **影响**: 所有通过网关的请求都不会扣除积分
- **根本原因**: 网关只做了透传和日志记录，没有调用计费系统
- **推荐方案**: 在 USERAPI 网关中添加自动计费模块
- **临时方案**: Studio 端手动调用 `/api/credits/consume`
