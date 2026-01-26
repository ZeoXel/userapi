'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SWRConfig } from 'swr';
import {
  LayoutDashboard,
  Server,
  Users,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Coins,
  ListTodo,
  Key,
  Database,
  RefreshCw,
} from 'lucide-react';
import { AdminAuthProvider, useAdminAuth } from '@/contexts/admin-auth';
import { swrConfig } from '@/lib/swr/config';

const navItems = [
  { href: '/dashboard', label: '概览', icon: LayoutDashboard },
  { href: '/dashboard/providers', label: '厂商', icon: Server },
  { href: '/dashboard/users', label: '用户', icon: Users },
  { href: '/dashboard/keys', label: '密钥', icon: Key },
  { href: '/dashboard/tasks', label: '任务', icon: ListTodo },
  { href: '/dashboard/usage', label: '使用统计', icon: BarChart3 },
  { href: '/dashboard/pricing', label: '定价', icon: Coins },
];

function DashboardContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated, isReady, dbConnected, dbError, refresh } = useAdminAuth();

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

            {/* 右侧状态指示 */}
            <div className="flex items-center gap-2">
              {!isReady ? (
                <span className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100/80 text-gray-600 rounded-lg text-xs font-medium">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  加载中
                </span>
              ) : (
                <>
                  {/* 数据库状态 */}
                  {dbConnected ? (
                    <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100/80 text-emerald-700 rounded-lg text-xs font-medium">
                      <Database className="w-3.5 h-3.5" />
                      DB 连接正常
                    </span>
                  ) : (
                    <span
                      className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-red-100/80 text-red-700 rounded-lg text-xs font-medium cursor-help"
                      title={dbError || 'Database disconnected'}
                    >
                      <Database className="w-3.5 h-3.5" />
                      DB 断开
                    </span>
                  )}

                  {/* Admin Key 状态 */}
                  {isAuthenticated ? (
                    <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-green-100/80 text-green-700 rounded-lg text-xs font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      已认证
                    </span>
                  ) : (
                    <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-yellow-100/80 text-yellow-700 rounded-lg text-xs font-medium">
                      <AlertCircle className="w-3.5 h-3.5" />
                      未配置 ADMIN_API_KEY
                    </span>
                  )}

                  {/* 刷新按钮 */}
                  <button
                    onClick={() => refresh()}
                    className="p-2 rounded-xl text-gray-500 hover:bg-gray-100/80 hover:text-gray-700 transition-colors"
                    title="刷新连接状态"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </>
              )}
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

      {/* 错误提示 */}
      {isReady && (!isAuthenticated || !dbConnected) && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          {!isAuthenticated && (
            <div className="mb-3 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">未配置 Admin API Key</p>
                  <p className="text-sm text-yellow-700 mt-0.5">
                    请在 <code className="px-1.5 py-0.5 bg-yellow-100 rounded text-xs">.env.local</code> 中设置{' '}
                    <code className="px-1.5 py-0.5 bg-yellow-100 rounded text-xs">ADMIN_API_KEY</code> 环境变量
                  </p>
                </div>
              </div>
            </div>
          )}
          {!dbConnected && (
            <div className="mb-3 p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-start gap-3">
                <Database className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">数据库连接失败</p>
                  <p className="text-sm text-red-700 mt-0.5">
                    {dbError || '请检查 DATABASE_URL 环境变量配置'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 主内容区 */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 pb-24 sm:pb-6">
        {children}
      </main>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminAuthProvider>
      <SWRConfig value={swrConfig}>
        <DashboardContent>{children}</DashboardContent>
      </SWRConfig>
    </AdminAuthProvider>
  );
}
