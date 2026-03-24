import { ArrowLeft, User, Link as LinkIcon, Users, Bell, Globe, LogOut, ChevronDown, Copy, MessageSquare, HelpCircle } from 'lucide-react';
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

export default function Profile() {
  const navigate = useNavigate();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [accountInfoOpen, setAccountInfoOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [securityCredentialsOpen, setSecurityCredentialsOpen] = useState(false);
  const [todayProfit, setTodayProfit] = useState<number>(0);
  const [totalCommission, setTotalCommission] = useState<number>(0);
  const [referralCode, setReferralCode] = useState('STF01');
  const [financialSummary, setFinancialSummary] = useState<FinancialSummaryResponse | null>(null);
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
        const [userRes, referralSummary] = await Promise.all([
          fetchFinancialSummary(),
          fetchReferralSummary(),
        ]);

        setFinancialSummary(userRes);
        setTodayProfit(Number(userRes.todayCommission ?? 0));
        setTotalCommission(Number(referralSummary.referralEarnings ?? 0));
        setReferralCode(String(referralSummary.invitationCode ?? 'STF01'));
      } catch {
        // silently ignore — values stay at 0
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

  return (
    <div className="size-full overflow-auto pb-20 bg-gray-50">
      {/* Header */}
      <header className="bg-white text-[#0066cc] py-4 px-6 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <Link to="/starting">
          <ArrowLeft size={24} className="cursor-pointer hover:text-[#0055aa]" />
        </Link>
        <h1 className="text-xl font-bold">My Profile</h1>
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
              className="w-24 h-24 rounded-full object-cover bg-gray-200"
            />
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-sm text-[#0066cc] flex items-center gap-1 hover:underline"
          >
            <span>✏️</span>
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
        <div className="bg-gradient-to-r from-[#0066cc] to-[#0088ee] rounded-lg p-6 text-white mb-6 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm opacity-90">Hello,</p>
              <h2 className="text-2xl font-bold">{username ?? 'User'}</h2>
            </div>
            <div className="bg-white/15 border border-white/30 rounded-full px-3 py-1 text-sm font-semibold">
              VIP {vipLevel}
            </div>
          </div>

          <div className="mb-4">
            <p className="text-xs opacity-90">Available Balance</p>
            <p className="text-2xl font-bold">${Number(financialSummary?.availableAmount ?? 0).toFixed(2)}</p>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="flex flex-col items-center">
              <p className="text-xs opacity-90 mb-1">My Referral Code</p>
              <div className="flex items-center gap-2">
                <p className="text-lg font-bold">{referralCode || '—'}</p>
                <button onClick={handleCopyReferral} className="hover:opacity-80">
                  <Copy size={16} />
                </button>
              </div>
            </div>
            <div className="flex flex-col items-center border-l border-r border-white/30">
              <p className="text-xs opacity-90 mb-1">Today's Profit (USD)</p>
              <p className="text-lg font-bold">{todayProfit.toFixed(2)}</p>
            </div>
            <div className="flex flex-col items-center">
              <p className="text-xs opacity-90 mb-1">Total Commission (USD)</p>
              <p className="text-lg font-bold">{totalCommission.toFixed(2)}</p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Credit Score:</span>
            <div className="flex-1 mx-4 bg-white/20 rounded-full h-2 overflow-hidden">
              <div className="bg-white h-full rounded-full" style={{ width: `${creditScore}%` }}></div>
            </div>
            <span className="text-sm font-bold flex items-center gap-1">
              {creditScore}%
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-orange-400">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
              </svg>
            </span>
          </div>
        </div>

        {/* My Profile Section */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-[#0066cc] mb-3">My Profile</h3>

          {mustChangePassword ? (
            <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
              <p className="text-sm font-semibold">Password update required</p>
              <p className="mt-1 text-xs">Your credentials were reset by admin. Update your login and transaction passwords now.</p>
            </div>
          ) : null}

          {/* Account Info */}
          <div className="bg-white rounded-lg mb-3 shadow-sm overflow-hidden">
            <button 
              onClick={() => setAccountInfoOpen(!accountInfoOpen)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
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
              <div className="px-4 pb-4 border-t border-gray-100">
                <div className="py-2">
                  <p className="text-sm text-gray-600 mb-1">Username</p>
                  <p className="font-semibold">{username ?? 'ugreen'}</p>
                </div>
                <div className="py-2">
                  <p className="text-sm text-gray-600 mb-1">VIP Level</p>
                  <p className="font-semibold">VIP {vipLevel}</p>
                </div>
                <div className="py-2">
                  <p className="text-sm text-gray-600 mb-1">Registration Date</p>
                  <p className="font-semibold">{financialSummary?.createdAt ? new Date(financialSummary.createdAt).toLocaleDateString() : 'Not available'}</p>
                </div>
                <div className="py-2">
                  <p className="text-sm text-gray-600 mb-1">Email</p>
                  <p className="font-semibold">Not provided</p>
                </div>
              </div>
            )}
          </div>

          {/* Bind Wallet */}
          <div className="bg-white rounded-lg mb-3 shadow-sm overflow-hidden">
            <button 
              onClick={() => navigate('/connect-wallet')}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <LinkIcon size={20} />
                <span className="font-semibold">Bind Wallet</span>
              </div>
            </button>
          </div>
        </div>

        {/* My Financial Section */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-[#0066cc] mb-3">My Financial</h3>
          
          {/* Deposit */}
          <div className="bg-white rounded-lg mb-3 shadow-sm overflow-hidden">
            <button 
              onClick={() => navigate('/deposit')}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="5" width="20" height="14" rx="2"/>
                  <line x1="2" y1="10" x2="22" y2="10"/>
                </svg>
                <span className="font-semibold">Deposit</span>
              </div>
            </button>
          </div>

          {/* Withdraw */}
          <div className="bg-white rounded-lg mb-3 shadow-sm overflow-hidden">
            <button 
              onClick={() => navigate('/withdrawal')}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                <span className="font-semibold">Withdraw</span>
              </div>
            </button>
          </div>
        </div>

        {/* Other Section */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-[#0066cc] mb-3">Other</h3>
          
          {/* Notifications */}
          <div className="bg-white rounded-lg mb-3 shadow-sm overflow-hidden">
            <button 
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
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
              <div className="px-4 pb-4 border-t border-gray-100">
                <p className="text-sm text-gray-600">No new notifications</p>
              </div>
            )}
          </div>

          {/* Customer Support */}
          <div className="bg-white rounded-lg mb-3 shadow-sm">
            <Link
              to="/support"
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <MessageSquare size={20} className="text-blue-500" />
                <span className="font-semibold">Customer Support</span>
              </div>
              <ChevronDown size={20} className="rotate-[-90deg]" />
            </Link>
          </div>

          {/* FAQs */}
          <div className="bg-white rounded-lg mb-3 shadow-sm">
            <Link
              to="/faqs"
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <HelpCircle size={20} />
                <span className="font-semibold">Help & FAQs</span>
              </div>
              <ChevronDown size={20} className="rotate-[-90deg]" />
            </Link>
          </div>

          {/* Change Language */}
          <div className="bg-white rounded-lg mb-3 shadow-sm overflow-hidden">
            <button 
              onClick={() => setLanguageOpen(!languageOpen)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
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
              <div className="px-4 pb-4 border-t border-gray-100">
                <div className="space-y-2">
                  <button className="block w-full text-left py-2 px-3 rounded hover:bg-gray-50 font-semibold text-[#0066cc]">English</button>
                  <button className="block w-full text-left py-2 px-3 rounded hover:bg-gray-50">Español</button>
                  <button className="block w-full text-left py-2 px-3 rounded hover:bg-gray-50">中文</button>
                  <button className="block w-full text-left py-2 px-3 rounded hover:bg-gray-50">Français</button>
                  <button className="block w-full text-left py-2 px-3 rounded hover:bg-gray-50">Deutsch</button>
                  <button className="block w-full text-left py-2 px-3 rounded hover:bg-gray-50">Português</button>
                  <button className="block w-full text-left py-2 px-3 rounded hover:bg-gray-50">العربية</button>
                  <button className="block w-full text-left py-2 px-3 rounded hover:bg-gray-50">हिन्दी</button>
                  <button className="block w-full text-left py-2 px-3 rounded hover:bg-gray-50">Bahasa Indonesia</button>
                  <button className="block w-full text-left py-2 px-3 rounded hover:bg-gray-50">日本語</button>
                  <button className="block w-full text-left py-2 px-3 rounded hover:bg-gray-50">한국어</button>
                  <button className="block w-full text-left py-2 px-3 rounded hover:bg-gray-50">Русский</button>
                  <button className="block w-full text-left py-2 px-3 rounded hover:bg-gray-50">Türkçe</button>
                  <button className="block w-full text-left py-2 px-3 rounded hover:bg-gray-50">Tiếng Việt</button>
                  <button className="block w-full text-left py-2 px-3 rounded hover:bg-gray-50">ภาษาไทย</button>
                </div>
              </div>
            )}
          </div>

          {/* Logout */}
          <div className="bg-white rounded-lg shadow-sm">
            <Link
              to="/login"
              onClick={() => logoutCurrentUser()}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
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
