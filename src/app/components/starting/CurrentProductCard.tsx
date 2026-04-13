interface DisplayProduct {
  image?: string;
  product?: string;
  rating?: number;
  price?: number;
}

interface CurrentProductCardProps {
  displayProduct: DisplayProduct | null;
  isPremiumTaskActive: boolean;
  vipLevel: number;
  displayCommissionRate: number;
  displayEstimatedCommission: number;
  commissionRate: number;
  premiumCommissionRate: number;
  tasksCompletedInSet: number;
  tasksPerSet: number;
  completedTaskSets: number;
  taskSetCount: number;
  vipPriceMin?: number;
  vipPriceMax?: number;
}

export default function CurrentProductCard({
  displayProduct,
  isPremiumTaskActive,
  vipLevel,
  displayCommissionRate,
  displayEstimatedCommission,
  commissionRate,
  premiumCommissionRate,
  tasksCompletedInSet,
  tasksPerSet,
  completedTaskSets,
  taskSetCount,
  vipPriceMin,
  vipPriceMax,
}: CurrentProductCardProps) {
  return (
    <div className="bg-gradient-to-br from-[#252d42] to-[#1a1f2e] border border-[#00D9FF]/30 rounded-xl mb-6 shadow-xl overflow-hidden">
      {/* Product image + name (premium) OR VIP tier summary (regular) */}
      {isPremiumTaskActive ? (
        <div className="flex items-center gap-4 p-4 bg-white/5">
          <div className="shrink-0 bg-white rounded-xl p-2.5 w-24 h-24 flex items-center justify-center">
            <img
              src={displayProduct?.image}
              alt={displayProduct?.product || 'Task'}
              loading="lazy"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[#00D9FF] text-xs font-semibold uppercase tracking-wide mb-0.5">Premium Product</p>
            <h4 className="text-white font-bold text-sm leading-snug line-clamp-2">
              {displayProduct?.product || 'No active task'}
            </h4>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-yellow-400 text-xs">★</span>
              <span className="text-gray-300 text-xs font-medium">{displayProduct?.rating ?? '-'}</span>
              <span className="text-gray-500 text-xs mx-1">·</span>
              <span className="text-gray-400 text-xs">VIP{vipLevel || 1}</span>
              <span className="text-gray-500 text-xs mx-1">·</span>
              <span className="text-gray-300 text-xs">${displayProduct?.price?.toFixed(2) ?? '0.00'}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-4 p-4 bg-white/5">
          <div className="shrink-0 bg-gradient-to-br from-[#00D9FF]/20 to-[#0099cc]/20 border border-[#00D9FF]/30 rounded-xl w-24 h-24 flex items-center justify-center">
            <div className="text-center">
              <p className="text-[#00D9FF] text-2xl font-extrabold">VIP{vipLevel || 1}</p>
              <p className="text-gray-400 text-[10px] mt-0.5">TIER</p>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[#00D9FF] text-xs font-semibold uppercase tracking-wide mb-0.5">Queued Submission</p>
            <h4 className="text-white font-bold text-sm leading-snug">
              Product assigned on submit
            </h4>
            {(vipPriceMin != null && vipPriceMax != null && vipPriceMin > 0) ? (
              <p className="text-gray-400 text-xs mt-1">
                Range: ${vipPriceMin.toFixed(2)} – ${vipPriceMax.toFixed(2)}
              </p>
            ) : null}
          </div>
        </div>
      )}

      {/* Commission row */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-green-600/80 to-emerald-600/80">
        <div>
          <p className="text-green-100 text-xs">Commission Rate</p>
          <p className="text-white font-bold text-base">{displayCommissionRate}%</p>
        </div>
        <div className="text-right">
          <p className="text-green-100 text-xs">Estimated Profit</p>
          <p className="text-white font-extrabold text-xl">${displayEstimatedCommission.toFixed(2)}</p>
        </div>
      </div>
      <div className="px-4 py-2 bg-emerald-900/35 border-t border-emerald-300/20">
        <p className="text-emerald-100 text-[11px] leading-relaxed">
          {isPremiumTaskActive
            ? `Premium formula: Bundle Value x ${premiumCommissionRate.toFixed(2)}%.`
            : `Regular formula: Product Price x ${commissionRate.toFixed(2)}%.`}
        </p>
      </div>

      {/* Progress + premium hint row */}
      <div className="px-4 py-2.5 flex items-center justify-between gap-3">
        <p className="text-gray-400 text-xs">
          Set <span className="text-white font-semibold">{tasksCompletedInSet ?? 0}/{tasksPerSet ?? 0}</span>
          <span className="mx-1.5 text-gray-600">·</span>
          Completed <span className="text-white font-semibold">{completedTaskSets ?? 0}/{taskSetCount ?? 0}</span>
        </p>
      </div>
    </div>
  );
}
