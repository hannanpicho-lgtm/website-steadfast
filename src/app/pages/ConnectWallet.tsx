import { ChevronLeft, Building2, Bitcoin, Check, Copy, CreditCard, Landmark } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { LiveChatBox } from '../components/LiveChatBox';
import { BottomNavigation } from '../components/BottomNavigation';
import { Header } from '../components/Header';
import { getCurrentUsername } from '../services/referralSystem';
import { projectId, publicAnonKey } from '@utils/supabase/info';
import { buildLoginRedirectState } from '../services/loginRedirect';

type WalletType = 'banking' | 'crypto' | null;

type BankingWalletProfile = {
  type: 'banking';
  accountName: string;
  accountNumber: string;
  bankName: string;
  swiftCode: string;
  routingNumber: string;
  country: string;
};

type CryptoWalletProfile = {
  type: 'crypto';
  walletType: string;
  walletAddress: string;
  network: string;
};

type WalletProfile = BankingWalletProfile | CryptoWalletProfile;

export default function ConnectWallet() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<WalletType>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const username = getCurrentUsername();
  const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a1c55d7e`;

  // Banking form state
  const [bankingForm, setBankingForm] = useState({
    accountName: '',
    accountNumber: '',
    bankName: '',
    swiftCode: '',
    routingNumber: '',
    country: '',
  });

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
      if (profile.type === 'banking') {
        setSelectedType('banking');
        setBankingForm({
          accountName: profile.accountName,
          accountNumber: profile.accountNumber,
          bankName: profile.bankName,
          swiftCode: profile.swiftCode,
          routingNumber: profile.routingNumber,
          country: profile.country,
        });
        return;
      }

      setSelectedType('crypto');
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

      toast.success(successMessage);
      setTimeout(() => navigate('/profile'), 1200);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save wallet details. Please try again.';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBankingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveWalletProfile({ type: 'banking', ...bankingForm }, 'Banking account connected successfully!');
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
      <Header onContactClick={() => setIsChatOpen(true)} />

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-6">
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

        {/* Wallet Type Selection */}
        {!selectedType && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Banking Card */}
            <button
              onClick={() => setSelectedType('banking')}
              className="group relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 rounded-2xl p-8 text-left transition-all duration-300 hover:scale-105 hover:shadow-2xl"
            >
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-white rounded-full blur-3xl"></div>
              </div>

              {/* Content */}
              <div className="relative z-10">
                <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Landmark size={32} className="text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-3">Banking Account</h2>
                <p className="text-blue-100 mb-6">
                  Connect your traditional bank account for deposits and withdrawals
                </p>
                <div className="flex items-center gap-2 text-white font-semibold">
                  <span>Connect Banking</span>
                  <svg className="w-5 h-5 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </div>
            </button>

            {/* Crypto Card */}
            <button
              onClick={() => setSelectedType('crypto')}
              className="group relative overflow-hidden bg-gradient-to-br from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 rounded-2xl p-8 text-left transition-all duration-300 hover:scale-105 hover:shadow-2xl"
            >
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 right-0 w-40 h-40 bg-white rounded-full blur-3xl"></div>
              </div>

              {/* Content */}
              <div className="relative z-10">
                <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Bitcoin size={32} className="text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-3">Crypto Wallet</h2>
                <p className="text-purple-100 mb-6">
                  Connect your cryptocurrency wallet for secure digital transactions
                </p>
                <div className="flex items-center gap-2 text-white font-semibold">
                  <span>Connect Crypto</span>
                  <svg className="w-5 h-5 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </div>
            </button>
          </div>
        )}

        {/* Banking Form */}
        {selectedType === 'banking' && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#1a1f2e] flex items-center gap-3">
                <Landmark size={24} className="text-blue-600" />
                Banking Account Details
              </h2>
              <button
                onClick={() => setSelectedType(null)}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                ← Back
              </button>
            </div>

            <form onSubmit={handleBankingSubmit} className="space-y-6">
              {/* Account Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Account Holder Name *
                </label>
                <input
                  type="text"
                  value={bankingForm.accountName}
                  onChange={(e) => setBankingForm({ ...bankingForm, accountName: e.target.value })}
                  placeholder="John Doe"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Account Number */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Account Number *
                </label>
                <input
                  type="text"
                  value={bankingForm.accountNumber}
                  onChange={(e) => setBankingForm({ ...bankingForm, accountNumber: e.target.value })}
                  placeholder="1234567890"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Bank Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Bank Name *
                </label>
                <input
                  type="text"
                  value={bankingForm.bankName}
                  onChange={(e) => setBankingForm({ ...bankingForm, bankName: e.target.value })}
                  placeholder="Chase Bank"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Row: SWIFT & Routing */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    SWIFT/BIC Code
                  </label>
                  <input
                    type="text"
                    value={bankingForm.swiftCode}
                    onChange={(e) => setBankingForm({ ...bankingForm, swiftCode: e.target.value })}
                    placeholder="CHASUS33"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Routing Number
                  </label>
                  <input
                    type="text"
                    value={bankingForm.routingNumber}
                    onChange={(e) => setBankingForm({ ...bankingForm, routingNumber: e.target.value })}
                    placeholder="021000021"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Country */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Country *
                </label>
                <select
                  value={bankingForm.country}
                  onChange={(e) => setBankingForm({ ...bankingForm, country: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select Country</option>
                  <option value="US">United States</option>
                  <option value="UK">United Kingdom</option>
                  <option value="CA">Canada</option>
                  <option value="AU">Australia</option>
                  <option value="DE">Germany</option>
                  <option value="FR">France</option>
                  <option value="JP">Japan</option>
                  <option value="SG">Singapore</option>
                </select>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 rounded-lg transition-all duration-300 hover:shadow-lg flex items-center justify-center gap-2"
              >
                <CreditCard size={20} />
                {submitting ? 'Saving...' : 'Connect Banking Account'}
              </button>
            </form>
          </div>
        )}

        {/* Crypto Form */}
        {selectedType === 'crypto' && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#1a1f2e] flex items-center gap-3">
                <Bitcoin size={24} className="text-purple-600" />
                Crypto Wallet Details
              </h2>
              <button
                onClick={() => setSelectedType(null)}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                ← Back
              </button>
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
                  <option value="usdc">USD Coin (USDC)</option>
                  <option value="bnb">Binance Coin (BNB)</option>
                  <option value="cardano">Cardano (ADA)</option>
                  <option value="solana">Solana (SOL)</option>
                  <option value="ripple">Ripple (XRP)</option>
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
                  ⚠️ Please double-check your wallet address. Transactions cannot be reversed.
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
        )}

        {/* Info Cards */}
        {!selectedType && (
          <div className="mt-8 grid md:grid-cols-2 gap-6">
            {/* Why Connect */}
            <div className="bg-gradient-to-br from-[#1a1f2e] to-[#252b3d] rounded-xl p-6 text-white">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <div className="w-8 h-8 bg-[#00D9FF] rounded-full flex items-center justify-center">
                  <Check size={16} className="text-[#1a1f2e]" />
                </div>
                Why Connect a Wallet?
              </h3>
              <ul className="space-y-3 text-sm text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-[#00D9FF] mt-1">•</span>
                  <span>Receive commission payments instantly</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#00D9FF] mt-1">•</span>
                  <span>Withdraw earnings anytime</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#00D9FF] mt-1">•</span>
                  <span>Make deposits for VIP level upgrades</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#00D9FF] mt-1">•</span>
                  <span>Secure and encrypted transactions</span>
                </li>
              </ul>
            </div>

            {/* Security */}
            <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl p-6 text-white">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                Secure & Private
              </h3>
              <ul className="space-y-3 text-sm text-emerald-50">
                <li className="flex items-start gap-2">
                  <span className="text-white mt-1">•</span>
                  <span>256-bit SSL encryption</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-white mt-1">•</span>
                  <span>Your data is never shared</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-white mt-1">•</span>
                  <span>PCI DSS compliant</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-white mt-1">•</span>
                  <span>Two-factor authentication available</span>
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Live Chat */}
      <LiveChatBox isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}
