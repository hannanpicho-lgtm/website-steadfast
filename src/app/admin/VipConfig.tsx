import React from 'react';
import { Shield, DollarSign, Target, Percent, TrendingUp, Edit, Check, X } from 'lucide-react';

interface VipConfigProps {
  vipConfigurations: any[];
  vipConfigLoading: boolean;
  editingVipLevel: number | null;
  vipDraft: any;
  savingVipLevel: number | null;
  setVipDraft: (draft: any) => void;
  handleStartVipInlineEdit: (vip: any) => void;
  handleCancelVipInlineEdit: () => void;
  handleSaveVipInlineEdit: (level: number) => void;
}

export default function VipConfig({
  vipConfigurations,
  vipConfigLoading,
  editingVipLevel,
  vipDraft,
  savingVipLevel,
  setVipDraft,
  handleStartVipInlineEdit,
  handleCancelVipInlineEdit,
  handleSaveVipInlineEdit,
}: VipConfigProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">VIP Level Configuration</h2>
          <p className="text-gray-400 text-sm mt-1">Configure VIP tiers, benefits, and commission rates</p>
        </div>
        {vipConfigLoading ? (
          <div className="text-sm text-[#00D9FF]">Loading VIP tiers...</div>
        ) : null}
      </div>

      {/* VIP Levels Grid */}
      <div className="grid grid-cols-1 gap-4">
        {vipConfigurations.map((vip) => (
          <div key={vip.level} className="bg-[#252b3d] rounded-lg p-6 border-l-4 border-purple-500">
            {editingVipLevel === vip.level && vipDraft ? (
              <div className="mb-4 rounded-lg border border-[#00D9FF]/30 bg-[#1a1f2e] p-3">
                <p className="text-xs text-[#00D9FF] font-semibold">Live edit mode</p>
              </div>
            ) : null}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <Shield className="text-purple-400" size={24} />
                  <h3 className="text-xl font-bold text-white">{vip.name}</h3>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300">
                    Level {vip.level}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-[#1a1f2e] p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign size={16} className="text-gray-400" />
                      <p className="text-gray-400 text-xs">Investment Required</p>
                    </div>
                    {editingVipLevel === vip.level && vipDraft ? (
                      <input
                        type="number"
                        min={1}
                        value={vipDraft.investment}
                        onChange={(e) => setVipDraft((prev) => (prev ? { ...prev, investment: e.target.value } : prev))}
                        disabled={savingVipLevel === vip.level}
                        className="w-full bg-[#11182a] border border-gray-600 rounded px-3 py-2 text-white font-bold text-lg focus:border-[#00D9FF] focus:outline-none"
                      />
                    ) : (
                      <p className="text-white font-bold text-xl">${vip.investment.toLocaleString()}</p>
                    )}
                  </div>
                  <div className="bg-[#1a1f2e] p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Target size={16} className="text-gray-400" />
                      <p className="text-gray-400 text-xs">Daily Tasks</p>
                    </div>
                    {editingVipLevel === vip.level && vipDraft ? (
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={vipDraft.dailyTasks}
                        onChange={(e) => setVipDraft((prev) => (prev ? { ...prev, dailyTasks: e.target.value } : prev))}
                        disabled={savingVipLevel === vip.level}
                        className="w-full bg-[#11182a] border border-gray-600 rounded px-3 py-2 text-[#00D9FF] font-bold text-lg focus:border-[#00D9FF] focus:outline-none"
                      />
                    ) : (
                      <p className="text-[#00D9FF] font-bold text-xl">{vip.dailyTasks}</p>
                    )}
                  </div>
                  <div className="bg-[#1a1f2e] p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Percent size={16} className="text-gray-400" />
                      <p className="text-gray-400 text-xs">Commission Rate</p>
                    </div>
                    {editingVipLevel === vip.level && vipDraft ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0.01}
                          step={0.01}
                          value={vipDraft.commissionPercent}
                          onChange={(e) => setVipDraft((prev) => (prev ? { ...prev, commissionPercent: e.target.value } : prev))}
                          disabled={savingVipLevel === vip.level}
                          className="w-full bg-[#11182a] border border-gray-600 rounded px-3 py-2 text-green-400 font-bold text-lg focus:border-[#00D9FF] focus:outline-none"
                        />
                        <span className="text-green-400 font-bold">%</span>
                      </div>
                    ) : (
                      <p className="text-green-400 font-bold text-xl">{(vip.commission * 100).toFixed(1)}%</p>
                    )}
                  </div>
                  <div className="bg-[#1a1f2e] p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp size={16} className="text-gray-400" />
                      <p className="text-gray-400 text-xs">Max Daily Earnings</p>
                    </div>
                    <p className="text-purple-300 font-bold text-xl">${(vip.dailyTasks * 100 * vip.commission).toFixed(2)}</p>
                  </div>
                </div>
              </div>
              <div className="ml-4 flex flex-col gap-2">
                {editingVipLevel === vip.level ? (
                  <>
                    <button
                      onClick={() => void handleSaveVipInlineEdit(vip.level)}
                      disabled={savingVipLevel === vip.level}
                      className="p-2 bg-green-500/20 hover:bg-green-500/30 rounded-lg transition-colors"
                      title="Save"
                    >
                      <Check size={18} className="text-green-400" />
                    </button>
                    <button
                      onClick={handleCancelVipInlineEdit}
                      disabled={savingVipLevel === vip.level}
                      className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors"
                      title="Cancel"
                    >
                      <X size={18} className="text-red-400" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleStartVipInlineEdit(vip)}
                    className="p-2 bg-[#1a1f2e] hover:bg-blue-500/20 rounded-lg transition-colors"
                    title="Edit VIP level"
                  >
                    <Edit size={18} className="text-blue-400" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
