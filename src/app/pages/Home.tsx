import { Link } from 'react-router';
import {
  Briefcase,
  CalendarDays,
  HandCoins,
  Landmark,
  ScrollText,
  ShieldCheck,
  Target,
  TrendingUp,
} from 'lucide-react';
import logoImage from '../../assets/4b611159e2ff0ca97c6252bef878e480dedd2a43.png';

const serviceTiles = [
  { label: 'Brand Strategy', icon: Briefcase },
  { label: 'Campaign Planning', icon: CalendarDays },
  { label: 'ROI Tracking', icon: TrendingUp },
  { label: 'Media Buying', icon: Landmark },
  { label: 'Task Review', icon: ScrollText },
  { label: 'Risk Control', icon: ShieldCheck },
  { label: 'Audience Growth', icon: Target },
  { label: 'Revenue Lift', icon: HandCoins },
];

const expertiseItems = [
  'Digital Advertising',
  'SEO & Content Systems',
  'Creative Performance Optimization',
  'Marketplace Conversion Strategy',
  'Retention and Lifecycle Funnels',
];

const workHighlights = [
  {
    title: 'Zoomin',
    subtitle: 'Community pet-care campaign launch',
    image:
      'https://images.unsplash.com/photo-1592194996308-7b43878e84a6?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Casa Foods',
    subtitle: 'Commerce retargeting and product lift',
    image:
      'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'AlohaBoat',
    subtitle: 'Luxury booking funnel optimization',
    image:
      'https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?auto=format&fit=crop&w=1200&q=80',
  },
];

const clientNames = ['AgEagle', 'NYU Langone Health', 'Organicgirl', 'Newmans Own', 'UNDP', 'Forward Labs'];

export default function Home() {
  return (
    <div className="min-h-screen w-full bg-[#f5f7fb]">
      {/* Minimal Header â€” logo only */}
      <header className="relative z-20 flex items-center px-6 py-3 bg-gradient-to-r from-[#1e2838] via-[#2c3e50] to-[#34495e] border-b border-[#5dade2]/20 shadow-lg shadow-[#5dade2]/5">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-[#5dade2] blur-xl opacity-30"></div>
            <img src={logoImage} alt="Steadfast Digital Logo" className="relative z-10 w-12 h-12 object-contain drop-shadow-lg" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tight bg-gradient-to-r from-[#5dade2] via-[#60a5fa] to-[#5dade2] bg-clip-text text-transparent">
              STEADFAST
            </span>
            <span className="text-[10px] tracking-[0.3em] text-gray-400 font-semibold uppercase -mt-1">
              Digital
            </span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-[78vh] flex flex-col items-center justify-center bg-gradient-to-br from-[#2a3f5f] via-[#1a1f2e] to-[#2d3a56] overflow-hidden">
        {/* Video Background */}
        <div className="absolute inset-0 w-full h-full overflow-hidden">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute top-1/2 left-1/2 min-w-full min-h-full w-auto h-auto transform -translate-x-1/2 -translate-y-1/2 object-cover"
            style={{ filter: 'brightness(0.4) contrast(1.1) saturate(0.8)' }}
          >
            <source src="/banner-cdc94d47.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1f2e]/70 via-[#2a3f5f]/60 to-[#1a1f2e]/75"></div>
          <div className="absolute inset-0 bg-[#00D9FF]/5"></div>
        </div>

        {/* Glow orbs */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-20 right-20 w-96 h-96 bg-[#00D9FF] rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 left-20 w-96 h-96 bg-[#5dade2] rounded-full blur-3xl"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 text-center text-white px-6">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 drop-shadow-2xl" style={{ textShadow: '0 0 30px rgba(93, 173, 226, 0.5), 0 4px 20px rgba(0, 0, 0, 0.8)' }}>Steadfast Digital</h1>
          <p className="text-xl md:text-2xl mb-4 font-light drop-shadow-2xl" style={{ textShadow: '0 0 20px rgba(93, 173, 226, 0.3), 0 2px 15px rgba(0, 0, 0, 0.8)' }}>a Performance-driven Digital Marketing Agency</p>
          <p className="text-lg mb-10 text-gray-200 drop-shadow-2xl" style={{ textShadow: '0 0 15px rgba(93, 173, 226, 0.3), 0 2px 10px rgba(0, 0, 0, 0.8)' }}>Data Optimization Platform for E-commerce Growth</p>
          <Link
            to="/login"
            className="inline-block bg-[#00D9FF] hover:bg-[#00c5e6] text-[#1a1f2e] px-10 py-3 rounded font-bold text-sm tracking-wider transition-all duration-300 shadow-2xl hover:shadow-[0_0_30px_rgba(0,217,255,0.6)] hover:scale-105"
          >
            GET STARTED
          </Link>
        </div>
      </section>

      {/* Welcome Section */}
      <section className="bg-gradient-to-br from-[#1a1f2e] to-[#2d3a56] py-12 sm:py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="text-white">
              <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-[#00D9FF]">Welcome to Steadfast Digital</h2>
              <p className="text-base sm:text-lg text-gray-300 mb-4 leading-relaxed">
                We are a performance-driven agency dedicated to serving the digital marketing needs of start-ups and emerging brands.
              </p>
              <p className="text-base sm:text-lg text-gray-300 mb-4 leading-relaxed">
                We aim to amplify your digital presence by identifying and engaging your target audience at minimal acquisition costs.
              </p>
              <p className="text-base sm:text-lg text-gray-300 leading-relaxed">
                Most of our clientele, spanning e-commerce and service sectors, choose us for our data-driven approach and proven track record of paid media success.
              </p>
            </div>
            <div className="hidden md:block">
              <div className="relative w-full h-64 bg-[#00D9FF]/10 rounded-lg border-2 border-[#00D9FF]/30 flex items-center justify-center">
                <div className="text-center text-[#00D9FF]">
                  <svg className="w-24 h-24 mx-auto mb-2 opacity-30" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Strategic Insights Section */}
      <section className="bg-gradient-to-br from-[#2d3a56] to-[#1a1f2e] py-12 sm:py-16 border-t border-[#00D9FF]/20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="hidden md:block">
              <div className="relative w-full h-64 bg-gradient-to-br from-cyan-400/20 to-blue-600/20 rounded-lg border border-[#00D9FF]/30 flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48ZmlsdGVyIGlkPSJncmlkIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC41IiBudW1PY3RhdmVzPSI0IiByZXN1bHQ9Im5vaXNlIi8+PGZlQ29sb3JNYXRyaXggaW49Im5vaXNlIiB0eXBlPSJzYXR1cmF0ZSIgdmFsdWVzPSIwLjMiLz48L2ZpbHRlcj48L2RlZnM+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiMwMDQ0YWEiIGZpbHRlcj0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-40"></div>
              </div>
            </div>
            <div className="text-white">
              <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-[#00D9FF]">Strategic Insights</h2>
              <p className="text-base sm:text-lg text-gray-300 mb-6 leading-relaxed">
                In today's dynamic landscape, mastering channels like Google, Meta and TikTok feels like navigating a complex ecosystem.
              </p>
              <p className="text-base sm:text-lg text-gray-300 leading-relaxed">
                Algorithms evolve, audiences fragment and success demands both channel expertise and a holistic approach. That's where we come in.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Areas of Focus Section */}
      <section className="bg-gradient-to-br from-[#1a1f2e] to-[#2d3a56] py-12 sm:py-16 border-t border-[#00D9FF]/20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12 text-[#00D9FF]">Areas of Focus</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Search Engine Marketing */}
            <div className="bg-[#00D9FF] text-[#1a1f2e] rounded-lg p-6">
              <h3 className="text-xl font-bold mb-4">Search Engine Marketing</h3>
              <p className="text-sm leading-relaxed">
                Google Ads & Bing Ads: Designed for precision targeting, data-driven tests, and maximizing ROAS.
              </p>
            </div>
            {/* Paid Social */}
            <div className="bg-[#252b3d] text-white rounded-lg p-6 border border-[#00D9FF]/30">
              <h3 className="text-xl font-bold mb-4 text-[#00D9FF]">Paid Social</h3>
              <p className="text-sm leading-relaxed text-gray-300">
                Facebook, Instagram, Pinterest, TikTok, and LinkedIn Ads. Reach the right audience at the right time in the right place.
              </p>
            </div>
            {/* Paid Content */}
            <div className="bg-[#252b3d] text-white rounded-lg p-6 border border-[#00D9FF]/30">
              <h3 className="text-xl font-bold mb-4 text-[#00D9FF]">Paid Content</h3>
              <p className="text-sm leading-relaxed text-gray-300">
                Taboola & Outbrain: Amplify your content to drive awareness and attention.
              </p>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-6 mt-6">
            {/* Affiliate Marketing */}
            <div className="bg-[#252b3d] text-white rounded-lg p-6 border border-[#00D9FF]/30">
              <h3 className="text-xl font-bold mb-4 text-[#00D9FF]">Affiliate Marketing</h3>
              <p className="text-sm leading-relaxed text-gray-300">
                Get featured across sites and platforms your customers care about.
              </p>
            </div>
            {/* Digital Strategy & Insights */}
            <div className="bg-[#252b3d] text-white rounded-lg p-6 border border-[#00D9FF]/30">
              <h3 className="text-xl font-bold mb-4 text-[#00D9FF]">Digital Strategy & Insights</h3>
              <p className="text-sm leading-relaxed text-gray-300">
                Data that ties it all together for the optimal performance for your media mix.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Clients Section */}
      <section className="bg-gradient-to-br from-[#2d3a56] to-[#1a1f2e] py-12 sm:py-16 border-t border-[#00D9FF]/20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12 text-[#00D9FF]">Our Clients</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {[
              { name: 'GIADZY', color: 'text-red-600' },
              { name: 'Owlet', color: 'text-teal-400' },
              { name: 'UBS', color: 'text-red-600' }
            ].map((client) => (
              <div
                key={client.name}
                className="bg-white rounded-lg p-8 flex items-center justify-center min-h-32 border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
              >
                <span className={`text-2xl font-bold ${client.color}`}>{client.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div className="bg-white rounded-xl shadow-sm border border-[#e7ecf5] p-5 sm:p-7 mb-7">
          <p className="text-center text-xs sm:text-sm font-semibold text-[#005ea6] tracking-wide uppercase mb-2">
            We are a digital marketing agency based in New York City
          </p>
          <p className="text-center text-[11px] sm:text-sm text-[#53627a] leading-relaxed">
            High-value task operations and campaign optimization for brands that need stable daily growth and clear conversion outcomes.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-8">
          {serviceTiles.map((tile) => {
            const Icon = tile.icon;
            return (
              <div
                key={tile.label}
                className="bg-[#0b4f8a] text-white rounded-md px-3 py-3 sm:py-4 flex flex-col items-center justify-center gap-1 shadow-[0_8px_20px_rgba(11,79,138,0.24)]"
              >
                <Icon size={16} className="text-[#9fd7ff]" />
                <span className="text-[10px] sm:text-xs text-center leading-tight font-semibold">{tile.label}</span>
              </div>
            );
          })}
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <article className="bg-white rounded-xl border border-[#e7ecf5] p-5 shadow-sm">
            <h2 className="text-base sm:text-lg font-bold text-[#0a3565] mb-3">Our Approach</h2>
            <p className="text-sm text-[#4f5f77] leading-relaxed">
              Agile execution and live digital analytics in every workflow. Our team designs repeatable task automation that keeps acquisition efficient, protects budgets, and scales validated campaigns across platforms.
            </p>
          </article>
          <article className="bg-white rounded-xl border border-[#e7ecf5] p-5 shadow-sm">
            <h2 className="text-base sm:text-lg font-bold text-[#0a3565] mb-3">Agency Expertise</h2>
            <ul className="space-y-2">
              {expertiseItems.map((item) => (
                <li key={item} className="text-sm text-[#4f5f77] leading-relaxed">
                  • {item}
                </li>
              ))}
            </ul>
          </article>
        </div>

        <div className="mb-8">
          <h2 className="text-center text-base sm:text-lg font-bold text-[#0a3565] mb-4">Discover Our Work</h2>
          <div className="space-y-3">
            {workHighlights.map((item) => (
              <article key={item.title} className="relative h-36 sm:h-44 rounded-lg overflow-hidden shadow-md">
                <img src={item.image} alt={item.title} className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#001f3fbf] via-[#001f3f73] to-transparent"></div>
                <div className="absolute left-4 bottom-4 text-white">
                  <h3 className="text-lg font-bold leading-tight">{item.title}</h3>
                  <p className="text-xs sm:text-sm text-white/80">{item.subtitle}</p>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#e7ecf5] p-5 sm:p-6 shadow-sm mb-8">
          <h2 className="text-center text-sm sm:text-base font-bold text-[#0a3565] mb-4 uppercase tracking-wide">
            Some of Our Awesome Clients
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            {clientNames.map((client) => (
              <div
                key={client}
                className="h-16 sm:h-20 rounded-md border border-[#d7e2f0] bg-[#f8fbff] flex items-center justify-center text-center px-2"
              >
                <span className="text-xs sm:text-sm font-bold text-[#2b3f5a] leading-tight">{client}</span>
              </div>
            ))}
          </div>
        </div>

        <footer className="text-center text-xs sm:text-sm text-[#51627b] pb-8">
          © 2026 Steadfast Digital, Inc. All rights reserved.
        </footer>
      </section>
    </div>
  );
}

