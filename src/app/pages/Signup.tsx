import { Eye, EyeOff } from 'lucide-react';
import { Link } from 'react-router';
import { useState } from 'react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import steadfastLogo from '../../assets/4b611159e2ff0ca97c6252bef878e480dedd2a43.png';
import { ensureReferralStore, getSystemInviteCode, registerUserWithInvitation } from '../services/referralSystem';
import { projectId, publicAnonKey } from '/utils/supabase/info';

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

  useEffect(() => {
    ensureReferralStore();
  }, []);

  const validateAdminCode = async (code: string) => {
    const normalized = code.trim().toUpperCase();
    if (!normalized) {
      setAdminCodeStatus('idle');
      return;
    }
    if (!/^[A-Z0-9]{8,12}$/.test(normalized)) {
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

    if (!acceptTerms) {
      setErrorText('Please accept Terms and Conditions to continue.');
      return;
    }

    if (loginPassword.length < 6 || transactionPassword.length < 6) {
      setErrorText('Login and transaction passwords must be at least 6 characters.');
      return;
    }

    if (loginPassword !== confirmPassword) {
      setErrorText('Login password confirmation does not match.');
      return;
    }

    // Validate admin invitation code if provided
    const normalizedAdminCode = adminCode.trim().toUpperCase();
    if (normalizedAdminCode) {
      if (!/^[A-Z0-9]{8,12}$/.test(normalizedAdminCode)) {
        setErrorText('Admin invitation code must be 8–12 letters/numbers.');
        return;
      }
      if (adminCodeStatus === 'invalid') {
        setErrorText('Admin invitation code is not valid. Please check and try again.');
        return;
      }
    }

    const result = registerUserWithInvitation({
      username,
      phone,
      loginPassword,
      transactionPassword,
      gender,
      invitationCode: inviteCode,
    });

    if (!result.ok) {
      setErrorText(result.error ?? 'Signup failed. Please try again.');
      return;
    }

    try {
      const response = await fetch(`${serverUrl}/referral/link-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          username: result.createdUser?.username,
          invitationCode: result.createdUser?.invitationCode,
          parentInviteCode: inviteCode,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? 'Failed to sync referral relationship to server');
      }
    } catch (syncError) {
      setErrorText(syncError instanceof Error ? syncError.message : 'Failed to sync referral relationship');
      return;
    }

    // Link admin invitation code if one was provided and is valid
    if (normalizedAdminCode && adminCodeStatus === 'valid') {
      try {
        await fetch(`${serverUrl}/referral/link-admin-invite`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            username: result.createdUser?.username,
            adminInviteCode: normalizedAdminCode,
          }),
        });
      } catch {
        // Non-fatal: sub-admin scoping won't work but the account is created
      }
    }

    const referralPct = 20;
    alert(
      `Signup successful. Your invitation code is ${result.createdUser?.invitationCode}. Parent reward credited: ${referralPct}% (${result.parentReward?.toFixed(2)} USD).`
    );
    navigate('/login');
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
      <div className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="text-[#005a87] text-3xl font-bold text-center mb-2">SIGN UP</h1>
        <p className="text-[#3d4551] text-center text-sm mb-8">Enter your username and password to access</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username */}
          <div>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-[#005a87] focus:outline-none text-[#3d4551] placeholder-gray-400"
              required
            />
          </div>

          {/* Phone Number */}
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 border-r border-gray-300 pr-3">
              <span className="text-2xl">🇺🇸</span>
              <span className="text-gray-400">▼</span>
            </div>
            <input
              type="tel"
              placeholder="Enter a phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full pl-24 pr-4 py-3 rounded-lg border-2 border-gray-300 focus:border-[#005a87] focus:outline-none text-[#3d4551] placeholder-gray-400"
              required
            />
          </div>

          {/* Transaction Password */}
          <div className="relative">
            <input
              type={showTransactionPassword ? "text" : "password"}
              placeholder="Transaction Password"
              value={transactionPassword}
              onChange={(e) => setTransactionPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-[#005a87] focus:outline-none text-[#3d4551] placeholder-gray-400"
              required
            />
            <button
              type="button"
              onClick={() => setShowTransactionPassword(!showTransactionPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showTransactionPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {/* Login Password */}
          <div className="relative">
            <input
              type={showLoginPassword ? "text" : "password"}
              placeholder="Login Password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-[#005a87] focus:outline-none text-[#3d4551] placeholder-gray-400"
              required
            />
            <button
              type="button"
              onClick={() => setShowLoginPassword(!showLoginPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showLoginPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {/* Confirm Login Password */}
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm Login Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-[#005a87] focus:outline-none text-[#3d4551] placeholder-gray-400"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {/* Gender */}
          <div className="border-2 border-gray-300 rounded-lg px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Gender</span>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="gender"
                    value="male"
                    checked={gender === 'male'}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-4 h-4 text-[#005a87] border-gray-300 focus:ring-[#005a87]"
                  />
                  <span className="text-[#3d4551]">Male</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="gender"
                    value="female"
                    checked={gender === 'female'}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-4 h-4 text-[#005a87] border-gray-300 focus:ring-[#005a87]"
                  />
                  <span className="text-[#3d4551]">Female</span>
                </label>
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
              className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-[#005a87] focus:outline-none text-[#3d4551] placeholder-gray-400"
              required
            />
            <p className="mt-2 text-xs text-gray-500">
              Invitation code is required. It must be exactly 5 letters/numbers and include at least one number. For initial onboarding, use system code: {getSystemInviteCode()}.
            </p>
          </div>

          {/* Admin Invitation Code (optional) */}
          <div>
            <div className="relative">
              <input
                type="text"
                placeholder="Admin Referral Code (optional)"
                value={adminCode}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  setAdminCode(val);
                  setAdminCodeStatus('idle');
                }}
                onBlur={() => void validateAdminCode(adminCode)}
                maxLength={12}
                className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none text-[#3d4551] placeholder-gray-400 pr-10 ${
                  adminCodeStatus === 'valid'
                    ? 'border-green-400 focus:border-green-500'
                    : adminCodeStatus === 'invalid'
                      ? 'border-red-400 focus:border-red-500'
                      : 'border-gray-300 focus:border-[#005a87]'
                }`}
              />
              {adminCodeStatus === 'checking' && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs">checking…</span>
              )}
              {adminCodeStatus === 'valid' && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500 text-xs font-semibold">✓ Valid</span>
              )}
              {adminCodeStatus === 'invalid' && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-red-500 text-xs font-semibold">✗ Invalid</span>
              )}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              If a staff member referred you, enter their admin referral code here (8–12 characters). Leave blank if not applicable.
            </p>
          </div>

          {errorText ? <p className="text-sm text-red-600">{errorText}</p> : null}

          {/* Terms and Conditions */}
          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              id="accept-terms"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              className="w-4 h-4 mt-1 text-[#005a87] border-gray-300 rounded focus:ring-[#005a87]"
            />
            <label htmlFor="accept-terms" className="text-sm text-[#3d4551]">
              Accept our's{' '}
              <Link to="/terms-conditions" className="text-[#005a87] underline hover:text-[#004a6f]">
                Terms and Conditions
              </Link>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full bg-[#005a87] hover:bg-[#004a6f] text-white font-bold py-3 px-4 rounded-lg transition-colors"
          >
            Submit
          </button>

          {/* Already have account */}
          <p className="text-center text-sm text-[#3d4551]">
            Already have an account?{' '}
            <Link to="/login" className="text-[#005a87] font-semibold hover:underline">
              Sign In
            </Link>
          </p>

          {/* Terms Notice */}
          <p className="text-center text-xs text-gray-500">
            By signing up, you agree to our{' '}
            <Link to="/terms-conditions" className="text-[#005a87] underline hover:text-[#004a6f]">
              Terms and Conditions
            </Link>
          </p>
        </form>
      </div>

      {/* Footer */}
      <footer className="bg-[#3d4551] py-4 px-6 mt-12">
        <p className="text-center text-white text-xs">
          © 2026 Steadfast Digital, Inc. All rights reserved
        </p>
      </footer>
    </div>
  );
}
