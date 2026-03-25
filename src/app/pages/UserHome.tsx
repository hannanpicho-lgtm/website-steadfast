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

const clientBrands = [
  { name: 'ROAR',            sub: 'Organic',             nameColor: '#111827', subColor: '#0093cc', accent: '#0093cc', bg: '#ffffff', border: '#cceeff' },
  { name: 'BORGHESE',        sub: '',                    nameColor: '#1a1008', subColor: '',        accent: '#3b2a1a', bg: '#ffffff', border: '#ddd4c8' },
  { name: 'ISAIA',           sub: 'NAPOLI',              nameColor: '#cc0000', subColor: '#cc0000', accent: '#cc0000', bg: '#ffffff', border: '#fcc'    },
  { name: 'GIADZY',          sub: '',                    nameColor: '#cc0000', subColor: '',        accent: '#cc0000', bg: '#ffffff', border: '#fcc'    },
  { name: 'UBS',             sub: '',                    nameColor: '#e00000', subColor: '',        accent: '#e00000', bg: '#ffffff', border: '#fdd'    },
  { name: 'BLAST',           sub: '',                    nameColor: '#1e1e1e', subColor: '',        accent: '#1e1e1e', bg: '#f8f8f8', border: '#d0d0d0' },
  { name: 'FANCHEST',        sub: '',                    nameColor: '#ffffff', subColor: '',        accent: '#555555', bg: '#0a0a0a', border: '#333'    },
  { name: 'PET PLATE',       sub: '',                    nameColor: '#0055b3', subColor: '',        accent: '#0055b3', bg: '#ffffff', border: '#bbd4ff' },
  { name: 'THE VITAMIN SHOPPE', sub: '',                 nameColor: '#003087', subColor: '',        accent: '#003087', bg: '#ffffff', border: '#c8d8f4' },
  { name: 'MAGELLAN JETS',   sub: 'ELEVATE EXPECTATIONS', nameColor: '#b5722e', subColor: '#b5722e', accent: '#c4883c', bg: '#fdf7ee', border: '#e8ccaa' },
  { name: '',                sub: '',                    nameColor: '',        subColor: '',        accent: 'transparent', bg: 'transparent', border: 'transparent' },
  { name: '',                sub: '',                    nameColor: '',        subColor: '',        accent: 'transparent', bg: 'transparent', border: 'transparent' },
];

const clientSlides: (typeof clientBrands)[] = [];
for (let i = 0; i < clientBrands.length; i += 3) {
  clientSlides.push(clientBrands.slice(i, i + 3));
}

export default function UserHome() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [clientIndex, setClientIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setClientIndex(i => (i + 1) % clientSlides.length);
    }, 3000);
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
        <section className="mt-5 rounded-2xl border border-[#d3dde8] bg-white py-6 shadow-sm sm:py-8 overflow-hidden">
          <div className="px-4 sm:px-5">
            <p className="text-center text-[0.65rem] sm:text-xs font-bold tracking-[0.22em] text-[#0093cc] uppercase mb-1">TRUSTED BY LEADING BRANDS</p>
            <h2 className="mb-5 text-center text-[1.4rem] font-extrabold text-[#0b5f94] sm:mb-7 sm:text-3xl">Our Clients</h2>
            <div className="overflow-hidden rounded-xl">
              <div
                className="flex transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${clientIndex * 100}%)` }}
              >
                {clientSlides.map((slide, slideIdx) => (
                  <div key={slideIdx} className="min-w-full flex gap-2.5 sm:gap-3">
                    {slide.map((brand, bi) => (
                      brand.name ? (
                        <div
                          key={brand.name}
                          className="flex-1 relative flex flex-col items-center justify-center rounded-xl overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:scale-[1.03] cursor-default select-none"
                          style={{
                            background: brand.bg,
                            border: `1.5px solid ${brand.border}`,
                            minHeight: '96px',
                            boxShadow: `0 2px 10px ${brand.accent}22, 0 1px 3px rgba(0,0,0,0.06)`,
                          }}
                        >
                          {/* Top accent stripe */}
                          <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{ background: brand.accent }} />
                          <div className="flex flex-col items-center justify-center px-2 pt-3 pb-2.5 gap-0.5 w-full">
                            <span
                              className="font-black tracking-tight text-center leading-none text-[0.95rem] sm:text-lg"
                              style={{ color: brand.nameColor }}
                            >{brand.name}</span>
                            {brand.sub && (
                              <span
                                className="text-[0.52rem] sm:text-[0.62rem] font-bold tracking-[0.18em] uppercase text-center mt-0.5"
                                style={{ color: brand.subColor || brand.nameColor }}
                              >{brand.sub}</span>
                            )}
                          </div>
                          {/* Bottom glow line */}
                          <div className="absolute bottom-0 left-[15%] right-[15%] h-[2px] rounded-full opacity-40" style={{ background: brand.accent }} />
                        </div>
                      ) : (
                        <div key={`empty-${slideIdx}-${bi}`} className="flex-1" />
                      )
                    ))}
                  </div>
                ))}
              </div>
              {/* Expanding pill dot navigation */}
              <div className="flex justify-center items-center gap-1.5 mt-5">
                {clientSlides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setClientIndex(i)}
                    className="h-[5px] rounded-full transition-all duration-300"
                    style={{
                      width: i === clientIndex ? '22px' : '7px',
                      background: i === clientIndex ? '#0b5f94' : '#b5d0e6',
                    }}
                    aria-label={`Show clients ${i * 3 + 1}–${Math.min(i * 3 + 3, 10)}`}
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
