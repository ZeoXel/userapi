'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Server,
  Users,
  Key,
  Coins,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Copy,
  Check,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

interface DashboardData {
  stats: {
    users: { total: number; active: number };
    keys: { total: number; active: number };
    credits: { total: number; used: number; remaining: number };
    today: { consumption: number; transactions: number };
  };
  providers: { id: string; name: string; configured: boolean }[];
  recentTransactions: {
    id: string;
    type: string;
    amount: number;
    service: string | null;
    provider: string | null;
    model: string | null;
    createdAt: string;
    userName: string;
  }[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const adminKey = typeof window !== 'undefined' ? localStorage.getItem('adminKey') || '' : '';

  useEffect(() => {
    if (adminKey) {
      fetchDashboard();
    } else {
      setLoading(false);
    }
  }, [adminKey]);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/dashboard', {
        headers: { Authorization: `Bearer ${adminKey}` },
      });
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    const code = `curl -X POST "https://api.zeoxel.cn/api/v1/openai/v1/chat/completions" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"model": "gpt-4o-mini", "messages": [{"role": "user", "content": "Hello"}]}'`;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'consumption': return '消费';
      case 'recharge': return '充值';
      case 'refund': return '退款';
      case 'reward': return '奖励';
      default: return type;
    }
  };

  const getServiceName = (service: string | null) => {
    if (!service) return '-';
    switch (service) {
      case 'video': return '视频';
      case 'image': return '图片';
      case 'audio': return '音频';
      case 'chat': return '对话';
      default: return service;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">控制台概览</h1>
            <p className="mt-1 text-sm text-gray-500">USERAPI 透传网关管理控制台</p>
          </div>
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">控制台概览</h1>
          <p className="mt-1 text-sm text-gray-500">USERAPI 透传网关管理控制台</p>
        </div>
        {adminKey && (
          <button
            onClick={fetchDashboard}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        )}
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
          title="活跃用户"
          value={data?.stats.users.active || 0}
          subtitle={`共 ${data?.stats.users.total || 0} 用户`}
          icon={<Users className="w-5 h-5" />}
          iconBg="bg-gradient-to-br from-green-500 to-green-600"
          link="/dashboard/users"
          linkText="管理用户"
        />
        <StatCard
          title="有效 Keys"
          value={data?.stats.keys.active || 0}
          subtitle={`共 ${data?.stats.keys.total || 0} 密钥`}
          icon={<Key className="w-5 h-5" />}
          iconBg="bg-gradient-to-br from-yellow-500 to-orange-500"
          link="/dashboard/keys"
          linkText="管理 Keys"
        />
        <StatCard
          title="剩余积分"
          value={data?.stats.credits.remaining.toLocaleString() || 0}
          subtitle={`总量 ${data?.stats.credits.total.toLocaleString() || 0}`}
          icon={<Coins className="w-5 h-5" />}
          iconBg="bg-gradient-to-br from-blue-500 to-blue-600"
          link="/dashboard/users"
          linkText="充值管理"
        />
        <StatCard
          title="今日消费"
          value={data?.stats.today.consumption.toLocaleString() || 0}
          subtitle={`${data?.stats.today.transactions || 0} 笔交易`}
          icon={<TrendingUp className="w-5 h-5" />}
          iconBg="bg-gradient-to-br from-purple-500 to-purple-600"
          link="/dashboard/usage"
          linkText="查看统计"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
              {(data?.providers || []).slice(0, 6).map((provider) => (
                <div key={provider.id} className="px-6 py-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${provider.configured ? 'bg-green-500' : 'bg-red-500'}`} />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{provider.name}</p>
                      <p className="text-xs text-gray-500">{provider.id}</p>
                    </div>
                  </div>
                  {provider.configured ? (
                    <Badge variant="success" size="sm">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      已配置
                    </Badge>
                  ) : (
                    <Badge variant="error" size="sm">
                      <XCircle className="w-3 h-3 mr-1" />
                      未配置
                    </Badge>
                  )}
                </div>
              ))}
              {(data?.providers || []).length === 0 && (
                <div className="px-6 py-8 text-center text-gray-500">
                  暂无厂商配置
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 最近交易 */}
        <Card>
          <CardHeader
            title="最近交易"
            action={
              <Link
                href="/dashboard/usage"
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                查看全部 <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            }
          />
          <CardContent noPadding>
            <div className="divide-y divide-gray-100">
              {(data?.recentTransactions || []).slice(0, 6).map((tx) => (
                <div key={tx.id} className="px-6 py-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {tx.userName}
                      </span>
                      <Badge variant={tx.type === 'consumption' ? 'error' : 'success'} size="sm">
                        {getTypeName(tx.type)}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {getServiceName(tx.service)}
                      {tx.model && ` · ${tx.model}`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-semibold ${tx.type === 'consumption' ? 'text-red-600' : 'text-green-600'}`}>
                      {tx.type === 'consumption' ? '-' : '+'}{Math.abs(tx.amount)}
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(tx.createdAt).toLocaleString('zh-CN', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
              ))}
              {(data?.recentTransactions || []).length === 0 && (
                <div className="px-6 py-8 text-center text-gray-500">
                  暂无交易记录
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

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
curl -X POST "https://api.zeoxel.cn/api/v1/openai/v1/chat/completions" \\
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
