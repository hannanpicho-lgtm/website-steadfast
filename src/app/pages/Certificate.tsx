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

const CERTIFICATE_USER_CACHE_KEY = 'certificate:user:v1';

export default function Certificate() {
  const navigate = useNavigate();
  const goBack = useBackNavigate();
  const location = useLocation();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
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
    try {
      const rawCached = localStorage.getItem(CERTIFICATE_USER_CACHE_KEY);
      if (rawCached) {
        const parsed = JSON.parse(rawCached) as UserData;
        if (parsed && typeof parsed.username === 'string') {
          setUserData(parsed);
          setLoading(false);
        }
      }
    } catch {
      // Ignore cache parse errors and continue with network fetch.
    }
    void fetchData(sessionUsername);
  }, [location.pathname, navigate, sessionUsername]);

  const fetchData = async (username: string) => {
    try {
      if (!userData) {
        setLoading(true);
      }
      setError(null);

      const user = await fetchFinancialSummary();
      setUserData(user as unknown as UserData);
      try {
        localStorage.setItem(CERTIFICATE_USER_CACHE_KEY, JSON.stringify(user));
      } catch {
        // Ignore localStorage errors.
      }
    } catch (err) {
      setError('Unable to load certificate data. Please try again.');
      console.error('Certificate fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a0a] pb-20" style={{ background: '#0a0a0a' }}>
      <Header onContactClick={() => setIsChatOpen(true)} />

      <div className="max-w-2xl mx-auto px-2 py-3 flex-1 w-full">
        {/* Back + Title */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={goBack} aria-label="Go back" className="btn-mobile-icon">
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-[#0066b3] flex-1 text-center mr-10">My Certificate</h1>
        </div>

        {loading && (
          <div className="bg-[#141414] border border-white/[0.06] rounded-xl p-6 space-y-4" style={{ background: '#141414' }}>
            <div className="h-6 w-48 bg-white/[0.08] rounded shimmer-line mx-auto" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <div className="h-40 w-full bg-white/[0.05] rounded shimmer-line" style={{ background: 'rgba(255,255,255,0.05)' }} />
            <div className="h-4 w-32 bg-white/[0.08] rounded shimmer-line mx-auto" style={{ background: 'rgba(255,255,255,0.08)' }} />
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
            <div className="rounded-2xl border border-slate-300/80 bg-gradient-to-b from-slate-100 to-slate-200 p-2 shadow-[0_16px_42px_-22px_rgba(15,23,42,0.55)]">
              <div className="rounded-xl border border-slate-400/70 bg-white p-1.5 shadow-inner">
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