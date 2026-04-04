import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Award, Calendar, Gift, HelpCircle, Info, ScrollText, Wallet, ArrowDownToLine, Search, Share2, Megaphone, Handshake, Brain, Zap } from 'lucide-react';
import { BottomNavigation } from '../components/BottomNavigation';
import { Header } from '../components/Header';
import { LiveChatBox } from '../components/LiveChatBox';
import { OnboardingFlow, useOnboarding } from '../components/OnboardingFlow';

type QuickLinkItem = {
  to: string;
  title: string;
  icon: typeof Gift;
};

const focusAreas = [
  { 
    title: 'Search', 
    desc: 'Google and Bing built for efficient ROAS.',
    icon: Search,
    color: '#0093cc',
    bg: 'from-[#e0f2fe] to-[#cffafe]',
    accent: '#0284c7',
    badge: '01'
  },
  { 
    title: 'Paid Social',
    desc: 'Meta, TikTok, and LinkedIn for conversion lift.',
    icon: Share2,
    color: '#a855f7',
    bg: 'from-[#f3e8ff] to-[#e9d5ff]',
    accent: '#9333ea',
    badge: '02'
  },
  { 
    title: 'Paid Content',
    desc: 'Native placements that expand qualified reach.',
    icon: Megaphone,
    color: '#f97316',
    bg: 'from-[#fed7aa] to-[#ffedd5]',
    accent: '#ea580c',
    badge: '03'
  },
  { 
    title: 'Affiliate',
    desc: 'Partnership channels aligned to core buyers.',
    icon: Handshake,
    color: '#059669',
    bg: 'from-[#d1fae5] to-[#a7f3d0]',
    accent: '#047857',
    badge: '04'
  },
  { 
    title: 'Strategy',
    desc: 'Unified data guiding budget and growth pace.',
    icon: Brain,
    color: '#4f46e5',
    bg: 'from-[#e0e7ff] to-[#ddd6fe]',
    accent: '#4338ca',
    badge: '05'
  },
];

const quickLinkConfig: QuickLinkItem[] = [
  { to: '/vip-levels', title: 'VIP', icon: Gift },
  { to: '/activity', title: 'Activity', icon: Calendar },
  { to: '/withdrawal', title: 'Withdrawal', icon: ArrowDownToLine },
  { to: '/deposit', title: 'Deposit', icon: Wallet },
  { to: '/terms-conditions', title: 'T & C', icon: ScrollText },
  { to: '/certificate', title: 'Certificate', icon: Award },
  { to: '/faqs', title: 'FAQs', icon: HelpCircle },
  { to: '/about', title: 'About', icon: Info },
];

const quickLinkAccents: Record<string, string> = {
  '/vip-levels':       '#f59e0b',
  '/activity':         '#00D9FF',
  '/withdrawal':       '#10b981',
  '/deposit':          '#8b5cf6',
  '/terms-conditions': '#94a3b8',
  '/certificate':      '#fbbf24',
  '/faqs':             '#06b6d4',
  '/about':            '#f43f5e',
};

const QUICK_LINK_BG_STYLE: React.CSSProperties = {
  background: 'linear-gradient(165deg, #00D9FF, #00a8c8)',
  boxShadow: '0 4px 14px rgba(0,173,212,0.22)',
};
const QUICK_LINK_DEFAULT_SHADOW = '0 4px 14px rgba(0,173,212,0.22)';
const QUICK_LINK_GLOW_STYLE: React.CSSProperties = {
  background: 'radial-gradient(circle at 50% 30%, rgba(255,255,255,0.42), transparent 65%)',
};
const QUICK_LINK_ICON_STYLE: React.CSSProperties = {
  background: 'rgba(255,255,255,0.22)',
  color: '#062f49',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35)',
};
const VIDEO_STYLE: React.CSSProperties = {
  filter: 'contrast(1.15) saturate(1.15) brightness(1.05)',
  transform: 'translateZ(0)',
  willChange: 'transform',
};
const FOCUS_BG_STYLE: React.CSSProperties = {
  backgroundImage: 'radial-gradient(circle at 20% 50%, #0b5f94 0%, transparent 50%), radial-gradient(circle at 80% 80%, #0093cc 0%, transparent 50%)',
};

function QuickLinkCard({ item }: { item: QuickLinkItem }) {
  const Icon = item.icon;
  const accent = quickLinkAccents[item.to] ?? '#00D9FF';

  return (
    <Link
      to={item.to}
      className="group relative overflow-hidden flex h-[82px] flex-col items-center justify-center gap-1.5 rounded-xl border border-[#00b6d6]/60 px-2 transition-all duration-300 hover:scale-[1.06] hover:-translate-y-1.5 sm:h-[88px] sm:px-3"
      style={QUICK_LINK_BG_STYLE}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = `0 10px 28px ${accent}55, ${QUICK_LINK_DEFAULT_SHADOW}`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = QUICK_LINK_DEFAULT_SHADOW;
      }}
    >
      {/* Unique per-card accent top stripe */}
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: accent }} />

      {/* Hover radial glow */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={QUICK_LINK_GLOW_STYLE} />

      {/* Icon circle */}
      <div className="relative z-10 w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110" style={QUICK_LINK_ICON_STYLE}>
        <Icon size={16} strokeWidth={2.2} className="sm:w-[18px] sm:h-[18px]" />
      </div>

      {/* Label */}
      <span className="relative z-10 px-1 text-center text-[0.72rem] font-bold leading-tight tracking-tight text-[#062f49] sm:text-[0.86rem]">
        {item.title}
      </span>

      {/* Bottom accent line — width animation, no inline-transform override bug */}
      <div className="absolute bottom-0 left-0 h-[3px] w-0 group-hover:w-full transition-[width] duration-300" style={{
        background: accent,
      }} />
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
  const { shouldShow: showOnboarding, completeOnboarding } = useOnboarding();

  useEffect(() => {
    const timer = setInterval(() => {
      setClientIndex(i => (i + 1) % clientSlides.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#e8edf2] pb-[calc(8.5rem+env(safe-area-inset-bottom))] sm:pb-28">
      {showOnboarding && <OnboardingFlow onComplete={completeOnboarding} />}
      <Header onContactClick={() => setIsChatOpen(true)} />

      <main className="mx-auto max-w-6xl px-3 sm:px-6 pt-3 sm:pt-5">
        {/* Welcome Section */}
        <section className="mt-4 rounded-2xl border border-[#d3dde8] bg-white px-4 py-4 shadow-sm sm:mt-6 sm:px-5 sm:py-5 sf-stagger-1">
          <div className="relative w-full overflow-hidden rounded-xl border border-[#9ac2de] shadow-sm">
            <div className="relative h-[220px] sm:h-[300px] md:h-[360px]">
              <video
                src="/banner-cdc94d47.mp4"
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                className="absolute inset-0 h-full w-full object-cover"
                style={VIDEO_STYLE}
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
        <section className="mt-4 rounded-2xl border border-[#cfd8e3] bg-gradient-to-br from-white via-[#f8fafb] to-[#f1f3f5] p-4 sm:p-5 shadow-sm sf-stagger-2">
          <p className="text-center text-[0.65rem] sm:text-xs font-bold tracking-[0.22em] text-[#0b5f94] uppercase mb-1">Quick Access</p>
          <h2 className="text-center text-[1.1rem] sm:text-[1.25rem] font-extrabold text-[#0f172a] mb-4">One-Tap Features</h2>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
            {quickLinkConfig.map((item) => (
              <QuickLinkCard key={item.title} item={item} />
            ))}
          </div>
        </section>

        {/* Areas of Focus Section */}
        <section className="mt-5 rounded-2xl border border-[#d3dde8] bg-gradient-to-br from-[#f8fafc] via-white to-[#f1f5f9] py-8 shadow-sm sm:py-10 overflow-hidden relative sf-stagger-3">
          {/* Background pattern overlay */}
          <div className="absolute inset-0 opacity-[0.025] pointer-events-none" style={FOCUS_BG_STYLE} />
          
          <div className="px-4 sm:px-5 relative z-10">
            <p className="text-center text-[0.65rem] sm:text-xs font-bold tracking-[0.22em] text-[#0093cc] uppercase mb-1">CORE CAPABILITIES</p>
            <h2 className="mb-7 text-center text-[1.4rem] font-extrabold text-[#0b5f94] sm:mb-8 sm:text-3xl">Areas of Focus</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5 sm:gap-4">
              {focusAreas.map((area) => {
                const IconComponent = area.icon;
                return (
                  <div
                    key={area.title}
                    className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${area.bg} border border-white/40 p-4 sm:p-5 min-h-[140px] sm:min-h-[160px] backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:-translate-y-2 hover:shadow-[0_20px_60px_rgba(0,0,0,0.12)] cursor-default`}
                    style={{
                      boxShadow: `0 8px 24px ${area.color}15, inset 0 1px 0 rgba(255,255,255,0.6)`,
                    }}
                  >
                    {/* Top gradient accent bar */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r" style={{ background: `linear-gradient(90deg, ${area.color}, transparent)` }} />
                    
                    {/* Badge */}
                    <div className="absolute -top-2 -right-2 w-12 h-12 rounded-full flex items-center justify-center font-black text-xs" style={{
                      background: `linear-gradient(135deg, ${area.color}, ${area.accent})`,
                      color: 'white',
                      boxShadow: `0 4px 15px ${area.color}40`,
                    }}>
                      {area.badge}
                    </div>

                    {/* Icon circle */}
                    <div className="mb-3 inline-flex p-2.5 rounded-xl transition-all duration-300" style={{
                      background: area.color,
                      color: 'white',
                      boxShadow: `0 4px 12px ${area.color}30, inset 0 1px 0 rgba(255,255,255,0.2)`,
                    }}>
                      <IconComponent size={22} strokeWidth={2.2} />
                    </div>

                    <h3 className="mb-1.5 text-base font-bold leading-tight transition-colors duration-300" style={{ color: area.accent }}>
                      {area.title}
                    </h3>
                    <p className="text-xs font-medium leading-relaxed text-[#1f3f5b] opacity-90 group-hover:opacity-100 transition-opacity">
                      {area.desc}
                    </p>

                    {/* Animated bottom glow line */}
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{
                      background: `linear-gradient(90deg, transparent, ${area.color}, transparent)`,
                    }} />
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Our Clients Section */}
        <section className="mt-5 rounded-2xl border border-[#d3dde8] bg-white py-6 shadow-sm sm:py-8 overflow-hidden sf-stagger-4">
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

        <section className="mt-5 mb-3 rounded-2xl border border-[#d3dde8] bg-white px-4 py-5 text-center shadow-sm sm:px-6 sm:py-6 sf-stagger-5">
          <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0b5f94]">Our Approach</h3>
          <p className="mt-2 text-sm sm:text-base text-[#475569]">Data-led execution, transparent reporting, and sustainable acquisition strategy.</p>
        </section>
      </main>

      <LiveChatBox isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      <BottomNavigation />
    </div>
  );
}
