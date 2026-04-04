import { Link } from 'react-router';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Compass,
  Gem,
  Globe,
  Layers3,
  ShieldCheck,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react';
import logoImage from '../../assets/4b611159e2ff0ca97c6252bef878e480dedd2a43.png';

const valuePillars = [
  {
    title: 'Precision Growth Engine',
    text: 'Performance-led campaign orchestration with measurable revenue outcomes and daily optimization loops.',
    icon: Target,
  },
  {
    title: 'Risk-Aware Operations',
    text: 'Governed execution pipelines with policy controls, clean audit trails, and resilient scaling patterns.',
    icon: ShieldCheck,
  },
  {
    title: 'Creative Intelligence Layer',
    text: 'High-conversion creative experiments informed by live behavioral insights and intent signals.',
    icon: Sparkles,
  },
  {
    title: 'Decision-Grade Analytics',
    text: 'Signal-rich dashboards that turn ad spend into strategic decisions across channels and cohorts.',
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
  'UNDP',
  'NYU Langone Health',
  'UBS',
  'Magellan Jets',
  'The Vitamin Shoppe',
  'BLAST',
  'Organicgirl',
  'Giadzy',
];

export default function Home() {
  return (
    <div
      className="min-h-screen bg-[#071626] text-[#e9f4ff]"
      style={{ fontFamily: '"Space Grotesk", "Sora", "Poppins", sans-serif' }}
    >
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-24 top-16 h-72 w-72 rounded-full bg-[#19b5e4]/20 blur-3xl" />
        <div className="absolute right-[-80px] top-1/3 h-80 w-80 rounded-full bg-[#f58b3c]/15 blur-3xl" />
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
        <section className="relative overflow-hidden border-b border-white/10">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-16 pt-14 sm:px-6 md:pt-20 lg:grid-cols-[1.1fr_0.9fr] lg:px-10">
            <div>
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#59c0f2]/30 bg-[#0f2a42]/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#89d7ff]">
                <Compass size={14} />
                Production-Grade Growth Platform
              </p>
              <h1 className="text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">
                Turn Marketing Into a
                <span className="block bg-gradient-to-r from-[#61d6ff] via-[#8be3ff] to-[#ffd0a1] bg-clip-text text-transparent">
                  Predictable Revenue System
                </span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-[#b8d8f6] sm:text-lg">
                Steadfast Digital fuses campaign strategy, execution discipline, and analytics intelligence into one operating system built for scalable e-commerce growth.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link to="/signup" className="group inline-flex items-center gap-2 rounded-xl bg-[#39c6f4] px-6 py-3 text-sm font-extrabold uppercase tracking-[0.08em] text-[#042236] transition hover:bg-[#68d6fb]">
                  Launch Your Growth Stack
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                </Link>
                <a href="#proof" className="inline-flex items-center gap-2 rounded-xl border border-[#5da8dc]/50 bg-[#0f2a42]/50 px-6 py-3 text-sm font-semibold text-[#d7ecff] transition hover:bg-[#123451]">
                  <CheckCircle2 size={16} />
                  See Proof Metrics
                </a>
              </div>
            </div>

            <div className="relative">
              <div className="rounded-2xl border border-white/15 bg-gradient-to-br from-[#0d2439] via-[#102d47] to-[#0a2034] p-5 shadow-[0_26px_70px_rgba(0,0,0,0.45)]">
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

        <section id="proof" className="border-b border-white/10 bg-[#0a1f32]/70 py-10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
            <p className="mb-4 text-center text-xs font-semibold uppercase tracking-[0.22em] text-[#8bcdf8]">Trusted by teams that demand signal over noise</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
              {trustedBy.map((brand) => (
                <div key={brand} className="rounded-lg border border-white/10 bg-[#102940] px-3 py-3 text-center text-xs font-bold text-[#d7ecff]">
                  {brand}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="model" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-10">
          <div className="mb-10 flex items-end justify-between gap-4">
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
              {valuePillars.map((pillar) => {
                const Icon = pillar.icon;
                return (
                  <article key={pillar.title} className="rounded-2xl border border-white/10 bg-[#0f2a42]/75 p-5 transition hover:border-[#6fcffb]/45 hover:bg-[#143653]">
                    <div className="mb-3 inline-flex rounded-lg bg-[#39c6f4]/15 p-2 text-[#84ddff]">
                      <Icon size={18} />
                    </div>
                    <h3 className="text-lg font-bold text-white">{pillar.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#b8d8f6]">{pillar.text}</p>
                  </article>
                );
              })}
            </div>

            <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#122f49] to-[#0c243a] p-6">
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

        <section id="programs" className="border-t border-white/10 bg-[#091b2b] py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
            <h2 className="text-3xl font-black text-white sm:text-4xl">Flagship Programs</h2>
            <p className="mt-3 max-w-2xl text-[#b8d8f6]">
              Built to be deployable fast, auditable at scale, and defensible in high-stakes growth reviews.
            </p>
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {featuredPrograms.map((program) => (
                <article key={program.name} className="group overflow-hidden rounded-2xl border border-white/10 bg-[#102940]">
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

        <section className="mx-auto max-w-7xl px-4 pb-20 pt-14 sm:px-6 lg:px-10">
          <div className="rounded-3xl border border-white/15 bg-gradient-to-r from-[#10314c] via-[#123955] to-[#15354d] p-8 shadow-[0_25px_60px_rgba(0,0,0,0.35)] sm:p-10">
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
    </div>
  );
}
