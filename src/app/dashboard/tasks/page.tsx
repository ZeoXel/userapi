'use client';

import {
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Play,
  Filter,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useTasks } from '@/hooks/use-tasks';
import { SkeletonTable } from '@/components/ui/skeleton';

export default function TasksPage() {
  const {
    tasks,
    total,
    stats,
    page,
    totalPages,
    filters,
    isLoading,
    setPage,
    updateFilters,
    refresh,
  } = useTasks(20);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted':
      case 'queued':
        return <Clock className="w-4 h-4 text-amber-500" />;
      case 'in_progress':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failure':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Play className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      submitted: 'bg-yellow-100 text-yellow-800',
      queued: 'bg-amber-100 text-amber-800',
      in_progress: 'bg-blue-100 text-blue-800',
      success: 'bg-green-100 text-green-800',
      failure: 'bg-red-100 text-red-800',
    };

    const labels: Record<string, string> = {
      submitted: '已提交',
      queued: '排队中',
      in_progress: '进行中',
      success: '成功',
      failure: '失败',
    };

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {getStatusIcon(status)}
        {labels[status] || status}
      </span>
    );
  };

  const getPlatformBadge = (platform: string) => {
    const colors: Record<string, string> = {
      vidu: 'bg-purple-100 text-purple-800',
      suno: 'bg-pink-100 text-pink-800',
      minimax: 'bg-blue-100 text-blue-800',
      kling: 'bg-orange-100 text-orange-800',
    };

    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[platform.toLowerCase()] || 'bg-gray-100 text-gray-800'}`}>
        {platform}
      </span>
    );
  };

  const formatTime = (time: string | null) => {
    if (!time) return '-';
    return new Date(time).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* 标题栏 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">任务管理</h1>
          <p className="text-sm text-gray-500 mt-1">
            管理异步任务状态，包括视频生成、音乐生成等
          </p>
        </div>
        <button
          onClick={() => refresh()}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-400 text-white rounded-xl font-medium transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          刷新
        </button>
      </div>

      {/* 统计卡片 */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white/60 backdrop-blur-xl rounded-xl p-4 border border-white/40">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-500">总任务</div>
          </div>
          <div className="bg-white/60 backdrop-blur-xl rounded-xl p-4 border border-white/40">
            <div className="text-2xl font-bold text-blue-600">{stats.pending}</div>
            <div className="text-sm text-gray-500">进行中</div>
          </div>
          <div className="bg-white/60 backdrop-blur-xl rounded-xl p-4 border border-white/40">
            <div className="text-2xl font-bold text-green-600">{stats.success}</div>
            <div className="text-sm text-gray-500">成功</div>
          </div>
          <div className="bg-white/60 backdrop-blur-xl rounded-xl p-4 border border-white/40">
            <div className="text-2xl font-bold text-red-600">{stats.failure}</div>
            <div className="text-sm text-gray-500">失败</div>
          </div>
        </div>
      )}

      {/* 过滤器 */}
      <div className="bg-white/60 backdrop-blur-xl rounded-xl p-4 border border-white/40">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">筛选:</span>
          </div>
          <select
            value={filters.platform}
            onChange={(e) => updateFilters({ platform: e.target.value })}
            className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <option value="">所有平台</option>
            <option value="vidu">Vidu</option>
            <option value="suno">Suno</option>
            <option value="minimax">MiniMax</option>
            <option value="kling">Kling</option>
          </select>
          <select
            value={filters.status}
            onChange={(e) => updateFilters({ status: e.target.value })}
            className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <option value="">所有状态</option>
            <option value="submitted">已提交</option>
            <option value="queued">排队中</option>
            <option value="in_progress">进行中</option>
            <option value="success">成功</option>
            <option value="failure">失败</option>
          </select>
        </div>
      </div>

      {/* 任务列表 */}
      <div className="bg-white/60 backdrop-blur-xl rounded-xl border border-white/40 overflow-hidden">
        {isLoading && tasks.length === 0 ? (
          <div className="p-6">
            <SkeletonTable rows={10} cols={7} />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-200/50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">任务</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">用户</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">平台</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">进度</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">积分</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">时间</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200/50">
                  {tasks.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        暂无任务
                      </td>
                    </tr>
                  ) : (
                    tasks.map((task) => (
                      <tr key={task.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900 font-mono">
                            {task.taskId.length > 16 ? `${task.taskId.substring(0, 16)}...` : task.taskId}
                          </div>
                          <div className="text-xs text-gray-500">{task.action}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {task.userName || task.userId.substring(0, 8)}
                        </td>
                        <td className="px-4 py-3">
                          {getPlatformBadge(task.platform)}
                        </td>
                        <td className="px-4 py-3">
                          {getStatusBadge(task.status)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all ${
                                  task.status === 'success' ? 'bg-green-500' :
                                  task.status === 'failure' ? 'bg-red-500' : 'bg-blue-500'
                                }`}
                                style={{ width: task.progress }}
                              />
                            </div>
                            <span className="text-xs text-gray-500">{task.progress}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className="text-gray-900">
                            {task.quotaActual ?? task.quotaPreConsumed}
                          </span>
                          {task.quotaActual && task.quotaActual !== task.quotaPreConsumed && (
                            <span className="text-xs text-gray-500 ml-1">
                              (预: {task.quotaPreConsumed})
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          <div>{formatTime(task.submitTime)}</div>
                          {task.finishTime && (
                            <div className="text-xs">完成: {formatTime(task.finishTime)}</div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200/50">
                <div className="text-sm text-gray-500">
                  共 {total} 条，第 {page}/{totalPages} 页
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
