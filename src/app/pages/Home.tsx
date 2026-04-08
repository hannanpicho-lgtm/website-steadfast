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
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import logoImage from '../../assets/4b611159e2ff0ca97c6252bef878e480dedd2a43.png';

/*
 * ─── DESIGN SYSTEM: "Golden Hour Atelier" ───
 *
 * Palette inherited from UserHome — travertine stone,
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

const focusAreas = [
  {
    title: 'Search Engine Marketing',
    desc: 'Google & Bing Ads built for precision targeting and maximizing ROAS.',
    icon: Search,
    color: '#c8956c',
    bgFrom: '#fdf6ef',
    bgTo: '#f9ede0',
    accent: '#a07550',
    badge: '01',
  },
  {
    title: 'Paid Social',
    desc: 'Meta, TikTok, Pinterest & LinkedIn — right audience, right moment.',
    icon: Share2,
    color: '#9b7fb8',
    bgFrom: '#f5f0fa',
    bgTo: '#ede4f5',
    accent: '#7c5fa0',
    badge: '02',
  },
  {
    title: 'Paid Content',
    desc: 'Taboola & Outbrain placements that expand qualified reach.',
    icon: Megaphone,
    color: '#d4935a',
    bgFrom: '#fef3e8',
    bgTo: '#fce8d2',
    accent: '#b87a40',
    badge: '03',
  },
  {
    title: 'Affiliate Marketing',
    desc: 'Partnership channels aligned to core buyers for scaling reach.',
    icon: Handshake,
    color: '#6a9e7e',
    bgFrom: '#f0f7f2',
    bgTo: '#dff0e4',
    accent: '#4d7d5f',
    badge: '04',
  },
  {
    title: 'Strategy & Insights',
    desc: 'Unified data guiding budget allocation and growth pace.',
    icon: Brain,
    color: '#7a8db8',
    bgFrom: '#f0f3fa',
    bgTo: '#e2e8f4',
    accent: '#5a6f96',
    badge: '05',
  },
];

const operatingModel = [
  {
    stage: '01',
    title: 'Map',
    detail: 'We model your funnel economics, audience intent, and lifetime-value constraints.',
    color: '#c8956c',
  },
  {
    stage: '02',
    title: 'Activate',
    detail: 'We deploy focused experiments with strict KPI gates and rapid optimization intervals.',
    color: '#9b7fb8',
  },
  {
    stage: '03',
    title: 'Scale',
    detail: 'Winning playbooks are automated into repeatable systems with controlled expansion.',
    color: '#6a9e7e',
  },
];

const proofMetrics = [
  { label: 'Optimization Cycles / Week', value: '42+', color: '#c8956c' },
  { label: 'Avg. Efficiency Lift', value: '2.9×', color: '#9b7fb8' },
  { label: 'Revenue Attribution Clarity', value: '98%', color: '#6a9e7e' },
  { label: 'Managed Daily Campaign Budget', value: '$3.4M', color: '#d4935a' },
];

const featuredPrograms = [
  {
    name: 'Commerce Lift Blueprint',
    summary: 'Product-page and paid-media synchronization for conversion velocity.',
    color: '#c8956c',
    accent: '#a07550',
  },
  {
    name: 'Retention Compounding System',
    summary: 'Lifecycle segmentation and reactivation loops for repeat margin growth.',
    color: '#9b7fb8',
    accent: '#7c5fa0',
  },
  {
    name: 'Global Demand Expansion',
    summary: 'Region-by-region entry sequencing with spend governance and local signal tuning.',
    color: '#6a9e7e',
    accent: '#4d7d5f',
  },
];

const clientBrands = [
  { name: 'ISAIA NAPOLI',         nameColor: '#993333', bg: '#fdf9f7', border: '#e8d4d4' },
  { name: 'GIADZY',               nameColor: '#993333', bg: '#fdf9f7', border: '#e8d4d4' },
  { name: 'OWLET',                nameColor: '#2c2117', bg: '#faf8f5', border: '#e8e0d4' },
  { name: 'ROAR ORGANIC',         nameColor: '#2c2117', bg: '#faf8f5', border: '#e8e0d4' },
  { name: 'BORGHESE',             nameColor: '#8b6f4e', bg: '#faf8f5', border: '#e8e0d4' },
  { name: 'PET PLATE',            nameColor: '#3d5a80', bg: '#f7f9fc', border: '#d4dfe8' },
  { name: 'THE VITAMIN SHOPPE',   nameColor: '#2a4470', bg: '#f7f9fc', border: '#d4dfe8' },
  { name: 'MAGELLAN JETS',        nameColor: '#8b6f4e', bg: '#fdf8f2', border: '#e8d8c4' },
  { name: 'FANCHEST',             nameColor: '#faf8f5', bg: '#1a1410', border: '#3d3228' },
  { name: 'BLAST',                nameColor: '#2c2117', bg: '#f5f3f0', border: '#ddd8d0' },
  { name: 'UBS',                  nameColor: '#8b2222', bg: '#fdf9f7', border: '#e8d4d4' },
  { name: 'UNDP',                 nameColor: '#3d5a80', bg: '#f7f9fc', border: '#d4dfe8' },
  { name: 'NYU LANGONE HEALTH',   nameColor: '#3d5a80', bg: '#f7f9fc', border: '#d4dfe8' },
  { name: 'ORGANICGIRL',          nameColor: '#4d7d5f', bg: '#f0f7f2', border: '#d4e8d4' },
];

const blogPosts = [
  { title: 'What is ad fatigue and how to detect it', accent: '#c8956c' },
  { title: 'How To Hack Your Way into Digital Marketing', accent: '#9b7fb8' },
  { title: 'Ways to re-activate a disabled Meta Ad Account', accent: '#d4935a' },
  { title: '6 Ways Digital Marketers Are Embracing AI', accent: '#6a9e7e' },
  { title: "Did Performance Max Save Google's Ad Crown?", accent: '#7a8db8' },
  { title: 'Is Google Ads Worth It For Small Business?', accent: '#8b6f4e' },
];

const channelAttribution = [
  { channel: 'Google Ads', share: 38, color: '#c8956c' },
  { channel: 'Meta Ads', share: 31, color: '#9b7fb8' },
  { channel: 'TikTok Ads', share: 24, color: '#d4935a' },
  { channel: 'Other', share: 7, color: '#6a9e7e' },
];

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);

  useEffect(() => {
    const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );

    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  }, []);

  const toggleVideo = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setIsVideoPlaying(true); }
    else { v.pause(); setIsVideoPlaying(false); }
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #faf8f5 0%, #f3efe8 100%)' }}>
      <style>{`
        .gh-reveal {
          opacity: 0;
          transform: translateY(22px);
          transition: opacity 0.7s ease, transform 0.7s ease;
          transition-delay: var(--reveal-delay, 0ms);
        }
        .gh-reveal.is-visible {
          opacity: 1;
          transform: translateY(0);
        }
        @keyframes gh-fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .gh-hero-fade {
          animation: gh-fadeUp 0.8s ease both;
          animation-delay: var(--hero-delay, 0ms);
        }
        @keyframes gh-ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .gh-ticker-track {
          animation: gh-ticker 28s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .gh-reveal { opacity: 1; transform: none; transition: none; }
          .gh-hero-fade { animation: none; opacity: 1; transform: none; }
          .gh-ticker-track { animation: none; }
        }
      `}</style>

      {/* ═══════════════════════════════════════════
          HEADER — Warm brass-trimmed navigation
      ═══════════════════════════════════════════ */}
      <header className="sticky top-0 z-30 backdrop-blur-xl" style={{
        background: 'rgba(250,248,245,0.88)',
        borderBottom: '1px solid #e8e0d4',
      }}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-10">
          <div className="flex items-center gap-3">
            <img
              src={logoImage}
              alt="Steadfast Digital"
              className="h-11 w-11 rounded-xl p-1"
              style={{
                border: '1.5px solid #e8e0d4',
                background: '#ffffff',
                boxShadow: '0 2px 8px rgba(44,33,23,0.06)',
              }}
            />
            <div>
              <p className="text-base font-black tracking-[0.08em]" style={{ color: '#2c2117' }}>STEADFAST</p>
              <p className="text-[10px] uppercase tracking-[0.26em]" style={{ color: '#c8956c' }}>Digital Growth Systems</p>
            </div>
          </div>
          <nav className="hidden items-center gap-7 text-sm font-medium md:flex" style={{ color: '#7a6d5e' }}>
            <a href="#model" className="transition-colors hover:text-[#2c2117]">Model</a>
            <a href="#programs" className="transition-colors hover:text-[#2c2117]">Programs</a>
            <a href="#focus" className="transition-colors hover:text-[#2c2117]">Focus</a>
            <a href="#clients" className="transition-colors hover:text-[#2c2117]">Clients</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="rounded-xl px-4 py-2 text-xs font-semibold transition sm:text-sm"
              style={{
                color: '#8b6f4e',
                border: '1.5px solid #e8e0d4',
                background: 'transparent',
              }}
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              className="rounded-xl px-4 py-2 text-xs font-bold text-white transition hover:opacity-90 sm:text-sm"
              style={{ background: 'linear-gradient(135deg, #c8956c, #a07550)' }}
            >
              Start Free
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* ═══════════════════════════════════════════
            HERO — The Gallery Moment
            Same warm framing as UserHome — cinematic
            video with walnut overlays and brass text.
        ═══════════════════════════════════════════ */}
        <section className="mx-auto max-w-7xl px-3 pt-4 sm:px-6 sm:pt-6 lg:px-10">
          <div className="overflow-hidden rounded-3xl gh-hero-fade" style={{
            background: '#ffffff',
            boxShadow: '0 8px 40px rgba(44,33,23,0.08), 0 1px 3px rgba(44,33,23,0.04)',
            border: '1px solid #e8e0d4',
            '--hero-delay': '80ms',
          } as React.CSSProperties}>
            <div className="relative">
              <div className="relative h-[260px] overflow-hidden sm:h-[360px] md:h-[440px] lg:h-[500px]">
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
                  aria-label="Steadfast Digital brand video"
                />
                {/* Golden hour cinematic overlay */}
                <div className="absolute inset-0" style={{
                  background: 'linear-gradient(180deg, rgba(26,20,16,0.06) 0%, rgba(26,20,16,0.02) 30%, rgba(26,20,16,0.30) 65%, rgba(26,20,16,0.72) 100%)',
                }} />
                <div className="absolute inset-0 mix-blend-soft-light opacity-18" style={{
                  background: 'linear-gradient(135deg, #c8956c 0%, transparent 50%)',
                }} />

                {/* Hero text — luxury brand title card */}
                <div className="absolute inset-x-0 bottom-0 px-6 pb-8 sm:px-10 sm:pb-10 lg:pb-12">
                  <p className="gh-hero-fade mb-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] sm:text-xs" style={{
                    color: 'rgba(255,255,255,0.7)',
                    background: 'rgba(255,255,255,0.08)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    '--hero-delay': '200ms',
                  } as React.CSSProperties}>
                    <Target size={12} />
                    Production-Grade Growth Platform
                  </p>
                  <h1 className="gh-hero-fade text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl" style={{
                    textShadow: '0 2px 24px rgba(0,0,0,0.25)',
                    '--hero-delay': '300ms',
                  } as React.CSSProperties}>
                    Turn Marketing Into a{' '}
                    <span className="bg-gradient-to-r from-[#e8c9a8] via-[#c8956c] to-[#a07550] bg-clip-text text-transparent">
                      Revenue System
                    </span>
                  </h1>
                  <p className="gh-hero-fade mt-3 max-w-lg text-sm leading-relaxed sm:mt-4 sm:text-lg" style={{
                    color: 'rgba(255,255,255,0.78)',
                    '--hero-delay': '400ms',
                  } as React.CSSProperties}>
                    One operating system for scalable e-commerce growth — from search to social, content to strategy.
                  </p>
                  <div className="gh-hero-fade mt-6 flex flex-wrap items-center gap-3 sm:mt-8" style={{
                    '--hero-delay': '500ms',
                  } as React.CSSProperties}>
                    <Link
                      to="/signup"
                      className="group inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-extrabold uppercase tracking-[0.06em] text-white transition hover:opacity-90"
                      style={{ background: 'linear-gradient(135deg, #c8956c, #a07550)', boxShadow: '0 4px 20px rgba(200,149,108,0.35)' }}
                    >
                      Launch Your Growth Stack
                      <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                    </Link>
                    <a
                      href="#proof"
                      className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition"
                      style={{
                        color: 'rgba(255,255,255,0.85)',
                        background: 'rgba(255,255,255,0.1)',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(255,255,255,0.18)',
                      }}
                    >
                      <CheckCircle2 size={16} />
                      See Proof Metrics
                    </a>
                  </div>
                </div>

                {/* Play/pause — discreet brass button */}
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

            {/* Tagline bar beneath the video */}
            <div className="px-6 py-8 text-center sm:px-10 sm:py-10">
              <h2 className="text-[1.5rem] font-extrabold leading-snug tracking-tight sm:text-[2.2rem] md:text-[2.6rem]" style={{ color: '#2c2117' }}>
                A digital marketing agency{' '}
                <span className="bg-gradient-to-r from-[#c8956c] to-[#a07550] bg-clip-text text-transparent">
                  based in Florida
                </span>
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed sm:mt-4 sm:text-base" style={{ color: '#7a6d5e' }}>
                Steadfast helps B2B and B2C organizations navigate digital complexity with measurable growth outcomes.
              </p>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            PROOF METRICS — The Signal Board
            Warm card grid with brass accent numbers.
        ═══════════════════════════════════════════ */}
        <section id="proof" className="mx-auto max-w-7xl px-3 pt-5 sm:px-6 lg:px-10">
          <div className="gh-reveal overflow-hidden rounded-3xl py-8 sm:py-10" data-reveal style={{
            background: '#ffffff',
            boxShadow: '0 4px 24px rgba(44,33,23,0.06), 0 1px 3px rgba(44,33,23,0.03)',
            border: '1px solid #e8e0d4',
          }}>
            <div className="px-4 sm:px-8">
              <p className="mb-1 text-center text-[0.62rem] font-bold uppercase tracking-[0.28em] sm:text-[0.7rem]" style={{ color: '#c8956c' }}>
                Platform Metrics
              </p>
              <h2 className="mb-7 text-center text-[1.4rem] font-extrabold sm:mb-8 sm:text-[1.8rem]" style={{ color: '#2c2117' }}>
                Performance Signal Board
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
                {proofMetrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="rounded-2xl p-5 text-center transition-all duration-300 hover:-translate-y-1"
                    style={{
                      background: `linear-gradient(145deg, ${metric.color}08, ${metric.color}04)`,
                      border: `1.5px solid ${metric.color}20`,
                      boxShadow: `0 2px 12px ${metric.color}08`,
                    }}
                  >
                    <p className="text-2xl font-black sm:text-3xl" style={{ color: metric.color }}>{metric.value}</p>
                    <p className="mt-1.5 text-xs font-medium leading-snug" style={{ color: '#7a6d5e' }}>{metric.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            TRUSTED BY — Warm ticker marquee
        ═══════════════════════════════════════════ */}
        <section className="mx-auto max-w-7xl px-3 pt-5 sm:px-6 lg:px-10">
          <div className="gh-reveal overflow-hidden rounded-3xl py-6 sm:py-8" data-reveal style={{
            background: '#ffffff',
            boxShadow: '0 4px 24px rgba(44,33,23,0.06), 0 1px 3px rgba(44,33,23,0.03)',
            border: '1px solid #e8e0d4',
          }}>
            <p className="mb-4 text-center text-[0.62rem] font-bold uppercase tracking-[0.28em] sm:text-[0.7rem]" style={{ color: '#c8956c' }}>
              Trusted by Teams That Demand Signal Over Noise
            </p>
            <div className="overflow-hidden">
              <div className="gh-ticker-track flex w-[200%] gap-2.5 px-3">
                {[...clientBrands, ...clientBrands].map((brand, idx) => (
                  <div
                    key={`${brand.name}-${idx}`}
                    className="flex min-w-[130px] items-center justify-center rounded-xl px-3 py-3 text-center text-[11px] font-black uppercase tracking-[0.06em] transition-all duration-300 hover:-translate-y-0.5 sm:min-w-[150px] sm:text-xs"
                    style={{
                      background: brand.bg,
                      border: `1.5px solid ${brand.border}`,
                      color: brand.nameColor,
                    }}
                  >
                    {brand.name}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            OPERATING MODEL — Map → Activate → Scale
            Warm timeline with brass stage numbers.
        ═══════════════════════════════════════════ */}
        <section id="model" className="mx-auto max-w-7xl px-3 pt-5 sm:px-6 lg:px-10">
          <div className="gh-reveal overflow-hidden rounded-3xl py-8 sm:py-10" data-reveal style={{
            background: '#ffffff',
            boxShadow: '0 4px 24px rgba(44,33,23,0.06), 0 1px 3px rgba(44,33,23,0.03)',
            border: '1px solid #e8e0d4',
          }}>
            <div className="px-4 sm:px-8">
              <p className="mb-1 text-center text-[0.62rem] font-bold uppercase tracking-[0.28em] sm:text-[0.7rem]" style={{ color: '#c8956c' }}>
                Operating Model
              </p>
              <h2 className="mb-3 text-center text-[1.4rem] font-extrabold sm:text-[1.8rem]" style={{ color: '#2c2117' }}>
                How Steadfast Compounds Growth
              </h2>
              <p className="mx-auto mb-8 max-w-xl text-center text-sm leading-relaxed sm:text-base" style={{ color: '#7a6d5e' }}>
                Every stage is KPI-gated. Nothing scales without proof.
              </p>

              <div className="grid gap-4 md:grid-cols-3">
                {operatingModel.map((step) => (
                  <div
                    key={step.stage}
                    className="group relative overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1"
                    style={{
                      background: `linear-gradient(145deg, ${step.color}08, ${step.color}04)`,
                      border: `1.5px solid ${step.color}18`,
                      boxShadow: `0 2px 12px ${step.color}08`,
                    }}
                  >
                    <div
                      className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl text-sm font-black text-white"
                      style={{
                        background: `linear-gradient(135deg, ${step.color}, ${step.color}cc)`,
                        boxShadow: `0 3px 12px ${step.color}30`,
                      }}
                    >
                      {step.stage}
                    </div>
                    <h3 className="mb-2 text-lg font-bold uppercase tracking-[0.08em]" style={{ color: '#2c2117' }}>{step.title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: '#7a6d5e' }}>{step.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            STRATEGIC INSIGHTS & PERSONALIZED TACTICS
            Two visual panels — warm-framed data cards.
        ═══════════════════════════════════════════ */}
        <section className="mx-auto max-w-7xl space-y-5 px-3 pt-5 sm:px-6 lg:px-10">
          {/* Strategic Insights */}
          <div className="gh-reveal grid gap-5 overflow-hidden rounded-3xl lg:grid-cols-2" data-reveal style={{
            background: '#ffffff',
            boxShadow: '0 4px 24px rgba(44,33,23,0.06), 0 1px 3px rgba(44,33,23,0.03)',
            border: '1px solid #e8e0d4',
          }}>
            {/* Visual panel */}
            <div className="p-5 sm:p-8">
              <div className="overflow-hidden rounded-2xl p-5" style={{
                background: 'linear-gradient(145deg, #fdf6ef, #f9ede0)',
                border: '1.5px solid rgba(200,149,108,0.15)',
              }}>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: '#c8956c' }}>Channel Attribution</p>
                    <p className="mt-1 text-base font-extrabold" style={{ color: '#2c2117' }}>Multi-Channel Performance</p>
                  </div>
                  <span className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider" style={{
                    background: '#c8956c18',
                    color: '#a07550',
                    border: '1px solid #c8956c25',
                  }}>Live</span>
                </div>
                <div className="space-y-3">
                  {channelAttribution.map((ch) => (
                    <div key={ch.channel} className="flex items-center gap-3">
                      <span className="w-24 shrink-0 text-xs font-medium" style={{ color: '#7a6d5e' }}>{ch.channel}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full" style={{ background: '#e8e0d4' }}>
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${ch.share}%`, background: ch.color }} />
                      </div>
                      <span className="w-8 text-right text-xs font-bold" style={{ color: '#2c2117' }}>{ch.share}%</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-xl px-4 py-3 text-xs" style={{
                  background: '#c8956c10',
                  border: '1px solid #c8956c18',
                  color: '#8b6f4e',
                }}>
                  <span className="font-bold">ROAS +2.4×</span> this week — ecosystem-wide optimization active.
                </div>
              </div>
            </div>
            {/* Text panel */}
            <div className="flex flex-col justify-center p-5 sm:p-8">
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em]" style={{
                background: '#c8956c10',
                border: '1px solid #c8956c20',
                color: '#a07550',
              }}>
                <BarChart3 size={12} />
                Channel Mastery
              </span>
              <h2 className="mt-4 text-2xl font-extrabold sm:text-3xl" style={{ color: '#2c2117' }}>Strategic Insights</h2>
              <p className="mt-4 text-sm leading-relaxed sm:text-base" style={{ color: '#7a6d5e' }}>
                In today's dynamic landscape, mastering channels like Google, Meta and TikTok feels like navigating a complex ecosystem. Algorithms evolve, audiences fragment, and success demands both channel expertise and a holistic approach.
              </p>
              <Link
                to="/signup"
                className="mt-6 inline-flex w-fit items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white transition hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #c8956c, #a07550)', boxShadow: '0 4px 16px rgba(200,149,108,0.25)' }}
              >
                Start Building
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          {/* Personalized Tactics */}
          <div className="gh-reveal grid gap-5 overflow-hidden rounded-3xl lg:grid-cols-2" data-reveal style={{
            background: '#ffffff',
            boxShadow: '0 4px 24px rgba(44,33,23,0.06), 0 1px 3px rgba(44,33,23,0.03)',
            border: '1px solid #e8e0d4',
            '--reveal-delay': '80ms',
          } as React.CSSProperties}>
            {/* Text panel */}
            <div className="flex flex-col justify-center p-5 sm:p-8 lg:order-1">
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em]" style={{
                background: '#9b7fb810',
                border: '1px solid #9b7fb820',
                color: '#7c5fa0',
              }}>
                <Sparkles size={12} />
                Audience-First
              </span>
              <h2 className="mt-4 text-2xl font-extrabold sm:text-3xl" style={{ color: '#2c2117' }}>Personalized Tactics</h2>
              <p className="mt-4 text-sm leading-relaxed sm:text-base" style={{ color: '#7a6d5e' }}>
                Forget one-size-fits-all marketing. We delve into your audience's unique wants and needs, crafting personalized copy and experiences that resonate deeply — it's at the heart of our success.
              </p>
              <Link
                to="/signup"
                className="mt-6 inline-flex w-fit items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition"
                style={{
                  background: '#9b7fb810',
                  border: '1.5px solid #9b7fb825',
                  color: '#7c5fa0',
                }}
              >
                See How We Do It
                <ArrowRight size={16} />
              </Link>
            </div>
            {/* Visual panel */}
            <div className="p-5 sm:p-8 lg:order-2">
              <div className="overflow-hidden rounded-2xl p-5" style={{
                background: 'linear-gradient(145deg, #f5f0fa, #ede4f5)',
                border: '1.5px solid rgba(155,127,184,0.15)',
              }}>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: '#9b7fb8' }}>Audience Intelligence</p>
                    <p className="mt-1 text-base font-extrabold" style={{ color: '#2c2117' }}>Precision Segmentation</p>
                  </div>
                  <span className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider" style={{
                    background: '#9b7fb818',
                    color: '#7c5fa0',
                    border: '1px solid #9b7fb825',
                  }}>AI-Driven</span>
                </div>
                <div className="space-y-2.5">
                  {([
                    { segment: 'High-Intent Buyers', count: '12.4k', color: '#c8956c' },
                    { segment: 'Cart Abandoners', count: '8.1k', color: '#d4935a' },
                    { segment: 'Loyalty Tier', count: '5.7k', color: '#6a9e7e' },
                    { segment: 'Lookalike Seeds', count: '23.9k', color: '#9b7fb8' },
                  ] as const).map((seg) => (
                    <div key={seg.segment} className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{
                      background: 'rgba(255,255,255,0.55)',
                      border: '1px solid rgba(155,127,184,0.12)',
                    }}>
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: seg.color }} />
                      <span className="flex-1 text-xs font-medium" style={{ color: '#4a3f33' }}>{seg.segment}</span>
                      <span className="text-xs font-bold" style={{ color: '#7c5fa0' }}>{seg.count}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-xl px-4 py-3 text-xs" style={{
                  background: '#9b7fb810',
                  border: '1px solid #9b7fb818',
                  color: '#7c5fa0',
                }}>
                  <span className="font-bold">94% match quality</span> — audience model tuned weekly.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            AREAS OF FOCUS — The Gallery Wall
            Warm matte cards with colored accents.
        ═══════════════════════════════════════════ */}
        <section id="focus" className="mx-auto max-w-7xl px-3 pt-5 sm:px-6 lg:px-10">
          <div className="gh-reveal overflow-hidden rounded-3xl py-8 sm:py-10" data-reveal style={{
            background: '#ffffff',
            boxShadow: '0 4px 24px rgba(44,33,23,0.06), 0 1px 3px rgba(44,33,23,0.03)',
            border: '1px solid #e8e0d4',
          }}>
            <div className="px-4 sm:px-8">
              <p className="mb-1 text-center text-[0.62rem] font-bold uppercase tracking-[0.28em] sm:text-[0.7rem]" style={{ color: '#c8956c' }}>
                Core Capabilities
              </p>
              <h2 className="mb-3 text-center text-[1.4rem] font-extrabold sm:text-[1.8rem]" style={{ color: '#2c2117' }}>
                Areas of Focus
              </h2>
              <p className="mx-auto mb-8 max-w-xl text-center text-sm leading-relaxed" style={{ color: '#7a6d5e' }}>
                From search to social, content to strategy — every channel, fully owned.
              </p>
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-4 md:grid-cols-5">
                {focusAreas.map((area, index) => {
                  const IconComponent = area.icon;
                  return (
                    <div
                      key={area.title}
                      className="gh-reveal group relative min-h-[140px] cursor-default overflow-hidden rounded-2xl p-4 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lg sm:min-h-[160px] sm:p-5"
                      data-reveal
                      style={{
                        background: `linear-gradient(145deg, ${area.bgFrom}, ${area.bgTo})`,
                        border: '1px solid rgba(200,149,108,0.15)',
                        boxShadow: `0 2px 12px ${area.color}10`,
                        '--reveal-delay': `${index * 60}ms`,
                      } as React.CSSProperties}
                    >
                      <div
                        className="absolute -right-1 -top-1 flex h-10 w-10 items-center justify-center rounded-full text-[10px] font-black text-white"
                        style={{
                          background: `linear-gradient(135deg, ${area.color}, ${area.accent})`,
                          boxShadow: `0 3px 10px ${area.color}30`,
                        }}
                      >
                        {area.badge}
                      </div>
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
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            FLAGSHIP PROGRAMS
            Warm cards with colored top borders.
        ═══════════════════════════════════════════ */}
        <section id="programs" className="mx-auto max-w-7xl px-3 pt-5 sm:px-6 lg:px-10">
          <div className="gh-reveal overflow-hidden rounded-3xl py-8 sm:py-10" data-reveal style={{
            background: '#ffffff',
            boxShadow: '0 4px 24px rgba(44,33,23,0.06), 0 1px 3px rgba(44,33,23,0.03)',
            border: '1px solid #e8e0d4',
          }}>
            <div className="px-4 sm:px-8">
              <p className="mb-1 text-center text-[0.62rem] font-bold uppercase tracking-[0.28em] sm:text-[0.7rem]" style={{ color: '#c8956c' }}>
                Deployment-Ready
              </p>
              <h2 className="mb-3 text-center text-[1.4rem] font-extrabold sm:text-[1.8rem]" style={{ color: '#2c2117' }}>
                Flagship Programs
              </h2>
              <p className="mx-auto mb-8 max-w-xl text-center text-sm leading-relaxed" style={{ color: '#7a6d5e' }}>
                Fast to deploy. Safe to scale. Built to win scrutiny.
              </p>
              <div className="grid gap-4 md:grid-cols-3">
                {featuredPrograms.map((program, index) => (
                  <article
                    key={program.name}
                    className="gh-reveal group overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-1"
                    data-reveal
                    style={{
                      background: `linear-gradient(145deg, ${program.color}06, ${program.color}03)`,
                      border: `1.5px solid ${program.color}18`,
                      '--reveal-delay': `${index * 80}ms`,
                    } as React.CSSProperties}
                  >
                    <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${program.color}, ${program.accent})` }} />
                    <div className="p-5">
                      <div
                        className="mb-3 inline-flex rounded-xl p-2.5"
                        style={{
                          background: `${program.color}12`,
                          color: program.accent,
                        }}
                      >
                        <Globe size={18} />
                      </div>
                      <h3 className="text-lg font-extrabold" style={{ color: '#2c2117' }}>{program.name}</h3>
                      <p className="mt-2 text-sm leading-relaxed" style={{ color: '#7a6d5e' }}>{program.summary}</p>
                      <p className="mt-4 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: program.accent }}>
                        Production-ready
                        <CheckCircle2 size={13} />
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            CLIENTS — The Trust Wall
        ═══════════════════════════════════════════ */}
        <section id="clients" className="mx-auto max-w-7xl px-3 pt-5 sm:px-6 lg:px-10">
          <div className="gh-reveal overflow-hidden rounded-3xl py-8 sm:py-10" data-reveal style={{
            background: '#ffffff',
            boxShadow: '0 4px 24px rgba(44,33,23,0.06), 0 1px 3px rgba(44,33,23,0.03)',
            border: '1px solid #e8e0d4',
          }}>
            <div className="px-4 sm:px-8">
              <p className="mb-1 text-center text-[0.62rem] font-bold uppercase tracking-[0.28em] sm:text-[0.7rem]" style={{ color: '#c8956c' }}>
                Our Clients
              </p>
              <h2 className="mb-3 text-center text-[1.4rem] font-extrabold sm:text-[1.8rem]" style={{ color: '#2c2117' }}>
                Trusted by Industry Leaders
              </h2>
              <p className="mx-auto mb-7 max-w-xl text-center text-sm leading-relaxed" style={{ color: '#7a6d5e' }}>
                From heritage fashion to consumer health to enterprise finance — we drive measurable growth.
              </p>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
                {clientBrands.map((brand, index) => (
                  <div
                    key={brand.name}
                    className="gh-reveal flex items-center justify-center rounded-2xl px-3 py-5 text-center text-[11px] font-black uppercase tracking-[0.08em] transition-all duration-300 hover:-translate-y-1 sm:text-xs"
                    data-reveal
                    style={{
                      background: brand.bg,
                      border: `1.5px solid ${brand.border}`,
                      color: brand.nameColor,
                      '--reveal-delay': `${index * 30}ms`,
                    } as React.CSSProperties}
                  >
                    {brand.name}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            BLOG / INSIGHTS
        ═══════════════════════════════════════════ */}
        <section className="mx-auto max-w-7xl px-3 pt-5 sm:px-6 lg:px-10">
          <div className="gh-reveal overflow-hidden rounded-3xl py-8 sm:py-10" data-reveal style={{
            background: '#ffffff',
            boxShadow: '0 4px 24px rgba(44,33,23,0.06), 0 1px 3px rgba(44,33,23,0.03)',
            border: '1px solid #e8e0d4',
          }}>
            <div className="px-4 sm:px-8">
              <div className="mb-7 flex items-end justify-between gap-4">
                <div>
                  <p className="mb-1 text-[0.62rem] font-bold uppercase tracking-[0.28em] sm:text-[0.7rem]" style={{ color: '#c8956c' }}>
                    Knowledge Base
                  </p>
                  <h2 className="text-[1.4rem] font-extrabold sm:text-[1.8rem]" style={{ color: '#2c2117' }}>
                    Latest Insights
                  </h2>
                </div>
                <a href="#blog" className="hidden items-center gap-1.5 text-sm font-semibold transition hover:opacity-80 md:flex" style={{ color: '#c8956c' }}>
                  All Articles
                  <ChevronRight size={16} />
                </a>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {blogPosts.map((post, index) => (
                  <article
                    key={post.title}
                    className="gh-reveal group overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-1"
                    data-reveal
                    style={{
                      border: '1.5px solid #e8e0d4',
                      '--reveal-delay': `${index * 60}ms`,
                    } as React.CSSProperties}
                  >
                    <div className="flex h-32 items-end p-4" style={{
                      background: `linear-gradient(145deg, ${post.accent}15, ${post.accent}08)`,
                    }}>
                      <div className="rounded-lg px-2.5 py-1.5" style={{
                        background: `${post.accent}12`,
                        border: `1px solid ${post.accent}20`,
                      }}>
                        <BookOpen size={13} className="mr-1.5 inline" style={{ color: post.accent }} />
                        <span className="text-[10px] font-bold" style={{ color: post.accent }}>Steadfast Blog</span>
                      </div>
                    </div>
                    <div className="bg-white p-5">
                      <h3 className="text-sm font-bold leading-snug transition group-hover:opacity-80" style={{ color: '#2c2117' }}>
                        {post.title}
                      </h3>
                      <a
                        href="#blog"
                        className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.1em] transition hover:opacity-80"
                        style={{ color: '#c8956c' }}
                      >
                        Read More
                        <ChevronRight size={12} />
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            CTA — The Closing Statement
            Warm espresso card with brass accents.
        ═══════════════════════════════════════════ */}
        <section className="mx-auto max-w-7xl px-3 pb-8 pt-5 sm:px-6 lg:px-10">
          <div className="gh-reveal overflow-hidden rounded-3xl px-5 py-8 sm:px-10 sm:py-10" data-reveal style={{
            background: 'linear-gradient(145deg, #2c2117, #1a1410)',
            boxShadow: '0 8px 40px rgba(26,20,16,0.18)',
            border: '1px solid #3d3228',
          }}>
            <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
              <div>
                <p className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]" style={{
                  background: 'rgba(200,149,108,0.15)',
                  border: '1px solid rgba(200,149,108,0.25)',
                  color: '#c8956c',
                }}>
                  <Globe size={13} />
                  Ready to Launch
                </p>
                <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-white sm:text-3xl md:text-4xl">
                  Show up with a presence that looks like a market leader.
                </h2>
                <p className="mt-4 max-w-xl text-sm leading-relaxed sm:text-base" style={{ color: '#b8a99a' }}>
                  Designed for high trust, fast comprehension, and decisive action. Optimized for both desktop and mobile conversion paths.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <Link
                  to="/signup"
                  className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-extrabold uppercase tracking-[0.06em] text-white transition hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #c8956c, #a07550)', boxShadow: '0 4px 20px rgba(200,149,108,0.3)' }}
                >
                  Create your account
                  <ArrowRight size={16} />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition"
                  style={{
                    background: 'rgba(200,149,108,0.08)',
                    border: '1.5px solid rgba(200,149,108,0.2)',
                    color: '#c8956c',
                  }}
                >
                  Access dashboard
                </Link>
              </div>
            </div>
          </div>

          <footer className="mt-8 text-center text-xs" style={{ color: '#b8a99a' }}>
            © 2026 Steadfast Digital, Inc. Built for measurable growth.
          </footer>
        </section>
      </main>
    </div>
  );
}
