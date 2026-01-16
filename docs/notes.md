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
