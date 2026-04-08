import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { Award, Calendar, Gift, HelpCircle, Info, ScrollText, Wallet, ArrowDownToLine, Search, Share2, Megaphone, Handshake, Brain, Play, Pause } from 'lucide-react';
import { BottomNavigation } from '../components/BottomNavigation';
import { Header } from '../components/Header';
import { LiveChatBox } from '../components/LiveChatBox';
import { OnboardingFlow, useOnboarding } from '../components/OnboardingFlow';

/*
 * ─── DESIGN SYSTEM: "Golden Hour Atelier" ───
 *
 * Palette inspired by warm interior spaces — travertine stone,
 * walnut wood, brushed brass, and soft linen.
 *
 * Primary Warm:   #1a1410  (espresso)
 * Surface:        #faf8f5  (warm linen)
 * Card:           #ffffff with warm shadow
 * Accent Gold:    #c8956c  (brushed brass)
 * Accent Deep:    #8b6f4e  (walnut)
 * Text Primary:   #2c2117  (warm charcoal)
 * Text Secondary: #7a6d5e  (driftwood)
 * Highlight:      #e8c9a8  (champagne)
 * Border:         #e8e0d4  (sandstone)
 */

type QuickLinkItem = {
  to: string;
  title: string;
  icon: typeof Gift;
  accent: string;
  bg: string;
};

const focusAreas = [
  {
    title: 'Search',
    desc: 'Google and Bing built for efficient ROAS.',
    icon: Search,
    color: '#c8956c',
    bgFrom: '#fdf6ef',
    bgTo: '#f9ede0',
    accent: '#a07550',
    badge: '01',
  },
  {
    title: 'Paid Social',
    desc: 'Meta, TikTok, and LinkedIn for conversion lift.',
    icon: Share2,
    color: '#9b7fb8',
    bgFrom: '#f5f0fa',
    bgTo: '#ede4f5',
    accent: '#7c5fa0',
    badge: '02',
  },
  {
    title: 'Paid Content',
    desc: 'Native placements that expand qualified reach.',
    icon: Megaphone,
    color: '#d4935a',
    bgFrom: '#fef3e8',
    bgTo: '#fce8d2',
    accent: '#b87a40',
    badge: '03',
  },
  {
    title: 'Affiliate',
    desc: 'Partnership channels aligned to core buyers.',
    icon: Handshake,
    color: '#6a9e7e',
    bgFrom: '#f0f7f2',
    bgTo: '#dff0e4',
    accent: '#4d7d5f',
    badge: '04',
  },
  {
    title: 'Strategy',
    desc: 'Unified data guiding budget and growth pace.',
    icon: Brain,
    color: '#7a8db8',
    bgFrom: '#f0f3fa',
    bgTo: '#e2e8f4',
    accent: '#5a6f96',
    badge: '05',
  },
];

const quickLinkConfig: QuickLinkItem[] = [
  { to: '/vip-levels',       title: 'VIP',        icon: Gift,           accent: '#c8956c', bg: 'linear-gradient(145deg, #c8956c, #a07550)' },
  { to: '/activity',         title: 'Activity',   icon: Calendar,       accent: '#7a8db8', bg: 'linear-gradient(145deg, #7a8db8, #5a6f96)' },
  { to: '/withdrawal',       title: 'Withdrawal', icon: ArrowDownToLine,accent: '#6a9e7e', bg: 'linear-gradient(145deg, #6a9e7e, #4d7d5f)' },
  { to: '/deposit',          title: 'Deposit',    icon: Wallet,         accent: '#9b7fb8', bg: 'linear-gradient(145deg, #9b7fb8, #7c5fa0)' },
  { to: '/terms-conditions', title: 'T & C',      icon: ScrollText,     accent: '#8e877d', bg: 'linear-gradient(145deg, #8e877d, #6d675e)' },
  { to: '/certificate',      title: 'Certificate',icon: Award,          accent: '#d4935a', bg: 'linear-gradient(145deg, #d4935a, #b87a40)' },
  { to: '/faqs',             title: 'FAQs',       icon: HelpCircle,     accent: '#7a8db8', bg: 'linear-gradient(145deg, #8a9bc4, #6678a4)' },
  { to: '/about',            title: 'About',      icon: Info,           accent: '#b07a6a', bg: 'linear-gradient(145deg, #b07a6a, #8f5e50)' },
];

function QuickLinkCard({ item }: { item: QuickLinkItem }) {
  const Icon = item.icon;

  return (
    <Link
      to={item.to}
      className="group relative flex h-[82px] flex-col items-center justify-center gap-1.5 overflow-hidden rounded-2xl px-2 transition-all duration-300 hover:scale-[1.04] hover:-translate-y-1 sm:h-[88px] sm:px-3"
      style={{
        background: item.bg,
        boxShadow: `0 4px 16px ${item.accent}25, 0 1px 3px rgba(0,0,0,0.06)`,
      }}
    >
      {/* Soft inner light — like morning sun through sheer curtains */}
      <div
        className="absolute inset-0 opacity-0 transition-opacity duration-400 group-hover:opacity-100"
        style={{ background: 'radial-gradient(circle at 50% 25%, rgba(255,255,255,0.35), transparent 65%)' }}
      />

      {/* Icon */}
      <div
        className="relative z-10 flex h-9 w-9 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110"
        style={{
          background: 'rgba(255,255,255,0.22)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3)',
        }}
      >
        <Icon size={17} strokeWidth={2.2} className="text-white/90" />
      </div>

      {/* Label */}
      <span className="relative z-10 text-center text-[0.72rem] font-bold leading-tight tracking-wide text-white sm:text-[0.82rem]">
        {item.title}
      </span>
    </Link>
  );
}

const clientBrands = [
  { name: 'ROAR',               sub: 'Organic',              nameColor: '#2c2117', subColor: '#8b6f4e', accent: '#c8956c', bg: '#faf8f5', border: '#e8e0d4' },
  { name: 'BORGHESE',           sub: '',                     nameColor: '#2c2117', subColor: '',        accent: '#8b6f4e', bg: '#faf8f5', border: '#e8e0d4' },
  { name: 'ISAIA',              sub: 'NAPOLI',               nameColor: '#993333', subColor: '#993333', accent: '#993333', bg: '#fdf9f7', border: '#e8d4d4' },
  { name: 'GIADZY',             sub: '',                     nameColor: '#993333', subColor: '',        accent: '#993333', bg: '#fdf9f7', border: '#e8d4d4' },
  { name: 'UBS',                sub: '',                     nameColor: '#8b2222', subColor: '',        accent: '#8b2222', bg: '#fdf9f7', border: '#e8d4d4' },
  { name: 'BLAST',              sub: '',                     nameColor: '#2c2117', subColor: '',        accent: '#2c2117', bg: '#f5f3f0', border: '#ddd8d0' },
  { name: 'FANCHEST',           sub: '',                     nameColor: '#faf8f5', subColor: '',        accent: '#8b6f4e', bg: '#1a1410', border: '#3d3228' },
  { name: 'PET PLATE',          sub: '',                     nameColor: '#3d5a80', subColor: '',        accent: '#3d5a80', bg: '#f7f9fc', border: '#d4dfe8' },
  { name: 'THE VITAMIN SHOPPE', sub: '',                     nameColor: '#2a4470', subColor: '',        accent: '#2a4470', bg: '#f7f9fc', border: '#d4dfe8' },
  { name: 'MAGELLAN JETS',      sub: 'ELEVATE EXPECTATIONS', nameColor: '#8b6f4e', subColor: '#8b6f4e', accent: '#c8956c', bg: '#fdf8f2', border: '#e8d8c4' },
  { name: '',                   sub: '',                     nameColor: '',        subColor: '',        accent: 'transparent', bg: 'transparent', border: 'transparent' },
  { name: '',                   sub: '',                     nameColor: '',        subColor: '',        accent: 'transparent', bg: 'transparent', border: 'transparent' },
];

const clientSlides: (typeof clientBrands)[] = [];
for (let i = 0; i < clientBrands.length; i += 3) {
  clientSlides.push(clientBrands.slice(i, i + 3));
}

export default function UserHome() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [clientIndex, setClientIndex] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { shouldShow: showOnboarding, completeOnboarding } = useOnboarding();

  useEffect(() => {
    const timer = setInterval(() => {
      setClientIndex((i) => (i + 1) % clientSlides.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const toggleVideo = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setIsVideoPlaying(true); }
    else { v.pause(); setIsVideoPlaying(false); }
  };

  return (
    <div className="min-h-screen pb-[calc(8.5rem+env(safe-area-inset-bottom))] sm:pb-28" style={{ background: 'linear-gradient(180deg, #faf8f5 0%, #f3efe8 100%)' }}>
      <style>{`
        @keyframes uh-fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .uh-reveal {
          animation: uh-fadeUp 0.7s ease both;
        }
        .uh-delay-1 { animation-delay: 0.08s; }
        .uh-delay-2 { animation-delay: 0.18s; }
        .uh-delay-3 { animation-delay: 0.28s; }
        .uh-delay-4 { animation-delay: 0.38s; }
        .uh-delay-5 { animation-delay: 0.48s; }
        @media (prefers-reduced-motion: reduce) {
          .uh-reveal { animation: none; opacity: 1; transform: none; }
        }
      `}</style>

      {showOnboarding && <OnboardingFlow onComplete={completeOnboarding} />}
      <Header onContactClick={() => setIsChatOpen(true)} />

      <main className="mx-auto max-w-6xl px-3 pt-3 sm:px-6 sm:pt-5">

        {/* ═══════════════════════════════════════════
            HERO — The Gallery Moment
            Like walking into a perfectly lit atelier:
            warm stone walls, a single statement piece
            framed in walnut with brass hardware.
        ═══════════════════════════════════════════ */}
        <section className="uh-reveal uh-delay-1 mt-4 overflow-hidden rounded-3xl sm:mt-6" style={{
          background: '#ffffff',
          boxShadow: '0 8px 40px rgba(44,33,23,0.08), 0 1px 3px rgba(44,33,23,0.04)',
          border: '1px solid #e8e0d4',
        }}>
          {/* Video Container — framed like a gallery piece */}
          <div className="relative">
            <div className="relative h-[240px] overflow-hidden sm:h-[320px] md:h-[400px]">
              <video
                ref={videoRef}
                src="/banner-cdc94d47.mp4"
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                className="absolute inset-0 h-full w-full object-cover"
                style={{
                  filter: 'contrast(1.08) saturate(1.1) brightness(1.02)',
                  transform: 'translateZ(0)',
                }}
                aria-label="Steadfast Digital introduction video"
              />
              {/* Warm cinematic overlay — like golden hour light filtering through a window */}
              <div className="absolute inset-0" style={{
                background: 'linear-gradient(180deg, rgba(26,20,16,0.08) 0%, rgba(26,20,16,0.02) 35%, rgba(26,20,16,0.35) 75%, rgba(26,20,16,0.70) 100%)',
              }} />
              {/* Subtle warm color wash */}
              <div className="absolute inset-0 mix-blend-soft-light opacity-20" style={{
                background: 'linear-gradient(135deg, #c8956c 0%, transparent 50%)',
              }} />

              {/* Hero text — positioned like a luxury brand title card */}
              <div className="absolute inset-x-0 bottom-0 px-5 pb-6 sm:px-8 sm:pb-8">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.3em] text-white/60 sm:text-xs">
                  Welcome to
                </p>
                <h2 className="text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl md:text-5xl" style={{
                  textShadow: '0 2px 20px rgba(0,0,0,0.25)',
                }}>
                  Steadfast Digital
                </h2>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-white/80 sm:text-base">
                  Performance-led growth for startups and brands across paid media.
                </p>
              </div>

              {/* Play/pause control — like a discreet brass button */}
              <button
                onClick={toggleVideo}
                className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full transition-all duration-300 hover:scale-110 sm:right-6 sm:top-6"
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.2)',
                }}
                aria-label={isVideoPlaying ? 'Pause video' : 'Play video'}
              >
                {isVideoPlaying ? (
                  <Pause size={14} className="text-white/80" />
                ) : (
                  <Play size={14} className="ml-0.5 text-white/80" />
                )}
              </button>
            </div>
          </div>

          {/* Tagline — warm, centered, generous breathing room */}
          <div className="px-5 py-7 text-center sm:px-10 sm:py-9">
            <h3 className="text-[1.5rem] font-extrabold leading-snug tracking-tight sm:text-[2.2rem] md:text-[2.6rem]" style={{ color: '#2c2117' }}>
              A digital marketing agency{' '}
              <span className="bg-gradient-to-r from-[#c8956c] to-[#a07550] bg-clip-text text-transparent">
                based in Florida
              </span>
            </h3>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed sm:mt-4 sm:text-base" style={{ color: '#7a6d5e' }}>
              Steadfast helps B2B and B2C organizations navigate digital complexity with measurable growth outcomes.
            </p>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            QUICK ACCESS — The Console Table
            Like a curated entryway console with brass-trimmed
            objets — each one inviting you to explore further.
        ═══════════════════════════════════════════ */}
        <section className="uh-reveal uh-delay-2 mt-5 overflow-hidden rounded-3xl px-4 py-6 sm:px-6 sm:py-7" style={{
          background: '#ffffff',
          boxShadow: '0 4px 24px rgba(44,33,23,0.06), 0 1px 3px rgba(44,33,23,0.03)',
          border: '1px solid #e8e0d4',
        }}>
          <p className="mb-1 text-center text-[0.62rem] font-bold uppercase tracking-[0.28em] sm:text-[0.7rem]" style={{ color: '#c8956c' }}>
            Quick Access
          </p>
          <h2 className="mb-5 text-center text-[1.1rem] font-extrabold sm:text-[1.25rem]" style={{ color: '#2c2117' }}>
            One-Tap Features
          </h2>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
            {quickLinkConfig.map((item) => (
              <QuickLinkCard key={item.title} item={item} />
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            AREAS OF FOCUS — The Gallery Wall
            Each card is like a framed piece in a curated
            collection — soft matte backgrounds, warm
            accent lighting, tactile shadow depth.
        ═══════════════════════════════════════════ */}
        <section className="uh-reveal uh-delay-3 mt-5 overflow-hidden rounded-3xl py-8 sm:py-10" style={{
          background: '#ffffff',
          boxShadow: '0 4px 24px rgba(44,33,23,0.06), 0 1px 3px rgba(44,33,23,0.03)',
          border: '1px solid #e8e0d4',
        }}>
          <div className="relative z-10 px-4 sm:px-6">
            <p className="mb-1 text-center text-[0.62rem] font-bold uppercase tracking-[0.28em] sm:text-[0.7rem]" style={{ color: '#c8956c' }}>
              Core Capabilities
            </p>
            <h2 className="mb-7 text-center text-[1.4rem] font-extrabold sm:mb-8 sm:text-[1.8rem]" style={{ color: '#2c2117' }}>
              Areas of Focus
            </h2>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-4 md:grid-cols-5">
              {focusAreas.map((area) => {
                const IconComponent = area.icon;
                return (
                  <div
                    key={area.title}
                    className="group relative min-h-[140px] cursor-default overflow-hidden rounded-2xl p-4 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lg sm:min-h-[160px] sm:p-5"
                    style={{
                      background: `linear-gradient(145deg, ${area.bgFrom}, ${area.bgTo})`,
                      border: '1px solid rgba(200,149,108,0.15)',
                      boxShadow: `0 2px 12px ${area.color}10`,
                    }}
                  >
                    {/* Badge */}
                    <div
                      className="absolute -right-1 -top-1 flex h-10 w-10 items-center justify-center rounded-full text-[10px] font-black text-white"
                      style={{
                        background: `linear-gradient(135deg, ${area.color}, ${area.accent})`,
                        boxShadow: `0 3px 10px ${area.color}30`,
                      }}
                    >
                      {area.badge}
                    </div>

                    {/* Icon */}
                    <div
                      className="mb-3 inline-flex rounded-xl p-2.5 transition-transform duration-300 group-hover:scale-105"
                      style={{
                        background: area.color,
                        color: 'white',
                        boxShadow: `0 3px 10px ${area.color}25`,
                      }}
                    >
                      <IconComponent size={20} strokeWidth={2.2} />
                    </div>

                    <h3 className="mb-1.5 text-[0.95rem] font-bold leading-tight" style={{ color: area.accent }}>
                      {area.title}
                    </h3>
                    <p className="text-xs font-medium leading-relaxed opacity-80 transition-opacity group-hover:opacity-100" style={{ color: '#4a3f33' }}>
                      {area.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            CLIENTS — The Trust Wall
            Like framed press logos in a reception foyer.
        ═══════════════════════════════════════════ */}
        <section className="uh-reveal uh-delay-4 mt-5 overflow-hidden rounded-3xl py-6 sm:py-8" style={{
          background: '#ffffff',
          boxShadow: '0 4px 24px rgba(44,33,23,0.06), 0 1px 3px rgba(44,33,23,0.03)',
          border: '1px solid #e8e0d4',
        }}>
          <div className="px-4 sm:px-6">
            <p className="mb-1 text-center text-[0.62rem] font-bold uppercase tracking-[0.28em] sm:text-[0.7rem]" style={{ color: '#c8956c' }}>
              Trusted by Leading Brands
            </p>
            <h2 className="mb-5 text-center text-[1.4rem] font-extrabold sm:mb-7 sm:text-[1.8rem]" style={{ color: '#2c2117' }}>
              Our Clients
            </h2>
            <div className="overflow-hidden rounded-xl">
              <div
                className="flex transition-transform duration-600 ease-in-out"
                style={{ transform: `translateX(-${clientIndex * 100}%)`, transitionDuration: '600ms' }}
              >
                {clientSlides.map((slide, slideIdx) => (
                  <div key={slideIdx} className="flex min-w-full gap-2.5 sm:gap-3">
                    {slide.map((brand, bi) =>
                      brand.name ? (
                        <div
                          key={brand.name}
                          className="relative flex flex-1 cursor-default select-none flex-col items-center justify-center overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
                          style={{
                            background: brand.bg,
                            border: `1.5px solid ${brand.border}`,
                            minHeight: '96px',
                            boxShadow: `0 2px 8px ${brand.accent}12`,
                          }}
                        >
                          <div className="flex w-full flex-col items-center justify-center gap-0.5 px-2 pb-3 pt-4">
                            <span
                              className="text-center text-[0.95rem] font-black leading-none tracking-tight sm:text-lg"
                              style={{ color: brand.nameColor }}
                            >
                              {brand.name}
                            </span>
                            {brand.sub && (
                              <span
                                className="mt-1 text-center text-[0.5rem] font-bold uppercase tracking-[0.2em] sm:text-[0.6rem]"
                                style={{ color: brand.subColor || brand.nameColor }}
                              >
                                {brand.sub}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div key={`empty-${slideIdx}-${bi}`} className="flex-1" />
                      ),
                    )}
                  </div>
                ))}
              </div>
              {/* Dot navigation — warm brass-inspired pills */}
              <div className="mt-5 flex items-center justify-center gap-1.5">
                {clientSlides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setClientIndex(i)}
                    className="h-[5px] rounded-full transition-all duration-300"
                    style={{
                      width: i === clientIndex ? '22px' : '7px',
                      background: i === clientIndex ? '#c8956c' : '#ddd6cc',
                    }}
                    aria-label={`Show clients ${i * 3 + 1}–${Math.min(i * 3 + 3, 10)}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            APPROACH — The Closing Statement
            A warm, grounding sign-off.
        ═══════════════════════════════════════════ */}
        <section className="uh-reveal uh-delay-5 mb-3 mt-5 overflow-hidden rounded-3xl px-5 py-7 text-center sm:px-8 sm:py-8" style={{
          background: 'linear-gradient(145deg, #2c2117, #1a1410)',
          boxShadow: '0 8px 40px rgba(26,20,16,0.18)',
          border: '1px solid #3d3228',
        }}>
          <p className="mb-2 text-[0.62rem] font-bold uppercase tracking-[0.28em] sm:text-[0.7rem]" style={{ color: '#c8956c' }}>
            Our Philosophy
          </p>
          <h3 className="text-xl font-extrabold tracking-tight text-white sm:text-2xl md:text-3xl">
            Our Approach
          </h3>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed sm:text-base" style={{ color: '#b8a99a' }}>
            Data-led execution, transparent reporting, and sustainable acquisition strategy.
          </p>
        </section>
      </main>

      <LiveChatBox isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      <BottomNavigation />
    </div>
  );
}
