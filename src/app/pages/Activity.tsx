import { ChevronLeft } from 'lucide-react';
import { Link } from 'react-router';
import { useEffect, useState } from 'react';
import { LiveChatBox } from '../components/LiveChatBox';
import { BottomNavigation } from '../components/BottomNavigation';
import { Header } from '../components/Header';
import { defaultRewardsConfig, fetchPublicRewardsConfig } from '../services/rewardsConfig';
import { fetchPublicVipConfig, type VipConfig } from '../services/vipConfig';
import { projectId, publicAnonKey } from '@utils/supabase/info';

const vipColorByTier: Record<string, string> = {
  bronze: 'bg-slate-300',
  silver: 'bg-yellow-500',
  gold: 'bg-blue-500',
  platinum: 'bg-emerald-500',
  diamond: 'bg-orange-500',
};

type ActivityVipLevel = {
  level: number;
  range: string;
  products: number;
  rate: string;
  color: string;
};

type FinancialSnapshot = {
  balance: number;
  holdAmount: number;
  availableAmount: number;
  todayCommission: number;
};

type ActivityLogItem = {
  id: string;
  label: string;
  amount: number;
  status: string;
  at: string;
};

const fallbackVipLevels: ActivityVipLevel[] = [
  { level: 1, range: '100 - 499', products: 40, rate: '0.5%', color: 'bg-slate-300' },
  { level: 2, range: '500 - 1,599', products: 45, rate: '1.0%', color: 'bg-yellow-500' },
  { level: 3, range: '1,600 - 5,499', products: 50, rate: '1.5%', color: 'bg-blue-500' },
  { level: 4, range: '5,500 - 9,999', products: 55, rate: '2.0%', color: 'bg-emerald-500' },
  { level: 5, range: '10,000', products: 60, rate: '2.5%', color: 'bg-orange-500' },
];

function mapVipConfigToActivity(tiers: VipConfig[]): ActivityVipLevel[] {
  const formatAmount = (value: number) => Math.round(value).toLocaleString('en-US');
  const sorted = [...tiers].sort((a, b) => a.level - b.level);

  return sorted.map((tier, index) => {
    const nextTier = sorted[index + 1];
    const range = nextTier
      ? `${formatAmount(tier.investment)} - ${formatAmount(Math.max(tier.investment, nextTier.investment - 1))}`
      : `${formatAmount(tier.investment)}`;

    return {
      level: tier.level,
      range,
      products: tier.dailyTasks,
      rate: `${(tier.commission * 100).toFixed(1)}%`,
      color: vipColorByTier[tier.color] ?? 'bg-gray-500',
    };
  });
}

export default function Activity() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [workdayRewards, setWorkdayRewards] = useState(defaultRewardsConfig.workday);
  const [resetRewards, setResetRewards] = useState(defaultRewardsConfig.reset);
  const [accumulatedRewards, setAccumulatedRewards] = useState(defaultRewardsConfig.accumulated);
  const [vipLevels, setVipLevels] = useState<ActivityVipLevel[]>(fallbackVipLevels);
  const [financialSnapshot, setFinancialSnapshot] = useState<FinancialSnapshot | null>(null);
  const [recentActivity, setRecentActivity] = useState<ActivityLogItem[]>([]);

  const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a1c55d7e`;

  useEffect(() => {
    const loadActivityConfig = async () => {
      try {
        const [rewards, vipTiers] = await Promise.all([
          fetchPublicRewardsConfig(),
          fetchPublicVipConfig(),
        ]);

        setWorkdayRewards(rewards.workday);
        setResetRewards(rewards.reset);
        setAccumulatedRewards(rewards.accumulated);

        if (vipTiers.length > 0) {
          setVipLevels(mapVipConfigToActivity(vipTiers));
        }
      } catch {
        setWorkdayRewards(defaultRewardsConfig.workday);
        setResetRewards(defaultRewardsConfig.reset);
        setAccumulatedRewards(defaultRewardsConfig.accumulated);
        setVipLevels(fallbackVipLevels);
      }

      try {
        const headers = {
          Authorization: `Bearer ${publicAnonKey}`,
        };

        const [financialsResponse, transactionsResponse, withdrawalsResponse] = await Promise.all([
          fetch(`${serverUrl}/me/financials`, { credentials: 'include', headers }),
          fetch(`${serverUrl}/me/transactions`, { credentials: 'include', headers }),
          fetch(`${serverUrl}/me/withdrawals`, { credentials: 'include', headers }),
        ]);

        if (financialsResponse.ok) {
          const financialsPayload = await financialsResponse.json().catch(() => ({}));
          setFinancialSnapshot({
            balance: Number(financialsPayload?.balance ?? 0),
            holdAmount: Number(financialsPayload?.holdAmount ?? 0),
            availableAmount: Number(financialsPayload?.availableAmount ?? 0),
            todayCommission: Number(financialsPayload?.todayCommission ?? 0),
          });
        } else {
          setFinancialSnapshot(null);
        }

        const transactionPayload = transactionsResponse.ok
          ? await transactionsResponse.json().catch(() => [])
          : [];
        const withdrawalPayload = withdrawalsResponse.ok
          ? await withdrawalsResponse.json().catch(() => [])
          : [];

        const transactionItems: ActivityLogItem[] = Array.isArray(transactionPayload)
          ? transactionPayload.map((item: any, index: number) => ({
            id: String(item?.id ?? `tx-${index}`),
            label: typeof item?.description === 'string' && item.description.trim()
              ? item.description
              : String(item?.type ?? 'Transaction'),
            amount: Number(item?.amount ?? 0),
            status: String(item?.status ?? 'Completed'),
            at: typeof item?.date === 'string' ? item.date : new Date().toISOString(),
          }))
          : [];

        const withdrawalItems: ActivityLogItem[] = Array.isArray(withdrawalPayload)
          ? withdrawalPayload.map((item: any, index: number) => ({
            id: String(item?.id ?? `wd-${index}`),
            label: 'Withdrawal Request',
            amount: Number(item?.amount ?? 0),
            status: String(item?.status ?? 'Pending'),
            at: typeof item?.createdAt === 'string'
              ? item.createdAt
              : (typeof item?.requestedAt === 'string' ? item.requestedAt : new Date().toISOString()),
          }))
          : [];

        const combined = [...transactionItems, ...withdrawalItems]
          .sort((left, right) => new Date(right.at).getTime() - new Date(left.at).getTime())
          .slice(0, 8);

        setRecentActivity(combined);
      } catch {
        setFinancialSnapshot(null);
        setRecentActivity([]);
      }
    };

    void loadActivityConfig();
  }, []);

  return (
    <div className="size-full overflow-auto pb-20 bg-white">
      {/* Header */}
      <Header onContactClick={() => setIsChatOpen(true)} />

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-3 sm:px-6 py-6">
        {/* Back Button and Title */}
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 mb-6">
          <Link to="/starting" className="bg-[#0066b3] text-white p-2 rounded hover:bg-[#0052a3] transition-colors justify-self-start">
            <ChevronLeft size={20} />
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0066b3] text-center">Activity</h1>
          <div className="w-9" aria-hidden="true"></div>
        </div>

        <div className="bg-[#0f172a] rounded-xl p-5 mb-8 border border-[#1f2937]">
          <h2 className="text-white text-lg font-semibold mb-4">Live Account Snapshot</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-[#111827] rounded-lg p-3">
              <p className="text-gray-400 text-xs uppercase tracking-wide">Balance</p>
              <p className="text-white text-xl font-bold">${(financialSnapshot?.balance ?? 0).toFixed(2)}</p>
            </div>
            <div className="bg-[#111827] rounded-lg p-3">
              <p className="text-gray-400 text-xs uppercase tracking-wide">Available</p>
              <p className="text-white text-xl font-bold">${(financialSnapshot?.availableAmount ?? 0).toFixed(2)}</p>
            </div>
            <div className="bg-[#111827] rounded-lg p-3">
              <p className="text-gray-400 text-xs uppercase tracking-wide">Hold</p>
              <p className="text-white text-xl font-bold">${(financialSnapshot?.holdAmount ?? 0).toFixed(2)}</p>
            </div>
            <div className="bg-[#111827] rounded-lg p-3">
              <p className="text-gray-400 text-xs uppercase tracking-wide">Today Profit</p>
              <p className="text-emerald-400 text-xl font-bold">${(financialSnapshot?.todayCommission ?? 0).toFixed(2)}</p>
            </div>
          </div>

          <h3 className="text-white text-sm font-semibold mb-2">Recent Activity Log</h3>
          <div className="space-y-2 max-h-56 overflow-auto pr-1">
            {recentActivity.length === 0 ? (
              <p className="text-gray-400 text-sm">No recent activity found for this session.</p>
            ) : recentActivity.map((entry) => (
              <div key={entry.id} className="bg-[#111827] rounded-lg px-3 py-2 flex items-start justify-between gap-3">
                <div>
                  <p className="text-white text-sm font-medium">{entry.label}</p>
                  <p className="text-gray-400 text-xs">{new Date(entry.at).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-white text-sm font-semibold">${entry.amount.toFixed(2)}</p>
                  <p className="text-gray-400 text-xs">{entry.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Workday Rewards Scheme Section */}
        <div className="bg-[#0d7fb8] rounded-lg p-4 sm:p-8 mb-8 relative overflow-hidden">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-10 left-10 w-32 h-32 bg-[#0b6fa3] rounded-full"></div>
            <div className="absolute bottom-10 right-10 w-40 h-40 bg-[#0b6fa3] rounded-full"></div>
          </div>
          
          <div className="relative z-10">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-6 sm:mb-8">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M24 4 L40 12 L38 26 L24 34 L10 26 L8 12 Z" fill="white" />
              </svg>
              <span className="text-2xl sm:text-3xl text-white font-bold">Steadfast</span>
            </div>

            {/* Title */}
            <h2 className="text-2xl sm:text-4xl font-bold text-yellow-300 mb-2 text-center">Workday Rewards Scheme</h2>
            <p className="text-sm sm:text-xl text-white mb-6 sm:mb-8 text-center">Check In. Show Up. Get Paid</p>

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
        <div className="bg-[#0d7fb8] rounded-lg p-4 sm:p-8 mb-8 relative overflow-hidden">
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
              <span className="text-2xl sm:text-3xl text-white font-bold">Steadfast</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-bold text-yellow-300 mb-2 text-center">VIP Level Chart</h2>
            <p className="text-sm sm:text-xl text-white mb-6 sm:mb-8 text-center">The More You Recharge, The Higher You Rise</p>

            {/* Table Header */}
            <div className="hidden sm:grid grid-cols-4 gap-2 mb-4 text-white text-center text-sm">
              <div>VIP Levels</div>
              <div>Unlock Condition/<br/>First Deposit Amount</div>
              <div>Daily Work<br/>Opportunities</div>
              <div>Profit Rate/<br/>Per Deal</div>
            </div>

            {/* VIP Levels */}
            <div className="space-y-3">
              {vipLevels.map((vip) => (
                <div key={vip.level} className="bg-gray-700 rounded-lg p-3 sm:p-4 border-4 border-yellow-400">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 sm:gap-2 items-start sm:items-center text-white">
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
                    <div className="sm:text-center">
                      <p className="text-xs text-gray-300 sm:hidden mb-1">Unlock Condition</p>
                      <span className="text-cyan-300 font-bold text-base sm:text-lg">{vip.range}</span>
                      <span className="text-gray-300 ml-1 text-sm">{vip.level === 5 ? 'USD or Above' : 'USD'}</span>
                    </div>

                    {/* Daily Work */}
                    <div className="sm:text-center font-bold">
                      <p className="text-xs text-gray-300 sm:hidden mb-1">Daily Work</p>
                      {vip.products} products/ Set
                    </div>

                    {/* Profit Rate */}
                    <div className="sm:text-center font-bold text-lg sm:text-xl">
                      <p className="text-xs text-gray-300 sm:hidden mb-1">Profit Rate</p>
                      {vip.rate}
                    </div>
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
        <div className="bg-[#0d7fb8] rounded-lg p-4 sm:p-8 mb-8 relative overflow-hidden">
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
              <span className="text-2xl sm:text-3xl text-white font-bold">Steadfast</span>
            </div>

            <div className="text-right mb-6">
              <h2 className="text-2xl sm:text-4xl font-bold text-yellow-300">3<sup>rd</sup> Anniversary</h2>
              <h2 className="text-2xl sm:text-4xl font-bold text-yellow-300">Thanksgiving Feedback</h2>
              <p className="text-sm sm:text-xl text-white">Steadfast Advances Activities</p>
            </div>

            <h3 className="text-xl sm:text-2xl font-bold text-white italic mb-6 underline">Reset Advance Rewards</h3>

            {/* Rewards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {resetRewards.map((reward, index) => (
                <div key={index} className={`${reward.color} rounded-3xl p-4 sm:p-6 text-center relative overflow-hidden`}>
                  <div className="mb-3">
                    <div className="text-sm text-black mb-1">Deposit with</div>
                    <div className="text-2xl sm:text-3xl font-bold text-black">{reward.deposit.toLocaleString()}</div>
                    <div className="text-sm text-black">USD</div>
                  </div>
                  <div className="mb-3">
                    <div className="text-sm text-black mb-1">Get Extra Reward</div>
                    <div className="text-3xl sm:text-4xl font-bold text-black">{reward.reward.toLocaleString()}</div>
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
          <h3 className="text-xl sm:text-2xl font-bold text-[#0066b3] italic mb-6 underline">Accumulated Deposit Rewards For The Day</h3>
          
          <div className="space-y-4">
            {accumulatedRewards.map((reward, index) => (
              <div key={index} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                <div className="flex-1 bg-gray-700 rounded-lg p-4 border-4 border-yellow-400">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-white">
                    <div>
                      <div className="text-sm">Advances On Day (USD)</div>
                      <div className="text-xl sm:text-2xl font-bold text-cyan-300">
                        {reward.maxDeposit === null
                          ? `${reward.minDeposit.toLocaleString()}+`
                          : `${reward.minDeposit.toLocaleString()} - ${reward.maxDeposit.toLocaleString()}`}
                      </div>
                    </div>
                    <div className="text-sm">
                      Will Get<br/>Advance Deposit Reward
                    </div>
                  </div>
                </div>
                <div className="self-center sm:self-auto w-20 h-20 sm:w-24 sm:h-24 bg-yellow-300 rounded-full flex items-center justify-center border-4 border-[#0066b3]">
                  <span className="text-2xl sm:text-3xl font-bold text-black">{(reward.rate * 100).toFixed(1)}%</span>
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