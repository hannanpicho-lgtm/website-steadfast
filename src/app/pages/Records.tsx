import { UserCircle, ChevronLeft, Package, Clock, CheckCircle, Loader2 } from 'lucide-react';
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
    bundledProducts?: Array<{
      id?: string;
      name?: string;
      price?: number;
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
  items: PendingPremiumItem[];
};

type RecordListItem = CompletedRecordItem | PendingPremiumRecordItem;

export default function Records() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'completed'>('all');
  const [userData, setUserData] = useState<UserData | null>(null);
  const [taskRecords, setTaskRecords] = useState<TaskRecord[]>([]);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [taskCatalog, setTaskCatalog] = useState<TaskCatalogItem[]>([]);
  const [vipConfigurations, setVipConfigurations] = useState<VipConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const sessionUsername = getCurrentUsername();
  const username = sessionUsername;
  const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a1c55d7e`;

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

  const fetchUser = async () => {
    const userResponse = await fetch(`${serverUrl}/me/financials`, {
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
      },
    });
    if (!userResponse.ok) {
      throw new Error('Failed to fetch user data');
    }
    return userResponse.json();
  };

  const fetchTasks = async () => {
    const tasksResponse = await fetch(`${serverUrl}/me/tasks`, {
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
      },
    });
    if (!tasksResponse.ok) {
      throw new Error('Failed to fetch tasks');
    }
    return tasksResponse.json();
  };

  const fetchTransactions = async () => {
    const transactionsResponse = await fetch(`${serverUrl}/me/transactions`, {
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
      },
    });
    if (!transactionsResponse.ok) {
      throw new Error('Failed to fetch transactions');
    }
    return transactionsResponse.json();
  };

  const fetchTaskCatalog = async () => {
    const catalogResponse = await fetch(`${serverUrl}/tasks/catalog`, {
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
      },
    });
    if (!catalogResponse.ok) {
      throw new Error('Failed to fetch task catalog');
    }
    return catalogResponse.json();
  };

  const fetchData = async () => {
    if (!username) {
      return;
    }

    try {
      setLoading(true);
      const [user, tasks, transactionHistory, catalog, vipConfig] = await Promise.all([
        fetchUser(),
        fetchTasks(),
        fetchTransactions(),
        fetchTaskCatalog(),
        fetchPublicVipConfig(),
      ]);

      setUserData(user);
      setTaskRecords(tasks);
      setTransactions(Array.isArray(transactionHistory) ? transactionHistory : []);
      setTaskCatalog(Array.isArray(catalog?.tasks) ? catalog.tasks : []);
      setVipConfigurations(vipConfig);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load your records. Please refresh and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Get completed products (products that were submitted)
  const activeTasks = taskCatalog.filter((task) => task.status === 'Active');

  const completedProducts: CompletedRecordItem[] = taskRecords.map((task, index) => {
    const fallbackTask = activeTasks.length > 0 ? activeTasks[index % activeTasks.length] : null;
    return {
      recordType: 'completed',
      id: task.taskId ?? `${task.username}-${index}`,
      name: task.productName ?? fallbackTask?.product ?? 'Task Product',
      price: task.productPrice,
      rating: task.rating ?? fallbackTask?.rating ?? 4,
      image: task.image ?? fallbackTask?.image ?? '',
      productUrl: task.productUrl ?? fallbackTask?.productUrl ?? '',
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
        image: typeof activePremium.image === 'string' && activePremium.image ? activePremium.image : (activeTasks[0]?.image ?? ''),
      },
      ...bundledProducts.map((entry, index) => {
        const itemPrice = Number(entry?.price ?? 0);
        return {
          id: String(entry?.id ?? `bundled-${index}`),
          name: typeof entry?.name === 'string' && entry.name.trim() ? entry.name.trim() : `Bundled Product ${index + 1}`,
          price: itemPrice,
          profitRate: premiumRate,
          estimatedProfit: itemPrice * (premiumRate / 100),
          image: typeof entry?.image === 'string' && entry.image ? entry.image : '',
        };
      }),
    ].filter((entry) => Number.isFinite(entry.price) && entry.price > 0);

    if (items.length === 0) {
      return [];
    }

    const resolvedTotalValue = totalBundleValue > 0
      ? totalBundleValue
      : items.reduce((sum, item) => sum + item.price, 0);

    return [{
      recordType: 'pending-premium',
      id: String(activePremium.id ?? 'pending-premium'),
      premiumType: bundledProducts.length > 0 ? 'bundled' : 'single',
      status: typeof activePremium.status === 'string' && activePremium.status ? activePremium.status : 'pending',
      totalValue: resolvedTotalValue,
      profitRate: premiumRate,
      estimatedProfit: resolvedTotalValue * (premiumRate / 100),
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

  return (
    <div className="size-full overflow-auto pb-20 bg-white">
      {/* Header */}
      <Header onContactClick={() => setIsChatOpen(true)} />

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-6 py-6">
        {/* Back Button and Title */}
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 mb-6">
          <button 
            onClick={() => navigate(-1)}
            className="bg-[#0066b3] text-white p-2 rounded hover:bg-[#0052a3] transition-colors justify-self-start"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0066b3] text-center">Records</h1>
          <div className="w-9" aria-hidden="true"></div>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6">
          <button
            onClick={() => setActiveTab('all')}
            className={`py-2 sm:py-3 rounded text-sm sm:text-base font-semibold transition-colors ${
              activeTab === 'all'
                ? 'bg-[#0066b3] text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`py-2 sm:py-3 rounded text-sm sm:text-base font-semibold transition-colors ${
              activeTab === 'pending'
                ? 'bg-[#0066b3] text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`py-2 sm:py-3 rounded text-sm sm:text-base font-semibold transition-colors ${
              activeTab === 'completed'
                ? 'bg-[#0066b3] text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Completed
          </button>
        </div>

        {/* Records List */}
        <div className="space-y-4">
          {loading ? (
            <div className="bg-gray-50 rounded-lg p-12 text-center">
              <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin text-[#0066b3]" />
              <p className="text-xl font-bold text-gray-600 mb-2">Loading...</p>
              <p className="text-gray-500">Fetching your records</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="bg-gray-50 rounded-lg p-12 text-center">
              <div className="text-gray-400 mb-2">
                <svg className="w-16 h-16 mx-auto mb-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                </svg>
              </div>
              <p className="text-xl font-bold text-gray-600 mb-2">No more data</p>
              <p className="text-gray-500">
                {activeTab === 'completed' && 'You haven\'t submitted any products yet'}
                {activeTab === 'pending' && 'No pending premium order at the moment.'}
                {activeTab === 'all' && 'No records available'}
              </p>
            </div>
          ) : (
            filteredProducts.map((product, index) => {
              const isCompleted = product.recordType === 'completed';
              const isPremiumPending = product.recordType === 'pending-premium';

              if (isPremiumPending) {
                return (
                  <div
                    key={`${product.id}-${index}`}
                    className="bg-white border border-orange-200 rounded-lg p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                        <Clock size={12} />
                        Pending Premium Order
                      </div>
                      <span className="text-xs font-semibold text-[#0b5f8b] uppercase tracking-wide">
                        {product.premiumType === 'bundled' ? 'Bundled Premium' : 'Single Premium'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                      <div className="bg-[#f6fbff] border border-[#d8ecfa] rounded-md px-3 py-2">
                        <p className="text-[11px] text-gray-500">Pending Value</p>
                        <p className="text-sm font-bold text-gray-900">${product.totalValue.toFixed(2)}</p>
                      </div>
                      <div className="bg-[#f6fbff] border border-[#d8ecfa] rounded-md px-3 py-2">
                        <p className="text-[11px] text-gray-500">Premium Profit %</p>
                        <p className="text-sm font-bold text-[#0b5f8b]">{product.profitRate.toFixed(2)}%</p>
                      </div>
                      <div className="bg-[#f6fbff] border border-[#d8ecfa] rounded-md px-3 py-2">
                        <p className="text-[11px] text-gray-500">Estimated Profit</p>
                        <p className="text-sm font-bold text-green-600">+${product.estimatedProfit.toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Premium Product Items</p>
                      {product.items.map((item, itemIndex) => (
                        <div key={`${item.id}-${itemIndex}`} className="border border-gray-200 rounded-md p-3">
                          <div className="flex items-center gap-3">
                            {item.image ? (
                              <div className="shrink-0 bg-gray-100 rounded-md w-12 h-12 flex items-center justify-center overflow-hidden">
                                <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                              </div>
                            ) : (
                              <div className="shrink-0 bg-gray-100 rounded-md w-12 h-12 flex items-center justify-center text-gray-400">
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                                <span className="text-xs font-semibold text-orange-700 shrink-0">{item.profitRate.toFixed(2)}%</span>
                              </div>
                              <div className="mt-1 flex items-center justify-between text-xs">
                                <span className="text-gray-600">Value: <strong className="text-gray-900">${item.price.toFixed(2)}</strong></span>
                                <span className="text-green-600 font-semibold">Profit: +${item.estimatedProfit.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
              
              return (
                <div 
                  key={`${product.id}-${index}`} 
                  className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex gap-4">
                    {/* Product Image */}
                    <div className="flex-shrink-0">
                      <img 
                        src={product.image} 
                        alt={product.name.split(',')[0]} 
                        className="w-20 h-20 object-contain rounded"
                      />
                    </div>
                    
                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-800 mb-1 line-clamp-2">
                        {product.name}
                      </h3>
                      
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-1">
                          <span className="text-yellow-500 text-sm">⭐</span>
                          <span className="text-xs text-gray-600">{product.rating}</span>
                        </div>
                        <span className="text-xs font-semibold text-gray-800">
                          ${product.price.toFixed(2)}
                        </span>
                      </div>

                      {/* Commission Info */}
                      <div className="space-y-1">
                        {isCompleted && (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500">Commission:</span>
                              <span className="text-sm font-bold text-green-600">
                                +${product.commission.toFixed(2)}
                              </span>
                            </div>
                            {product.isPremium && (
                              <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs px-2 py-1 rounded inline-block">
                                PREMIUM 10X
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex-shrink-0 flex flex-col items-end justify-between">
                      {isCompleted ? (
                        <>
                          <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                            <CheckCircle size={12} />
                            Completed
                          </div>
                          {product.timestamp && (
                            <span className="text-xs text-gray-400 mt-2">
                              {new Date(product.timestamp).toLocaleDateString()}
                            </span>
                          )}
                        </>
                      ) : (
                        <div className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                          <Clock size={12} />
                          Pending
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-[#0066b3]">Financial Activity</h2>
            <span className="text-sm text-gray-500">{transactions.length} entries</span>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-500">Loading transaction history...</div>
            ) : transactions.length === 0 ? (
              <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-500">No financial activity recorded yet.</div>
            ) : transactions.map((transaction) => (
              <div key={transaction.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        transaction.type === 'Withdrawal'
                          ? 'bg-orange-100 text-orange-700'
                          : transaction.type === 'Deposit'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-green-100 text-green-700'
                      }`}>
                        {transaction.type}
                      </span>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        transaction.status === 'Completed'
                          ? 'bg-green-100 text-green-700'
                          : transaction.status === 'Pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                      }`}>
                        {transaction.status}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{transaction.description || `${transaction.type} via ${transaction.method}`}</p>
                    <p className="text-xs text-gray-500 mt-1">{new Date(transaction.date).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-base font-bold ${transaction.type === 'Withdrawal' ? 'text-orange-600' : 'text-green-600'}`}>
                      {transaction.type === 'Withdrawal' ? '-' : '+'}${transaction.amount.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{transaction.method}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live Chat Box */}
      <LiveChatBox isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}