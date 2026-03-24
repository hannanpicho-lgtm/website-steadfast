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
      className="flex h-[78px] flex-col items-center justify-center gap-1 rounded-lg border border-[#0b5f94] bg-[#0b5f94] px-1 text-white shadow-sm transition-colors duration-200 hover:bg-[#0e70ae] sm:h-[88px]"
    >
      <Icon size={18} strokeWidth={2.2} className="sm:h-5 sm:w-5" />
      <span className="px-1 text-center text-[0.72rem] font-semibold leading-tight tracking-tight sm:text-[0.86rem]">{item.title}</span>
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
    <div className="min-h-screen bg-[#e8edf2] pb-[calc(8.5rem+env(safe-area-inset-bottom))] sm:pb-28">
      <Header onContactClick={() => setIsChatOpen(true)} />

      <main className="mx-auto max-w-6xl px-3 sm:px-6 pt-3 sm:pt-5">
        {/* Welcome Section */}
        <section className="mt-4 rounded-2xl border border-[#d3dde8] bg-white px-4 py-4 shadow-sm sm:mt-6 sm:px-5 sm:py-5">
          <div className="relative w-full overflow-hidden rounded-xl border border-[#9ac2de] shadow-sm">
            <div className="relative h-[220px] sm:h-[300px] md:h-[360px]">
              <video
                src="/banner-cdc94d47.mp4"
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                className="absolute inset-0 h-full w-full object-cover"
                style={{ filter: 'contrast(1.15) saturate(1.15) brightness(1.05)', transform: 'translateZ(0)', willChange: 'transform' }}
                aria-label="Steadfast Digital background video"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0d1117c4] via-[#0d111754] to-transparent" />
              <div className="absolute bottom-4 left-4 max-w-[90%] text-white sm:bottom-6 sm:left-6">
                <h2 className="mb-1 text-[1.35rem] font-extrabold tracking-tight text-[#7fe0ff] sm:text-3xl">Welcome to Steadfast Digital</h2>
                <p className="text-[11px] leading-relaxed text-white/90 sm:text-sm">Performance-led growth for startups and brands across paid media.</p>
              </div>
            </div>
          </div>
          <div className="mt-5 px-1 text-center sm:mt-6">
            <h3 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-[#0f172a]">We're a digital marketing agency based in New York City</h3>
            <p className="mt-3 text-sm sm:text-base text-[#334155]">Steadfast helps B2B and B2C organizations navigate digital complexity with measurable growth outcomes.</p>
          </div>
        </section>

        {/* Quick Access */}
        <section className="mt-4 rounded-2xl border border-[#cfd8e3] bg-[#f1f3f5] p-3 shadow-sm sm:p-5">
          <div className="mb-3 text-center sm:mb-4">
            <p className="text-sm font-semibold text-[#33516b] sm:text-base">Quick Access</p>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
            {quickLinks.map((item) => (
              <QuickLinkCard key={item.title} item={item} />
            ))}
          </div>
        </section>

        {/* Areas of Focus Section */}
        <section className="mt-5 rounded-2xl border border-[#d3dde8] bg-white py-6 shadow-sm sm:py-8">
          <div className="px-4 sm:px-5">
            <h2 className="mb-4 text-center text-[1.4rem] font-extrabold text-[#0b5f94] sm:mb-6 sm:text-3xl">Areas of Focus</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5 sm:gap-3">
              <div className="rounded-lg border border-[#b5d0e6] bg-[#f8fbfd] p-2.5 min-h-[76px]">
                <h3 className="mb-0.5 text-[0.9rem] font-bold text-[#0b5f94]">Search</h3>
                <p className="text-xs font-medium leading-relaxed text-[#1f3f5b]">Google and Bing built for efficient ROAS.</p>
              </div>
              <div className="rounded-lg border border-[#b5d0e6] bg-[#f8fbfd] p-2.5 min-h-[76px]">
                <h3 className="mb-0.5 text-[0.9rem] font-bold text-[#0b5f94]">Paid Social</h3>
                <p className="text-xs font-medium leading-relaxed text-[#1f3f5b]">Meta, TikTok, and LinkedIn for conversion lift.</p>
              </div>
              <div className="rounded-lg border border-[#b5d0e6] bg-[#f8fbfd] p-2.5 min-h-[76px]">
                <h3 className="mb-0.5 text-[0.9rem] font-bold text-[#0b5f94]">Paid Content</h3>
                <p className="text-xs font-medium leading-relaxed text-[#1f3f5b]">Native placements that expand qualified reach.</p>
              </div>
              <div className="rounded-lg border border-[#b5d0e6] bg-[#f8fbfd] p-2.5 min-h-[76px]">
                <h3 className="mb-0.5 text-[0.9rem] font-bold text-[#0b5f94]">Affiliate</h3>
                <p className="text-xs font-medium leading-relaxed text-[#1f3f5b]">Partnership channels aligned to core buyers.</p>
              </div>
              <div className="rounded-lg border border-[#b5d0e6] bg-[#f8fbfd] p-2.5 min-h-[76px]">
                <h3 className="mb-0.5 text-[0.9rem] font-bold text-[#0b5f94]">Strategy</h3>
                <p className="text-xs font-medium leading-relaxed text-[#1f3f5b]">Unified data guiding budget and growth pace.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Our Clients Section */}
        <section className="mt-5 rounded-2xl border border-[#d3dde8] bg-white py-6 shadow-sm sm:py-8">
          <div className="px-4 sm:px-5">
            <h2 className="mb-4 text-center text-[1.4rem] font-extrabold text-[#0b5f94] sm:mb-6 sm:text-3xl">Our Clients</h2>
            <div className="overflow-hidden">
              <div
                className="flex transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${clientIndex * 100}%)` }}
              >
                {clients.map((client) => (
                  <div key={client.name} className="min-w-full flex justify-center px-4">
                    <div className="w-full min-h-[100px] rounded-lg border border-[#b5d0e6] bg-[#f8fbfd] p-5 shadow-sm sm:min-h-[130px] sm:p-8 flex items-center justify-center">
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
                    className={`h-2 w-2 rounded-full transition-colors duration-300 ${i === clientIndex ? 'bg-[#0b5f94]' : 'bg-[#b5d0e6]'}`}
                    aria-label={`Show client ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-5 mb-3 rounded-2xl border border-[#d3dde8] bg-white px-4 py-5 text-center shadow-sm sm:px-6 sm:py-6">
          <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0b5f94]">Our Approach</h3>
          <p className="mt-2 text-sm sm:text-base text-[#475569]">Data-led execution, transparent reporting, and sustainable acquisition strategy.</p>
        </section>
      </main>

      <LiveChatBox isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      <BottomNavigation />
    </div>
  );
}
