'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Server,
  Users,
  Key,
  BarChart3,
  Settings,
  X,
  Save,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: '概览', icon: LayoutDashboard },
  { href: '/dashboard/providers', label: '厂商', icon: Server },
  { href: '/dashboard/users', label: '用户', icon: Users },
  { href: '/dashboard/keys', label: 'Keys', icon: Key },
  { href: '/dashboard/usage', label: '使用统计', icon: BarChart3 },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [showSettings, setShowSettings] = useState(false);
  const [adminKey, setAdminKey] = useState('');
  const [tempKey, setTempKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<'success' | 'error' | null>(null);

  useEffect(() => {
    const key = localStorage.getItem('adminKey') || '';
    setAdminKey(key);
    setTempKey(key);
  }, []);

  const handleSaveKey = async () => {
    if (!tempKey.trim()) {
      // 清除 key
      localStorage.removeItem('adminKey');
      setAdminKey('');
      setSaveResult('success');
      setTimeout(() => {
        setSaveResult(null);
        setShowSettings(false);
        window.location.reload();
      }, 1000);
      return;
    }

    setSaving(true);
    setSaveResult(null);

    try {
      // 验证 key 是否有效
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${tempKey}` },
      });

      if (res.ok) {
        localStorage.setItem('adminKey', tempKey);
        setAdminKey(tempKey);
        setSaveResult('success');
        setTimeout(() => {
          setSaveResult(null);
          setShowSettings(false);
          window.location.reload();
        }, 1000);
      } else {
        setSaveResult('error');
      }
    } catch {
      setSaveResult('error');
    } finally {
      setSaving(false);
    }
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50">
      {/* 顶部导航 */}
      <nav className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl backdrop-saturate-150 border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              {/* Logo */}
              <div className="flex-shrink-0 flex items-center">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/25">
                  <Server className="w-4 h-4 text-white" />
                </div>
                <span className="ml-3 text-xl font-bold text-gray-900">USERAPI</span>
                <span className="ml-2 px-2 py-0.5 text-xs font-medium text-blue-600 bg-blue-100/80 rounded-full">
                  Gateway
                </span>
              </div>

              {/* 导航链接 */}
              <div className="hidden sm:ml-10 sm:flex sm:space-x-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`
                        inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
                        transition-all duration-200
                        ${
                          active
                            ? 'bg-blue-500/10 text-blue-600'
                            : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900'
                        }
                      `}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* 右侧设置 */}
            <div className="flex items-center gap-2">
              {adminKey ? (
                <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-green-100/80 text-green-700 rounded-lg text-xs font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  已认证
                </span>
              ) : (
                <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-yellow-100/80 text-yellow-700 rounded-lg text-xs font-medium">
                  <AlertCircle className="w-3.5 h-3.5" />
                  未配置
                </span>
              )}
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 rounded-xl text-gray-500 hover:bg-gray-100/80 hover:text-gray-700 transition-colors"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* 移动端导航 */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-t border-gray-200/50 px-2 py-2">
        <div className="flex justify-around">
          {navItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-xs
                  transition-all duration-200
                  ${active ? 'text-blue-600' : 'text-gray-500'}
                `}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 设置弹窗 */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100]">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200/50">
              <h3 className="text-lg font-semibold text-gray-900">设置</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Admin API Key
                </label>
                <p className="text-xs text-gray-500">
                  用于访问用户管理、密钥管理等管理功能。配置在 .env.local 的 ADMIN_API_KEY
                </p>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={tempKey}
                    onChange={(e) => { setTempKey(e.target.value); setSaveResult(null); }}
                    placeholder="输入 Admin API Key"
                    className="w-full px-4 py-2.5 pr-12 bg-white/60 backdrop-blur-xl border border-gray-200/60 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {saveResult === 'error' && (
                <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-xl text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>Admin Key 无效，请检查后重试</span>
                </div>
              )}

              {saveResult === 'success' ? (
                <div className="flex items-center justify-center gap-2 py-2.5 bg-green-100 text-green-700 rounded-xl">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-sm font-medium">验证成功，正在刷新...</span>
                </div>
              ) : (
                <button
                  onClick={handleSaveKey}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-400 text-white rounded-xl font-medium transition-colors"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      验证中...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      验证并保存
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 主内容区 */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 pb-24 sm:pb-6">
        {children}
      </main>
    </div>
  );
}
