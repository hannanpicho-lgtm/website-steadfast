import { ChevronLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { useBackNavigate } from '../hooks/useBackNavigate';
import { BottomNavigation } from '../components/BottomNavigation';
import { Header } from '../components/Header';
import { useState, useEffect, lazy, Suspense } from 'react';
const LiveChatBox = lazy(() => import('../components/LiveChatBox').then(m => ({ default: m.LiveChatBox })));
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
  const goBack = useBackNavigate();
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
  // vipName, memberSince, totalCommission, referralEarnings reserved for future certificate display
  void vipConfig;


  return (
    <div className="size-full overflow-auto bg-[#0a0a0a] pb-20">
      <Header onContactClick={() => setIsChatOpen(true)} />

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Back + Title */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={goBack} aria-label="Go back" className="btn-mobile-icon">
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-[#0066b3] flex-1 text-center mr-10">My Certificate</h1>
        </div>

        {loading && (
          <div className="bg-[#141414] border border-white/[0.06] rounded-xl p-6 space-y-4">
            <div className="h-6 w-48 bg-white/[0.08] rounded shimmer-line mx-auto" />
            <div className="h-40 w-full bg-white/[0.05] rounded shimmer-line" />
            <div className="h-4 w-32 bg-white/[0.08] rounded shimmer-line mx-auto" />
          </div>
        )}

        {error && !loading && (
          <div className="bg-red-900/20 border border-red-800/30 rounded-lg p-6 text-center text-red-400">
            {error}
          </div>
        )}

        {!loading && !error && userData && (
          <>
            {/* Official Certificate */}
            <div className="mb-6 rounded-2xl border border-slate-300/80 bg-gradient-to-b from-slate-100 to-slate-200 p-3 shadow-[0_16px_42px_-22px_rgba(15,23,42,0.55)]">
              <div className="rounded-xl border border-slate-400/70 bg-white p-2 shadow-inner">
                <div className="overflow-hidden rounded-lg border-2 border-slate-500/60 bg-white">
                  <img
                    src="/certificate-official.webp"
                    alt="Official business certificate"
                    width={800}
                    height={600}
                    className="block h-auto w-full"
                    loading="eager"
                    decoding="async"
                  />
                </div>
              </div>
            </div>
          </>
        )}

        <div className="text-center text-xs text-gray-400 mt-8 mb-4">
          © 2026 Steadfast Digital, Inc. All rights reserved
        </div>
      </div>

      <BottomNavigation />
      <Suspense fallback={null}>
        <LiveChatBox isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      </Suspense>
    </div>
  );
}