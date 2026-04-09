import { ChevronLeft } from 'lucide-react';
import { useBackNavigate } from '../hooks/useBackNavigate';
import { useEffect, useState } from 'react';
import { LiveChatBox } from '../components/LiveChatBox';
import { BottomNavigation } from '../components/BottomNavigation';
import { Header } from '../components/Header';
import { defaultRewardsConfig, type RewardsConfig } from '../services/rewardsConfig';
import { type VipConfig } from '../services/vipConfig';
import { publicAnonKey } from '@utils/supabase/info';
import { fetchBonusFeed, type BonusFeedItem } from '../services/bonusFeed';
import { fetchJsonWithRetry } from '../services/networkClient';
import { getCurrentUsername } from '../services/referralSystem';
import { buildUserScopedCacheKey, reportClientCompatibilityEvent } from '../services/apiCompatibility';
import { RUNTIME_ENVIRONMENT } from '../services/runtimeEnvironment';

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
  premiumRate: string;
  color: string;
};

type FinancialSnapshot = {
  balance: number;
  holdAmount: number;
  availableAmount: number;
  todayCommission: number;
  luckyBonus: number;
};

type ActivityLogItem = {
  id: string;
  label: string;
  amount: number;
  status: string;
  at: string;
};

type ActivitySnapshotResponse = {
  financialSnapshot?: FinancialSnapshot;
  transactions?: any[];
  withdrawals?: any[];
  vipConfig?: VipConfig[];
  rewardsConfig?: RewardsConfig | null;
};

const fallbackVipLevels: ActivityVipLevel[] = [
  { level: 1, range: '100 - 499', products: 40, rate: '0.5%', premiumRate: '5.0%', color: 'bg-slate-300' },
  { level: 2, range: '500 - 1,599', products: 45, rate: '1.0%', premiumRate: '10.0%', color: 'bg-yellow-500' },
  { level: 3, range: '1,600 - 5,499', products: 50, rate: '1.5%', premiumRate: '15.0%', color: 'bg-blue-500' },
  { level: 4, range: '5,500 - 9,999', products: 55, rate: '2.0%', premiumRate: '20.0%', color: 'bg-emerald-500' },
  { level: 5, range: '10,000', products: 60, rate: '2.5%', premiumRate: '25.0%', color: 'bg-orange-500' },
];

const screenshotWorkdayRewards = [
  { days: 2, salary: 120 },
  { days: 5, salary: 1000 },
  { days: 10, salary: 1400 },
  { days: 20, salary: 1600 },
  { days: 30, salary: 2000 },
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
      premiumRate: `${(tier.commission * 1000).toFixed(1)}%`,
      color: vipColorByTier[tier.color] ?? 'bg-gray-500',
    };
  });
}

export default function Activity() {
  const goBack = useBackNavigate();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [workdayRewards, setWorkdayRewards] = useState(defaultRewardsConfig.workday);
  const [resetRewards, setResetRewards] = useState(defaultRewardsConfig.reset);
  const [accumulatedRewards, setAccumulatedRewards] = useState(defaultRewardsConfig.accumulated);
  const [vipLevels, setVipLevels] = useState<ActivityVipLevel[]>(fallbackVipLevels);
  const [financialSnapshot, setFinancialSnapshot] = useState<FinancialSnapshot | null>(null);
  const [recentActivity, setRecentActivity] = useState<ActivityLogItem[]>([]);
  const [recentBonuses, setRecentBonuses] = useState<BonusFeedItem[]>([]);

  const username = getCurrentUsername();
  const serverUrl = RUNTIME_ENVIRONMENT.apiBaseUrl;
  const ACTIVITY_SNAPSHOT_CACHE_TTL_MS = 45 * 1000;
  const resetDisplayOrder = [100, 1000, 5500, 500, 1600, 10000];
  const resetBadgeByDeposit: Record<number, string> = {
    500: 'HOT PICKS',
    1600: 'LIMITED OFFER',
    10000: 'BEST DEAL',
  };

  const resetColumnCardBg = ['bg-cyan-100', 'bg-yellow-50', 'bg-rose-100'];
  const resetColumnBorderColor = ['border-cyan-200', 'border-yellow-200', 'border-rose-200'];
  const resetColumnBadgeBg = ['bg-sky-500', 'bg-amber-500', 'bg-pink-700'];

  const orderedResetRewards = resetDisplayOrder
    .map((deposit) => resetRewards.find((reward) => Number(reward.deposit) === deposit))
    .filter((reward): reward is typeof resetRewards[number] => Boolean(reward));

  useEffect(() => {
    const loadActivityConfig = async () => {
      const loadLegacyActivityData = async () => {
        const headers = {
          Authorization: `Bearer ${publicAnonKey}`,
        };

        const [rewards, vipTiers, financialsResponse, transactionsResponse, withdrawalsResponse] = await Promise.all([
          fetchJsonWithRetry<any>({
            url: `${serverUrl}/rewards-config`,
            init: { headers },
            timeoutMs: 10000,
            retries: 1,
            retryDelayMs: 300,
            pageTag: 'activity-fallback',
          }),
          fetchJsonWithRetry<any>({
            url: `${serverUrl}/vip-config`,
            init: { headers },
            timeoutMs: 10000,
            retries: 1,
            retryDelayMs: 300,
            pageTag: 'activity-fallback',
          }),
          fetchJsonWithRetry<any>({
            url: `${serverUrl}/me/financials`,
            init: { credentials: 'include' },
            timeoutMs: 10000,
            retries: 1,
            retryDelayMs: 300,
            pageTag: 'activity-fallback',
          }),
          fetchJsonWithRetry<any[]>({
            url: `${serverUrl}/me/transactions?limit=80`,
            init: { credentials: 'include' },
            timeoutMs: 10000,
            retries: 1,
            retryDelayMs: 300,
            pageTag: 'activity-fallback',
          }),
          fetchJsonWithRetry<any[]>({
            url: `${serverUrl}/me/withdrawals`,
            init: { credentials: 'include' },
            timeoutMs: 10000,
            retries: 1,
            retryDelayMs: 300,
            pageTag: 'activity-fallback',
          }),
        ]);

        const rewardsPayload = rewards?.config && typeof rewards.config === 'object'
          ? rewards.config as RewardsConfig
          : defaultRewardsConfig;
        const vipPayload = Array.isArray(vipTiers?.tiers) ? vipTiers.tiers as VipConfig[] : [];
        setWorkdayRewards(rewardsPayload.workday);
        setResetRewards(rewardsPayload.reset);
        setAccumulatedRewards(rewardsPayload.accumulated);
        setVipLevels(vipPayload.length > 0 ? mapVipConfigToActivity(vipPayload) : fallbackVipLevels);

        setFinancialSnapshot({
          balance: Number(financialsResponse?.balance ?? 0),
          holdAmount: Number(financialsResponse?.holdAmount ?? 0),
          availableAmount: Number(financialsResponse?.availableAmount ?? 0),
          todayCommission: Number(financialsResponse?.todayCommission ?? 0),
          luckyBonus: Number(financialsResponse?.luckyBonus ?? 0),
        });

        const transactionPayload = Array.isArray(transactionsResponse) ? transactionsResponse : [];
        const withdrawalPayload = Array.isArray(withdrawalsResponse) ? withdrawalsResponse : [];

        const transactionItems: ActivityLogItem[] = transactionPayload.map((item: any, index: number) => ({
          id: String(item?.id ?? `tx-${index}`),
          label: typeof item?.description === 'string' && item.description.trim()
            ? item.description
            : String(item?.type ?? 'Transaction'),
          amount: Number(item?.amount ?? 0),
          status: String(item?.status ?? 'Completed'),
          at: typeof item?.date === 'string' ? item.date : new Date().toISOString(),
        }));

        const withdrawalItems: ActivityLogItem[] = withdrawalPayload.map((item: any, index: number) => ({
          id: String(item?.id ?? `wd-${index}`),
          label: 'Withdrawal Request',
          amount: Number(item?.amount ?? 0),
          status: String(item?.status ?? 'Pending'),
          at: typeof item?.createdAt === 'string'
            ? item.createdAt
            : (typeof item?.requestedAt === 'string' ? item.requestedAt : new Date().toISOString()),
        }));

        setRecentActivity(
          [...transactionItems, ...withdrawalItems]
            .sort((left, right) => new Date(right.at).getTime() - new Date(left.at).getTime())
            .slice(0, 8),
        );
      };

      try {
        // Go directly to V2 snapshot URL — skip the /version waterfall.
        const v2Url = `${serverUrl}/v2/me/activity-snapshot?includeConfig=true&transactionsLimit=80&withdrawalsLimit=40`;

        const snapshot = await fetchJsonWithRetry<ActivitySnapshotResponse>({
          url: v2Url,
          init: {
            credentials: 'include',
          },
          timeoutMs: 10000,
          retries: 2,
          retryDelayMs: 300,
          cacheKey: buildUserScopedCacheKey('activity:snapshot', username, 'v2'),
          cacheTtlMs: ACTIVITY_SNAPSHOT_CACHE_TTL_MS,
          pageTag: 'activity',
          featureTag: 'activitySnapshotV2',
          expectedApiVersion: 'v2',
        });

        const rewards = snapshot?.rewardsConfig && typeof snapshot.rewardsConfig === 'object'
          ? snapshot.rewardsConfig
          : defaultRewardsConfig;
        const vipTiers = Array.isArray(snapshot?.vipConfig)
          ? snapshot.vipConfig
          : [];

        setWorkdayRewards(rewards.workday);
        setResetRewards(rewards.reset);
        setAccumulatedRewards(rewards.accumulated);
        setVipLevels(vipTiers.length > 0 ? mapVipConfigToActivity(vipTiers) : fallbackVipLevels);

        setFinancialSnapshot({
          balance: Number(snapshot?.financialSnapshot?.balance ?? 0),
          holdAmount: Number(snapshot?.financialSnapshot?.holdAmount ?? 0),
          availableAmount: Number(snapshot?.financialSnapshot?.availableAmount ?? 0),
          todayCommission: Number(snapshot?.financialSnapshot?.todayCommission ?? 0),
          luckyBonus: Number(snapshot?.financialSnapshot?.luckyBonus ?? 0),
        });

        const transactionPayload = Array.isArray(snapshot?.transactions)
          ? snapshot.transactions
          : [];
        const withdrawalPayload = Array.isArray(snapshot?.withdrawals)
          ? snapshot.withdrawals
          : [];

        const transactionItems: ActivityLogItem[] = transactionPayload.map((item: any, index: number) => ({
          id: String(item?.id ?? `tx-${index}`),
          label: typeof item?.description === 'string' && item.description.trim()
            ? item.description
            : String(item?.type ?? 'Transaction'),
          amount: Number(item?.amount ?? 0),
          status: String(item?.status ?? 'Completed'),
          at: typeof item?.date === 'string' ? item.date : new Date().toISOString(),
        }));

        const withdrawalItems: ActivityLogItem[] = withdrawalPayload.map((item: any, index: number) => ({
          id: String(item?.id ?? `wd-${index}`),
          label: 'Withdrawal Request',
          amount: Number(item?.amount ?? 0),
          status: String(item?.status ?? 'Pending'),
          at: typeof item?.createdAt === 'string'
            ? item.createdAt
            : (typeof item?.requestedAt === 'string' ? item.requestedAt : new Date().toISOString()),
        }));

        const combined = [...transactionItems, ...withdrawalItems]
          .sort((left, right) => new Date(right.at).getTime() - new Date(left.at).getTime())
          .slice(0, 8);

        setRecentActivity(combined);
      } catch (snapshotError) {
        void reportClientCompatibilityEvent({
          event: 'fallback_used',
          feature: 'activitySnapshotV2',
          expectedApiVersion: 'v2',
          reason: 'activity_snapshot_request_failed',
          detail: {
            message: snapshotError instanceof Error ? snapshotError.message : 'unknown',
          },
        });

        try {
          await loadLegacyActivityData();
        } catch {
          setWorkdayRewards(defaultRewardsConfig.workday);
          setResetRewards(defaultRewardsConfig.reset);
          setAccumulatedRewards(defaultRewardsConfig.accumulated);
          setVipLevels(fallbackVipLevels);
          setFinancialSnapshot(null);
          setRecentActivity([]);
        }
      }

      try {
        const bonusFeed = await fetchBonusFeed({ limit: 8 }).catch(() => []);
        setRecentBonuses(bonusFeed);
      } catch {
        setRecentBonuses([]);
      }
    };

    void loadActivityConfig();
  }, [serverUrl, username]);

  const bonusTotal = recentBonuses.reduce((sum, bonus) => sum + Number(bonus.amount ?? 0), 0);
  const bonusByAssignmentMode = recentBonuses.reduce((acc, bonus) => {
    const key = bonus.assignmentMode;
    acc[key] = (acc[key] ?? 0) + Number(bonus.amount ?? 0);
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="size-full overflow-auto pb-20 bg-[#0a0a0a]">
      {/* Header */}
      <Header onContactClick={() => setIsChatOpen(true)} />

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-3 sm:px-6 py-6">
        {/* Back Button and Title */}
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 mb-6">
          <button onClick={goBack} aria-label="Go back" className="btn-nav-back justify-self-start">
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0066b3] text-center">Activity</h1>
          <div className="w-9" aria-hidden="true"></div>
        </div>

        <div className="bg-[#0f172a] rounded-xl p-5 mb-8 border border-[#1f2937] sf-stagger-1 shadow-[0_4px_16px_rgba(0,0,0,0.15)]">
          <h2 className="text-white text-lg font-semibold mb-4">Live Account Snapshot</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            <div className="bg-[#111827] rounded-lg p-3 transition-all duration-200 hover:bg-[#1a2332]">
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
            <div className="bg-[#111827] rounded-lg p-3">
              <p className="text-gray-400 text-xs uppercase tracking-wide">Lucky Bonus</p>
              <p className="text-amber-300 text-xl font-bold">${(financialSnapshot?.luckyBonus ?? 0).toFixed(2)}</p>
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

          <h3 className="text-white text-sm font-semibold mb-2 mt-4">Bonus Assignment Feed</h3>
          <div className="space-y-2 max-h-48 overflow-auto pr-1">
            {recentBonuses.length === 0 ? (
              <p className="text-gray-400 text-sm">No bonus events available for this session.</p>
            ) : recentBonuses.map((bonus) => (
              <div key={bonus.id} className="bg-[#111827] rounded-lg px-3 py-2 flex items-start justify-between gap-3">
                <div>
                  <p className="text-white text-sm font-medium">{bonus.label}</p>
                  <p className="text-gray-400 text-xs">{bonus.description || 'Bonus awarded'}</p>
                  <p className="text-gray-500 text-[11px] mt-1">{new Date(bonus.createdAt).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-cyan-300 text-sm font-semibold">+${Number(bonus.amount ?? 0).toFixed(2)}</p>
                  <p className="text-gray-400 text-xs uppercase">{bonus.assignmentMode}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Workday Rewards Scheme Section */}
        <div className="mb-8">
          <div
            className="w-full rounded-2xl p-5 sm:p-7"
            style={{
              background:
                'linear-gradient(150deg, #0f7fc0 0%, #0a63a3 55%, #0a5a96 100%), repeating-linear-gradient(145deg, rgba(255,255,255,0.08) 0, rgba(255,255,255,0.08) 10px, transparent 10px, transparent 22px)',
            }}
          >
            <h2 className="text-[2rem] sm:text-[2.25rem] font-bold text-[#ffd85a] leading-tight text-center">Workday Rewards Scheme</h2>
            <p className="text-[1.2rem] sm:text-[1.35rem] text-white text-center mb-4">Check In. Show Up. Get Paid</p>

            <div className="space-y-2.5 sm:space-y-3">
              {workdayRewards.map((reward) => (
                <div key={reward.days} className="flex items-center gap-2 sm:gap-2.5">
                  <div className="w-[80px] h-[56px] sm:w-[104px] sm:h-[72px] bg-[#d5fff7] rounded-[999px] flex flex-col items-center justify-center shrink-0">
                    <div className="text-[1.5rem] sm:text-[2.2rem] leading-none font-bold text-[#0f172a]">{reward.days}</div>
                    <div className="text-[0.72rem] sm:text-[0.78rem] text-[#0f172a] leading-none mt-0.5">Days Worked</div>
                  </div>

                  <div className="h-[56px] sm:h-[72px] min-w-0 flex-1 bg-[#d5fff7] rounded-[999px] pl-2 pr-2.5 sm:pl-3.5 sm:pr-4 flex items-center gap-2 sm:gap-2.5 overflow-hidden">
                    <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-[#5ccb5f] flex items-center justify-center shrink-0">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <circle cx="12" cy="12" r="10" fill="#6be06d" />
                        <path d="M7 12.5L10.2 15.4L17 8.6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>

                    <div className="text-[0.7rem] sm:text-[0.86rem] text-[#213547] leading-none">Salary Earned</div>

                    <div className="ml-auto flex items-end gap-1 text-[#0f172a] shrink-0">
                      <span className="text-[1.4rem] sm:text-[2.2rem] leading-none font-bold">{reward.salary.toLocaleString()}</span>
                      <span className="text-[0.75rem] sm:text-[1rem] leading-none mb-0.5 sm:mb-1">USD</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* How It Works Section */}
        <div className="bg-[#141414] mb-8 px-4 py-5 rounded-lg border border-white/[0.06]">
          <h3 className="text-xl font-bold text-white mb-3">How It Works:</h3>
          <p className="text-gray-300 mb-4">
            For everyday you check in and complete your work, you earn guaranteed income!<br/>
            The more you show up, the more you earn. Simple as that!
          </p>
          <p className="text-lg font-bold text-white mb-6">Perfect attendance will earn up to 6120 USD per month.</p>
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
            <p className="text-xs sm:text-sm text-cyan-100 mb-6 text-center">
              Tasks per set are assigned automatically by VIP tier.
            </p>

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
                  <div className="grid grid-cols-4 gap-1 sm:gap-2 items-center text-white">
                    {/* VIP Badge */}
                    <div className="flex items-center gap-1 sm:gap-2">
                      <div className={`${vip.color} w-8 h-8 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center shrink-0`}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                        </svg>
                      </div>
                      <span className="font-bold text-[11px] sm:text-base leading-tight">VIP {vip.level}</span>
                    </div>

                    {/* Unlock Condition */}
                    <div className="text-center">
                      <div className="text-cyan-300 font-bold text-[10px] sm:text-lg leading-tight">{vip.range}</div>
                      <div className="text-gray-300 text-[9px] sm:text-sm">{vip.level === 5 ? 'or Above' : 'USD'}</div>
                    </div>

                    {/* Daily Work */}
                    <div className="text-center font-bold text-[10px] sm:text-base">
                      {vip.products} products/ Set
                    </div>

                    {/* Profit Rate */}
                    <div className="text-center font-bold text-[11px] sm:text-xl">
                      {vip.rate}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="bg-[#141414] mb-8 px-4 py-5 rounded-lg border border-white/[0.06]">
          <h3 className="text-xl font-bold text-white mb-4">Benefits of Upgrading Your VIP Level:</h3>
          <ul className="space-y-2 mb-6">
            <li className="flex items-start gap-2">
              <span className="font-bold text-gray-300">•</span>
              <span className="font-bold text-gray-300">Higher Daily Profits</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-gray-300">•</span>
              <span className="font-bold text-gray-300">More Work Opportunities</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-gray-300">•</span>
              <span className="font-bold text-gray-300">Priority Access to Special Events</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-gray-300">•</span>
              <span className="font-bold text-gray-300">Bonus Rewards for Top-tier Members</span>
            </li>
          </ul>

          <h3 className="text-lg font-bold italic text-white mb-3">Notice to All Users:</h3>
          <p className="text-gray-300 mb-3">
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
            <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
              {orderedResetRewards.map((reward, index) => {
                const badge = resetBadgeByDeposit[Number(reward.deposit)] ?? '';
                const colIdx = index % 3;

                return (
                  <div key={reward.id} className="flex flex-col items-stretch">
                    <div className={`${resetColumnCardBg[colIdx]} rounded-2xl px-2 py-2.5 sm:px-3 sm:py-3 text-center border ${resetColumnBorderColor[colIdx]} min-h-[132px] sm:min-h-[156px] flex flex-col justify-center`}>
                      <p className="text-[9px] sm:text-xs text-slate-700 leading-tight">Deposit with</p>
                      <p className="text-xl sm:text-3xl font-extrabold text-slate-900 leading-none mt-1">{reward.deposit.toLocaleString()}</p>
                      <p className="text-[10px] sm:text-xs text-slate-700">USD</p>

                      <p className="text-[9px] sm:text-xs text-slate-700 leading-tight mt-2">Get Extra Reward</p>
                      <p className="text-2xl sm:text-4xl font-extrabold text-slate-900 leading-none mt-1">{reward.reward.toLocaleString()}</p>
                      <p className="text-[10px] sm:text-xs text-slate-700">USD</p>
                    </div>
                    {badge ? (
                      <div className={`${resetColumnBadgeBg[colIdx]} text-white text-[10px] sm:text-xs font-bold text-center rounded-full px-2 py-1 mt-1.5 shadow-sm`}>
                        {badge}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Accumulated Deposit Rewards Section */}
        <div className="bg-white mb-8 px-4">
          <h3 className="text-xl sm:text-2xl font-bold text-[#0066b3] italic mb-6 underline">Accumulated Deposit Rewards For The Day</h3>
          
          <div className="space-y-4">
            {accumulatedRewards.map((reward, index) => (
              <div key={index} className="flex flex-row items-center gap-2 sm:gap-4">
                <div className="flex-1 bg-gray-700 rounded-lg p-3 sm:p-4 border-4 border-yellow-400">
                  <div className="flex flex-row items-center justify-between gap-2 text-white">
                    <div>
                      <div className="text-xs sm:text-sm">Advances On Day (USD)</div>
                      <div className="text-base sm:text-2xl font-bold text-cyan-300">
                        {reward.maxDeposit === null
                          ? `${reward.minDeposit.toLocaleString()} - Above`
                          : `${reward.minDeposit.toLocaleString()} - ${reward.maxDeposit.toLocaleString()}`}
                      </div>
                    </div>
                    <div className="text-[10px] sm:text-sm text-right shrink-0">
                      Will Get<br/>Advance Deposit Reward
                    </div>
                  </div>
                </div>
                <div className="shrink-0 w-14 h-14 sm:w-24 sm:h-24 bg-yellow-300 rounded-full flex items-center justify-center border-4 border-[#0066b3]">
                  <span className="text-lg sm:text-3xl font-bold text-black">{(reward.rate * 100).toFixed(0)}%</span>
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