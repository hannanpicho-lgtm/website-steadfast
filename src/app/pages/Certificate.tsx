import { ChevronLeft, Loader2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { LiveChatBox } from '../components/LiveChatBox';
import { BottomNavigation } from '../components/BottomNavigation';
import { Header } from '../components/Header';
import { useState, useEffect } from 'react';
import { projectId, publicAnonKey } from '@utils/supabase/info';
import { getCurrentUsername } from '../services/referralSystem';
import { buildLoginRedirectState } from '../services/loginRedirect';
import { fetchPublicVipConfig, type VipConfig } from '../services/vipConfig';
import { fetchReferralSummary } from '../services/referralReadModel';
import { fetchFinancialSummary } from '../services/financialReadModel';

interface UserData {
  username: string;
  vipLevel: number;
  balance: number;
  tasksCompleted: number;
  tasksLimit: number;
  todayCommission: number;
  createdAt: string;
}

export default function Certificate() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [totalCommission, setTotalCommission] = useState(0);
  const [referralEarnings, setReferralEarnings] = useState(0);
  const [vipConfigurations, setVipConfigurations] = useState<VipConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sessionUsername = getCurrentUsername();
  const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a1c55d7e`;

  useEffect(() => {
    if (!sessionUsername) {
      navigate('/login', {
        replace: true,
        state: buildLoginRedirectState(location.pathname, {
          authReason: 'session-expired',
          authMessage: 'Your session ended. Please sign in again to view your certificate.',
        }),
      });
      return;
    }
    void fetchData(sessionUsername);
  }, [location.pathname, navigate, sessionUsername]);

  const fetchData = async (username: string) => {
    try {
      setLoading(true);
      setError(null);

      const [user, txRes, vipConfig, referralSummary] = await Promise.all([
        fetchFinancialSummary(),
        fetch(`${serverUrl}/me/transactions`, {
          credentials: 'include',
          headers: { 'Authorization': `Bearer ${publicAnonKey}` },
        }),
        fetchPublicVipConfig(),
        fetchReferralSummary(),
      ]);

      setUserData(user as unknown as UserData);
      setVipConfigurations(vipConfig);
      setReferralEarnings(Number(referralSummary.referralEarnings ?? 0));

      if (txRes.ok) {
        const txList: Array<{ type: string; amount: number; status: string }> = await txRes.json();
        const earned = Array.isArray(txList)
          ? txList
              .filter((t) => t.type === 'Commission' && t.status === 'Completed')
              .reduce((sum, t) => sum + t.amount, 0)
          : 0;
        setTotalCommission(earned);
      }
    } catch (err) {
      setError('Unable to load certificate data. Please try again.');
      console.error('Certificate fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const vipConfig = vipConfigurations.find((v) => v.level === (userData?.vipLevel ?? 1));
  const vipName = vipConfig?.name ?? `VIP ${userData?.vipLevel ?? 1}`;
  const memberSince = userData?.createdAt
    ? new Date(userData.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—';

  const formatLicenseDate = (dateValue: string): string => {
    const parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) {
      return '-- -- --';
    }
    const mm = String(parsed.getMonth() + 1).padStart(2, '0');
    const dd = String(parsed.getDate()).padStart(2, '0');
    const yy = String(parsed.getFullYear()).slice(-2);
    return `${mm} ${dd} ${yy}`;
  };

  const usernameSeed = (userData?.username ?? sessionUsername ?? 'steadfast')
    .split('')
    .reduce((sum, ch, index) => sum + (ch.charCodeAt(0) * (index + 7)), 0);
  const uniqueIdNumber = String(7000000000 + (usernameSeed % 2999999999));
  const controlNumber = String(1000000 + (usernameSeed % 8999999));
  const effectiveDateRaw = userData?.createdAt || new Date().toISOString();
  const expirationDateRaw = (() => {
    const base = new Date(effectiveDateRaw);
    if (Number.isNaN(base.getTime())) {
      return new Date().toISOString();
    }
    const expiry = new Date(base);
    expiry.setFullYear(expiry.getFullYear() + 2);
    return expiry.toISOString();
  })();

  return (
    <div className="size-full overflow-auto bg-gray-50 pb-20">
      <Header onContactClick={() => setIsChatOpen(true)} />

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Back + Title */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate(-1)} className="btn-mobile-icon">
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-[#0066b3] flex-1 text-center mr-10">My Certificate</h1>
        </div>

        {loading && (
          <div className="flex flex-col items-center py-20 gap-4">
            <Loader2 className="animate-spin text-[#0066cc]" size={40} />
            <p className="text-gray-500 text-sm">Loading your certificate…</p>
          </div>
        )}

        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center text-red-600">
            {error}
          </div>
        )}

        {!loading && !error && userData && (
          <>
            {/* Official Certificate */}
            <div className="mb-6 rounded-lg border border-gray-300 bg-[#dcdcdc] p-4 shadow-sm">
              <div className="border border-gray-500 bg-[#efefef] p-4 text-gray-800">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="tracking-wide">UNIQUE ID NUMBER</p>
                    <p className="text-xl font-bold tracking-wider">{uniqueIdNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="tracking-wide">FOR OFFICE USE ONLY</p>
                    <p className="text-sm">Control No.</p>
                    <p className="text-3xl font-bold tracking-wider">{controlNumber}</p>
                  </div>
                </div>

                <div className="mt-4 text-center">
                  <p className="text-2xl font-semibold italic">State of New York</p>
                  <p className="text-3xl font-semibold italic">Department of State</p>
                  <p className="text-xl font-bold tracking-wide">DIVISION OF LICENSING SERVICES</p>
                </div>

                <div className="mt-6 text-center">
                  <p className="text-lg font-bold tracking-widest">ARTICLE 203 OF THE LLC LIMITED LIABILITY COMPANY LAW</p>
                  <p className="mt-5 text-3xl font-extrabold tracking-wide">STEADFAST DIGITAL, INC.</p>
                  <p className="text-lg font-bold tracking-wide">425 E 53RD ST, NEW YORK</p>
                  <p className="text-lg font-bold tracking-wide">NY 10022</p>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4 text-sm font-semibold">
                  <div>
                    <p>HAS BEEN DULY LICENSED TO TRANSACT BUSINESS AS A</p>
                    <p>DOMESTIC BUSINESS CORPORATION</p>
                    <p className="mt-4 text-xs font-medium">Issued to account: {userData.username}</p>
                    <p className="mt-2 text-xs font-medium">VIP Level: {vipName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs">EFFECTIVE DATE</p>
                    <p className="text-lg tracking-[0.2em]">{formatLicenseDate(effectiveDateRaw)}</p>
                    <p className="mt-3 text-xs">EXPIRATION DATE</p>
                    <p className="text-lg tracking-[0.2em]">{formatLicenseDate(expirationDateRaw)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Info */}
            <div className="bg-white rounded-xl shadow-sm p-5 space-y-3">
              <h4 className="font-semibold text-gray-700">Account Summary</h4>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Current Balance</span>
                <span className="font-bold text-green-600">${userData.balance.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Today's Commission</span>
                <span className="font-bold text-blue-600">${userData.todayCommission.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Referral Earnings</span>
                <span className="font-bold text-purple-600">${referralEarnings.toFixed(2)}</span>
              </div>
            </div>
          </>
        )}

        <div className="text-center text-xs text-gray-400 mt-8 mb-4">
          © 2026 Steadfast Digital, Inc. All rights reserved
        </div>
      </div>

      <BottomNavigation />
      <LiveChatBox isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  );
}