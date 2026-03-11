import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { LogOut } from 'lucide-react';

export default function Logout() {
  const navigate = useNavigate();

  useEffect(() => {
    // Auto redirect to login after 2 seconds
    const timer = setTimeout(() => {
      navigate('/login');
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="size-full flex items-center justify-center bg-gradient-to-br from-[#1a1f2e] via-[#2c3e50] to-[#1e2838]">
      <div className="text-center px-6">
        {/* Animated Logout Icon */}
        <div className="relative inline-block mb-8">
          {/* Pulsing glow effect */}
          <div className="absolute inset-0 bg-red-500 rounded-full blur-2xl opacity-50 animate-pulse"></div>
          
          {/* Icon container */}
          <div className="relative z-10 bg-[#2c3e50] p-8 rounded-full border-4 border-red-500 shadow-lg shadow-red-500/50">
            <LogOut size={64} className="text-red-500 animate-bounce" />
          </div>
        </div>

        {/* Logout Message */}
        <h1 className="text-4xl font-bold text-white mb-4">Logging Out...</h1>
        <p className="text-gray-300 text-lg mb-8">
          You have been successfully logged out
        </p>

        {/* Loading bar */}
        <div className="max-w-md mx-auto bg-[#2c3e50] rounded-full h-2 overflow-hidden">
          <div className="bg-gradient-to-r from-red-500 to-red-400 h-full rounded-full animate-pulse" style={{ width: '100%' }}></div>
        </div>

        <p className="text-gray-400 text-sm mt-4">
          Redirecting to login page...
        </p>
      </div>
    </div>
  );
}
