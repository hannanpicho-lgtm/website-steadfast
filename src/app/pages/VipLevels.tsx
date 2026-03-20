import { Crown, UserCircle, ChevronLeft } from 'lucide-react';
import { Link } from 'react-router';
import { useEffect, useState } from 'react';
import { LiveChatBox } from '../components/LiveChatBox';
import { BottomNavigation } from '../components/BottomNavigation';
import { Header } from '../components/Header';
import { fetchPublicVipConfig, type VipConfig } from '../services/vipConfig';
import { getCurrentUsername } from '../services/referralSystem';
import { projectId, publicAnonKey } from '@utils/supabase/info';

function getVipGradient(color: string) {
  switch (color) {
    case 'silver':
      return 'from-slate-300 to-slate-500';
    case 'gold':
      return 'from-amber-300 to-yellow-500';
    case 'platinum':
      return 'from-cyan-300 to-sky-500';
    case 'diamond':
      return 'from-fuchsia-400 to-indigo-500';
    case 'bronze':
    default:
      return 'from-orange-400 to-amber-700';
  }
}

export default function VipLevels() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [vipLevels, setVipLevels] = useState<VipConfig[]>([]);
  const [currentVipLevel, setCurrentVipLevel] = useState<number | null>(null);
  const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a1c55d7e`;

  useEffect(() => {
    const loadVipData = async () => {
      try {
        const [tiers, username] = await Promise.all([
          fetchPublicVipConfig(),
          Promise.resolve(getCurrentUsername()),
        ]);
        setVipLevels(tiers);

        if (!username) {
          return;
        }

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
      } catch (error) {
        console.error('Error loading VIP levels:', error);
      }
    };

    void loadVipData();
  }, [serverUrl]);

  return (
    <div className="size-full overflow-auto pb-20 bg-gray-50">
      {/* Header */}
      <Header onContactClick={() => setIsChatOpen(true)} />

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-6 py-6">
        {/* Back Button and Title */}
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 mb-6">
          <Link to="/starting" className="bg-[#0066b3] text-white p-2 rounded hover:bg-[#0052a3] transition-colors justify-self-start">
            <ChevronLeft size={20} />
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0066b3] text-center">Vip Levels</h1>
          <div className="w-9" aria-hidden="true"></div>
        </div>

        {/* VIP Level Cards */}
        <div className="space-y-4">
          {vipLevels.length === 0 ? (
            <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm text-center text-gray-500">
              VIP levels are loading.
            </div>
          ) : null}
          {vipLevels.map((vip) => (
            <div 
              key={vip.level}
              className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                <div className="flex items-center gap-4 min-w-0">
                  {/* VIP Badge */}
                  <div className={`bg-gradient-to-br ${getVipGradient(vip.color)} text-white w-16 h-16 rounded-lg flex items-center justify-center transform -rotate-3 shadow-md`}>
                    <span className="font-bold text-lg">{vip.level}</span>
                  </div>
                  
                  {/* VIP Info */}
                  <div>
                    <h3 className="text-xl font-bold mb-1">{vip.name}</h3>
                    <p className="text-lg font-semibold text-[#0066b3]">${vip.investment.toLocaleString()} USD</p>
                  </div>
                </div>

                {/* Current Badge */}
                {currentVipLevel === vip.level && (
                  <span className="bg-[#0066b3] text-white px-3 py-1 rounded text-sm font-semibold">
                    Current
                  </span>
                )}
              </div>

              {/* Benefits */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-700">•</span>
                  <span className="text-[#0066b3] font-semibold">{(vip.commission * 100).toFixed(2)}%</span>
                  <span className="text-gray-700">commission on all products</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-700">•</span>
                  <span className="text-gray-700">Maximum <span className="text-[#0066b3] font-semibold">{vip.dailyTasks}</span> product orders per day</span>
                </div>
              </div>
            </div>
          ))}
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