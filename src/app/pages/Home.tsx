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
 * ─── DESIGN: Original Dark Navy Theme ───
 *
 * Base:           #071626  (deep navy)
 * Surface:        #0f2a42  (panel)
 * Card:           #102940  (card)
 * Accent Cyan:    #39c6f4  (primary CTA)
 * Accent Warm:    #f9a84f  (secondary)
 * Text Primary:   #ffffff
 * Text Secondary: #b8d8f6
 * Text Muted:     #8bcdf8
 * Border:         white/10
 */

const focusAreas = [
  { title: 'Search',        desc: 'Google & Bing for precision ROAS.',            icon: Search,    badge: '01' },
  { title: 'Paid Social',   desc: 'Meta, TikTok, Pinterest & LinkedIn.',         icon: Share2,    badge: '02' },
  { title: 'Paid Content',  desc: 'Taboola & Outbrain native reach.',            icon: Megaphone, badge: '03' },
  { title: 'Affiliate',     desc: 'Partner channels aligned to buyers.',         icon: Handshake, badge: '04' },
  { title: 'Strategy',      desc: 'Data-driven budget & growth guidance.',       icon: Brain,     badge: '05' },
];

const operatingModel = [
  { stage: '01', title: 'Map',      detail: 'Funnel economics, audience intent, LTV constraints.' },
  { stage: '02', title: 'Activate', detail: 'Focused experiments with strict KPI gates.' },
  { stage: '03', title: 'Scale',    detail: 'Winning playbooks automated into repeatable systems.' },
];

const proofMetrics = [
  { label: 'Optimization Cycles / Week', value: '42+' },
  { label: 'Avg. Efficiency Lift',       value: '2.9×' },
  { label: 'Revenue Attribution',        value: '98%' },
  { label: 'Daily Campaign Budget',      value: '$3.4M' },
];

const featuredPrograms = [
  { name: 'Commerce Lift',       summary: 'Product-page and paid-media sync for conversion velocity.',         accent: 'from-[#39c6f4] to-[#16a3d8]' },
  { name: 'Retention Engine',    summary: 'Lifecycle segmentation and reactivation for repeat margin.',        accent: 'from-[#f9a84f] to-[#e66e2d]' },
  { name: 'Global Expansion',    summary: 'Region-by-region sequencing with spend governance.',                accent: 'from-[#54d68c] to-[#1ea56f]' },
];

const trustedBy = [
  'ISAIA NAPOLI', 'GIADZY', 'OWLET', 'ROAR ORGANIC', 'BORGHESE', 'PET PLATE',
  'THE VITAMIN SHOPPE', 'MAGELLAN JETS', 'FANCHEST', 'BLAST', 'UBS', 'UNDP',
  'NYU LANGONE HEALTH', 'ORGANICGIRL',
];

const blogPosts = [
  { title: 'What is ad fatigue and how to detect it',                             accent: 'from-[#1a4a78] to-[#0a2d52]' },
  { title: 'How to break into digital marketing',                                 accent: 'from-[#2d1b4e] to-[#1a0d30]' },
  { title: 'Re-activate a disabled Meta Ad Account',                              accent: 'from-[#0a3a2a] to-[#051f17]' },
  { title: '6 ways marketers are embracing AI',                                   accent: 'from-[#3d1f10] to-[#1e0d05]' },
  { title: "Did Performance Max save Google's ad crown?",                         accent: 'from-[#0d2d4a] to-[#071826]' },
  { title: 'Is Google Ads worth it for small business?',                          accent: 'from-[#2a2608] to-[#141200]' },
];

const channelAttribution = [
  { channel: 'Google Ads',  share: 38, color: 'bg-[#4285f4]' },
  { channel: 'Meta Ads',    share: 31, color: 'bg-[#1877f2]' },
  { channel: 'TikTok Ads',  share: 24, color: 'bg-[#ff0050]' },
  { channel: 'Other',       share: 7,  color: 'bg-[#8fd8ff]/50' },
];

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);

  useEffect(() => {
    const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    if (targets.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-visible'); observer.unobserve(e.target); } }),
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
    <div className="min-h-screen bg-[#071626] text-[#e9f4ff]" style={{ fontFamily: '"Space Grotesk", "Sora", "Poppins", sans-serif' }}>
      <style>{`
        .gh-reveal {
          opacity: 0; transform: translateY(22px);
          transition: opacity 0.7s ease, transform 0.7s ease;
          transition-delay: var(--d, 0ms);
        }
        .gh-reveal.is-visible { opacity: 1; transform: translateY(0); }
        @keyframes fadeUp { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
        .hero-fade { animation: fadeUp 0.8s ease both; animation-delay: var(--d, 0ms); }
        @keyframes ticker { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        .ticker-track { animation: ticker 28s linear infinite; }
        .grid-aurora {
          background-image: linear-gradient(to right,rgba(145,201,255,.08) 1px,transparent 1px), linear-gradient(to bottom,rgba(145,201,255,.08) 1px,transparent 1px);
          background-size:38px 38px; mask-image:radial-gradient(circle at 40% 20%,black 35%,transparent 80%);
        }
        @media(prefers-reduced-motion:reduce){
          .gh-reveal{opacity:1;transform:none;transition:none}
          .hero-fade{animation:none;opacity:1;transform:none}
          .ticker-track{animation:none}
        }
      `}</style>

      {/* Background orbs */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="grid-aurora absolute inset-0 opacity-60" />
        <div className="absolute -left-24 top-16 h-72 w-72 rounded-full bg-[#19b5e4]/20 blur-3xl" />
        <div className="absolute right-[-80px] top-1/3 h-80 w-80 rounded-full bg-[#f58b3c]/15 blur-3xl" />
        <div className="absolute bottom-[-120px] left-1/3 h-96 w-96 rounded-full bg-[#2a89ff]/15 blur-3xl" />
      </div>

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#071626]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-10">
          <div className="flex items-center gap-3">
            <img src={logoImage} alt="Steadfast Digital" className="h-11 w-11 rounded-xl border border-white/20 bg-white/5 p-1" />
            <div>
              <p className="text-base font-black tracking-[0.08em] text-white">STEADFAST</p>
              <p className="text-[10px] uppercase tracking-[0.26em] text-[#90c9ff]">Digital Growth Systems</p>
            </div>
          </div>
          <nav className="hidden items-center gap-7 text-sm text-[#b8d8f6] md:flex">
            <a href="#model" className="transition-colors hover:text-white">Model</a>
            <a href="#programs" className="transition-colors hover:text-white">Programs</a>
            <a href="#focus" className="transition-colors hover:text-white">Focus</a>
            <a href="#clients" className="transition-colors hover:text-white">Clients</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login" className="rounded-lg border border-[#5da8dc]/50 px-4 py-2 text-xs font-semibold text-[#cfe9ff] transition hover:bg-[#0f2a42] sm:text-sm">Sign In</Link>
            <Link to="/signup" className="rounded-lg bg-[#3dc8f6] px-4 py-2 text-xs font-bold text-[#062033] transition hover:bg-[#68d6fb] sm:text-sm">Start Free</Link>
          </div>
        </div>
      </header>

      <main>
        {/* ── HERO ── */}
        <section className="relative overflow-hidden border-b border-white/10">
          <div className="mx-auto max-w-7xl px-4 pb-16 pt-14 sm:px-6 md:pt-20 lg:px-10">
            <div className="relative mx-auto max-w-3xl text-center">
              <p className="hero-fade mb-4 inline-flex items-center gap-2 rounded-full border border-[#59c0f2]/30 bg-[#0f2a42]/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#89d7ff]" style={{ '--d': '70ms' } as React.CSSProperties}>
                <Target size={14} />
                Growth Platform
              </p>
              <h1 className="hero-fade text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl" style={{ '--d': '170ms' } as React.CSSProperties}>
                Marketing as a{' '}
                <span className="bg-gradient-to-r from-[#61d6ff] via-[#8be3ff] to-[#ffd0a1] bg-clip-text text-transparent">
                  Revenue System
                </span>
              </h1>
              <p className="hero-fade mx-auto mt-6 max-w-xl text-base leading-relaxed text-[#b8d8f6] sm:text-lg" style={{ '--d': '260ms' } as React.CSSProperties}>
                One operating system for scalable e-commerce growth.
              </p>
              <div className="hero-fade mt-8 flex flex-wrap items-center justify-center gap-3" style={{ '--d': '340ms' } as React.CSSProperties}>
                <Link to="/signup" className="group inline-flex items-center gap-2 rounded-xl bg-[#39c6f4] px-6 py-3 text-sm font-extrabold uppercase tracking-[0.08em] text-[#042236] transition hover:bg-[#68d6fb]">
                  Get Started
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                </Link>
                <a href="#proof" className="inline-flex items-center gap-2 rounded-xl border border-[#5da8dc]/50 bg-[#0f2a42]/50 px-6 py-3 text-sm font-semibold text-[#d7ecff] transition hover:bg-[#123451]">
                  <CheckCircle2 size={16} />
                  Proof Metrics
                </a>
              </div>
            </div>

            {/* Video — below the hero text */}
            <div className="hero-fade mx-auto mt-12 max-w-4xl overflow-hidden rounded-2xl border border-white/15 shadow-[0_26px_70px_rgba(0,0,0,0.45)]" style={{ '--d': '420ms' } as React.CSSProperties}>
              <div className="relative h-[220px] sm:h-[300px] md:h-[380px]">
                <video
                  ref={videoRef}
                  src="/banner-cdc94d47.mp4"
                  autoPlay muted loop playsInline preload="metadata"
                  className="absolute inset-0 h-full w-full object-cover"
                  style={{ filter: 'contrast(1.06) saturate(1.08) brightness(0.95)', transform: 'translateZ(0)' }}
                  aria-label="Steadfast Digital brand video"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#071626]/60 to-transparent" />
                <button
                  onClick={toggleVideo}
                  className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/15 backdrop-blur-md transition hover:scale-110 sm:right-4 sm:top-4"
                  style={{ border: '1px solid rgba(255,255,255,0.18)' }}
                  aria-label={isVideoPlaying ? 'Pause' : 'Play'}
                >
                  {isVideoPlaying ? <Pause size={13} className="text-white/80" /> : <Play size={13} className="ml-0.5 text-white/80" />}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── PROOF METRICS ── */}
        <section id="proof" className="border-b border-white/10 bg-[#0a1f32]/70 py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
            <p className="gh-reveal mb-8 text-center text-xs font-semibold uppercase tracking-[0.22em] text-[#8bcdf8]" data-reveal>
              Performance Signal Board
            </p>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {proofMetrics.map((m, i) => (
                <div key={m.label} className="gh-reveal rounded-2xl border border-white/10 bg-[#0f2a42]/75 p-5 text-center transition hover:-translate-y-1 hover:border-[#6fcffb]/30" data-reveal style={{ '--d': `${i * 70}ms` } as React.CSSProperties}>
                  <p className="text-2xl font-black text-[#87deff] sm:text-3xl">{m.value}</p>
                  <p className="mt-1.5 text-xs leading-snug text-[#aacfe9]">{m.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── TRUSTED BY — Ticker ── */}
        <section className="border-b border-white/10 py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
            <p className="gh-reveal mb-4 text-center text-xs font-semibold uppercase tracking-[0.22em] text-[#8bcdf8]" data-reveal>
              Trusted by Industry Leaders
            </p>
            <div className="gh-reveal overflow-hidden rounded-xl border border-white/10 bg-[#0f2a42]" data-reveal style={{ '--d': '70ms' } as React.CSSProperties}>
              <div className="ticker-track flex w-[200%] gap-3 px-3 py-3">
                {[...trustedBy, ...trustedBy].map((brand, idx) => (
                  <div key={`${brand}-${idx}`} className="min-w-[130px] rounded-lg border border-white/10 bg-[#102940] px-3 py-3 text-center text-xs font-bold text-[#d7ecff] transition hover:-translate-y-0.5 hover:border-[#7fdcff]/50">
                    {brand}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── OPERATING MODEL ── */}
        <section id="model" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-10">
          <div className="gh-reveal mb-10 text-center" data-reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8bcdf8]">Operating Model</p>
            <h2 className="mt-2 text-3xl font-black text-white sm:text-4xl">How We Compound Growth</h2>
            <p className="mx-auto mt-3 max-w-lg text-[#b8d8f6]">Every stage is KPI-gated. Nothing scales without proof.</p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {operatingModel.map((step, i) => (
              <div key={step.stage} className="gh-reveal rounded-2xl border border-white/10 bg-[#0f2a42]/75 p-6 transition hover:-translate-y-1 hover:border-[#6fcffb]/45" data-reveal style={{ '--d': `${i * 90}ms` } as React.CSSProperties}>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#3dc8f6] text-xs font-black text-[#062033]">{step.stage}</span>
                <h3 className="mt-4 text-lg font-bold uppercase tracking-[0.1em] text-[#8fd8ff]">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#c9e7ff]">{step.detail}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── STRATEGIC INSIGHTS ── */}
        <section className="border-t border-white/10 py-16">
          <div className="mx-auto max-w-7xl space-y-16 px-4 sm:px-6 lg:px-10">

            {/* Channel Mastery — visual left, text right */}
            <div className="gh-reveal grid gap-10 lg:grid-cols-2 lg:items-center" data-reveal>
              <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#0d2439] via-[#102d47] to-[#0a2034] p-6 shadow-[0_26px_70px_rgba(0,0,0,0.4)]">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[#8bcdf8]">Channel Attribution</p>
                    <p className="mt-1 text-base font-black text-white">Multi-Channel View</p>
                  </div>
                  <span className="rounded-full border border-[#6bc7f7]/35 bg-[#12344f] px-3 py-1 text-xs font-semibold text-[#94dbff]">Live</span>
                </div>
                <div className="space-y-3">
                  {channelAttribution.map((ch) => (
                    <div key={ch.channel} className="flex items-center gap-3">
                      <span className="w-24 shrink-0 text-xs text-[#aacfe9]">{ch.channel}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                        <div className={`h-full rounded-full ${ch.color}`} style={{ width: `${ch.share}%` }} />
                      </div>
                      <span className="w-8 text-right text-xs font-bold text-[#d7ecff]">{ch.share}%</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-xl border border-[#39c6f4]/25 bg-[#39c6f4]/10 px-4 py-3 text-xs text-[#c9ecff]">
                  <span className="font-bold">ROAS +2.4×</span> — ecosystem-wide optimization active.
                </div>
              </div>
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#39c6f4]/35 bg-[#39c6f4]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#8be3ff]">
                  <BarChart3 size={12} />
                  Channel Mastery
                </span>
                <h2 className="mt-4 text-3xl font-black text-white sm:text-4xl">Strategic Insights</h2>
                <p className="mt-4 text-base leading-relaxed text-[#b8d8f6]">
                  Mastering Google, Meta, and TikTok demands channel expertise and a holistic approach. Algorithms evolve, audiences fragment — we navigate it all.
                </p>
                <Link to="/signup" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#39c6f4] px-5 py-3 text-sm font-black uppercase tracking-[0.08em] text-[#042236] transition hover:bg-[#68d6fb]">
                  Start Building <ArrowRight size={16} />
                </Link>
              </div>
            </div>

            {/* Personalized Tactics — text left, visual right */}
            <div className="gh-reveal grid gap-10 lg:grid-cols-2 lg:items-center" data-reveal style={{ '--d': '70ms' } as React.CSSProperties}>
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#f9a84f]/35 bg-[#f9a84f]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#ffd59e]">
                  <Sparkles size={12} />
                  Audience-First
                </span>
                <h2 className="mt-4 text-3xl font-black text-white sm:text-4xl">Personalized Tactics</h2>
                <p className="mt-4 text-base leading-relaxed text-[#b8d8f6]">
                  We craft personalized copy and experiences tuned to your audience's intent — no one-size-fits-all. Precision at scale.
                </p>
                <Link to="/signup" className="mt-6 inline-flex items-center gap-2 rounded-xl border border-[#f9a84f]/40 bg-[#f9a84f]/10 px-5 py-3 text-sm font-bold text-[#ffd09e] transition hover:bg-[#f9a84f]/20">
                  See How <ArrowRight size={16} />
                </Link>
              </div>
              <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#1c1228] via-[#170e23] to-[#0d0919] p-6 shadow-[0_26px_70px_rgba(0,0,0,0.4)]">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[#c9a8ff]">Audience Intelligence</p>
                    <p className="mt-1 text-base font-black text-white">Precision Segmentation</p>
                  </div>
                  <span className="rounded-full border border-[#c9a8ff]/35 bg-[#2a1a4e] px-3 py-1 text-xs font-semibold text-[#d8bfff]">AI-Driven</span>
                </div>
                <div className="space-y-2.5">
                  {([
                    { segment: 'High-Intent Buyers', count: '12.4k', color: 'bg-[#39c6f4]' },
                    { segment: 'Cart Abandoners',    count: '8.1k',  color: 'bg-[#f9a84f]' },
                    { segment: 'Loyalty Tier',       count: '5.7k',  color: 'bg-[#54d68c]' },
                    { segment: 'Lookalike Seeds',    count: '23.9k', color: 'bg-[#c084fc]' },
                  ] as const).map((s) => (
                    <div key={s.segment} className="flex items-center gap-3 rounded-lg border border-white/10 bg-[#0d0d1e]/50 px-3 py-2.5">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${s.color}`} />
                      <span className="flex-1 text-xs text-[#d7ecff]">{s.segment}</span>
                      <span className="text-xs font-bold text-[#c0b8ff]">{s.count}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-xl border border-[#c084fc]/25 bg-[#c084fc]/10 px-4 py-3 text-xs text-[#e5d0ff]">
                  <span className="font-bold">94% match quality</span> — tuned weekly.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── AREAS OF FOCUS ── */}
        <section id="focus" className="border-t border-white/10 bg-[#091b2b] py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
            <div className="gh-reveal mb-10 text-center" data-reveal>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8bcdf8]">Core Capabilities</p>
              <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl">Areas of Focus</h2>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {focusAreas.map((area, i) => {
                const Icon = area.icon;
                const isFirst = i === 0;
                return (
                  <article
                    key={area.title}
                    className={`gh-reveal rounded-2xl p-5 transition hover:-translate-y-1 ${isFirst ? 'bg-[#00c6ef] text-[#021d2e] shadow-[0_8px_32px_rgba(0,198,239,0.3)]' : 'border border-white/10 bg-[#0f2a42]/75 hover:border-[#6fcffb]/45'}`}
                    data-reveal
                    style={{ '--d': `${i * 70}ms` } as React.CSSProperties}
                  >
                    <div className={`mb-3 inline-flex rounded-lg p-2 ${isFirst ? 'bg-[#021d2e]/20' : 'bg-[#39c6f4]/15'}`}>
                      <Icon size={18} className={isFirst ? 'text-[#021d2e]' : 'text-[#84ddff]'} />
                    </div>
                    <h3 className={`text-base font-bold ${isFirst ? 'text-[#021d2e]' : 'text-white'}`}>{area.title}</h3>
                    <p className={`mt-2 text-sm leading-relaxed ${isFirst ? 'text-[#033a54]' : 'text-[#b8d8f6]'}`}>{area.desc}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── FLAGSHIP PROGRAMS ── */}
        <section id="programs" className="border-t border-white/10 bg-[#091b2b] py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
            <div className="gh-reveal mb-8" data-reveal>
              <h2 className="text-3xl font-black text-white sm:text-4xl">Flagship Programs</h2>
              <p className="mt-2 max-w-lg text-[#b8d8f6]">Fast to deploy. Safe to scale.</p>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {featuredPrograms.map((p, i) => (
                <article key={p.name} className="gh-reveal group overflow-hidden rounded-2xl border border-white/10 bg-[#102940]" data-reveal style={{ '--d': `${i * 90}ms` } as React.CSSProperties}>
                  <div className={`h-2 bg-gradient-to-r ${p.accent}`} />
                  <div className="p-5">
                    <h3 className="text-lg font-black text-white">{p.name}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#bddcf8]">{p.summary}</p>
                    <p className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#9fe2ff]">
                      Production-ready <CheckCircle2 size={13} />
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── CLIENTS GRID ── */}
        <section id="clients" className="border-t border-white/10 bg-[#070e1a] py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
            <div className="gh-reveal mb-8 text-center" data-reveal>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8bcdf8]">Our Clients</p>
              <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl">Trusted Partners</h2>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
              {trustedBy.map((brand, i) => (
                <div key={brand} className="gh-reveal rounded-2xl border border-white/10 bg-[#0f2a42]/75 px-3 py-5 text-center text-xs font-black uppercase tracking-[0.1em] text-[#d7ecff] transition hover:-translate-y-1 hover:border-[#7fdcff]/50" data-reveal style={{ '--d': `${i * 35}ms` } as React.CSSProperties}>
                  {brand}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── BLOG ── */}
        <section className="border-t border-white/10 bg-[#071626] py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
            <div className="gh-reveal mb-8 flex items-end justify-between gap-4" data-reveal>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8bcdf8]">Knowledge Base</p>
                <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl">Latest Insights</h2>
              </div>
              <a href="#blog" className="hidden items-center gap-2 text-sm font-semibold text-[#8bcdf8] transition hover:text-white md:flex">
                All Articles <ChevronRight size={16} />
              </a>
            </div>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {blogPosts.map((post, i) => (
                <article key={post.title} className="gh-reveal group overflow-hidden rounded-2xl border border-white/10 bg-[#0f2a42] transition hover:-translate-y-1 hover:border-[#6fcffb]/45" data-reveal style={{ '--d': `${i * 70}ms` } as React.CSSProperties}>
                  <div className={`flex h-32 items-end bg-gradient-to-br p-4 ${post.accent}`}>
                    <div className="rounded-lg bg-[#0a1e35]/60 px-2.5 py-1.5 backdrop-blur-sm">
                      <BookOpen size={13} className="mr-1.5 inline text-[#8fd8ff]" />
                      <span className="text-xs font-semibold text-[#c9e7ff]">Steadfast Blog</span>
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="text-sm font-bold leading-snug text-white transition group-hover:text-[#8be3ff]">{post.title}</h3>
                    <a href="#blog" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.1em] text-[#39c6f4] transition hover:text-[#9be7ff]">
                      Read More <ChevronRight size={13} />
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="mx-auto max-w-7xl px-4 pb-16 pt-12 sm:px-6 lg:px-10">
          <div className="gh-reveal rounded-3xl border border-white/15 bg-gradient-to-r from-[#10314c] via-[#123955] to-[#15354d] p-8 shadow-[0_25px_60px_rgba(0,0,0,0.35)] sm:p-10" data-reveal>
            <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
              <div>
                <p className="inline-flex items-center gap-2 rounded-full border border-[#79d6ff]/35 bg-[#2baee1]/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#9ee5ff]">
                  <Globe size={14} />
                  Ready to Launch
                </p>
                <h2 className="mt-4 text-3xl font-black text-white sm:text-4xl">Your growth stack is one click away.</h2>
                <p className="mt-4 max-w-xl text-[#cbe8ff]">
                  High trust. Fast comprehension. Decisive action.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <Link to="/signup" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#44cef8] px-5 py-3 text-sm font-black uppercase tracking-[0.09em] text-[#07253b] transition hover:bg-[#71dcfb]">
                  Create your account <ArrowRight size={16} />
                </Link>
                <Link to="/login" className="inline-flex items-center justify-center rounded-xl border border-[#7fcff7]/40 bg-[#0e2f47]/60 px-5 py-3 text-sm font-semibold text-[#d7ecff] transition hover:bg-[#14415f]">
                  Access dashboard
                </Link>
              </div>
            </div>
          </div>
          <footer className="mt-8 text-center text-xs text-[#91b7d6]">
            © 2026 Steadfast Digital, Inc.
          </footer>
        </section>
      </main>
    </div>
  );
}
