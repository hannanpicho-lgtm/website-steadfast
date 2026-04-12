import { ChevronLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { useBackNavigate } from '../hooks/useBackNavigate';
import { useState, useEffect, lazy, Suspense } from 'react';
import { toast } from 'sonner';
const LiveChatBox = lazy(() => import('../components/LiveChatBox').then(m => ({ default: m.LiveChatBox })));
import { BottomNavigation } from '../components/BottomNavigation';
import { Header } from '../components/Header';
import { getCurrentUsername } from '../services/referralSystem';
import { buildLoginRedirectState } from '../services/loginRedirect';
import { fetchJsonWithRetry, isAuthError } from '../services/networkClient';
import { RUNTIME_ENVIRONMENT } from '../services/runtimeEnvironment';

type UserData = {
  balance: number;
  holdAmount: number;
};

type Transaction = {
  id: string;
  type: string;
  amount: number;
  status: string;
  date: string;
  method: string;
  description: string;
};

export default function Deposit() {
  const navigate = useNavigate();
  const goBack = useBackNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'recent' | 'transaction'>('recent');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [loadingTransactions, setLoadingTransactions] = useState(true);

  const username = getCurrentUsername();
  const serverUrl = RUNTIME_ENVIRONMENT.apiBaseUrl;

  useEffect(() => {
    if (!username) {
      navigate('/login', {
        replace: true,
        state: buildLoginRedirectState(location.pathname, {
          authReason: 'session-expired',
          authMessage: 'Your session ended. Please sign in again to view your deposit history.',
        }),
      });
      return;
    }

    const loadBalance = async () => {
      setLoadingBalance(true);
      try {
        const userPayload = await fetchJsonWithRetry<any>({
          url: `${serverUrl}/me/financials`,
          init: { credentials: 'include' },
          timeoutMs: 5000,
          retries: 1,
          retryDelayMs: 200,
          pageTag: 'deposit',
        });
        setUserData({
          balance: Number(userPayload.balance ?? 0),
          holdAmount: Number(userPayload.holdAmount ?? 0),
        });
      } catch (error) {
        if (isAuthError(error)) {
          navigate('/login', { replace: true, state: buildLoginRedirectState(location.pathname, { authReason: 'session-expired', authMessage: 'Your session ended. Please sign in again.' }) });
          return;
        }
        toast.error(error instanceof Error ? error.message : 'Failed to load balance');
      } finally {
        setLoadingBalance(false);
      }
    };

    const loadTransactions = async () => {
      setLoadingTransactions(true);
      try {
        const txPayload = await fetchJsonWithRetry<any>({
          url: `${serverUrl}/me/transactions`,
          init: { credentials: 'include' },
          timeoutMs: 6000,
          retries: 1,
          retryDelayMs: 200,
          pageTag: 'deposit',
        });
        setTransactions(Array.isArray(txPayload) ? txPayload : []);
      } catch {
        // Non-critical — balance still shows
      } finally {
        setLoadingTransactions(false);
      }
    };

    void loadBalance();
    void loadTransactions();
  }, [location.pathname, navigate, username, serverUrl]);

  const handleTopUp = () => {
    toast.info('To make a deposit, please contact support or your account manager.');
  };

  const recentTx = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

  const depositTx = [...transactions]
    .filter((tx) => tx.type === 'Deposit')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const visibleTx = activeTab === 'recent' ? recentTx : depositTx;

  const statusColor = (status: string) => {
    if (status === 'Approved' || status === 'Completed') return 'text-green-400 bg-green-500/10';
    if (status === 'Rejected') return 'text-red-400 bg-red-500/10';
    return 'text-yellow-400 bg-yellow-500/10';
  };

  return (
    <div className="size-full overflow-auto pb-20 bg-[#0a0a0a]">
      {/* Header */}
      <Header onContactClick={() => setIsChatOpen(true)} />

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        {/* Back Button and Title */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={goBack} aria-label="Go back" className="btn-mobile-icon">
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-[#00D9FF] flex-1 text-center mr-10">Deposit</h1>
        </div>

        {loadingBalance ? (
          <div className="bg-[#252d42]/80 border border-white/10 rounded-xl p-6 mb-6 backdrop-blur-sm">
            <div className="h-4 w-28 bg-white/10 rounded shimmer-line mb-4" />
            <div className="h-8 w-40 bg-white/10 rounded shimmer-line mb-3" />
            <div className="h-4 w-32 bg-white/10 rounded shimmer-line" />
          </div>
        ) : (
          <>
            {/* Available Balance Card */}
            <div className="bg-[#252d42]/80 border border-white/10 rounded-xl p-6 mb-6 backdrop-blur-sm sf-stagger-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-[#00D9FF] mb-2">Available Balance</h2>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-white">
                      {(userData?.balance ?? 0).toFixed(2)}
                    </span>
                    <span className="text-lg text-gray-400">USD</span>
                  </div>
                </div>
                <button onClick={handleTopUp} className="btn-mobile-primary">
                  TOP UP
                </button>
              </div>
            </div>

            {/* Total Balance Card */}
            <div className="bg-[#252d42]/80 border border-white/10 rounded-xl p-6 mb-6 backdrop-blur-sm sf-stagger-2">
              <h2 className="text-lg font-semibold text-[#00D9FF] mb-2">Total Balance</h2>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-white">
                  {((userData?.balance ?? 0) + (userData?.holdAmount ?? 0)).toFixed(2)}
                </span>
                <span className="text-lg text-gray-400">USD</span>
              </div>
            </div>

            {/* Activity Tabs */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <button
                onClick={() => setActiveTab('recent')}
                className={`btn-mobile-tab ${
                  activeTab === 'recent'
                    ? 'bg-[#00D9FF] text-[#08111f] shadow-[0_2px_12px_rgba(0,217,255,0.4)]'
                    : 'bg-[#252d42] text-gray-300 hover:bg-[#2f3a52]'
                }`}
              >
                Recent Activity
              </button>
              <button
                onClick={() => setActiveTab('transaction')}
                className={`btn-mobile-tab ${
                  activeTab === 'transaction'
                    ? 'bg-[#00D9FF] text-[#08111f] shadow-[0_2px_12px_rgba(0,217,255,0.4)]'
                    : 'bg-[#252d42] text-gray-300 hover:bg-[#2f3a52]'
                }`}
              >
                Transaction Activity
              </button>
            </div>

            {/* Activity Content */}
            {loadingTransactions ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="bg-[#252d42]/80 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-24 rounded sf-shimmer bg-white/10" />
                      <div className="h-3 w-16 rounded sf-shimmer bg-white/10" />
                    </div>
                    <div className="flex flex-col items-end gap-2 ml-4">
                      <div className="h-4 w-20 rounded sf-shimmer bg-white/10" />
                      <div className="h-3 w-14 rounded sf-shimmer bg-white/10" />
                    </div>
                  </div>
                ))}
              </div>
            ) : visibleTx.length === 0 ? (
              <div className="bg-[#252d42]/80 border border-white/10 rounded-xl p-12 text-center min-h-[200px] flex items-center justify-center">
                <p className="text-gray-400">No transactions found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {visibleTx.map((tx) => (
                  <div key={tx.id} className="bg-[#252d42]/80 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white truncate">{tx.type}</p>
                      {tx.description && (
                        <p className="text-xs text-gray-400 truncate">{tx.description}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(tx.date).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 ml-4">
                      <span className="font-bold text-white">
                        {tx.amount >= 0 ? '+' : ''}
                        {Number(tx.amount).toFixed(2)} USD
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(tx.status)}`}>
                        {tx.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-gray-600 mt-12 mb-24">
          <p>© 2026 Steadfast Digital, Inc. All rights reserved</p>
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