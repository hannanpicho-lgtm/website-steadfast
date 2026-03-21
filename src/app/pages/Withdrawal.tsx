import { ChevronLeft, ScrollText, ChevronRight, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { LiveChatBox } from '../components/LiveChatBox';
import { BottomNavigation } from '../components/BottomNavigation';
import { Header } from '../components/Header';
import { projectId, publicAnonKey } from '@utils/supabase/info';
import { getCurrentUsername } from '../services/referralSystem';
import { buildLoginRedirectState } from '../services/loginRedirect';

type UserWalletData = {
  username: string;
  balance: number;
  holdAmount: number;
};

type WalletProfileResponse = {
  walletProfile?: {
    type: 'banking' | 'crypto';
    walletAddress?: string;
    accountNumber?: string;
  } | null;
};

type WithdrawalRecord = {
  id: string;
  amount: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  requestedDate: string;
  method: string;
  walletAddress: string;
  txHash: string;
};

export default function Withdrawal() {
  const navigate = useNavigate();
  const location = useLocation();
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [transactionPassword, setTransactionPassword] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [walletData, setWalletData] = useState<UserWalletData | null>(null);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const username = getCurrentUsername();
  const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a1c55d7e`;
  const availableAmount = walletData ? Math.max(0, walletData.balance - walletData.holdAmount) : 0;

  useEffect(() => {
    if (!username) {
      navigate('/login', {
        replace: true,
        state: buildLoginRedirectState(location.pathname, {
          authReason: 'session-expired',
          authMessage: 'Your session ended. Please sign in again to manage withdrawals.',
        }),
      });
      return;
    }

    void loadWalletState(username);
  }, [location.pathname, navigate, username]);

  const loadWalletState = async (activeUsername: string) => {
    setLoading(true);
    try {
      const headers = {
        Authorization: `Bearer ${publicAnonKey}`,
      };

      const [userResponse, withdrawalsResponse, walletResponse] = await Promise.all([
        fetch(`${serverUrl}/me/financials`, { credentials: 'include', headers }),
        fetch(`${serverUrl}/me/withdrawals`, { credentials: 'include', headers }),
        fetch(`${serverUrl}/me/wallet`, { credentials: 'include', headers }),
      ]);

      const [userPayload, withdrawalsPayload, walletPayload] = await Promise.all([
        userResponse.json().catch(() => ({})),
        withdrawalsResponse.json().catch(() => ([])),
        walletResponse.json().catch(() => ({} as WalletProfileResponse)),
      ]);

      if (!userResponse.ok) {
        throw new Error(userPayload?.error ?? 'Failed to load wallet data');
      }
      if (!withdrawalsResponse.ok) {
        throw new Error('Failed to load withdrawal history');
      }

      setWalletData({
        username: userPayload.username,
        balance: Number(userPayload.balance ?? 0),
        holdAmount: Number(userPayload.holdAmount ?? 0),
      });
      setWithdrawals(Array.isArray(withdrawalsPayload) ? withdrawalsPayload : []);

      if (walletResponse.ok && !walletAddress) {
        const profile = (walletPayload as WalletProfileResponse).walletProfile;
        if (profile?.type === 'crypto' && profile.walletAddress) {
          setWalletAddress(profile.walletAddress);
        } else if (profile?.type === 'banking' && profile.accountNumber) {
          setWalletAddress(profile.accountNumber);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load withdrawal data';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleAllClick = () => {
    setWithdrawAmount(availableAmount > 0 ? availableAmount.toFixed(2) : '0.00');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) {
      navigate('/login', {
        replace: true,
        state: buildLoginRedirectState(location.pathname, {
          authReason: 'session-expired',
          authMessage: 'Your session ended before the withdrawal request could be submitted.',
        }),
      });
      return;
    }

    const amount = Number(withdrawAmount);

    if (!walletAddress.trim()) {
      toast.error('Withdraw account is required.');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Enter a valid withdrawal amount.');
      return;
    }
    if (amount > availableAmount) {
      toast.error('Withdrawal amount exceeds your available balance.');
      return;
    }
    if (!transactionPassword) {
      toast.error('Transaction password is required.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${serverUrl}/me/withdrawals/request`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          amount,
          walletAddress: walletAddress.trim(),
          method: 'USDT',
          transactionPassword,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to submit withdrawal request');
      }

      toast.success('Withdrawal request submitted.');
      setWithdrawAmount('');
      setTransactionPassword('');
      await loadWalletState(username);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit withdrawal request';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const latestWithdrawal = withdrawals[0] ?? null;

  return (
    <div className="size-full overflow-auto bg-gray-50">
      {/* Header */}
      <Header onContactClick={() => setIsChatOpen(true)} />

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-6 py-6">
        {/* Back Button and Title */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)}
              className="btn-mobile-icon"
            >
              <ChevronLeft size={20} />
            </button>
            <h1 className="text-2xl font-bold text-[#0066b3]">Withdrawal</h1>
          </div>
          <button onClick={() => navigate('/withdrawal-history')} className="btn-mobile-primary self-start sm:self-auto">
            <ScrollText size={20} />
            <span className="font-semibold">History</span>
          </button>
        </div>

        {/* Total Balance Card */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#0066b3] mb-3">Total Balance</h2>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-4xl font-bold">{loading ? '...' : walletData?.balance.toFixed(2) ?? '0.00'}</span>
            <span className="text-lg text-gray-600">USD</span>
          </div>
          <p className="text-sm italic">You will receive your withdrawal within an hour</p>
        </div>

        {/* Balance Details */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between py-3">
            <span className="text-[#0066b3] font-semibold">Available Amount</span>
            <span className="font-bold">{loading ? '...' : `${availableAmount.toFixed(2)} USD`}</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-[#0066b3] font-semibold">Freeze Amount</span>
            <span className="font-bold">{loading ? '...' : `${(walletData?.holdAmount ?? 0).toFixed(2)} USD`}</span>
          </div>
        </div>

        {/* Withdraw Amount Form */}
        <form onSubmit={handleSubmit}>
          <h3 className="text-xl font-bold mb-4">WITHDRAW AMOUNT</h3>

          {/* Withdraw Account */}
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2">Withdraw Account</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Withdraw Account"
                value={walletAddress}
                onChange={(event) => setWalletAddress(event.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#0066b3] text-gray-400"
              />
              <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            </div>
          </div>

          {/* Withdraw Amount */}
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2">Withdraw Amount</label>
            <div className="relative">
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                min="0"
                step="0.01"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#0066b3]"
              />
              <button
                type="button"
                onClick={handleAllClick}
                className="absolute right-2 top-1/2 -translate-y-1/2 btn-mobile-primary px-3 py-1.5 text-xs"
              >
                ALL
              </button>
            </div>
          </div>

          {/* Transaction Password */}
          <div className="mb-6">
            <label className="block text-sm font-semibold mb-2">Transaction Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Transaction Password"
                value={transactionPassword}
                onChange={(e) => setTransactionPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#0066b3] text-gray-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || submitting}
            className="btn-mobile-primary-block disabled:opacity-60"
          >
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </form>

        <div className="bg-white rounded-lg p-6 mt-6 shadow-sm">
          <div className="flex items-center justify-between gap-4 mb-3">
            <h3 className="text-lg font-semibold text-[#0066b3]">Latest Withdrawal</h3>
            {loading && <Loader2 className="animate-spin text-[#0066b3]" size={18} />}
          </div>
          {latestWithdrawal ? (
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center justify-between gap-3">
                <span>Amount</span>
                <span className="font-semibold text-gray-900">${latestWithdrawal.amount.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Status</span>
                <span className={`font-semibold ${
                  latestWithdrawal.status === 'Approved' ? 'text-green-600' :
                  latestWithdrawal.status === 'Rejected' ? 'text-red-600' : 'text-yellow-600'
                }`}>
                  {latestWithdrawal.status}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Requested</span>
                <span className="font-medium text-gray-900">{new Date(latestWithdrawal.requestedDate).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Account</span>
                <span className="font-medium text-gray-900">{latestWithdrawal.walletAddress}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No withdrawal requests submitted yet.</p>
          )}
        </div>

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