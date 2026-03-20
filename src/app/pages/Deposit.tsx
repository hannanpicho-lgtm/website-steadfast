import { ChevronLeft, Loader2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { LiveChatBox } from '../components/LiveChatBox';
import { BottomNavigation } from '../components/BottomNavigation';
import { Header } from '../components/Header';
import { projectId, publicAnonKey } from '@utils/supabase/info';
import { getCurrentUsername } from '../services/referralSystem';
import { buildLoginRedirectState } from '../services/loginRedirect';

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
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'recent' | 'transaction'>('recent');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const username = getCurrentUsername();
  const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a1c55d7e`;

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

    const load = async () => {
      setLoading(true);
      try {
        const headers = { Authorization: `Bearer ${publicAnonKey}` };

        const [userRes, txRes] = await Promise.all([
          fetch(`${serverUrl}/financials/${username}/summary`, { headers }),
          fetch(`${serverUrl}/transactions/${username}`, { headers }),
        ]);

        const [userPayload, txPayload] = await Promise.all([
          userRes.json().catch(() => ({})),
          txRes.json().catch(() => ([])),
        ]);

        if (!userRes.ok) {
          throw new Error(userPayload?.error ?? 'Failed to load account data');
        }

        setUserData({
          balance: Number(userPayload.balance ?? 0),
          holdAmount: Number(userPayload.holdAmount ?? 0),
        });
        setTransactions(Array.isArray(txPayload) ? txPayload : []);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load deposit data';
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };

    void load();
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
    if (status === 'Approved' || status === 'Completed') return 'text-green-600 bg-green-50';
    if (status === 'Rejected') return 'text-red-600 bg-red-50';
    return 'text-yellow-600 bg-yellow-50';
  };

  return (
    <div className="size-full overflow-auto bg-gray-50">
      {/* Header */}
      <Header onContactClick={() => setIsChatOpen(true)} />

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-6 py-6">
        {/* Back Button and Title */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate(-1)} className="btn-mobile-icon">
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-[#0066b3] flex-1 text-center mr-10">Deposit</h1>
        </div>

        {loading ? (
          <div className="flex justify-center items-center min-h-[300px]">
            <Loader2 size={32} className="animate-spin text-[#0066b3]" />
          </div>
        ) : (
          <>
            {/* Available Balance Card */}
            <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-[#0066b3] mb-2">Available Balance</h2>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold">
                      {(userData?.balance ?? 0).toFixed(2)}
                    </span>
                    <span className="text-lg text-gray-600">USD</span>
                  </div>
                </div>
                <button onClick={handleTopUp} className="btn-mobile-primary">
                  TOP UP
                </button>
              </div>
            </div>

            {/* Total Balance Card */}
            <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
              <h2 className="text-lg font-semibold text-[#0066b3] mb-2">Total Balance</h2>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">
                  {((userData?.balance ?? 0) + (userData?.holdAmount ?? 0)).toFixed(2)}
                </span>
                <span className="text-lg text-gray-600">USD</span>
              </div>
            </div>

            {/* Activity Tabs */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <button
                onClick={() => setActiveTab('recent')}
                className={`btn-mobile-tab ${
                  activeTab === 'recent'
                    ? 'bg-gray-800 text-white shadow-sm'
                    : 'bg-white text-gray-800 hover:bg-gray-100'
                }`}
              >
                Recent Activity
              </button>
              <button
                onClick={() => setActiveTab('transaction')}
                className={`btn-mobile-tab ${
                  activeTab === 'transaction'
                    ? 'bg-gray-800 text-white shadow-sm'
                    : 'bg-white text-gray-800 hover:bg-gray-100'
                }`}
              >
                Transaction Activity
              </button>
            </div>

            {/* Activity Content */}
            {visibleTx.length === 0 ? (
              <div className="bg-white rounded-lg p-12 text-center min-h-[200px] flex items-center justify-center shadow-sm">
                <p className="text-gray-400">No transactions found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {visibleTx.map((tx) => (
                  <div key={tx.id} className="bg-white rounded-lg p-4 shadow-sm flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 truncate">{tx.type}</p>
                      {tx.description && (
                        <p className="text-xs text-gray-500 truncate">{tx.description}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(tx.date).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 ml-4">
                      <span className="font-bold text-gray-900">
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
        <div className="text-center text-sm text-gray-500 mt-12 mb-24">
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