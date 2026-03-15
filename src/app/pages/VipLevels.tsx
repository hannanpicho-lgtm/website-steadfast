import { Crown, UserCircle, ChevronLeft } from 'lucide-react';
import { Link } from 'react-router';
import { useState } from 'react';
import { LiveChatBox } from '../components/LiveChatBox';
import { BottomNavigation } from '../components/BottomNavigation';
import { Header } from '../components/Header';

interface VipLevel {
  level: number;
  commission: string;
  deposit: string;
  tasks: number;
  color: string;
}

export default function VipLevels() {
  const [isChatOpen, setIsChatOpen] = useState(false);

  const vipLevels: VipLevel[] = [
    {
      level: 1,
      commission: '0.5%',
      deposit: '100 USD',
      tasks: 40,
      color: 'from-gray-400 to-gray-600',
    },
    {
      level: 2,
      commission: '0.6%',
      deposit: '1,000 USD',
      tasks: 45,
      color: 'from-blue-400 to-blue-600',
    },
    {
      level: 3,
      commission: '0.7%',
      deposit: '5,000 USD',
      tasks: 50,
      color: 'from-purple-400 to-purple-600',
    },
    {
      level: 4,
      commission: '1.0%',
      deposit: '10,000 USD',
      tasks: 55,
      color: 'from-yellow-400 to-yellow-600',
    },
    {
      level: 5,
      commission: '1.5%',
      deposit: '50,000 USD',
      tasks: 60,
      color: 'from-orange-400 to-orange-600',
    },
    {
      level: 6,
      commission: '2.0%',
      deposit: '100,000 USD',
      tasks: 65,
      color: 'from-pink-400 to-pink-600',
    },
    {
      level: 7,
      commission: '2.5%',
      deposit: '500,000 USD',
      tasks: 70,
      color: 'from-red-400 to-red-600',
    },
  ];

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
          {vipLevels.map((vip) => (
            <div 
              key={vip.level}
              className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                <div className="flex items-center gap-4 min-w-0">
                  {/* VIP Badge */}
                  <div className={`bg-gradient-to-br ${vip.color} text-white w-16 h-16 rounded-lg flex items-center justify-center transform -rotate-3 shadow-md`}>
                    <span className="font-bold text-lg">{vip.level}</span>
                  </div>
                  
                  {/* VIP Info */}
                  <div>
                    <h3 className="text-xl font-bold mb-1">{vip.level}</h3>
                    <p className="text-lg font-semibold text-[#0066b3]">{vip.deposit}</p>
                  </div>
                </div>

                {/* Current Badge */}
                {vip.current && (
                  <span className="bg-[#0066b3] text-white px-3 py-1 rounded text-sm font-semibold">
                    Current
                  </span>
                )}
              </div>

              {/* Benefits */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-700">•</span>
                  <span className="text-[#0066b3] font-semibold">{vip.commission}</span>
                  <span className="text-gray-700">commission on all products</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-700">•</span>
                  <span className="text-gray-700">Maximum <span className="text-[#0066b3] font-semibold">{vip.tasks}</span> product orders per day</span>
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