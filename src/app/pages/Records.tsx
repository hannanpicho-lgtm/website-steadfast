import { ChevronLeft, Package, Clock, CheckCircle, Loader2, ChevronDown, ChevronUp, Download, Crown, Lock, MessageCircle, Gem } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useBackNavigate } from '../hooks/useBackNavigate';
import { useState, useEffect, useTransition, lazy, Suspense } from 'react';
import { toast } from 'sonner';
const LiveChatBox = lazy(() => import('../components/LiveChatBox').then(m => ({ default: m.LiveChatBox })));
import { BottomNavigation } from '../components/BottomNavigation';
import { Header } from '../components/Header';
import { publicAnonKey } from '@utils/supabase/info';
import { getCurrentUsername } from '../services/referralSystem';
import { buildLoginRedirectState } from '../services/loginRedirect';
import { type VipConfig } from '../services/vipConfig';
import { fetchJsonWithRetry, isAuthError } from '../services/networkClient';
import { buildUserScopedCacheKey, reportClientCompatibilityEvent } from '../services/apiCompatibility';
import { RUNTIME_ENVIRONMENT } from '../services/runtimeEnvironment';

interface UserData {
  username: string;
  vipLevel: number;
  tasksCompleted: number;
  tasksLimit: number;
  activePremium?: {
    id?: string;
    premiumProductName?: string;
    premiumProductValue?: number;
    totalBundleValue?: number;
    status?: string;
    image?: string;
    tasksCompleted?: number;
    totalTasks?: number;
    commissionEarned?: number;
    topUpRequired?: number;
    negativeAmount?: number;
    configuredUpholdAmount?: number;
    balanceBeforeAssignment?: number;
    balanceAfterAssignment?: number;
    assignedAt?: string;
    bundledProducts?: Array<{
      id?: string;
      name?: string;
      price?: number;
      image?: string;
    }>;
  } | null;
}

interface TaskRecord {
  taskId?: string;
  username: string;
  productPrice: number;
  commission: number;
  isPremium: boolean;
  merchant?: string;
  productName?: string;
  image?: string;
  rating?: number;
  productUrl?: string;
  timestamp: string;
  tasksCompleted: number;
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

interface TransactionRecord {
  id: string;
  username: string;
  type: 'Deposit' | 'Withdrawal' | 'Commission';
  amount: number;
  status: 'Pending' | 'Completed' | 'Rejected' | 'Failed';
  date: string;
  method: string;
  txHash: string;
  description: string;
}

type CompletedRecordItem = {
  recordType: 'completed';
  id: string;
  name: string;
  price: number;
  rating: number;
  image: string;
  productUrl: string;
  commission: number;
  isPremium: boolean;
  timestamp: string;
};

type PendingPremiumItem = {
  id: string;
  name: string;
  price: number;
  profitRate: number;
  estimatedProfit: number;
  shareOfBundle: number; // percentage of total bundle value
  image: string;
};

type PendingPremiumRecordItem = {
  recordType: 'pending-premium';
  id: string;
  premiumType: 'single' | 'bundled';
  status: string;
  totalValue: number;
  profitRate: number;
  estimatedProfit: number;
  normalRate: number;
  premiumMultiplier: number;
  tasksCompleted: number;
  totalTasks: number;
  commissionEarned: number;
  topUpRequired: number;
  items: PendingPremiumItem[];
};

type RecordListItem = CompletedRecordItem | PendingPremiumRecordItem;

const RECORDS_REQUEST_TIMEOUT_MS = 5000;
const RECORDS_V2_TIMEOUT_MS = 6000;
const RECORDS_TASKS_LIMIT = 80;
const RECORDS_TRANSACTIONS_LIMIT = 80;
const RECORDS_CATALOG_LIMIT = 80;
const RECORDS_USER_CACHE_TTL_MS = 45 * 1000;
const RECORDS_SNAPSHOT_CACHE_TTL_MS = 60 * 1000;

type RecordsSnapshotResponse = {
  user: UserData;
  tasks: TaskRecord[];
  transactions: TransactionRecord[];
  taskCatalog: TaskCatalogItem[];
  vipConfig: VipConfig[];
  meta?: {
    tasksTotal?: number;
    tasksReturned?: number;
    transactionsTotal?: number;
    transactionsReturned?: number;
  };
};

function RecordSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading records">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-[#141414] border border-white/[0.06] rounded-lg p-4 animate-pulse" style={{ background: '#141414' }}>
          <div className="flex gap-3">
            <div className="shrink-0 w-16 h-16 rounded-lg bg-white/[0.06]" style={{ background: 'rgba(255,255,255,0.06)' }} />
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex justify-between gap-2">
                <div className="h-4 bg-white/[0.06] rounded w-2/3" style={{ background: 'rgba(255,255,255,0.06)' }} />
                <div className="h-5 bg-white/[0.06] rounded-full w-16" style={{ background: 'rgba(255,255,255,0.06)' }} />
              </div>
              <div className="h-3 bg-white/[0.06] rounded w-1/3" style={{ background: 'rgba(255,255,255,0.06)' }} />
              <div className="flex gap-2 mt-3">
                <div className="h-8 bg-white/[0.06] rounded-md flex-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
                <div className="h-8 bg-white/[0.06] rounded-md flex-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
                <div className="h-8 bg-white/[0.06] rounded-md flex-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Records() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'completed'>('all');
  const [isPending, startTransition] = useTransition();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [taskRecords, setTaskRecords] = useState<TaskRecord[]>([]);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [taskCatalog, setTaskCatalog] = useState<TaskCatalogItem[]>([]);
  const [vipConfigurations, setVipConfigurations] = useState<VipConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [visibleCompleted, setVisibleCompleted] = useState(8);
  const [visibleTransactions, setVisibleTransactions] = useState(5);
  const navigate = useNavigate();
  const goBack = useBackNavigate();
  const location = useLocation();

  const sessionUsername = getCurrentUsername();
  const username = sessionUsername;
  const serverUrl = RUNTIME_ENVIRONMENT.apiBaseUrl;
  const hasRenderableData = Boolean(userData)
    || taskRecords.length > 0
    || transactions.length > 0
    || taskCatalog.length > 0;

  useEffect(() => {
    setVisibleCompleted(8);
  }, [activeTab]);

  useEffect(() => {
    if (!sessionUsername) {
      navigate('/login', {
        replace: true,
        state: buildLoginRedirectState(location.pathname, {
          authReason: 'session-expired',
          authMessage: 'Your session ended. Please sign in again to open your records.',
        }),
      });
      return;
    }
    fetchData();
  }, [location.pathname, navigate, sessionUsername]);

  const fetchRecordsSnapshot = async () => {
    // Go directly to V2 snapshot URL — skip the /version waterfall.
    const v2Url = `${serverUrl}/v2/me/records-snapshot?tasksLimit=${RECORDS_TASKS_LIMIT}&transactionsLimit=${RECORDS_TRANSACTIONS_LIMIT}&catalogLimit=${RECORDS_CATALOG_LIMIT}&includeCatalog=true&includeVip=true`;

    return fetchJsonWithRetry<RecordsSnapshotResponse>({
      url: v2Url,
      init: {
        credentials: 'include',
      },
      timeoutMs: RECORDS_V2_TIMEOUT_MS,
      retries: 1,
      retryDelayMs: 200,
      cacheKey: buildUserScopedCacheKey('records:snapshot', username ?? '', 'v2'),
      cacheTtlMs: RECORDS_SNAPSHOT_CACHE_TTL_MS,
      pageTag: 'records',
      featureTag: 'recordsSnapshotV2',
      expectedApiVersion: 'v2',
    });
  };

  const fetchLegacyRecordsSnapshot = async (): Promise<RecordsSnapshotResponse> => {
    const [userResult, tasksResult, transactionsResult, catalogResult, vipResult] = await Promise.allSettled([
      fetchJsonWithRetry<UserData>({
        url: `${serverUrl}/me/financials`,
        init: {
          credentials: 'include',
        },
        timeoutMs: RECORDS_REQUEST_TIMEOUT_MS,
        retries: 1,
        retryDelayMs: 200,
        pageTag: 'records-fallback',
      }),
      fetchJsonWithRetry<TaskRecord[]>({
        url: `${serverUrl}/me/tasks?limit=${RECORDS_TASKS_LIMIT}`,
        init: {
          credentials: 'include',
        },
        timeoutMs: RECORDS_REQUEST_TIMEOUT_MS,
        retries: 1,
        retryDelayMs: 200,
        pageTag: 'records-fallback',
      }),
      fetchJsonWithRetry<TransactionRecord[]>({
        url: `${serverUrl}/me/transactions?limit=${RECORDS_TRANSACTIONS_LIMIT}`,
        init: {
          credentials: 'include',
        },
        timeoutMs: RECORDS_REQUEST_TIMEOUT_MS,
        retries: 1,
        retryDelayMs: 200,
        pageTag: 'records-fallback',
      }),
      fetchJsonWithRetry<any>({
        url: `${serverUrl}/tasks/catalog`,
        init: {
          credentials: 'include',
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        },
        timeoutMs: RECORDS_REQUEST_TIMEOUT_MS,
        retries: 1,
        retryDelayMs: 200,
        pageTag: 'records-fallback',
      }),
      fetchJsonWithRetry<any>({
        url: `${serverUrl}/vip-config`,
        init: {
          credentials: 'include',
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        },
        timeoutMs: RECORDS_REQUEST_TIMEOUT_MS,
        retries: 1,
        retryDelayMs: 200,
        pageTag: 'records-fallback',
      }),
    ]);

    if (userResult.status !== 'fulfilled' || !userResult.value) {
      throw new Error('Failed to load session user');
    }

    return {
      user: userResult.value,
      tasks: tasksResult.status === 'fulfilled' && Array.isArray(tasksResult.value) ? tasksResult.value : [],
      transactions: transactionsResult.status === 'fulfilled' && Array.isArray(transactionsResult.value) ? transactionsResult.value : [],
      taskCatalog: catalogResult.status === 'fulfilled' && Array.isArray(catalogResult.value?.tasks) ? catalogResult.value.tasks : [],
      vipConfig: vipResult.status === 'fulfilled' && Array.isArray(vipResult.value?.tiers) ? vipResult.value.tiers : [],
    };
  };

  const fetchData = async () => {
    if (!username) {
      return;
    }

    // Stale-while-revalidate: if fetchJsonWithRetry has a cache hit,
    // the snapshot resolves instantly. We can skip the spinner in that case.
    const shouldBlockRender = !hasRenderableData;

    try {
      setLoadError(null);
      if (shouldBlockRender) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }

      let snapshot: RecordsSnapshotResponse;
      try {
        snapshot = await fetchRecordsSnapshot();
      } catch (snapshotError) {
        // If the server explicitly rejected our session (401), redirect to login immediately.
        if (isAuthError(snapshotError)) throw snapshotError;
        console.warn('Records snapshot endpoint unavailable, using legacy fallback.', snapshotError);
        void reportClientCompatibilityEvent({
          event: 'fallback_used',
          feature: 'recordsSnapshotV2',
          expectedApiVersion: 'v2',
          reason: 'records_snapshot_request_failed',
          detail: {
            message: snapshotError instanceof Error ? snapshotError.message : 'unknown',
          },
        });
        snapshot = await fetchLegacyRecordsSnapshot();
      }

      setUserData(snapshot?.user ?? null);
      setTaskRecords(Array.isArray(snapshot?.tasks) ? snapshot.tasks : []);
      setTransactions(Array.isArray(snapshot?.transactions) ? snapshot.transactions : []);
      setTaskCatalog(Array.isArray(snapshot?.taskCatalog) ? snapshot.taskCatalog : []);
      setVipConfigurations(Array.isArray(snapshot?.vipConfig) ? snapshot.vipConfig : []);
    } catch (error) {
      console.error('Error fetching data:', error);
      if (isAuthError(error)) {
        navigate('/login', { replace: true, state: buildLoginRedirectState(location.pathname, { authReason: 'session-expired', authMessage: 'Your session ended. Please sign in again to view your records.' }) });
        return;
      }
      if (shouldBlockRender) {
        setLoadError('Failed to refresh records due to network instability.');
        toast.error('Failed to load your records. Please refresh and try again.');
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Get completed products (products that were submitted)
  const activeTasks = taskCatalog.filter((task) => task.status === 'Active');

  // Build lookup maps so every record can resolve its image/name/rating from the catalog
  // even if the server didn't embed those fields on the task record itself.
  const catalogById = new Map(taskCatalog.map((item) => [item.id, item]));
  const catalogByName = new Map(taskCatalog.map((item) => [item.product.toLowerCase().trim(), item]));

  const completedProducts: CompletedRecordItem[] = taskRecords.map((task, index) => {
    const catalogMatch =
      (task.taskId ? catalogById.get(task.taskId) : undefined) ??
      (task.productName ? catalogByName.get(task.productName.toLowerCase().trim()) : undefined);
    return {
      recordType: 'completed',
      id: task.taskId ?? `${task.username}-${index}`,
      name: task.productName ?? catalogMatch?.product ?? 'Task Product',
      price: task.productPrice,
      rating: task.rating ?? catalogMatch?.rating ?? 4,
      image: task.image || catalogMatch?.image || '',
      productUrl: task.productUrl || catalogMatch?.productUrl || '',
      commission: task.commission,
      isPremium: task.isPremium,
      timestamp: task.timestamp,
    };
  });

  const normalRate = ((vipConfigurations.find((tier) => tier.level === (userData?.vipLevel || 1))?.commission) ?? 0.005) * 100;
  const premiumRate = normalRate * 10;

  const pendingPremiumRecords: PendingPremiumRecordItem[] = (() => {
    const activePremium = userData?.activePremium;
    if (!activePremium) {
      return [];
    }

    const bundledProducts = Array.isArray(activePremium.bundledProducts)
      ? activePremium.bundledProducts
      : [];
    const premiumProductValue = Number(activePremium.premiumProductValue ?? 0);
    const totalBundleValue = Number(activePremium.totalBundleValue ?? premiumProductValue ?? 0);
    const primaryValue = premiumProductValue > 0 ? premiumProductValue : totalBundleValue;
    const primaryName = typeof activePremium.premiumProductName === 'string' && activePremium.premiumProductName.trim()
      ? activePremium.premiumProductName.trim()
      : 'Premium Product';

    const items: PendingPremiumItem[] = [
      {
        id: String(activePremium.id ?? 'premium-primary'),
        name: primaryName,
        price: primaryValue,
        profitRate: premiumRate,
        estimatedProfit: primaryValue * (premiumRate / 100),
        shareOfBundle: 0, // computed below
        image: (typeof activePremium.image === 'string' && activePremium.image ? activePremium.image : null)
          ?? catalogByName.get(primaryName.toLowerCase().trim())?.image
          ?? '',
      },
      ...bundledProducts.map((entry, index) => {
        const itemPrice = Number(entry?.price ?? 0);
        return {
          id: String(entry?.id ?? `bundled-${index}`),
          name: typeof entry?.name === 'string' && entry.name.trim() ? entry.name.trim() : `Bundled Product ${index + 1}`,
          price: itemPrice,
          profitRate: premiumRate,
          estimatedProfit: itemPrice * (premiumRate / 100),
          shareOfBundle: 0, // computed below
          image: (typeof entry?.image === 'string' && entry.image ? entry.image : null)
            ?? catalogByName.get((entry?.name ?? '').toLowerCase().trim())?.image
            ?? '',
        };
      }),
    ].filter((entry) => Number.isFinite(entry.price) && entry.price > 0);

    if (items.length === 0) {
      return [];
    }

    const resolvedTotalValue = totalBundleValue > 0
      ? totalBundleValue
      : items.reduce((sum, item) => sum + item.price, 0);

    // Compute each item's share of the total bundle
    for (const item of items) {
      item.shareOfBundle = resolvedTotalValue > 0
        ? Math.round((item.price / resolvedTotalValue) * 100)
        : 0;
    }

    return [{
      recordType: 'pending-premium',
      id: String(activePremium.id ?? 'pending-premium'),
      premiumType: bundledProducts.length > 0 ? 'bundled' : 'single',
      status: typeof activePremium.status === 'string' && activePremium.status ? activePremium.status : 'pending',
      totalValue: resolvedTotalValue,
      profitRate: premiumRate,
      estimatedProfit: resolvedTotalValue * (premiumRate / 100),
      normalRate,
      premiumMultiplier: 10,
      tasksCompleted: Math.max(0, Number(activePremium.tasksCompleted ?? 0)),
      totalTasks: Math.max(1, Number(activePremium.totalTasks ?? items.length)),
      commissionEarned: Math.max(0, Number(activePremium.commissionEarned ?? 0)),
      topUpRequired: Math.max(0, Number(activePremium.topUpRequired ?? activePremium.negativeAmount ?? 0)),
      items,
    }];
  })();

  // Determine which products to show based on active tab
  const getFilteredProducts = (): RecordListItem[] => {
    if (activeTab === 'completed') {
      return completedProducts;
    } else if (activeTab === 'pending') {
      return pendingPremiumRecords;
    } else {
      // All - show both completed and pending
      return [...pendingPremiumRecords, ...completedProducts];
    }
  };

  const filteredProducts = getFilteredProducts();

  const exportCsv = () => {
    const escape = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    // Task records CSV
    const taskHeader = 'Product,Merchant,Price,Commission,Premium,Rating,Date';
    const taskRows = taskRecords.map(t =>
      [escape(t.productName ?? t.merchant), escape(t.merchant), t.productPrice, t.commission, t.isPremium ? 'Yes' : 'No', t.rating ?? '', t.timestamp ? new Date(t.timestamp).toLocaleString() : ''].join(',')
    );
    // Transaction records CSV
    const txHeader = 'Type,Amount,Status,Method,Description,Date';
    const txRows = transactions.map(t =>
      [t.type, t.amount.toFixed(2), t.status, escape(t.method ?? ''), escape(t.description ?? ''), t.date ? new Date(t.date).toLocaleString() : ''].join(',')
    );
    const csv = `Task Records\n${taskHeader}\n${taskRows.join('\n')}\n\nFinancial Activity\n${txHeader}\n${txRows.join('\n')}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `steadfast-records-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Records exported successfully');
  };

  return (
    <div className="size-full overflow-auto pb-20 bg-[#0a0a0a]" style={{ background: '#0a0a0a' }}>
      {/* Header */}
      <Header onContactClick={() => setIsChatOpen(true)} />

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        {/* Back Button and Title */}
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 mb-6">
          <button 
            onClick={goBack} aria-label="Go back"
            className="btn-nav-back justify-self-start"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-xl sm:text-2xl font-bold sf-heading-gradient-cool text-center">Records</h1>
          <button
            onClick={exportCsv}
            disabled={loading || (taskRecords.length === 0 && transactions.length === 0)}
            aria-label="Export records as CSV"
            className="w-9 h-9 flex items-center justify-center rounded-lg text-[#0066b3] hover:bg-white/[0.06] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Download size={18} />
          </button>
        </div>

        {isRefreshing && (
          <div className="mb-4 rounded-lg border border-[#1e3a5f] bg-[#0d1f33] px-3 py-2 text-sm text-[#7ec8e3]">
            Refreshing latest records in the background...
          </div>
        )}

        {loadError && (
          <div className="mb-4 rounded-lg border border-amber-700/40 bg-amber-900/20 px-3 py-3 text-sm text-amber-300 flex items-center justify-between gap-3">
            <span>{loadError}</span>
            <button
              onClick={() => { void fetchData(); }}
              className="shrink-0 rounded-md bg-amber-800/30 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-800/50 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-4 mb-6 sf-stagger-1">
          <button
            onClick={() => startTransition(() => setActiveTab('all'))}
            className={`sf-btn-magnetic min-h-[44px] py-2 sm:py-3 rounded-lg text-sm sm:text-base font-semibold transition-all duration-200 ${
              activeTab === 'all'
                ? 'bg-[#0066b3] text-white shadow-[0_4px_12px_rgba(0,102,179,0.3)]'
                : 'bg-white/[0.06] text-gray-400 hover:bg-white/[0.10]'
            }`}
          >
            All
          </button>
          <button
            onClick={() => startTransition(() => setActiveTab('pending'))}
            className={`sf-btn-magnetic min-h-[44px] py-2 sm:py-3 rounded-lg text-sm sm:text-base font-semibold transition-all duration-200 ${
              activeTab === 'pending'
                ? 'bg-[#0066b3] text-white shadow-[0_4px_12px_rgba(0,102,179,0.3)]'
                : 'bg-white/[0.06] text-gray-400 hover:bg-white/[0.10]'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => startTransition(() => setActiveTab('completed'))}
            className={`sf-btn-magnetic min-h-[44px] py-2 sm:py-3 rounded-lg text-sm sm:text-base font-semibold transition-all duration-200 ${
              activeTab === 'completed'
                ? 'bg-[#0066b3] text-white shadow-[0_4px_12px_rgba(0,102,179,0.3)]'
                : 'bg-white/[0.06] text-gray-400 hover:bg-white/[0.10]'
            }`}
          >
            Completed
          </button>
        </div>

        {/* Records List */}
        <div className="space-y-3">
          {loading && filteredProducts.length === 0 ? (
            <RecordSkeleton />
          ) : filteredProducts.length === 0 ? (
            <div className="bg-[#141414] rounded-lg p-12 text-center">
              <div className="sf-empty-icon mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
              </div>
              <p className="text-lg font-bold text-gray-400 mb-1">No records yet</p>
              <p className="text-sm text-gray-500">
                {activeTab === 'completed' && 'You haven\'t submitted any products yet'}
                {activeTab === 'pending' && 'No pending premium order at the moment.'}
                {activeTab === 'all' && 'No records available'}
              </p>
            </div>
          ) : (
            <>
              {filteredProducts.slice(0, visibleCompleted).map((product, index) => {
                const isCompleted = product.recordType === 'completed';
                const isPremiumPending = product.recordType === 'pending-premium';

              if (isPremiumPending) {
                const primaryItem = product.items[0];
                const bundledItems = product.items.slice(1);
                const progressPercent = product.totalTasks > 0
                  ? Math.round((product.tasksCompleted / product.totalTasks) * 100)
                  : 0;
                const remainingProfit = product.estimatedProfit - product.commissionEarned;
                return (
                  <div
                    key={`${product.id}-${index}`}
                    className="relative overflow-hidden rounded-xl bg-gradient-to-b from-[#1c1500] via-[#141414] to-[#141414] border border-amber-500/30 shadow-[0_4px_32px_rgba(251,191,36,0.07)]"
                  >
                    <style>{`
                      @keyframes premiumFloat {
                        0%, 100% { transform: translateY(0) rotate(0deg); }
                        50% { transform: translateY(-4px) rotate(3deg); }
                      }
                      @keyframes premiumGlow {
                        0%, 100% { opacity: 0.4; }
                        50% { opacity: 1; }
                      }
                    `}</style>
                    {/* Gold accent top bar */}
                    <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-amber-400 to-transparent" />

                    <div className="p-4">
                      {/* Header row */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border border-amber-500/30 text-amber-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest">
                            <Crown size={11} />
                            Premium Order
                          </div>
                          {product.premiumType === 'bundled' && (
                            <span className="text-[11px] font-semibold text-amber-400/60 uppercase tracking-wider">Bundle</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-semibold">
                          <Clock size={11} className="text-amber-500/60" />
                          <span className="text-amber-400/70 capitalize">{product.status.replace(/_/g, ' ')}</span>
                        </div>
                      </div>

                      {/* ── Profit Formula Explainer ── */}
                      <div className="rounded-xl border border-amber-500/15 bg-gradient-to-br from-amber-500/[0.04] to-transparent p-3 mb-4">
                        <p className="text-[10px] font-bold text-amber-400/60 uppercase tracking-widest mb-2.5">How Your Profit Is Calculated</p>
                        <div className="flex items-center justify-center gap-1.5 flex-wrap text-center mb-3">
                          <span className="bg-[#1a1500] border border-amber-500/20 rounded-lg px-2.5 py-1.5">
                            <span className="text-[9px] text-gray-500 block leading-tight">Bundle Value</span>
                            <span className="text-sm font-bold text-white">${product.totalValue.toFixed(2)}</span>
                          </span>
                          <span className="text-amber-400 font-bold text-lg">×</span>
                          <span className="bg-[#1a1500] border border-amber-500/20 rounded-lg px-2.5 py-1.5">
                            <span className="text-[9px] text-gray-500 block leading-tight">Premium Rate</span>
                            <span className="text-sm font-bold text-amber-300">{product.profitRate.toFixed(1)}%</span>
                          </span>
                          <span className="text-amber-400 font-bold text-lg">=</span>
                          <span className="bg-green-500/10 border border-green-500/25 rounded-lg px-2.5 py-1.5">
                            <span className="text-[9px] text-green-400/70 block leading-tight">Total Profit</span>
                            <span className="text-sm font-bold text-green-400">+${product.estimatedProfit.toFixed(2)}</span>
                          </span>
                        </div>
                        {/* Rate multiplier explanation */}
                        <div className="flex items-center justify-center gap-1.5 text-[10px] text-gray-500">
                          <span className="text-gray-400">VIP{userData?.vipLevel || 1} base rate</span>
                          <span className="text-white/60 font-semibold">{product.normalRate.toFixed(1)}%</span>
                          <span className="text-amber-400">×{product.premiumMultiplier}</span>
                          <span className="text-gray-600">→</span>
                          <span className="text-amber-300 font-semibold">{product.profitRate.toFixed(1)}% premium</span>
                        </div>
                      </div>

                      {/* ── Task Progress ── */}
                      <div className="rounded-xl border border-white/[0.06] bg-[#111] p-3 mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Submission Progress</p>
                          <span className="text-xs font-bold text-amber-300">{product.tasksCompleted}/{product.totalTasks} tasks</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-[#1a1a1a] border border-white/[0.04] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-500"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[10px] text-gray-500">{progressPercent}% complete</span>
                          {product.commissionEarned > 0 && (
                            <span className="text-[10px] text-green-400 font-semibold">Earned so far: +${product.commissionEarned.toFixed(2)}</span>
                          )}
                        </div>
                      </div>

                      {/* ── All Items with per-item profit breakdown ── */}
                      <div className="space-y-2 mb-4">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                          {product.premiumType === 'bundled'
                            ? `Product Breakdown (${product.items.length} items)`
                            : 'Product Details'}
                        </p>
                        {product.items.map((item, itemIndex) => {
                          const isPrimary = itemIndex === 0;
                          return (
                            <div
                              key={`${item.id}-${itemIndex}`}
                              className={`rounded-xl overflow-hidden border ${isPrimary ? 'border-amber-500/25 bg-[#1a1500]/40' : 'border-white/[0.06] bg-[#111]'}`}
                            >
                              <div className="flex items-stretch">
                                {/* Image */}
                                <div className={`shrink-0 w-20 flex items-center justify-center p-2 relative ${isPrimary ? 'bg-gradient-to-br from-[#231b00] to-[#141414]' : 'bg-[#0e0e0e]'} border-r ${isPrimary ? 'border-amber-500/15' : 'border-white/[0.04]'}`}>
                                  {item.image ? (
                                    <>
                                      <img src={item.image} alt={item.name} className="w-full h-full object-contain max-h-16 relative z-[1]" loading="lazy" decoding="async" />
                                      {isPrimary && <div className="absolute inset-0 rounded-lg" style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.12) 0%, transparent 70%)', animation: 'premiumGlow 2.5s ease-in-out infinite' }} />}
                                    </>
                                  ) : (
                                    <div className="relative flex items-center justify-center">
                                      <Gem size={28} className={isPrimary ? 'text-amber-400' : 'text-gray-500'} style={isPrimary ? { animation: 'premiumFloat 3s ease-in-out infinite', filter: 'drop-shadow(0 0 8px rgba(251,191,36,0.4))' } : undefined} />
                                      {isPrimary && <div className="absolute inset-0 -m-3 rounded-full" style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.15) 0%, transparent 70%)', animation: 'premiumGlow 2.5s ease-in-out infinite' }} />}
                                    </div>
                                  )}
                                </div>
                                {/* Details */}
                                <div className="flex-1 min-w-0 p-3">
                                  <div className="flex items-start justify-between gap-2 mb-1.5">
                                    <p className={`text-sm font-semibold text-white ${isPrimary ? '' : 'truncate'} leading-snug`}>{item.name}</p>
                                    {isPrimary && (
                                      <span className="shrink-0 text-[9px] font-bold uppercase tracking-widest text-amber-400 border border-amber-500/40 rounded px-1.5 py-0.5 bg-amber-500/10">Primary</span>
                                    )}
                                  </div>
                                  {/* Per-item math: price × rate = profit */}
                                  <div className="flex items-center gap-1 text-xs mt-1 flex-wrap">
                                    <span className="text-gray-400">${item.price.toFixed(2)}</span>
                                    <span className="text-amber-400/60">×</span>
                                    <span className="text-amber-300 font-medium">{item.profitRate.toFixed(1)}%</span>
                                    <span className="text-gray-600">=</span>
                                    <span className="text-green-400 font-bold">+${item.estimatedProfit.toFixed(2)}</span>
                                  </div>
                                  {/* Share bar for bundled */}
                                  {product.premiumType === 'bundled' && (
                                    <div className="mt-2 flex items-center gap-2">
                                      <div className="flex-1 h-1 rounded-full bg-[#1a1a1a] overflow-hidden">
                                        <div
                                          className={`h-full rounded-full ${isPrimary ? 'bg-amber-400/60' : 'bg-white/20'}`}
                                          style={{ width: `${item.shareOfBundle}%` }}
                                        />
                                      </div>
                                      <span className="text-[10px] text-gray-500 tabular-nums">{item.shareOfBundle}%</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* ── Financial Summary Grid ── */}
                      <div className="rounded-xl border border-amber-500/15 bg-gradient-to-br from-amber-500/[0.03] to-transparent p-3 mb-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-[#111] rounded-lg p-2.5 border border-white/[0.04]">
                            <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-0.5">Total Bundle Value</p>
                            <p className="text-base font-bold text-white">${product.totalValue.toFixed(2)}</p>
                          </div>
                          <div className="bg-[#111] rounded-lg p-2.5 border border-white/[0.04]">
                            <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-0.5">Premium Rate</p>
                            <p className="text-base font-bold text-amber-300">{product.profitRate.toFixed(1)}%</p>
                            <p className="text-[9px] text-gray-600 mt-0.5">{product.normalRate.toFixed(1)}% × {product.premiumMultiplier}</p>
                          </div>
                          <div className="bg-[#111] rounded-lg p-2.5 border border-green-500/10">
                            <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-0.5">
                              {product.commissionEarned > 0 ? 'Profit Earned' : 'Projected Profit'}
                            </p>
                            <p className="text-base font-bold text-green-400">
                              +${(product.commissionEarned > 0 ? product.commissionEarned : product.estimatedProfit).toFixed(2)}
                            </p>
                            {product.commissionEarned > 0 && remainingProfit > 0 && (
                              <p className="text-[9px] text-gray-600 mt-0.5">${remainingProfit.toFixed(2)} remaining</p>
                            )}
                          </div>
                          <div className="bg-[#111] rounded-lg p-2.5 border border-white/[0.04]">
                            <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-0.5">Per Task Avg</p>
                            <p className="text-base font-bold text-white">
                              +${(product.totalTasks > 0 ? product.estimatedProfit / product.totalTasks : 0).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* ── ROI Highlight ── */}
                      <div className="flex items-center justify-between rounded-lg bg-green-500/[0.06] border border-green-500/15 px-3 py-2.5 mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-green-500/15 flex items-center justify-center">
                            <span className="text-green-400 font-bold text-xs">%</span>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Total Premium Commission Profit</p>
                            <p className="text-sm font-bold text-green-400">{product.profitRate.toFixed(1)}% profit on ${product.totalValue.toFixed(2)}</p>
                          </div>
                        </div>
                        <p className="text-lg font-black text-green-400">+${product.estimatedProfit.toFixed(2)}</p>
                      </div>

                      {/* Customer service notice */}
                      <div className="flex items-center gap-2 rounded-lg bg-amber-500/5 border border-amber-500/15 px-3 py-2">
                        <MessageCircle size={12} className="shrink-0 text-amber-500/60" />
                        <p className="text-[11px] text-amber-400/60 leading-snug">Please contact Customer Service for more inquiries.</p>
                      </div>
                    </div>
                  </div>
                );
              }
              
              return (
                <div 
                  key={`${product.id}-${index}`}
                  className="bg-[#141414] border border-white/[0.06] rounded-lg p-4 hover:bg-[#1a1a1a] transition-colors"
                >
                  <div className="flex gap-3">
                    {/* Product Image */}
                    <div className="shrink-0 w-20 h-20 rounded-lg bg-gradient-to-br from-[#1a2035] to-[#151b2e] border border-white/[0.06] flex items-center justify-center overflow-hidden shadow-md">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name.split(',')[0]}
                          width={80}
                          height={80}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <Package size={22} className="text-gray-600" />
                      )}
                    </div>

                    {/* Product Content */}
                    <div className="flex-1 min-w-0">
                      {/* Name + status */}
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h3 className="text-sm font-semibold text-white line-clamp-2 leading-snug flex-1">
                          {product.name}
                        </h3>
                        <div className="shrink-0 bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1">
                          <CheckCircle size={10} />
                          Done
                        </div>
                      </div>

                      {/* Rating + price + premium badge */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span key={star} className={`text-xs leading-none ${star <= Math.round(product.rating) ? 'text-yellow-400' : 'text-gray-600'}`}>★</span>
                          ))}
                        </div>
                        <span className="text-xs text-gray-400 font-medium">${product.price.toFixed(2)}</span>
                        {product.isPremium && (
                          <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">10X</span>
                        )}
                      </div>

                      {/* VIP profit formula */}
                      <div className="flex items-center gap-1 text-[11px] mb-2 flex-wrap">
                        <span className="text-gray-400">${product.price.toFixed(2)}</span>
                        <span className="text-cyan-400/60">×</span>
                        <span className="text-cyan-300 font-medium">{normalRate.toFixed(1)}%</span>
                        <span className="text-gray-600">=</span>
                        <span className="text-green-400 font-bold">+${product.commission.toFixed(2)}</span>
                        {product.isPremium && (
                          <span className="text-amber-400 text-[10px] font-semibold ml-0.5">(10× premium)</span>
                        )}
                      </div>

                      {/* Commission + datetime */}
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-[11px] text-gray-400 mb-0.5">Commission earned</p>
                          <p className="text-base font-bold text-green-400">+${product.commission.toFixed(2)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] text-gray-400">
                            {new Date(product.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                          <p className="text-[11px] text-gray-400">
                            {new Date(product.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* See More / See Less for product list */}
            {filteredProducts.length > 8 && (
              <div className="pt-1 text-center">
                {visibleCompleted < filteredProducts.length ? (
                  <button
                    onClick={() => setVisibleCompleted(filteredProducts.length)}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0066b3] hover:text-[#0052a3] py-2 px-4 rounded-lg hover:bg-white/[0.06] transition-colors"
                  >
                    <ChevronDown size={16} />
                    See More ({filteredProducts.length - visibleCompleted} more)
                  </button>
                ) : (
                  <button
                    onClick={() => setVisibleCompleted(8)}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-400 hover:text-gray-300 py-2 px-4 rounded-lg hover:bg-white/[0.06] transition-colors"
                  >
                    <ChevronUp size={16} />
                    See Less
                  </button>
                )}
              </div>
            )}
            </>
          )}
        </div>

        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-[#0066b3]">Financial Activity</h2>
            <span className="text-sm text-gray-400">{transactions.length} entries</span>
          </div>

          <div className="space-y-3">
            {loading && transactions.length === 0 ? (
              <div className="bg-[#141414] rounded-lg p-6 flex items-center justify-center gap-2 text-gray-400"><Loader2 size={18} className="animate-spin flex-shrink-0" />Loading transaction history...</div>
            ) : transactions.length === 0 ? (
              <div className="bg-[#141414] rounded-lg p-6 text-center text-gray-400">No financial activity recorded yet.</div>
            ) : (
              <>
                {transactions.slice(0, visibleTransactions).map((transaction) => (
              <div key={transaction.id} className="bg-[#141414] border border-white/[0.06] rounded-lg p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        transaction.type === 'Withdrawal'
                          ? 'bg-orange-500/20 text-orange-300'
                          : transaction.type === 'Deposit'
                            ? 'bg-blue-500/20 text-blue-300'
                            : 'bg-green-500/20 text-green-300'
                      }`}>
                        {transaction.type}
                      </span>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        transaction.status === 'Completed'
                          ? 'bg-green-500/20 text-green-300'
                          : transaction.status === 'Pending'
                            ? 'bg-yellow-500/20 text-yellow-300'
                            : 'bg-red-500/20 text-red-300'
                      }`}>
                        {transaction.status}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-white">{transaction.description || `${transaction.type} via ${transaction.method}`}</p>
                    <p className="text-xs text-gray-500 mt-1">{new Date(transaction.date).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-base font-bold ${transaction.type === 'Withdrawal' ? 'text-orange-400' : 'text-green-400'}`}>
                      {transaction.type === 'Withdrawal' ? '-' : '+'}${transaction.amount.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{transaction.method}</p>
                  </div>
                </div>
              </div>
            ))}

                {/* See More / See Less for transactions */}
                {transactions.length > 5 && (
                  <div className="pt-1 text-center">
                    {visibleTransactions < transactions.length ? (
                      <button
                        onClick={() => setVisibleTransactions(transactions.length)}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0066b3] hover:text-[#0052a3] py-2 px-4 rounded-lg hover:bg-white/[0.06] transition-colors"
                      >
                        <ChevronDown size={16} />
                        See All ({transactions.length - visibleTransactions} more)
                      </button>
                    ) : (
                      <button
                        onClick={() => setVisibleTransactions(5)}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-400 hover:text-gray-300 py-2 px-4 rounded-lg hover:bg-white/[0.06] transition-colors"
                      >
                        <ChevronUp size={16} />
                        Collapse
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Live Chat Box */}
      <Suspense fallback={null}>
        <LiveChatBox isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      </Suspense>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}