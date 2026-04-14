import React from 'react';
import { Shield, DollarSign, Target, Percent, TrendingUp, Edit, Check, X, Package } from 'lucide-react';

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

const tierColorMap: Record<string, string> = {
  bronze: 'text-orange-300',
  silver: 'text-gray-300',
  gold: 'text-yellow-300',
  platinum: 'text-cyan-200',
  diamond: 'text-purple-200',
};

const tierLabelMap: Record<string, string> = {
  bronze: 'Normal',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
  diamond: 'Diamond',
};

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
          <h2 className="text-2xl font-bold text-white">VIP Tiers Configuration</h2>
          <p className="text-gray-400 text-sm mt-1">Commission rates and task product amount ranges per VIP tier.</p>
        </div>
        {vipConfigLoading ? (
          <div className="text-sm text-[#00D9FF]">Loading VIP tiers...</div>
        ) : null}
      </div>

      {/* Summary Card */}
      <div className="bg-[#1a1f2e] rounded-lg p-5 border border-gray-700">
        <div className="space-y-2">
          {vipConfigurations.map((vip) => {
            const label = tierLabelMap[vip.color] ?? vip.name;
            const colorClass = tierColorMap[vip.color] ?? 'text-white';
            const commVal = Number(vip.commission) || 0;
            const commPct = (commVal * 100).toFixed(commVal * 100 >= 1 ? 1 : 2);
            const priceMin = Number(vip.taskPriceMin ?? 0);
            const priceMax = Number(vip.taskPriceMax ?? 0);
            const hasControlledRange = priceMin > 0 && priceMax > 0 && priceMax >= priceMin;
            const cycleMinCommission = hasControlledRange
              ? priceMin * commVal * (Number(vip.dailyTasks) || 0)
              : 0;
            const cycleMaxCommission = hasControlledRange
              ? priceMax * commVal * (Number(vip.dailyTasks) || 0)
              : (Number(vip.dailyTasks) || 0) * 100 * commVal;
            const rangeStr = priceMin > 0 && priceMax > 0
              ? `$${priceMin.toLocaleString()} – $${priceMax.toLocaleString()}`
              : 'Not set';
            return (
              <p key={vip.level} className="text-sm">
                <span className={`font-semibold ${colorClass}`}>{label}:</span>{' '}
                <span className="text-gray-300">
                  {commPct}% commission, {vip.dailyTasks} products/set, task range {rangeStr}, daily commission target (all sets) ${cycleMinCommission.toFixed(2)} - ${cycleMaxCommission.toFixed(2)}
                </span>
              </p>
            );
          })}
        </div>
      </div>

      {/* VIP Levels Grid */}
      <div className="grid grid-cols-1 gap-4">
        {vipConfigurations.map((vip) => {
          const isEditingCurrentVip = editingVipLevel === vip.level && Boolean(vipDraft);
          const effectiveDailyTasks = Number(isEditingCurrentVip ? vipDraft?.dailyTasks : vip.dailyTasks);
          const effectiveCommission = Number(isEditingCurrentVip ? vipDraft?.commissionPercent : vip.commission * 100) / 100;
          const priceMin = Number(isEditingCurrentVip ? vipDraft?.taskPriceMin : vip.taskPriceMin ?? 0);
          const priceMax = Number(isEditingCurrentVip ? vipDraft?.taskPriceMax : vip.taskPriceMax ?? 0);
          const earningsDenominator = effectiveDailyTasks > 0 && effectiveCommission > 0
            ? effectiveDailyTasks * effectiveCommission
            : 0;
          const hasControlledRange = priceMin > 0 && priceMax > 0 && priceMax >= priceMin;
          const minDailyEarnings = hasControlledRange
            ? priceMin * effectiveCommission * effectiveDailyTasks
            : 0;
          const maxDailyEarnings = hasControlledRange
            ? priceMax * effectiveCommission * effectiveDailyTasks
            : effectiveDailyTasks * 100 * effectiveCommission;

          return (
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
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
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
                        onChange={(e) => setVipDraft((prev: any) => (prev ? { ...prev, investment: e.target.value } : prev))}
                        disabled={savingVipLevel === vip.level}
                        className="w-full bg-[#11182a] border border-gray-600 rounded px-3 py-2 text-white font-bold text-lg focus:border-[#00D9FF] focus:outline-none"
                      />
                    ) : (
                      <p className="text-white font-bold text-xl">${(Number(vip.investment) || 0).toLocaleString()}</p>
                    )}
                  </div>
                  <div className="bg-[#1a1f2e] p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Target size={16} className="text-gray-400" />
                      <p className="text-gray-400 text-xs">Products / Set</p>
                    </div>
                    {editingVipLevel === vip.level && vipDraft ? (
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={vipDraft.dailyTasks}
                        onChange={(e) => setVipDraft((prev: any) => (prev ? { ...prev, dailyTasks: e.target.value } : prev))}
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
                          onChange={(e) => setVipDraft((prev: any) => (prev ? { ...prev, commissionPercent: e.target.value } : prev))}
                          disabled={savingVipLevel === vip.level}
                          className="w-full bg-[#11182a] border border-gray-600 rounded px-3 py-2 text-green-400 font-bold text-lg focus:border-[#00D9FF] focus:outline-none"
                        />
                        <span className="text-green-400 font-bold">%</span>
                      </div>
                    ) : (
                      <p className="text-green-400 font-bold text-xl">{((Number(vip.commission) || 0) * 100).toFixed(1)}%</p>
                    )}
                  </div>
                  <div className="bg-[#1a1f2e] p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Package size={16} className="text-gray-400" />
                      <p className="text-gray-400 text-xs">Task Price Range</p>
                    </div>
                    {editingVipLevel === vip.level && vipDraft ? (
                      <div className="flex items-center gap-1">
                        <span className="text-gray-400 text-sm">$</span>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={vipDraft.taskPriceMin}
                          onChange={(e) => setVipDraft((prev: any) => (prev ? { ...prev, taskPriceMin: e.target.value } : prev))}
                          disabled={savingVipLevel === vip.level}
                          placeholder="Min"
                          className="w-full bg-[#11182a] border border-gray-600 rounded px-2 py-2 text-amber-300 font-bold text-sm focus:border-[#00D9FF] focus:outline-none"
                        />
                        <span className="text-gray-500">–</span>
                        <span className="text-gray-400 text-sm">$</span>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={vipDraft.taskPriceMax}
                          onChange={(e) => setVipDraft((prev: any) => (prev ? { ...prev, taskPriceMax: e.target.value } : prev))}
                          disabled={savingVipLevel === vip.level}
                          placeholder="Max"
                          className="w-full bg-[#11182a] border border-gray-600 rounded px-2 py-2 text-amber-300 font-bold text-sm focus:border-[#00D9FF] focus:outline-none"
                        />
                      </div>
                    ) : (
                      <p className="text-amber-300 font-bold text-lg">
                        {Number(vip.taskPriceMin ?? 0) > 0 && Number(vip.taskPriceMax ?? 0) > 0
                          ? `$${Number(vip.taskPriceMin).toLocaleString()} – $${Number(vip.taskPriceMax).toLocaleString()}`
                          : 'Not set'}
                      </p>
                    )}
                  </div>
                  <div className="bg-[#1a1f2e] p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp size={16} className="text-gray-400" />
                      <p className="text-gray-400 text-xs">Max Daily Earnings</p>
                    </div>
                    {editingVipLevel === vip.level && vipDraft ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400 text-sm">$</span>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={minDailyEarnings > 0 ? minDailyEarnings.toFixed(2) : ''}
                            onChange={(e) => {
                              const rawValue = e.target.value;
                              if (!rawValue.trim()) {
                                setVipDraft((prev: any) => (prev ? { ...prev, taskPriceMin: '' } : prev));
                                return;
                              }

                              const earnings = Number(rawValue);
                              const derivedTaskPriceMin = earningsDenominator > 0 && Number.isFinite(earnings)
                                ? (earnings / earningsDenominator).toFixed(2)
                                : '0';

                              setVipDraft((prev: any) => (prev ? { ...prev, taskPriceMin: derivedTaskPriceMin } : prev));
                            }}
                            disabled={savingVipLevel === vip.level}
                            placeholder="Min"
                            className="w-full bg-[#11182a] border border-gray-600 rounded px-2 py-2 text-purple-300 font-bold text-sm focus:border-[#00D9FF] focus:outline-none"
                          />
                          <span className="text-gray-500">-</span>
                          <span className="text-gray-400 text-sm">$</span>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={maxDailyEarnings > 0 ? maxDailyEarnings.toFixed(2) : ''}
                            onChange={(e) => {
                              const rawValue = e.target.value;
                              if (!rawValue.trim()) {
                                setVipDraft((prev: any) => (prev ? { ...prev, taskPriceMax: '' } : prev));
                                return;
                              }

                              const earnings = Number(rawValue);
                              const derivedTaskPriceMax = earningsDenominator > 0 && Number.isFinite(earnings)
                                ? (earnings / earningsDenominator).toFixed(2)
                                : '0';

                              setVipDraft((prev: any) => (prev ? { ...prev, taskPriceMax: derivedTaskPriceMax } : prev));
                            }}
                            disabled={savingVipLevel === vip.level}
                            placeholder="Max"
                            className="w-full bg-[#11182a] border border-gray-600 rounded px-2 py-2 text-purple-300 font-bold text-sm focus:border-[#00D9FF] focus:outline-none"
                          />
                        </div>
                        <p className="text-[11px] text-purple-200/80">
                          Editing earnings auto-calculates task range from commission and products/set
                        </p>
                      </div>
                    ) : hasControlledRange ? (
                      <>
                        <p className="text-purple-300 font-bold text-xl">
                          ${minDailyEarnings.toFixed(2)} - ${maxDailyEarnings.toFixed(2)}
                        </p>
                        <p className="text-[11px] text-purple-200/80 mt-1">
                          Daily commission target (all sets)
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-purple-300 font-bold text-xl">${maxDailyEarnings.toFixed(2)}</p>
                        <p className="text-[11px] text-purple-200/80 mt-1">
                          Set task range to enable controlled cycle window
                        </p>
                      </>
                    )}
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
          );
        })}
      </div>
    </div>
  );
}
