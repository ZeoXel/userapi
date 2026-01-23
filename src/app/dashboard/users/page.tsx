'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Trash2,
  AlertCircle,
  X,
  Shield,
  User as UserIcon,
  CheckCircle2,
  XCircle,
  Save,
  Edit2,
  Coins,
  MoreVertical,
  Power,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';

interface ApiKeyInfo {
  id: string;
  keyPrefix: string;
  status: string;
  quotaType: string;
  quotaUsed: number | null;
  quotaLimit: number | null;
  lastUsedAt: string | null;
}

interface UserCredits {
  total: number;
  used: number;
  remaining: number;
}

interface User {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  provider: string;
  role: string;
  status: string;
  createdAt: string;
  apiKey: ApiKeyInfo | null;
  credits: UserCredits;
}

interface Summary {
  totalUsers: number;
  activeUsers: number;
  totalCredits: number;
  usedCredits: number;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showRecharge, setShowRecharge] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'user' });
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [rechargeDescription, setRechargeDescription] = useState('');
  const [adminKey, setAdminKey] = useState('');
  const [tempAdminKey, setTempAdminKey] = useState('');
  const [actionMenuUser, setActionMenuUser] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const key = localStorage.getItem('adminKey') || '';
    setAdminKey(key);
    setTempAdminKey(key);
    if (key) {
      fetchUsers(key);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUsers = async (key: string) => {
    try {
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveKey = () => {
    localStorage.setItem('adminKey', tempAdminKey);
    setAdminKey(tempAdminKey);
    setLoading(true);
    fetchUsers(tempAdminKey);
  };

  const handleCreateUser = async () => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUser),
      });
      if (res.ok) {
        setShowCreate(false);
        setNewUser({ name: '', email: '', role: 'user' });
        fetchUsers(adminKey);
      }
    } catch (error) {
      console.error('Failed to create user:', error);
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser({ ...user });
    setShowEdit(true);
    setActionMenuUser(null);
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${adminKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editingUser.name,
          email: editingUser.email,
          phone: editingUser.phone,
          role: editingUser.role,
          status: editingUser.status,
        }),
      });
      if (res.ok) {
        setShowEdit(false);
        fetchUsers(adminKey);
      }
    } catch (error) {
      console.error('Failed to update user:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (user: User) => {
    const newStatus = user.status === 'active' ? 'disabled' : 'active';
    try {
      await fetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${adminKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchUsers(adminKey);
    } catch (error) {
      console.error('Failed to toggle status:', error);
    }
    setActionMenuUser(null);
  };

  const handleOpenRecharge = (user: User) => {
    setEditingUser(user);
    setRechargeAmount('');
    setRechargeDescription('');
    setShowRecharge(true);
    setActionMenuUser(null);
  };

  const handleRecharge = async () => {
    if (!editingUser || !rechargeAmount) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/credits/recharge', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: editingUser.id,
          amount: parseInt(rechargeAmount),
          description: rechargeDescription || '管理员充值',
        }),
      });
      if (res.ok) {
        setShowRecharge(false);
        fetchUsers(adminKey);
      } else {
        const error = await res.json();
        alert(error.error || '充值失败');
      }
    } catch (error) {
      console.error('Failed to recharge:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('确定删除此用户？此操作不可恢复。')) return;
    try {
      await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminKey}` },
      });
      setUsers(users.filter((u) => u.id !== id));
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
    setActionMenuUser(null);
  };

  // 计算积分使用百分比
  const getCreditsPercentage = (credits: UserCredits) => {
    if (credits.total === 0) return 0;
    return Math.round((credits.used / credits.total) * 100);
  };

  if (!adminKey) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">用户管理</h1>
          <p className="mt-1 text-sm text-gray-500">管理平台用户和积分</p>
        </div>
        <Card className="border-yellow-200/60 bg-yellow-50/60">
          <CardContent className="py-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800">请先配置 Admin API Key</p>
                <p className="text-sm text-yellow-700 mt-0.5">
                  Admin Key 用于管理用户和积分
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Input
                type="password"
                value={tempAdminKey}
                onChange={(e) => setTempAdminKey(e.target.value)}
                placeholder="输入 Admin API Key"
                className="flex-1"
              />
              <Button onClick={handleSaveKey} icon={<Save className="w-4 h-4" />}>
                保存
              </Button>
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
          <h1 className="text-2xl font-bold text-gray-900">用户管理</h1>
          <p className="mt-1 text-sm text-gray-500">管理平台用户和积分</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            onClick={() => fetchUsers(adminKey)}
            icon={<RefreshCw className="w-4 h-4" />}
          >
            刷新
          </Button>
          <Button onClick={() => setShowCreate(true)} icon={<Plus className="w-4 h-4" />}>
            新建用户
          </Button>
        </div>
      </div>

      {/* 汇总统计 */}
      {summary && (
        <div className="grid grid-cols-4 gap-4">
          <div className="p-4 bg-white rounded-xl border border-gray-200/60">
            <div className="text-xs text-gray-500 mb-1">总用户</div>
            <div className="text-2xl font-bold text-gray-900">{summary.totalUsers}</div>
          </div>
          <div className="p-4 bg-white rounded-xl border border-gray-200/60">
            <div className="text-xs text-gray-500 mb-1">活跃用户</div>
            <div className="text-2xl font-bold text-green-600">{summary.activeUsers}</div>
          </div>
          <div className="p-4 bg-white rounded-xl border border-gray-200/60">
            <div className="text-xs text-gray-500 mb-1">平台总积分</div>
            <div className="text-2xl font-bold text-blue-600">{summary.totalCredits.toLocaleString()}</div>
          </div>
          <div className="p-4 bg-white rounded-xl border border-gray-200/60">
            <div className="text-xs text-gray-500 mb-1">已消耗积分</div>
            <div className="text-2xl font-bold text-orange-600">{summary.usedCredits.toLocaleString()}</div>
          </div>
        </div>
      )}

      {/* 创建用户对话框 */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200/50">
              <h3 className="text-lg font-semibold text-gray-900">新建用户</h3>
              <button
                onClick={() => setShowCreate(false)}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <CardContent className="space-y-4">
              <Input
                label="用户名 *"
                type="text"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                placeholder="输入用户名"
              />
              <Input
                label="邮箱"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="输入邮箱（可选）"
              />
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">角色</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white/60 backdrop-blur-xl border border-gray-200/60 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <option value="user">普通用户</option>
                  <option value="admin">管理员</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="ghost" onClick={() => setShowCreate(false)}>
                  取消
                </Button>
                <Button onClick={handleCreateUser} disabled={!newUser.name}>
                  创建
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 编辑用户对话框 */}
      {showEdit && editingUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200/50">
              <h3 className="text-lg font-semibold text-gray-900">编辑用户</h3>
              <button
                onClick={() => setShowEdit(false)}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <CardContent className="space-y-4">
              <Input
                label="用户名"
                type="text"
                value={editingUser.name}
                onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
              />
              <Input
                label="邮箱"
                type="email"
                value={editingUser.email || ''}
                onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
              />
              <Input
                label="手机号"
                type="tel"
                value={editingUser.phone || ''}
                onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
              />
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">角色</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white/60 backdrop-blur-xl border border-gray-200/60 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <option value="user">普通用户</option>
                  <option value="admin">管理员</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">状态</label>
                <select
                  value={editingUser.status}
                  onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white/60 backdrop-blur-xl border border-gray-200/60 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <option value="active">正常</option>
                  <option value="disabled">禁用</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="ghost" onClick={() => setShowEdit(false)}>
                  取消
                </Button>
                <Button onClick={handleSaveEdit} disabled={saving}>
                  {saving ? '保存中...' : '保存'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 充值对话框 */}
      {showRecharge && editingUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200/50">
              <h3 className="text-lg font-semibold text-gray-900">积分充值</h3>
              <button
                onClick={() => setShowRecharge(false)}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <CardContent className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="text-sm text-gray-500 mb-1">充值用户</div>
                <div className="font-medium text-gray-900">{editingUser.name}</div>
                <div className="text-xs text-gray-400 mt-1">
                  当前积分: {editingUser.credits.remaining.toLocaleString()} / {editingUser.credits.total.toLocaleString()}
                </div>
              </div>
              <Input
                label="充值数量"
                type="number"
                value={rechargeAmount}
                onChange={(e) => setRechargeAmount(e.target.value)}
                placeholder="输入充值积分数量"
              />
              <Input
                label="备注"
                type="text"
                value={rechargeDescription}
                onChange={(e) => setRechargeDescription(e.target.value)}
                placeholder="充值备注（可选）"
              />
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="ghost" onClick={() => setShowRecharge(false)}>
                  取消
                </Button>
                <Button
                  onClick={handleRecharge}
                  disabled={!rechargeAmount || parseInt(rechargeAmount) <= 0 || saving}
                >
                  {saving ? '处理中...' : '确认充值'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 用户列表 */}
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
                      用户
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      联系方式
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      积分
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      API Key
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      状态
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            user.role === 'admin'
                              ? 'bg-gradient-to-br from-purple-500 to-purple-600'
                              : 'bg-gradient-to-br from-gray-400 to-gray-500'
                          }`}>
                            {user.role === 'admin' ? (
                              <Shield className="w-5 h-5 text-white" />
                            ) : (
                              <UserIcon className="w-5 h-5 text-white" />
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                            <div className="text-xs text-gray-400">
                              {user.role === 'admin' ? '管理员' : '用户'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          {user.phone && (
                            <div className="text-gray-900">{user.phone}</div>
                          )}
                          {user.email && (
                            <div className="text-gray-500 text-xs">{user.email}</div>
                          )}
                          {!user.phone && !user.email && (
                            <span className="text-gray-400">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="w-32">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-gray-500">
                              {user.credits.remaining.toLocaleString()}
                            </span>
                            <span className="text-gray-400">
                              / {user.credits.total.toLocaleString()}
                            </span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                getCreditsPercentage(user.credits) > 80
                                  ? 'bg-red-500'
                                  : getCreditsPercentage(user.credits) > 50
                                  ? 'bg-yellow-500'
                                  : 'bg-green-500'
                              }`}
                              style={{ width: `${getCreditsPercentage(user.credits)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.apiKey ? (
                          <code className="px-2 py-1 bg-gray-100 rounded text-xs font-mono text-gray-700">
                            {user.apiKey.keyPrefix}...
                          </code>
                        ) : (
                          <span className="text-gray-400 text-sm">未分配</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={user.status === 'active' ? 'success' : 'error'}>
                          {user.status === 'active' ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              正常
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 mr-1" />
                              禁用
                            </>
                          )}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="relative">
                          <button
                            onClick={() => setActionMenuUser(actionMenuUser === user.id ? null : user.id)}
                            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          {actionMenuUser === user.id && (
                            <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-xl shadow-xl border border-gray-200/60 py-1 z-10">
                              <button
                                onClick={() => handleEditUser(user)}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Edit2 className="w-4 h-4" />
                                编辑信息
                              </button>
                              <button
                                onClick={() => handleOpenRecharge(user)}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Coins className="w-4 h-4" />
                                充值积分
                              </button>
                              <button
                                onClick={() => handleToggleStatus(user)}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Power className="w-4 h-4" />
                                {user.status === 'active' ? '禁用用户' : '启用用户'}
                              </button>
                              <div className="border-t border-gray-100 my-1" />
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                              >
                                <Trash2 className="w-4 h-4" />
                                删除用户
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                        <p>暂无用户，点击「新建用户」创建</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 点击其他地方关闭菜单 */}
      {actionMenuUser && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setActionMenuUser(null)}
        />
      )}
    </div>
  );
}
