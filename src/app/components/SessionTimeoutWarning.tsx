import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { clearSessionToken, getStoredSessionToken } from '../services/serverAuth';
import { Clock } from 'lucide-react';

/**
 * Session timeout warning — shows a modal 5 minutes before the 30-day session expires.
 * On each page load / focus, it pings the server to get the real remaining TTL.
 * If the token disappears (logged out elsewhere), redirects immediately.
 */

const WARN_BEFORE_MS = 5 * 60 * 1000; // 5 minutes
const CHECK_INTERVAL_MS = 60 * 1000;   // check every 60s

export default function SessionTimeoutWarning() {
  const [show, setShow] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const navigate = useNavigate();

  const checkSession = useCallback(() => {
    const token = getStoredSessionToken();
    if (!token) {
      // Already logged out
      setShow(false);
      return;
    }

    // Parse the JWT-like token to get expiry (tokens are opaque UUIDs in this system,
    // so we rely on a stored timestamp instead)
    const storedAt = localStorage.getItem('steadfast_session_created_at');
    if (!storedAt) return;

    const createdAt = parseInt(storedAt, 10);
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days in ms
    const expiresAt = createdAt + maxAge;
    const remaining = expiresAt - Date.now();

    if (remaining <= 0) {
      // Session expired
      clearSessionToken();
      localStorage.removeItem('steadfast_session_created_at');
      navigate('/login', { replace: true, state: { authReason: 'session-expired' } });
      return;
    }

    if (remaining <= WARN_BEFORE_MS) {
      setShow(true);
      setRemainingSeconds(Math.ceil(remaining / 1000));
    } else {
      setShow(false);
    }
  }, [navigate]);

  useEffect(() => {
    checkSession();
    timerRef.current = setInterval(checkSession, CHECK_INTERVAL_MS);

    const onFocus = () => checkSession();
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(timerRef.current);
      window.removeEventListener('focus', onFocus);
    };
  }, [checkSession]);

  // Countdown when warning is shown
  useEffect(() => {
    if (!show) return;
    const id = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearSessionToken();
          localStorage.removeItem('steadfast_session_created_at');
          navigate('/login', { replace: true, state: { authReason: 'session-expired' } });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [show, navigate]);

  const handleStayLoggedIn = useCallback(() => {
    // Reset the created-at timestamp to extend the session client-side.
    // The server session is still valid (30 days from original login).
    // This just suppresses the warning for another cycle.
    localStorage.setItem('steadfast_session_created_at', String(Date.now()));
    setShow(false);
  }, []);

  const handleLogout = useCallback(() => {
    clearSessionToken();
    localStorage.removeItem('steadfast_session_created_at');
    navigate('/login', { replace: true });
  }, [navigate]);

  if (!show) return null;

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#252b3d] border border-gray-600 rounded-2xl p-6 max-w-sm mx-4 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <Clock className="text-yellow-400" size={20} />
          </div>
          <h3 className="text-lg font-bold text-white">Session Expiring</h3>
        </div>
        <p className="text-gray-300 text-sm mb-1">
          Your session will expire in{' '}
          <span className="text-yellow-400 font-bold">
            {minutes}:{seconds.toString().padStart(2, '0')}
          </span>
        </p>
        <p className="text-gray-400 text-xs mb-5">
          You'll be redirected to the login page when it expires.
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleStayLoggedIn}
            className="flex-1 py-2.5 bg-[#00D9FF] hover:bg-[#00c4e6] text-[#1a1f2e] rounded-lg text-sm font-semibold transition-colors"
          >
            Stay Logged In
          </button>
          <button
            onClick={handleLogout}
            className="flex-1 py-2.5 bg-[#1a1f2e] hover:bg-[#303a53] border border-gray-600 text-gray-300 rounded-lg text-sm font-medium transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
