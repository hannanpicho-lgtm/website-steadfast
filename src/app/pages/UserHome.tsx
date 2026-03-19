import { useState } from 'react';
import { Link } from 'react-router';
import { Award, Calendar, Gift, HelpCircle, Info, ScrollText, Wallet, ArrowDownToLine } from 'lucide-react';
import { BottomNavigation } from '../components/BottomNavigation';
import { FloatingLiveChat } from '../components/FloatingLiveChat';
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
      className="rounded-xl bg-[#1ec9ee] min-h-[96px] sm:min-h-[122px] flex flex-col items-center justify-center gap-2 sm:gap-3 px-2 text-[#162033] shadow-[0_10px_24px_rgba(30,201,238,0.16)] border border-white/10 transition-transform duration-200 hover:-translate-y-0.5"
    >
      <Icon size={26} strokeWidth={2.15} className="sm:h-7 sm:w-7" />
      <span className="text-[0.95rem] sm:text-[1.22rem] font-semibold tracking-tight text-center leading-tight px-1 break-words">{item.title}</span>
    </Link>
  );
}

export default function UserHome() {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#1f2638] pb-[calc(9rem+env(safe-area-inset-bottom))] sm:pb-32">
      <Header onContactClick={() => setIsChatOpen(true)} />

      <main className="max-w-5xl mx-auto px-3 sm:px-6 pt-4 sm:pt-6">
        <section className="rounded-2xl bg-[#2a3146] border border-white/5 p-3 sm:p-4 shadow-[0_14px_36px_rgba(5,12,24,0.24)]">
          <div className="mb-3 sm:mb-4 text-center">
            <p className="text-[#9fb4d1] text-xs sm:text-sm">Quick access to the user information section</p>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
            {quickLinks.map((item) => (
              <QuickLinkCard key={item.title} item={item} />
            ))}
          </div>
        </section>

        {/* Welcome Section */}
        <section className="mt-8 sm:mt-12 bg-gradient-to-br from-[#1a1f2e] to-[#2d3a56] py-12 sm:py-16 rounded-3xl border border-white/5">
          <div className="px-4 sm:px-6">
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
        <section className="mt-8 bg-gradient-to-br from-[#2d3a56] to-[#1a1f2e] py-12 sm:py-16 rounded-3xl border border-white/5">
          <div className="px-4 sm:px-6">
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
        <section className="mt-8 bg-gradient-to-br from-[#1a1f2e] to-[#2d3a56] py-12 sm:py-16 rounded-3xl border border-white/5">
          <div className="px-4 sm:px-6">
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
        <section className="mt-8 bg-gradient-to-br from-[#2d3a56] to-[#1a1f2e] py-12 sm:py-16 rounded-3xl border border-white/5">
          <div className="px-4 sm:px-6">
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
      </main>

      <LiveChatBox isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      <BottomNavigation />
      <FloatingLiveChat />
    </div>
  );
}
