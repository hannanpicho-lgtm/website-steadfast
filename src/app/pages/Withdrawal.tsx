import { ChevronLeft, ScrollText, ChevronRight, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { LiveChatBox } from '../components/LiveChatBox';
import { BottomNavigation } from '../components/BottomNavigation';
import { Header } from '../components/Header';
import { publicAnonKey } from '@utils/supabase/info';
import { getCurrentUsername } from '../services/referralSystem';
import { buildLoginRedirectState } from '../services/loginRedirect';
import { fetchJsonWithRetry } from '../services/networkClient';
import { RUNTIME_ENVIRONMENT } from '../services/runtimeEnvironment';

type UserWalletData = {
  username: string;
  balance: number;
  holdAmount: number;
};

type WalletProfileResponse = {
  walletProfile?: {
    type: 'banking' | 'crypto';
    walletType?: string;
    network?: string;
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
  network?: string;
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
  const [walletProfile, setWalletProfile] = useState<WalletProfileResponse['walletProfile']>(null);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const username = getCurrentUsername();
  const serverUrl = RUNTIME_ENVIRONMENT.apiBaseUrl;
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
      const [userPayload, withdrawalsPayload, walletPayload] = await Promise.all([
        fetchJsonWithRetry<any>({
          url: `${serverUrl}/me/financials`,
          init: { credentials: 'include' },
          timeoutMs: 10000,
          retries: 2,
          retryDelayMs: 300,
          pageTag: 'withdrawal',
        }),
        fetchJsonWithRetry<any>({
          url: `${serverUrl}/me/withdrawals`,
          init: { credentials: 'include' },
          timeoutMs: 10000,
          retries: 2,
          retryDelayMs: 300,
          pageTag: 'withdrawal',
        }),
        fetchJsonWithRetry<any>({
          url: `${serverUrl}/me/wallet`,
          init: { credentials: 'include' },
          timeoutMs: 10000,
          retries: 1,
          retryDelayMs: 300,
          pageTag: 'withdrawal',
        }).catch(() => ({} as any)),
      ]);

      setWalletData({
        username: userPayload.username,
        balance: Number(userPayload.balance ?? 0),
        holdAmount: Number(userPayload.holdAmount ?? 0),
      });
      setWithdrawals(Array.isArray(withdrawalsPayload) ? withdrawalsPayload : []);

      if (!walletAddress) {
        const profile = (walletPayload as WalletProfileResponse).walletProfile;
        setWalletProfile(profile ?? null);
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
          method: walletProfile?.type === 'crypto'
            ? (walletProfile.walletType ?? 'USDT')
            : 'BANK',
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
  const latestWithdrawalAmountDisplay = latestWithdrawal?.status === 'Pending'
    ? availableAmount
    : (latestWithdrawal?.amount ?? 0);
  const latestWithdrawalAmountLabel = latestWithdrawal?.status === 'Pending'
    ? 'Amount Remaining'
    : 'Amount';
  const walletBindingLabel = walletProfile?.type === 'crypto'
    ? `${String(walletProfile.walletType ?? 'Crypto').toUpperCase()}${walletProfile.network ? ` • ${walletProfile.network.toUpperCase()}` : ''}`
    : walletProfile?.type === 'banking'
      ? 'BANK ACCOUNT'
      : '';

  return (
    <div className="size-full overflow-auto pb-20 bg-[#1a1f2e]">
      {/* Header */}
      <Header onContactClick={() => setIsChatOpen(true)} />

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        {/* Back Button and Title */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)} aria-label="Go back"
              className="btn-mobile-icon"
            >
              <ChevronLeft size={20} />
            </button>
            <h1 className="text-2xl font-bold text-[#00D9FF]">Withdrawal</h1>
          </div>
          <button onClick={() => navigate('/withdrawal-history')} className="btn-mobile-primary self-start sm:self-auto">
            <ScrollText size={20} />
            <span className="font-semibold">History</span>
          </button>
        </div>

        {/* Total Balance Card */}
        <div className="bg-[#252d42]/80 border border-white/10 rounded-xl p-6 mb-6 backdrop-blur-sm sf-stagger-1">
          <h2 className="text-lg font-semibold text-[#00D9FF] mb-3">Total Balance</h2>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-4xl font-bold text-white">{loading ? '...' : walletData?.balance.toFixed(2) ?? '0.00'}</span>
            <span className="text-lg text-gray-400">USD</span>
          </div>
          <p className="text-sm italic text-gray-400">You will receive your withdrawal within an hour</p>
        </div>

        {/* Balance Details */}
        <div className="space-y-0 mb-6 bg-[#252d42]/80 border border-white/10 rounded-xl px-4 backdrop-blur-sm sf-stagger-2">
          <div className="flex items-center justify-between py-4 border-b border-white/10">
            <span className="text-[#00D9FF] font-semibold">Available Amount</span>
            <span className="font-bold text-white">{loading ? '...' : `${availableAmount.toFixed(2)} USD`}</span>
          </div>
          <div className="flex items-center justify-between py-4">
            <span className="text-[#00D9FF] font-semibold">Freeze Amount</span>
            <span className="font-bold text-white">{loading ? '...' : `${(walletData?.holdAmount ?? 0).toFixed(2)} USD`}</span>
          </div>
        </div>

        {/* Withdraw Amount Form */}
        <form onSubmit={handleSubmit}>
          <h3 className="text-xl font-bold mb-4 text-white">WITHDRAW AMOUNT</h3>

          {/* Withdraw Account */}
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2 text-gray-300">Withdraw Account</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Withdraw Account"
                value={walletAddress}
                onChange={(event) => setWalletAddress(event.target.value)}
                readOnly={Boolean(walletProfile)}
                className="w-full px-4 pr-12 py-3 bg-[#252d42] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#00D9FF] transition-colors font-mono text-sm"
              />
              <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
            </div>
            {walletBindingLabel ? (
              <p className="mt-2 text-xs text-cyan-300">Bound wallet: {walletBindingLabel}</p>
            ) : null}
          </div>

          {/* Withdraw Amount */}
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2 text-gray-300">Withdraw Amount</label>
            <div className="relative">
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                min="0"
                step="0.01"
                className="w-full px-4 py-3 bg-[#252d42] border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#00D9FF] transition-colors"
              />
              <button
                type="button"
                onClick={handleAllClick}
                className="absolute right-2 top-1/2 -translate-y-1/2 btn-mobile-primary px-3 py-2 text-xs min-h-[36px]"
              >
                ALL
              </button>
            </div>
          </div>

          {/* Transaction Password */}
          <div className="mb-6">
            <label className="block text-sm font-semibold mb-2 text-gray-300">Transaction Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Transaction Password"
                value={transactionPassword}
                onChange={(e) => setTransactionPassword(e.target.value)}
                className="w-full px-4 py-3 bg-[#252d42] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#00D9FF] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || submitting}
            className="btn-mobile-primary-block disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {submitting ? <><Loader2 size={18} className="animate-spin" /> Submitting...</> : 'Submit'}
          </button>
        </form>

        <div className="bg-[#252d42]/80 border border-white/10 rounded-xl p-6 mt-6 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-4 mb-3">
            <h3 className="text-lg font-semibold text-[#00D9FF]">Latest Withdrawal</h3>
            {loading && <Loader2 className="animate-spin text-[#0066b3]" size={18} />}
          </div>
          {latestWithdrawal ? (
            <div className="space-y-2 text-sm text-gray-400">
              <div className="flex items-center justify-between gap-3">
                <span>{latestWithdrawalAmountLabel}</span>
                <span className="font-semibold text-white">${latestWithdrawalAmountDisplay.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Asset</span>
                <span className="font-medium text-white text-right">{latestWithdrawal.method}{latestWithdrawal.network ? ` • ${latestWithdrawal.network.toUpperCase()}` : ''}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Status</span>
                <span className={`font-semibold ${
                  latestWithdrawal.status === 'Approved' ? 'text-green-400' :
                  latestWithdrawal.status === 'Rejected' ? 'text-red-400' : 'text-yellow-400'
                }`}>
                  {latestWithdrawal.status}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Requested</span>
                <span className="font-medium text-white text-right">{new Date(latestWithdrawal.requestedDate).toLocaleString()}</span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span>Account</span>
                <span className="font-medium text-white text-right max-w-[68%] break-all leading-snug">{latestWithdrawal.walletAddress}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No withdrawal requests submitted yet.</p>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-600 mt-12 mb-24">
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