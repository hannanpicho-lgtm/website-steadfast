import { AlertTriangle, Eye, EyeOff, Lock, Loader2, ShieldAlert } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router';
import { useState, useEffect } from 'react';
import { projectId, publicAnonKey } from '@utils/supabase/info';
import steadfastLogo from '../../assets/4b611159e2ff0ca97c6252bef878e480dedd2a43.png';
import { signInAdmin } from '../services/supabaseAuth';
import { warmApiCompatibilityState } from '../services/apiCompatibility';
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
  const [isSubmitting, setIsSubmitting] = useState(false);
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
  const [showSignInForm, setShowSignInForm] = useState(false);

  useEffect(() => {
    if (adminRequired || routeNotice || errorNotice) {
      setShowSignInForm(true);
    }
  }, [adminRequired, routeNotice, errorNotice]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText('');
    setIsSubmitting(true);

    const from = loginState?.from;
    const normalizedIdentifier = username.trim().toLowerCase();
    const wantsAdminAccess = adminRequired || from === '/admin';
    const isLikelyAdminIdentifier = normalizedIdentifier.includes('@');

    if (wantsAdminAccess || isLikelyAdminIdentifier) {
      const adminResult = await signInAdmin(username, password);
      if (!adminResult.ok) {
        setErrorText(adminResult.error);
        setIsSubmitting(false);
        return;
      }

      setLoginTarget('/admin');
      setShowWelcome(true);
      void warmApiCompatibilityState();
      return;
    }

    // 1. Try server-backed authentication (works cross-domain, survives cache clears)
    const serverResult = await serverLogin(username, password);
    if (serverResult.ok) {
      setLoginTarget(serverResult.mustChangePassword ? '/profile?forcePasswordChange=1' : (from && from !== '/login' ? from : '/home'));
      setShowWelcome(true);
      void warmApiCompatibilityState();
      return;
    }

    if (serverResult.serverDown) {
      setErrorText('Login service is temporarily unavailable. Please try again in a moment.');
      setIsSubmitting(false);
      return;
    }

    // Server responded with an explicit auth error
    setErrorText(serverResult.error ?? 'Login failed.');
    setIsSubmitting(false);
  };

  const handleWelcomeClose = () => {
    setShowWelcome(false);
    navigate(loginTarget, { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(145deg, #080f1c 0%, #091628 55%, #060e1c 100%)' }}>
      {/* Ambient glow orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-48 -right-48 w-96 h-96 rounded-full opacity-[0.07]" style={{ background: '#00D9FF', filter: 'blur(80px)' }} />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full opacity-[0.05]" style={{ background: '#5dade2', filter: 'blur(70px)' }} />
      </div>

      <main className="relative z-10 flex-1 w-full max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-10 flex flex-col items-center">
        <div className="w-full max-w-[560px] text-center">
          {/* Logo + brand */}
          <div className="pt-6 sm:pt-10 flex flex-col items-center sf-stagger-1">
            <div className="relative mb-4">
              <div className="absolute inset-0 rounded-full blur-2xl opacity-30" style={{ background: '#00D9FF' }} />
              <img
                src={steadfastLogo}
                alt="Steadfast Digital Logo"
                width={96}
                height={96}
                className="relative z-10 w-20 h-20 sm:w-24 sm:h-24 object-contain"
              />
            </div>
            <h1 className="text-[2.2rem] sm:text-[2.6rem] font-extrabold tracking-tight" style={{ background: 'linear-gradient(135deg, #ffffff 30%, #7fdeff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              STEADFAST
            </h1>
            <p className="text-[#00D9FF]/70 text-base -mt-1 tracking-[0.22em] uppercase text-xs font-semibold">Digital</p>
            <p className="mt-5 text-[clamp(1.5rem,3vw,2.4rem)] font-bold tracking-tight text-white/90">Creating Real Business Value</p>
          </div>

          {/* Action buttons */}
          <div className="mt-12 sm:mt-14 space-y-3 sf-stagger-2">
            <Link
              to="/signup"
              className="block w-full rounded-2xl font-bold text-xl sm:text-2xl py-4 transition-all duration-200 hover:brightness-110 hover:scale-[1.01] sf-pulse-glow"
              style={{ background: 'linear-gradient(135deg, #00D9FF, #0099cc)', color: '#060e1c' }}
            >
              CREATE AN ACCOUNT
            </Link>
            <button
              type="button"
              onClick={() => setShowSignInForm((prev) => !prev)}
              className="block w-full rounded-2xl font-bold text-xl sm:text-2xl py-4 transition-all duration-200 hover:brightness-110"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }}
            >
              SIGN IN
            </button>
          </div>
        </div>

        {showSignInForm ? (
          <section
            className="w-full max-w-[560px] mt-6 rounded-2xl p-5 sm:p-7"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', boxShadow: '0 16px 48px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04)' }}
          >
            <h2 className="text-[#00D9FF] text-2xl font-bold text-center mb-1">Sign In</h2>
            <p className="text-white/45 text-center text-sm mb-6">
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

            <form onSubmit={handleLogin} className="space-y-4 max-w-xl mx-auto">
          {/* Username/Phone */}
          <div>
            <input
              type="text"
              placeholder={adminRequired ? 'Admin email address' : 'Username / Phone'}
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setErrorText('');
              }}
              className="w-full px-4 py-3 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/40"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
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
              className="w-full px-4 py-3 pr-12 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/40"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)} aria-label="Toggle password visibility"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/35 hover:text-white/70 transition-colors"
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
              className="text-sm text-[#00D9FF]/70 hover:text-[#00D9FF] transition-colors"
            >
              Forgot your password?
            </a>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberPassword}
                onChange={(e) => setRememberPassword(e.target.checked)}
                className="w-4 h-4 rounded accent-[#00D9FF]"
              />
              <span className="text-sm text-white/50">Remember me</span>
            </label>
          </div>

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full font-bold py-3 px-4 rounded-xl transition-all duration-200 uppercase tracking-wider hover:brightness-110 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #00D9FF, #0099cc)', color: '#060e1c', boxShadow: '0 4px 20px rgba(0,217,255,0.25)' }}
          >
            {isSubmitting ? <><Loader2 size={18} className="animate-spin" /> Signing in...</> : 'SIGN IN'}
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

          {/* Sign Up Link */}
          <p className="text-center text-sm text-white/40">
            Don't have an account yet?{' '}
            <Link to="/signup" className="text-[#00D9FF] font-semibold hover:underline">
              Sign Up
            </Link>
          </p>

          {/* Support Link */}
          <p className="text-center text-sm text-white/40">
            Can't sign in?{' '}
            <a
              href={telegramUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[#00D9FF] font-semibold hover:underline"
            >
              Contact support
            </a>
          </p>
            </form>
          </section>
        ) : null}
      </main>

      <footer className="relative z-10 py-4 px-6">
        <p className="text-center text-white/25 text-[13px]">© 2026 Steadfast Digital, Inc. All rights reserved</p>
      </footer>

      {/* Welcome Modal */}
      {showWelcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(6,14,28,0.88)', backdropFilter: 'blur(12px)' }}>
          <div className="rounded-2xl p-8 max-w-md w-full text-center sf-stagger-1" style={{ background: 'linear-gradient(145deg, #0d1b2e, #111d30)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 60px rgba(0,217,255,0.08)' }}>
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 sf-pulse-glow" style={{ background: 'linear-gradient(135deg, #00D9FF22, #00D9FF11)', border: '1px solid rgba(0,217,255,0.3)' }}>
                <svg className="w-10 h-10" fill="none" stroke="#00D9FF" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold mb-2 text-white">Welcome!</h2>
              <p className="text-white/50">You've successfully signed in to Steadfast Digital</p>
            </div>

            <button
              onClick={handleWelcomeClose}
              className="w-full font-bold py-3 px-6 rounded-xl transition-all duration-200 hover:brightness-110"
              style={{ background: 'linear-gradient(135deg, #00D9FF, #0099cc)', color: '#060e1c', boxShadow: '0 4px 20px rgba(0,217,255,0.3)' }}
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
