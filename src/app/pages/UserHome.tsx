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
      className="rounded-2xl bg-[#1ec9ee] min-h-[150px] sm:min-h-[170px] flex flex-col items-center justify-center gap-4 text-[#162033] shadow-[0_12px_30px_rgba(30,201,238,0.18)] border border-white/10 transition-transform duration-200 hover:-translate-y-1"
    >
      <Icon size={36} strokeWidth={2.2} />
      <span className="text-[clamp(1rem,2vw,1.55rem)] font-semibold tracking-tight text-center px-2">{item.title}</span>
    </Link>
  );
}

export default function UserHome() {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#1f2638] pb-28">
      <Header onContactClick={() => setIsChatOpen(true)} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
        <section className="rounded-3xl bg-[#2a3146] border border-white/5 p-4 sm:p-6 shadow-[0_18px_48px_rgba(5,12,24,0.28)]">
          <div className="mb-5 sm:mb-6 text-center">
            <p className="text-[#9fb4d1] text-sm sm:text-base">Quick access to the user information section</p>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:gap-5">
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
