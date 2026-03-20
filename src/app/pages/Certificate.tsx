import { ChevronLeft, Award, Star, CheckCircle, Loader2, Calendar, TrendingUp } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { LiveChatBox } from '../components/LiveChatBox';
import { BottomNavigation } from '../components/BottomNavigation';
import { Header } from '../components/Header';
import { useState, useEffect } from 'react';
import { projectId, publicAnonKey } from '@utils/supabase/info';
import { getCurrentUsername } from '../services/referralSystem';
import { buildLoginRedirectState } from '../services/loginRedirect';
import { fetchPublicVipConfig, type VipConfig } from '../services/vipConfig';
import logoImage from '../../assets/4b611159e2ff0ca97c6252bef878e480dedd2a43.png';
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
        fetchFinancialSummary(username),
        fetch(`${serverUrl}/transactions/${username}`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` },
        }),
        fetchPublicVipConfig(),
        fetchReferralSummary(username),
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

  const vipColors: Record<number, { from: string; to: string; border: string; badge: string }> = {
    1: { from: 'from-slate-500', to: 'to-slate-700', border: 'border-slate-400', badge: 'bg-slate-500' },
    2: { from: 'from-blue-500', to: 'to-blue-700', border: 'border-blue-400', badge: 'bg-blue-500' },
    3: { from: 'from-violet-500', to: 'to-violet-700', border: 'border-violet-400', badge: 'bg-violet-500' },
    4: { from: 'from-amber-500', to: 'to-amber-700', border: 'border-amber-400', badge: 'bg-amber-500' },
    5: { from: 'from-rose-500', to: 'to-rose-700', border: 'border-rose-400', badge: 'bg-rose-500' },
  };
  const colors = vipColors[userData?.vipLevel ?? 1] ?? vipColors[1];

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
            {/* Certificate Card */}
            <div className={`relative bg-gradient-to-br ${colors.from} ${colors.to} rounded-2xl p-1 shadow-2xl mb-6`}>
              <div className={`bg-white rounded-xl overflow-hidden border-2 ${colors.border}`}>
                {/* Certificate Header */}
                <div className={`bg-gradient-to-r ${colors.from} ${colors.to} px-6 py-5 flex items-center gap-4`}>
                  <img src={logoImage} alt="Steadfast" className="w-12 h-12 object-contain drop-shadow-lg" />
                  <div className="flex-1">
                    <p className="text-white/80 text-xs uppercase tracking-widest font-semibold">Steadfast Digital</p>
                    <h2 className="text-white text-xl font-bold">Certificate of Membership</h2>
                  </div>
                  <Award className="text-white/90" size={40} />
                </div>

                {/* Certificate Body */}
                <div className="px-8 py-6">
                  <p className="text-gray-400 text-xs uppercase tracking-widest text-center mb-1">This certifies that</p>
                  <h3 className="text-3xl font-bold text-center text-gray-800 mb-1">{userData.username}</h3>
                  <p className="text-gray-400 text-xs uppercase tracking-widest text-center mb-5">is an active member of the Steadfast Digital Platform</p>

                  {/* VIP Badge */}
                  <div className="flex justify-center mb-6">
                    <span className={`${colors.badge} text-white text-sm font-bold px-6 py-2 rounded-full flex items-center gap-2 shadow`}>
                      <Star size={14} />
                      {vipName}
                    </span>
                  </div>

                  {/* Stats Row */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center bg-gray-50 rounded-lg p-4">
                      <Calendar className="mx-auto mb-1 text-gray-400" size={20} />
                      <p className="text-xs text-gray-500 mb-1">Member Since</p>
                      <p className="text-sm font-bold text-gray-700">{memberSince}</p>
                    </div>
                    <div className="text-center bg-gray-50 rounded-lg p-4">
                      <CheckCircle className="mx-auto mb-1 text-green-500" size={20} />
                      <p className="text-xs text-gray-500 mb-1">Tasks Done</p>
                      <p className="text-2xl font-bold text-gray-800">{userData.tasksCompleted.toLocaleString()}</p>
                    </div>
                    <div className="text-center bg-gray-50 rounded-lg p-4">
                      <TrendingUp className="mx-auto mb-1 text-blue-500" size={20} />
                      <p className="text-xs text-gray-500 mb-1">Total Earned</p>
                      <p className="text-sm font-bold text-gray-800">${totalCommission.toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Certificate Footer */}
                  <div className="border-t border-gray-100 pt-4 text-center">
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest">
                      Issued by Steadfast Digital, Inc. · steadfastdigital.com
                    </p>
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