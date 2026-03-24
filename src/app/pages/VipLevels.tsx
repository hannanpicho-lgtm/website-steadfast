import { ChevronLeft } from 'lucide-react';
import { Link } from 'react-router';
import { useEffect, useState } from 'react';
import { LiveChatBox } from '../components/LiveChatBox';
import { BottomNavigation } from '../components/BottomNavigation';
import { Header } from '../components/Header';
import { projectId, publicAnonKey } from '@utils/supabase/info';
import { fetchPublicVipConfig, type VipConfig } from '../services/vipConfig';

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
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [currentVipLevel, setCurrentVipLevel] = useState<number | null>(null);
  const [vipCards, setVipCards] = useState<VipCard[]>(fallbackVipCards);
  const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a1c55d7e`;

  useEffect(() => {
    const loadCurrentVip = async () => {
      try {
        const [financialsResponse, publicVipConfig] = await Promise.all([
          fetch(`${serverUrl}/me/financials`, {
            credentials: 'include',
            headers: {
              Authorization: `Bearer ${publicAnonKey}`,
            },
          }),
          fetchPublicVipConfig(),
        ]);

        const payload = await financialsResponse.json().catch(() => ({}));
        if (financialsResponse.ok && Number.isFinite(Number(payload?.vipLevel))) {
          setCurrentVipLevel(Number(payload.vipLevel));
        }

        if (Array.isArray(publicVipConfig) && publicVipConfig.length > 0) {
          setVipCards(mapVipConfigToCards(publicVipConfig));
        }
      } catch {
        // Keep fallback current badge on VIP1 when session financials are unavailable.
        setVipCards(fallbackVipCards);
      }
    };

    void loadCurrentVip();
  }, [serverUrl]);

  return (
    <div className="size-full overflow-auto pb-20 bg-gray-50">
      {/* Header */}
      <Header onContactClick={() => setIsChatOpen(true)} />

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-2 sm:px-3 py-4 sm:py-6 overflow-x-hidden">
        {/* Back Button and Title */}
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 mb-4 sm:mb-6">
          <Link to="/home" className="bg-[#0066b3] text-white p-2 rounded hover:bg-[#0052a3] transition-colors justify-self-start">
            <ChevronLeft size={20} />
          </Link>
          <h1 className="text-lg sm:text-2xl font-bold text-[#0066b3] text-center">Vip Levels</h1>
          <div className="w-9" aria-hidden="true"></div>
        </div>

        {/* VIP Level Cards */}
        <div className="space-y-3.5 sm:space-y-5">
          {vipCards.map((vip) => {
            const isCurrent = currentVipLevel ? currentVipLevel === vip.level : vip.level === 1;
            return (
            <div 
              key={vip.level}
              className="bg-[#f4f4f4] rounded-none px-2.5 py-3 sm:px-5 sm:py-5 border border-[#8f8f8f]"
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
                    <h3 className="text-[1.05rem] sm:text-[2rem] leading-none font-bold mb-1 sm:mb-2">{vip.title}</h3>
                    <p className="text-[1.05rem] sm:text-[2rem] leading-none font-bold text-[#0a5e89] break-words">{vip.amount}</p>
                  </div>
                </div>

                {/* Current Badge */}
                {isCurrent && (
                  <span className="border border-[#0a7a93] text-[#0a5e74] px-2 sm:px-3 py-1 rounded-sm text-[11px] sm:text-sm font-medium bg-[#f4f4f4] whitespace-nowrap">
                    Current
                  </span>
                )}
              </div>

              {/* Benefits */}
              <div className="space-y-1.5 sm:space-y-2 text-[0.86rem] sm:text-[1.6rem] leading-snug">
                <p className="text-[#141414]">· {vip.normalProfit}</p>
                <p className="text-[#141414]">· {vip.premiumProfit}</p>
                <p className="text-[#141414]">· {vip.maxOrders}</p>
              </div>
            </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 mt-8">
          <p>© 2026 Steadfast Digital, Inc. All rights reserved</p>
        </div>
      </div>

      {/* Live Chat Box */}
      <LiveChatBox isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}