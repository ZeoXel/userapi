'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Users,
  Key,
  Coins,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Copy,
  Check,
  TrendingUp,
  RefreshCw,
  ChevronDown,
  Terminal,
  Server,
  Activity,
} from 'lucide-react';
import { useDashboard } from '@/hooks/use-dashboard';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { SkeletonDashboard } from '@/components/ui/skeleton';

// 可折叠区域组件
function CollapsibleSection({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
  badge,
  action,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
  action?: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Card>
      <div
        className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-gray-50/50 transition-colors select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gray-100">
            <Icon className="w-4 h-4 text-gray-600" />
          </div>
          <h3 className="font-semibold text-gray-900">{title}</h3>
          {badge}
        </div>
        <div className="flex items-center gap-2">
          {action && <div onClick={(e) => e.stopPropagation()}>{action}</div>}
          <ChevronDown
            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      </div>
      <div
        className={`overflow-hidden transition-all duration-200 ease-in-out ${
          isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="border-t border-gray-100">{children}</div>
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const { data, stats, providers, recentTransactions, isLoading, refresh } = useDashboard();
  const [copied, setCopied] = useState(false);

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

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">控制台概览</h1>
          <p className="mt-1 text-sm text-gray-500">USERAPI 透传网关管理控制台</p>
        </div>
        <button
          onClick={() => refresh()}
          disabled={isLoading}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* 加载状态 */}
      {isLoading && !data ? (
        <SkeletonDashboard />
      ) : (
        <>
          {/* 统计卡片 */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="活跃用户"
              value={stats?.users.active || 0}
              subtitle={`共 ${stats?.users.total || 0} 用户`}
              icon={<Users className="w-5 h-5" />}
              iconBg="bg-gradient-to-br from-green-500 to-green-600"
              link="/dashboard/users"
              linkText="管理用户"
            />
            <StatCard
              title="有效 Keys"
              value={stats?.keys.active || 0}
              subtitle={`共 ${stats?.keys.total || 0} 密钥`}
              icon={<Key className="w-5 h-5" />}
              iconBg="bg-gradient-to-br from-yellow-500 to-orange-500"
              link="/dashboard/keys"
              linkText="管理 Keys"
            />
            <StatCard
              title="剩余积分"
              value={stats?.credits.remaining.toLocaleString() || 0}
              subtitle={`总量 ${stats?.credits.total.toLocaleString() || 0}`}
              icon={<Coins className="w-5 h-5" />}
              iconBg="bg-gradient-to-br from-blue-500 to-blue-600"
              link="/dashboard/users"
              linkText="充值管理"
            />
            <StatCard
              title="今日消费"
              value={stats?.today.consumption.toLocaleString() || 0}
              subtitle={`${stats?.today.transactions || 0} 笔交易`}
              icon={<TrendingUp className="w-5 h-5" />}
              iconBg="bg-gradient-to-br from-purple-500 to-purple-600"
              link="/dashboard/usage"
              linkText="查看统计"
            />
          </div>

          {/* 可折叠详情区域 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 厂商状态 - 折叠式 */}
            <CollapsibleSection
              title="厂商状态"
              icon={Server}
              badge={
                <Badge variant="neutral" size="sm">
                  {providers.filter(p => p.configured).length}/{providers.length}
                </Badge>
              }
              action={
                <Link
                  href="/dashboard/providers"
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  管理 <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              }
            >
              <div className="divide-y divide-gray-100">
                {providers.slice(0, 6).map((provider) => (
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
                {providers.length === 0 && (
                  <div className="px-6 py-8 text-center text-gray-500">
                    暂无厂商配置
                  </div>
                )}
              </div>
            </CollapsibleSection>

            {/* 最近交易 - 折叠式 */}
            <CollapsibleSection
              title="最近交易"
              icon={Activity}
              badge={
                <Badge variant={recentTransactions.length > 0 ? 'success' : 'neutral'} size="sm">
                  {recentTransactions.length} 条
                </Badge>
              }
              action={
                <Link
                  href="/dashboard/usage"
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  更多 <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              }
            >
              <div className="divide-y divide-gray-100">
                {recentTransactions.slice(0, 6).map((tx) => (
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
                {recentTransactions.length === 0 && (
                  <div className="px-6 py-8 text-center text-gray-500">
                    暂无交易记录
                  </div>
                )}
              </div>
            </CollapsibleSection>
          </div>

          {/* 快速开始 - 折叠式，默认收起 */}
          <CollapsibleSection
            title="快速开始"
            icon={Terminal}
            defaultOpen={false}
            action={
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy();
                }}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                {copied ? '已复制' : '复制'}
              </button>
            }
          >
            <CardContent>
              <pre className="bg-gray-900 text-gray-100 rounded-xl p-4 overflow-x-auto text-xs leading-relaxed">
{`# 调用示例
curl -X POST "https://api.zeoxel.cn/api/v1/openai/v1/chat/completions" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"model": "gpt-4o-mini", "messages": [{"role": "user", "content": "Hello"}]}'`}
              </pre>
            </CardContent>
          </CollapsibleSection>
        </>
      )}
    </div>
  );
}
