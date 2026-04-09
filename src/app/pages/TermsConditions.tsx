import { ChevronLeft } from 'lucide-react';
import { useBackNavigate } from '../hooks/useBackNavigate';
const LiveChatBox = lazy(() => import('../components/LiveChatBox').then(m => ({ default: m.LiveChatBox })));
import { useState, lazy, Suspense, type ReactNode } from 'react';
import { Header } from '../components/Header';

export default function TermsConditions() {
  const goBack = useBackNavigate();
  const [isChatOpen, setIsChatOpen] = useState(false);

  const terms: { num: string; main: ReactNode; subs?: ReactNode[] }[] = [
    {
      num: '1',
      main: 'To optimize and reset your account, you must first complete all ratings with a minimum amount of 50 USD and a minimum account reset amount of 100 USD.',
      subs: [
        'Users who have completed a set of mission should contact customer service to request a reset for the next set of mission',
      ],
    },
    {
      num: '2',
      main: 'User withdrawals and system withdrawal requirements / security of user funds',
      subs: [
        'Each user needs to complete all the optimization mission before they can meet the system withdrawal requirements',
        'In order to avoid any loss of funds, all withdrawals are processed automatically by the system and not manually',
        "All users are not allowed to apply for withdrawal in the middle of mission to avoid affecting the merchant's operation",
        "Users' funds are completely safe on the Platform and the Platform will be liable for any accidental loss",
        'During the training period, users are only allowed to withdraw 50% of the funds in their account. Full withdrawal is only permitted after the user has completed two full days of training',
      ],
    },
    {
      num: '3',
      main: 'Please do not disclose your account password and withdrawal password to others. The platform will not be held responsible for any loss or damage caused',
      subs: [
        'All users are advised to keep their accounts secure to avoid disclosure',
        'The Platform is not responsible for any accidental disclosure of accounts',
        'Because of the financial implications of the accounts, it is important not to disclose them to avoid unnecessary problems',
        'Withdrawal password It is recommended that you do not set a birthday password, ID card number or mobile phone number, etc. It is recommended that you set a more difficult password to protect your funds',
        'If you forget your password, you can reset it by contacting the online service and be sure to change it yourself afterwards',
      ],
    },
    {
      num: '4',
      main: 'All products in a mission are randomly assigned by the system and they are not able to be changed, canceled, controlled or skipped in any way',
      subs: [
        'Due to the large number of users on the platform, it is not possible to distribute combinations products manually, so all mission product data is distributed randomly by the system',
        'Combinations products are randomly released by the system and cannot be changed/cancelled/skipped by any user/staff',
      ],
    },
    { num: '5', main: 'Legal action will be taken in the event of misuse of the account' },
    { num: '6', main: "Each product data comes from a different merchant, no deposit for more than 10 minutes, and each deposit must be made with the online service to confirm the merchant's deposit detail." },
    { num: '7', main: 'The platform will not be held responsible for any deposits made to the wrong detail' },
    { num: '8', main: 'Each optimization of commodity data, the user needs to be completed within 24 hours, such as not completed resulting in complaints from merchants, the user needs to bear the responsibility of breach of contract' },
    { num: '9', main: 'When the account is complained by the merchant, the system will deduct the credit score, when the account credit score is lower than 98 is unable to apply for withdrawal, the credit score will be automatically calculate by the system after completing every set of mission' },
  ];

  return (
    <div className="size-full overflow-auto bg-[#0a0a0a]">
      <Header onContactClick={() => setIsChatOpen(true)} />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 pb-16">
        {/* Back + Title */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={goBack} aria-label="Go back" className="btn-mobile-icon">
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-[28px] font-bold tracking-tight text-[#f5f0eb] flex-1 text-center mr-10">
            Terms &amp; Conditions
          </h1>
        </div>

        {/* Term cards */}
        <div className="space-y-3">
          {terms.map((t) => (
            <div
              key={t.num}
              className="bg-[#141414] border border-white/[0.06] rounded-xl px-5 py-4"
            >
              {/* Header row */}
              <div className="flex items-start gap-3">
                <span className="shrink-0 mt-0.5 bg-[#c8956c]/15 text-[#c8956c] text-xs font-semibold rounded-md px-2 py-0.5">
                  {t.num}
                </span>
                <p className="text-[15px] leading-relaxed text-[#f5f0eb] font-medium">{t.main}</p>
              </div>

              {/* Sub-items */}
              {t.subs && t.subs.length > 0 && (
                <div className="mt-3 pl-8 space-y-0">
                  {t.subs.map((sub, i) => (
                    <div key={i} className="flex gap-3 py-1.5">
                      <span className="text-[#6b635b] text-sm font-medium shrink-0 w-5 text-right tabular-nums">{t.num}.{i + 1}</span>
                      <p className="text-[15px] leading-relaxed text-[#a89f95]">{sub}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-[#6b635b] mt-12">
          © 2026 Steadfast Digital, Inc. All rights reserved
        </p>
      </div>

      <Suspense fallback={null}>
        <LiveChatBox isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      </Suspense>
    </div>
  );
}