import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Award, Calendar, Gift, HelpCircle, Info, ScrollText, Wallet, ArrowDownToLine } from 'lucide-react';
import { BottomNavigation } from '../components/BottomNavigation';
import { Header } from '../components/Header';
import { LiveChatBox } from '../components/LiveChatBox';

type QuickLinkItem = {
  to: string;
  title: string;
  icon: typeof Gift;
};

const quickLinks: QuickLinkItem[] = [
  { to: '/vip-levels', title: 'VIP', icon: Gift },
  { to: '/activity', title: 'Activity', icon: Calendar },
  { to: '/withdrawal', title: 'Withdrawal', icon: ArrowDownToLine },
  { to: '/deposit', title: 'Deposit', icon: Wallet },
  { to: '/terms-conditions', title: 'T & C', icon: ScrollText },
  { to: '/certificate', title: 'Certificate', icon: Award },
  { to: '/faqs', title: 'FAQs', icon: HelpCircle },
  { to: '/about', title: 'About', icon: Info },
];

function QuickLinkCard({ item }: { item: QuickLinkItem }) {
  const Icon = item.icon;

  return (
    <Link
      to={item.to}
      className="rounded-md bg-[#005f98] h-[72px] sm:h-[88px] flex flex-col items-center justify-center gap-1 px-1 text-white shadow-[0_8px_18px_rgba(0,38,69,0.28)] border border-[#0a78b9] transition-transform duration-200 hover:-translate-y-0.5"
    >
      <Icon size={18} strokeWidth={2.2} className="sm:h-5 sm:w-5" />
      <span className="text-[0.68rem] sm:text-[0.8rem] font-semibold tracking-tight text-center leading-tight px-1 break-words">{item.title}</span>
    </Link>
  );
}

const clients = [
  { name: 'Steadfast Growth Partners', color: 'text-[#005a87]' },
  { name: 'Performance Commerce Network', color: 'text-teal-600' },
  { name: 'Enterprise Media Group', color: 'text-[#0f172a]' },
];

export default function UserHome() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [clientIndex, setClientIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setClientIndex(i => (i + 1) % clients.length);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#1f2638] pb-[calc(9rem+env(safe-area-inset-bottom))] sm:pb-32">
      <Header onContactClick={() => setIsChatOpen(true)} />

      <main className="max-w-5xl mx-auto px-3 sm:px-6 pt-2.5 sm:pt-5">
        {/* Welcome Section */}
        <section className="mt-5 sm:mt-7 bg-gradient-to-br from-[#1a1f2e] to-[#2d3a56] py-6 sm:py-8 rounded-2xl border border-white/5">
          <div className="px-4 sm:px-5">
            <div className="relative w-full h-[240px] sm:h-[340px] md:h-[440px] rounded-xl border border-[#00D9FF]/45 overflow-hidden shadow-[0_16px_38px_rgba(0,217,255,0.24)]">
              <video
                src="/banner-cdc94d47.mp4"
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                className="absolute inset-0 h-full w-full object-cover"
                style={{ filter: 'contrast(1.35) saturate(1.45) brightness(1.12)', transform: 'translateZ(0)', willChange: 'transform' }}
                aria-label="Steadfast Digital background video"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-[#0f172a59] via-[#0f172a1f] to-transparent" />
              <div className="absolute left-3 sm:left-5 bottom-3 sm:bottom-5 text-white max-w-[88%]">
                <h2 className="text-[1.35rem] sm:text-3xl font-bold text-[#00D9FF] mb-1">Welcome to Steadfast Digital</h2>
                <p className="text-[11px] sm:text-sm text-gray-200 leading-relaxed">Performance-led growth for startups and brands across paid media.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Access */}
        <section className="mt-5 rounded-xl bg-[#2a3146] border border-white/5 p-2 sm:p-3 shadow-[0_10px_28px_rgba(5,12,24,0.22)]">
          <div className="mb-1.5 sm:mb-3 text-center">
            <p className="text-[#9fb4d1] text-[11px] sm:text-sm">Quick access</p>
          </div>

          <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
            {quickLinks.map((item) => (
              <QuickLinkCard key={item.title} item={item} />
            ))}
          </div>
        </section>

        {/* Areas of Focus Section */}
        <section className="mt-5 bg-gradient-to-br from-[#1a1f2e] to-[#2d3a56] py-6 sm:py-8 rounded-2xl border border-white/5">
          <div className="px-4 sm:px-5">
            <h2 className="text-[1.4rem] sm:text-3xl font-bold text-center mb-4 sm:mb-6 text-[#00D9FF]">Areas of Focus</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5 sm:gap-3">
              <div className="group bg-[#252b3d] text-white rounded-lg p-2.5 min-h-[76px] border border-[#00D9FF]/30 transition-colors duration-200 hover:bg-[#00D9FF] hover:text-[#1a1f2e]">
                <h3 className="text-[0.9rem] font-bold mb-0.5 text-[#00D9FF] transition-colors duration-200 group-hover:text-[#1a1f2e]">Search</h3>
                <p className="text-[10px] leading-relaxed text-gray-300 transition-colors duration-200 group-hover:text-[#1a1f2e]">Google and Bing built for efficient ROAS.</p>
              </div>
              <div className="group bg-[#252b3d] text-white rounded-lg p-2.5 min-h-[76px] border border-[#00D9FF]/30 transition-colors duration-200 hover:bg-[#00D9FF] hover:text-[#1a1f2e]">
                <h3 className="text-[0.9rem] font-bold mb-0.5 text-[#00D9FF] transition-colors duration-200 group-hover:text-[#1a1f2e]">Paid Social</h3>
                <p className="text-[10px] leading-relaxed text-gray-300 transition-colors duration-200 group-hover:text-[#1a1f2e]">Meta, TikTok, and LinkedIn for conversion lift.</p>
              </div>
              <div className="group bg-[#252b3d] text-white rounded-lg p-2.5 min-h-[76px] border border-[#00D9FF]/30 transition-colors duration-200 hover:bg-[#00D9FF] hover:text-[#1a1f2e]">
                <h3 className="text-[0.9rem] font-bold mb-0.5 text-[#00D9FF] transition-colors duration-200 group-hover:text-[#1a1f2e]">Paid Content</h3>
                <p className="text-[10px] leading-relaxed text-gray-300 transition-colors duration-200 group-hover:text-[#1a1f2e]">Native placements that expand qualified reach.</p>
              </div>
              <div className="group bg-[#252b3d] text-white rounded-lg p-2.5 min-h-[76px] border border-[#00D9FF]/30 transition-colors duration-200 hover:bg-[#00D9FF] hover:text-[#1a1f2e]">
                <h3 className="text-[0.9rem] font-bold mb-0.5 text-[#00D9FF] transition-colors duration-200 group-hover:text-[#1a1f2e]">Affiliate</h3>
                <p className="text-[10px] leading-relaxed text-gray-300 transition-colors duration-200 group-hover:text-[#1a1f2e]">Partnership channels aligned to core buyers.</p>
              </div>
              <div className="group bg-[#252b3d] text-white rounded-lg p-2.5 min-h-[76px] border border-[#00D9FF]/30 transition-colors duration-200 hover:bg-[#00D9FF] hover:text-[#1a1f2e]">
                <h3 className="text-[0.9rem] font-bold mb-0.5 text-[#00D9FF] transition-colors duration-200 group-hover:text-[#1a1f2e]">Strategy</h3>
                <p className="text-[10px] leading-relaxed text-gray-300 transition-colors duration-200 group-hover:text-[#1a1f2e]">Unified data guiding budget and growth pace.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Our Clients Section */}
        <section className="mt-5 bg-gradient-to-br from-[#2d3a56] to-[#1a1f2e] py-6 sm:py-8 rounded-2xl border border-white/5">
          <div className="px-4 sm:px-5">
            <h2 className="text-[1.4rem] sm:text-3xl font-bold text-center mb-4 sm:mb-6 text-[#00D9FF]">Our Clients</h2>
            <div className="overflow-hidden">
              <div
                className="flex transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${clientIndex * 100}%)` }}
              >
                {clients.map((client) => (
                  <div key={client.name} className="min-w-full flex justify-center px-4">
                    <div className="bg-white rounded-lg p-5 sm:p-8 flex items-center justify-center w-full min-h-[100px] sm:min-h-[130px] border border-gray-200 shadow-sm">
                      <span className={`text-2xl sm:text-3xl font-bold ${client.color}`}>{client.name}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-center gap-2 mt-4">
                {clients.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setClientIndex(i)}
                    className={`w-2 h-2 rounded-full transition-colors duration-300 ${i === clientIndex ? 'bg-[#00D9FF]' : 'bg-white/30'}`}
                    aria-label={`Show client ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <LiveChatBox isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      <BottomNavigation />
    </div>
  );
}
