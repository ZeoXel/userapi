# USERAPI 透传网关 - 实现笔记

## 厂商认证方式

| 厂商 | 认证格式 | Header |
|------|----------|--------|
| Vidu | `Token {key}` | Authorization |
| Volcengine | `Bearer {key}` | Authorization |
| OpenAI | `Bearer {key}` | Authorization |
| MiniMax | `Bearer {key}` | Authorization |
| Suno | `Bearer {key}` | Authorization |

## API 路由规则

```
请求: /api/v1/{provider}/{原始路径}
转发: {provider.base_url}/{原始路径}
```

## 透传原则

1. **请求体**：原样转发，不做任何转换
2. **请求头**：透传除 Host 和 Authorization 外的所有头
3. **认证头**：替换为厂商专用 Key
4. **响应体**：原样返回，不做包装

## 关键代码位置

- 厂商配置: `/src/config/providers.yaml`
- 路由匹配: `/src/lib/proxy/router.ts`
- 请求转发: `/src/lib/proxy/forwarder.ts`
- 认证验证: `/src/lib/auth/verify.ts`
- 数据库模型: `/src/lib/db/schema.ts`

## Studio 集成

Studio 需要配置的环境变量：
```bash
USERAPI_KEY=ua_xxxxxxxxxxxxx
USERAPI_BASE_URL=http://localhost:3001/api/v1
```

## 多认证源用户系统

### 支持的认证源

| Provider | 说明 | 使用场景 |
|----------|------|----------|
| authing | Authing 身份云 | 个人版 Studio |
| tencent | 腾讯云登录 | 公司版 Studio |
| wechat | 微信登录 | 移动端扩展 |
| manual | 管理员手动创建 | 测试/内部用户 |

### 用户同步 API

**端点**: `POST /api/user/sync`

第三方登录后调用此接口同步用户信息：

```json
{
  "provider": "authing",
  "provider_id": "authing_user_id",
  "name": "用户名",
  "phone": "13800138000",
  "email": "user@example.com",
  "avatar": "https://..."
}
```

**响应**（新用户）：
```json
{
  "success": true,
  "isNewUser": true,
  "user": { ... },
  "apiKey": {
    "fullKey": "ua_xxxxx",  // 仅首次返回
    "keyPrefix": "ua_xxxxx"
  },
  "message": "用户创建成功，请保存您的 API Key（仅显示一次）"
}
```

### 用户信息查询 API

**端点**: `GET /api/user/me`

两种认证方式：

1. **API Key 认证**（推荐）：
```bash
curl -H "Authorization: Bearer ua_xxxxx" /api/user/me
```

2. **Provider 查询**：
```bash
curl "/api/user/me?provider=authing&provider_id=xxx"
```

### 数据库设计

用户表唯一约束：`(provider, provider_id)`

同一个 provider_id 在不同 provider 下可以存在（如微信和 Authing 用不同 ID）

### Studio 集成流程

```
1. 用户在 Studio 点击登录
2. 跳转到 Authing/腾讯云 完成认证
3. 获取 provider + provider_id + token
4. 调用 /api/user/sync 同步用户
5. 如果是新用户，保存返回的 fullKey
6. 用 API Key 调用网关服务
```
