import { ChevronLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router';
import { useBackNavigate } from '../hooks/useBackNavigate';
import { useEffect, useState, lazy, Suspense } from 'react';
import { toast } from 'sonner';
import { BottomNavigation } from '../components/BottomNavigation';
import { Header } from '../components/Header';
const LiveChatBox = lazy(() => import('../components/LiveChatBox').then(m => ({ default: m.LiveChatBox })));
import { getCurrentUsername } from '../services/referralSystem';
import { buildLoginRedirectState } from '../services/loginRedirect';
import { fetchJsonWithRetry } from '../services/networkClient';
import { RUNTIME_ENVIRONMENT } from '../services/runtimeEnvironment';

type TabKey = 'Reviewing' | 'Success' | 'Reject';

type WithdrawalRecord = {
  id: string;
  amount: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  requestedDate: string;
  method: string;
  walletAddress: string;
  txHash: string;
};

const TABS: TabKey[] = ['Reviewing', 'Success', 'Reject'];

const STATUS_MAP: Record<TabKey, WithdrawalRecord['status']> = {
  Reviewing: 'Pending',
  Success: 'Approved',
  Reject: 'Rejected',
};

export default function WithdrawalHistory() {
  const navigate = useNavigate();
  const goBack = useBackNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<TabKey>('Reviewing');
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const username = getCurrentUsername();
  const serverUrl = RUNTIME_ENVIRONMENT.apiBaseUrl;

  useEffect(() => {
    if (!username) {
      navigate('/login', {
        replace: true,
        state: buildLoginRedirectState(location.pathname, {
          authReason: 'session-expired',
          authMessage: 'Your session ended. Please sign in again to view withdrawal history.',
        }),
      });
      return;
    }

    setLoading(true);
    fetchJsonWithRetry<WithdrawalRecord[]>({
      url: `${serverUrl}/me/withdrawals`,
      init: { credentials: 'include' },
      timeoutMs: 10000,
      retries: 2,
      retryDelayMs: 300,
      pageTag: 'withdrawal-history',
    })
      .then((data) => {
        setWithdrawals(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : 'Failed to load withdrawal history');
      })
      .finally(() => setLoading(false));
  }, [location.pathname, navigate, serverUrl, username]);

  const filtered = withdrawals.filter((w) => w.status === STATUS_MAP[activeTab]);

  return (
    <div className="flex min-h-screen flex-col overflow-auto pb-20 bg-[#0a0a0a]">
      <Header onContactClick={() => setIsChatOpen(true)} />

      <div className="w-full px-4 py-5 sm:max-w-3xl sm:mx-auto">
        {/* Title row */}
        <div className="relative flex items-center justify-center mb-5">
          <button
            onClick={goBack} aria-label="Go back"
            className="absolute left-0 flex items-center justify-center w-9 h-9 rounded border border-white/[0.06] bg-[#141414] hover:bg-[#1a1a1a] transition-colors"
          >
            <ChevronLeft size={20} className="text-gray-300" />
          </button>
          <h1 className="text-2xl font-bold text-[#0066b3]">History</h1>
        </div>

        {/* Tab buttons */}
        <div className="grid grid-cols-3 gap-0 mb-6 rounded-md overflow-hidden border border-white/[0.06]">
          {TABS.map((tab) => {
            const isActive = tab === activeTab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-[#0066b3] text-white'
                    : 'bg-[#141414] text-gray-400 hover:bg-[#1a1a1a]'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {loading ? (
          <div className="animate-pulse space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-[#141414] rounded-lg border border-white/[0.06] px-4 py-4 space-y-3">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="flex items-center justify-between">
                    <div className="h-3.5 w-16 bg-[#1f2937] rounded" />
                    <div className="h-3.5 w-24 bg-[#1f2937] rounded" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16" />
        ) : (
          <div className="space-y-3">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="bg-[#141414] rounded-lg border border-white/[0.06] px-4 py-4 space-y-2 overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Amount</span>
                  <span className="text-sm font-bold text-white">${item.amount.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Status</span>
                  <span
                    className={`text-sm font-semibold ${
                      item.status === 'Approved'
                        ? 'text-green-400'
                        : item.status === 'Rejected'
                        ? 'text-red-400'
                        : 'text-yellow-400'
                    }`}
                  >
                    {item.status === 'Pending' ? 'Reviewing' : item.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Date</span>
                  <span className="text-sm text-gray-300">
                    {new Date(item.requestedDate).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Account</span>
                  <span className="text-sm text-gray-300 text-right max-w-[60%] truncate">
                    {item.walletAddress}
                  </span>
                </div>
                {item.method && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Method</span>
                    <span className="text-sm text-gray-300">{item.method}</span>
                  </div>
                )}
                {item.txHash && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Tx Hash</span>
                    <span className="text-sm text-gray-300 text-right max-w-[60%] truncate font-mono">
                      {item.txHash}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Suspense fallback={null}>
        <LiveChatBox isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      </Suspense>
      <BottomNavigation />
    </div>
  );
}
