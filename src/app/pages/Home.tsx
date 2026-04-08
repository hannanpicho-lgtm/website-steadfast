import { Link } from 'react-router';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Globe,
  Handshake,
  Search,
  Share2,
  Sparkles,
  Target,
  Brain,
  Megaphone,
  Play,
  Pause,
  TrendingUp,
  Shield,
  Zap,
  Users,
  LineChart,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import logoImage from '../../assets/4b611159e2ff0ca97c6252bef878e480dedd2a43.png';

/* ─────────────────────────────────────────────────
 * DESIGN SYSTEM: Premium Dark + Warm Luxury
 *
 * Base BG:        #0a0a0a  (rich black)
 * Surface:        #141414  (elevated)
 * Card:           #1a1a1a  (container)
 * Warm Accent:    #c8956c  (terracotta / brass)
 * Gold:           #d4a853  (golden beige)
 * Sage:           #7a9b76  (muted green from plants)
 * Text Primary:   #f5f0eb  (warm off-white / cream)
 * Text Secondary: #a89f95  (warm grey)
 * Text Muted:     #6b635b  (earthy muted)
 * Border:         rgba(255,255,255,0.06)
 * Glow:           #c8956c at 8-12% opacity
 * ───────────────────────────────────────────────── */

/* ── Image paths (Pexels royalty-free, saved in public/) ── */
const IMAGES = {
  heroOffice:      '/hero-office.jpg',           // Warm home office with monitor, plants
  personWorking1:  '/person-working-1.jpg',      // Professional woman working at desk
  personWorking2:  '/person-working-2.jpg',      // Woman at home office desk
  dashboardLight:  '/dashboard-light.jpg',       // Laptop showing analytics dashboard
  dashboardDark:   '/dashboard-dark.jpg',        // Monitor with statistics / dark charts
  dashboardGrid:   '/dashboard-grid.jpg',        // Workspace with analytical graphs
} as const;

const focusAreas = [
  { title: 'Search',       desc: 'Google & Bing precision ROAS.',       icon: Search,    badge: '01' },
  { title: 'Paid Social',  desc: 'Meta, TikTok, Pinterest & LinkedIn.', icon: Share2,    badge: '02' },
  { title: 'Paid Content', desc: 'Taboola & Outbrain native reach.',    icon: Megaphone, badge: '03' },
  { title: 'Affiliate',    desc: 'Partner channels for buyers.',        icon: Handshake, badge: '04' },
  { title: 'Strategy',     desc: 'Data-driven growth guidance.',        icon: Brain,     badge: '05' },
];

const operatingModel = [
  { stage: '01', title: 'Map',      detail: 'Funnel economics, audience intent, LTV constraints.', icon: Target },
  { stage: '02', title: 'Activate', detail: 'Focused experiments with strict KPI gates.',           icon: Zap },
  { stage: '03', title: 'Scale',    detail: 'Winning playbooks automated into repeatable systems.', icon: TrendingUp },
];

const proofMetrics = [
  { label: 'Optimization Cycles / Week', value: '42+',   icon: LineChart },
  { label: 'Avg. Efficiency Lift',       value: '2.9×',  icon: TrendingUp },
  { label: 'Revenue Attribution',        value: '98%',   icon: Shield },
  { label: 'Daily Campaign Budget',      value: '$3.4M', icon: BarChart3 },
];

const featuredPrograms = [
  { name: 'Commerce Lift',    summary: 'Product-page and paid-media sync for conversion velocity.',  accent: '#c8956c' },
  { name: 'Retention Engine', summary: 'Lifecycle segmentation and reactivation for repeat margin.', accent: '#d4a853' },
  { name: 'Global Expansion', summary: 'Region-by-region sequencing with spend governance.',         accent: '#7a9b76' },
];

const trustedBy = [
  'ISAIA NAPOLI', 'GIADZY', 'OWLET', 'ROAR ORGANIC', 'BORGHESE', 'PET PLATE',
  'THE VITAMIN SHOPPE', 'MAGELLAN JETS', 'FANCHEST', 'BLAST', 'UBS', 'UNDP',
  'NYU LANGONE HEALTH', 'ORGANICGIRL',
];

const blogPosts = [
  { title: 'What is ad fatigue and how to detect it',           tag: 'Strategy' },
  { title: 'How to break into digital marketing',              tag: 'Career' },
  { title: 'Re-activate a disabled Meta Ad Account',           tag: 'Meta' },
  { title: '6 ways marketers are embracing AI',                tag: 'AI' },
  { title: "Did Performance Max save Google's ad crown?",      tag: 'Google' },
  { title: 'Is Google Ads worth it for small business?',       tag: 'Paid Search' },
];

const channelAttribution = [
  { channel: 'Google Ads',  share: 38, color: '#d4a853' },
  { channel: 'Meta Ads',    share: 31, color: '#c8956c' },
  { channel: 'TikTok Ads',  share: 24, color: '#7a9b76' },
  { channel: 'Other',       share: 7,  color: '#6b635b' },
];

/* ── Parallax hook — subtle scroll-based transform ── */
function useParallax(speed = 0.3) {
  const ref = useRef<HTMLDivElement>(null);
  const ticking = useRef(false);

  const onScroll = useCallback(() => {
    if (ticking.current) return;
    ticking.current = true;
    requestAnimationFrame(() => {
      if (ref.current) {
        const rect = ref.current.getBoundingClientRect();
        const offset = rect.top * speed;
        ref.current.style.transform = `translate3d(0, ${offset}px, 0)`;
      }
      ticking.current = false;
    });
  }, [speed]);

  useEffect(() => {
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [onScroll]);

  return ref;
}

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const parallaxHero = useParallax(0.25);
  const parallaxOffice = useParallax(0.2);

  /* ── Scroll-reveal observer ── */
  useEffect(() => {
    const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    if (!targets.length) return;
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('is-visible'); obs.unobserve(e.target); }
      }),
      { threshold: 0.1, rootMargin: '0px 0px -6% 0px' },
    );
    targets.forEach((t) => obs.observe(t));
    return () => obs.disconnect();
  }, []);

  const toggleVideo = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setIsVideoPlaying(true); }
    else { v.pause(); setIsVideoPlaying(false); }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f0eb]" style={{ fontFamily: '"Space Grotesk", "Sora", "Poppins", sans-serif' }}>

      {/* ── Global styles ── */}
      <style>{`
        /* Reveal animation */
        .sf-reveal {
          opacity: 0; transform: translateY(28px);
          transition: opacity 0.75s cubic-bezier(.22,1,.36,1), transform 0.75s cubic-bezier(.22,1,.36,1);
          transition-delay: var(--d, 0ms);
        }
        .sf-reveal.is-visible { opacity: 1; transform: translateY(0); }

        /* Hero entrance */
        @keyframes heroFadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .hero-enter { animation: heroFadeUp 0.9s cubic-bezier(.22,1,.36,1) both; animation-delay: var(--d, 0ms); }

        /* Ticker */
        @keyframes tickerScroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .ticker-belt { animation: tickerScroll 32s linear infinite; }

        /* Warm glow pulse — very subtle */
        @keyframes warmPulse {
          0%, 100% { opacity: 0.08; }
          50%      { opacity: 0.14; }
        }
        .warm-pulse { animation: warmPulse 6s ease-in-out infinite; }

        /* Reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .sf-reveal { opacity: 1; transform: none; transition: none; }
          .hero-enter { animation: none; opacity: 1; transform: none; }
          .ticker-belt { animation: none; }
          .warm-pulse  { animation: none; opacity: 0.1; }
        }

        /* Image warm filter */
        .img-warm { filter: contrast(1.04) saturate(0.9) brightness(0.92) sepia(0.08); }
      `}</style>

      {/* ── Ambient background ── */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="warm-pulse absolute -left-32 top-20 h-[500px] w-[500px] rounded-full bg-[#c8956c]/10 blur-[120px]" />
        <div className="warm-pulse absolute -right-20 top-1/3 h-[400px] w-[400px] rounded-full bg-[#d4a853]/8 blur-[100px]" style={{ animationDelay: '3s' }} />
        <div className="warm-pulse absolute bottom-0 left-1/3 h-[600px] w-[600px] rounded-full bg-[#7a9b76]/6 blur-[140px]" style={{ animationDelay: '1.5s' }} />
        {/* Subtle noise texture */}
        <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")' }} />
      </div>

      {/* ═══════════════════════════ HEADER ═══════════════════════════ */}
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#0a0a0a]/80 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5 sm:px-8 lg:px-12">
          <div className="flex items-center gap-3">
            <img
              src={logoImage}
              alt="Steadfast Digital logo"
              className="h-10 w-10 rounded-xl border border-white/10 bg-white/[0.04] p-1"
              width={40} height={40}
            />
            <div>
              <p className="text-sm font-black tracking-[0.1em] text-[#f5f0eb]">STEADFAST</p>
              <p className="text-[9px] uppercase tracking-[0.28em] text-[#c8956c]">Digital Growth Systems</p>
            </div>
          </div>
          <nav className="hidden items-center gap-8 text-[13px] font-medium text-[#a89f95] md:flex" aria-label="Main navigation">
            <a href="#model" className="transition-colors hover:text-[#f5f0eb]">Model</a>
            <a href="#programs" className="transition-colors hover:text-[#f5f0eb]">Programs</a>
            <a href="#focus" className="transition-colors hover:text-[#f5f0eb]">Focus</a>
            <a href="#clients" className="transition-colors hover:text-[#f5f0eb]">Clients</a>
            <a href="#insights" className="transition-colors hover:text-[#f5f0eb]">Insights</a>
          </nav>
          <div className="flex items-center gap-2.5">
            <Link to="/login" className="rounded-lg border border-[#c8956c]/30 px-4 py-2 text-xs font-semibold text-[#d4c4b0] transition hover:border-[#c8956c]/60 hover:bg-[#c8956c]/10 sm:text-sm">
              Sign In
            </Link>
            <Link to="/signup" className="rounded-lg bg-[#c8956c] px-4 py-2 text-xs font-bold text-[#0a0a0a] transition hover:bg-[#d4a87d] sm:text-sm">
              Start Free
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* ═══════════════════════════ HERO ═══════════════════════════ */}
        <section className="relative min-h-[92vh] overflow-hidden" aria-label="Hero section">
          {/* Parallax background image */}
          <div ref={parallaxHero} className="absolute inset-0 -top-16 -z-10 will-change-transform">
            <img
              src={IMAGES.heroOffice}
              alt="Warm minimal workspace with wooden desk and plants"
              className="img-warm absolute inset-0 h-[120%] w-full object-cover"
              loading="eager"
              decoding="async"
            />
            {/* Dark overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/75 via-[#0a0a0a]/60 to-[#0a0a0a]" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a]/50 to-transparent" />
          </div>

          <div className="mx-auto flex max-w-7xl flex-col items-center px-5 pb-20 pt-24 sm:px-8 md:pt-32 lg:flex-row lg:items-center lg:gap-16 lg:px-12 lg:pt-36">
            {/* Left — copy */}
            <div className="max-w-2xl lg:max-w-xl">
              <p className="hero-enter mb-5 inline-flex items-center gap-2 rounded-full border border-[#c8956c]/25 bg-[#c8956c]/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#d4a87d]" style={{ '--d': '100ms' } as React.CSSProperties}>
                <Sparkles size={13} />
                Growth Platform
              </p>

              <h1 className="hero-enter text-4xl font-black leading-[1.08] sm:text-5xl lg:text-[3.6rem]" style={{ '--d': '200ms' } as React.CSSProperties}>
                Marketing as a{' '}
                <span className="bg-gradient-to-r from-[#c8956c] via-[#d4a853] to-[#7a9b76] bg-clip-text text-transparent">
                  Revenue System
                </span>
              </h1>

              <p className="hero-enter mt-6 max-w-lg text-base leading-relaxed text-[#a89f95] sm:text-lg" style={{ '--d': '300ms' } as React.CSSProperties}>
                One operating system for scalable e-commerce growth — precision channels, compounding returns, no guesswork.
              </p>

              <div className="hero-enter mt-9 flex flex-wrap items-center gap-3" style={{ '--d': '400ms' } as React.CSSProperties}>
                <Link to="/signup" className="group inline-flex items-center gap-2.5 rounded-xl bg-[#c8956c] px-7 py-3.5 text-sm font-extrabold uppercase tracking-[0.08em] text-[#0a0a0a] shadow-[0_8px_30px_rgba(200,149,108,0.25)] transition hover:bg-[#d4a87d] hover:shadow-[0_12px_40px_rgba(200,149,108,0.35)]">
                  Get Started
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                </Link>
                <a href="#proof" className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-6 py-3.5 text-sm font-semibold text-[#d4c4b0] backdrop-blur-sm transition hover:bg-white/[0.08]">
                  <CheckCircle2 size={16} className="text-[#c8956c]" />
                  View Proof
                </a>
              </div>

              {/* Mini trust strip */}
              <div className="hero-enter mt-10 flex items-center gap-4" style={{ '--d': '500ms' } as React.CSSProperties}>
                <div className="flex -space-x-2">
                  {[Users, Shield, TrendingUp].map((Icon, i) => (
                    <span key={i} className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#0a0a0a] bg-[#1a1a1a]">
                      <Icon size={13} className="text-[#c8956c]" />
                    </span>
                  ))}
                </div>
                <p className="text-xs text-[#6b635b]">
                  <span className="font-bold text-[#a89f95]">2,847</span> active users · <span className="font-bold text-[#a89f95]">$3.4M</span> daily budget managed
                </p>
              </div>
            </div>

            {/* Right — dashboard preview with video */}
            <div className="hero-enter mt-14 w-full max-w-xl lg:mt-0" style={{ '--d': '450ms' } as React.CSSProperties}>
              <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111]/80 shadow-[0_40px_100px_rgba(0,0,0,0.6),0_0_60px_rgba(200,149,108,0.08)]">
                {/* Dashboard screenshot */}
                <div className="relative">
                  <img
                    src={IMAGES.dashboardDark}
                    alt="Steadfast analytics dashboard showing revenue charts and performance metrics"
                    className="w-full object-cover"
                    loading="eager"
                    decoding="async"
                    style={{ maxHeight: '380px' }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-transparent to-transparent" />
                </div>
                {/* Video strip at bottom */}
                <div className="relative h-[100px] overflow-hidden">
                  <video
                    ref={videoRef}
                    src="/banner-cdc94d47.mp4"
                    autoPlay muted loop playsInline preload="metadata"
                    className="img-warm absolute inset-0 h-full w-full object-cover"
                    aria-label="Steadfast Digital brand video"
                  />
                  <div className="absolute inset-0 bg-[#0a0a0a]/40" />
                  <button
                    onClick={toggleVideo}
                    className="absolute bottom-3 right-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/10 backdrop-blur-md transition hover:scale-110"
                    style={{ border: '1px solid rgba(255,255,255,0.12)' }}
                    aria-label={isVideoPlaying ? 'Pause video' : 'Play video'}
                  >
                    {isVideoPlaying
                      ? <Pause size={11} className="text-white/70" />
                      : <Play size={11} className="ml-0.5 text-white/70" />
                    }
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom fade */}
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
        </section>

        {/* ═══════════════════════════ PROOF METRICS ═══════════════════════════ */}
        <section id="proof" className="relative border-t border-white/[0.06] bg-[#0c0c0c] py-16" aria-label="Performance metrics">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
            <p className="sf-reveal mb-10 text-center text-[11px] font-semibold uppercase tracking-[0.25em] text-[#c8956c]" data-reveal>
              Performance Signal Board
            </p>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {proofMetrics.map((m, i) => {
                const Icon = m.icon;
                return (
                  <div
                    key={m.label}
                    className="sf-reveal group rounded-2xl border border-white/[0.06] bg-[#141414] p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:border-[#c8956c]/20 hover:shadow-[0_8px_40px_rgba(200,149,108,0.06)]"
                    data-reveal
                    style={{ '--d': `${i * 80}ms` } as React.CSSProperties}
                  >
                    <Icon size={20} className="mx-auto mb-3 text-[#6b635b] transition-colors group-hover:text-[#c8956c]" />
                    <p className="text-3xl font-black text-[#f5f0eb] sm:text-4xl">{m.value}</p>
                    <p className="mt-2 text-[11px] leading-snug text-[#6b635b]">{m.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════ TRUSTED BY — Ticker ═══════════════════════════ */}
        <section className="border-y border-white/[0.06] py-10" aria-label="Trusted by">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
            <p className="sf-reveal mb-6 text-center text-[11px] font-semibold uppercase tracking-[0.25em] text-[#6b635b]" data-reveal>
              Trusted by Industry Leaders
            </p>
            <div className="sf-reveal overflow-hidden" data-reveal style={{ '--d': '80ms' } as React.CSSProperties}>
              <div className="ticker-belt flex w-[200%] gap-3">
                {[...trustedBy, ...trustedBy].map((brand, idx) => (
                  <div
                    key={`${brand}-${idx}`}
                    className="min-w-[140px] rounded-xl border border-white/[0.06] bg-[#141414] px-4 py-3.5 text-center text-[11px] font-bold uppercase tracking-[0.12em] text-[#6b635b] transition hover:border-[#c8956c]/20 hover:text-[#a89f95]"
                  >
                    {brand}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════ VISUAL SHOWCASE — Person Working ═══════════════════════════ */}
        <section className="relative overflow-hidden py-20" aria-label="About our approach">
          <div ref={parallaxOffice} className="absolute inset-0 -top-12 -z-10 will-change-transform">
            <img
              src={IMAGES.personWorking1}
              alt="Professional woman working at desk with focused attention"
              className="img-warm absolute inset-0 h-[120%] w-full object-cover object-top"
              loading="lazy"
              decoding="async"
            />
            <div className="absolute inset-0 bg-[#0a0a0a]/80" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/70 to-transparent" />
          </div>

          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
            <div className="max-w-xl">
              <p className="sf-reveal text-[11px] font-semibold uppercase tracking-[0.25em] text-[#c8956c]" data-reveal>
                Built for Performance
              </p>
              <h2 className="sf-reveal mt-4 text-3xl font-black text-[#f5f0eb] sm:text-4xl lg:text-5xl" data-reveal style={{ '--d': '80ms' } as React.CSSProperties}>
                Precision at Every Level
              </h2>
              <p className="sf-reveal mt-5 text-base leading-relaxed text-[#a89f95]" data-reveal style={{ '--d': '160ms' } as React.CSSProperties}>
                Our team combines deep channel expertise with real-time attribution to create campaigns that compound. No vanity metrics — only revenue outcomes.
              </p>
              <div className="sf-reveal mt-8 grid grid-cols-2 gap-4" data-reveal style={{ '--d': '240ms' } as React.CSSProperties}>
                {[
                  { stat: '98%', label: 'Revenue attributed' },
                  { stat: '2.9×', label: 'Efficiency lift' },
                  { stat: '42+', label: 'Weekly cycles' },
                  { stat: '14+', label: 'Enterprise clients' },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl border border-white/[0.06] bg-[#0a0a0a]/60 p-4 backdrop-blur-sm">
                    <p className="text-xl font-black text-[#c8956c]">{s.stat}</p>
                    <p className="mt-1 text-[11px] text-[#6b635b]">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════ OPERATING MODEL ═══════════════════════════ */}
        <section id="model" className="border-t border-white/[0.06] bg-[#0c0c0c] py-20" aria-label="Operating model">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
            <div className="sf-reveal mb-14 max-w-xl" data-reveal>
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#c8956c]">Operating Model</p>
              <h2 className="mt-3 text-3xl font-black text-[#f5f0eb] sm:text-4xl">How We Compound Growth</h2>
              <p className="mt-4 text-[#a89f95]">Every stage is KPI-gated. Nothing scales without proof.</p>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {operatingModel.map((step, i) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.stage}
                    className="sf-reveal group rounded-2xl border border-white/[0.06] bg-[#141414] p-7 transition-all duration-300 hover:-translate-y-1 hover:border-[#c8956c]/20 hover:shadow-[0_12px_50px_rgba(200,149,108,0.06)]"
                    data-reveal
                    style={{ '--d': `${i * 100}ms` } as React.CSSProperties}
                  >
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#c8956c]/10 text-xs font-black text-[#c8956c] transition-colors group-hover:bg-[#c8956c] group-hover:text-[#0a0a0a]">
                        {step.stage}
                      </span>
                      <Icon size={18} className="text-[#6b635b] transition-colors group-hover:text-[#c8956c]" />
                    </div>
                    <h3 className="mt-5 text-lg font-bold uppercase tracking-[0.1em] text-[#d4c4b0]">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#a89f95]">{step.detail}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════ STRATEGIC INSIGHTS ═══════════════════════════ */}
        <section id="insights" className="border-t border-white/[0.06] py-20" aria-label="Strategic insights">
          <div className="mx-auto max-w-7xl space-y-24 px-5 sm:px-8 lg:px-12">

            {/* Row 1: Dashboard image (left) + Channel Mastery (right) */}
            <div className="sf-reveal grid items-center gap-12 lg:grid-cols-2" data-reveal>
              <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] shadow-[0_30px_80px_rgba(0,0,0,0.5),0_0_40px_rgba(200,149,108,0.04)]">
                <img
                  src={IMAGES.dashboardLight}
                  alt="Revenue analytics dashboard with overview charts and traffic sources"
                  className="img-warm w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a]/40 to-transparent" />
              </div>

              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#c8956c]/20 bg-[#c8956c]/8 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#c8956c]">
                  <BarChart3 size={12} />
                  Channel Mastery
                </span>
                <h2 className="mt-5 text-3xl font-black text-[#f5f0eb] sm:text-4xl">Strategic Insights</h2>
                <p className="mt-4 text-base leading-relaxed text-[#a89f95]">
                  Mastering Google, Meta, and TikTok demands channel expertise and a holistic approach. Algorithms evolve, audiences fragment — we navigate it all.
                </p>

                {/* Attribution bars */}
                <div className="mt-8 space-y-3">
                  {channelAttribution.map((ch) => (
                    <div key={ch.channel} className="flex items-center gap-3">
                      <span className="w-24 shrink-0 text-xs font-medium text-[#6b635b]">{ch.channel}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${ch.share}%`, backgroundColor: ch.color }} />
                      </div>
                      <span className="w-8 text-right text-xs font-bold text-[#a89f95]">{ch.share}%</span>
                    </div>
                  ))}
                </div>

                <Link to="/signup" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#c8956c] px-6 py-3 text-sm font-black uppercase tracking-[0.08em] text-[#0a0a0a] shadow-[0_6px_24px_rgba(200,149,108,0.2)] transition hover:bg-[#d4a87d]">
                  Start Building <ArrowRight size={16} />
                </Link>
              </div>
            </div>

            {/* Row 2: Personalized Tactics (left) + Person working image (right) */}
            <div className="sf-reveal grid items-center gap-12 lg:grid-cols-2" data-reveal style={{ '--d': '80ms' } as React.CSSProperties}>
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d4a853]/20 bg-[#d4a853]/8 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#d4a853]">
                  <Sparkles size={12} />
                  Audience-First
                </span>
                <h2 className="mt-5 text-3xl font-black text-[#f5f0eb] sm:text-4xl">Personalized Tactics</h2>
                <p className="mt-4 text-base leading-relaxed text-[#a89f95]">
                  We craft personalized copy and experiences tuned to your audience's intent — no one-size-fits-all. Precision at scale.
                </p>

                {/* Audience segments */}
                <div className="mt-8 space-y-2.5">
                  {([
                    { segment: 'High-Intent Buyers', count: '12.4k', color: 'bg-[#c8956c]' },
                    { segment: 'Cart Abandoners',    count: '8.1k',  color: 'bg-[#d4a853]' },
                    { segment: 'Loyalty Tier',       count: '5.7k',  color: 'bg-[#7a9b76]' },
                    { segment: 'Lookalike Seeds',    count: '23.9k', color: 'bg-[#a89f95]' },
                  ] as const).map((s) => (
                    <div key={s.segment} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-[#141414] px-4 py-3">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${s.color}`} />
                      <span className="flex-1 text-xs text-[#a89f95]">{s.segment}</span>
                      <span className="text-xs font-bold text-[#d4c4b0]">{s.count}</span>
                    </div>
                  ))}
                </div>

                <Link to="/signup" className="mt-8 inline-flex items-center gap-2 rounded-xl border border-[#d4a853]/30 bg-[#d4a853]/10 px-6 py-3 text-sm font-bold text-[#d4a853] transition hover:bg-[#d4a853]/20">
                  See How <ArrowRight size={16} />
                </Link>
              </div>

              <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] shadow-[0_30px_80px_rgba(0,0,0,0.5),0_0_40px_rgba(200,149,108,0.04)]">
                <img
                  src={IMAGES.personWorking2}
                  alt="Professional strategist working at computer with planning board in background"
                  className="img-warm w-full object-cover"
                  loading="lazy"
                  decoding="async"
                  style={{ maxHeight: '440px' }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a]/30 to-transparent" />
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════ AREAS OF FOCUS ═══════════════════════════ */}
        <section id="focus" className="border-t border-white/[0.06] bg-[#0c0c0c] py-20" aria-label="Areas of focus">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
            <div className="sf-reveal mb-12 text-center" data-reveal>
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#c8956c]">Core Capabilities</p>
              <h2 className="mt-3 text-3xl font-black text-[#f5f0eb] sm:text-4xl">Areas of Focus</h2>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {focusAreas.map((area, i) => {
                const Icon = area.icon;
                const isFirst = i === 0;
                return (
                  <article
                    key={area.title}
                    className={`sf-reveal group rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 ${
                      isFirst
                        ? 'bg-[#c8956c] text-[#0a0a0a] shadow-[0_12px_40px_rgba(200,149,108,0.25)]'
                        : 'border border-white/[0.06] bg-[#141414] hover:border-[#c8956c]/20 hover:shadow-[0_8px_40px_rgba(200,149,108,0.06)]'
                    }`}
                    data-reveal
                    style={{ '--d': `${i * 70}ms` } as React.CSSProperties}
                  >
                    <div className={`mb-3 inline-flex rounded-xl p-2.5 ${isFirst ? 'bg-[#0a0a0a]/15' : 'bg-[#c8956c]/10'}`}>
                      <Icon size={18} className={isFirst ? 'text-[#0a0a0a]' : 'text-[#c8956c]'} />
                    </div>
                    <h3 className={`text-base font-bold ${isFirst ? 'text-[#0a0a0a]' : 'text-[#f5f0eb]'}`}>{area.title}</h3>
                    <p className={`mt-2 text-sm leading-relaxed ${isFirst ? 'text-[#0a0a0a]/70' : 'text-[#6b635b]'}`}>{area.desc}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════ FLAGSHIP PROGRAMS ═══════════════════════════ */}
        <section id="programs" className="border-t border-white/[0.06] py-20" aria-label="Flagship programs">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
            <div className="sf-reveal mb-12" data-reveal>
              <h2 className="text-3xl font-black text-[#f5f0eb] sm:text-4xl">Flagship Programs</h2>
              <p className="mt-3 max-w-lg text-[#a89f95]">Fast to deploy. Safe to scale.</p>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {featuredPrograms.map((p, i) => (
                <article
                  key={p.name}
                  className="sf-reveal group overflow-hidden rounded-2xl border border-white/[0.06] bg-[#141414] transition-all duration-300 hover:-translate-y-1 hover:border-[#c8956c]/20"
                  data-reveal
                  style={{ '--d': `${i * 100}ms` } as React.CSSProperties}
                >
                  <div className="h-1.5" style={{ background: `linear-gradient(to right, ${p.accent}, ${p.accent}88)` }} />
                  <div className="p-6">
                    <h3 className="text-lg font-black text-[#f5f0eb]">{p.name}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-[#a89f95]">{p.summary}</p>
                    <p className="mt-5 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: p.accent }}>
                      Production-ready <CheckCircle2 size={13} />
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════ DASHBOARD SHOWCASE ═══════════════════════════ */}
        <section className="border-t border-white/[0.06] bg-[#0c0c0c] py-20" aria-label="Dashboard showcase">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
            <div className="sf-reveal mb-12 text-center" data-reveal>
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#c8956c]">Platform Preview</p>
              <h2 className="mt-3 text-3xl font-black text-[#f5f0eb] sm:text-4xl">Built for Modern Teams</h2>
              <p className="mx-auto mt-4 max-w-lg text-[#a89f95]">Enterprise-grade dashboards designed for clarity and speed.</p>
            </div>

            <div className="sf-reveal relative mx-auto max-w-5xl overflow-hidden rounded-2xl border border-white/[0.08] shadow-[0_40px_100px_rgba(0,0,0,0.5),0_0_60px_rgba(200,149,108,0.06)]" data-reveal style={{ '--d': '100ms' } as React.CSSProperties}>
              <img
                src={IMAGES.dashboardGrid}
                alt="Collection of e-commerce dashboard templates showing various analytics views"
                className="img-warm w-full object-cover"
                loading="lazy"
                decoding="async"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c0c] via-transparent to-transparent opacity-60" />
              <div className="absolute bottom-0 left-0 right-0 p-8">
                <Link to="/signup" className="inline-flex items-center gap-2 rounded-xl bg-[#c8956c] px-6 py-3 text-sm font-bold text-[#0a0a0a] shadow-[0_6px_24px_rgba(200,149,108,0.3)] transition hover:bg-[#d4a87d]">
                  Explore the Platform <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════ CLIENTS GRID ═══════════════════════════ */}
        <section id="clients" className="border-t border-white/[0.06] py-20" aria-label="Our clients">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
            <div className="sf-reveal mb-10 text-center" data-reveal>
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#6b635b]">Our Clients</p>
              <h2 className="mt-3 text-3xl font-black text-[#f5f0eb] sm:text-4xl">Trusted Partners</h2>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
              {trustedBy.map((brand, i) => (
                <div
                  key={brand}
                  className="sf-reveal rounded-2xl border border-white/[0.06] bg-[#141414] px-3 py-5 text-center text-[10px] font-black uppercase tracking-[0.12em] text-[#6b635b] transition-all duration-300 hover:-translate-y-1 hover:border-[#c8956c]/20 hover:text-[#a89f95]"
                  data-reveal
                  style={{ '--d': `${i * 30}ms` } as React.CSSProperties}
                >
                  {brand}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════ BLOG ═══════════════════════════ */}
        <section className="border-t border-white/[0.06] bg-[#0c0c0c] py-20" aria-label="Latest insights">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
            <div className="sf-reveal mb-10 flex items-end justify-between gap-4" data-reveal>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#c8956c]">Knowledge Base</p>
                <h2 className="mt-3 text-3xl font-black text-[#f5f0eb] sm:text-4xl">Latest Insights</h2>
              </div>
              <a href="#blog" className="hidden items-center gap-2 text-sm font-semibold text-[#6b635b] transition hover:text-[#c8956c] md:flex">
                All Articles <ChevronRight size={16} />
              </a>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {blogPosts.map((post, i) => (
                <article
                  key={post.title}
                  className="sf-reveal group overflow-hidden rounded-2xl border border-white/[0.06] bg-[#141414] transition-all duration-300 hover:-translate-y-1 hover:border-[#c8956c]/20"
                  data-reveal
                  style={{ '--d': `${i * 70}ms` } as React.CSSProperties}
                >
                  <div className="flex h-28 items-end bg-gradient-to-br from-[#1a1410] to-[#0d0a08] p-4">
                    <div className="flex items-center gap-2 rounded-lg bg-[#0a0a0a]/60 px-2.5 py-1.5 backdrop-blur-sm">
                      <BookOpen size={12} className="text-[#c8956c]" />
                      <span className="text-[10px] font-semibold text-[#6b635b]">{post.tag}</span>
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="text-sm font-bold leading-snug text-[#d4c4b0] transition group-hover:text-[#f5f0eb]">{post.title}</h3>
                    <a href="#blog" className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#c8956c] transition hover:text-[#d4a87d]">
                      Read More <ChevronRight size={12} />
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════ FINAL CTA ═══════════════════════════ */}
        <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-12" aria-label="Call to action">
          <div className="sf-reveal overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-[#1a1410] via-[#141010] to-[#0f0d0a] p-10 shadow-[0_40px_100px_rgba(0,0,0,0.5),0_0_80px_rgba(200,149,108,0.06)] sm:p-14" data-reveal>
            <div className="grid gap-10 lg:grid-cols-[1.3fr_0.7fr] lg:items-center">
              <div>
                <p className="inline-flex items-center gap-2 rounded-full border border-[#c8956c]/25 bg-[#c8956c]/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#c8956c]">
                  <Globe size={13} />
                  Ready to Launch
                </p>
                <h2 className="mt-5 text-3xl font-black text-[#f5f0eb] sm:text-4xl lg:text-5xl">
                  Your growth stack is one click away.
                </h2>
                <p className="mt-5 max-w-xl text-base text-[#a89f95]">
                  High trust. Fast comprehension. Decisive action.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <Link to="/signup" className="inline-flex items-center justify-center gap-2.5 rounded-xl bg-[#c8956c] px-6 py-4 text-sm font-black uppercase tracking-[0.09em] text-[#0a0a0a] shadow-[0_8px_30px_rgba(200,149,108,0.25)] transition hover:bg-[#d4a87d]">
                  Create your account <ArrowRight size={16} />
                </Link>
                <Link to="/login" className="inline-flex items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] px-6 py-3.5 text-sm font-semibold text-[#d4c4b0] transition hover:bg-white/[0.08]">
                  Access dashboard
                </Link>
              </div>
            </div>
          </div>

          <footer className="mt-10 text-center text-xs text-[#3d3731]">
            © 2026 Steadfast Digital, Inc.
          </footer>
        </section>
      </main>
    </div>
  );
}
