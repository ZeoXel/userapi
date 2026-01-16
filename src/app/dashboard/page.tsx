'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Server,
  Users,
  Key,
  Activity,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Copy,
  Check,
} from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

interface DashboardStats {
  providers: { id: string; name: string; base_url: string; configured: boolean }[];
  userCount: number;
  keyCount: number;
  todayRequests: number;
  todayCost: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const adminKey = typeof window !== 'undefined' ? localStorage.getItem('adminKey') || '' : '';

  useEffect(() => {
    fetchStats();
  }, [adminKey]);

  const fetchStats = async () => {
    try {
      // 并行请求所有数据
      const headers: Record<string, string> = adminKey ? { Authorization: `Bearer ${adminKey}` } : {};

      const [providersRes, usersRes, keysRes, usageRes] = await Promise.all([
        adminKey
          ? fetch('/api/admin/providers', { headers })
          : fetch('/api/v1'),
        adminKey ? fetch('/api/admin/users', { headers }) : Promise.resolve(null),
        adminKey ? fetch('/api/admin/keys', { headers }) : Promise.resolve(null),
        adminKey ? fetch('/api/admin/usage?days=1', { headers }) : Promise.resolve(null),
      ]);

      const providersData = await providersRes.json();

      let userCount = 0;
      let keyCount = 0;
      let todayRequests = 0;
      let todayCost = 0;

      if (usersRes?.ok) {
        const usersData = await usersRes.json();
        userCount = usersData.users?.length || 0;
      }
      if (keysRes?.ok) {
        const keysData = await keysRes.json();
        keyCount = keysData.keys?.length || 0;
      }
      if (usageRes?.ok) {
        const usageData = await usageRes.json();
        todayRequests = usageData.overview?.totalRequests || 0;
        todayCost = usageData.overview?.totalCost || 0;
      }

      // 处理厂商数据 - admin API 返回完整配置状态
      const providers = adminKey && providersData.providers
        ? providersData.providers.map((p: { id: string; name: string; auth?: { configured: boolean } }) => ({
            id: p.id,
            name: p.name,
            base_url: '',
            configured: p.auth?.configured ?? false,
          }))
        : (providersData.providers || []).map((p: { id: string; name: string }) => ({
            id: p.id,
            name: p.name,
            base_url: '',
            configured: true, // 公开 API 无法判断
          }));

      setStats({
        providers,
        userCount,
        keyCount,
        todayRequests,
        todayCost,
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    const code = `curl -X POST "http://localhost:3001/api/v1/openai/v1/chat/completions" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"model": "gpt-4o-mini", "messages": [{"role": "user", "content": "Hello"}]}'`;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">控制台概览</h1>
          <p className="mt-1 text-sm text-gray-500">USERAPI 透传网关管理控制台</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">控制台概览</h1>
        <p className="mt-1 text-sm text-gray-500">USERAPI 透传网关管理控制台</p>
      </div>

      {/* Admin Key 提示 */}
      {!adminKey && (
        <Card className="border-yellow-200/60 bg-yellow-50/60">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800">未配置 Admin Key</p>
                <p className="text-sm text-yellow-700 mt-0.5">
                  请先配置 Admin API Key 以查看完整统计。
                  前往{' '}
                  <Link href="/dashboard/users" className="text-blue-600 hover:underline">
                    用户管理
                  </Link>{' '}
                  配置。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="厂商数量"
          value={stats?.providers.length || 0}
          icon={<Server className="w-5 h-5" />}
          iconBg="bg-gradient-to-br from-blue-500 to-blue-600"
          link="/dashboard/providers"
          linkText="查看详情"
        />
        <StatCard
          title="活跃用户"
          value={adminKey ? stats?.userCount || 0 : '-'}
          icon={<Users className="w-5 h-5" />}
          iconBg="bg-gradient-to-br from-green-500 to-green-600"
          link="/dashboard/users"
          linkText="管理用户"
        />
        <StatCard
          title="有效 Keys"
          value={adminKey ? stats?.keyCount || 0 : '-'}
          icon={<Key className="w-5 h-5" />}
          iconBg="bg-gradient-to-br from-yellow-500 to-orange-500"
          link="/dashboard/keys"
          linkText="管理 Keys"
        />
        <StatCard
          title="今日请求"
          value={adminKey ? stats?.todayRequests || 0 : '-'}
          icon={<Activity className="w-5 h-5" />}
          iconBg="bg-gradient-to-br from-purple-500 to-purple-600"
          link="/dashboard/usage"
          linkText="查看统计"
        />
      </div>

      {/* 厂商状态 */}
      <Card>
        <CardHeader
          title="厂商配置状态"
          action={
            <Link
              href="/dashboard/providers"
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              查看全部 <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          }
        />
        <CardContent noPadding>
          <div className="divide-y divide-gray-100">
            {(stats?.providers || []).slice(0, 5).map((provider) => (
              <div key={provider.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${provider.configured ? 'bg-green-500 shadow-lg shadow-green-500/30' : 'bg-red-500 shadow-lg shadow-red-500/30'}`} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{provider.name}</p>
                    <p className="text-xs text-gray-500">{provider.id}</p>
                  </div>
                </div>
                {provider.configured ? (
                  <Badge variant="success">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    已配置
                  </Badge>
                ) : (
                  <Badge variant="error">
                    <XCircle className="w-3 h-3 mr-1" />
                    未配置
                  </Badge>
                )}
              </div>
            ))}
            {(stats?.providers || []).length === 0 && (
              <div className="px-6 py-8 text-center text-gray-500">
                暂无厂商配置
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 快速开始 */}
      <Card>
        <CardHeader title="快速开始" />
        <CardContent>
          <div className="relative">
            <button
              onClick={handleCopy}
              className="absolute top-3 right-3 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <pre className="bg-gray-900 text-gray-100 rounded-xl p-4 overflow-x-auto text-xs leading-relaxed">
{`# 调用示例
curl -X POST "http://localhost:3001/api/v1/openai/v1/chat/completions" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"model": "gpt-4o-mini", "messages": [{"role": "user", "content": "Hello"}]}'`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
