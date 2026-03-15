import { UserCircle, ChevronLeft } from 'lucide-react';
import { Link } from 'react-router';
import { useState } from 'react';
import { LiveChatBox } from '../components/LiveChatBox';
import { BottomNavigation } from '../components/BottomNavigation';
import { Header } from '../components/Header';

// Workday rewards data
const workdayRewards = [
  { days: 1, salary: 204 },
  { days: 7, salary: 1428 },
  { days: 15, salary: 3060 },
  { days: 22, salary: 4488 },
  { days: 30, salary: 6120 }
];

// VIP levels data
const vipLevels = [
  { level: 1, range: '100-499', products: 10, rate: '0.5%', color: 'bg-gray-500' },
  { level: 2, range: '500-1999', products: 15, rate: '1.0%', color: 'bg-blue-500' },
  { level: 3, range: '2000-4999', products: 20, rate: '1.5%', color: 'bg-purple-500' },
  { level: 4, range: '5000-9999', products: 25, rate: '2.0%', color: 'bg-yellow-500' },
  { level: 5, range: '10000', products: 30, rate: '2.5%', color: 'bg-red-500' }
];

// Reset rewards data
const resetRewards = [
  { deposit: 100, reward: 28, label: 'Bronze', color: 'bg-orange-300', labelColor: 'bg-orange-600' },
  { deposit: 500, reward: 158, label: 'Silver', color: 'bg-gray-300', labelColor: 'bg-gray-600' },
  { deposit: 2000, reward: 688, label: 'Gold', color: 'bg-yellow-300', labelColor: 'bg-yellow-600' },
  { deposit: 5000, reward: 1788, label: 'Platinum', color: 'bg-blue-300', labelColor: 'bg-blue-600' },
  { deposit: 10000, reward: 3888, label: 'Diamond', color: 'bg-purple-300', labelColor: 'bg-purple-600' },
  { deposit: 30000, reward: 12888, label: 'Crown', color: 'bg-red-300', labelColor: 'bg-red-600' }
];

// Accumulated rewards data
const accumulatedRewards = [
  { range: '1000 - 4999', rate: '0.3%' },
  { range: '5000 - 19999', rate: '0.5%' },
  { range: '20000 - 49999', rate: '0.8%' },
  { range: '50000 or Above', rate: '1.0%' }
];

export default function Activity() {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <div className="size-full overflow-auto pb-20 bg-white">
      {/* Header */}
      <Header onContactClick={() => setIsChatOpen(true)} />

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-6 py-6">
        {/* Back Button and Title */}
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 mb-6">
          <Link to="/starting" className="bg-[#0066b3] text-white p-2 rounded hover:bg-[#0052a3] transition-colors justify-self-start">
            <ChevronLeft size={20} />
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0066b3] text-center">Activity</h1>
          <div className="w-9" aria-hidden="true"></div>
        </div>

        {/* Workday Rewards Scheme Section */}
        <div className="bg-[#0d7fb8] rounded-lg p-8 mb-8 relative overflow-hidden">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-10 left-10 w-32 h-32 bg-[#0b6fa3] rounded-full"></div>
            <div className="absolute bottom-10 right-10 w-40 h-40 bg-[#0b6fa3] rounded-full"></div>
          </div>
          
          <div className="relative z-10">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-8">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M24 4 L40 12 L38 26 L24 34 L10 26 L8 12 Z" fill="white" />
              </svg>
              <span className="text-3xl text-white font-bold">Steadfast</span>
            </div>

            {/* Title */}
            <h2 className="text-2xl sm:text-4xl font-bold text-yellow-300 mb-2 text-center">Workday Rewards Scheme</h2>
            <p className="text-base sm:text-xl text-white mb-8 text-center">Check In. Show Up. Get Paid</p>

            {/* Rewards Grid */}
            <div className="space-y-4">
              {workdayRewards.map((reward) => (
                <div key={reward.days} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                  {/* Days Worked */}
                  <div className="bg-cyan-100 rounded-full px-6 py-3 sm:px-8 sm:py-4 w-full sm:w-auto sm:min-w-[160px] text-center">
                    <div className="text-3xl sm:text-4xl font-bold text-black">{reward.days}</div>
                    <div className="text-sm text-black">Days Worked</div>
                  </div>

                  {/* Salary Earned */}
                  <div className="w-full sm:flex-1 bg-cyan-100 rounded-full px-5 py-3 sm:px-8 sm:py-4 flex items-center gap-3 sm:gap-4">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                      </svg>
                    </div>
                    <div className="text-xs sm:text-sm text-black">Salary Earned</div>
                    <div className="flex-1 text-right">
                      <span className="text-2xl sm:text-4xl font-bold text-black">{reward.salary.toLocaleString()}</span>
                      <span className="text-sm text-black ml-1">USD</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* How It Works Section */}
        <div className="bg-white mb-8 px-4">
          <h3 className="text-xl font-bold mb-3">How It Works:</h3>
          <p className="text-gray-800 mb-4">
            For everyday you check in and complete your work, you earn guaranteed income!<br/>
            The more you show up, the more you earn. Simple as that!
          </p>
          <p className="text-lg font-bold mb-6">Perfect attendance will earn up to 6120 USD per month.</p>
        </div>

        {/* VIP Level Chart Section */}
        <div className="bg-[#0d7fb8] rounded-lg p-8 mb-8 relative overflow-hidden">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-10 right-10 w-32 h-32 bg-[#0b6fa3] rounded-full"></div>
            <div className="absolute bottom-10 left-10 w-40 h-40 bg-[#0b6fa3] rounded-full"></div>
          </div>

          <div className="relative z-10">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-6">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M24 4 L40 12 L38 26 L24 34 L10 26 L8 12 Z" fill="white" />
              </svg>
              <span className="text-3xl text-white font-bold">Steadfast</span>
            </div>

            <h2 className="text-4xl font-bold text-yellow-300 mb-2 text-center">VIP Level Chart</h2>
            <p className="text-xl text-white mb-8 text-center">The More You Recharge, The Higher You Rise</p>

            {/* Table Header */}
            <div className="grid grid-cols-4 gap-2 mb-4 text-white text-center text-sm">
              <div>VIP Levels</div>
              <div>Unlock Condition/<br/>First Deposit Amount</div>
              <div>Daily Work<br/>Opportunities</div>
              <div>Profit Rate/<br/>Per Deal</div>
            </div>

            {/* VIP Levels */}
            <div className="space-y-3">
              {vipLevels.map((vip) => (
                <div key={vip.level} className="bg-gray-700 rounded-lg p-4 border-4 border-yellow-400">
                  <div className="grid grid-cols-4 gap-2 items-center text-white">
                    {/* VIP Badge */}
                    <div className="flex items-center gap-2">
                      <div className={`${vip.color} w-12 h-12 rounded-lg flex items-center justify-center`}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                        </svg>
                      </div>
                      <span className="font-bold">VIP {vip.level}</span>
                    </div>

                    {/* Unlock Condition */}
                    <div className="text-center">
                      <span className="text-cyan-300 font-bold text-lg">{vip.range}</span>
                      <span className="text-gray-300 ml-1 text-sm">{vip.level === 5 ? 'USD or Above' : 'USD'}</span>
                    </div>

                    {/* Daily Work */}
                    <div className="text-center font-bold">{vip.products} products/ Set</div>

                    {/* Profit Rate */}
                    <div className="text-center font-bold text-xl">{vip.rate}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="bg-white mb-8 px-4">
          <h3 className="text-xl font-bold mb-4">Benefits of Upgrading Your VIP Level:</h3>
          <ul className="space-y-2 mb-6">
            <li className="flex items-start gap-2">
              <span className="font-bold">•</span>
              <span className="font-bold">Higher Daily Profits</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">•</span>
              <span className="font-bold">More Work Opportunities</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">•</span>
              <span className="font-bold">Priority Access to Special Events</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">•</span>
              <span className="font-bold">Bonus Rewards for Top-tier Members</span>
            </li>
          </ul>

          <h3 className="text-lg font-bold italic mb-3">Notice to All Users:</h3>
          <p className="text-gray-800 mb-3">
            All advance for the above mentioned unlocked VIP levels will be credited to the account and all deposits can be withdrawn by the users after completing the daily works.
          </p>
          <p className="text-[#0066b3] text-lg font-bold italic mb-6">
            Upgrade today and maximize your earning power!
          </p>
        </div>

        {/* 3rd Anniversary Section */}
        <div className="bg-[#0d7fb8] rounded-lg p-8 mb-8 relative overflow-hidden">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-10 left-10 w-32 h-32 bg-[#0b6fa3] rounded-full"></div>
            <div className="absolute bottom-10 right-10 w-40 h-40 bg-[#0b6fa3] rounded-full"></div>
          </div>

          <div className="relative z-10">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-6">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M24 4 L40 12 L38 26 L24 34 L10 26 L8 12 Z" fill="white" />
              </svg>
              <span className="text-3xl text-white font-bold">Steadfast</span>
            </div>

            <div className="text-right mb-6">
              <h2 className="text-4xl font-bold text-yellow-300">3<sup>rd</sup> Anniversary</h2>
              <h2 className="text-4xl font-bold text-yellow-300">Thanksgiving Feedback</h2>
              <p className="text-xl text-white">Steadfast Advances Activities</p>
            </div>

            <h3 className="text-2xl font-bold text-white italic mb-6 underline">Reset Advance Rewards</h3>

            {/* Rewards Grid */}
            <div className="grid grid-cols-3 gap-4">
              {resetRewards.map((reward, index) => (
                <div key={index} className={`${reward.color} rounded-3xl p-6 text-center relative overflow-hidden`}>
                  <div className="mb-3">
                    <div className="text-sm text-black mb-1">Deposit with</div>
                    <div className="text-3xl font-bold text-black">{reward.deposit.toLocaleString()}</div>
                    <div className="text-sm text-black">USD</div>
                  </div>
                  <div className="mb-3">
                    <div className="text-sm text-black mb-1">Get Extra Reward</div>
                    <div className="text-4xl font-bold text-black">{reward.reward.toLocaleString()}</div>
                    <div className="text-sm text-black">USD</div>
                  </div>
                  <div className={`${reward.labelColor} text-white font-bold py-2 px-4 rounded-full text-xs mt-2`}>
                    {reward.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Accumulated Deposit Rewards Section */}
        <div className="bg-white mb-8 px-4">
          <h3 className="text-2xl font-bold text-[#0066b3] italic mb-6 underline">Accumulated Deposit Rewards For The Day</h3>
          
          <div className="space-y-4">
            {accumulatedRewards.map((reward, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="flex-1 bg-gray-700 rounded-lg p-4 border-4 border-yellow-400">
                  <div className="flex items-center justify-between text-white">
                    <div>
                      <div className="text-sm">Advances On Day (USD)</div>
                      <div className="text-2xl font-bold text-cyan-300">{reward.range}</div>
                    </div>
                    <div className="text-sm">
                      Will Get<br/>Advance Deposit Reward
                    </div>
                  </div>
                </div>
                <div className="w-24 h-24 bg-yellow-300 rounded-full flex items-center justify-center border-4 border-[#0066b3]">
                  <span className="text-3xl font-bold text-black">{reward.rate}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 space-y-2 mb-6">
          <p>© 2026 Steadfast Digital, Inc. All rights reserved</p>
          <p className="italic">*The final interpretation right belongs to Steadfast Digital platform</p>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation />
      {/* Live Chat Box */}
      <LiveChatBox isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  );
}