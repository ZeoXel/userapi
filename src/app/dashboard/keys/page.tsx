'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Key,
  Plus,
  AlertCircle,
  X,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Trash2,
  Clock,
  Infinity,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';

interface ApiKey {
  key: {
    id: string;
    keyPrefix: string;
    name: string | null;
    status: string;
    allowedProviders: string | null;
    quotaType: string;
    quotaLimit: number | null;
    quotaUsed: number;
    lastUsedAt: string | null;
    createdAt: string;
  };
  user: {
    id: string;
    name: string;
  };
}

function KeysPageContent() {
  const searchParams = useSearchParams();
  const userIdFilter = searchParams.get('userId');

  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newKey, setNewKey] = useState({
    userId: userIdFilter || '',
    name: '',
    quotaType: 'unlimited',
    quotaLimit: '',
  });
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const adminKey = typeof window !== 'undefined' ? localStorage.getItem('adminKey') || '' : '';

  useEffect(() => {
    if (adminKey) {
      fetchKeys();
      fetchUsers();
    } else {
      setLoading(false);
    }
  }, [adminKey, userIdFilter]);

  const fetchKeys = async () => {
    try {
      const url = userIdFilter
        ? `/api/admin/keys?userId=${userIdFilter}`
        : '/api/admin/keys';
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${adminKey}` },
      });
      if (res.ok) {
        const data = await res.json();
        setKeys(data.keys);
      }
    } catch (error) {
      console.error('Failed to fetch keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${adminKey}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const handleCreateKey = async () => {
    try {
      const res = await fetch('/api/admin/keys', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newKey,
          quotaLimit: newKey.quotaLimit ? parseInt(newKey.quotaLimit) : null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setCreatedKey(data.key.fullKey);
        setShowCreate(false);
        fetchKeys();
      }
    } catch (error) {
      console.error('Failed to create key:', error);
    }
  };

  const handleRevokeKey = async (id: string) => {
    if (!confirm('确定吊销此 Key？吊销后无法恢复。')) return;
    try {
      await fetch(`/api/admin/keys/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminKey}` },
      });
      fetchKeys();
    } catch (error) {
      console.error('Failed to revoke key:', error);
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!adminKey) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Key 管理</h1>
          <p className="mt-1 text-sm text-gray-500">管理所有 API Keys</p>
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Key 管理</h1>
          <p className="mt-1 text-sm text-gray-500">
            {userIdFilter
              ? `用户 ${users.find((u) => u.id === userIdFilter)?.name || userIdFilter} 的 Keys`
              : '管理所有 API Keys'}
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} icon={<Plus className="w-4 h-4" />}>
          新建 Key
        </Button>
      </div>

      {/* 新建 Key 成功提示 */}
      {createdKey && (
        <Card className="border-green-200/60 bg-green-50/60">
          <CardContent className="py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-green-800">Key 创建成功！请立即保存：</p>
                  <code className="block mt-2 p-3 bg-green-100/80 rounded-xl text-sm font-mono text-green-900 break-all">
                    {createdKey}
                  </code>
                  <p className="mt-2 text-xs text-green-600">此 Key 仅显示一次，请妥善保存</p>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => copyToClipboard(createdKey)}
                  icon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                >
                  {copied ? '已复制' : '复制'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setCreatedKey(null)}>
                  关闭
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 创建 Key 对话框 */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200/50">
              <h3 className="text-lg font-semibold text-gray-900">新建 API Key</h3>
              <button
                onClick={() => {
                  setShowCreate(false);
                  setNewKey({ userId: userIdFilter || '', name: '', quotaType: 'unlimited', quotaLimit: '' });
                }}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">所属用户 *</label>
                <select
                  value={newKey.userId}
                  onChange={(e) => setNewKey({ ...newKey, userId: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white/60 backdrop-blur-xl border border-gray-200/60 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <option value="">选择用户</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label="Key 名称"
                type="text"
                value={newKey.name}
                onChange={(e) => setNewKey({ ...newKey, name: e.target.value })}
                placeholder="如：生产环境、测试用"
              />
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">配额类型</label>
                <select
                  value={newKey.quotaType}
                  onChange={(e) => setNewKey({ ...newKey, quotaType: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white/60 backdrop-blur-xl border border-gray-200/60 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <option value="unlimited">无限制</option>
                  <option value="monthly">月度配额</option>
                  <option value="total">总量配额</option>
                </select>
              </div>
              {newKey.quotaType !== 'unlimited' && (
                <Input
                  label="配额上限"
                  type="number"
                  value={newKey.quotaLimit}
                  onChange={(e) => setNewKey({ ...newKey, quotaLimit: e.target.value })}
                  placeholder="输入数字"
                />
              )}
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowCreate(false);
                    setNewKey({ userId: userIdFilter || '', name: '', quotaType: 'unlimited', quotaLimit: '' });
                  }}
                >
                  取消
                </Button>
                <Button onClick={handleCreateKey} disabled={!newKey.userId}>
                  创建
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Key 列表 */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <Card>
          <CardContent noPadding>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200/50">
                <thead className="bg-gray-50/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Key
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      用户
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      配额
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      状态
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      最后使用
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {keys.map((item) => (
                    <tr key={item.key.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center">
                            <Key className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <div className="text-sm font-mono text-gray-900">
                              {item.key.keyPrefix}****
                            </div>
                            {item.key.name && (
                              <div className="text-xs text-gray-400">{item.key.name}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.user.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.key.quotaType === 'unlimited' ? (
                          <Badge variant="neutral">
                            <Infinity className="w-3 h-3 mr-1" />
                            无限制
                          </Badge>
                        ) : (
                          <div className="text-sm">
                            <span className="font-medium">{item.key.quotaUsed}</span>
                            <span className="text-gray-400"> / {item.key.quotaLimit}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={item.key.status === 'active' ? 'success' : 'error'}>
                          {item.key.status === 'active' ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              有效
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 mr-1" />
                              已吊销
                            </>
                          )}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.key.lastUsedAt ? (
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            {new Date(item.key.lastUsedAt).toLocaleString()}
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.key.status === 'active' && (
                          <button
                            onClick={() => handleRevokeKey(item.key.id)}
                            className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                            title="吊销"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {keys.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        <Key className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                        <p>暂无 Key，点击「新建 Key」创建</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function KeysPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Key 管理</h1>
          <p className="mt-1 text-sm text-gray-500">管理所有 API Keys</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    }>
      <KeysPageContent />
    </Suspense>
  );
}
