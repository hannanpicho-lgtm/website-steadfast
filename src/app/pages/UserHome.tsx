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
      className="rounded-2xl bg-[#1ec9ee] min-h-[132px] sm:min-h-[170px] flex flex-col items-center justify-center gap-3 sm:gap-4 px-2 text-[#162033] shadow-[0_12px_30px_rgba(30,201,238,0.18)] border border-white/10 transition-transform duration-200 hover:-translate-y-1"
    >
      <Icon size={32} strokeWidth={2.2} className="sm:h-9 sm:w-9" />
      <span className="text-sm sm:text-[clamp(1rem,2vw,1.55rem)] font-semibold tracking-tight text-center leading-tight px-1 break-words">{item.title}</span>
    </Link>
  );
}

export default function UserHome() {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#1f2638] pb-[calc(9rem+env(safe-area-inset-bottom))] sm:pb-32">
      <Header onContactClick={() => setIsChatOpen(true)} />

      <main className="max-w-5xl mx-auto px-3 sm:px-6 pt-5 sm:pt-8">
        <section className="rounded-3xl bg-[#2a3146] border border-white/5 p-4 sm:p-6 shadow-[0_18px_48px_rgba(5,12,24,0.28)]">
          <div className="mb-5 sm:mb-6 text-center">
            <p className="text-[#9fb4d1] text-sm sm:text-base">Quick access to the user information section</p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-5">
            {quickLinks.map((item) => (
              <QuickLinkCard key={item.title} item={item} />
            ))}
          </div>
        </section>
      </main>

      <LiveChatBox isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      <BottomNavigation />
      <FloatingLiveChat />
    </div>
  );
}
