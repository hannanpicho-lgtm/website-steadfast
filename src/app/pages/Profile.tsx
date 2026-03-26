import { ArrowLeft, User, Link as LinkIcon, Users, Bell, Globe, LogOut, ChevronDown, Copy, MessageSquare, HelpCircle, PencilLine } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { LiveChatBox } from '../components/LiveChatBox';
import { BottomNavigation } from '../components/BottomNavigation';
import profileImage from '../../assets/3df251a778530e24e8d83eda03085a2dc309c248.png';
import { getCurrentUsername, logoutCurrentUser } from '../services/referralSystem';
import { changeUserCredentials, isPasswordChangeRequired } from '../services/serverAuth';
import { fetchReferralSummary } from '../services/referralReadModel';
import { fetchFinancialSummary, type FinancialSummaryResponse } from '../services/financialReadModel';
import { fetchBonusFeed, type BonusFeedItem } from '../services/bonusFeed';

export default function Profile() {
  const navigate = useNavigate();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [accountInfoOpen, setAccountInfoOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [securityCredentialsOpen, setSecurityCredentialsOpen] = useState(false);
  const [todayProfit, setTodayProfit] = useState<number>(0);
  const [totalCommission, setTotalCommission] = useState<number>(0);
  const [profileLoading, setProfileLoading] = useState(true);
  const [referralCode, setReferralCode] = useState('STF01');
  const [financialSummary, setFinancialSummary] = useState<FinancialSummaryResponse | null>(null);
  const [bonusPreview, setBonusPreview] = useState<BonusFeedItem[]>([]);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [currentLoginPassword, setCurrentLoginPassword] = useState('');
  const [newLoginPassword, setNewLoginPassword] = useState('');
  const [newTransactionPassword, setNewTransactionPassword] = useState('');
  const [updatingCredentials, setUpdatingCredentials] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profileImageSrc, setProfileImageSrc] = useState<string>(() => {
    try {
      return localStorage.getItem(`profile-image-${getCurrentUsername()}`) ?? profileImage;
    } catch {
      return profileImage;
    }
  });

  const username = getCurrentUsername();
  const menuRowHoverFx = 'w-full flex items-center justify-between p-4 transition-all duration-300 hover:bg-[linear-gradient(102deg,rgba(255,255,255,0.98)_0%,rgba(255,245,181,0.34)_52%,rgba(255,255,255,0.98)_100%)] hover:shadow-[inset_0_-14px_0_rgba(255,245,181,0.22)]';

  useEffect(() => {
    const forceFromQuery = new URLSearchParams(window.location.search).get('forcePasswordChange') === '1';
    setMustChangePassword(forceFromQuery || isPasswordChangeRequired());
  }, []);

  useEffect(() => {
    if (mustChangePassword) {
      setSecurityCredentialsOpen(true);
    }
  }, [mustChangePassword]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      if (!result) return;
      setProfileImageSrc(result);
      try {
        localStorage.setItem(`profile-image-${getCurrentUsername()}`, result);
      } catch {
        // storage quota exceeded – just update state
      }
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  useEffect(() => {
    if (!username) return;

    const load = async () => {
      try {
        const [userRes, referralSummary, bonusRes] = await Promise.allSettled([
          fetchFinancialSummary(),
          fetchReferralSummary(),
          fetchBonusFeed({ limit: 6 }),
        ]);

        if (userRes.status === 'fulfilled') {
          setFinancialSummary(userRes.value);
          setTodayProfit(Number(userRes.value.todayCommission ?? 0));
        }

        if (referralSummary.status === 'fulfilled') {
          setTotalCommission(Number(referralSummary.value.referralEarnings ?? 0));
          setReferralCode(String(referralSummary.value.invitationCode ?? 'STF01'));
        }

        if (bonusRes.status === 'fulfilled') {
          setBonusPreview(bonusRes.value);
        }

        if (userRes.status !== 'fulfilled' && referralSummary.status !== 'fulfilled' && bonusRes.status !== 'fulfilled') {
          toast.error('Could not load profile data. Please retry.');
        }
      } catch {
        toast.error('Could not load profile data. Please retry.');
      } finally {
        setProfileLoading(false);
      }
    };

    void load();
  }, [username]);

  const handleCopyReferral = () => {
    // Fallback copy method for environments where Clipboard API is blocked
    const textArea = document.createElement('textarea');
    textArea.value = referralCode;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      toast.success('Referral code copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
      toast.error('Failed to copy referral code');
    }
    
    document.body.removeChild(textArea);
  };

  const handleCredentialsUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!currentLoginPassword) {
      toast.error('Current login password is required.');
      return;
    }
    if (!newLoginPassword && !newTransactionPassword) {
      toast.error('Enter at least one new password.');
      return;
    }
    if (newLoginPassword && newLoginPassword.length < 6) {
      toast.error('New login password must be at least 6 characters.');
      return;
    }
    if (newTransactionPassword && newTransactionPassword.length < 6) {
      toast.error('New transaction password must be at least 6 characters.');
      return;
    }

    setUpdatingCredentials(true);
    const result = await changeUserCredentials({
      currentLoginPassword,
      newLoginPassword,
      newTransactionPassword,
    });
    setUpdatingCredentials(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    setCurrentLoginPassword('');
    setNewLoginPassword('');
    setNewTransactionPassword('');
    setMustChangePassword(false);
    toast.success('Credentials updated successfully.');
  };

  const vipLevel = Number(financialSummary?.vipLevel ?? 1);
  const creditScore = Math.min(100, Math.max(0, Math.round(Number(financialSummary?.creditScore ?? 100))));
  const isFrozen = Boolean(financialSummary?.isFrozen);
  const activePremium = (financialSummary?.activePremium ?? null) as Record<string, unknown> | null;
  const totalBalance = Number(financialSummary?.balance ?? 0);
  const holdAmount = Number(financialSummary?.holdAmount ?? 0);
  const availableAmount = Number(financialSummary?.availableAmount ?? Math.max(0, totalBalance - holdAmount));
  const beforeFreezeBalance = isFrozen
    ? Number(activePremium?.balanceBeforeAssignment ?? totalBalance)
    : totalBalance;
  const premiumHoldAmount = isFrozen
    ? Number(activePremium?.topUpRequired ?? activePremium?.negativeAmount ?? holdAmount)
    : holdAmount;
  const premiumProfit = isFrozen ? Math.max(0, Number(activePremium?.commissionEarned ?? 0)) : 0;
  const afterSettlementAmount = isFrozen
    ? Math.max(0, beforeFreezeBalance + premiumProfit)
    : Math.max(0, availableAmount);
  const luckyBonus = Number(financialSummary?.luckyBonus ?? 0);
  const bonusPreviewTotal = bonusPreview.reduce((sum, item) => sum + Number(item.amount ?? 0), 0);
  const automaticBonusTotal = bonusPreview
    .filter((item) => item.assignmentMode === 'automatic')
    .reduce((sum, item) => sum + Number(item.amount ?? 0), 0);

  return (
    <div className="size-full overflow-auto pb-20 bg-[#1a1f2e]">
      {/* Header */}
      <header className="bg-[#1a2637]/95 text-white py-4 px-6 flex items-center justify-between shadow-sm sticky top-0 z-10 border-b border-[#2c3f58] backdrop-blur-sm">
        <Link to="/home">
          <ArrowLeft size={24} className="cursor-pointer hover:text-[#00D9FF] transition-colors" />
        </Link>
        <h1 className="text-xl font-bold text-white">My Profile</h1>
        <div className="w-6"></div>
      </header>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Profile Image Section */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative mb-3">
            <img 
              src={profileImageSrc}
              alt="Profile" 
              className="w-24 h-24 rounded-full object-cover bg-gray-200 border-2 border-[#d9b48c] shadow-sm"
            />
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-sm text-[#00D9FF] flex items-center gap-1 hover:underline"
          >
            <PencilLine size={14} />
            <span>Edit Profile Image</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
          />
        </div>

        {/* Profile Card */}
        <div className="rounded-2xl bg-[linear-gradient(135deg,#0b5f94_0%,#0f6ea9_52%,#157fbc_100%)] p-6 text-white mb-6 shadow-[0_18px_40px_rgba(10,79,126,0.22)]">
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="text-sm font-medium text-white/80">Hello,</p>
              <h2 className="text-[2rem] font-bold leading-none mt-1">{username ?? 'User'}</h2>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-right">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-white/70">Tier</p>
                <p className="text-2xl font-bold leading-none">VIP{vipLevel}</p>
              </div>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" className="text-orange-300 drop-shadow-sm">
                <path d="M12 2L14.97 8.03L21.63 8.99L16.82 13.68L17.95 20.31L12 17.18L6.05 20.31L7.18 13.68L2.37 8.99L9.03 8.03L12 2Z"/>
              </svg>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4 text-center">
            <div className="flex flex-col items-center justify-center">
              <p className="text-xs font-semibold text-white/85 mb-1">My Referral Code</p>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold uppercase tracking-[0.14em]">{referralCode || '—'}</p>
                <button onClick={handleCopyReferral} className="hover:opacity-80 rounded p-1 hover:bg-white/10">
                  <Copy size={16} />
                </button>
              </div>
            </div>
            <div className="flex flex-col items-center border-l border-r border-white/30">
              <p className="text-xs font-semibold text-white/85 mb-1">Today's Profit (USD)</p>
              <p className="text-lg font-bold">{profileLoading ? '...' : todayProfit.toFixed(2)}</p>
            </div>
            <div className="flex flex-col items-center">
              <p className="text-xs font-semibold text-white/85 mb-1">Total Commission (USD)</p>
              <p className="text-lg font-bold">{profileLoading ? '...' : totalCommission.toFixed(2)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
            <div className="rounded-lg bg-white/10 border border-white/20 px-2.5 py-2 text-center">
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/75">{isFrozen ? 'Before Freeze' : 'Total Balance'}</p>
              <p className="text-sm font-bold mt-1">{profileLoading ? '...' : `${(isFrozen ? beforeFreezeBalance : totalBalance).toFixed(2)} USD`}</p>
            </div>
            <div className="rounded-lg bg-white/10 border border-white/20 px-2.5 py-2 text-center">
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/75">{isFrozen ? 'Premium Hold' : 'Hold Amount'}</p>
              <p className="text-sm font-bold mt-1 text-[#ffe1e1]">{profileLoading ? '...' : `-${premiumHoldAmount.toFixed(2)} USD`}</p>
            </div>
            <div className="rounded-lg bg-white/10 border border-white/20 px-2.5 py-2 text-center">
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/75">{isFrozen ? 'After Settlement' : 'Available'}</p>
              <p className="text-sm font-bold mt-1 text-[#b8ffd4]">{profileLoading ? '...' : `${afterSettlementAmount.toFixed(2)} USD`}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
            <div className="rounded-lg bg-white/10 border border-white/20 px-2.5 py-2 text-center">
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/75">Lucky Bonus</p>
              <p className="text-sm font-bold mt-1 text-[#ffe7a6]">{profileLoading ? '...' : `${luckyBonus.toFixed(2)} USD`}</p>
            </div>
            <div className="rounded-lg bg-white/10 border border-white/20 px-2.5 py-2 text-center">
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/75">Recent Bonus Total</p>
              <p className="text-sm font-bold mt-1 text-[#b9f4ff]">{profileLoading ? '...' : `${bonusPreviewTotal.toFixed(2)} USD`}</p>
            </div>
            <div className="rounded-lg bg-white/10 border border-white/20 px-2.5 py-2 text-center">
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/75">Automatic Bonus</p>
              <p className="text-sm font-bold mt-1 text-[#b8ffd4]">{profileLoading ? '...' : `${automaticBonusTotal.toFixed(2)} USD`}</p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold whitespace-nowrap">Credit Score:</span>
            <div className="flex-1 bg-[#092d46] rounded-full h-2.5 overflow-hidden">
              <div className="bg-white h-full rounded-full" style={{ width: `${creditScore}%` }}></div>
            </div>
            <span className="text-sm font-bold flex items-center gap-1 whitespace-nowrap">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-orange-400">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
              </svg>
              {creditScore}%
            </span>
          </div>
        </div>

        {/* My Profile Section */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-[#00D9FF] mb-3">My Profile</h3>

          {mustChangePassword ? (
            <div className="mb-3 rounded-lg border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-amber-200">
              <p className="text-sm font-semibold">Password update required</p>
              <p className="mt-1 text-xs text-amber-300">Your credentials were reset by admin. Update your login and transaction passwords now.</p>
            </div>
          ) : null}

          {/* Account Info */}
          <div className="bg-[#252d42]/80 border border-white/10 rounded-xl mb-3 overflow-hidden backdrop-blur-sm">
            <button 
              onClick={() => setAccountInfoOpen(!accountInfoOpen)}
              className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors text-white"
            >
              <div className="flex items-center gap-3">
                <User size={20} />
                <span className="font-semibold">Account Info</span>
              </div>
              <ChevronDown 
                size={20} 
                className={`transition-transform ${accountInfoOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {accountInfoOpen && (
              <div className="px-4 pb-4 border-t border-white/10">
                <div className="py-2">
                  <p className="text-sm text-gray-400 mb-1">Username</p>
                  <p className="font-semibold text-white">{username ?? 'ugreen'}</p>
                </div>
                <div className="py-2">
                  <p className="text-sm text-gray-400 mb-1">VIP Level</p>
                  <p className="font-semibold text-white">VIP {vipLevel}</p>
                </div>
                <div className="py-2">
                  <p className="text-sm text-gray-400 mb-1">Registration Date</p>
                  <p className="font-semibold text-white">{financialSummary?.createdAt ? new Date(financialSummary.createdAt).toLocaleDateString() : 'Not available'}</p>
                </div>
                <div className="py-2">
                  <p className="text-sm text-gray-400 mb-1">Email</p>
                  <p className="font-semibold text-white">Not provided</p>
                </div>
              </div>
            )}
          </div>

          {/* Bind Wallet */}
          <div className="bg-[#252d42]/80 border border-white/10 rounded-xl mb-3 overflow-hidden backdrop-blur-sm">
            <button 
              onClick={() => navigate('/connect-wallet')}
              className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors text-white"
            >
              <div className="flex items-center gap-3">
                <LinkIcon size={20} />
                <span className="font-semibold">Bind Wallet</span>
              </div>
              <ChevronDown size={20} />
            </button>
          </div>
        </div>

        {/* My Financial Section */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-[#00D9FF] mb-3">My Financial</h3>
          
          {/* Deposit */}
          <div className="bg-[#252d42]/80 border border-white/10 rounded-xl mb-3 overflow-hidden backdrop-blur-sm">
            <button 
              onClick={() => navigate('/deposit')}
              className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors text-white"
            >
              <div className="flex items-center gap-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="5" width="20" height="14" rx="2"/>
                  <line x1="2" y1="10" x2="22" y2="10"/>
                </svg>
                <span className="font-semibold">Deposit</span>
              </div>
              <ChevronDown size={20} />
            </button>
          </div>

          {/* Withdraw */}
          <div className="bg-[#252d42]/80 border border-white/10 rounded-xl mb-3 overflow-hidden backdrop-blur-sm">
            <button 
              onClick={() => navigate('/withdrawal')}
              className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors text-white"
            >
              <div className="flex items-center gap-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                <span className="font-semibold">Withdraw</span>
              </div>
              <ChevronDown size={20} />
            </button>
          </div>
        </div>

        {/* Other Section */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-[#00D9FF] mb-3">Other</h3>
          
          {/* Notifications */}
          <div className="bg-[#252d42]/80 border border-white/10 rounded-xl mb-3 overflow-hidden backdrop-blur-sm">
            <button 
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors text-white"
            >
              <div className="flex items-center gap-3">
                <Bell size={20} />
                <span className="font-semibold">Notifications</span>
              </div>
              <ChevronDown 
                size={20} 
                className={`transition-transform ${notificationsOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {notificationsOpen && (
              <div className="px-4 pb-4 border-t border-white/10">
                <p className="text-sm text-gray-400">No new notifications</p>
              </div>
            )}
          </div>

          {/* Customer Support */}
          <div className="bg-[#252d42]/80 border border-white/10 rounded-xl mb-3 overflow-hidden backdrop-blur-sm">
            <Link
              to="/support"
              className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors text-white"
            >
              <div className="flex items-center gap-3">
                <MessageSquare size={20} className="text-blue-500" />
                <span className="font-semibold">Customer Support</span>
              </div>
              <ChevronDown size={20} className="rotate-[-90deg]" />
            </Link>
          </div>

          {/* FAQs */}
          <div className="bg-[#252d42]/80 border border-white/10 rounded-xl mb-3 overflow-hidden backdrop-blur-sm">
            <Link
              to="/faqs"
              className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors text-white"
            >
              <div className="flex items-center gap-3">
                <HelpCircle size={20} />
                <span className="font-semibold">Help & FAQs</span>
              </div>
              <ChevronDown size={20} className="rotate-[-90deg]" />
            </Link>
          </div>

          {/* Change Language */}
          <div className="bg-[#252d42]/80 border border-white/10 rounded-xl mb-3 overflow-hidden backdrop-blur-sm">
            <button 
              onClick={() => setLanguageOpen(!languageOpen)}
              className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors text-white"
            >
              <div className="flex items-center gap-3">
                <Globe size={20} />
                <span className="font-semibold">Change Language</span>
              </div>
              <ChevronDown 
                size={20} 
                className={`transition-transform ${languageOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {languageOpen && (
              <div className="px-4 pb-4 border-t border-white/10">
                <div className="space-y-1">
                  <button className="block w-full text-left py-2 px-3 rounded-lg hover:bg-white/5 font-semibold text-[#00D9FF]">English</button>
                  <button className="block w-full text-left py-2 px-3 rounded-lg hover:bg-white/5 text-gray-300">Español</button>
                  <button className="block w-full text-left py-2 px-3 rounded-lg hover:bg-white/5 text-gray-300">中文</button>
                  <button className="block w-full text-left py-2 px-3 rounded-lg hover:bg-white/5 text-gray-300">Français</button>
                  <button className="block w-full text-left py-2 px-3 rounded-lg hover:bg-white/5 text-gray-300">Deutsch</button>
                  <button className="block w-full text-left py-2 px-3 rounded-lg hover:bg-white/5 text-gray-300">Português</button>
                  <button className="block w-full text-left py-2 px-3 rounded-lg hover:bg-white/5 text-gray-300">العربية</button>
                  <button className="block w-full text-left py-2 px-3 rounded-lg hover:bg-white/5 text-gray-300">हिन्दी</button>
                  <button className="block w-full text-left py-2 px-3 rounded-lg hover:bg-white/5 text-gray-300">Bahasa Indonesia</button>
                  <button className="block w-full text-left py-2 px-3 rounded-lg hover:bg-white/5 text-gray-300">日本語</button>
                  <button className="block w-full text-left py-2 px-3 rounded-lg hover:bg-white/5 text-gray-300">한국어</button>
                  <button className="block w-full text-left py-2 px-3 rounded-lg hover:bg-white/5 text-gray-300">Русский</button>
                  <button className="block w-full text-left py-2 px-3 rounded-lg hover:bg-white/5 text-gray-300">Türkçe</button>
                  <button className="block w-full text-left py-2 px-3 rounded-lg hover:bg-white/5 text-gray-300">Tiếng Việt</button>
                  <button className="block w-full text-left py-2 px-3 rounded-lg hover:bg-white/5 text-gray-300">ภาษาไทย</button>
                </div>
              </div>
            )}
          </div>

          {/* Logout */}
          <div className="bg-[#252d42]/80 border border-white/10 rounded-xl overflow-hidden backdrop-blur-sm">
            <Link
              to="/login"
              onClick={() => logoutCurrentUser()}
              className="w-full flex items-center justify-between p-4 hover:bg-red-500/10 transition-colors text-white hover:text-red-400"
            >
              <div className="flex items-center gap-3">
                <LogOut size={20} />
                <span className="font-semibold">Logout</span>
              </div>
              <ChevronDown size={20} />
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 mt-8 mb-4">
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
