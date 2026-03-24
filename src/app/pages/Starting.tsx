import { UserCircle, Rocket, CreditCard, Snowflake, Loader2, Lock, AlertTriangle, DollarSign, ChevronLeft, ChevronRight, CheckCircle2, MessageCircle } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { LiveChatBox } from '../components/LiveChatBox';
import { BottomNavigation } from '../components/BottomNavigation';
import { Header } from '../components/Header';
import { projectId, publicAnonKey } from '@utils/supabase/info';
import { getCurrentUsername } from '../services/referralSystem';
import { buildLoginRedirectState } from '../services/loginRedirect';
import { fetchPublicVipConfig, type VipConfig } from '../services/vipConfig';
import { fetchPublicRewardsConfig, type RewardsConfig, defaultRewardsConfig } from '../services/rewardsConfig';
import { fetchFinancialSummary } from '../services/financialReadModel';

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
}

type TaskCatalogResponse = {
  tasks?: TaskCatalogItem[];
  ruleConfig?: {
    premiumEnabled?: boolean;
    premiumTriggerTaskNumber?: number;
    premiumValueMode?: 'multiplier' | 'range';
  };
};

const REQUEST_TIMEOUT_MS = 8000;
const TASK_CATALOG_CACHE_KEY = 'starting:task-catalog:v1';
const TASK_CATALOG_CACHE_TTL_MS = 2 * 60 * 1000;

function roundMoney(value: number): number {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function withRetry<T>(operation: () => Promise<T>, retries = 2, delayMs = 450): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await sleep(delayMs * (attempt + 1));
      }
    }
  }

  throw lastError;
}

async function fetchJsonWithTimeout(url: string, init: RequestInit): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.error ?? 'Request failed');
    }

    return payload;
  } finally {
    clearTimeout(timeoutId);
  }
}

function readTaskCatalogCache(): TaskCatalogResponse | null {
  try {
    const rawValue = sessionStorage.getItem(TASK_CATALOG_CACHE_KEY);
    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as { timestamp?: number; payload?: TaskCatalogResponse };
    if (!parsed || typeof parsed.timestamp !== 'number' || !parsed.payload) {
      return null;
    }

    if (Date.now() - parsed.timestamp > TASK_CATALOG_CACHE_TTL_MS) {
      sessionStorage.removeItem(TASK_CATALOG_CACHE_KEY);
      return null;
    }

    return parsed.payload;
  } catch {
    return null;
  }
}

function writeTaskCatalogCache(payload: TaskCatalogResponse) {
  try {
    sessionStorage.setItem(TASK_CATALOG_CACHE_KEY, JSON.stringify({
      timestamp: Date.now(),
      payload,
    }));
  } catch {
    // Ignore storage errors and continue without cache.
  }
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const connectionToastShownRef = useRef(false);
  
  const sessionUsername = getCurrentUsername();
  const username = sessionUsername;
  const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a1c55d7e`;

  const activeTasks = taskCatalog.filter((task) => task.status === 'Active');
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
    ? (vipConfigurations.find((tier) => tier.level === userData.vipLevel)?.commission ?? 0.005) * 100
    : 0.5;
  const premiumCommissionRate = commissionRate * 10;
  const estimatedCommission = currentProduct ? currentProduct.price * (commissionRate / 100) : 0;
  const premiumTriggerTaskNumber = Number(taskRuleConfig?.premiumTriggerTaskNumber ?? rewardsConfig.productSystem.premiumTriggerTaskNumber ?? 10);
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
  const frozenPremiumProfit = Number(userData?.activePremium?.commissionEarned ?? 0);
  const totalAccountBalanceDisplay = userData?.isFrozen
    ? roundMoney(Math.max(0, frozenCurrentBalanceBeforeFreeze) + frozenUpholdAmount + frozenPremiumProfit)
    : roundMoney(Math.max(0, Number(userData?.balance ?? 0)));
  const requiredFundsForVip = userData
    ? Number(vipConfigurations.find((tier) => tier.level === userData.vipLevel)?.investment ?? 100)
    : 100;
  const availableFundsForSubmit = roundMoney(Number(userData?.availableAmount ?? ((userData?.balance ?? 0) - (userData?.holdAmount ?? 0))));
  const vipFundingBlocked = Boolean(userData) && availableFundsForSubmit < requiredFundsForVip;
  const taskSetResetRequired = Boolean(userData?.pendingTaskReset);
  const nextSubmissionNumber = Number(userData?.tasksCompleted ?? 0) + 1;
  const premiumTriggerIncoming = !premiumSubmissionBlocked
    && Boolean(taskRuleConfig?.premiumEnabled ?? rewardsConfig.productSystem.premiumEnabled)
    && nextSubmissionNumber === premiumTriggerTaskNumber;
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

  const fetchSessionUser = async () => {
    return fetchFinancialSummary();
  };

  const fetchUserData = async () => {
    if (!username) {
      return;
    }

    try {
      setLoading(true);
      setLoadError(null);
      const cachedTaskCatalog = readTaskCatalogCache();
      if (cachedTaskCatalog) {
        setTaskCatalog(Array.isArray(cachedTaskCatalog.tasks) ? cachedTaskCatalog.tasks : []);
        setTaskRuleConfig(cachedTaskCatalog.ruleConfig ?? null);
      }

      const [sessionResult, tasksResult] = await Promise.allSettled([
        withRetry(() => fetchSessionUser(), 2),
        withRetry(() => fetchJsonWithTimeout(`${serverUrl}/tasks/catalog`, {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }), 2),
      ]);

      if (sessionResult.status === 'fulfilled') {
        setUserData(sessionResult.value);
      }

      if (tasksResult.status === 'fulfilled') {
        const nextPayload: TaskCatalogResponse = {
          tasks: Array.isArray(tasksResult.value?.tasks) ? tasksResult.value.tasks : [],
          ruleConfig: tasksResult.value?.ruleConfig,
        };
        setTaskCatalog(nextPayload.tasks ?? []);
        setTaskRuleConfig(nextPayload.ruleConfig ?? null);
        writeTaskCatalogCache(nextPayload);
      }

      if (sessionResult.status !== 'fulfilled' && tasksResult.status !== 'fulfilled') {
        throw new Error('Unable to load user and task data right now.');
      }

      setLoading(false);

      // Load non-critical configs in background so the page becomes usable faster.
      void (async () => {
        const [vipResult, rewardsResult] = await Promise.allSettled([
          withRetry(() => fetchPublicVipConfig(), 2),
          withRetry(() => fetchPublicRewardsConfig(), 2),
        ]);

        if (vipResult.status === 'fulfilled') {
          setVipConfigurations(vipResult.value);
        }

        if (rewardsResult.status === 'fulfilled') {
          setRewardsConfig(rewardsResult.value);
        }
      })();
    } catch (error) {
      console.error('Error fetching user data:', error);
      setLoadError('Connection is unstable. Please retry loading your data.');
      if (!connectionToastShownRef.current) {
        toast.error('Connection issue detected. Retrying may help.');
        connectionToastShownRef.current = true;
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

    if (premiumSubmissionBlocked) {
      toast.error(`Premium task requirement pending: -$${premiumTopUpRequired.toFixed(2)} must be topped up before submitting.`);
      return;
    }

    if (taskSetResetRequired) {
      toast.info('Current task set is complete. Please contact support or wait for admin reset before continuing.');
      return;
    }

    if (userData.tasksCompleted >= userData.tasksLimit) {
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
            : {
                taskId: currentProduct?.id,
                productPrice: currentProduct?.price,
              },
        ),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        if (
          response.status === 409
          && (errorPayload?.code === 'premium_task_encountered'
            || errorPayload?.code === 'task_set_reset_required'
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
      
      if (isSubmittingPremiumTask) {
        const refreshedUser = await fetchSessionUser();
        setUserData(refreshedUser);
      } else {
        // Update user data with new values
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
      <div className="size-full flex items-center justify-center bg-[#1a1f2e]">
        <Loader2 className="animate-spin text-[#00D9FF]" size={48} />
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

      {/* Ticker Banner */}
      <div className="bg-[#00D9FF] text-[#1a1f2e] py-3 px-6 overflow-hidden">
        <div className="animate-marquee whitespace-nowrap font-semibold">
          <span className="mx-8">SleepAre8: user wins 77.00 USD prize in the task</span>
          <span className="mx-8">Fugene55: user wins 15,257.00 USD prize in the task</span>
          <span className="mx-8">jhoman1988: user wins prize in the task</span>
          <span className="mx-8">SleepAre8: user wins 77.00 USD prize in the task</span>
          <span className="mx-8">Fugene55: user wins 15,257.00 USD prize in the task</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-6 py-6">
        {/* Greeting Section */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm text-gray-400">Hello,</p>
            <h1 className="text-2xl font-bold text-white">{userData?.username || username}</h1>
          </div>
          <Link 
            to="/vip-levels"
            className="flex items-center gap-2 bg-gradient-to-r from-orange-400 to-orange-500 text-white px-4 py-2 rounded-full hover:from-orange-500 hover:to-orange-600 transition-all cursor-pointer"
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
              className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 z-10 bg-gray-100 hover:bg-gray-200 rounded-full p-1 transition-colors"
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
              className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 z-10 bg-gray-100 hover:bg-gray-200 rounded-full p-1 transition-colors"
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
                ? `Premium formula: Product Price x ${premiumCommissionRate.toFixed(2)}% (VIP rate x 10).`
                : `Regular formula: Product Price x ${commissionRate.toFixed(2)}% (VIP rate). Premium formula: Product Price x ${premiumCommissionRate.toFixed(2)}% (VIP rate x 10).`}
            </p>
          </div>

          {/* Progress + premium hint row */}
          <div className="px-4 py-2.5 flex items-center justify-between gap-3">
            <p className="text-gray-400 text-xs">
              Set <span className="text-white font-semibold">{userData?.tasksCompletedInSet ?? 0}/{userData?.tasksPerSet ?? 0}</span>
              <span className="mx-1.5 text-gray-600">·</span>
              Completed <span className="text-white font-semibold">{userData?.completedTaskSets ?? 0}/{userData?.taskSetCount ?? 0}</span>
            </p>
            <p className="text-yellow-400 text-xs shrink-0">
              {isPremiumTaskActive ? 'Premium task active' : `Premium at #${premiumTriggerTaskNumber}`}
            </p>
          </div>

          {/* Premium trigger warning — only when near */}
          {premiumTriggerIncoming && (
            <div className="mx-4 mb-3 px-3 py-1.5 bg-red-500/15 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-xs text-center font-semibold">Premium trigger incoming on this submission</p>
            </div>
          )}
        </div>

        {/* Starting Button */}
        {/* Reset Required Banner — shown when the full task set is complete */}
        {taskSetResetRequired ? (
          <div className="bg-gradient-to-br from-yellow-700 to-amber-600 border-2 border-yellow-300 rounded-lg p-6 mb-6 shadow-xl">
            <div className="flex items-center justify-center gap-3 mb-3">
              <AlertTriangle className="text-yellow-200" size={32} />
              <h2 className="text-xl font-bold text-white text-center">TASK SET RESET REQUIRED</h2>
              <AlertTriangle className="text-yellow-200" size={32} />
            </div>
            <p className="text-yellow-100 font-semibold text-center mb-2">
              Current set complete: {userData?.tasksCompletedInSet ?? 0} / {userData?.tasksPerSet ?? 0} tasks
            </p>
            <p className="text-white/90 text-sm text-center mb-5">
              Your current task set is complete. An admin must reset the next set before you can continue with unfinished work.
            </p>
            <button
              onClick={() => setIsChatOpen(true)}
              className="w-full flex items-center justify-center gap-2 bg-white text-[#7a4a00] font-bold py-3 rounded-lg hover:bg-yellow-50 transition-colors text-lg"
            >
              <MessageCircle size={22} />
              Contact Support for Set Reset
            </button>
          </div>
        ) : userData && userData.tasksCompleted >= userData.tasksLimit ? (
          <div className="bg-gradient-to-br from-[#003d99] to-[#0055cc] border-2 border-[#00D9FF] rounded-lg p-6 mb-6 shadow-xl">
            <div className="flex items-center justify-center gap-3 mb-3">
              <CheckCircle2 className="text-[#00D9FF]" size={32} />
              <h2 className="text-xl font-bold text-white text-center">DAILY SET COMPLETE</h2>
              <CheckCircle2 className="text-[#00D9FF]" size={32} />
            </div>
            <p className="text-[#00D9FF] font-semibold text-center mb-2">
              VIP{userData.vipLevel} — {userData.tasksCompleted} / {userData.tasksLimit} tasks completed
            </p>
            <p className="text-white/80 text-sm text-center mb-5">
              You have completed your full task set for this cycle. Contact customer support to request a reset and continue earning commissions.
            </p>
            <button
              onClick={() => setIsChatOpen(true)}
              className="w-full flex items-center justify-center gap-2 bg-[#00D9FF] text-[#1a1f2e] font-bold py-3 rounded-lg hover:bg-[#00c5e6] transition-colors text-lg"
            >
              <MessageCircle size={22} />
              Contact Support for Reset
            </button>
          </div>
        ) : (
          <>
            <button
              className={`w-full bg-[#00D9FF] hover:bg-[#00c5e6] text-[#1a1f2e] font-bold py-4 rounded-lg mb-6 text-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${submitting ? 'animate-pulse' : ''}`}
              onClick={handleSubmitTask}
              disabled={submitting || (!currentProduct && !isPremiumTaskActive) || premiumSubmissionBlocked || vipFundingBlocked || taskSetResetRequired}
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="animate-spin" size={24} />
                  Submitting...
                </span>
              ) : taskSetResetRequired ? (
                'Waiting For Admin Reset'
              ) : vipFundingBlocked ? (
                'Top-up Required Before Start'
              ) : premiumSubmissionBlocked ? (
                'Top-up Required Before Submit'
              ) : (
                `Starting (${userData?.tasksCompleted || 0} / ${userData?.tasksLimit || 40})`
              )}
            </button>
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
        <div className="mb-6 overflow-hidden rounded-2xl border border-[#0f6ea8] bg-[#0b5f94] text-white shadow-lg">
          <div className="px-6 py-7 text-center sm:px-8">
            <Rocket className="mx-auto" size={50} />
            <h3 className="mt-3 text-[1.85rem] font-extrabold leading-none tracking-tight">TODAY'S COMMISSION</h3>
            <p className="mt-3 text-4xl font-bold leading-none">{(userData?.todayCommission || 0).toFixed(2)} USD</p>
            <p className="mt-4 text-sm text-[#dcedf8]">The displayed amount reflects today's earned commissions.</p>
          </div>

          <div className="mx-4 border-t border-white/50" />

          <div className="grid grid-cols-1 gap-4 px-6 py-6 sm:grid-cols-2 sm:gap-8 sm:px-8">
            <div className="text-center">
              <div className="mx-auto inline-flex rounded-xl bg-white/12 p-3">
                <CreditCard size={46} />
              </div>
              <p className="mt-3 text-[2rem] font-extrabold leading-none tracking-tight">BALANCE</p>
              <p className="mt-2 text-4xl font-bold leading-none">{(userData?.isFrozen ? Math.max(0, frozenCurrentBalanceBeforeFreeze) : availableFundsForSubmit).toFixed(2)} USD</p>
              <p className="mt-3 text-sm text-[#dcedf8]">The total balance reflects both the deposited amount and earned commissions.</p>
            </div>

            <div className="text-center">
              <div className="mx-auto inline-flex rounded-xl bg-white/12 p-3">
                <Snowflake size={46} />
              </div>
              <p className="mt-3 text-[2rem] font-extrabold leading-none tracking-tight">Hold Amount</p>
              <p className={`mt-2 text-4xl font-bold leading-none ${userData?.isFrozen ? 'text-[#ffe1e1]' : 'text-white'}`}>
                {userData?.isFrozen ? '-' : ''}{(userData?.isFrozen ? frozenUpholdAmount : Number(userData?.holdAmount ?? 0)).toFixed(2)} USD
              </p>
              <p className="mt-3 text-sm text-[#dcedf8]">Contact Customer Service for more infor</p>
            </div>
          </div>

          <div className="mx-4 border-t border-white/50" />

          <div className="px-6 py-6 text-center sm:px-8">
            <p className="text-[1.95rem] font-extrabold leading-none tracking-tight">Special Lucky Bonus</p>
            <p className="mt-2 text-4xl font-bold leading-none">{(userData?.luckyBonus || 0).toFixed(2)} USD</p>
          </div>
        </div>

        {/* Important Notice */}
        <div className="bg-white rounded-lg p-6 text-center shadow-sm mb-6">
          <h3 className="text-xl font-bold mb-2">Important Notice</h3>
          <p className="text-sm text-gray-700 mb-1">Online Support Hours: 9Am - 10PM EST</p>
          <p className="text-sm text-gray-700">Please contact online support for your assistance</p>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-400 mb-6">
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