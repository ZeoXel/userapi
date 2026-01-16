'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Plus,
  Key,
  Trash2,
  AlertCircle,
  X,
  Shield,
  User as UserIcon,
  CheckCircle2,
  XCircle,
  Save,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';

interface User {
  id: string;
  name: string;
  email: string | null;
  role: string;
  status: string;
  createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'user' });
  const [adminKey, setAdminKey] = useState('');
  const [tempAdminKey, setTempAdminKey] = useState('');

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
        const data = await res.json();
        setUsers([...users, data.user]);
        setShowCreate(false);
        setNewUser({ name: '', email: '', role: 'user' });
      }
    } catch (error) {
      console.error('Failed to create user:', error);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('确定删除此用户？')) return;
    try {
      await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminKey}` },
      });
      setUsers(users.filter((u) => u.id !== id));
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  if (!adminKey) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">用户管理</h1>
          <p className="mt-1 text-sm text-gray-500">管理平台用户</p>
        </div>
        <Card className="border-yellow-200/60 bg-yellow-50/60">
          <CardContent className="py-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800">请先配置 Admin API Key</p>
                <p className="text-sm text-yellow-700 mt-0.5">
                  Admin Key 用于管理用户和 API Keys
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
          <p className="mt-1 text-sm text-gray-500">管理平台用户</p>
        </div>
        <Button onClick={() => setShowCreate(true)} icon={<Plus className="w-4 h-4" />}>
          新建用户
        </Button>
      </div>

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
                      邮箱
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      角色
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
                            <div className="text-xs text-gray-400 font-mono">{user.id.slice(0, 8)}...</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.email || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={user.role === 'admin' ? 'info' : 'neutral'}>
                          {user.role === 'admin' ? (
                            <>
                              <Shield className="w-3 h-3 mr-1" />
                              管理员
                            </>
                          ) : (
                            <>
                              <UserIcon className="w-3 h-3 mr-1" />
                              用户
                            </>
                          )}
                        </Badge>
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
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/dashboard/keys?userId=${user.id}`}
                            className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                            title="管理 Key"
                          >
                            <Key className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
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
    </div>
  );
}
