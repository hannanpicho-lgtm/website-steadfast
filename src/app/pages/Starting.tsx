import { UserCircle, Rocket, CreditCard, Snowflake, Loader2, Lock, AlertTriangle, DollarSign, ChevronLeft, ChevronRight, CheckCircle2, MessageCircle } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useState, useEffect } from 'react';
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
  const estimatedCommission = currentProduct ? currentProduct.price * (commissionRate / 100) : 0;
  const premiumTriggerTaskNumber = Number(taskRuleConfig?.premiumTriggerTaskNumber ?? rewardsConfig.productSystem.premiumTriggerTaskNumber ?? 10);
  const premiumTopUpRequired = Number(userData?.activePremium?.topUpRequired ?? userData?.activePremium?.negativeAmount ?? 0);
  const premiumSubmissionBlocked = Boolean(userData?.activePremium) && premiumTopUpRequired > 0;
  const taskSetResetRequired = Boolean(userData?.pendingTaskReset);
  const nextSubmissionNumber = Number(userData?.tasksCompleted ?? 0) + 1;
  const premiumTriggerIncoming = !premiumSubmissionBlocked
    && Boolean(taskRuleConfig?.premiumEnabled ?? rewardsConfig.productSystem.premiumEnabled)
    && nextSubmissionNumber === premiumTriggerTaskNumber;

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

  const fetchUserByName = async (name: string) => {
    return fetchFinancialSummary(name);
  };

  const fetchUserData = async () => {
    if (!username) {
      return;
    }

    try {
      setLoading(true);
      const [data, tasksPayload, vipPayload, rewardsPayload] = await Promise.all([
        fetchUserByName(username),
        fetch(`${serverUrl}/tasks/catalog`, {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }).then(async (response) => {
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(payload?.error ?? 'Failed to fetch tasks');
          }
          return payload;
        }),
        fetchPublicVipConfig(),
        fetchPublicRewardsConfig(),
      ]);

      setUserData(data);
      setTaskCatalog(Array.isArray(tasksPayload?.tasks) ? tasksPayload.tasks : []);
      setTaskRuleConfig(tasksPayload?.ruleConfig ?? null);
      setVipConfigurations(vipPayload);
      setRewardsConfig(rewardsPayload);
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast.error('Failed to load your account data. Please refresh and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitTask = async () => {
    if (!userData || !currentProduct || submitting) return;

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

      const response = await fetch(`${serverUrl}/submit-task`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          username,
          taskId: currentProduct.id,
          productPrice: currentProduct.price,
        }),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        if (response.status === 409 && (errorPayload?.code === 'premium_task_encountered' || errorPayload?.code === 'task_set_reset_required') && errorPayload?.user) {
          setUserData(errorPayload.user);
        }
        throw new Error(errorPayload?.error || 'Failed to submit task');
      }

      const result = await response.json();
      
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
      
      // Show success message
      setLastCommission(result.commission);
      setIsPremium(result.isPremium);
      setShowSuccess(true);
      
      // Move to next product
      setCurrentProductIndex((prev) => prev + 1);
      
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
          <div className="bg-white rounded-lg p-6 mb-6 shadow-sm relative select-none">
            {/* Prev button */}
            <button
              onClick={() => setCarouselIndex(i => (i - 1 + activeTasks.length) % activeTasks.length)}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-gray-100 hover:bg-gray-200 rounded-full p-1 transition-colors"
            >
              <ChevronLeft size={22} className="text-gray-600" />
            </button>

            {/* Slide content */}
            <div className="text-center px-8">
              <div className="flex items-center justify-center mb-4 h-[180px]">
                <img
                  key={slide.id}
                  src={slide.image}
                  alt={getPrimaryLabel(slide.product)}
                  className="max-h-[180px] max-w-[200px] w-full object-contain"
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
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-gray-100 hover:bg-gray-200 rounded-full p-1 transition-colors"
            >
              <ChevronRight size={22} className="text-gray-600" />
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

        {/* FREEZE BANNER - Premium Bundle Assigned */}
        {userData?.isFrozen && userData?.activePremium && (
          <div className="bg-gradient-to-br from-red-600 to-orange-600 border-4 border-yellow-400 rounded-lg p-6 mb-6 shadow-2xl animate-pulse">
            {/* Header */}
            <div className="flex items-center justify-center gap-3 mb-4">
              <Lock className="text-yellow-300" size={32} />
              <h2 className="text-2xl font-bold text-white text-center">🔒 ACCOUNT FROZEN</h2>
              <Lock className="text-yellow-300" size={32} />
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 mb-4">
              <h3 className="text-yellow-300 font-bold text-lg mb-3 text-center">Premium Bundle Assigned</h3>
              
              {/* Premium Product */}
              <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg p-4 mb-3">
                <div className="flex items-center justify-between">
                  <span className="text-white font-semibold">Premium Product:</span>
                  <span className="text-white font-bold text-xl">${userData.activePremium.premiumProductValue.toFixed(2)}</span>
                </div>
              </div>

              {/* Bundled Products */}
              <div className="mb-3">
                <p className="text-white font-semibold mb-2">Bundled Products:</p>
                <div className="space-y-2">
                  {userData.activePremium.bundledProducts.map((product: any, index: number) => (
                    <div key={index} className="flex items-center gap-3 bg-white/20 rounded p-2">
                      <img src={product.image} alt={product.name} className="w-12 h-12 object-contain rounded" />
                      <div className="flex-1">
                        <p className="text-white text-sm font-semibold line-clamp-1">{getPrimaryLabel(product?.name)}</p>
                      </div>
                      <span className="text-white font-bold">${product.price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Details */}
              <div className="border-t border-white/30 pt-3 space-y-2">
                <div className="flex items-center justify-between text-white">
                  <span>Total Bundle Value:</span>
                  <span className="font-bold text-lg">${userData.activePremium.totalBundleValue.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-white">
                  <span>Balance Before:</span>
                  <span className="font-bold">${userData.activePremium.balanceBeforeAssignment.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-yellow-300 text-lg">
                  <span className="font-bold">Current Balance:</span>
                  <span className="font-bold">
                    {userData.balance < 0 ? '-' : ''}${Math.abs(userData.balance).toFixed(2)} 
                    {userData.balance < 0 && ' (NEGATIVE)'}
                  </span>
                </div>
              </div>

              {/* Top-up Warning */}
              {userData.activePremium.negativeAmount > 0 && (
                <div className="bg-red-500 rounded-lg p-3 mt-3">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="text-white" size={20} />
                    <span className="text-white font-bold">Top-up Required:</span>
                  </div>
                  <div className="text-center">
                    <span className="text-white font-bold text-2xl">${userData.activePremium.topUpRequired.toFixed(2)}</span>
                  </div>
                  <Link to="/deposit" className="block mt-2 bg-white text-red-600 font-bold py-2 px-4 rounded text-center hover:bg-gray-100 transition-colors">
                    <DollarSign className="inline mr-1" size={18} />
                    Deposit Now
                  </Link>
                </div>
              )}

              {/* Task Progress */}
              <div className="mt-4 bg-white/20 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-semibold">Complete Tasks to Unlock:</span>
                  <span className="text-yellow-300 font-bold">{userData.activePremium.tasksCompleted} / {userData.activePremium.totalTasks}</span>
                </div>
                <div className="flex gap-1">
                  {Array.from({ length: userData.activePremium.totalTasks }).map((_, index) => (
                    <div 
                      key={index} 
                      className={`flex-1 h-2 rounded ${index < userData.activePremium.tasksCompleted ? 'bg-green-500' : 'bg-white/30'}`}
                    />
                  ))}
                </div>
              </div>

              {/* Commission Earned */}
              <div className="mt-3 text-center">
                <p className="text-white text-sm mb-1">Commission Earned So Far:</p>
                <p className="text-green-300 font-bold text-xl">${userData.activePremium.commissionEarned.toFixed(2)} (VIP{userData.vipLevel} {commissionRate}%)</p>
              </div>

              {/* Queue Info */}
              {userData.premiumQueue && userData.premiumQueue.length > 1 && (
                <div className="mt-3 bg-purple-500/50 rounded p-2 text-center">
                  <p className="text-white text-sm">
                    ⏳ {userData.premiumQueue.length - 1} more premium bundle{userData.premiumQueue.length > 2 ? 's' : ''} in queue
                  </p>
                </div>
              )}
            </div>

            <p className="text-white text-xs text-center italic">
              Account will unlock after completing all bundled tasks or depositing the required top-up amount
            </p>
          </div>
        )}

        {/* Current Product to Submit */}
        <div className="bg-gradient-to-br from-[#252d42] to-[#1a1f2e] border border-[#00D9FF]/30 rounded-lg p-6 mb-6 shadow-xl">
          <h3 className="text-[#00D9FF] font-bold text-lg mb-4 text-center">Next Product to Submit</h3>
          
          <div className="bg-white rounded-lg p-4 mb-4">
            <div className="flex items-center justify-center mb-3">
              <img 
                src={currentProduct?.image} 
                alt={currentProduct?.product || 'Task'} 
                className="max-w-[150px] w-full object-contain"
              />
            </div>
            <div className="text-center">
              <h4 className="text-sm font-semibold mb-2 line-clamp-2 text-gray-800">
                {currentProduct?.product || 'No active task'}
              </h4>
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="flex items-center gap-1">
                  <span className="text-yellow-500">⭐</span>
                  <span className="text-sm font-semibold text-gray-700">{currentProduct?.rating ?? '-'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Product Details */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-[#1a1f2e] rounded-lg p-4 border border-[#00D9FF]/20">
              <p className="text-gray-400 text-xs mb-1">Product Value</p>
              <p className="text-white font-bold text-lg">${currentProduct?.price.toFixed(2) ?? '0.00'}</p>
            </div>
            <div className="bg-[#1a1f2e] rounded-lg p-4 border border-[#00D9FF]/20">
              <p className="text-gray-400 text-xs mb-1">VIP Level</p>
              <p className="text-white font-bold text-lg">VIP{userData?.vipLevel || 1}</p>
            </div>
          </div>

          {/* Commission Details */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-white font-semibold">Commission Rate:</p>
              <p className="text-white font-bold text-xl">{commissionRate}%</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-white font-semibold">Estimated Profit:</p>
              <p className="text-white font-bold text-2xl">${estimatedCommission.toFixed(2)}</p>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
            <p className="text-yellow-400 text-xs text-center">
              💡 Premium rule: task #{premiumTriggerTaskNumber} triggers premium check ({taskRuleConfig?.premiumValueMode ?? rewardsConfig.productSystem.premiumValueMode}).
            </p>
            <p className="text-white/80 text-xs text-center mt-2">
              Set progress: {userData?.tasksCompletedInSet ?? 0}/{userData?.tasksPerSet ?? 0} in current set, completed sets {userData?.completedTaskSets ?? 0}/{userData?.taskSetCount ?? 0}.
            </p>
            {premiumTriggerIncoming && (
              <p className="text-red-400 text-xs text-center mt-2 font-semibold">
                Premium trigger incoming on this submission.
              </p>
            )}
          </div>
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
            {premiumSubmissionBlocked && (
              <div className="bg-red-500/20 border border-red-400/60 rounded-lg p-4 mb-4">
                <p className="text-red-300 text-sm font-semibold text-center">Premium requirement</p>
                <p className="text-red-200 text-xs text-center mt-1">Required amount (negative):</p>
                <p className="text-red-300 text-3xl font-extrabold text-center mt-1">-${premiumTopUpRequired.toFixed(2)}</p>
                <p className="text-red-100 text-xs text-center mt-2">Task submission is locked until this amount is covered.</p>
              </div>
            )}
            <button
              className={`w-full bg-[#00D9FF] hover:bg-[#00c5e6] text-[#1a1f2e] font-bold py-4 rounded-lg mb-6 text-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${submitting ? 'animate-pulse' : ''}`}
              onClick={handleSubmitTask}
              disabled={submitting || !currentProduct || premiumSubmissionBlocked || taskSetResetRequired}
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="animate-spin" size={24} />
                  Submitting...
                </span>
              ) : taskSetResetRequired ? (
                'Waiting For Admin Reset'
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
          <div className={`mb-6 p-4 rounded-lg text-center font-bold animate-bounce ${isPremium ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white' : 'bg-green-500 text-white'}`}>
            {isPremium ? '🎉 PREMIUM PRODUCT! 10X COMMISSION! 🎉' : '✅ Task Submitted Successfully!'}
            <div className="text-2xl mt-2">+${lastCommission.toFixed(2)} USD</div>
          </div>
        )}

        {/* Commission Panel */}
        <div className="bg-gradient-to-br from-[#00D9FF] to-[#00a8cc] rounded-lg p-6 text-[#1a1f2e] mb-6">
          {/* Today's Commission */}
          <div className="text-center mb-6">
            <Rocket className="mx-auto mb-2" size={40} />
            <h3 className="text-lg font-semibold mb-1">TODAY'S COMMISSION</h3>
            <p className="text-3xl font-bold mb-1">{(userData?.todayCommission || 0).toFixed(2)} USD</p>
            <p className="text-sm opacity-90">The displayed amount reflects today's earned commissions.</p>
          </div>

          <div className="border-t border-[#1a1f2e]/30 my-6"></div>

          {/* Balance and Hold Amount */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="text-center">
              <CreditCard className="mx-auto mb-2" size={32} />
              <h4 className="font-semibold mb-1">BALANCE</h4>
              <p className="text-2xl font-bold mb-1">{(userData?.balance || 0).toFixed(2)} USD</p>
              <p className="text-xs opacity-90">The total balance reflects both the deposited amount and earned commissions.</p>
            </div>
            <div className="text-center">
              <Snowflake className="mx-auto mb-2" size={32} />
              <h4 className="font-semibold mb-1">Hold Amount</h4>
              <p className="text-2xl font-bold mb-1">{(userData?.holdAmount || 0).toFixed(2)} USD</p>
              <p className="text-xs opacity-90">Contact Support for inquiries</p>
            </div>
          </div>

          <div className="border-t border-[#1a1f2e]/30 my-6"></div>

          {/* Special Lucky Bonus */}
          <div className="text-center">
            <h4 className="font-semibold mb-1">Special Lucky Bonus</h4>
            <p className="text-2xl font-bold">{(userData?.luckyBonus || 0).toFixed(2)} USD</p>
          </div>
        </div>

        {/* Important Notice */}
        <div className="bg-white rounded-lg p-6 text-center shadow-sm mb-6">
          <h3 className="text-xl font-bold mb-2">Important Notice</h3>
          <p className="text-sm text-gray-700 mb-1">Online Support Hours: 9:00 - 23:00</p>
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