'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  Activity,
  CheckCircle2,
  Clock,
  DollarSign,
  AlertCircle,
  Server,
  User,
  TrendingUp,
  Coins,
  Cpu,
} from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

interface UsageStats {
  period: {
    days: number;
    startDate: string;
    endDate: string;
  };
  overview: {
    totalRequests: number;
    successRequests: number;
    failedRequests: number;
    totalCost: number;
    avgLatency: number;
  };
  byProvider: {
    provider: string;
    requests: number;
    successRate: number;
    totalCost: number;
    avgLatency: number;
  }[];
  byUser: {
    userId: string;
    userName: string;
    requests: number;
    totalCost: number;
  }[];
  dailyTrend: {
    date: string;
    requests: number;
    cost: number;
  }[];
  recentLogs: {
    id: string;
    provider: string;
    endpoint: string;
    method: string;
    responseStatus: number;
    latencyMs: number;
    cost: number;
    createdAt: string;
    userName: string;
  }[];
  credits: {
    total: number;
    transactions: number;
    byProvider: {
      provider: string;
      credits: number;
      count: number;
    }[];
    byModel: {
      provider: string;
      model: string;
      credits: number;
      count: number;
    }[];
  };
}

export default function UsagePage() {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  const adminKey = typeof window !== 'undefined' ? localStorage.getItem('adminKey') || '' : '';

  useEffect(() => {
    if (adminKey) {
      fetchStats();
    } else {
      setLoading(false);
    }
  }, [adminKey, days]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/usage?days=${days}`, {
        headers: { Authorization: `Bearer ${adminKey}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!adminKey) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">使用统计</h1>
          <p className="mt-1 text-sm text-gray-500">API 调用监控和分析</p>
        </div>
        <Card className="border-yellow-200/60 bg-yellow-50/60">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800">未配置 Admin Key</p>
                <p className="text-sm text-yellow-700 mt-0.5">
                  请先在
                  <Link href="/dashboard/users" className="text-blue-600 hover:underline mx-1">
                    用户管理
                  </Link>
                  页面配置 Admin API Key
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">使用统计</h1>
          <p className="mt-1 text-sm text-gray-500">API 调用监控和分析</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const overview = stats?.overview || {
    totalRequests: 0,
    successRequests: 0,
    failedRequests: 0,
    totalCost: 0,
    avgLatency: 0,
  };

  const successRate = overview.totalRequests > 0
    ? ((overview.successRequests / overview.totalRequests) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">使用统计</h1>
          <p className="mt-1 text-sm text-gray-500">API 调用监控和分析</p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(parseInt(e.target.value))}
          className="px-4 py-2 bg-white/60 backdrop-blur-xl border border-gray-200/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        >
          <option value={1}>今天</option>
          <option value={7}>最近 7 天</option>
          <option value={30}>最近 30 天</option>
          <option value={90}>最近 90 天</option>
        </select>
      </div>

      {/* 概览卡片 */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="总请求"
          value={overview.totalRequests.toLocaleString()}
          icon={<Activity className="w-5 h-5" />}
          iconBg="bg-gradient-to-br from-blue-500 to-blue-600"
        />
        <StatCard
          title="成功率"
          value={`${successRate}%`}
          icon={<CheckCircle2 className="w-5 h-5" />}
          iconBg="bg-gradient-to-br from-green-500 to-green-600"
        />
        <StatCard
          title="平均延迟"
          value={`${Math.round(overview.avgLatency || 0)}ms`}
          icon={<Clock className="w-5 h-5" />}
          iconBg="bg-gradient-to-br from-yellow-500 to-orange-500"
        />
        <StatCard
          title="积分消费"
          value={(stats?.credits?.total || 0).toLocaleString()}
          subtitle={`${stats?.credits?.transactions || 0} 笔交易`}
          icon={<Coins className="w-5 h-5" />}
          iconBg="bg-gradient-to-br from-purple-500 to-purple-600"
        />
        <StatCard
          title="费用估算"
          value={`¥${(overview.totalCost || 0).toFixed(2)}`}
          icon={<DollarSign className="w-5 h-5" />}
          iconBg="bg-gradient-to-br from-pink-500 to-rose-600"
        />
      </div>

      {/* 积分消费统计 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 按厂商统计积分 */}
        <Card>
          <CardHeader title="积分消费 - 按厂商" />
          <CardContent noPadding>
            <div className="divide-y divide-gray-100">
              {(stats?.credits?.byProvider || []).map((item) => {
                const maxCredits = Math.max(...(stats?.credits?.byProvider || []).map(p => p.credits));
                const percentage = maxCredits > 0 ? (item.credits / maxCredits) * 100 : 0;
                return (
                  <div key={item.provider} className="px-6 py-4 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Server className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900">{item.provider}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-gray-900">{item.credits.toLocaleString()}</span>
                        <span className="text-xs text-gray-500 ml-2">({item.count} 笔)</span>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {(stats?.credits?.byProvider || []).length === 0 && (
                <div className="px-6 py-12 text-center text-gray-500">
                  <Coins className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p>暂无积分消费记录</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 按模型统计积分 */}
        <Card>
          <CardHeader title="积分消费 - 按模型" />
          <CardContent noPadding>
            <div className="divide-y divide-gray-100">
              {(stats?.credits?.byModel || []).slice(0, 10).map((item) => {
                const maxCredits = Math.max(...(stats?.credits?.byModel || []).map(m => m.credits));
                const percentage = maxCredits > 0 ? (item.credits / maxCredits) * 100 : 0;
                return (
                  <div key={`${item.provider}-${item.model}`} className="px-6 py-4 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-gray-400" />
                        <div>
                          <span className="font-medium text-gray-900">{item.model}</span>
                          <span className="text-xs text-gray-500 ml-2">({item.provider})</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-gray-900">{item.credits.toLocaleString()}</span>
                        <span className="text-xs text-gray-500 ml-2">({item.count} 笔)</span>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {(stats?.credits?.byModel || []).length === 0 && (
                <div className="px-6 py-12 text-center text-gray-500">
                  <Cpu className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p>暂无模型消费记录</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 厂商统计 - API 请求 */}
      <Card>
        <CardHeader title="API 请求 - 按厂商" />
        <CardContent noPadding>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200/50">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    厂商
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    请求数
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    成功率
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    平均延迟
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    费用
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(stats?.byProvider || []).map((item) => (
                  <tr key={item.provider} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center">
                          <Server className="w-5 h-5 text-gray-600" />
                        </div>
                        <span className="font-medium text-gray-900">{item.provider}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {item.requests.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge
                        variant={
                          item.successRate >= 95 ? 'success' :
                          item.successRate >= 80 ? 'warning' : 'error'
                        }
                      >
                        {item.successRate}%
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {item.avgLatency}ms
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      ¥{(item.totalCost || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
                {(stats?.byProvider || []).length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      <BarChart3 className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                      <p>暂无数据</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 用户 TOP 10 */}
      <Card>
        <CardHeader title="用户 TOP 10" />
        <CardContent noPadding>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200/50">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    用户
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    请求数
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    消费
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(stats?.byUser || []).map((item, index) => (
                  <tr key={item.userId} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-500 text-white' :
                          index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-white' :
                          index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-500 text-white' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {index + 1}
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="font-medium text-gray-900">{item.userName}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {item.requests.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      ¥{(item.totalCost || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
                {(stats?.byUser || []).length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-gray-500">
                      <TrendingUp className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                      <p>暂无数据</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 最近请求 */}
      <Card>
        <CardHeader title="最近请求" />
        <CardContent noPadding>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200/50">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    时间
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    用户
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    厂商
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    端点
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    延迟
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(stats?.recentLogs || []).map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(log.createdAt).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.userName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="text-xs bg-gray-100/80 px-2 py-0.5 rounded-lg font-mono">
                        {log.provider}
                      </code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate">
                      <Badge variant="neutral" size="sm">
                        {log.method}
                      </Badge>
                      <span className="ml-2">{log.endpoint}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={log.responseStatus < 400 ? 'success' : 'error'}>
                        {log.responseStatus}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {log.latencyMs}ms
                    </td>
                  </tr>
                ))}
                {(stats?.recentLogs || []).length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      <Activity className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                      <p>暂无请求记录</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
