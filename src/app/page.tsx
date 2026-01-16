import Link from 'next/link';
import { getProviders } from '@/lib/proxy/router';

export default function Home() {
  const providers = getProviders();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-white mb-4">USERAPI</h1>
          <p className="text-xl text-gray-400">透传网关 · 单 Key 入口 · 多厂商分发</p>
        </div>

        {/* 快速链接 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          <Link
            href="/dashboard"
            className="group p-6 bg-white/5 backdrop-blur border border-white/10 rounded-2xl hover:bg-white/10 transition-all"
          >
            <div className="text-2xl mb-2">📊</div>
            <h3 className="text-xl font-semibold text-white mb-2">管理控制台</h3>
            <p className="text-gray-400 text-sm">
              查看厂商状态、用户管理、使用统计
            </p>
          </Link>

          <Link
            href="/api/v1"
            className="group p-6 bg-white/5 backdrop-blur border border-white/10 rounded-2xl hover:bg-white/10 transition-all"
          >
            <div className="text-2xl mb-2">🔌</div>
            <h3 className="text-xl font-semibold text-white mb-2">API 入口</h3>
            <p className="text-gray-400 text-sm">
              /api/v1/{'{provider}'}/{'{path}'} 透传请求
            </p>
          </Link>
        </div>

        {/* 支持的厂商 */}
        <div className="mb-16">
          <h2 className="text-xl font-semibold text-white mb-6">支持的厂商</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {providers.map((provider) => (
              <div
                key={provider.id}
                className="p-4 bg-white/5 backdrop-blur border border-white/10 rounded-xl"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-white">{provider.name}</span>
                  <code className="text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded">
                    {provider.id}
                  </code>
                </div>
                <p className="text-xs text-gray-500 truncate">{provider.base_url}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 使用示例 */}
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">快速开始</h2>
          <pre className="bg-black/50 rounded-lg p-4 overflow-x-auto text-sm">
            <code className="text-gray-300">
{`# 调用 Vidu 视频生成
curl -X POST "http://localhost:3001/api/v1/vidu/ent/v2/text2video" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"prompt": "一只可爱的猫咪"}'

# 调用 OpenAI 兼容接口
curl -X POST "http://localhost:3001/api/v1/openai/v1/chat/completions" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"model": "gpt-4", "messages": [{"role": "user", "content": "Hello"}]}'`}
            </code>
          </pre>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center text-gray-500 text-sm">
          <p>透传模式 · 零格式转换 · 厂商原生 API</p>
        </div>
      </div>
    </div>
  );
}
