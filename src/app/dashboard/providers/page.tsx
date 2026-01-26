'use client';

import {
  Server,
  CheckCircle2,
  XCircle,
  FileCode,
  PlayCircle,
  Loader2,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useProviders } from '@/hooks/use-providers';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SkeletonTable } from '@/components/ui/skeleton';

export default function ProvidersPage() {
  const {
    providers,
    isLoading,
    testResults,
    testing,
    testConnections,
  } = useProviders();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">厂商管理</h1>
          <p className="mt-1 text-sm text-gray-500">配置和管理上游 API 厂商</p>
        </div>
        <Button
          onClick={testConnections}
          disabled={testing}
          icon={testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
        >
          {testing ? '测试中...' : '测试连接'}
        </Button>
      </div>

      <Card>
        <CardContent noPadding>
          {isLoading ? (
            <div className="p-6">
              <SkeletonTable rows={5} cols={6} />
            </div>
          ) : (
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
          )}
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
