import { ChevronLeft, ChevronDown } from 'lucide-react';
import { useBackNavigate } from '../hooks/useBackNavigate';
const LiveChatBox = lazy(() => import('../components/LiveChatBox').then(m => ({ default: m.LiveChatBox })));
import { useState, useRef, useEffect, type ReactNode, lazy, Suspense } from 'react';
import { Header } from '../components/Header';

const H = ({ children }: { children: ReactNode }) => <span className="text-[#d4a853] font-semibold">{children}</span>;

export default function FAQs() {
  const goBack = useBackNavigate();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenFAQ(openFAQ === index ? null : index);
  };

  const faqs: { num: string; title: string; content: ReactNode[] }[] = [
    {
      num: 'I',
      title: "Start Product Optimization missions",
      content: [
        <>Minimum account balance of <H>50 USD</H> for the first <H>40</H> missions/set</>,
        <>A minimum renewal of <H>100 USD</H> is required to start the new missions</>,
        "Users need to complete the missions before they can request a withdrawal"
      ]
    },
    {
      num: 'II',
      title: "Withdrawal",
      content: [
        "Users need to complete the missions before they can request a withdrawal",
        "You cannot request a withdrawal or refund if you choose to pre-up or withdraw in the middle of a missions optimization.",
        "No withdrawals can be processed if the user's withdrawal request has not been received",
        <>The maximum withdrawal amount for VIP1 users is <H>5,000 USD</H>, for VIP2 users it is <H>9,000 USD</H>, and for VIP3 users is <H>15,000 USD</H>. No maximum withdrawal limit for VIP4 and above</>,
        "The user account has must-beet credit score and can't use all functions of the platform normally."
      ]
    },
    {
      num: 'III',
      title: "Funds",
      content: [
        "All funds will be held securely in the user's account and can be requested in full once all data has been completed",
        "To avoid any loss of funds, all data will be processed by the system and not manually",
        "The platform will take full responsibility for any accidental loss of funds.",
        "If the user's funds exceed the taxable amount of the government, the user will need to pay tax"
      ]
    },
    {
      num: 'IV',
      title: "Account Security",
      content: [
        "Please do not disclose your login password and withdrawal password to others, as the platform will not be held responsible for any loss.",
        "Users are not recommended to set their birthday password, ID card number, or mobile phone number as their withdrawal password or login password.",
        "If you forget your login password or withdrawal password, please contact our online service to reset it."
      ]
    },
    {
      num: 'V',
      title: "General Product Data",
      content: [
        <>Platform profit is categorized into normal product data profit and 10 times combo product data profit</>,
        <>Normal users will earn <H>0.5%</H> of the profit for each normal missions of optimizing</>,
        <>VIP 2 users will earn <H>1%</H> of the profit for each normal missions of optimizing</>,
        <>VIP 3 users will earn <H>1.5%</H> of the profit for each normal missions of optimizing</>,
        <>VIP 4 users will earn <H>2%</H> of the profit for each normal missions of optimizing</>,
        <>VIP 5 users will earn <H>2.5%</H> of the profit for each normal missions of optimizing</>,
        "Funds and profits will be allocated to the user's account after the user has completed all normal missions of optimizing",
        "The system will randomly allocate tasks to the user's account based on the total amount in the user's account",
        "Once a mission to optimize a product is assigned"
      ]
    },
    {
      num: 'VI',
      title: "Combination products Data",
      content: [
        "Combination Products: Once a composer of 0 to 3 data, the user may not necessarily 3 products, the system will randomly allocate the data in the combination products the user has a higher chance of getting 1 or 2 product",
        <>Users will receive <H>10 times</H> the profit for each combination products here for the normal product data</>,
        "After the user has completed the combination products, all funds will stop rolling and will be returned to your account after you have completed each product data in the combined.",
        "The system will randomly allocate the combination products data to the user's account according to the total balance on the user's account",
        "Once the combination products data has been allocated to the user's account, it cannot be cancelled or skipped."
      ]
    },
    {
      num: 'VII',
      title: "Deposit",
      content: [
        "The amount of the deposit is chosen by the user and we cannot determine the amount of the deposit for the user, we recommend that the user advantage according to his/her ability or after familiarizing himself/herself with the platform.",
        "If a user needs to make a deposit when receiving combination product data, it is recommended that the user be able to make an advance based on the insufficient amount shown on the account.",
        "Before making an deposit, you must request an advance from the online service and confirm the deposit detail.",
        "The advance is not debitable nor Refundable before you do optimize the wrong deposit detail."
      ]
    }
  ];

  return (
    <div className="size-full overflow-auto bg-[#0a0a0a]" style={{ background: '#0a0a0a', minHeight: '100%' }}>
      <Header onContactClick={() => setIsChatOpen(true)} />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 pb-4">
        {/* Back + Title */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={goBack} aria-label="Go back" className="btn-mobile-icon">
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-[28px] font-bold tracking-tight text-[#f5f0eb] flex-1 text-center mr-10">
            FAQs
          </h1>
        </div>

        {/* Accordion */}
        <div className="space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openFAQ === index;
            return (
              <AccordionCard key={index} isOpen={isOpen} onToggle={() => toggleFAQ(index)} num={faq.num} title={faq.title}>
                {faq.content.map((line, i) => (
                  <div key={i} className="flex gap-3 py-1.5">
                    <span className="text-[#6b635b] text-sm font-medium shrink-0 w-5 text-right tabular-nums">{i + 1}.</span>
                    <p className="text-[15px] leading-relaxed text-[#a89f95]">{line}</p>
                  </div>
                ))}
              </AccordionCard>
            );
          })}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-[#6b635b] mt-8 mb-4">
          © 2026 Steadfast Digital, Inc. All rights reserved
        </p>
      </div>

      <Suspense fallback={null}>
        <LiveChatBox isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      </Suspense>
    </div>
  );
}

/* ── Accordion Card ────────────────────────────────────────── */

function AccordionCard({
  isOpen,
  onToggle,
  num,
  title,
  children,
}: {
  isOpen: boolean;
  onToggle: () => void;
  num: string;
  title: string;
  children: ReactNode;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (bodyRef.current) {
      setHeight(bodyRef.current.scrollHeight);
    }
  }, [isOpen, children]);

  return (
    <div
      className={`rounded-xl transition-all duration-200 ${
        isOpen
          ? 'bg-[#141414] border border-[#c8956c]/25 border-l-2 border-l-[#c8956c] shadow-[0_4px_12px_rgba(0,0,0,0.3)]'
          : 'bg-[#141414] border border-white/[0.06] hover:border-white/[0.12]'
      }`}
    >
      {/* Header — tap target */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3.5 min-h-[48px] text-left cursor-pointer"
        aria-expanded={isOpen}
      >
        <span className="shrink-0 bg-[#c8956c]/15 text-[#c8956c] text-xs font-semibold rounded-md px-2 py-0.5">
          {num}
        </span>
        <span className="flex-1 text-base font-semibold text-[#f5f0eb]">{title}</span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-[#a89f95] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Collapsible body */}
      <div
        style={{ maxHeight: isOpen ? height : 0 }}
        className="overflow-hidden transition-[max-height] duration-200 ease-in-out"
      >
        <div ref={bodyRef} className="px-4 pb-4 pt-0.5 pl-6">
          {children}
        </div>
      </div>
    </div>
  );
}