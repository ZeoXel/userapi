'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Server,
  CheckCircle2,
  XCircle,
  FileCode,
  AlertCircle,
  PlayCircle,
  Loader2,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface Provider {
  id: string;
  name: string;
  description?: string;
  base_url: string;
  auth: {
    type: string;
    header: string;
    prefix: string;
    env_key: string;
    configured: boolean;
  };
}

interface TestResult {
  id: string;
  status: 'success' | 'error' | 'skipped';
  latency?: number;
  error?: string;
}

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});

  const adminKey = typeof window !== 'undefined' ? localStorage.getItem('adminKey') || '' : '';

  const handleTestConnections = async () => {
    if (!adminKey) return;
    setTesting(true);
    setTestResults({});

    try {
      const res = await fetch('/api/admin/providers/test', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminKey}` },
      });
      if (res.ok) {
        const data = await res.json();
        const results: Record<string, TestResult> = {};
        for (const r of data.results) {
          results[r.id] = r;
        }
        setTestResults(results);
      }
    } catch (err) {
      console.error('Test failed:', err);
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    if (adminKey) {
      fetchProviders();
    } else {
      // 如果没有 admin key，尝试获取公开信息
      fetchPublicProviders();
    }
  }, [adminKey]);

  const fetchProviders = async () => {
    try {
      const res = await fetch('/api/admin/providers', {
        headers: { Authorization: `Bearer ${adminKey}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProviders(data.providers || []);
        setError(null);
      } else if (res.status === 401) {
        // Fallback to public API
        fetchPublicProviders();
      }
    } catch (err) {
      console.error('Failed to fetch providers:', err);
      setError('获取厂商配置失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchPublicProviders = async () => {
    try {
      const res = await fetch('/api/v1');
      if (res.ok) {
        const data = await res.json();
        // 公开 API 只返回基本信息
        setProviders(
          (data.providers || []).map((p: { id: string; name: string; description?: string }) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            base_url: '-',
            auth: {
              type: '-',
              header: '-',
              prefix: '-',
              env_key: '-',
              configured: true,
            },
          }))
        );
      }
    } catch (err) {
      console.error('Failed to fetch public providers:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">厂商管理</h1>
          <p className="mt-1 text-sm text-gray-500">配置和管理上游 API 厂商</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">厂商管理</h1>
          <p className="mt-1 text-sm text-gray-500">配置和管理上游 API 厂商</p>
        </div>
        {adminKey && (
          <Button
            onClick={handleTestConnections}
            disabled={testing}
            icon={testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
          >
            {testing ? '测试中...' : '测试连接'}
          </Button>
        )}
      </div>

      {!adminKey && (
        <Card className="border-yellow-200/60 bg-yellow-50/60">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800">查看完整配置需要 Admin Key</p>
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
      )}

      <Card>
        <CardContent noPadding>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200/50">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    厂商
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Base URL
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    认证方式
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    环境变量
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    配置
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    连接
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {providers.map((provider) => (
                  <tr key={provider.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center">
                          <Server className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {provider.name}
                          </div>
                          <div className="text-xs text-gray-500">{provider.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {provider.base_url !== '-' ? (
                        <code className="text-xs text-gray-600 bg-gray-100/80 px-2.5 py-1 rounded-lg font-mono">
                          {provider.base_url}
                        </code>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {provider.auth.prefix !== '-' ? (
                        <code className="text-xs text-gray-600 bg-gray-100/80 px-2.5 py-1 rounded-lg font-mono">
                          {provider.auth.prefix}***
                        </code>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {provider.auth.env_key !== '-' ? (
                        <code className="text-xs text-blue-600 font-mono">
                          {provider.auth.env_key}
                        </code>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {provider.auth.configured ? (
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
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {testResults[provider.id] ? (
                        testResults[provider.id].status === 'success' ? (
                          <Badge variant="success">
                            <Wifi className="w-3 h-3 mr-1" />
                            {testResults[provider.id].latency}ms
                          </Badge>
                        ) : testResults[provider.id].status === 'error' ? (
                          <Badge variant="error" title={testResults[provider.id].error}>
                            <WifiOff className="w-3 h-3 mr-1" />
                            失败
                          </Badge>
                        ) : (
                          <Badge variant="neutral">
                            跳过
                          </Badge>
                        )
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                  </tr>
                ))}
                {providers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      <Server className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                      <p>暂无厂商配置</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="border-blue-200/60 bg-blue-50/40">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <FileCode className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-blue-900">添加新厂商</h4>
              <p className="mt-1 text-sm text-blue-700">
                编辑{' '}
                <code className="bg-blue-100/80 px-1.5 py-0.5 rounded text-xs">
                  src/config/providers.yaml
                </code>{' '}
                文件添加新厂商配置，无需修改代码。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
