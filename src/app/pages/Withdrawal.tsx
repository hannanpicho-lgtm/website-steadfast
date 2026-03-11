import { UserCircle, ChevronLeft, ScrollText, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { useState } from 'react';
import { LiveChatBox } from '../components/LiveChatBox';
import { BottomNavigation } from '../components/BottomNavigation';
import { Header } from '../components/Header';

export default function Withdrawal() {
  const navigate = useNavigate();
  const [withdrawAmount, setWithdrawAmount] = useState('0');
  const [showPassword, setShowPassword] = useState(false);
  const [transactionPassword, setTransactionPassword] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);

  const handleAllClick = () => {
    // Set to available amount (currently 0)
    setWithdrawAmount('0');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle withdrawal submission
    console.log('Withdrawal submitted');
  };

  return (
    <div className="size-full overflow-auto bg-gray-50">
      {/* Header */}
      <Header onContactClick={() => setIsChatOpen(true)} />

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-6 py-6">
        {/* Back Button and Title */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)}
              className="bg-[#0066b3] text-white p-2 rounded hover:bg-[#0052a3] transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <h1 className="text-2xl font-bold text-[#0066b3]">Withdrawal</h1>
          </div>
          <button className="flex items-center gap-2 text-[#0066b3] hover:text-[#0052a3] transition-colors">
            <ScrollText size={20} />
            <span className="font-semibold">History</span>
          </button>
        </div>

        {/* Total Balance Card */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#0066b3] mb-3">Total Balance</h2>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-4xl font-bold">0</span>
            <span className="text-lg text-gray-600">USD</span>
          </div>
          <p className="text-sm italic">You will receive your withdrawal within an hour</p>
        </div>

        {/* Balance Details */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between py-3">
            <span className="text-[#0066b3] font-semibold">Available Amount</span>
            <span className="font-bold">0 USD</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-[#0066b3] font-semibold">Freeze Amount</span>
            <span className="font-bold">0 USD</span>
          </div>
        </div>

        {/* Withdraw Amount Form */}
        <form onSubmit={handleSubmit}>
          <h3 className="text-xl font-bold mb-4">WITHDRAW AMOUNT</h3>

          {/* Withdraw Account */}
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2">Withdraw Account</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Withdraw Account"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#0066b3] text-gray-400"
              />
              <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            </div>
          </div>

          {/* Withdraw Amount */}
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2">Withdraw Amount</label>
            <div className="relative">
              <input
                type="text"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#0066b3]"
              />
              <button
                type="button"
                onClick={handleAllClick}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-[#0066b3] text-white px-4 py-1 rounded text-sm font-semibold hover:bg-[#0052a3] transition-colors"
              >
                ALL
              </button>
            </div>
          </div>

          {/* Transaction Password */}
          <div className="mb-6">
            <label className="block text-sm font-semibold mb-2">Transaction Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Transaction Password"
                value={transactionPassword}
                onChange={(e) => setTransactionPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#0066b3] text-gray-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full bg-[#0066b3] text-white py-4 rounded-lg text-lg font-bold hover:bg-[#0052a3] transition-colors"
          >
            Submit
          </button>
        </form>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 mt-12 mb-24">
          <p>© 2026 Steadfast Digital, Inc. All rights reserved</p>
        </div>
      </div>

      {/* Live Chat Box */}
      <LiveChatBox isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}