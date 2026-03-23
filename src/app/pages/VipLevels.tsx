import { ChevronLeft } from 'lucide-react';
import { Link } from 'react-router';
import { useEffect, useState } from 'react';
import { LiveChatBox } from '../components/LiveChatBox';
import { BottomNavigation } from '../components/BottomNavigation';
import { Header } from '../components/Header';
import { projectId, publicAnonKey } from '@utils/supabase/info';

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

const vipCards: VipCard[] = [
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
];

export default function VipLevels() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [currentVipLevel, setCurrentVipLevel] = useState<number | null>(null);
  const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a1c55d7e`;

  useEffect(() => {
    const loadCurrentVip = async () => {
      try {
        const response = await fetch(`${serverUrl}/me/financials`, {
          credentials: 'include',
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        });
        const payload = await response.json().catch(() => ({}));
        if (response.ok && Number.isFinite(Number(payload?.vipLevel))) {
          setCurrentVipLevel(Number(payload.vipLevel));
        }
      } catch {
        // Keep fallback current badge on VIP1 when session financials are unavailable.
      }
    };

    void loadCurrentVip();
  }, [serverUrl]);

  return (
    <div className="size-full overflow-auto pb-20 bg-gray-50">
      {/* Header */}
      <Header onContactClick={() => setIsChatOpen(true)} />

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-1.5 sm:px-3 py-4 sm:py-6">
        {/* Back Button and Title */}
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 mb-4 sm:mb-6">
          <Link to="/home" className="bg-[#0066b3] text-white p-2 rounded hover:bg-[#0052a3] transition-colors justify-self-start">
            <ChevronLeft size={20} />
          </Link>
          <h1 className="text-lg sm:text-2xl font-bold text-[#0066b3] text-center">Vip Levels</h1>
          <div className="w-9" aria-hidden="true"></div>
        </div>

        {/* VIP Level Cards */}
        <div className="space-y-5">
          {vipCards.map((vip) => {
            const isCurrent = currentVipLevel ? currentVipLevel === vip.level : vip.level === 1;
            return (
            <div 
              key={vip.level}
              className="bg-[#f4f4f4] rounded-none px-3 py-4 sm:px-5 sm:py-5 border border-[#8f8f8f]"
            >
              <div className="flex items-start justify-between gap-2 mb-3 sm:mb-4">
                <div className="flex items-start gap-4 min-w-0">
                  {/* VIP Badge */}
                  <div className="pt-1">
                    <div
                      className={`w-[62px] h-[56px] bg-gradient-to-br ${vip.badgeClass} ${vip.badgeBorderClass} border-2 flex items-center justify-center shadow-sm`}
                      style={{ clipPath: 'polygon(22% 0%, 100% 0%, 78% 100%, 0% 100%)' }}
                    >
                      <span className={`font-bold text-lg ${vip.textClass}`}>{vip.title}</span>
                    </div>
                  </div>
                  
                  {/* VIP Info */}
                  <div>
                    <h3 className="text-[2rem] leading-none font-bold mb-2">{vip.title}</h3>
                    <p className="text-[2rem] leading-none font-bold text-[#0a5e89]">{vip.amount}</p>
                  </div>
                </div>

                {/* Current Badge */}
                {isCurrent && (
                  <span className="border border-[#0a7a93] text-[#0a5e74] px-3 py-1 rounded-sm text-sm font-medium bg-[#f4f4f4]">
                    Current
                  </span>
                )}
              </div>

              {/* Benefits */}
              <div className="space-y-1.5 sm:space-y-2 text-[1.6rem] leading-tight">
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