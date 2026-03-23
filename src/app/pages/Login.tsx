import { AlertTriangle, Eye, EyeOff, Lock, ShieldAlert } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router';
import { useState, useEffect } from 'react';
import { projectId, publicAnonKey } from '@utils/supabase/info';
import steadfastLogo from '../../assets/4b611159e2ff0ca97c6252bef878e480dedd2a43.png';
import { signInAdmin } from '../services/supabaseAuth';
import { serverLogin } from '../services/serverAuth';
import { type LoginLocationState } from '../services/loginRedirect';

type LoginNoticeTone = 'info' | 'warning' | 'error';

type LoginNotice = {
  title: string;
  message: string;
  hint: string;
  tone: LoginNoticeTone;
};

function formatRouteLabel(pathname?: string): string | null {
  if (!pathname || pathname === '/login') {
    return null;
  }

  const formatted = pathname
    .replace(/^\//, '')
    .split('/')
    .filter(Boolean)
    .map((segment) => segment.replace(/-/g, ' '))
    .map((segment) => segment.replace(/\b\w/g, (char) => char.toUpperCase()))
    .join(' / ');

  return formatted || null;
}

function buildRouteNotice(state: LoginLocationState | null): LoginNotice | null {
  if (!state) {
    return null;
  }

  const destination = formatRouteLabel(state.from);

  if (state.authMessage) {
    return {
      title: 'Sign In Required',
      message: state.authMessage,
      hint: destination ? `Continue after sign-in to return to ${destination}.` : 'Sign in again to continue.',
      tone: 'warning',
    };
  }

  if (state.authReason === 'admin-access-required' || state.adminRequired) {
    return {
      title: 'Admin Access Required',
      message: destination
        ? `Use an authorized admin account to open ${destination}.`
        : 'Use an authorized admin account to continue.',
      hint: 'Admin sign-in requires a Supabase Auth email with admin or super_admin access.',
      tone: 'warning',
    };
  }

  if (state.authReason === 'session-expired') {
    return {
      title: 'Session Expired',
      message: 'Your session ended before the request could complete.',
      hint: destination ? `Sign in again to continue to ${destination}.` : 'Sign in again to continue.',
      tone: 'warning',
    };
  }

  if (state.authReason === 'sign-in-required' || state.from) {
    return {
      title: 'Sign In Required',
      message: destination ? `Sign in to continue to ${destination}.` : 'Sign in to continue.',
      hint: 'Your destination will open after a successful sign-in.',
      tone: 'info',
    };
  }

  return null;
}

function buildLoginErrorNotice(error: string, isAdminAttempt: boolean): LoginNotice {
  const normalized = error.trim().toLowerCase();

  if (normalized.includes('invalid login credentials')) {
    return {
      title: isAdminAttempt ? 'Admin Sign-In Failed' : 'Sign-In Failed',
      message: isAdminAttempt ? 'The admin email or password is incorrect.' : 'The username or password is incorrect.',
      hint: 'Check your credentials carefully or use password reset if you no longer know them.',
      tone: 'error',
    };
  }

  if (normalized.includes('not authorized')) {
    return {
      title: 'Admin Access Denied',
      message: 'This account signed in successfully but does not have admin permissions.',
      hint: 'Use an account with app_metadata.role set to admin or super_admin.',
      tone: 'error',
    };
  }

  if (normalized.includes('valid admin email')) {
    return {
      title: 'Admin Email Required',
      message: 'Admin access only accepts a valid email address.',
      hint: 'Enter the full admin email address used in Supabase Auth.',
      tone: 'error',
    };
  }

  return {
    title: isAdminAttempt ? 'Admin Sign-In Failed' : 'Sign-In Failed',
    message: error,
    hint: isAdminAttempt
      ? 'If this persists, confirm the account is active in Supabase Auth and has the correct admin role.'
      : 'Try again or contact support if you cannot access your account.',
    tone: 'error',
  };
}

function getNoticeClasses(tone: LoginNoticeTone): string {
  if (tone === 'error') {
    return 'border-red-200 bg-red-50 text-red-900';
  }

  if (tone === 'warning') {
    return 'border-amber-200 bg-amber-50 text-amber-900';
  }

  return 'border-sky-200 bg-sky-50 text-sky-900';
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberPassword, setRememberPassword] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorText, setErrorText] = useState('');
  const [loginTarget, setLoginTarget] = useState('/home');
  const [telegramUrl, setTelegramUrl] = useState('https://t.me/steadfastdigital');

  useEffect(() => {
    const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a1c55d7e`;
    fetch(`${serverUrl}/cs/support-links`, {
      headers: { Authorization: `Bearer ${publicAnonKey}` },
    })
      .then((r) => r.json())
      .then((payload) => {
        if (typeof payload?.telegramUsername === 'string' && payload.telegramUsername) {
          const u = payload.telegramUsername;
          setTelegramUrl(u.startsWith('http') ? u : `https://t.me/${u}`);
        }
      })
      .catch(() => {});
  }, []);
  const loginState = (location.state as LoginLocationState | null) ?? null;
  const adminRequired = Boolean(loginState?.adminRequired);
  const routeNotice = buildRouteNotice(loginState);
  const isAdminAttempt = adminRequired || username.trim().includes('@');
  const errorNotice = errorText ? buildLoginErrorNotice(errorText, isAdminAttempt) : null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText('');

    const from = loginState?.from;
    const normalizedIdentifier = username.trim().toLowerCase();
    const wantsAdminAccess = adminRequired || from === '/admin';
    const isLikelyAdminIdentifier = normalizedIdentifier.includes('@');

    if (wantsAdminAccess || isLikelyAdminIdentifier) {
      const adminResult = await signInAdmin(username, password);
      if (!adminResult.ok) {
        setErrorText(adminResult.error);
        return;
      }

      setLoginTarget('/admin');
      setShowWelcome(true);
      return;
    }

    // 1. Try server-backed authentication (works cross-domain, survives cache clears)
    const serverResult = await serverLogin(username, password);
    if (serverResult.ok) {
      setLoginTarget(serverResult.mustChangePassword ? '/profile?forcePasswordChange=1' : (from && from !== '/login' ? from : '/home'));
      setShowWelcome(true);
      return;
    }

    if (serverResult.serverDown) {
      setErrorText('Login service is temporarily unavailable. Please try again in a moment.');
      return;
    }

    // Server responded with an explicit auth error
    setErrorText(serverResult.error ?? 'Login failed.');
  };

  const handleWelcomeClose = () => {
    setShowWelcome(false);
    navigate(loginTarget, { replace: true });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Dark Header */}
      <header className="bg-[#3d4551] py-6 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-white text-sm mb-4">Welcome to</p>
          <div className="flex items-center justify-center gap-3">
            <img 
              src={steadfastLogo} 
              alt="Steadfast Digital Logo" 
              className="w-12 h-12 object-contain"
            />
            <span className="text-white text-3xl font-bold tracking-tight">
              STEADFAST
            </span>
          </div>
        </div>
      </header>

      {/* Form Section */}
      <div className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-[#005a87] text-3xl font-bold text-center mb-2">Sign In</h1>
        <p className="text-[#3d4551] text-center text-sm mb-8">
          {adminRequired
            ? 'Admin access now requires a Supabase Auth admin account.'
            : 'Enter your username and password to access'}
        </p>

        {routeNotice ? (
          <div className={`max-w-xl mx-auto mb-5 rounded-2xl border px-4 py-4 ${getNoticeClasses(routeNotice.tone)}`}>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0">
                {routeNotice.tone === 'warning' ? <ShieldAlert size={20} /> : <Lock size={20} />}
              </div>
              <div>
                <h2 className="text-sm font-bold uppercase tracking-[0.14em]">{routeNotice.title}</h2>
                <p className="mt-1 text-sm">{routeNotice.message}</p>
                <p className="mt-2 text-xs opacity-80">{routeNotice.hint}</p>
              </div>
            </div>
          </div>
        ) : null}

        <form onSubmit={handleLogin} className="space-y-5 max-w-xl mx-auto">
          {/* Username/Phone */}
          <div>
            <input
              type="text"
              placeholder={adminRequired ? 'Admin email address' : 'Username/Phone'}
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setErrorText('');
              }}
              className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-[#005a87] focus:outline-none text-[#3d4551] placeholder-gray-400"
              required
            />
          </div>

          {/* Password */}
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrorText('');
              }}
              className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-[#005a87] focus:outline-none text-[#3d4551] placeholder-gray-400"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {/* Forgot Password & Remember Password */}
          <div className="flex items-center justify-between">
            <a
              href={telegramUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-[#005a87] hover:underline"
            >
              Forgot your password?
            </a>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberPassword}
                onChange={(e) => setRememberPassword(e.target.checked)}
                className="w-4 h-4 text-[#005a87] border-gray-300 rounded focus:ring-[#005a87]"
              />
              <span className="text-sm text-[#3d4551]">Remember Password</span>
            </label>
          </div>

          {/* Sign In Button */}
          <button
            type="submit"
            className="w-full bg-[#005a87] hover:bg-[#004a6f] text-white font-bold py-3 px-4 rounded-lg transition-colors uppercase tracking-wide"
          >
            SIGN IN
          </button>

          {errorNotice ? (
            <div className={`rounded-2xl border px-4 py-4 ${getNoticeClasses(errorNotice.tone)}`} role="alert">
              <div className="flex items-start gap-3">
                <AlertTriangle size={20} className="mt-0.5 shrink-0" />
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-[0.14em]">{errorNotice.title}</h2>
                  <p className="mt-1 text-sm">{errorNotice.message}</p>
                  <p className="mt-2 text-xs opacity-80">{errorNotice.hint}</p>
                </div>
              </div>
            </div>
          ) : null}

          <p className="text-center text-xs text-gray-500">
            Secure admin access requires a real Supabase Auth admin email with app_metadata.role = admin or super_admin.
          </p>

          {/* Sign Up Link */}
          <p className="text-center text-sm text-[#3d4551]">
            Don't have an account yet?{' '}
            <Link to="/signup" className="text-[#005a87] font-semibold hover:underline">
              Sign Up
            </Link>
          </p>

          {/* Support Link */}
          <p className="text-center text-sm text-[#3d4551]">
            Can't sign in?{' '}
            <a
              href={telegramUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[#005a87] font-semibold hover:underline"
            >
              Contact our user support
            </a>
          </p>
        </form>
      </div>

      {/* Footer */}
      <footer className="bg-[#3d4551] py-4 px-6 fixed bottom-0 left-0 right-0">
        <p className="text-center text-white text-xs">
          © 2026 Steadfast Digital, Inc. All rights reserved
        </p>
      </footer>

      {/* Welcome Modal */}
      {showWelcome && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full text-center">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-[#005a87] rounded-full mb-4">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold mb-2 text-[#3d4551]">Welcome!</h2>
              <p className="text-gray-600">You have successfully signed in to Steadfast Digital</p>
            </div>
            
            <button
              onClick={handleWelcomeClose}
              className="w-full bg-[#005a87] hover:bg-[#004a6f] text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
