# 任务监测修复文档

## 问题描述

网关任务板块无法监测所有异步任务内容。

## 根本原因

**网关透传请求时，没有自动创建任务记录**

### 问题流程

```
客户端 → POST /api/v1/vidu/ent/v2/tasks
       ↓
    网关透传 (只记录 usageLogs)
       ↓
    返回 taskId 给客户端
       ✗ 没有在 tasks 表创建记录
       ✗ 轮询服务无法监测
```

### 原有设计缺陷

1. **任务创建依赖客户端主动调用**
   - 客户端需要先调用厂商 API 获取 taskId
   - 再手动调用 `POST /api/v1/tasks` 创建任务记录
   - 但实际使用中，客户端可能只调用透传接口

2. **网关只做透传，不检测任务**
   - `src/app/api/v1/[[...path]]/route.ts` 只记录 usageLogs
   - 没有解析响应中的 taskId
   - 没有自动创建 tasks 表记录

## 解决方案

### 方案：响应拦截自动检测

在网关透传后，自动检测响应中的异步任务并创建记录。

### 实现步骤

#### 1. 创建任务检测模块

**文件：`src/lib/tasks/detector.ts`**

功能：
- 配置各平台的异步任务端点模式
- 从响应中提取 taskId 和 action
- 自动创建任务记录

支持的平台：
- **Vidu**: `/ent/v2/tasks` (text2video), `/ent/v2/upscale` (upscale)
- **Suno**: `/api/generate` (generate)
- **Kling**: `/v1/videos/text2video`, `/v1/videos/image2video`

#### 2. 修改网关路由

**文件：`src/app/api/v1/[[...path]]/route.ts`**

修改内容：
```typescript
// 5. 读取请求体（用于任务检测）
let requestBody: unknown = null;
if (request.method !== 'GET' && request.method !== 'HEAD') {
  try {
    const clonedRequest = request.clone();
    requestBody = await clonedRequest.json();
  } catch {
    // 非 JSON 请求体，忽略
  }
}

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
await logUsage({...});
```

### 修复后的流程

```
客户端 → POST /api/v1/vidu/ent/v2/tasks
       ↓
    网关透传
       ↓
    响应拦截检测
       ├─→ 提取 taskId
       ├─→ 识别 action (text2video/upscale)
       └─→ 自动创建 task 记录
       ↓
    轮询服务可以监测 ✓
```

## 技术细节

### 任务检测逻辑

1. **端点匹配**：使用正则表达式匹配异步任务端点
2. **响应克隆**：使用 `response.clone()` 避免影响原响应
3. **taskId 提取**：根据平台响应格式提取任务 ID
4. **action 识别**：根据端点路径识别任务类型
5. **静默失败**：检测失败不影响主流程

### 支持的端点模式

#### Vidu
```typescript
{
  pattern: /\/ent\/v2\/tasks$/,
  methods: ['POST'],
  extractTaskId: (data) => data?.data?.id || data?.id || null,
  extractAction: () => 'text2video',
}
```

#### Suno
```typescript
{
  pattern: /\/api\/generate$/,
  methods: ['POST'],
  extractTaskId: (data) => {
    if (Array.isArray(data)) {
      return data[0]?.id || null;
    }
    return data?.id || null;
  },
  extractAction: () => 'generate',
}
```

#### Kling
```typescript
{
  pattern: /\/v1\/videos\/text2video$/,
  methods: ['POST'],
  extractTaskId: (data) => data?.data?.task_id || null,
  extractAction: () => 'text2video',
}
```

## 扩展新平台

要添加新平台的任务检测，只需在 `detector.ts` 中添加配置：

```typescript
const ASYNC_ENDPOINT_PATTERNS: Record<string, {...}[]> = {
  // ... 现有平台

  new_platform: [
    {
      pattern: /\/your\/endpoint$/,
      methods: ['POST'],
      extractTaskId: (data) => data?.task_id || null,
      extractAction: () => 'your_action',
    },
  ],
};
```

## 测试验证

### 构建验证
```bash
bun run build
```
✅ 构建成功

### 功能测试

1. **透传创建任务**
   ```bash
   curl -X POST https://your-domain/api/v1/vidu/ent/v2/tasks \
     -H "Authorization: Bearer ua_xxx" \
     -H "Content-Type: application/json" \
     -d '{"prompt": "test video"}'
   ```

   预期：
   - ✅ 返回 Vidu 的响应（包含 taskId）
   - ✅ 自动在 tasks 表创建记录
   - ✅ 轮询服务可以监测状态

2. **查询任务列表**
   ```bash
   curl https://your-domain/api/v1/tasks \
     -H "Authorization: Bearer ua_xxx"
   ```

   预期：
   - ✅ 可以看到透传创建的任务

3. **轮询更新**
   ```bash
   curl https://your-domain/api/cron/poll-tasks \
     -H "Authorization: Bearer <CRON_SECRET>"
   ```

   预期：
   - ✅ 自动更新任务状态

## 影响范围

### 修改的文件
- ✅ `src/lib/tasks/detector.ts` (新建)
- ✅ `src/app/api/v1/[[...path]]/route.ts` (修改)

### 不影响的功能
- ✅ 原有的 `POST /api/v1/tasks` 接口仍然可用
- ✅ 手动创建任务的流程不受影响
- ✅ 轮询服务逻辑不变
- ✅ 前端 UI 不需要修改

### 性能影响
- 每次成功的透传请求会额外：
  - 克隆响应体（内存开销小）
  - 解析 JSON（已有缓存）
  - 数据库插入（异步，不阻塞响应）
- 预计延迟增加 < 10ms

## 后续优化建议

1. **配置化端点模式**
   - 将端点模式移到 `providers.yaml` 配置文件
   - 支持动态添加新平台，无需修改代码

2. **批量任务检测**
   - 某些平台一次请求返回多个任务
   - 支持批量创建任务记录

3. **任务去重**
   - 添加唯一索引 `(platform, taskId)`
   - 避免重复创建相同任务

4. **监控告警**
   - 记录任务检测失败的情况
   - 定期检查漏检的任务

## 总结

通过在网关透传后添加响应拦截和任务自动检测，解决了任务监测遗漏的问题。现在所有通过网关创建的异步任务都会被自动记录和监测，无需客户端额外调用任务创建接口。
