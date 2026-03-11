import { Eye, EyeOff, Lock, Mail, User, Phone } from 'lucide-react';
import { Link } from 'react-router';
import { useState } from 'react';
import steadfastLogo from '../../assets/4b611159e2ff0ca97c6252bef878e480dedd2a43.png';

export default function Signup() {
  const [showTransactionPassword, setShowTransactionPassword] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [gender, setGender] = useState('male');

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

        <form className="space-y-4">
          {/* Username */}
          <div>
            <input
              type="text"
              placeholder="Username"
              className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-[#005a87] focus:outline-none text-[#3d4551] placeholder-gray-400"
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
              className="w-full pl-24 pr-4 py-3 rounded-lg border-2 border-gray-300 focus:border-[#005a87] focus:outline-none text-[#3d4551] placeholder-gray-400"
            />
          </div>

          {/* Transaction Password */}
          <div className="relative">
            <input
              type={showTransactionPassword ? "text" : "password"}
              placeholder="Transaction Password"
              className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-[#005a87] focus:outline-none text-[#3d4551] placeholder-gray-400"
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
              className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-[#005a87] focus:outline-none text-[#3d4551] placeholder-gray-400"
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
              className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-[#005a87] focus:outline-none text-[#3d4551] placeholder-gray-400"
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
              className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-[#005a87] focus:outline-none text-[#3d4551] placeholder-gray-400"
            />
          </div>

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
