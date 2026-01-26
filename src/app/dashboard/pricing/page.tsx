'use client';

import { useState } from 'react';
import {
  Coins,
  Video,
  Image,
  Music,
  MessageSquare,
  Save,
  RefreshCw,
  Plus,
  Trash2,
  Calculator,
  Settings2,
  Check,
  X,
} from 'lucide-react';
import { usePricing, ServiceType, PricingItem, Multipliers } from '@/hooks/use-pricing';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { SkeletonTable, SkeletonCard } from '@/components/ui/skeleton';

const serviceIcons: Record<ServiceType, typeof Video> = {
  video: Video,
  image: Image,
  audio: Music,
  chat: MessageSquare,
};

const serviceLabels: Record<ServiceType, string> = {
  video: '视频',
  image: '图像',
  audio: '音频',
  chat: '对话',
};

const serviceColors: Record<ServiceType, string> = {
  video: 'from-purple-500 to-purple-600',
  image: 'from-green-500 to-green-600',
  audio: 'from-orange-500 to-orange-600',
  chat: 'from-blue-500 to-blue-600',
};

export default function PricingPage() {
  const {
    pricingList,
    multipliers,
    isLoading,
    updateMultipliers,
    updateModel,
    deleteModel,
    calculateCredits,
    getByService,
    groupByProvider,
    refresh,
  } = usePricing();

  const [activeTab, setActiveTab] = useState<ServiceType>('video');
  const [editingItem, setEditingItem] = useState<PricingItem | null>(null);
  const [showCalculator, setShowCalculator] = useState(false);
  const [editingMultipliers, setEditingMultipliers] = useState(false);
  const [tempMultipliers, setTempMultipliers] = useState<Multipliers>({ default: 1.0 });
  const [saving, setSaving] = useState(false);

  // 开始编辑时初始化临时倍率
  const startEditingMultipliers = () => {
    setTempMultipliers(multipliers);
    setEditingMultipliers(true);
  };

  const handleSaveMultipliers = async () => {
    setSaving(true);
    try {
      await updateMultipliers(tempMultipliers);
      setEditingMultipliers(false);
    } catch {
      // Error handled in hook
    } finally {
      setSaving(false);
    }
  };

  const handleSaveModel = async (item: PricingItem, newPricing: Record<string, unknown>) => {
    setSaving(true);
    try {
      await updateModel(item, newPricing);
      setEditingItem(null);
    } catch {
      // Error handled in hook
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteModel = async (item: PricingItem) => {
    if (!confirm(`确定要删除 ${item.provider}/${item.model} 的定价配置吗？`)) return;
    await deleteModel(item);
  };

  const filteredList = getByService(activeTab);
  const groupedByProvider = groupByProvider(filteredList);

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">定价管理</h1>
          <p className="mt-1 text-sm text-gray-500">配置各服务的积分定价（1积分 ≈ 0.01元）</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCalculator(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-medium transition-colors"
          >
            <Calculator className="w-4 h-4" />
            计算器
          </button>
          <button
            onClick={() => refresh()}
            disabled={isLoading}
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 全局倍率配置 */}
      <Card>
        <CardHeader
          title="全局倍率"
          action={
            editingMultipliers ? (
              <div className="flex gap-2">
                <button
                  onClick={handleSaveMultipliers}
                  disabled={saving}
                  className="flex items-center gap-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  保存
                </button>
                <button
                  onClick={() => {
                    setTempMultipliers(multipliers);
                    setEditingMultipliers(false);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  取消
                </button>
              </div>
            ) : (
              <button
                onClick={startEditingMultipliers}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
              >
                <Settings2 className="w-3.5 h-3.5" />
                编辑
              </button>
            )
          }
        />
        <CardContent>
          {isLoading ? (
            <SkeletonCard lines={2} />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Object.entries(editingMultipliers ? tempMultipliers : multipliers).map(([key, value]) => (
                <div key={key} className="p-4 bg-gray-50/80 rounded-xl">
                  <div className="text-xs text-gray-500 mb-1">
                    {key === 'default' ? '默认倍率' : key}
                  </div>
                  {editingMultipliers ? (
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={tempMultipliers[key] || 1}
                      onChange={(e) => setTempMultipliers({ ...tempMultipliers, [key]: parseFloat(e.target.value) || 1 })}
                      className="w-full px-2 py-1 border border-gray-200 rounded-lg text-lg font-semibold text-gray-900"
                    />
                  ) : (
                    <div className="text-lg font-semibold text-gray-900">{value}x</div>
                  )}
                </div>
              ))}
              {editingMultipliers && (
                <button
                  onClick={() => {
                    const name = prompt('输入新倍率名称（如 vip, promotion）：');
                    if (name && !tempMultipliers[name]) {
                      setTempMultipliers({ ...tempMultipliers, [name]: 1.0 });
                    }
                  }}
                  className="p-4 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 服务类型选项卡 */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {(['video', 'image', 'audio', 'chat'] as ServiceType[]).map((service) => {
          const Icon = serviceIcons[service];
          const count = getByService(service).length;
          return (
            <button
              key={service}
              onClick={() => setActiveTab(service)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all whitespace-nowrap ${
                activeTab === service
                  ? `bg-gradient-to-r ${serviceColors[service]} text-white shadow-lg`
                  : 'bg-white/60 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              {serviceLabels[service]}
              <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                activeTab === service ? 'bg-white/20' : 'bg-gray-200'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 定价列表 */}
      {isLoading ? (
        <Card>
          <CardContent>
            <SkeletonTable rows={5} cols={3} />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedByProvider).map(([provider, items]) => (
            <Card key={provider}>
              <CardHeader title={provider} />
              <CardContent noPadding>
                <div className="divide-y divide-gray-100">
                  {items.map((item) => {
                    const isEditing = editingItem?.model === item.model && editingItem?.provider === item.provider;
                    return (
                      <PricingItemRow
                        key={`${item.provider}-${item.model}-${isEditing ? 'edit' : 'view'}`}
                        item={item}
                        isEditing={isEditing}
                        onEdit={() => setEditingItem(item)}
                        onCancel={() => setEditingItem(null)}
                        onSave={(newPricing) => handleSaveModel(item, newPricing)}
                        onDelete={() => handleDeleteModel(item)}
                        saving={saving}
                      />
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}

          {Object.keys(groupedByProvider).length === 0 && (
            <Card>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <Coins className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p>暂无 {serviceLabels[activeTab]} 定价配置</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* 积分计算器弹窗 */}
      {showCalculator && (
        <CreditsCalculator
          onClose={() => setShowCalculator(false)}
          calculateCredits={calculateCredits}
        />
      )}
    </div>
  );
}

// 定价项组件
function PricingItemRow({
  item,
  isEditing,
  onEdit,
  onCancel,
  onSave,
  onDelete,
  saving,
}: {
  item: PricingItem;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (pricing: Record<string, unknown>) => void;
  onDelete: () => void;
  saving: boolean;
}) {
  // 使用 key 重置组件，所以可以直接从 props 初始化
  const [editPricing, setEditPricing] = useState<Record<string, unknown>>(item.pricing);

  const formatPricingDisplay = (pricing: Record<string, unknown>) => {
    const parts: string[] = [];

    if ('per_second' in pricing) {
      parts.push(`${pricing.per_second} 积分/秒`);
    }
    if ('min_charge' in pricing) {
      parts.push(`最低 ${pricing.min_charge}`);
    }
    if ('per_image' in pricing) {
      parts.push(`${pricing.per_image} 积分/张`);
    }
    if ('per_song' in pricing) {
      parts.push(`${pricing.per_song} 积分/首`);
    }
    if ('per_k_chars' in pricing) {
      parts.push(`${pricing.per_k_chars} 积分/千字`);
    }
    if ('input_per_1k' in pricing) {
      parts.push(`输入 ${pricing.input_per_1k}/1K`);
    }
    if ('output_per_1k' in pricing) {
      parts.push(`输出 ${pricing.output_per_1k}/1K`);
    }

    return parts.join(' · ') || '无定价';
  };

  if (isEditing) {
    return (
      <div className="px-6 py-4 bg-blue-50/50">
        <div className="flex items-center justify-between mb-3">
          <span className="font-medium text-gray-900">{item.model}</span>
          <div className="flex gap-2">
            <button
              onClick={() => onSave(editPricing)}
              disabled={saving}
              className="flex items-center gap-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              保存
            </button>
            <button
              onClick={onCancel}
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-medium transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              取消
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Object.entries(editPricing).map(([key, value]) => {
            if (typeof value === 'object') return null;
            return (
              <div key={key}>
                <label className="block text-xs text-gray-500 mb-1">{key}</label>
                <input
                  type="number"
                  step="0.1"
                  value={value as number}
                  onChange={(e) => setEditPricing({ ...editPricing, [key]: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
      <div>
        <div className="font-medium text-gray-900">{item.model}</div>
        <div className="text-sm text-gray-500 mt-0.5">
          {formatPricingDisplay(item.pricing)}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onEdit}
          className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        >
          编辑
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// 积分计算器组件
function CreditsCalculator({
  onClose,
  calculateCredits,
}: {
  onClose: () => void;
  calculateCredits: (service: string, provider: string, model: string, usage: Record<string, unknown>) => Promise<number>;
}) {
  const [service, setService] = useState<ServiceType>('video');
  const [provider, setProvider] = useState('vidu');
  const [model, setModel] = useState('viduq2-pro');
  const [usage, setUsage] = useState<Record<string, number>>({
    durationSeconds: 5,
    resolution: 720,
  });
  const [result, setResult] = useState<number | null>(null);
  const [calculating, setCalculating] = useState(false);

  const handleCalculate = async () => {
    setCalculating(true);
    try {
      const usageData: Record<string, unknown> = {};
      if (service === 'video') {
        usageData.durationSeconds = usage.durationSeconds || 5;
        usageData.resolution = `${usage.resolution || 720}p`;
      } else if (service === 'image') {
        usageData.imageCount = usage.imageCount || 1;
      } else if (service === 'audio') {
        usageData.songCount = usage.songCount || 1;
      } else if (service === 'chat') {
        usageData.inputTokens = usage.inputTokens || 1000;
        usageData.outputTokens = usage.outputTokens || 500;
      }

      const credits = await calculateCredits(service, provider, model, usageData);
      setResult(credits);
    } catch (error) {
      console.error('Failed to calculate:', error);
    } finally {
      setCalculating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100]">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200/50">
          <h3 className="text-lg font-semibold text-gray-900">积分计算器</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {/* 服务类型 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">服务类型</label>
            <div className="grid grid-cols-4 gap-2">
              {(['video', 'image', 'audio', 'chat'] as ServiceType[]).map((s) => {
                const Icon = serviceIcons[s];
                return (
                  <button
                    key={s}
                    onClick={() => setService(s)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                      service === s
                        ? 'border-blue-500 bg-blue-50 text-blue-600'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs">{serviceLabels[s]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 厂商和模型 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">厂商</label>
              <input
                type="text"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                placeholder="vidu"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">模型</label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                placeholder="viduq2-pro"
              />
            </div>
          </div>

          {/* 用量参数 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">用量参数</label>
            <div className="grid grid-cols-2 gap-3">
              {service === 'video' && (
                <>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">时长（秒）</label>
                    <input
                      type="number"
                      value={usage.durationSeconds || 5}
                      onChange={(e) => setUsage({ ...usage, durationSeconds: parseInt(e.target.value) || 5 })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">分辨率</label>
                    <select
                      value={usage.resolution || 720}
                      onChange={(e) => setUsage({ ...usage, resolution: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    >
                      <option value={480}>480p</option>
                      <option value={720}>720p</option>
                      <option value={1080}>1080p</option>
                    </select>
                  </div>
                </>
              )}
              {service === 'image' && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">图片数量</label>
                  <input
                    type="number"
                    value={usage.imageCount || 1}
                    onChange={(e) => setUsage({ ...usage, imageCount: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
              )}
              {service === 'audio' && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">歌曲数量</label>
                  <input
                    type="number"
                    value={usage.songCount || 1}
                    onChange={(e) => setUsage({ ...usage, songCount: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
              )}
              {service === 'chat' && (
                <>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">输入 Tokens</label>
                    <input
                      type="number"
                      value={usage.inputTokens || 1000}
                      onChange={(e) => setUsage({ ...usage, inputTokens: parseInt(e.target.value) || 1000 })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">输出 Tokens</label>
                    <input
                      type="number"
                      value={usage.outputTokens || 500}
                      onChange={(e) => setUsage({ ...usage, outputTokens: parseInt(e.target.value) || 500 })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 计算按钮 */}
          <button
            onClick={handleCalculate}
            disabled={calculating}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-xl font-medium transition-all"
          >
            <Calculator className="w-4 h-4" />
            {calculating ? '计算中...' : '计算积分'}
          </button>

          {/* 结果 */}
          {result !== null && (
            <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
              <div className="text-sm text-green-700 mb-1">计算结果</div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-green-600">{result}</span>
                <span className="text-green-600">积分</span>
                <span className="text-sm text-gray-500">≈ ¥{(result * 0.01).toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
