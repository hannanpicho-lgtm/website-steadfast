import { UserCircle, ChevronLeft, ChevronDown } from 'lucide-react';
import { Link } from 'react-router';
import { useBackNavigate } from '../hooks/useBackNavigate';
import { LiveChatBox } from '../components/LiveChatBox';
import { useState, type ReactNode } from 'react';
import { Header } from '../components/Header';

const R = ({ children }: { children: ReactNode }) => <span className="text-red-600">{children}</span>;

export default function FAQs() {
  const goBack = useBackNavigate();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenFAQ(openFAQ === index ? null : index);
  };

  const faqs: { title: string; content: ReactNode[] }[] = [
    {
      title: "I. Start Product Optimization missions",
      content: [
        <>1.1) Minimum account balance of <R>50USD</R> for the first <R>20</R> missions/ord</>,
        <>1.2) A minimum renewal of <R>100USD</R> is required to start the new missions</>,
        "1.3) Users need to complete the missions before they can request a withdrawal"
      ]
    },
    {
      title: "II. Withdrawal",
      content: [
        "2.1) Users need to complete the missions before they can request a withdrawal",
        "2.2) You cannot request a withdrawal or refund if you choose to pre-up or withdraw in the middle of a missions optimization.",
        "2.3) No withdrawals can be processed if the user's withdrawal request has not been received",
        <>2.4) The maximum withdrawal amount for VIP1 users is <R>5000USD</R>, for VIP2 users it is <R>9000USD</R>, and for VIP3 users is <R>15000USD</R>. No maximum withdrawal limit for VIP4 and above</>,
        "2.5) The user account has must-beet credit score and can't use all functions of the platform normally."
      ]
    },
    {
      title: "III. Funds",
      content: [
        "3.1) All funds will be held securely in the user's account and can be requested in full once all data has been completed",
        "3.2) To avoid any loss of funds, all data will be processed by the system and not manually",
        "3.3) The platform will take full responsibility for any accidental loss of funds.",
        "3.4) If the user's funds exceed the taxable amount of the government, the user will need to pay tax"
      ]
    },
    {
      title: "IV. Account Security",
      content: [
        "4.1) Please do not disclose your login password and withdrawal password to others, as the platform will not be held responsible for any loss.",
        "4.2) Users are not recommended to set their birthday password, ID card number, or mobile phone number as their withdrawal password or login password.",
        "4.3) If you forget your login password or withdrawal password, please contact our online service to reset it."
      ]
    },
    {
      title: "V. General Product Data",
      content: [
        <>5.1) Platform profit is categorized <em>into</em> normal product data profit and 15 times combo product data profit</>,
        <>5.2) Normal users will earn <R>0.5%</R> of the profit for each normal missions of optimizing</>,
        <>5.3) VIP 2 users will earn <R>1%</R> of the profit for each normal missions of optimizing</>,
        <>5.4) VIP 3 users will earn <R>1.5%</R> of the profit for each normal missions of optimizing</>,
        <>5.5) VIP 4 users will earn <R>2%</R> of the profit for each normal missions of optimizing</>,
        <>5.6) VIP 5 users will earn <R>2.5%</R> of the profit for each normal missions of optimizing</>,
        "5.7) Funds and profits will be allocated to the user's account after the user has completed all normal missions of optimizing",
        "5.8) The system will randomly allocate tasks to the user's account based on the total amount in the user's account",
        "5.9) Once a mission to optimize a product is assigned"
      ]
    },
    {
      title: "VI. Combination products Data",
      content: [
        "6.1) Combination Products: Once a composer of 0 to 3 data, the user may not necessarily 3 products, the system will randomly allocate the data in the combination products the user has a higher chance of getting 1 or 2 product",
        <>6.2) Users will receive <R>10 times</R> the profit for each combination products here for the normal product data</>,
        "6.3) After the user has completed the combination products, all funds will stop rolling and will be returned to your account after you have completed each product data in the combined.",
        "6.4) The system will randomly allocate the combination products data to the user's account according to the total balance on the user's account",
        "6.5) Once the combination products data has been allocated to the user's account, it cannot be cancelled or skipped."
      ]
    },
    {
      title: "VII. Deposit",
      content: [
        "7.1) The amount of the deposit is chosen by the user and we cannot determine the amount of the deposit for the user, we recommend that the user advantage according to his/her ability or after familiarizing himself/herself with the platform.",
        "7.2) If a user needs to make a deposit when receiving combination product data, it is recommended that the user be able to make an advance based on the insufficient amount shown on the account.",
        "7.3) Before making an deposit, you must request an advance from the online service and confirm the deposit detail.",
        "7.4) The advance is not debitable nor Refundable before you do optimize the wrong deposit detail."
      ]
    }
  ];

  return (
    <div className="size-full overflow-auto bg-white">
      {/* Header */}
      <Header onContactClick={() => setIsChatOpen(true)} />

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {/* Back Button and Title */}
        <div className="flex items-center gap-4 mb-6">
          <button 
            onClick={goBack} aria-label="Go back"
            className="btn-mobile-icon"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-[#0066b3] flex-1 text-center mr-10">FAQs</h1>
        </div>

        {/* Common problem subtitle */}
        <h2 className="text-xl font-semibold text-[#0066b3] text-center mb-8">Common problem</h2>

        {/* FAQ Content */}
        <div className="space-y-6 text-sm">
          {faqs.map((faq, index) => (
            <section key={index}>
              <h3 className="font-bold mb-2 flex items-center cursor-pointer" onClick={() => toggleFAQ(index)}>
                {faq.title}
                <ChevronDown size={16} className={`ml-2 ${openFAQ === index ? 'rotate-180' : ''}`} />
              </h3>
              {openFAQ === index && (
                <div className="space-y-1">
                  {faq.content.map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 mt-12 mb-6">
          <p>© 2026 Steadfast Digital, Inc. All rights reserved</p>
        </div>
      </div>

      {/* Live Chat Box */}
      <LiveChatBox isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  );
}