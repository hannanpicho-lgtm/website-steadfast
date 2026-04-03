import { UserCircle, ChevronLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { LiveChatBox } from '../components/LiveChatBox';
import { useState } from 'react';
import { Header } from '../components/Header';

export default function TermsConditions() {
  const navigate = useNavigate();
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <div className="size-full overflow-auto pb-20 bg-white">
      {/* Header */}
      <Header onContactClick={() => setIsChatOpen(true)} />

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {/* Back Button and Title */}
        <div className="flex items-center gap-4 mb-6">
          <button 
            onClick={() => navigate(-1)}
            className="btn-mobile-icon"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-[#0066b3] flex-1 text-center mr-10">T & C</h1>
        </div>

        {/* Terms & Conditions Content */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold mb-6">Term & Condition</h2>

          {/* Term 1 */}
          <div className="space-y-2">
            <p>1) To optimize and reset your account, you must first complete all ratings with a minimum amount of 50USD and a minimum account reset amount of 100USD.</p>
            <p className="pl-4">1.1) Users who have completed a set of mission should contact customer service to request a reset for the next set of mission</p>
          </div>

          {/* Term 2 */}
          <div className="space-y-2">
            <p>2) User withdrawals and system withdrawal requirements / security of user funds</p>
            <p className="pl-4">2.1) Each user needs to complete all the optimization mission before they can meet the system withdrawal requirements</p>
            <p className="pl-4">2.2) In order to avoid any loss of funds, all withdrawals are processed automatically by the system and not manually</p>
            <p className="pl-4">2.3) All users are not allowed to apply for withdrawal in the middle of mission to avoid affecting the merchant's operation</p>
            <p className="pl-4">2.4) Users' funds are completely safe on the Platform and the Platform will be liable for any accidental loss</p>
            <p className="pl-4">2.5) During the training period, users are only allowed to withdraw 50% of the funds in their account. Full withdrawal is only permitted after the user has completed two full days of training</p>
          </div>

          {/* Term 3 */}
          <div className="space-y-2">
            <p>3) Please do not disclose your account password and withdrawal password to others. The platform will not be held responsible for any loss or damage caused</p>
            <p className="pl-4">3.1) All users are advised to keep their accounts secure to avoid disclosure</p>
            <p className="pl-4">3.2) The Platform is not responsible for any accidental disclosure of accounts</p>
            <p className="pl-4">3.3) Because of the financial implications of the accounts, it is important not to disclose them to avoid unnecessary problems</p>
            <p className="pl-4">3.4) Withdrawal password It is recommended that you do not set a birthday password, ID card number or mobile phone number, etc. It is recommended that you set a more difficult password to protect your funds</p>
            <p className="pl-4">3.5) If you forget your password, you can reset it by contacting the online service and be sure to change it yourself afterwards</p>
          </div>

          {/* Term 4 */}
          <div className="space-y-2">
            <p>4) All products in a mission are randomly assigned by the system and they are not able to be changed, canceled, controlled or skipped in any way</p>
            <p className="pl-4">4.1) Due to the large number of users on the platform, it is not possible to distribute combinations products manually, so all mission product data is distributed randomly by the system</p>
            <p className="pl-4">4.2) Combinations products are randomly released by the system and cannot be changed/cancelled/skipped by any user/staff</p>
          </div>

          {/* Term 5 */}
          <div className="space-y-2">
            <p>5) Legal action will be taken in the event of misuse of the account</p>
          </div>

          {/* Term 6 */}
          <div className="space-y-2">
            <p>6) Each product data comes from a different merchant, no deposit for more than 10 minutes, and each deposit must be made with the online service to confirm the merchant's deposit detail.</p>
          </div>

          {/* Term 7 */}
          <div className="space-y-2">
            <p>7) The platform will not be held responsible for any deposits made to the wrong detail</p>
          </div>

          {/* Term 8 */}
          <div className="space-y-2">
            <p>8) Each optimization of commodity data, the user needs to be completed within 24 hours, such as not completed resulting in complaints from merchants, the user needs to bear the responsibility of breach of contract</p>
          </div>

          {/* Term 9 */}
          <div className="space-y-2">
            <p>9) When the account is complained by the merchant, the system will deduct the credit score, when the account credit score is lower than 98 is unable to apply for withdrawal, the credit score will be automatically calculate by the system after completing every set of mission</p>
          </div>
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