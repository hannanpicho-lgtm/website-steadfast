import { Loader2, Lock, AlertCircle, CheckCircle2, MessageCircle } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from 'react';
import { toast } from 'sonner';
const LiveChatBox = lazy(() => import('../components/LiveChatBox').then(m => ({ default: m.LiveChatBox })));
import { BottomNavigation } from '../components/BottomNavigation';
import { Header } from '../components/Header';
import { LiveTickerBanner } from '../components/starting/LiveTickerBanner';
import { ProductCarousel } from '../components/starting/ProductCarousel';
import { FinancialSummaryPanel } from '../components/starting/FinancialSummaryPanel';
import { usePullToRefresh, PullToRefreshIndicator } from '../hooks/usePullToRefresh';
import { useConfetti } from '../hooks/useConfetti';
import { publicAnonKey } from '@utils/supabase/info';
import { getCurrentUsername } from '../services/referralSystem';
import { buildLoginRedirectState } from '../services/loginRedirect';
import { type VipConfig } from '../services/vipConfig';
import { type RewardsConfig, defaultRewardsConfig } from '../services/rewardsConfig';
import { acknowledgeBonusFeedItems, fetchBonusFeed } from '../services/bonusFeed';
import { fetchWinnersTicker, type WinnersTickerEntry } from '../services/winnersTicker';
import { fetchJsonWithRetry, invalidateSessionCacheByPrefix, isAuthError } from '../services/networkClient';
import { RUNTIME_ENVIRONMENT } from '../services/runtimeEnvironment';
import {
  buildPublicCacheKey,
  buildUserScopedCacheKey,
  reportClientCompatibilityEvent,
} from '../services/apiCompatibility';

interface UserData {
  username: string;
  vipLevel: number;
  balance: number;
  availableAmount?: number;
  todayCommission: number;
  holdAmount: number;
  luckyBonus: number;
  tasksCompleted: number;
  tasksLimit: number;
  taskSetCount?: number;
  tasksPerSet?: number;
  tasksCompletedInSet?: number;
  completedTaskSets?: number;
  pendingTaskReset?: boolean;
  isFrozen?: boolean;
  isSuspended?: boolean;
  activePremium?: any;
  premiumQueue?: any[];
}

interface TaskCatalogItem {
  id: string;
  merchant: string;
  product: string;
  price: number;
  commission: number;
  status: 'Active' | 'Paused';
  image: string;
  rating: number;
  productUrl: string;
  vipTier?: number;
}

type TaskCatalogResponse = {
  tasks?: TaskCatalogItem[];
  ruleConfig?: {
    premiumEnabled?: boolean;
    premiumTriggerTaskNumber?: number;
    premiumValueMode?: 'multiplier' | 'range';
  };
};

const LIVE_TICKER_FALLBACK_ENTRIES: WinnersTickerEntry[] = [
  { emoji: '🏆', user: 'Fugene55', amount: '$15,257.00 USD' },
  { emoji: '🎉', user: 'RewardKing_89', amount: '$12,450.00 USD' },
  { emoji: '💰', user: 'SleepAre8', amount: '$77.00 USD' },
  { emoji: '🌟', user: 'PlatinumUser7', amount: '$18,000.00 USD' },
  { emoji: '🏆', user: 'Diamond_Quest88', amount: '$22,300.00 USD' },
  { emoji: '🎉', user: 'Lamar_K', amount: '$4,820.00 USD' },
  { emoji: '💰', user: 'CryptoEagle9', amount: '$5,750.00 USD' },
  { emoji: '🌟', user: 'MastermindQ', amount: '$14,500.00 USD' },
  { emoji: '🏆', user: 'jhoman1988', amount: '$2,350.00 USD' },
  { emoji: '🎉', user: 'ProfitPilot', amount: '$9,100.00 USD' },
  { emoji: '💰', user: 'TechMaster_Pro', amount: '$3,125.00 USD' },
  { emoji: '🌟', user: 'GoldenPath_X', amount: '$8,900.00 USD' },
  { emoji: '🏆', user: 'Luxe_Capital', amount: '$27,400.00 USD' },
  { emoji: '🎉', user: 'TradeHawk22', amount: '$6,320.00 USD' },
  { emoji: '💰', user: 'AlphaNode_7', amount: '$11,750.00 USD' },
  { emoji: '🌟', user: 'SilverEdge_99', amount: '$1,980.00 USD' },
  { emoji: '🏆', user: 'VaultRunner', amount: '$34,100.00 USD' },
  { emoji: '🎉', user: 'NexGen_Pro', amount: '$8,420.00 USD' },
  { emoji: '💰', user: 'Zenith_Mark', amount: '$19,650.00 USD' },
  { emoji: '🌟', user: 'Opal_Trader', amount: '$4,375.00 USD' },
  { emoji: '🏆', user: 'IronWave_X', amount: '$16,800.00 USD' },
  { emoji: '🎉', user: 'BlueChip_Dan', amount: '$7,290.00 USD' },
  { emoji: '💰', user: 'SwiftGain_01', amount: '$13,550.00 USD' },
  { emoji: '🌟', user: 'QuantumLeap9', amount: '$21,000.00 USD' },
  { emoji: '🏆', user: 'ApexRider_K', amount: '$31,200.00 USD' },
  { emoji: '🎉', user: 'GloryHunter7', amount: '$6,875.00 USD' },
  { emoji: '💰', user: 'NovaStar_22', amount: '$10,440.00 USD' },
  { emoji: '🌟', user: 'CobaltEdge', amount: '$18,750.00 USD' },
  { emoji: '🏆', user: 'RichardV_88', amount: '$3,600.00 USD' },
  { emoji: '🎉', user: 'TopTier_Mel', amount: '$25,100.00 USD' },
  { emoji: '💰', user: 'PhoenixRise99', amount: '$7,820.00 USD' },
  { emoji: '🌟', user: 'SummitX_Pro', amount: '$14,200.00 USD' },
  { emoji: '🏆', user: 'GoldenEagle_T', amount: '$42,500.00 USD' },
  { emoji: '🎉', user: 'WealthPath_J', amount: '$5,330.00 USD' },
  { emoji: '💰', user: 'DeltaForce_9', amount: '$9,975.00 USD' },
  { emoji: '🌟', user: 'PrimeWinner_Z', amount: '$17,600.00 USD' },
  { emoji: '🏆', user: 'NightOwl_Cash', amount: '$2,900.00 USD' },
  { emoji: '🎉', user: 'CrystalWave', amount: '$11,400.00 USD' },
  { emoji: '💰', user: 'HorizonMax_5', amount: '$38,700.00 USD' },
  { emoji: '🌟', user: 'EliteTrader_B', amount: '$8,150.00 USD' },
  { emoji: '🏆', user: 'LuckyStrike_41', amount: '$4,050.00 USD' },
  { emoji: '🎉', user: 'MegaGain_90', amount: '$23,800.00 USD' },
  { emoji: '💰', user: 'SonicProfit_3', amount: '$16,325.00 USD' },
  { emoji: '🌟', user: 'RoyalFlush_H', amount: '$29,000.00 USD' },
  { emoji: '🏆', user: 'TurboCharge_W', amount: '$6,540.00 USD' },
  { emoji: '🎉', user: 'Blaze_Rewards', amount: '$12,900.00 USD' },
  { emoji: '💰', user: 'CashKing_007', amount: '$44,200.00 USD' },
  { emoji: '🌟', user: 'SkyRocket_Pro', amount: '$7,755.00 USD' },
];

const TASK_CATALOG_CACHE_KEY = buildPublicCacheKey('starting:task-catalog', 'v1');
const TASK_CATALOG_CACHE_TTL_MS = 5 * 60 * 1000;
const FINANCIAL_SUMMARY_CACHE_KEY = 'starting:financial-summary';
const FINANCIAL_SUMMARY_CACHE_TTL_MS = 5 * 60 * 1000;
const STARTING_PERF_SAMPLES_KEY = 'starting:perf-samples:v1';
const STARTING_PERF_MAX_SAMPLES = 30;
const STARTING_PERF_EVENTS_KEY = 'starting:perf-events:v1';

type StartingPerfSample = {
  recordedAt: string;
  path: string;
  routeToInteractiveMs: number;
  fetchPhaseMs: number;
  sessionFetchMs: number | null;
  catalogFetchMs: number | null;
  sessionLoadOk: boolean;
  catalogLoadOk: boolean;
  usedCachedCatalog: boolean;
  navDomContentLoadedMs: number | null;
  navResponseStartMs: number | null;
};

function roundMoney(value: number): number {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function readSessionCache<T>(key: string, ttlMs: number): T | null {
  try {
    const rawValue = sessionStorage.getItem(key);
    if (!rawValue) return null;
    const parsed = JSON.parse(rawValue) as { timestamp?: number; payload?: T };
    if (!parsed || typeof parsed.timestamp !== 'number' || !parsed.payload) return null;
    if (Date.now() - parsed.timestamp > ttlMs) {
      sessionStorage.removeItem(key);
      return null;
    }
    return parsed.payload;
  } catch {
    return null;
  }
}

function writeSessionCache<T>(key: string, payload: T) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ timestamp: Date.now(), payload }));
  } catch {
    // Ignore storage errors.
  }
}

function readTaskCatalogCache(): TaskCatalogResponse | null {
  return readSessionCache<TaskCatalogResponse>(TASK_CATALOG_CACHE_KEY, TASK_CATALOG_CACHE_TTL_MS);
}

function writeTaskCatalogCache(payload: TaskCatalogResponse) {
  writeSessionCache(TASK_CATALOG_CACHE_KEY, payload);
}

function readFinancialSummaryCache(username: string): UserData | null {
  return readSessionCache<UserData>(buildUserScopedCacheKey(FINANCIAL_SUMMARY_CACHE_KEY, username, 'v1'), FINANCIAL_SUMMARY_CACHE_TTL_MS);
}

function writeFinancialSummaryCache(username: string, payload: UserData) {
  writeSessionCache(buildUserScopedCacheKey(FINANCIAL_SUMMARY_CACHE_KEY, username, 'v1'), payload);
}

function readStartingPerfSamples(): StartingPerfSample[] {
  try {
    const rawValue = localStorage.getItem(STARTING_PERF_SAMPLES_KEY);
    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStartingPerfSample(sample: StartingPerfSample) {
  try {
    const existingSamples = readStartingPerfSamples();
    const nextSamples = [sample, ...existingSamples].slice(0, STARTING_PERF_MAX_SAMPLES);
    localStorage.setItem(STARTING_PERF_SAMPLES_KEY, JSON.stringify(nextSamples));
  } catch {
    // Ignore storage failures; metrics should never block user flow.
  }
}

function writeStartingPerfEvent(sample: StartingPerfSample) {
  try {
    const rawValue = localStorage.getItem(STARTING_PERF_EVENTS_KEY);
    const existing = rawValue ? JSON.parse(rawValue) : [];
    const list = Array.isArray(existing) ? existing : [];
    const next = [
      {
        recordedAt: sample.recordedAt,
        path: sample.path,
        routeToInteractiveMs: sample.routeToInteractiveMs,
        fetchPhaseMs: sample.fetchPhaseMs,
        sessionLoadOk: sample.sessionLoadOk,
        catalogLoadOk: sample.catalogLoadOk,
      },
      ...list,
    ].slice(0, STARTING_PERF_MAX_SAMPLES);
    localStorage.setItem(STARTING_PERF_EVENTS_KEY, JSON.stringify(next));
  } catch {
    // Observability should never block user interactions.
  }
}

function getNavigationTimingSnapshot() {
  const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  if (!navEntry) {
    return {
      navDomContentLoadedMs: null,
      navResponseStartMs: null,
    };
  }

  return {
    navDomContentLoadedMs: roundMoney(navEntry.domContentLoadedEventEnd),
    navResponseStartMs: roundMoney(navEntry.responseStart),
  };
}

// Starting page - Product submission platform with commission tracking
export default function Starting() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentProductIndex, setCurrentProductIndex] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastCommission, setLastCommission] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [taskCatalog, setTaskCatalog] = useState<TaskCatalogItem[]>([]);
  const [vipConfigurations, setVipConfigurations] = useState<VipConfig[]>([]);
  const [rewardsConfig, setRewardsConfig] = useState<RewardsConfig>(defaultRewardsConfig);
  const [taskRuleConfig, setTaskRuleConfig] = useState<TaskCatalogResponse['ruleConfig'] | null>(null);
  const [liveTickerEntries, setLiveTickerEntries] = useState<WinnersTickerEntry[]>(LIVE_TICKER_FALLBACK_ENTRIES);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [today, setToday] = useState(() => new Date().toDateString());
  const connectionToastShownRef = useRef(false);
  const routeEntryTimeRef = useRef(performance.now());
  
  const sessionUsername = getCurrentUsername();
  const username = sessionUsername;
  const serverUrl = RUNTIME_ENVIRONMENT.apiBaseUrl;

  // Pull-to-refresh for mobile PWA
  const { containerRef: pullRef, state: pullState, indicatorStyle: pullIndicatorStyle } = usePullToRefresh<HTMLDivElement>({
    onRefresh: async () => {
      if (username) await fetchUserData();
    },
    enabled: !loading && !submitting,
  });

  // Confetti for celebrations (task completion, etc.)
  const { fireSuccess: fireTaskConfetti, fireCelebration } = useConfetti();

  const activeVipTier = userData
    ? (vipConfigurations.find((tier) => tier.level === userData.vipLevel) ?? null)
    : null;
  const currentVipLevel = Number(userData?.vipLevel ?? 1);
  const vipPriceMin = roundMoney(Number(activeVipTier?.taskPriceMin ?? 0));
  const vipPriceMax = roundMoney(Number(activeVipTier?.taskPriceMax ?? 0));
  const hasVipPriceRange = vipPriceMin > 0 && vipPriceMax > 0 && vipPriceMax >= vipPriceMin;

  const activeTasks = useMemo(() => {
    const allActive = taskCatalog.filter((task) => task.status === 'Active');
    if (allActive.length === 0) {
      return [];
    }

    const tierTagged = (tasks: TaskCatalogItem[]) => tasks.filter((task) => Number(task.vipTier ?? 0) === currentVipLevel);

    if (hasVipPriceRange) {
      const inRange = allActive.filter((task) => {
        const normalizedTaskPrice = roundMoney(Number(task.price ?? 0));
        return normalizedTaskPrice >= vipPriceMin && normalizedTaskPrice <= vipPriceMax;
      });
      const tierTaggedInRange = tierTagged(inRange);
      return tierTaggedInRange.length > 0 ? tierTaggedInRange : inRange;
    }

    const tierTaggedActive = tierTagged(allActive);
    return tierTaggedActive.length > 0 ? tierTaggedActive : allActive;
  }, [taskCatalog, currentVipLevel, vipPriceMin, vipPriceMax, hasVipPriceRange]);
  const currentProduct = activeTasks.length > 0 ? activeTasks[currentProductIndex % activeTasks.length] : null;

  // Auto-advance carousel
  useEffect(() => {
    if (activeTasks.length === 0) {
      return;
    }
    const timer = setInterval(() => {
      setCarouselIndex(i => (i + 1) % activeTasks.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [activeTasks.length]);
  const commissionRate = userData
    ? (activeVipTier?.commission ?? 0.005) * 100
    : 0.5;
  const premiumCommissionRate = commissionRate * 10;
  const estimatedCommission = currentProduct ? currentProduct.price * (commissionRate / 100) : 0;
  const premiumTopUpRequired = Number(userData?.activePremium?.topUpRequired ?? userData?.activePremium?.negativeAmount ?? 0);
  const premiumSubmissionBlocked = Boolean(userData?.activePremium) && premiumTopUpRequired > 0;
  const frozenUpholdAmount = roundMoney(Math.max(
    0,
    Number(userData?.holdAmount) ||
    Number(userData?.activePremium?.configuredUpholdAmount) ||
    Number(userData?.activePremium?.topUpRequired) ||
    Number(userData?.activePremium?.negativeAmount) ||
    0,
  ));
  const frozenCurrentBalanceBeforeFreeze = Number(
    userData?.activePremium?.balanceBeforeAssignment
    ?? userData?.balance
    ?? 0,
  );
  const projectedPremiumProfit = roundMoney(
    Number(userData?.activePremium?.totalBundleValue ?? userData?.activePremium?.premiumProductValue ?? 0)
      * (premiumCommissionRate / 100),
  );
  const earnedPremiumProfit = roundMoney(Math.max(0, Number(userData?.activePremium?.commissionEarned ?? 0)));
  const premiumProfitContributionForDisplay = Number(userData?.activePremium?.commissionEarned ?? 0) > 0
    ? earnedPremiumProfit
    : projectedPremiumProfit;
  const frozenPremiumProfit = earnedPremiumProfit;
  const todayCommissionDisplay = roundMoney(
    Number(userData?.todayCommission ?? 0) + (userData?.isFrozen ? premiumProfitContributionForDisplay : 0),
  );
  const totalAccountBalanceDisplay = userData?.isFrozen
    ? roundMoney(Math.max(0, frozenCurrentBalanceBeforeFreeze + frozenUpholdAmount + premiumProfitContributionForDisplay))
    : roundMoney(Math.max(0, Number(userData?.balance ?? 0)));
  const afterSettlementProjection = userData?.isFrozen
    ? roundMoney(Math.max(0, frozenCurrentBalanceBeforeFreeze + frozenUpholdAmount + premiumProfitContributionForDisplay))
    : roundMoney(Math.max(0, Number(userData?.availableAmount ?? ((userData?.balance ?? 0) - (userData?.holdAmount ?? 0)))));
  const requiredFundsForVip = userData
    ? Number(vipConfigurations.find((tier) => tier.level === userData.vipLevel)?.investment ?? 100)
    : 100;
  const availableFundsForSubmit = roundMoney(Number(userData?.availableAmount ?? ((userData?.balance ?? 0) - (userData?.holdAmount ?? 0))));
  const vipFundingBlocked = Boolean(userData) && availableFundsForSubmit < requiredFundsForVip;
  const isAccountSuspended = Boolean(userData?.isSuspended);
  const noTasksInVipRange = hasVipPriceRange && activeTasks.length === 0 && !loading && userData !== null;
  const taskSetResetRequired = Boolean(userData?.pendingTaskReset);
  const isAllSetsComplete = Boolean(userData && userData.completedTaskSets != null && userData.taskSetCount != null && userData.completedTaskSets >= userData.taskSetCount);
  const completionStorageKey = userData ? `sf_complete_${userData.username}` : null;
  const completionDateStored = completionStorageKey ? localStorage.getItem(completionStorageKey) : null;
  const completionIsToday = completionDateStored === today;
  const showDayCompletionBanner = taskSetResetRequired && isAllSetsComplete && completionIsToday;
  const showCsResetBanner = taskSetResetRequired && !showDayCompletionBanner;
  const activePremiumQueuePosition = userData?.activePremium && Array.isArray(userData?.premiumQueue)
    ? Math.max(1, userData.premiumQueue.findIndex((premium) => premium?.id === userData.activePremium?.id) + 1)
    : 1;
  const activePremiumEncounterLabel = Number.isFinite(Number(userData?.activePremium?.triggerTaskNumber))
    ? `Task #${Number(userData?.activePremium?.triggerTaskNumber)}`
    : 'Admin assigned';
  const premiumDisplayPrice = roundMoney(Number(userData?.activePremium?.totalBundleValue ?? userData?.activePremium?.premiumProductValue ?? 0));
  const isPremiumTaskActive = Boolean(userData?.activePremium) && premiumDisplayPrice > 0;
  const premiumDisplayName = (() => {
    const configuredName = typeof userData?.activePremium?.premiumProductName === 'string'
      ? userData.activePremium.premiumProductName.trim()
      : '';
    if (configuredName) {
      return configuredName;
    }
    const bundledCount = Array.isArray(userData?.activePremium?.bundledProducts)
      ? userData.activePremium.bundledProducts.length
      : 0;
    return bundledCount > 0 ? `Premium Bundle (${bundledCount + 1} tasks)` : 'Premium Product';
  })();
  const displayProduct = isPremiumTaskActive
    ? {
        id: String(userData?.activePremium?.id ?? 'premium-task'),
        merchant: 'Premium Assignment',
        product: premiumDisplayName,
        price: premiumDisplayPrice,
        commission: roundMoney(premiumDisplayPrice * (premiumCommissionRate / 100)),
        status: 'Active' as const,
        image: currentProduct?.image ?? activeTasks[0]?.image ?? '',
        rating: 5,
        productUrl: '',
      }
    : currentProduct;
  const displayCommissionRate = isPremiumTaskActive ? premiumCommissionRate : commissionRate;
  const displayEstimatedCommission = isPremiumTaskActive
    ? roundMoney(premiumDisplayPrice * (premiumCommissionRate / 100))
    : estimatedCommission;
  const displaySetProgress = Math.max(0, Number(userData?.tasksCompletedInSet ?? 0));
  const displaySetRequired = Math.max(1, Number(userData?.tasksPerSet ?? 40));
  const totalSetCount = Math.max(1, Number(userData?.taskSetCount ?? 1));
  const completedSetCount = Math.max(0, Number(userData?.completedTaskSets ?? 0));
  const currentSetComplete = displaySetProgress >= displaySetRequired;
  const inferredCompletedSetCount = currentSetComplete
    ? Math.max(completedSetCount, 1)
    : completedSetCount;

  // Fetch user data on mount
  useEffect(() => {
    if (!sessionUsername) {
      navigate('/login', {
        replace: true,
        state: buildLoginRedirectState(location.pathname, {
          authReason: 'session-expired',
          authMessage: 'Your session ended. Please sign in again to continue using this page.',
        }),
      });
      return;
    }
    fetchUserData();
  }, [location.pathname, navigate, sessionUsername]);

  useEffect(() => {
    if (!sessionUsername) {
      return;
    }

    const pollBonusFeed = async () => {
      try {
        const unseenBonuses = await fetchBonusFeed({ unseenOnly: true, limit: 6 });
        if (unseenBonuses.length === 0) {
          return;
        }

        for (const bonus of unseenBonuses) {
          const assignmentLabel = bonus.assignmentMode === 'automatic'
            ? 'Automatic'
            : (bonus.assignmentMode === 'semi-automatic' ? 'Semi-Automatic' : 'Manual');
          toast.success(`${bonus.label}: +$${bonus.amount.toFixed(2)} (${assignmentLabel})`, {
            description: bonus.description || `Assigned ${new Date(bonus.createdAt).toLocaleString()}`,
            duration: 7000,
          });
        }

        await acknowledgeBonusFeedItems(unseenBonuses.map((bonus) => bonus.id));
      } catch {
        // Bonus feed should never block page usage.
      }
    };

    void pollBonusFeed();
  }, [sessionUsername]);

  useEffect(() => {
    let cancelled = false;

    const syncTicker = async () => {
      try {
        const entries = await fetchWinnersTicker();
        if (!cancelled && entries.length > 0) {
          setLiveTickerEntries(entries);
        }
      } catch {
        if (!cancelled) {
          setLiveTickerEntries(LIVE_TICKER_FALLBACK_ENTRIES);
        }
      }
    };

    void syncTicker();
    let intervalId = window.setInterval(() => {
      void syncTicker();
    }, 60_000);

    // Pause polling when tab is hidden (saves bandwidth/battery on mobile)
    const onVisibilityChange = () => {
      if (document.hidden) {
        window.clearInterval(intervalId);
        intervalId = 0;
      } else if (!intervalId) {
        void syncTicker();
        intervalId = window.setInterval(() => {
          void syncTicker();
        }, 60_000);
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  // Auto-update 'today' at midnight so banner transitions correctly to next day
  useEffect(() => {
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    const t = setTimeout(() => setToday(new Date().toDateString()), midnight.getTime() - Date.now());
    return () => clearTimeout(t);
  }, [today]);

  // Track the calendar date when the user first completes ALL sets for Banner 2
  // Cleared when admin resets (pendingTaskReset goes false)
  useEffect(() => {
    if (!completionStorageKey) return;
    if (taskSetResetRequired && isAllSetsComplete) {
      if (!localStorage.getItem(completionStorageKey)) {
        localStorage.setItem(completionStorageKey, new Date().toDateString());
        // Celebrate all sets complete!
        fireCelebration();
      }
    } else if (!taskSetResetRequired) {
      localStorage.removeItem(completionStorageKey);
    }
  }, [taskSetResetRequired, isAllSetsComplete, completionStorageKey]);

  const fetchStartingFallbackData = async (): Promise<{
    sessionFetchMs: number | null;
    catalogFetchMs: number | null;
    sessionLoadOk: boolean;
    catalogLoadOk: boolean;
  }> => {
    let sessionFetchMs: number | null = null;
    let catalogFetchMs: number | null = null;
    let sessionLoadOk = false;
    let catalogLoadOk = false;

    const sessionStartedAt = performance.now();
    const [sessionResult, catalogResult, vipResult, rewardsResult] = await Promise.allSettled([
      fetchJsonWithRetry<UserData>({
        url: `${serverUrl}/me/financials`,
        init: {
          credentials: 'include',
        },
        timeoutMs: 5000,
        retries: 1,
        retryDelayMs: 200,
        pageTag: 'starting-fallback',
      }),
      fetchJsonWithRetry<any>({
        url: `${serverUrl}/tasks/catalog`,
        init: {
          credentials: 'include',
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        },
        timeoutMs: 5000,
        retries: 1,
        retryDelayMs: 200,
        pageTag: 'starting-fallback',
      }),
      fetchJsonWithRetry<any>({
        url: `${serverUrl}/vip-config`,
        init: {
          credentials: 'include',
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        },
        timeoutMs: 5000,
        retries: 1,
        retryDelayMs: 200,
        pageTag: 'starting-fallback',
      }),
      fetchJsonWithRetry<any>({
        url: `${serverUrl}/rewards-config`,
        init: {
          credentials: 'include',
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        },
        timeoutMs: 5000,
        retries: 1,
        retryDelayMs: 200,
        pageTag: 'starting-fallback',
      }),
    ]);
    sessionFetchMs = roundMoney(performance.now() - sessionStartedAt);

    if (sessionResult.status === 'fulfilled' && sessionResult.value) {
      setUserData(sessionResult.value);
      writeFinancialSummaryCache(username, sessionResult.value);
      sessionLoadOk = true;
    }

    if (catalogResult.status === 'fulfilled') {
      const nextPayload: TaskCatalogResponse = {
        tasks: Array.isArray(catalogResult.value?.tasks) ? catalogResult.value.tasks : [],
        ruleConfig: catalogResult.value?.ruleConfig,
      };
      setTaskCatalog(nextPayload.tasks ?? []);
      setTaskRuleConfig(nextPayload.ruleConfig ?? null);
      writeTaskCatalogCache(nextPayload);
      catalogFetchMs = roundMoney(performance.now() - sessionStartedAt);
      catalogLoadOk = true;
    }

    if (vipResult.status === 'fulfilled' && Array.isArray(vipResult.value?.tiers)) {
      setVipConfigurations(vipResult.value.tiers as VipConfig[]);
    }
    if (rewardsResult.status === 'fulfilled' && rewardsResult.value?.config) {
      setRewardsConfig(rewardsResult.value.config as RewardsConfig);
    }

    if (!sessionLoadOk) {
      throw new Error('Fallback session load failed');
    }

    return {
      sessionFetchMs,
      catalogFetchMs,
      sessionLoadOk,
      catalogLoadOk,
    };
  };

  const fetchUserData = async () => {
    if (!username) {
      return;
    }

    // Declare outside try so it's accessible in catch for stale-while-revalidate
    const cachedUser = readFinancialSummaryCache(username);
    const cachedTaskCatalog = readTaskCatalogCache();
    const hasCachedData = Boolean(cachedUser && cachedTaskCatalog);

    try {
      const fetchStart = performance.now();
      let sessionFetchMs: number | null = null;
      let catalogFetchMs: number | null = null;
      let sessionLoadOk = false;
      let catalogLoadOk = false;

      if (hasCachedData) {
        // Render cached data instantly — no loading spinner
        setUserData(cachedUser!);
        setTaskCatalog(Array.isArray(cachedTaskCatalog!.tasks) ? cachedTaskCatalog!.tasks : []);
        setTaskRuleConfig(cachedTaskCatalog!.ruleConfig ?? null);
        setLoading(false);
        setLoadError(null);
        sessionLoadOk = true;
        catalogLoadOk = true;
      } else {
        setLoading(true);
        setLoadError(null);
        if (cachedTaskCatalog) {
          setTaskCatalog(Array.isArray(cachedTaskCatalog.tasks) ? cachedTaskCatalog.tasks : []);
          setTaskRuleConfig(cachedTaskCatalog.ruleConfig ?? null);
          catalogLoadOk = true;
        }
      }

      const usedCachedCatalog = Boolean(cachedTaskCatalog);

      try {
        // Go directly to V2 snapshot URL — skip the /version waterfall.
        // If V2 fails the catch block falls back to V1 endpoints.
        const v2SnapshotUrl = `${serverUrl}/v2/me/starting-snapshot?includeCatalog=true&includeConfig=true&catalogLimit=50`;

        const snapshotStartedAt = performance.now();
        const snapshot = await fetchJsonWithRetry<any>({
          url: v2SnapshotUrl,
          init: {
            credentials: 'include',
          },
          timeoutMs: 6000,
          retries: 1,
          retryDelayMs: 200,
          pageTag: 'starting',
          featureTag: 'startingSnapshotV2',
          expectedApiVersion: 'v2',
        });
        sessionFetchMs = roundMoney(performance.now() - snapshotStartedAt);

        if (snapshot?.user) {
          setUserData(snapshot.user as UserData);
          writeFinancialSummaryCache(username, snapshot.user as UserData);
          sessionLoadOk = true;
        }

        const nextPayload: TaskCatalogResponse = {
          tasks: Array.isArray(snapshot?.taskCatalog?.tasks) ? snapshot.taskCatalog.tasks : [],
          ruleConfig: snapshot?.taskCatalog?.ruleConfig,
        };
        setTaskCatalog(nextPayload.tasks ?? []);
        setTaskRuleConfig(nextPayload.ruleConfig ?? null);
        writeTaskCatalogCache(nextPayload);
        catalogLoadOk = true;

        if (Array.isArray(snapshot?.vipConfig)) {
          setVipConfigurations(snapshot.vipConfig as VipConfig[]);
        }
        if (snapshot?.rewardsConfig && typeof snapshot.rewardsConfig === 'object') {
          setRewardsConfig(snapshot.rewardsConfig as RewardsConfig);
        }
      } catch (snapshotError) {
        // If the server explicitly rejected our session (401), don't attempt V1 fallback — redirect to login.
        if (isAuthError(snapshotError)) throw snapshotError;
        console.warn('[starting] V2 FAILED — falling back to V1.', snapshotError instanceof Error ? snapshotError.message : snapshotError);
        console.warn('Starting snapshot endpoint unavailable, using legacy fallback.', snapshotError);
        void reportClientCompatibilityEvent({
          event: 'fallback_used',
          feature: 'startingSnapshotV2',
          expectedApiVersion: 'v2',
          reason: 'starting_snapshot_request_failed',
          detail: {
            message: snapshotError instanceof Error ? snapshotError.message : 'unknown',
          },
        });
        const fallback = await fetchStartingFallbackData();
        sessionFetchMs = fallback.sessionFetchMs;
        catalogFetchMs = fallback.catalogFetchMs;
        sessionLoadOk = fallback.sessionLoadOk;
        catalogLoadOk = fallback.catalogLoadOk;
      }

      setLoading(false);

      const fetchPhaseMs = roundMoney(performance.now() - fetchStart);
      const routeToInteractiveMs = roundMoney(performance.now() - routeEntryTimeRef.current);
      const navTiming = getNavigationTimingSnapshot();
      const perfSample: StartingPerfSample = {
        recordedAt: new Date().toISOString(),
        path: location.pathname,
        routeToInteractiveMs,
        fetchPhaseMs,
        sessionFetchMs,
        catalogFetchMs,
        sessionLoadOk,
        catalogLoadOk,
        usedCachedCatalog,
        navDomContentLoadedMs: navTiming.navDomContentLoadedMs,
        navResponseStartMs: navTiming.navResponseStartMs,
      };
      writeStartingPerfSample(perfSample);
      writeStartingPerfEvent(perfSample);
      window.dispatchEvent(new CustomEvent('starting:perf-sample', { detail: perfSample }));
      console.info('[StartingPerf] load sample', perfSample);
    } catch (error) {
      console.error('Error fetching user data:', error);
      if (isAuthError(error)) {
        navigate('/login', {
          replace: true,
          state: buildLoginRedirectState(location.pathname, {
            authReason: 'session-expired',
            authMessage: 'Your session ended. Please sign in again to continue.',
          }),
        });
        return;
      }
      // Only show connection error if we have NO cached data to fall back on
      if (!hasCachedData) {
        setLoadError('Connection is unstable. Please retry loading your data.');
        if (!connectionToastShownRef.current) {
          toast.error('Connection issue detected. Retrying may help.');
          connectionToastShownRef.current = true;
        }
      }
      setLoading(false);
    }
  };

  const handleSubmitTask = async () => {
    if (!userData || submitting || (!displayProduct && !isPremiumTaskActive)) return;

    if (vipFundingBlocked) {
      toast.error(`VIP${userData.vipLevel} requires at least $${requiredFundsForVip.toFixed(2)} available before submitting tasks.`);
      return;
    }

    if (isAccountSuspended) {
      toast.error('Account is suspended. Please contact support.');
      return;
    }

    if (premiumSubmissionBlocked) {
      toast.error(`Premium task requirement pending: -$${premiumTopUpRequired.toFixed(2)} must be topped up before submitting.`);
      return;
    }

    if (taskSetResetRequired) {
      toast.info('Current task set is complete. Please contact support or wait for admin reset before continuing.');
      return;
    }

    if (userData.completedTaskSets >= userData.taskSetCount) {
      toast.info('Task set complete. Please contact customer support to request a reset.');
      return;
    }

    try {
      setSubmitting(true);

      const isSubmittingPremiumTask = isPremiumTaskActive && !premiumSubmissionBlocked;

      const response = await fetch(`${serverUrl}${isSubmittingPremiumTask ? '/me/complete-premium-task' : '/me/submit-task'}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify(
          isSubmittingPremiumTask
            ? {
                productPrice: premiumDisplayPrice,
              }
            : {},
        ),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        if (
          response.status === 409
          && errorPayload?.code === 'premium_task_encountered'
          && errorPayload?.user
        ) {
          setUserData(errorPayload.user);
          return;
        }
        if (
          response.status === 409
          && errorPayload?.code === 'no_task_within_vip_range'
        ) {
          toast.error('No products available in your tier range — the catalog has been refreshed.');
          void fetchUserData();
          return;
        }
        if (
          response.status === 409
          && (errorPayload?.code === 'task_set_reset_required'
            || errorPayload?.code === 'insufficient_vip_funding')
          && errorPayload?.user
        ) {
          setUserData(errorPayload.user);
        }
        if (response.status === 401) {
          navigate('/', { replace: true });
        }
        throw new Error(errorPayload?.error || 'Failed to submit task');
      }

      const result = await response.json();

      if (result?.user) {
        setUserData(result.user);
      } else {
        // Fallback for legacy responses
        setUserData({
          ...userData,
          tasksCompleted: result.tasksCompleted,
          balance: result.balance,
          todayCommission: result.todayCommission,
          luckyBonus: result.luckyBonus,
          isFrozen: result.user?.isFrozen ?? userData.isFrozen,
          holdAmount: result.user?.holdAmount ?? userData.holdAmount,
          activePremium: result.user?.activePremium ?? userData.activePremium,
          premiumQueue: result.user?.premiumQueue ?? userData.premiumQueue,
          taskSetCount: result.taskProgress?.taskSetCount ?? userData.taskSetCount,
          tasksPerSet: result.taskProgress?.tasksPerSet ?? userData.tasksPerSet,
          tasksCompletedInSet: result.taskProgress?.tasksCompletedInSet ?? userData.tasksCompletedInSet,
          completedTaskSets: result.taskProgress?.completedTaskSets ?? userData.completedTaskSets,
          pendingTaskReset: result.taskProgress?.pendingTaskReset ?? userData.pendingTaskReset,
        });
      }
      
      // Show success message
      setLastCommission(result.commission);
      setIsPremium(Boolean(result.isPremium ?? isSubmittingPremiumTask));
      setShowSuccess(true);

      // Fire confetti on successful task submission
      fireTaskConfetti();

      if (username) {
        invalidateSessionCacheByPrefix(buildUserScopedCacheKey('records:', username, 'v2'));
        void fetchJsonWithRetry({
          url: `${serverUrl}/me/records-snapshot?tasksLimit=120&transactionsLimit=120&includeCatalog=true&includeVip=true`,
          init: {
            credentials: 'include',
          },
          timeoutMs: 7000,
          retries: 1,
          retryDelayMs: 250,
          pageTag: 'starting-post-submit-prefetch',
        }).catch(() => {
          // Prefetch is best-effort and should never block submission UX.
        });
      }
      
      // Move to next product
      if (!isSubmittingPremiumTask) {
        setCurrentProductIndex((prev) => prev + 1);
      }
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);

    } catch (error) {
      console.error('Error submitting task:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to submit task');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="size-full flex flex-col bg-[#1a1f2e]">
        <Header onContactClick={() => setIsChatOpen(true)} />
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4" aria-busy="true" aria-label="Loading tasks">
          {/* Stats skeleton */}
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-[#252d42] rounded-xl p-4 animate-pulse">
                <div className="h-3 bg-gray-600/40 rounded w-2/3 mb-3" />
                <div className="h-6 bg-gray-600/40 rounded w-1/2" />
              </div>
            ))}
          </div>
          {/* Task card skeletons */}
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-[#252d42] rounded-xl p-4 animate-pulse">
              <div className="flex gap-3">
                <div className="shrink-0 w-16 h-16 rounded-lg bg-gray-600/40" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-600/40 rounded w-3/4" />
                  <div className="h-3 bg-gray-600/40 rounded w-1/2" />
                  <div className="h-8 bg-gray-600/40 rounded-lg w-full mt-2" />
                </div>
              </div>
            </div>
          ))}
        </div>
        <BottomNavigation />
      </div>
    );
  }

  if (loadError && !userData) {
    return (
      <div className="size-full flex items-center justify-center bg-[#1a1f2e] p-6">
        <div className="max-w-md w-full bg-[#252d42] border border-[#00D9FF]/30 rounded-xl p-6 text-center">
          <p className="text-white font-semibold mb-2">Unable to load starting data</p>
          <p className="text-gray-300 text-sm mb-5">{loadError}</p>
          <button
            type="button"
            onClick={() => {
              void fetchUserData();
            }}
            className="px-5 py-2 rounded-lg bg-[#00D9FF] text-[#1a1f2e] font-semibold hover:opacity-90 transition-opacity"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={pullRef} className="size-full overflow-auto pb-20 bg-[#1a1f2e]">
      {/* Pull-to-refresh indicator */}
      <PullToRefreshIndicator state={pullState} style={pullIndicatorStyle} />

      {/* Header */}
      <Header onContactClick={() => setIsChatOpen(true)} />

      {/* Live Ticker Banner */}
      <LiveTickerBanner entries={liveTickerEntries} />

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        {/* Greeting Section */}
        <div className="sf-morph-1 flex items-center justify-between mb-6">
          <div>
            <p className="text-sm text-gray-400">Hello,</p>
            <h1 className="text-2xl font-bold text-white">{userData?.username || username}</h1>
          </div>
          <Link 
            to="/vip-levels"
            className="flex items-center gap-2 bg-gradient-to-br from-amber-300 via-orange-400 to-yellow-500 text-white px-4 py-2 rounded-full shadow-[0_4px_14px_rgba(251,146,60,0.5)] hover:shadow-[0_6px_20px_rgba(251,146,60,0.7)] hover:scale-105 transition-all cursor-pointer"
          >
            <span className="font-bold">VIP{userData?.vipLevel || 1}</span>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
            </svg>
          </Link>
        </div>

        {/* Product Slideshow */}
        <ProductCarousel tasks={activeTasks} index={carouselIndex} onIndexChange={setCarouselIndex} />

        {/* POST-UNFREEZE: Premium profit credited confirmation */}
        {!userData?.isFrozen && userData?.activePremium && Number(userData.activePremium.commissionEarned ?? 0) > 0 && (
          <div className="bg-green-500/10 border border-green-500/40 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="text-green-400 shrink-0" size={20} />
              <p className="text-green-300 text-sm font-semibold">
                Premium profit of ${Number(userData.activePremium.commissionEarned).toFixed(2)} has been credited.
              </p>
            </div>
          </div>
        )}

        {/* Current Product to Submit */}
        <div className="bg-gradient-to-br from-[#252d42] to-[#1a1f2e] border border-[#00D9FF]/30 rounded-xl mb-6 shadow-xl overflow-hidden">
          {/* Product image + name */}
          <div className="flex items-center gap-4 p-4 bg-white/5">
            <div className="shrink-0 bg-white rounded-lg p-2 w-20 h-20 flex items-center justify-center">
              <img
                src={displayProduct?.image}
                alt={displayProduct?.product || 'Task'}
                loading="lazy"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[#00D9FF] text-xs font-semibold uppercase tracking-wide mb-0.5">{isPremiumTaskActive ? 'Premium Product' : 'Next Product'}</p>
              <h4 className="text-white font-bold text-sm leading-snug line-clamp-2">
                {displayProduct?.product || 'No active task'}
              </h4>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-yellow-400 text-xs">★</span>
                <span className="text-gray-300 text-xs font-medium">{displayProduct?.rating ?? '-'}</span>
                <span className="text-gray-500 text-xs mx-1">·</span>
                <span className="text-gray-400 text-xs">VIP{userData?.vipLevel || 1}</span>
                <span className="text-gray-500 text-xs mx-1">·</span>
                <span className="text-gray-300 text-xs">${displayProduct?.price?.toFixed(2) ?? '0.00'}</span>
              </div>
            </div>
          </div>

          {/* Commission row */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-green-600/80 to-emerald-600/80">
            <div>
              <p className="text-green-100 text-xs">Commission Rate</p>
              <p className="text-white font-bold text-base">{displayCommissionRate}%</p>
            </div>
            <div className="text-right">
              <p className="text-green-100 text-xs">Estimated Profit</p>
              <p className="text-white font-extrabold text-xl">${displayEstimatedCommission.toFixed(2)}</p>
            </div>
          </div>
          <div className="px-4 py-2 bg-emerald-900/35 border-t border-emerald-300/20">
            <p className="text-emerald-100 text-[11px] leading-relaxed">
              {isPremiumTaskActive
                ? `Premium formula: Bundle Value x ${premiumCommissionRate.toFixed(2)}%.`
                : `Regular formula: Product Price x ${commissionRate.toFixed(2)}%.`}
            </p>
          </div>

          {/* Progress + premium hint row */}
          <div className="px-4 py-2.5 flex items-center justify-between gap-3">
            <p className="text-gray-400 text-xs">
              Set <span className="text-white font-semibold">{userData?.tasksCompletedInSet ?? 0}/{userData?.tasksPerSet ?? 0}</span>
              <span className="mx-1.5 text-gray-600">·</span>
              Completed <span className="text-white font-semibold">{userData?.completedTaskSets ?? 0}/{userData?.taskSetCount ?? 0}</span>
            </p>
          </div>

        </div>

        {/* Starting Button */}
        {/* Reset banners are split between intermediate set completion and final all-sets completion */}
        {isAccountSuspended ? (
          <div className="bg-gradient-to-br from-red-700 to-rose-700 border-2 border-red-300 rounded-lg p-6 mb-6 shadow-xl">
            <div className="flex items-center justify-center gap-3 mb-3">
              <Lock className="text-red-100" size={30} />
              <h2 className="text-xl font-bold text-white text-center">ACCOUNT SUSPENDED</h2>
              <Lock className="text-red-100" size={30} />
            </div>
            <p className="text-red-100 text-sm text-center mb-5">
              Task submissions are disabled while this account is suspended. Contact support for assistance.
            </p>
            <button
              onClick={() => setIsChatOpen(true)}
              className="w-full flex items-center justify-center gap-2 bg-white text-[#7a0016] font-bold py-3 rounded-lg hover:bg-red-50 transition-colors text-lg"
            >
              <MessageCircle size={22} />
              Contact Support
            </button>
          </div>
        ) : showDayCompletionBanner ? (
          <div className="animate-[dayComplete_0.6s_ease-out_both] bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-600 border-2 border-emerald-300 rounded-xl p-6 mb-6 shadow-xl shadow-emerald-900/25">
            <div className="flex items-center justify-center gap-3 mb-3">
              <CheckCircle2 className="text-emerald-100 animate-[dayCompleteCheck_0.5s_ease-out_0.3s_both]" size={32} />
              <h2 className="text-xl font-bold text-white text-center animate-[dayCompleteCheck_0.5s_ease-out_0.35s_both]">TODAY'S WORK COMPLETED</h2>
              <CheckCircle2 className="text-emerald-100 animate-[dayCompleteCheck_0.5s_ease-out_0.3s_both]" size={32} />
            </div>
            <p className="text-emerald-50 font-semibold text-center mb-1 animate-[dayCompleteCheck_0.5s_ease-out_0.45s_both]">
              Current set complete: {userData?.tasksCompletedInSet ?? 0} / {userData?.tasksPerSet ?? 0} tasks
            </p>
            <p className="text-white/90 text-sm text-center animate-[dayCompleteCheck_0.5s_ease-out_0.55s_both]">
              You have successfully completed your day's work.
            </p>
          </div>
        ) : showCsResetBanner ? (
          <div className="bg-gradient-to-br from-[#003d99] to-[#0055cc] border-2 border-[#00D9FF] rounded-lg p-6 mb-6 shadow-xl">
            <div className="flex items-center justify-center gap-3 mb-3">
              <CheckCircle2 className="text-[#00D9FF]" size={32} />
              <h2 className="text-xl font-bold text-white text-center">SET PROGRESS COMPLETE</h2>
              <CheckCircle2 className="text-[#00D9FF]" size={32} />
            </div>
            <p className="text-[#00D9FF] font-semibold text-center mb-2">
              Set {Math.min(inferredCompletedSetCount, totalSetCount)} / {totalSetCount} completed
            </p>
            <p className="text-white/80 text-sm text-center mb-5">
              You have completed one set for this cycle. Contact customer support to request a reset and continue with the next set.
            </p>
            <button
              onClick={() => setIsChatOpen(true)}
              className="w-full flex items-center justify-center gap-2 bg-[#00D9FF] text-[#1a1f2e] font-bold py-3 rounded-lg hover:bg-[#00c5e6] transition-colors text-lg"
            >
              <MessageCircle size={22} />
              Contact Support for Reset
            </button>
          </div>
        ) : noTasksInVipRange && !isPremiumTaskActive ? (
          <div className="bg-gradient-to-br from-[#1a0a00] to-[#2d1600] border-2 border-amber-500/60 rounded-xl p-6 mb-6 shadow-xl">
            <div className="flex items-center justify-center gap-3 mb-3">
              <AlertCircle className="text-amber-400" size={32} />
              <h2 className="text-xl font-bold text-white text-center">NO PRODUCTS AVAILABLE</h2>
            </div>
            <p className="text-amber-300 font-semibold text-center mb-1">
              VIP{userData?.vipLevel} range: ${vipPriceMin.toFixed(2)} – ${vipPriceMax.toFixed(2)}
            </p>
            <p className="text-white/70 text-sm text-center mb-5">
              No active products are currently available within your tier price range. Please check back soon or contact support.
            </p>
            <button
              onClick={() => setIsChatOpen(true)}
              className="w-full flex items-center justify-center gap-2 bg-amber-500 text-[#1a0a00] font-bold py-3 rounded-lg hover:bg-amber-400 transition-colors text-lg"
            >
              <MessageCircle size={22} />
              Contact Support
            </button>
          </div>
        ) : (
          <>
            <button
              className={`w-full bg-gradient-to-r from-[#00D9FF] to-[#0099cc] hover:from-[#00c5e6] hover:to-[#0088bb] text-[#08111f] font-bold py-4 rounded-xl mb-6 text-xl transition-all shadow-[0_4px_20px_rgba(0,217,255,0.4)] hover:shadow-[0_6px_28px_rgba(0,217,255,0.6)] hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none ${submitting ? 'animate-pulse' : ''}`}
              onClick={handleSubmitTask}
              disabled={submitting || (!currentProduct && !isPremiumTaskActive) || noTasksInVipRange || premiumSubmissionBlocked || vipFundingBlocked || taskSetResetRequired || isAccountSuspended}
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="animate-spin" size={24} />
                  Submitting...
                </span>
              ) : isAccountSuspended ? (
                'Account Suspended'
              ) : taskSetResetRequired ? (
                'Waiting For Admin Reset'
              ) : vipFundingBlocked ? (
                'Top-up Required Before Start'
              ) : premiumSubmissionBlocked ? (
                'Top-up Required Before Submit'
              ) : (
                `Starting (${displaySetProgress} / ${displaySetRequired})`
              )}
            </button>
            {isPremiumTaskActive && (
              <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl px-4 py-3 mb-6 text-center">
                <p className="text-amber-300 text-sm font-semibold">Contact Customer Service for more information.</p>
              </div>
            )}
          </>
        )}

        {/* Success Notification */}
        {showSuccess && (
          <div className={`mb-6 rounded-2xl border px-5 py-4 text-center ${isPremium ? 'border-amber-500/30 bg-amber-900/20 text-amber-300' : 'border-emerald-500/30 bg-emerald-900/20 text-emerald-300'}`}>
            <p className="text-xs font-semibold uppercase tracking-[0.28em]">
              {isPremium ? 'Premium Assignment Completed' : 'Submission Confirmed'}
            </p>
            <div className="mt-2 text-3xl font-bold">+${lastCommission.toFixed(2)} USD</div>
            <p className="mt-1 text-sm">
              {isPremium ? 'The premium commission has been added to the current cycle.' : 'The task commission has been credited successfully.'}
            </p>
          </div>
        )}

        {/* Commission Panel */}
        <FinancialSummaryPanel
          todayCommission={todayCommissionDisplay}
          isFrozen={Boolean(userData?.isFrozen)}
          availableBalance={availableFundsForSubmit}
          frozenBalance={frozenCurrentBalanceBeforeFreeze}
          holdAmount={Number(userData?.holdAmount ?? 0)}
          frozenUpholdAmount={frozenUpholdAmount}
          totalBalance={totalAccountBalanceDisplay}
          afterSettlement={afterSettlementProjection}
          luckyBonus={userData?.luckyBonus || 0}
          isPremiumActive={isPremiumTaskActive}
          premiumDisplayName={premiumDisplayName}
          premiumCommissionRate={premiumCommissionRate}
          earnedPremiumProfit={earnedPremiumProfit}
          projectedPremiumProfit={projectedPremiumProfit}
        />

        {/* Important Notice */}
        <div className="bg-[#252d42]/80 border border-[#00D9FF]/20 rounded-xl p-6 text-center shadow-lg mb-6 backdrop-blur-sm">
          <h3 className="text-xl font-bold text-white mb-2">Important Notice</h3>
          <p className="text-sm text-gray-300 mb-1">Online Support Hours: 9 AM – 10 PM EST</p>
          <p className="text-sm text-gray-300">Please contact online support for your assistance.</p>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-400 mb-6">
          <p>© 2026 Steadfast Digital, Inc. All rights reserved</p>
        </div>
      </div>

      {/* Live Chat Box */}
      {isChatOpen && (
        <Suspense fallback={null}>
          <LiveChatBox isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
        </Suspense>
      )}

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}