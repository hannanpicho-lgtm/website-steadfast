import { UserCircle, Rocket, CreditCard, Snowflake, Loader2, Lock, AlertTriangle, AlertCircle, DollarSign, ChevronLeft, ChevronRight, CheckCircle2, MessageCircle } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useState, useEffect, useRef, useMemo, lazy, Suspense, type MouseEvent as ReactMouseEvent } from 'react';
import { toast } from 'sonner';
const LiveChatBox = lazy(() => import('../components/LiveChatBox').then(m => ({ default: m.LiveChatBox })));
import { BottomNavigation } from '../components/BottomNavigation';
import { Header } from '../components/Header';
import { publicAnonKey } from '@utils/supabase/info';
import { getCurrentUsername } from '../services/referralSystem';
import { buildLoginRedirectState } from '../services/loginRedirect';
import { type VipConfig } from '../services/vipConfig';
import { type RewardsConfig, defaultRewardsConfig } from '../services/rewardsConfig';
import { acknowledgeBonusFeedItems, fetchBonusFeed } from '../services/bonusFeed';
import { fetchWinnersTicker, type WinnersTickerEntry } from '../services/winnersTicker';
import { fetchJsonWithRetry, invalidateSessionCacheByPrefix } from '../services/networkClient';
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

function getPrimaryLabel(value: string | null | undefined, fallback = 'Product'): string {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim();
  if (!normalized) {
    return fallback;
  }

  return normalized.split(',')[0];
}

/* ─── Reusable financial-card wrapper with tilt + sheen FX ─── */
const FB_BASE = 'relative overflow-hidden rounded-xl border border-white/20 bg-white/12 p-3 backdrop-blur-sm transition-all duration-300 ease-out will-change-transform';
const FB_HOVER = 'hover:border-white/50 hover:shadow-[0_14px_28px_rgba(5,42,107,0.35)]';
const FB_GLOSS = 'before:pointer-events-none before:absolute before:inset-0 before:bg-[linear-gradient(145deg,rgba(255,255,255,0.20)_0%,rgba(255,255,255,0.04)_45%,rgba(4,34,93,0.06)_100%)]';
const FB_RING = 'after:pointer-events-none after:absolute after:inset-[1px] after:rounded-[11px] after:border after:border-white/15 after:transition-all after:duration-300 hover:after:border-white/40';
const FB_SHEEN = 'pointer-events-none absolute inset-y-0 -left-[55%] w-[45%] bg-[linear-gradient(110deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.45)_48%,rgba(255,255,255,0)_100%)] opacity-0';

function fbMouseMove(event: ReactMouseEvent<HTMLDivElement>) {
  if (typeof window === 'undefined' || !window.matchMedia('(pointer: fine)').matches) return;
  const block = event.currentTarget;
  const rect = block.getBoundingClientRect();
  const tiltMultiplier = Number(block.dataset.tiltMult ?? 1);
  const offsetX = event.clientX - rect.left;
  const offsetY = event.clientY - rect.top;
  const rotateY = ((offsetX / rect.width) - 0.5) * (6 * tiltMultiplier);
  const rotateX = (0.5 - (offsetY / rect.height)) * (6 * tiltMultiplier);
  block.style.transform = `perspective(960px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateZ(0)`;
}

function fbMouseLeave(event: ReactMouseEvent<HTMLDivElement>) {
  event.currentTarget.style.transform = 'perspective(960px) rotateX(0deg) rotateY(0deg) translateZ(0)';
}

function fbMouseEnter(event: ReactMouseEvent<HTMLDivElement>) {
  const block = event.currentTarget;
  if (block.dataset.sheenPlayed === 'true') return;
  block.dataset.sheenPlayed = 'true';
  const sheen = block.querySelector<HTMLElement>('[data-financial-sheen]');
  if (!sheen) return;
  sheen.style.transition = 'none';
  sheen.style.transform = 'translateX(-135%)';
  sheen.style.opacity = '0';
  requestAnimationFrame(() => {
    window.setTimeout(() => {
      sheen.style.transition = 'transform 620ms cubic-bezier(0.22, 1, 0.36, 1), opacity 160ms ease';
      sheen.style.opacity = '1';
      sheen.style.transform = 'translateX(235%)';
      window.setTimeout(() => { sheen.style.opacity = '0'; }, 620);
    }, 120);
  });
}

function FinancialBlock({ tiltMult = 1, className = '', children }: { tiltMult?: number; className?: string; children: React.ReactNode }) {
  return (
    <div
      className={`${FB_BASE} ${FB_HOVER} ${FB_GLOSS} ${FB_RING} ${className}`}
      onMouseMove={fbMouseMove}
      onMouseLeave={fbMouseLeave}
      onMouseEnter={fbMouseEnter}
      data-tilt-mult={tiltMult}
    >
      <span data-financial-sheen className={FB_SHEEN} />
      <div className="relative z-[1]">{children}</div>
    </div>
  );
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
  const frozenUpholdAmount = Number(
    userData?.activePremium?.topUpRequired
    ?? userData?.activePremium?.negativeAmount
    ?? userData?.holdAmount
    ?? 0,
  );
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
  const totalAccountBalanceDisplay = roundMoney(Math.max(0, Number(userData?.balance ?? 0)));
  const afterSettlementProjection = userData?.isFrozen
    ? roundMoney(Math.max(0, frozenCurrentBalanceBeforeFreeze + frozenUpholdAmount + earnedPremiumProfit))
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
    const intervalId = window.setInterval(() => {
      void syncTicker();
    }, 60_000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
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
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="animate-spin text-[#00D9FF]" size={28} />
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
    <div className="size-full overflow-auto pb-20 bg-[#1a1f2e]">
      {/* Header */}
      <Header onContactClick={() => setIsChatOpen(true)} />

      {/* Live Ticker Banner */}
      <div className="relative overflow-hidden bg-[linear-gradient(90deg,#04182e_0%,#072240_50%,#04182e_100%)] border-y border-[#00D9FF]/20 py-2.5">
        {/* Edge fade masks */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#04182e] to-transparent z-10" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#04182e] to-transparent z-10" />
        {/* LIVE badge */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex items-center gap-1.5 bg-[#00D9FF]/10 border border-[#00D9FF]/40 rounded-full px-2.5 py-1">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
          <span className="text-[10px] font-bold tracking-widest text-[#00D9FF] uppercase">Live</span>
        </div>
        {/* Scrolling winners */}
        <div className="pl-28 animate-marquee whitespace-nowrap">
          {[...liveTickerEntries, ...liveTickerEntries, ...liveTickerEntries].map((entry, idx) => (
            <span key={`${entry.user}-${idx}`}>
              <span className="mx-3 text-sm font-semibold text-[#00D9FF]">
                {entry.emoji} <span className="text-white">{entry.user}</span> just won <span className="text-[#00D9FF] font-bold">{entry.amount}</span>
              </span>
              <span className="text-[#00D9FF]/30 mx-1">•</span>
            </span>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        {/* Greeting Section */}
        <div className="flex items-center justify-between mb-6">
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
        {activeTasks.length > 0 ? (() => { const slide = activeTasks[carouselIndex % activeTasks.length]; return (
          <div className="bg-white rounded-lg p-4 sm:p-6 mb-6 shadow-sm relative select-none">
            {/* Prev button */}
            <button
              onClick={() => setCarouselIndex(i => (i - 1 + activeTasks.length) % activeTasks.length)}
              className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white backdrop-blur-sm border border-gray-200 rounded-full p-1.5 shadow-md transition-all hover:scale-110"
            >
              <ChevronLeft size={20} className="text-gray-600" />
            </button>

            {/* Slide content */}
            <div className="text-center px-6 sm:px-8">
              <div className="flex items-center justify-center mb-4 h-[180px]">
                <img
                  key={slide.id}
                  src={slide.image}
                  alt={getPrimaryLabel(slide.product)}
                  loading="lazy"
                  className="max-h-[170px] sm:max-h-[180px] max-w-[180px] sm:max-w-[200px] w-full object-contain"
                />
              </div>
                <h3 className="text-base font-semibold mb-2 line-clamp-2">{slide.product}</h3>
              <div className="flex items-center justify-center gap-1 mb-2">
                <span className="text-yellow-500">⭐</span>
                <span className="text-sm font-semibold">{slide.rating}</span>
              </div>
              <p className="text-xl font-bold">Price: {slide.price.toFixed(2)} USD</p>
            </div>

            {/* Next button */}
            <button
              onClick={() => setCarouselIndex(i => (i + 1) % activeTasks.length)}
              className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white backdrop-blur-sm border border-gray-200 rounded-full p-1.5 shadow-md transition-all hover:scale-110"
            >
              <ChevronRight size={20} className="text-gray-600" />
            </button>

            {/* Dot indicators */}
            <div className="flex justify-center gap-2 mt-4">
              {activeTasks.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCarouselIndex(i)}
                  className={`w-2 h-2 rounded-full transition-colors ${i === carouselIndex ? 'bg-gray-700' : 'bg-gray-300'}`}
                />
              ))}
            </div>
          </div>
          ); })() : (
          <div className="bg-white rounded-lg p-6 mb-6 shadow-sm text-center text-gray-500">
            No active tasks are available right now.
          </div>
        )}

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
          <div className="bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-600 border-2 border-emerald-300 rounded-xl p-6 mb-6 shadow-xl shadow-emerald-900/25">
            <div className="flex items-center justify-center gap-3 mb-3">
              <CheckCircle2 className="text-emerald-100" size={32} />
              <h2 className="text-xl font-bold text-white text-center">TODAY'S WORK COMPLETED</h2>
              <CheckCircle2 className="text-emerald-100" size={32} />
            </div>
            <p className="text-emerald-50 font-semibold text-center mb-1">
              Current set complete: {userData?.tasksCompletedInSet ?? 0} / {userData?.tasksPerSet ?? 0} tasks
            </p>
            <p className="text-white/90 text-sm text-center">
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
          <div className={`mb-6 rounded-2xl border px-5 py-4 text-center shadow-sm ${isPremium ? 'border-amber-200 bg-amber-50 text-amber-950' : 'border-emerald-200 bg-emerald-50 text-emerald-950'}`}>
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
        <div className="relative mb-6 overflow-hidden rounded-[22px] bg-[linear-gradient(145deg,#0b72e7_0%,#0d92f4_52%,#19c0ff_100%)] text-white shadow-[0_16px_36px_rgba(6,58,145,0.22)]">
          <div className="absolute inset-x-0 top-0 h-20 bg-white/10 blur-3xl" />
          <div className="relative p-4 md:p-5">
            <div className="mx-auto max-w-md text-center">
              <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/90">
                Financial Summary
              </div>

              <FinancialBlock tiltMult={1.1} className="mt-3 px-4 py-4">
                <Rocket className="mx-auto" size={26} />
                <h3 className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/80">Today's Commission</h3>
                <p className="mt-2 text-3xl font-bold leading-none">{todayCommissionDisplay.toFixed(2)} USD</p>
                <p className="mt-2 text-xs text-white/80">Updated from completed submissions in the current working day.</p>
                {userData?.isFrozen && (
                  <p className="mt-1 text-[11px] text-amber-100/90">Includes premium commission profit shown in settlement details.</p>
                )}
              </FinancialBlock>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <FinancialBlock>
                <div className="flex flex-col items-center text-center gap-2 md:flex-row md:text-left md:gap-3">
                  <div className="rounded-full bg-white/15 p-1.5 shrink-0">
                    <CreditCard size={15} />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                      {userData?.isFrozen ? 'Current Balance' : 'Available Balance'}
                    </p>
                    <p className="mt-1 text-xl font-bold">
                      {(userData?.isFrozen ? Math.max(0, frozenCurrentBalanceBeforeFreeze) : availableFundsForSubmit).toFixed(2)} USD
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-center text-[11px] text-white/75 md:text-left">
                  {userData?.isFrozen ? 'Balance held before premium settlement.' : 'Funds currently available for new submissions.'}
                </p>
              </FinancialBlock>

              <FinancialBlock>
                <div className="flex flex-col items-center text-center gap-2 md:flex-row md:text-left md:gap-3">
                  <div className="rounded-full bg-white/15 p-1.5 shrink-0">
                    <Snowflake size={15} />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">Hold Amount</p>
                    <p className={`mt-1 text-xl font-bold ${userData?.isFrozen ? 'text-[#ffe1e1]' : 'text-white'}`}>
                      {userData?.isFrozen ? '-' : ''}{(userData?.isFrozen ? frozenUpholdAmount : Number(userData?.holdAmount ?? 0)).toFixed(2)} USD
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-center text-[11px] text-white/75 md:text-left">
                  {userData?.isFrozen ? 'Reserved for the premium settlement requirement.' : 'Amount currently reserved from the working balance.'}
                </p>
              </FinancialBlock>
            </div>

            <FinancialBlock tiltMult={1.2} className="mt-3 rounded-[18px] after:rounded-[15px] hover:border-white/60 hover:shadow-[0_20px_34px_rgba(5,42,107,0.46)] before:bg-[linear-gradient(145deg,rgba(255,255,255,0.24)_0%,rgba(255,255,255,0.06)_45%,rgba(4,34,93,0.08)_100%)] hover:after:border-white/45 p-4">
              <p className="text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-white/75">Total Account Balance</p>
              <p className="mt-1.5 text-center text-[1.75rem] font-bold">{totalAccountBalanceDisplay.toFixed(2)} USD</p>
              <p className="mt-1.5 text-center text-[11px] text-white/75">
                {userData?.isFrozen
                  ? 'Includes pre-freeze balance, current hold amount, and earned premium profit.'
                  : 'Reflects the active account balance across the current task cycle.'}
              </p>
            </FinancialBlock>

            {userData?.isFrozen && (
              <div className="mt-3 rounded-[18px] border border-amber-300/30 bg-amber-500/10 p-3">
                <p className="text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-100">Before / Hold / After</p>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <div className="rounded-lg border border-white/15 bg-white/10 p-2 text-center">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-white/70">Before Freeze</p>
                    <p className="mt-1 text-sm font-bold text-white">{Math.max(0, frozenCurrentBalanceBeforeFreeze).toFixed(2)} USD</p>
                  </div>
                  <div className="rounded-lg border border-white/15 bg-white/10 p-2 text-center">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-white/70">Premium Hold</p>
                    <p className="mt-1 text-sm font-bold text-[#ffe1e1]">-{frozenUpholdAmount.toFixed(2)} USD</p>
                  </div>
                  <div className="rounded-lg border border-white/15 bg-white/10 p-2 text-center">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-white/70">After Settlement</p>
                    <p className="mt-1 text-sm font-bold text-[#b8ffd4]">{afterSettlementProjection.toFixed(2)} USD</p>
                  </div>
                </div>
              </div>
            )}

            {isPremiumTaskActive && (
              <FinancialBlock className="mt-3">
                <div className="text-center">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-200/90">Premium Estimated Profit</p>
                  <p className="mt-1 text-xl font-bold text-[#b8ffd4]">
                    {(Number(userData?.activePremium?.commissionEarned ?? 0) > 0 ? earnedPremiumProfit : projectedPremiumProfit).toFixed(2)} USD
                  </p>
                  <p className="mt-1.5 text-[11px] text-white/75">
                    {Number(userData?.activePremium?.commissionEarned ?? 0) > 0
                      ? 'Earned premium commission from completed premium tasks.'
                      : `Projected from ${premiumDisplayName} at ${premiumCommissionRate.toFixed(2)}% rate.`}
                  </p>
                </div>
              </FinancialBlock>
            )}

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <FinancialBlock className="bg-[#083b93]/35 border-white/15 hover:border-white/45 before:bg-[linear-gradient(145deg,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0.03)_45%,rgba(4,34,93,0.10)_100%)] after:border-white/10 hover:after:border-white/30">
                <div className="text-center">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">Lucky Bonus</p>
                  <p className="mt-1 text-xl font-bold">{(userData?.luckyBonus || 0).toFixed(2)} USD</p>
                  <p className="mt-1.5 text-[11px] text-white/75">Bonus value currently carried on the account.</p>
                </div>
              </FinancialBlock>
              <FinancialBlock className="bg-[#083b93]/35 border-white/15 hover:border-white/45 before:bg-[linear-gradient(145deg,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0.03)_45%,rgba(4,34,93,0.10)_100%)] after:border-white/10 hover:after:border-white/30">
                <div className="text-center">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">Working Status</p>
                  <p className="mt-1 text-xl font-bold">{userData?.isFrozen ? 'Settlement Review' : 'Ready To Submit'}</p>
                  <p className="mt-1.5 text-[11px] text-white/75">
                    {userData?.isFrozen ? 'Submission remains paused until the premium requirement is cleared.' : 'The account can continue processing eligible tasks.'}
                  </p>
                </div>
              </FinancialBlock>
            </div>
          </div>
        </div>

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