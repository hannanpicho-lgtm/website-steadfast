import { ChevronLeft, Bitcoin, CheckCircle2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { BottomNavigation } from '../components/BottomNavigation';
import { Header } from '../components/Header';
import { getCurrentUsername } from '../services/referralSystem';
import { projectId, publicAnonKey } from '@utils/supabase/info';
import { buildLoginRedirectState } from '../services/loginRedirect';

type CryptoWalletProfile = {
  type: 'crypto';
  walletType: string;
  walletAddress: string;
  network: string;
};

type WalletProfile = CryptoWalletProfile;

export default function ConnectWallet() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successBanner, setSuccessBanner] = useState('');

  const username = getCurrentUsername();
  const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a1c55d7e`;

  // Crypto form state
  const [cryptoForm, setCryptoForm] = useState({
    walletType: 'bitcoin',
    walletAddress: '',
    network: 'mainnet',
  });

  useEffect(() => {
    if (!username) {
      navigate('/login', {
        replace: true,
        state: buildLoginRedirectState(location.pathname, {
          authReason: 'session-expired',
          authMessage: 'Your session ended. Please sign in again to manage wallet details.',
        }),
      });
      return;
    }

    const hydrateFromProfile = (profile: WalletProfile) => {
      setCryptoForm({
        walletType: profile.walletType,
        walletAddress: profile.walletAddress,
        network: profile.network,
      });
    };

    const loadWalletProfile = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${serverUrl}/me/wallet`, {
          credentials: 'include',
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        });

        if (response.ok) {
          const payload = await response.json().catch(() => ({} as { walletProfile?: WalletProfile | null }));
          if (payload.walletProfile) {
            hydrateFromProfile(payload.walletProfile);
            return;
          }
        }
      } catch {
        toast.error('Failed to load wallet details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    void loadWalletProfile();
  }, [location.pathname, navigate, serverUrl, username]);

  const saveWalletProfile = async (profile: WalletProfile, successMessage: string) => {
    if (!username) {
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${serverUrl}/me/wallet`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify(profile),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(String((payload as Record<string, unknown>).error ?? 'Failed to save wallet details'));
      }

      setSuccessBanner(successMessage);
      setTimeout(() => navigate('/profile'), 1200);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save wallet details. Please try again.';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCryptoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cryptoForm.walletAddress.trim()) {
      toast.error('Please enter your wallet address.');
      return;
    }
    await saveWalletProfile({ type: 'crypto', ...cryptoForm }, 'Crypto wallet connected successfully!');
  };

  return (
    <div className="size-full overflow-auto pb-20 bg-gray-50">
      {/* Header */}
      <Header onContactClick={() => {}} />

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {loading ? (
          <div className="rounded-xl bg-white p-6 text-sm text-gray-600 shadow-sm">Loading wallet details...</div>
        ) : null}

        {/* Back Button and Title */}
        <div className="flex items-center gap-4 mb-6">
          <button 
            onClick={() => navigate(-1)}
            className="btn-mobile-icon"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-[#1a1f2e] flex-1 text-center mr-10">Connect Wallet</h1>
        </div>

        {successBanner ? (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 shadow-sm">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 text-emerald-600" size={20} />
              <div>
                <p className="text-sm font-semibold text-emerald-900">Wallet details saved</p>
                <p className="text-sm text-emerald-800">{successBanner}</p>
              </div>
            </div>
          </div>
        ) : null}





        {/* Crypto Form */}
        <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#1a1f2e] flex items-center gap-3">
                <Bitcoin size={24} className="text-purple-600" />
                Connect Crypto Wallet
              </h2>
            </div>

            <form onSubmit={handleCryptoSubmit} className="space-y-6">
              {/* Wallet Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Cryptocurrency Type *
                </label>
                <select
                  value={cryptoForm.walletType}
                  onChange={(e) => setCryptoForm({ ...cryptoForm, walletType: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                >
                  <option value="bitcoin">Bitcoin (BTC)</option>
                  <option value="ethereum">Ethereum (ETH)</option>
                  <option value="usdt">Tether (USDT)</option>
                </select>
              </div>

              {/* Network */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Network *
                </label>
                <select
                  value={cryptoForm.network}
                  onChange={(e) => setCryptoForm({ ...cryptoForm, network: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                >
                  <option value="mainnet">Mainnet</option>
                  <option value="erc20">ERC-20 (Ethereum)</option>
                  <option value="bep20">BEP-20 (Binance Smart Chain)</option>
                  <option value="trc20">TRC-20 (Tron)</option>
                  <option value="polygon">Polygon</option>
                </select>
              </div>

              {/* Wallet Address */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Wallet Address *
                </label>
                <input
                  type="text"
                  value={cryptoForm.walletAddress}
                  onChange={(e) => setCryptoForm({ ...cryptoForm, walletAddress: e.target.value })}
                  placeholder="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
                  required
                />
                <p className="text-xs text-gray-500 mt-2">
                  Please double-check your wallet address. Transactions cannot be reversed.
                </p>
              </div>

              {/* Warning Box */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <div className="text-amber-600 mt-0.5">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-amber-900 mb-1">Important Security Notice</h3>
                    <p className="text-sm text-amber-800">
                      Always verify the wallet address before confirming. Steadfast Digital will never ask for your private keys or seed phrases.
                    </p>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-4 rounded-lg transition-all duration-300 hover:shadow-lg flex items-center justify-center gap-2"
              >
                <Bitcoin size={20} />
                {submitting ? 'Saving...' : 'Connect Crypto Wallet'}
              </button>
            </form>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}
