import { ChevronLeft, Loader2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { BottomNavigation } from '../components/BottomNavigation';
import { Header } from '../components/Header';
import { LiveChatBox } from '../components/LiveChatBox';
import { projectId, publicAnonKey } from '@utils/supabase/info';
import { getCurrentUsername } from '../services/referralSystem';
import { buildLoginRedirectState } from '../services/loginRedirect';

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
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<TabKey>('Reviewing');
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const username = getCurrentUsername();
  const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a1c55d7e`;

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
    fetch(`${serverUrl}/me/withdrawals`, {
      credentials: 'include',
      headers: { Authorization: `Bearer ${publicAnonKey}` },
    })
      .then((r) => r.json().then((d) => ({ ok: r.ok, data: d })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data?.error ?? 'Failed to load withdrawal history');
        setWithdrawals(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : 'Failed to load withdrawal history');
      })
      .finally(() => setLoading(false));
  }, [location.pathname, navigate, serverUrl, username]);

  const filtered = withdrawals.filter((w) => w.status === STATUS_MAP[activeTab]);

  return (
    <div className="size-full overflow-auto pb-20 bg-white">
      <Header onContactClick={() => setIsChatOpen(true)} />

      <div className="max-w-3xl mx-auto px-4 py-5">
        {/* Title row */}
        <div className="relative flex items-center justify-center mb-5">
          <button
            onClick={() => navigate(-1)}
            className="absolute left-0 flex items-center justify-center w-9 h-9 rounded border border-gray-300 bg-white hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft size={20} className="text-gray-700" />
          </button>
          <h1 className="text-2xl font-bold text-[#0066b3]">History</h1>
        </div>

        {/* Tab buttons */}
        <div className="grid grid-cols-3 gap-0 mb-6 rounded-md overflow-hidden border border-gray-200">
          {TABS.map((tab) => {
            const isActive = tab === activeTab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-[#0066b3] text-white'
                    : 'bg-black text-white hover:bg-gray-800'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-[#0066b3]" size={28} />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-16">No more data</p>
        ) : (
          <div className="space-y-3">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="bg-gray-50 rounded-lg border border-gray-200 px-4 py-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Amount</span>
                  <span className="text-sm font-bold text-gray-900">${item.amount.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Status</span>
                  <span
                    className={`text-sm font-semibold ${
                      item.status === 'Approved'
                        ? 'text-green-600'
                        : item.status === 'Rejected'
                        ? 'text-red-600'
                        : 'text-yellow-600'
                    }`}
                  >
                    {item.status === 'Pending' ? 'Reviewing' : item.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Date</span>
                  <span className="text-sm text-gray-700">
                    {new Date(item.requestedDate).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Account</span>
                  <span className="text-sm text-gray-700 text-right max-w-[60%] truncate">
                    {item.walletAddress}
                  </span>
                </div>
                {item.method && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Method</span>
                    <span className="text-sm text-gray-700">{item.method}</span>
                  </div>
                )}
                {item.txHash && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Tx Hash</span>
                    <span className="text-sm text-gray-700 text-right max-w-[60%] truncate font-mono">
                      {item.txHash}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <LiveChatBox isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      <BottomNavigation />
    </div>
  );
}
