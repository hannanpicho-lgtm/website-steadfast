import { UserCircle, ChevronLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { useState } from 'react';
import { LiveChatBox } from '../components/LiveChatBox';
import { BottomNavigation } from '../components/BottomNavigation';
import { Header } from '../components/Header';

export default function Deposit() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'recent' | 'transaction'>('recent');
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <div className="size-full overflow-auto bg-gray-50">
      {/* Header */}
      <Header onContactClick={() => setIsChatOpen(true)} />

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-6 py-6">
        {/* Back Button and Title */}
        <div className="flex items-center gap-4 mb-6">
          <button 
            onClick={() => navigate(-1)}
            className="bg-[#0066b3] text-white p-2 rounded hover:bg-[#0052a3] transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-[#0066b3] flex-1 text-center mr-10">Deposit</h1>
        </div>

        {/* Available Balance Card */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-[#0066b3] mb-2">Available Balance</h2>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">0</span>
                <span className="text-lg text-gray-600">USD</span>
              </div>
            </div>
            <button className="bg-[#0066b3] hover:bg-[#0052a3] transition-colors text-white px-6 py-2 rounded font-semibold">
              TOP UP
            </button>
          </div>
        </div>

        {/* Total Balance Card */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#0066b3] mb-2">Total Balance</h2>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold">0</span>
            <span className="text-lg text-gray-600">USD</span>
          </div>
        </div>

        {/* Activity Tabs */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => setActiveTab('recent')}
            className={`py-3 rounded font-semibold transition-colors ${
              activeTab === 'recent'
                ? 'bg-gray-800 text-white'
                : 'bg-white text-gray-800 hover:bg-gray-100'
            }`}
          >
            Recent Activity
          </button>
          <button
            onClick={() => setActiveTab('transaction')}
            className={`py-3 rounded font-semibold transition-colors ${
              activeTab === 'transaction'
                ? 'bg-gray-800 text-white'
                : 'bg-white text-gray-800 hover:bg-gray-100'
            }`}
          >
            Transaction Activity
          </button>
        </div>

        {/* Activity Content */}
        <div className="bg-white rounded-lg p-12 text-center min-h-[300px] flex items-center justify-center">
          <p className="text-gray-400">No more data</p>
        </div>

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