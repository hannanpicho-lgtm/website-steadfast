import { Eye, EyeOff } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router';
import { useState } from 'react';
import { useEffect } from 'react';
import steadfastLogo from '../../assets/4b611159e2ff0ca97c6252bef878e480dedd2a43.png';
import { authenticateUser, ensureReferralStore, getAdminCredentials, getDemoCredentials } from '../services/referralSystem';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberPassword, setRememberPassword] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorText, setErrorText] = useState('');

  useEffect(() => {
    ensureReferralStore();
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText('');

    const result = authenticateUser(username, password);
    if (!result.ok) {
      setErrorText(result.error ?? 'Login failed.');
      return;
    }

    setShowWelcome(true);
  };

  const handleWelcomeClose = () => {
    setShowWelcome(false);
    const from = (location.state as { from?: string })?.from;
    navigate(from && from !== '/login' ? from : '/starting', { replace: true });
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
        <p className="text-[#3d4551] text-center text-sm mb-8">Enter your username and password to access</p>

        <form onSubmit={handleLogin} className="space-y-5 max-w-xl mx-auto">
          {/* Username/Phone */}
          <div>
            <input
              type="text"
              placeholder="Username/Phone"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
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
              onChange={(e) => setPassword(e.target.value)}
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
            <Link to="/forgot-password" className="text-sm text-[#005a87] hover:underline">
              Forgot your password?
            </Link>
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

          {errorText ? <p className="text-red-600 text-sm text-center">{errorText}</p> : null}

          <p className="text-center text-xs text-gray-500">
            Demo login: {getDemoCredentials().username} / {getDemoCredentials().password}
          </p>
          <p className="text-center text-xs text-gray-500">
            Admin demo: {getAdminCredentials().username} / {getAdminCredentials().password}
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
            <button 
              type="button"
              onClick={() => window.open('https://steadfastdigital.com', '_blank')}
              className="text-[#005a87] font-semibold hover:underline"
            >
              Contact our user support
            </button>
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
