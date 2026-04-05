import { Link } from 'react-router';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Compass,
  FileText,
  Gem,
  Globe,
  Layers3,
  Network,
  ShieldCheck,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import logoImage from '../../assets/4b611159e2ff0ca97c6252bef878e480dedd2a43.png';

const valuePillars = [
  {
    title: 'Precision Growth Engine',
    text: 'Campaign orchestration built for measurable daily growth.',
    icon: Target,
  },
  {
    title: 'Risk-Aware Operations',
    text: 'Governed execution with controls, audit trails, and resilience.',
    icon: ShieldCheck,
  },
  {
    title: 'Creative Intelligence Layer',
    text: 'Fast creative experiments driven by live intent signals.',
    icon: Sparkles,
  },
  {
    title: 'Decision-Grade Analytics',
    text: 'Dashboards that turn spend data into confident decisions.',
    icon: BarChart3,
  },
];

const operatingModel = [
  {
    stage: '01',
    title: 'Map',
    detail: 'We model your funnel economics, audience intent, and lifetime-value constraints.',
  },
  {
    stage: '02',
    title: 'Activate',
    detail: 'We deploy focused experiments with strict KPI gates and rapid optimization intervals.',
  },
  {
    stage: '03',
    title: 'Scale',
    detail: 'Winning playbooks are automated into repeatable systems with controlled expansion.',
  },
];

const proofMetrics = [
  { label: 'Optimization Cycles / Week', value: '42+' },
  { label: 'Avg. Efficiency Lift', value: '2.9x' },
  { label: 'Revenue Attribution Clarity', value: '98%' },
  { label: 'Managed Daily Campaign Budget', value: '$3.4M' },
];

const featuredPrograms = [
  {
    name: 'Commerce Lift Blueprint',
    summary: 'Product-page and paid-media synchronization for conversion velocity.',
    accent: 'from-[#39c6f4] to-[#16a3d8]',
  },
  {
    name: 'Retention Compounding System',
    summary: 'Lifecycle segmentation and reactivation loops for repeat margin growth.',
    accent: 'from-[#f9a84f] to-[#e66e2d]',
  },
  {
    name: 'Global Demand Expansion',
    summary: 'Region-by-region entry sequencing with spend governance and local signal tuning.',
    accent: 'from-[#54d68c] to-[#1ea56f]',
  },
];

const trustedBy = [
  'ISAIA NAPOLI',
  'GIADZY',
  'OWLET',
  'ROAR ORGANIC',
  'BORGHESE',
  'PET PLATE',
  'THE VITAMIN SHOPPE',
  'MAGELLAN JETS',
  'FANCHEST',
  'BLAST',
  'UBS',
  'UNDP',
  'NYU LANGONE HEALTH',
  'ORGANICGIRL',
];

const storyBeats = [
  { label: 'Signal Mapping', detail: 'Audience and margin baselines.' },
  { label: 'Offer Engineering', detail: 'Creative tuned for conversion.' },
  { label: 'Scale Protocol', detail: 'Winning loops scaled safely.' },
];

const areasOfFocus = [
  {
    title: 'Search Engine Marketing',
    body: 'Google Ads & Bing Ads: Designed for precision targeting, data-driven tests, and maximizing ROAS.',
    icon: Target,
    highlight: true,
  },
  {
    title: 'Paid Social',
    body: 'Facebook, Instagram, Pinterest, TikTok, and LinkedIn Ads. Reach the right audience at the right time in the right place.',
    icon: Globe,
    highlight: false,
  },
  {
    title: 'Paid Content',
    body: 'Taboola & Outbrain: Amplify your content to drive awareness and attention.',
    icon: FileText,
    highlight: false,
  },
  {
    title: 'Affiliate Marketing',
    body: 'Get featured across sites and platforms your customers care about.',
    icon: Network,
    highlight: false,
  },
  {
    title: 'Digital Strategy & Insights',
    body: 'Data that ties it all together for the optimal performance for your media mix.',
    icon: BarChart3,
    highlight: false,
  },
];

const blogPosts = [
  { title: 'What is ad fatigue and how to detect it', accent: 'from-[#1a4a78] to-[#0a2d52]' },
  { title: 'How To Hack Your Way into Digital Marketing (Spoiler: No Experience Needed)', accent: 'from-[#2d1b4e] to-[#1a0d30]' },
  { title: 'Conventional (and unconventional) ways to re-activate a disabled Meta Ad Account', accent: 'from-[#0a3a2a] to-[#051f17]' },
  { title: '6 Ways Digital Marketers Are Embracing AI', accent: 'from-[#3d1f10] to-[#1e0d05]' },
  { title: "Did Performance Max Save Google's Ad Crown in 2023?", accent: 'from-[#0d2d4a] to-[#071826]' },
  { title: 'Is Google Ads Worth It For Small Business?', accent: 'from-[#2a2608] to-[#141200]' },
];

type MotionIntensity = 'subtle' | 'balanced' | 'dramatic';

const MOTION_INTENSITY: MotionIntensity = 'balanced';

const MOTION_PRESETS: Record<MotionIntensity, {
  revealDurationMs: number;
  heroFadeMs: number;
  orbDurationSec: number;
  orbDurationAltSec: number;
  orbDriftPx: number;
  marqueeSec: number;
  pulseLineSec: number;
  ctaPopSec: number;
  cardFloatSec: number;
  sweepSec: number;
}> = {
  subtle: {
    revealDurationMs: 540,
    heroFadeMs: 620,
    orbDurationSec: 13,
    orbDurationAltSec: 15,
    orbDriftPx: 12,
    marqueeSec: 12,
    pulseLineSec: 3.1,
    ctaPopSec: 3.2,
    cardFloatSec: 8,
    sweepSec: 5.4,
  },
  balanced: {
    revealDurationMs: 700,
    heroFadeMs: 850,
    orbDurationSec: 9,
    orbDurationAltSec: 11,
    orbDriftPx: 22,
    marqueeSec: 9,
    pulseLineSec: 2.4,
    ctaPopSec: 2.2,
    cardFloatSec: 5.5,
    sweepSec: 3.8,
  },
  dramatic: {
    revealDurationMs: 920,
    heroFadeMs: 1050,
    orbDurationSec: 7,
    orbDurationAltSec: 8.6,
    orbDriftPx: 30,
    marqueeSec: 7,
    pulseLineSec: 1.8,
    ctaPopSec: 1.6,
    cardFloatSec: 4.2,
    sweepSec: 2.9,
  },
};

const NARRATOR_STEPS = [
  { key: 'hero',     label: 'Platform Overview',  hint: 'The growth OS for scalable e-commerce.' },
  { key: 'proof',    label: 'Trusted Partners',    hint: 'Enterprise teams that demand signal, not noise.' },
  { key: 'model',    label: 'Operating Model',     hint: 'Map → Activate → Scale — KPI-gated every step.' },
  { key: 'programs', label: 'Flagship Programs',   hint: 'Precision playbooks ready to deploy today.' },
  { key: 'cta',      label: 'Ready to Launch',     hint: 'Your growth stack is one click away.' },
];

const DEMO_STEP_DURATION_MS = 4000;

export default function Home() {
  const motion = MOTION_PRESETS[MOTION_INTENSITY];
  const motionVars = {
    '--reveal-duration': `${motion.revealDurationMs}ms`,
    '--hero-fade-duration': `${motion.heroFadeMs}ms`,
    '--orb-duration': `${motion.orbDurationSec}s`,
    '--orb-duration-alt': `${motion.orbDurationAltSec}s`,
    '--orb-drift-y': `${motion.orbDriftPx}px`,
    '--marquee-duration': `${motion.marqueeSec}s`,
    '--pulse-line-duration': `${motion.pulseLineSec}s`,
    '--cta-pop-duration': `${motion.ctaPopSec}s`,
    '--card-float-duration': `${motion.cardFloatSec}s`,
    '--sweep-duration': `${motion.sweepSec}s`,
  } as CSSProperties;

  useEffect(() => {
    const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-home-reveal]'));
    if (targets.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -10% 0px' },
    );

    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, []);

  const [demoMode, setDemoMode] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const demoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keyboard controls
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'd' || e.key === 'D') {
        setDemoMode((v) => {
          if (!v) setDemoStep(0);
          return !v;
        });
      }
      if (e.key === 'Escape') {
        setDemoMode(false);
        setDemoStep(0);
      }
      if ((e.key === 'ArrowRight' || e.key === ' ') && demoMode) {
        e.preventDefault();
        setDemoStep((s) => {
          const next = s + 1;
          if (next >= NARRATOR_STEPS.length) {
            setDemoMode(false);
            return 0;
          }
          return next;
        });
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [demoMode]);

  // Auto-scroll + spotlight + auto-advance
  useEffect(() => {
    document.querySelectorAll('[data-demo-section]').forEach((el) => {
      el.classList.remove('demo-spotlight-active');
    });
    if (!demoMode) return;

    const step = NARRATOR_STEPS[demoStep];
    const el = document.querySelector<HTMLElement>(`[data-demo-section="${step.key}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      el.classList.add('demo-spotlight-active');
    }

    demoTimerRef.current = setTimeout(() => {
      setDemoStep((s) => {
        const next = s + 1;
        if (next >= NARRATOR_STEPS.length) {
          setDemoMode(false);
          return 0;
        }
        return next;
      });
    }, DEMO_STEP_DURATION_MS);

    return () => {
      if (demoTimerRef.current) clearTimeout(demoTimerRef.current);
      document.querySelectorAll('[data-demo-section]').forEach((el) => {
        el.classList.remove('demo-spotlight-active');
      });
    };
  }, [demoMode, demoStep]);

  return (
    <div
      className="min-h-screen bg-[#071626] text-[#e9f4ff]"
      style={{ fontFamily: '"Space Grotesk", "Sora", "Poppins", sans-serif', ...motionVars }}
    >
      <style>{`
        .home-reveal {
          opacity: 0;
          transform: translateY(24px) scale(0.985);
          transition: opacity var(--reveal-duration, 700ms) ease, transform var(--reveal-duration, 700ms) ease;
          transition-delay: var(--reveal-delay, 0ms);
        }

        .home-reveal.is-visible {
          opacity: 1;
          transform: translateY(0) scale(1);
        }

        .hero-fade-in {
          opacity: 0;
          transform: translateY(18px);
          animation: heroFadeIn var(--hero-fade-duration, 850ms) ease forwards;
          animation-delay: var(--hero-delay, 0ms);
        }

        .drift-orb {
          animation: orbDrift var(--orb-duration, 9s) ease-in-out infinite;
        }

        .drift-orb.alt {
          animation-duration: var(--orb-duration-alt, 11s);
          animation-delay: 1.3s;
        }

        .ticker-track {
          animation: marquee var(--marquee-duration, 18s) linear infinite;
        }

        .grid-aurora {
          background-image:
            linear-gradient(to right, rgba(145, 201, 255, 0.08) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(145, 201, 255, 0.08) 1px, transparent 1px);
          background-size: 38px 38px;
          mask-image: radial-gradient(circle at 40% 20%, black 35%, transparent 80%);
        }

        .cta-pop {
          animation: ctaPop var(--cta-pop-duration, 2.2s) ease-in-out infinite;
        }

        .soft-float {
          animation: cardFloat var(--card-float-duration, 5.5s) ease-in-out infinite;
        }

        .shine-sweep {
          position: relative;
          overflow: hidden;
        }

        .shine-sweep::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(110deg, transparent 25%, rgba(255,255,255,0.35) 48%, transparent 72%);
          transform: translateX(-120%);
          animation: sweep var(--sweep-duration, 3.8s) ease-in-out infinite;
          pointer-events: none;
        }

        .pulse-line {
          animation: pulseLine var(--pulse-line-duration, 2.4s) ease-in-out infinite;
        }

        @keyframes heroFadeIn {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes orbDrift {
          0%,
          100% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(0, calc(var(--orb-drift-y, 22px) * -1), 0); }
        }

        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }

        @keyframes pulseLine {
          0%,
          100% { opacity: 0.35; }
          50% { opacity: 1; }
        }

        @keyframes ctaPop {
          0%, 100% { transform: translateY(0); box-shadow: 0 12px 26px rgba(56, 196, 245, 0.25); }
          50% { transform: translateY(-2px); box-shadow: 0 16px 36px rgba(56, 196, 245, 0.45); }
        }

        @keyframes cardFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }

        @keyframes sweep {
          0%, 35% { transform: translateX(-120%); }
          70%, 100% { transform: translateX(120%); }
        }

        @keyframes demoProgress {
          from { width: 0%; }
          to { width: 100%; }
        }

        .demo-spotlight-active {
          box-shadow: inset 0 0 0 2px rgba(57, 198, 244, 0.65), inset 0 0 80px rgba(57, 198, 244, 0.08);
          transition: box-shadow 0.4s ease;
        }

        @media (prefers-reduced-motion: reduce) {
          .hero-fade-in,
          .drift-orb,
          .ticker-track,
          .pulse-line,
          .cta-pop,
          .soft-float,
          .shine-sweep::after {
            animation: none !important;
          }

          .home-reveal {
            opacity: 1;
            transform: none;
            transition: none;
          }
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="grid-aurora absolute inset-0 opacity-60" />
        <div className="drift-orb absolute -left-24 top-16 h-72 w-72 rounded-full bg-[#19b5e4]/20 blur-3xl" />
        <div className="drift-orb alt absolute right-[-80px] top-1/3 h-80 w-80 rounded-full bg-[#f58b3c]/15 blur-3xl" />
        <div className="absolute bottom-[-120px] left-1/3 h-96 w-96 rounded-full bg-[#2a89ff]/15 blur-3xl" />
      </div>

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
            <a href="#proof" className="transition-colors hover:text-white">Proof</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login" className="rounded-lg border border-[#5da8dc]/50 px-4 py-2 text-xs font-semibold text-[#cfe9ff] transition hover:bg-[#0f2a42] sm:text-sm">
              Sign In
            </Link>
            <Link to="/signup" className="rounded-lg bg-[#3dc8f6] px-4 py-2 text-xs font-bold text-[#062033] transition hover:bg-[#68d6fb] sm:text-sm">
              Start Free
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section data-demo-section="hero" className="relative overflow-hidden border-b border-white/10">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-16 pt-14 sm:px-6 md:pt-20 lg:grid-cols-[1.1fr_0.9fr] lg:px-10">
            <div className="relative">
              <div className="hero-fade-in absolute -left-3 top-1 hidden w-1 rounded-full bg-gradient-to-b from-[#7fdcff] to-[#f6a96f] lg:block pulse-line" style={{ height: '84%', ['--hero-delay' as string]: '120ms' }} />
              <p className="hero-fade-in mb-4 inline-flex items-center gap-2 rounded-full border border-[#59c0f2]/30 bg-[#0f2a42]/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#89d7ff]" style={{ ['--hero-delay' as string]: '70ms' }}>
                <Compass size={14} />
                Production-Grade Growth Platform
              </p>
              <h1 className="hero-fade-in text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl" style={{ ['--hero-delay' as string]: '170ms' }}>
                Turn Marketing Into a
                <span className="block bg-gradient-to-r from-[#61d6ff] via-[#8be3ff] to-[#ffd0a1] bg-clip-text text-transparent">
                  Predictable Revenue System
                </span>
              </h1>
              <p className="hero-fade-in mt-6 max-w-xl text-base leading-relaxed text-[#b8d8f6] sm:text-lg" style={{ ['--hero-delay' as string]: '260ms' }}>
                One operating system for scalable e-commerce growth.
              </p>
              <div className="hero-fade-in mt-8 flex flex-wrap items-center gap-3" style={{ ['--hero-delay' as string]: '340ms' }}>
                <Link to="/signup" className="shine-sweep cta-pop group inline-flex items-center gap-2 rounded-xl bg-[#39c6f4] px-6 py-3 text-sm font-extrabold uppercase tracking-[0.08em] text-[#042236] transition hover:bg-[#68d6fb]">
                  Launch Your Growth Stack
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                </Link>
                <a href="#proof" className="inline-flex items-center gap-2 rounded-xl border border-[#5da8dc]/50 bg-[#0f2a42]/50 px-6 py-3 text-sm font-semibold text-[#d7ecff] transition hover:bg-[#123451]">
                  <CheckCircle2 size={16} />
                  See Proof Metrics
                </a>
              </div>

              <div className="hero-fade-in mt-8 grid max-w-xl gap-2 sm:grid-cols-3" style={{ ['--hero-delay' as string]: '430ms' }}>
                {storyBeats.map((beat) => (
                  <div key={beat.label} className="rounded-lg border border-white/10 bg-[#0d2840]/65 p-3">
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#8edcff]">{beat.label}</p>
                    <p className="mt-1 text-xs text-[#bddcf8]">{beat.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative hero-fade-in" style={{ ['--hero-delay' as string]: '200ms' }}>
              <div className="soft-float rounded-2xl border border-white/15 bg-gradient-to-br from-[#0d2439] via-[#102d47] to-[#0a2034] p-5 shadow-[0_26px_70px_rgba(0,0,0,0.45)]">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[#8bcdf8]">Mission Control</p>
                    <p className="mt-1 text-xl font-black text-white">Performance Signal Board</p>
                  </div>
                  <div className="rounded-full border border-[#6bc7f7]/35 bg-[#12344f] px-3 py-1 text-xs font-semibold text-[#94dbff]">
                    Live
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {proofMetrics.map((metric) => (
                    <div key={metric.label} className="rounded-xl border border-white/10 bg-[#0b2135] p-4">
                      <p className="text-2xl font-black text-[#87deff]">{metric.value}</p>
                      <p className="mt-1 text-xs leading-snug text-[#aacfe9]">{metric.label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-xl border border-[#f59a46]/25 bg-[#f59a46]/10 px-4 py-3 text-xs text-[#ffd9b8]">
                  <span className="font-bold">Operator note:</span> daily governance keeps spend efficient while preserving growth velocity.
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="proof" data-demo-section="proof" className="border-b border-white/10 bg-[#0a1f32]/70 py-10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
            <p className="home-reveal mb-4 text-center text-xs font-semibold uppercase tracking-[0.22em] text-[#8bcdf8]" data-home-reveal>
              Trusted by teams that demand signal over noise
            </p>
            <div className="home-reveal overflow-hidden rounded-xl border border-white/10 bg-[#0f2a42]" data-home-reveal style={{ ['--reveal-delay' as string]: '70ms' }}>
              <div className="ticker-track flex w-[200%] gap-3 px-3 py-3">
                {[...trustedBy, ...trustedBy].map((brand, idx) => (
                  <div key={`${brand}-${idx}`} className="min-w-[140px] rounded-lg border border-white/10 bg-[#102940] px-3 py-3 text-center text-xs font-bold text-[#d7ecff] transition hover:-translate-y-0.5 hover:border-[#7fdcff]/50">
                    {brand}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="model" data-demo-section="model" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-10">
          <div className="home-reveal mb-10 flex items-end justify-between gap-4" data-home-reveal>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8bcdf8]">Operating model</p>
              <h2 className="mt-2 text-3xl font-black text-white sm:text-4xl">How Steadfast compounds growth</h2>
            </div>
            <div className="hidden items-center gap-2 rounded-lg border border-white/10 bg-[#0f2a42]/70 px-3 py-2 text-xs font-semibold text-[#c6e5ff] md:inline-flex">
              <Zap size={14} />
              Extra-production workflow
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="grid gap-4 sm:grid-cols-2">
              {valuePillars.map((pillar, index) => {
                const Icon = pillar.icon;
                return (
                  <article key={pillar.title} className="home-reveal rounded-2xl border border-white/10 bg-[#0f2a42]/75 p-5 transition hover:-translate-y-1 hover:border-[#6fcffb]/45 hover:bg-[#143653]" data-home-reveal style={{ ['--reveal-delay' as string]: `${index * 80}ms` }}>
                    <div className="mb-3 inline-flex rounded-lg bg-[#39c6f4]/15 p-2 text-[#84ddff]">
                      <Icon size={18} />
                    </div>
                    <h3 className="text-lg font-bold text-white">{pillar.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#b8d8f6]">{pillar.text}</p>
                  </article>
                );
              })}
            </div>

            <div className="home-reveal rounded-2xl border border-white/10 bg-gradient-to-b from-[#122f49] to-[#0c243a] p-6" data-home-reveal style={{ ['--reveal-delay' as string]: '220ms' }}>
              <h3 className="text-lg font-black text-white">Execution Timeline</h3>
              <div className="mt-5 space-y-4">
                {operatingModel.map((step) => (
                  <div key={step.stage} className="relative rounded-xl border border-white/10 bg-[#0a2034] p-4 pl-14">
                    <span className="absolute left-4 top-4 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#3dc8f6] text-xs font-black text-[#062033]">
                      {step.stage}
                    </span>
                    <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#8fd8ff]">{step.title}</p>
                    <p className="mt-1 text-sm text-[#c9e7ff]">{step.detail}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-xl border border-[#5dc4f5]/25 bg-[#5dc4f5]/10 px-4 py-3 text-sm text-[#c9ecff]">
                Every stage is KPI-gated. Nothing scales without proof.
              </div>
            </div>
          </div>
        </section>

        <section id="programs" data-demo-section="programs" className="border-t border-white/10 bg-[#091b2b] py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
            <h2 className="home-reveal text-3xl font-black text-white sm:text-4xl" data-home-reveal>Flagship Programs</h2>
            <p className="home-reveal mt-3 max-w-2xl text-[#b8d8f6]" data-home-reveal style={{ ['--reveal-delay' as string]: '70ms' }}>
              Fast to deploy. Safe to scale. Built to win scrutiny.
            </p>
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {featuredPrograms.map((program, index) => (
                <article key={program.name} className="home-reveal group overflow-hidden rounded-2xl border border-white/10 bg-[#102940]" data-home-reveal style={{ ['--reveal-delay' as string]: `${120 + index * 90}ms` }}>
                  <div className={`h-2 bg-gradient-to-r ${program.accent}`} />
                  <div className="p-5">
                    <div className="mb-3 inline-flex rounded-lg bg-white/10 p-2 text-[#8fd8ff]">
                      <Layers3 size={16} />
                    </div>
                    <h3 className="text-xl font-black text-white">{program.name}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#bddcf8]">{program.summary}</p>
                    <p className="mt-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#9fe2ff]">
                      Production-ready
                      <Gem size={14} />
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── Strategic Insights / Personalized Tactics ── */}
        <section className="border-t border-white/10 py-20">
          <div className="mx-auto max-w-7xl space-y-24 px-4 sm:px-6 lg:px-10">

            {/* Strategic Insights — visual left, text right */}
            <div className="home-reveal grid gap-12 lg:grid-cols-2 lg:items-center" data-home-reveal>
              {/* Visual panel */}
              <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#0d2439] via-[#102d47] to-[#0a2034] p-6 shadow-[0_26px_70px_rgba(0,0,0,0.4)]">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[#8bcdf8]">Channel Attribution</p>
                    <p className="mt-1 text-lg font-black text-white">Multi-Channel Performance</p>
                  </div>
                  <span className="rounded-full border border-[#6bc7f7]/35 bg-[#12344f] px-3 py-1 text-xs font-semibold text-[#94dbff]">Live</span>
                </div>
                <div className="space-y-3">
                  {([
                    { channel: 'Google Ads', share: 38, color: 'bg-[#4285f4]' },
                    { channel: 'Meta Ads', share: 31, color: 'bg-[#1877f2]' },
                    { channel: 'TikTok Ads', share: 24, color: 'bg-[#ff0050]' },
                    { channel: 'Other Channels', share: 7, color: 'bg-[#8fd8ff]/50' },
                  ] as const).map((ch) => (
                    <div key={ch.channel} className="flex items-center gap-3">
                      <span className="w-28 shrink-0 text-xs text-[#aacfe9]">{ch.channel}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                        <div className={`h-full rounded-full ${ch.color}`} style={{ width: `${ch.share}%` }} />
                      </div>
                      <span className="w-8 text-right text-xs font-bold text-[#d7ecff]">{ch.share}%</span>
                    </div>
                  ))}
                </div>
                <div className="mt-5 rounded-xl border border-[#39c6f4]/25 bg-[#39c6f4]/10 px-4 py-3 text-xs text-[#c9ecff]">
                  <span className="font-bold">ROAS +2.4×</span> this week — ecosystem-wide optimisation active.
                </div>
              </div>
              {/* Text panel */}
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#39c6f4]/35 bg-[#39c6f4]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#8be3ff]">
                  <Compass size={12} />
                  Channel Mastery
                </span>
                <h2 className="mt-4 text-3xl font-black text-white sm:text-4xl">Strategic Insights</h2>
                <p className="mt-4 text-lg leading-relaxed text-[#b8d8f6]">
                  In today's dynamic landscape, mastering channels like Google, Meta and TikTok feels like navigating a complex ecosystem. Algorithms evolve, audiences fragment and success demands both channel expertise and a holistic approach. That's where we come in.
                </p>
                <Link to="/signup" className="shine-sweep mt-6 inline-flex items-center gap-2 rounded-xl bg-[#39c6f4] px-5 py-3 text-sm font-black uppercase tracking-[0.08em] text-[#042236] transition hover:bg-[#68d6fb]">
                  Start Building
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>

            {/* Personalized Tactics — text left, visual right */}
            <div className="home-reveal grid gap-12 lg:grid-cols-2 lg:items-center" data-home-reveal style={{ ['--reveal-delay' as string]: '70ms' }}>
              {/* Text panel */}
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#f9a84f]/35 bg-[#f9a84f]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#ffd59e]">
                  <Sparkles size={12} />
                  Audience-First
                </span>
                <h2 className="mt-4 text-3xl font-black text-white sm:text-4xl">Personalized Tactics</h2>
                <p className="mt-4 text-lg leading-relaxed text-[#b8d8f6]">
                  Forget one-size-fits-all marketing. We delve into your audience's unique wants and needs, crafting personalized copy, and experiences that resonate deeply — and it's at the heart of our success.
                </p>
                <Link to="/signup" className="mt-6 inline-flex items-center gap-2 rounded-xl border border-[#f9a84f]/40 bg-[#f9a84f]/10 px-5 py-3 text-sm font-bold text-[#ffd09e] transition hover:bg-[#f9a84f]/20">
                  See How We Do It
                  <ArrowRight size={16} />
                </Link>
              </div>
              {/* Visual panel */}
              <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#1c1228] via-[#170e23] to-[#0d0919] p-6 shadow-[0_26px_70px_rgba(0,0,0,0.4)]">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[#c9a8ff]">Audience Intelligence</p>
                    <p className="mt-1 text-lg font-black text-white">Precision Segmentation</p>
                  </div>
                  <span className="rounded-full border border-[#c9a8ff]/35 bg-[#2a1a4e] px-3 py-1 text-xs font-semibold text-[#d8bfff]">AI-Driven</span>
                </div>
                <div className="space-y-3">
                  {([
                    { segment: 'High-Intent Buyers', count: '12.4k', color: 'bg-[#39c6f4]' },
                    { segment: 'Cart Abandoners', count: '8.1k', color: 'bg-[#f9a84f]' },
                    { segment: 'Loyalty Tier', count: '5.7k', color: 'bg-[#54d68c]' },
                    { segment: 'Lookalike Seeds', count: '23.9k', color: 'bg-[#c084fc]' },
                  ] as const).map((seg) => (
                    <div key={seg.segment} className="flex items-center gap-3 rounded-lg border border-white/10 bg-[#0d0d1e]/50 px-3 py-2.5">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${seg.color}`} />
                      <span className="flex-1 text-xs text-[#d7ecff]">{seg.segment}</span>
                      <span className="text-xs font-bold text-[#c0b8ff]">{seg.count}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-5 rounded-xl border border-[#c084fc]/25 bg-[#c084fc]/10 px-4 py-3 text-xs text-[#e5d0ff]">
                  <span className="font-bold">94% match quality</span> — audience model tuned weekly.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Areas of Focus ── */}
        <section className="border-t border-white/10 bg-[#091b2b] py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
            <div className="home-reveal mb-12 text-center" data-home-reveal>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8bcdf8]">What We Do</p>
              <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl">Areas of Focus</h2>
              <p className="mx-auto mt-3 max-w-xl text-[#b8d8f6]">
                From search to social, content to strategy — every channel, fully owned.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {areasOfFocus.map((area, index) => {
                const Icon = area.icon;
                return (
                  <article
                    key={area.title}
                    className={`home-reveal rounded-2xl p-5 transition hover:-translate-y-1 ${
                      area.highlight
                        ? 'bg-[#00c6ef] text-[#021d2e] shadow-[0_8px_32px_rgba(0,198,239,0.3)]'
                        : 'border border-white/10 bg-[#0f2a42]/75 hover:border-[#6fcffb]/45 hover:bg-[#143653]'
                    }`}
                    data-home-reveal
                    style={{ ['--reveal-delay' as string]: `${index * 70}ms` }}
                  >
                    <div className={`mb-3 inline-flex rounded-lg p-2 ${area.highlight ? 'bg-[#021d2e]/20' : 'bg-[#39c6f4]/15'}`}>
                      <Icon size={18} className={area.highlight ? 'text-[#021d2e]' : 'text-[#84ddff]'} />
                    </div>
                    <h3 className={`text-base font-bold ${area.highlight ? 'text-[#021d2e]' : 'text-white'}`}>{area.title}</h3>
                    <p className={`mt-2 text-sm leading-relaxed ${area.highlight ? 'text-[#033a54]' : 'text-[#b8d8f6]'}`}>{area.body}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Our Clients ── */}
        <section className="border-t border-white/10 bg-[#070e1a] py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
            <div className="home-reveal mb-10 text-center" data-home-reveal>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8bcdf8]">Our Clients</p>
              <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl">Trusted by Industry Leaders</h2>
              <p className="mx-auto mt-3 max-w-xl text-[#b8d8f6]">
                From heritage fashion to consumer health to enterprise finance — we drive measurable growth for each one.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7">
              {trustedBy.map((brand, index) => (
                <div
                  key={brand}
                  className="home-reveal rounded-2xl border border-white/10 bg-[#0f2a42]/75 px-3 py-5 text-center text-xs font-black uppercase tracking-[0.1em] text-[#d7ecff] transition hover:-translate-y-1 hover:border-[#7fdcff]/50 hover:bg-[#143653]"
                  data-home-reveal
                  style={{ ['--reveal-delay' as string]: `${index * 40}ms` }}
                >
                  {brand}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Blog ── */}
        <section className="border-t border-white/10 bg-[#071626] py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
            <div className="home-reveal mb-10 flex items-end justify-between gap-4" data-home-reveal>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8bcdf8]">Knowledge Base</p>
                <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl">Latest Insights</h2>
              </div>
              <a href="#blog" className="hidden items-center gap-2 text-sm font-semibold text-[#8bcdf8] transition hover:text-white md:flex">
                All Articles
                <ChevronRight size={16} />
              </a>
            </div>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {blogPosts.map((post, index) => (
                <article
                  key={post.title}
                  className="home-reveal group overflow-hidden rounded-2xl border border-white/10 bg-[#0f2a42] transition hover:-translate-y-1 hover:border-[#6fcffb]/45 hover:shadow-[0_12px_40px_rgba(0,0,0,0.4)]"
                  data-home-reveal
                  style={{ ['--reveal-delay' as string]: `${100 + index * 80}ms` }}
                >
                  <div className={`flex h-36 items-end bg-gradient-to-br p-4 ${post.accent}`}>
                    <div className="rounded-lg bg-[#0a1e35]/60 px-2.5 py-1.5 backdrop-blur-sm">
                      <BookOpen size={14} className="mr-1.5 inline text-[#8fd8ff]" />
                      <span className="text-xs font-semibold text-[#c9e7ff]">Steadfast Blog</span>
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="text-base font-bold leading-snug text-white transition group-hover:text-[#8be3ff]">
                      {post.title}
                    </h3>
                    <a
                      href="#blog"
                      className="mt-3 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.1em] text-[#39c6f4] transition hover:text-[#9be7ff]"
                    >
                      Read More
                      <ChevronRight size={13} />
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section data-demo-section="cta" className="mx-auto max-w-7xl px-4 pb-20 pt-14 sm:px-6 lg:px-10">
          <div className="home-reveal rounded-3xl border border-white/15 bg-gradient-to-r from-[#10314c] via-[#123955] to-[#15354d] p-8 shadow-[0_25px_60px_rgba(0,0,0,0.35)] sm:p-10" data-home-reveal>
            <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
              <div>
                <p className="inline-flex items-center gap-2 rounded-full border border-[#79d6ff]/35 bg-[#2baee1]/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#9ee5ff]">
                  <Globe size={14} />
                  Judge-ready presentation mode
                </p>
                <h2 className="mt-4 text-3xl font-black text-white sm:text-4xl">Show up with a landing page that looks like a market leader.</h2>
                <p className="mt-4 max-w-2xl text-[#cbe8ff]">
                  Designed for high trust, fast comprehension, and decisive action. Optimized for both desktop and mobile conversion paths.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <Link to="/signup" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#44cef8] px-5 py-3 text-sm font-black uppercase tracking-[0.09em] text-[#07253b] transition hover:bg-[#71dcfb]">
                  Create your account
                  <ArrowRight size={16} />
                </Link>
                <Link to="/login" className="inline-flex items-center justify-center rounded-xl border border-[#7fcff7]/40 bg-[#0e2f47]/60 px-5 py-3 text-sm font-semibold text-[#d7ecff] transition hover:bg-[#14415f]">
                  Access dashboard
                </Link>
              </div>
            </div>
          </div>

          <footer className="mt-10 text-center text-xs text-[#91b7d6]">
            © 2026 Steadfast Digital, Inc. Built for measurable growth.
          </footer>
        </section>
      </main>

      {/* Demo Tour trigger button */}
      {!demoMode && (
        <button
          onClick={() => { setDemoMode(true); setDemoStep(0); }}
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full border border-[#3dc8f6]/35 bg-[#071626]/90 px-4 py-2.5 text-xs font-semibold text-[#8ed8ff] shadow-lg backdrop-blur-xl transition hover:border-[#3dc8f6]/70 hover:text-white"
          title="Launch demo tour (press D)"
        >
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#3dc8f6]/70" />
          Demo Tour
          <kbd className="ml-0.5 rounded bg-white/10 px-1.5 py-0.5 font-mono text-[9px] text-[#6baec8]">D</kbd>
        </button>
      )}

      {/* Demo Narrator HUD */}
      {demoMode && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2">
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-[#3dc8f6]/40 bg-[#071626]/95 px-6 py-4 shadow-[0_0_48px_rgba(57,198,244,0.22)] backdrop-blur-2xl">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 rounded-full bg-[#3dc8f6]/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#7fe4ff]">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#3dc8f6]" />
                Demo Mode
              </span>
              <p className="text-sm font-bold text-white">{NARRATOR_STEPS[demoStep].label}</p>
              <span className="text-xs text-[#8bcdf8]">{NARRATOR_STEPS[demoStep].hint}</span>
            </div>
            <div className="h-[3px] w-full overflow-hidden rounded-full bg-white/10">
              <div
                key={`dp-${demoStep}`}
                className="h-full rounded-full bg-gradient-to-r from-[#3dc8f6] to-[#8be5ff]"
                style={{ animation: `demoProgress ${DEMO_STEP_DURATION_MS}ms linear forwards` }}
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex gap-1.5">
                {NARRATOR_STEPS.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setDemoStep(idx)}
                    className={`h-2 rounded-full transition-all ${idx === demoStep ? 'w-5 bg-[#3dc8f6]' : 'w-2 bg-white/25 hover:bg-white/50'}`}
                    aria-label={`Go to step ${idx + 1}`}
                  />
                ))}
              </div>
              <div className="ml-2 flex items-center gap-1.5 text-[10px] text-[#6ba8cc]">
                <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5">→</kbd>
                <span>next</span>
                <span className="opacity-40">·</span>
                <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5">Esc</kbd>
                <span>exit</span>
              </div>
              <button
                onClick={() => { setDemoMode(false); setDemoStep(0); }}
                className="ml-1 text-sm text-[#5a86a4] transition hover:text-white"
                aria-label="Exit demo mode"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
