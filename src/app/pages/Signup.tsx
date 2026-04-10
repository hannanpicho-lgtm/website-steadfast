import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Link } from 'react-router';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import steadfastLogo from '../../assets/4b611159e2ff0ca97c6252bef878e480dedd2a43.png';
import { serverLogin, serverSignup } from '../services/serverAuth';
import { projectId, publicAnonKey } from '@utils/supabase/info';

export default function Signup() {
  const navigate = useNavigate();
  const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a1c55d7e`;
  const [showTransactionPassword, setShowTransactionPassword] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [gender, setGender] = useState('male');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [transactionPassword, setTransactionPassword] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [adminCodeStatus, setAdminCodeStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [errorText, setErrorText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isValidUsername = (value: string) => /^[a-zA-Z0-9_.\-]{1,64}$/.test(value);

  const validateAdminCode = async (code: string) => {
    const normalized = code.trim().toUpperCase();
    if (!normalized) {
      setAdminCodeStatus('idle');
      return;
    }
    if (!/^[A-Z0-9]{5}$/.test(normalized)) {
      setAdminCodeStatus('invalid');
      return;
    }
    setAdminCodeStatus('checking');
    try {
      const res = await fetch(`${serverUrl}/validate-admin-invite-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
        body: JSON.stringify({ code: normalized }),
      });
      setAdminCodeStatus(res.ok ? 'valid' : 'invalid');
    } catch {
      setAdminCodeStatus('invalid');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText('');
    setIsSubmitting(true);
    let adminCodeValidated = false;
    let effectiveAdminCode = adminCode.trim().toUpperCase();
    let registrationInviteCode = inviteCode.trim().toUpperCase();

    if (!acceptTerms) {
      setErrorText('Please accept Terms and Conditions to continue.');
      setIsSubmitting(false);
      return;
    }

    if (loginPassword.length < 6 || transactionPassword.length < 6) {
      setErrorText('Login and transaction passwords must be at least 6 characters.');
      setIsSubmitting(false);
      return;
    }

    if (loginPassword !== confirmPassword) {
      setErrorText('Login password confirmation does not match.');
      setIsSubmitting(false);
      return;
    }

    const normalizedUsername = username.trim();
    if (!normalizedUsername) {
      setErrorText('Username is required.');
      setIsSubmitting(false);
      return;
    }

    if (!isValidUsername(normalizedUsername)) {
      setErrorText('Username can only use letters, numbers, underscore (_), hyphen (-), and dot (.) with no spaces.');
      setIsSubmitting(false);
      return;
    }

    // Validate admin invitation code if provided
    if (effectiveAdminCode) {
      if (!/^[A-Z0-9]{5}$/.test(effectiveAdminCode)) {
        setErrorText('Referral code must be exactly 5 letters/numbers.');
        setIsSubmitting(false);
        return;
      }
      setAdminCodeStatus('checking');
      try {
        const verifyRes = await fetch(`${serverUrl}/validate-admin-invite-code`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
          body: JSON.stringify({ code: effectiveAdminCode }),
        });
        if (!verifyRes.ok) {
          setAdminCodeStatus('invalid');
          setErrorText('Referral code is not valid. Please check and try again.');
          setIsSubmitting(false);
          return;
        }
        setAdminCodeStatus('valid');
        adminCodeValidated = true;
      } catch {
        setAdminCodeStatus('invalid');
        setErrorText('Unable to validate referral code right now. Please try again.');
        setIsSubmitting(false);
        return;
      }
    }

    const signupResult = await serverSignup({
      username: normalizedUsername,
      phone,
      loginPassword,
      transactionPassword,
      gender,
      invitationCode: registrationInviteCode,
      adminInviteCode: adminCodeValidated ? effectiveAdminCode : undefined,
    });

    if (!signupResult.ok) {
      setErrorText(signupResult.error ?? 'Signup failed. Please try again.');
      setIsSubmitting(false);
      return;
    }

    toast.success(
      `Welcome to Steadfast! Your invitation code is ${signupResult.invitationCode}.`
    );

    const loginResult = await serverLogin(normalizedUsername, loginPassword);
    if (loginResult.ok) {
      navigate('/home', { replace: true });
      return;
    }

    toast.info('Account created successfully. Please sign in to continue.');
    navigate('/login', { replace: true });
  };

  const inputCls = 'w-full px-4 py-3 rounded-xl text-white placeholder-white/30 sf-input-focus focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/40';
  const inputStyle = { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(145deg, #080f1c 0%, #091628 55%, #060e1c 100%)' }}>
      {/* Ambient glow orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-48 -right-48 w-96 h-96 rounded-full opacity-[0.07]" style={{ background: '#00D9FF', filter: 'blur(80px)' }} />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full opacity-[0.05]" style={{ background: '#5dade2', filter: 'blur(70px)' }} />
      </div>

      {/* Header */}
      <header className="relative z-10 py-5 px-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-2xl mx-auto flex items-center justify-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 rounded-full blur-xl opacity-25" style={{ background: '#00D9FF' }} />
            <img src={steadfastLogo} alt="Steadfast Digital Logo" width={36} height={36} decoding="async" className="relative z-10 w-9 h-9 object-contain" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[11px] uppercase tracking-[0.28em] font-semibold" style={{ color: 'rgba(255,255,255,0.35)' }}>Steadfast Digital</span>
            <span className="text-white text-[1.5rem] font-extrabold tracking-tight -mt-0.5">STEADFAST</span>
          </div>
        </div>
      </header>

      {/* Form Section */}
      <div className="relative z-10 max-w-2xl mx-auto w-full px-5 py-8">
        <div className="text-center mb-7 sf-stagger-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">Create Account</h1>
          <p className="mt-1.5 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Join Steadfast Digital and start earning</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Username */}
          <div>
            <input
              type="text"
              placeholder="Username"
              aria-label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={inputCls}
              style={inputStyle}
              required
            />
            <p className="mt-1.5 text-xs px-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Letters, numbers, underscore (_), hyphen (-), and dot (.) only. No spaces.
            </p>
          </div>

          {/* Phone Number */}
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pr-3" style={{ borderRight: '1px solid rgba(255,255,255,0.15)' }}>
              <span className="text-xl">🇺🇸</span>
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>▼</span>
            </div>
            <input
              type="tel"
              placeholder="Phone number"
              aria-label="Phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={`${inputCls} pl-24`}
              style={inputStyle}
              required
            />
          </div>

          {/* Transaction Password */}
          <div className="relative">
            <input
              type={showTransactionPassword ? "text" : "password"}
              placeholder="Transaction Password"
              aria-label="Transaction password"
              value={transactionPassword}
              onChange={(e) => setTransactionPassword(e.target.value)}
              className={`${inputCls} pr-12`}
              style={inputStyle}
              required
            />
            <button type="button" onClick={() => setShowTransactionPassword(!showTransactionPassword)} aria-label="Toggle transaction password visibility"
              className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors hover:text-white/70" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {showTransactionPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {/* Login Password */}
          <div className="relative">
            <input
              type={showLoginPassword ? "text" : "password"}
              placeholder="Login Password"
              aria-label="Login password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              className={`${inputCls} pr-12`}
              style={inputStyle}
              required
            />
            <button type="button" onClick={() => setShowLoginPassword(!showLoginPassword)} aria-label="Toggle login password visibility"
              className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors hover:text-white/70" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {showLoginPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {/* Confirm Login Password */}
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm Login Password"
              aria-label="Confirm login password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`${inputCls} pr-12`}
              style={inputStyle}
              required
            />
            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} aria-label="Toggle confirm password visibility"
              className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors hover:text-white/70" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {/* Gender */}
          <div className="px-4 py-3 rounded-xl" style={inputStyle}>
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Gender</span>
              <div className="flex items-center gap-6">
                {(['male', 'female'] as const).map((g) => (
                  <label key={g} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="gender"
                      value={g}
                      checked={gender === g}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-4 h-4 accent-[#00D9FF]"
                    />
                    <span className="text-sm text-white/70 capitalize">{g}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Invite Code */}
          <div>
            <input
              type="text"
              placeholder="Invite Code"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              maxLength={5}
              className={inputCls}
              style={inputStyle}
              required
            />
          </div>

          {/* Admin Invitation Code (optional) */}
          <div>
            <div className="relative">
              <input
                type="text"
                placeholder="Referral Code (optional)"
                value={adminCode}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  setAdminCode(val);
                  setAdminCodeStatus('idle');
                }}
                onBlur={() => void validateAdminCode(adminCode)}
                maxLength={5}
                className={`${inputCls} pr-20`}
                style={{
                  ...inputStyle,
                  borderColor: adminCodeStatus === 'valid' ? 'rgba(52,211,153,0.5)' : adminCodeStatus === 'invalid' ? 'rgba(248,113,113,0.5)' : undefined,
                }}
              />
              {adminCodeStatus === 'checking' && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 text-xs">checking…</span>
              )}
              {adminCodeStatus === 'valid' && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-400 text-xs font-semibold">✓ Valid</span>
              )}
              {adminCodeStatus === 'invalid' && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-red-400 text-xs font-semibold">✗ Invalid</span>
              )}
            </div>
            <p className="mt-1.5 text-xs px-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
              If a staff member referred you, enter their 5-character referral code. Leave blank otherwise.
            </p>
          </div>

          {errorText ? (
            <div className="rounded-xl px-4 py-3 text-sm font-medium text-red-300" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}>
              {errorText}
            </div>
          ) : null}

          {/* Terms and Conditions */}
          <div className="flex items-start gap-3 pt-1">
            <input
              type="checkbox"
              id="accept-terms"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              className="w-4 h-4 mt-0.5 accent-[#00D9FF] shrink-0"
            />
            <label htmlFor="accept-terms" className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
              I accept the{' '}
              <a href="/terms-conditions" target="_blank" rel="noopener noreferrer" className="text-[#00D9FF] underline-offset-2 hover:underline">
                Terms and Conditions
              </a>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full font-bold py-3.5 px-4 rounded-xl transition-all duration-200 hover:brightness-110 mt-1 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #00D9FF, #0099cc)', color: '#060e1c', boxShadow: '0 4px 24px rgba(0,217,255,0.28)' }}
          >
            {isSubmitting ? <><Loader2 size={18} className="animate-spin" /> Creating account...</> : 'Create Account'}
          </button>

          <p className="text-center text-sm pt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Already have an account?{' '}
            <Link to="/login" className="text-[#00D9FF] font-semibold hover:underline">
              Sign In
            </Link>
          </p>
        </form>
      </div>

      {/* Footer */}
      <footer className="relative z-10 py-4 px-6 mt-auto">
        <p className="text-center text-[13px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
          © 2026 Steadfast Digital, Inc. All rights reserved
        </p>
      </footer>
    </div>
  );
}
