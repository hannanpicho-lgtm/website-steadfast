import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { Link } from 'react-router';
import { Award, Calendar, Gift, HelpCircle, Info, ScrollText, Wallet, ArrowDownToLine, Search, Share2, Megaphone, Handshake, Brain, Play, Pause } from 'lucide-react';
import { BottomNavigation } from '../components/BottomNavigation';
import { Header } from '../components/Header';
const LiveChatBox = lazy(() => import('../components/LiveChatBox').then(m => ({ default: m.LiveChatBox })));
import { OnboardingFlow, useOnboarding } from '../components/OnboardingFlow';

/*
 * ─── DESIGN SYSTEM: "Dark Atelier" ───
 *
 * Premium dark aesthetic with the original brand palette.
 * Rich black base, warm accents that glow like brass
 * fixtures in a dimly-lit luxury showroom.
 *
 * Base Dark:      #0a0a0a  (rich black)
 * Surface:        rgba(255,255,255,0.03) (dark glass)
 * Accent Gold:    #c8956c  (brushed brass)
 * Accent Deep:    #8b6f4e  (walnut)
 * Text Primary:   #f5f0eb  (warm cream)
 * Text Secondary: #a09080  (warm stone)
 * Border:         rgba(200,149,108,0.12) (warm edge)
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
    bgFrom: 'rgba(200,149,108,0.10)',
    bgTo: 'rgba(200,149,108,0.05)',
    accent: '#d4a87a',
    badge: '01',
  },
  {
    title: 'Paid Social',
    desc: 'Meta, TikTok, and LinkedIn for conversion lift.',
    icon: Share2,
    color: '#9b7fb8',
    bgFrom: 'rgba(155,127,184,0.10)',
    bgTo: 'rgba(155,127,184,0.05)',
    accent: '#b89dd0',
    badge: '02',
  },
  {
    title: 'Paid Content',
    desc: 'Native placements that expand qualified reach.',
    icon: Megaphone,
    color: '#d4935a',
    bgFrom: 'rgba(212,147,90,0.10)',
    bgTo: 'rgba(212,147,90,0.05)',
    accent: '#e0a870',
    badge: '03',
  },
  {
    title: 'Affiliate',
    desc: 'Partnership channels aligned to core buyers.',
    icon: Handshake,
    color: '#6a9e7e',
    bgFrom: 'rgba(106,158,126,0.10)',
    bgTo: 'rgba(106,158,126,0.05)',
    accent: '#88c0a0',
    badge: '04',
  },
  {
    title: 'Strategy',
    desc: 'Unified data guiding budget and growth pace.',
    icon: Brain,
    color: '#7a8db8',
    bgFrom: 'rgba(122,141,184,0.10)',
    bgTo: 'rgba(122,141,184,0.05)',
    accent: '#9aadce',
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
        boxShadow: `0 4px 16px ${item.accent}25, 0 1px 3px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.15)`,
      }}
    >
      {/* Soft inner light */}
      <div
        className="absolute inset-0 opacity-0 transition-opacity duration-400 group-hover:opacity-100"
        style={{ background: 'radial-gradient(circle at 50% 25%, rgba(255,255,255,0.25), transparent 65%)' }}
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
  { name: 'ROAR',               sub: 'Organic',              nameColor: '#f5f0eb', subColor: '#c8956c', accent: '#c8956c', bg: 'rgba(200,149,108,0.06)', border: 'rgba(200,149,108,0.15)' },
  { name: 'BORGHESE',           sub: '',                     nameColor: '#f5f0eb', subColor: '',        accent: '#8b6f4e', bg: 'rgba(139,111,78,0.06)',  border: 'rgba(139,111,78,0.15)' },
  { name: 'ISAIA',              sub: 'NAPOLI',               nameColor: '#e07070', subColor: '#e07070', accent: '#993333', bg: 'rgba(153,51,51,0.08)',   border: 'rgba(153,51,51,0.18)' },
  { name: 'GIADZY',             sub: '',                     nameColor: '#e07070', subColor: '',        accent: '#993333', bg: 'rgba(153,51,51,0.08)',   border: 'rgba(153,51,51,0.18)' },
  { name: 'UBS',                sub: '',                     nameColor: '#e07070', subColor: '',        accent: '#8b2222', bg: 'rgba(139,34,34,0.08)',   border: 'rgba(139,34,34,0.18)' },
  { name: 'BLAST',              sub: '',                     nameColor: '#f5f0eb', subColor: '',        accent: '#8b6f4e', bg: 'rgba(139,111,78,0.06)',  border: 'rgba(139,111,78,0.15)' },
  { name: 'FANCHEST',           sub: '',                     nameColor: '#f5f0eb', subColor: '',        accent: '#8b6f4e', bg: 'rgba(139,111,78,0.08)',  border: 'rgba(139,111,78,0.18)' },
  { name: 'PET PLATE',          sub: '',                     nameColor: '#7aadda', subColor: '',        accent: '#3d5a80', bg: 'rgba(61,90,128,0.08)',   border: 'rgba(61,90,128,0.18)' },
  { name: 'THE VITAMIN SHOPPE', sub: '',                     nameColor: '#7aadda', subColor: '',        accent: '#2a4470', bg: 'rgba(42,68,112,0.08)',   border: 'rgba(42,68,112,0.18)' },
  { name: 'MAGELLAN JETS',      sub: 'ELEVATE EXPECTATIONS', nameColor: '#d4a87a', subColor: '#c8956c', accent: '#c8956c', bg: 'rgba(200,149,108,0.06)', border: 'rgba(200,149,108,0.15)' },
  { name: '',                   sub: '',                     nameColor: '',        subColor: '',        accent: 'transparent', bg: 'transparent', border: 'transparent' },
  { name: '',                   sub: '',                     nameColor: '',        subColor: '',        accent: 'transparent', bg: 'transparent', border: 'transparent' },
];

const clientSlides: (typeof clientBrands)[] = [];
for (let i = 0; i < clientBrands.length; i += 3) {
  clientSlides.push(clientBrands.slice(i, i + 3));
}

/* ── Scroll-reveal hook (IntersectionObserver) ── */
function useScrollReveal() {
  const ref = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setIsVisible(true); obs.unobserve(el); } },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return { ref, isVisible };
}

function RevealSection({ children, className, style, delay = 0 }: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  delay?: number;
}) {
  const { ref, isVisible } = useScrollReveal();
  return (
    <section
      ref={ref}
      className={className}
      style={{
        ...style,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
        transition: `opacity 0.45s ease ${delay}s, transform 0.45s ease ${delay}s`,
      }}
    >
      {children}
    </section>
  );
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

  const toggleVideo = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setIsVideoPlaying(true); }
    else { v.pause(); setIsVideoPlaying(false); }
  }, []);

  /* Dark glass panel style — glossy silk finish */
  const glassPanel: React.CSSProperties = {
    background: 'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(200,149,108,0.12)',
    boxShadow: '0 4px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -1px 0 rgba(0,0,0,0.1)',
  };

  return (
    <div className="relative min-h-screen pb-[calc(8.5rem+env(safe-area-inset-bottom))] sm:pb-28" style={{ background: '#0a0a0a' }}>

      {/* ── Ambient glow orbs ── */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-[20%] top-[10%] h-[500px] w-[500px] rounded-full opacity-[0.04]" style={{ background: 'radial-gradient(circle, #c8956c, transparent 70%)' }} />
        <div className="absolute -right-[15%] top-[40%] h-[600px] w-[600px] rounded-full opacity-[0.03]" style={{ background: 'radial-gradient(circle, #d4a853, transparent 70%)' }} />
        <div className="absolute -left-[10%] bottom-[10%] h-[400px] w-[400px] rounded-full opacity-[0.03]" style={{ background: 'radial-gradient(circle, #9b7fb8, transparent 70%)' }} />
        {/* Noise texture */}
        <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")', backgroundRepeat: 'repeat', backgroundSize: '128px' }} />
      </div>

      <style>{`
        /* Glossy silk sheen on glass panels */
        .uh-glass-sheen {
          position: relative;
        }
        .uh-glass-sheen::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 40%, transparent 60%, rgba(255,255,255,0.03) 100%);
          pointer-events: none;
          z-index: 1;
        }
        /* Silk highlight line at top of panels */
        .uh-silk-edge {
          position: relative;
        }
        .uh-silk-edge::after {
          content: '';
          position: absolute;
          top: 0;
          left: 10%;
          right: 10%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(200,149,108,0.25), rgba(255,255,255,0.12), rgba(200,149,108,0.25), transparent);
          pointer-events: none;
          z-index: 2;
        }
        @media (prefers-reduced-motion: reduce) {
          .uh-motion-safe { transition: none !important; opacity: 1 !important; transform: none !important; }
        }
      `}</style>

      {showOnboarding && <OnboardingFlow onComplete={completeOnboarding} />}
      <Header onContactClick={() => setIsChatOpen(true)} />

      <main className="relative z-10 mx-auto max-w-6xl px-3 pt-3 sm:px-6 sm:pt-5">

        {/* ═══════════════════════════════════════════
            HERO — Cinematic Opening
        ═══════════════════════════════════════════ */}
        <RevealSection className="uh-glass-sheen uh-silk-edge mt-4 overflow-hidden rounded-3xl sm:mt-6" style={{
          ...glassPanel,
          boxShadow: '0 8px 48px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
        }}>
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
                  filter: 'contrast(1.08) saturate(1.1) brightness(0.92)',
                  transform: 'translateZ(0)',
                }}
                aria-label="Steadfast Digital introduction video"
              />
              {/* Cinematic vignette */}
              <div className="absolute inset-0" style={{
                background: 'linear-gradient(180deg, rgba(10,10,10,0.30) 0%, rgba(10,10,10,0.05) 35%, rgba(10,10,10,0.40) 75%, rgba(10,10,10,0.80) 100%)',
              }} />
              {/* Warm color wash */}
              <div className="absolute inset-0 mix-blend-soft-light opacity-15" style={{
                background: 'linear-gradient(135deg, #c8956c 0%, transparent 50%)',
              }} />
              {/* Bottom warm glow bleed */}
              <div className="absolute inset-x-0 bottom-0 h-20" style={{
                background: 'linear-gradient(to top, rgba(200,149,108,0.08), transparent)',
              }} />

              {/* Hero text */}
              <div className="absolute inset-x-0 bottom-0 px-5 pb-6 sm:px-8 sm:pb-8">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.3em] sm:text-xs" style={{ color: '#c8956c' }}>
                  Welcome to
                </p>
                <h2 className="text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl md:text-5xl" style={{
                  textShadow: '0 2px 24px rgba(0,0,0,0.5)',
                }}>
                  Steadfast Digital
                </h2>
                <p className="mt-2 max-w-md text-sm leading-relaxed sm:text-base" style={{ color: 'rgba(245,240,235,0.75)' }}>
                  Performance-led growth for startups and brands across paid media.
                </p>
              </div>

              {/* Play/pause control */}
              <button
                onClick={toggleVideo}
                className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full transition-all duration-300 hover:scale-110 sm:right-6 sm:top-6"
                style={{
                  background: 'rgba(10,10,10,0.40)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(200,149,108,0.25)',
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

          {/* Tagline */}
          <div className="px-5 py-7 text-center sm:px-10 sm:py-9">
            <h3 className="text-[1.5rem] font-extrabold leading-snug tracking-tight sm:text-[2.2rem] md:text-[2.6rem]" style={{ color: '#f5f0eb' }}>
              A digital marketing agency{' '}
              <span className="bg-gradient-to-r from-[#c8956c] to-[#a07550] bg-clip-text text-transparent">
                based in Florida
              </span>
            </h3>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed sm:mt-4 sm:text-base" style={{ color: '#a09080' }}>
              Steadfast helps B2B and B2C organizations navigate digital complexity with measurable growth outcomes.
            </p>
          </div>
        </RevealSection>

        {/* ═══════════════════════════════════════════
            QUICK ACCESS — Dark Glass Console
        ═══════════════════════════════════════════ */}
        <section className="uh-glass-sheen uh-silk-edge mt-5 overflow-hidden rounded-3xl px-4 py-6 sm:px-6 sm:py-7" style={glassPanel}>
          <p className="mb-1 text-center text-[0.62rem] font-bold uppercase tracking-[0.28em] sm:text-[0.7rem]" style={{ color: '#c8956c' }}>
            Quick Access
          </p>
          <h2 className="mb-5 text-center text-[1.1rem] font-extrabold sm:text-[1.25rem]" style={{ color: '#f5f0eb' }}>
            One-Tap Features
          </h2>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
            {quickLinkConfig.map((item) => (
              <QuickLinkCard key={item.title} item={item} />
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            AREAS OF FOCUS — Dark Gallery Wall
        ═══════════════════════════════════════════ */}
        <RevealSection delay={0.12} className="uh-glass-sheen uh-silk-edge mt-5 overflow-hidden rounded-3xl py-8 sm:py-10" style={glassPanel}>
          <div className="relative z-10 px-4 sm:px-6">
            <p className="mb-1 text-center text-[0.62rem] font-bold uppercase tracking-[0.28em] sm:text-[0.7rem]" style={{ color: '#c8956c' }}>
              Core Capabilities
            </p>
            <h2 className="mb-7 text-center text-[1.4rem] font-extrabold sm:mb-8 sm:text-[1.8rem]" style={{ color: '#f5f0eb' }}>
              Areas of Focus
            </h2>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-4 md:grid-cols-5">
              {focusAreas.map((area) => {
                const IconComponent = area.icon;
                return (
                  <div
                    key={area.title}
                    className="group relative min-h-[140px] cursor-default overflow-hidden rounded-2xl p-4 transition-all duration-300 hover:-translate-y-1.5 sm:min-h-[160px] sm:p-5"
                    style={{
                      background: `linear-gradient(145deg, ${area.bgFrom}, ${area.bgTo})`,
                      border: `1px solid ${area.color}20`,
                      boxShadow: `0 2px 16px ${area.color}08, inset 0 1px 0 rgba(255,255,255,0.04)`,
                    }}
                  >
                    {/* Hover glow */}
                    <div className="absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ boxShadow: `inset 0 0 30px ${area.color}12, 0 4px 20px ${area.color}15` }} />

                    {/* Badge */}
                    <div
                      className="absolute -right-1 -top-1 flex h-10 w-10 items-center justify-center rounded-full text-[10px] font-black text-white"
                      style={{
                        background: `linear-gradient(135deg, ${area.color}, ${area.accent})`,
                        boxShadow: `0 3px 12px ${area.color}40`,
                      }}
                    >
                      {area.badge}
                    </div>

                    {/* Icon */}
                    <div
                      className="relative z-10 mb-3 inline-flex rounded-xl p-2.5 transition-transform duration-300 group-hover:scale-105"
                      style={{
                        background: area.color,
                        color: 'white',
                        boxShadow: `0 3px 14px ${area.color}35`,
                      }}
                    >
                      <IconComponent size={20} strokeWidth={2.2} />
                    </div>

                    <h3 className="relative z-10 mb-1.5 text-[0.95rem] font-bold leading-tight" style={{ color: area.accent }}>
                      {area.title}
                    </h3>
                    <p className="relative z-10 text-xs font-medium leading-relaxed opacity-70 transition-opacity group-hover:opacity-100" style={{ color: '#b8a898' }}>
                      {area.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </RevealSection>

        {/* ═══════════════════════════════════════════
            CLIENTS — Dark Trust Wall
        ═══════════════════════════════════════════ */}
        <RevealSection delay={0.16} className="uh-glass-sheen uh-silk-edge mt-5 overflow-hidden rounded-3xl py-6 sm:py-8" style={glassPanel}>
          <div className="px-4 sm:px-6">
            <p className="mb-1 text-center text-[0.62rem] font-bold uppercase tracking-[0.28em] sm:text-[0.7rem]" style={{ color: '#c8956c' }}>
              Trusted by Leading Brands
            </p>
            <h2 className="mb-5 text-center text-[1.4rem] font-extrabold sm:mb-7 sm:text-[1.8rem]" style={{ color: '#f5f0eb' }}>
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
                          className="relative flex flex-1 cursor-default select-none flex-col items-center justify-center overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-1"
                          style={{
                            background: brand.bg,
                            border: `1.5px solid ${brand.border}`,
                            minHeight: '96px',
                            boxShadow: `0 2px 12px rgba(0,0,0,0.2)`,
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
              {/* Dot navigation */}
              <div className="mt-5 flex items-center justify-center gap-1.5">
                {clientSlides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setClientIndex(i)}
                    className="h-[5px] rounded-full transition-all duration-300"
                    style={{
                      width: i === clientIndex ? '22px' : '7px',
                      background: i === clientIndex ? '#c8956c' : 'rgba(200,149,108,0.25)',
                    }}
                    aria-label={`Show clients ${i * 3 + 1}–${Math.min(i * 3 + 3, 10)}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </RevealSection>

        {/* ═══════════════════════════════════════════
            APPROACH — Warm Closing Statement
        ═══════════════════════════════════════════ */}
        <RevealSection delay={0.2} className="uh-glass-sheen uh-silk-edge mb-3 mt-5 overflow-hidden rounded-3xl px-5 py-7 text-center sm:px-8 sm:py-8" style={{
          background: 'linear-gradient(145deg, rgba(200,149,108,0.10), rgba(200,149,108,0.04))',
          boxShadow: '0 8px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(200,149,108,0.10)',
          border: '1px solid rgba(200,149,108,0.18)',
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
        </RevealSection>
      </main>

      <Suspense fallback={null}>
        <LiveChatBox isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      </Suspense>
      <BottomNavigation />
    </div>
  );
}
