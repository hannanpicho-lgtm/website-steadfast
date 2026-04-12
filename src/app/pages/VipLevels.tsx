import { ChevronLeft } from 'lucide-react';
import { useBackNavigate } from '../hooks/useBackNavigate';
import { useEffect, useState, lazy, Suspense } from 'react';
const LiveChatBox = lazy(() => import('../components/LiveChatBox').then(m => ({ default: m.LiveChatBox })));
import { BottomNavigation } from '../components/BottomNavigation';
import { Header } from '../components/Header';
import { projectId } from '@utils/supabase/info';
import { fetchPublicVipConfig, type VipConfig } from '../services/vipConfig';
import { fetchJsonWithRetry } from '../services/networkClient';

type VipCard = {
  level: number;
  title: string;
  amount: string;
  normalProfit: string;
  premiumProfit: string;
  maxOrders: string;
  badgeClass: string;
  badgeBorderClass: string;
  textClass: string;
};

const fallbackVipCards: VipCard[] = [
  {
    level: 1,
    title: 'VIP1',
    amount: '100 USD',
    normalProfit: '0.5% profit on normal products',
    premiumProfit: '5.0% profit on premium products',
    maxOrders: 'Maximum 80 product orders per day',
    badgeClass: 'from-[#ffb35a] to-[#ff6a00]',
    badgeBorderClass: 'border-[#ffbf77]',
    textClass: 'text-[#ff7a1a]',
  },
  {
    level: 2,
    title: 'VIP2',
    amount: '500 USD',
    normalProfit: '1.0% profit on normal products',
    premiumProfit: '10% profit on premium products',
    maxOrders: 'Maximum 90 product orders per day',
    badgeClass: 'from-[#a0fff1] to-[#47dccc]',
    badgeBorderClass: 'border-[#66e3d5]',
    textClass: 'text-[#1c9c8f]',
  },
  {
    level: 3,
    title: 'VIP3',
    amount: '1600 USD',
    normalProfit: '1.5% profit on normal products',
    premiumProfit: '15% profit on premium products',
    maxOrders: 'Maximum 100 product orders per day',
    badgeClass: 'from-[#8db7ff] to-[#4f74e8]',
    badgeBorderClass: 'border-[#6e93ff]',
    textClass: 'text-[#3658d6]',
  },
  {
    level: 4,
    title: 'VIP4',
    amount: '5500 USD',
    normalProfit: '2.0% profit on normal products',
    premiumProfit: '20.0% profit on premium products',
    maxOrders: 'Maximum 110 product orders per day',
    badgeClass: 'from-[#b4ffd7] to-[#63e6a5]',
    badgeBorderClass: 'border-[#7ae4b1]',
    textClass: 'text-[#1f9c63]',
  },
  {
    level: 5,
    title: 'VIP5',
    amount: '10000 USD',
    normalProfit: '2.5% profit on normal products',
    premiumProfit: '25.0% profit on premium products',
    maxOrders: 'Maximum 120 product orders per day',
    badgeClass: 'from-[#ffd88d] to-[#ff9f3a]',
    badgeBorderClass: 'border-[#ffbf65]',
    textClass: 'text-[#de7d1f]',
  },
];

const vipPalette = {
  1: { badgeClass: 'from-[#ffb35a] to-[#ff6a00]', badgeBorderClass: 'border-[#ffbf77]', textClass: 'text-[#ff7a1a]' },
  2: { badgeClass: 'from-[#a0fff1] to-[#47dccc]', badgeBorderClass: 'border-[#66e3d5]', textClass: 'text-[#1c9c8f]' },
  3: { badgeClass: 'from-[#8db7ff] to-[#4f74e8]', badgeBorderClass: 'border-[#6e93ff]', textClass: 'text-[#3658d6]' },
  4: { badgeClass: 'from-[#b4ffd7] to-[#63e6a5]', badgeBorderClass: 'border-[#7ae4b1]', textClass: 'text-[#1f9c63]' },
  5: { badgeClass: 'from-[#ffd88d] to-[#ff9f3a]', badgeBorderClass: 'border-[#ffbf65]', textClass: 'text-[#de7d1f]' },
} as const;

function formatRate(rate: number) {
  return `${(rate * 100).toFixed(1)}%`;
}

function mapVipConfigToCards(config: VipConfig[]): VipCard[] {
  return [...config]
    .sort((left, right) => left.level - right.level)
    .map((tier) => {
      const palette = vipPalette[tier.level as keyof typeof vipPalette] ?? vipPalette[5];
      const normalRate = Number.isFinite(Number(tier.commission)) ? Number(tier.commission) : 0;
      const premiumRate = normalRate * 10;
      const dailyTasks = Math.max(0, Number(tier.dailyTasks ?? 0));

      return {
        level: tier.level,
        title: `VIP${tier.level}`,
        amount: `${Number(tier.investment).toFixed(0)} USD`,
        normalProfit: `${formatRate(normalRate)} profit on normal products`,
        premiumProfit: `${formatRate(premiumRate)} profit on premium products`,
        maxOrders: `Maximum ${dailyTasks * 2} product orders per day`,
        ...palette,
      };
    });
}

export default function VipLevels() {
  const goBack = useBackNavigate();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [currentVipLevel, setCurrentVipLevel] = useState<number | null>(null);
  const [vipCards, setVipCards] = useState<VipCard[]>(fallbackVipCards);
  const [loading, setLoading] = useState(true);
  const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a1c55d7e`;

  useEffect(() => {
    const loadCurrentVip = async () => {
      try {
        const [financialsPayload, publicVipConfig] = await Promise.all([
          fetchJsonWithRetry<{ vipLevel?: unknown }>({ url: `${serverUrl}/me/financials` }),
          fetchPublicVipConfig(),
        ]);

        if (Number.isFinite(Number(financialsPayload?.vipLevel))) {
          setCurrentVipLevel(Number(financialsPayload.vipLevel));
        }

        if (Array.isArray(publicVipConfig) && publicVipConfig.length > 0) {
          setVipCards(mapVipConfigToCards(publicVipConfig));
        }
      } catch {
        // Keep fallback current badge on VIP1 when session financials are unavailable.
        setVipCards(fallbackVipCards);
      } finally {
        setLoading(false);
      }
    };

    void loadCurrentVip();
  }, [serverUrl]);

  return (
    <div className="size-full overflow-auto pb-20 bg-[#0a0a0a]" style={{ background: '#0a0a0a' }}>
      {/* Header */}
      <Header onContactClick={() => setIsChatOpen(true)} />

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-2 sm:px-3 py-4 sm:py-6 overflow-x-hidden">
        {/* Back Button and Title */}
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 mb-4 sm:mb-6">
          <button onClick={goBack} aria-label="Go back" className="btn-nav-back justify-self-start">
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-lg sm:text-2xl font-bold text-[#0066b3] text-center">VIP Levels</h1>
          <div className="w-9" aria-hidden="true"></div>
        </div>

        {/* VIP Level Cards */}
        <div className="space-y-3.5 sm:space-y-5">
          {loading ? (
            /* Content-shaped skeleton — mirrors the real VIP card layout */
            Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="bg-[#141414] rounded-lg px-2.5 py-3 sm:px-5 sm:py-5 border border-white/[0.06] animate-pulse" style={{ background: '#141414' }}>
                <div className="flex items-start justify-between gap-2 mb-2.5 sm:mb-4">
                  <div className="flex items-start gap-2.5 sm:gap-4">
                    <div className="w-[48px] h-[42px] sm:w-[62px] sm:h-[56px] bg-white/[0.08] rounded" />
                    <div>
                      <div className="h-5 sm:h-7 w-16 sm:w-20 bg-white/[0.08] rounded mb-2" />
                      <div className="h-5 sm:h-7 w-24 sm:w-32 bg-white/[0.08] rounded" />
                    </div>
                  </div>
                  {i === 0 && <div className="h-6 w-16 bg-white/[0.06] rounded" />}
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <div className="h-4 w-3/4 bg-white/[0.06] rounded" />
                  <div className="h-4 w-2/3 bg-white/[0.06] rounded" />
                  <div className="h-4 w-4/5 bg-white/[0.06] rounded" />
                </div>
              </div>
            ))
          ) : (
          vipCards.map((vip, idx) => {
            const isCurrent = currentVipLevel ? currentVipLevel === vip.level : vip.level === 1;
            return (
            <div 
              key={vip.level}
              className={`sf-morph-${Math.min(idx + 1, 5)} bg-[#141414] rounded-lg px-2.5 py-3 sm:px-5 sm:py-5 border border-white/[0.06]`}
            >
              <div className="flex items-start justify-between gap-2 mb-2.5 sm:mb-4">
                <div className="flex items-start gap-2.5 sm:gap-4 min-w-0">
                  {/* VIP Badge */}
                  <div className="pt-0.5 sm:pt-1">
                    <div
                      className={`w-[48px] h-[42px] sm:w-[62px] sm:h-[56px] bg-gradient-to-br ${vip.badgeClass} ${vip.badgeBorderClass} border-2 flex items-center justify-center shadow-sm`}
                      style={{ clipPath: 'polygon(22% 0%, 100% 0%, 78% 100%, 0% 100%)' }}
                    >
                      <span className={`font-bold text-sm sm:text-lg ${vip.textClass}`}>{vip.title}</span>
                    </div>
                  </div>
                  
                  {/* VIP Info */}
                  <div className="min-w-0">
                    <h3 className="text-lg sm:text-[2rem] leading-none font-bold text-white mb-1 sm:mb-2">{vip.title}</h3>
                    <p className="text-lg sm:text-[2rem] leading-none font-bold text-[#7ec8e3] break-words">{vip.amount}</p>
                  </div>
                </div>

                {/* Current Badge */}
                {isCurrent && (
                  <span className="border border-[#0a7a93] text-[#7ec8e3] px-2 sm:px-3 py-1 rounded-sm text-[11px] sm:text-sm font-medium bg-[#0d1f33] whitespace-nowrap">
                    Current
                  </span>
                )}
              </div>

              {/* Benefits */}
              <div className="space-y-1.5 sm:space-y-2 text-sm sm:text-[1.6rem] leading-snug">
                <p className="text-gray-300">· {vip.normalProfit}</p>
                <p className="text-gray-300">· {vip.premiumProfit}</p>
                <p className="text-gray-300">· {vip.maxOrders}</p>
              </div>
            </div>
            );
          })
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 mt-8">
          <p>© 2026 Steadfast Digital, Inc. All rights reserved</p>
        </div>
      </div>

      {/* Live Chat Box */}
      <Suspense fallback={null}>
        <LiveChatBox isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      </Suspense>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}