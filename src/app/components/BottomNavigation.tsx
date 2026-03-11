import { Home, FileCheck } from 'lucide-react';
import { Link, useLocation } from 'react-router';

export function BottomNavigation() {
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#0066b3] text-white flex items-center justify-around py-4 shadow-lg z-50 border-t border-[#0088d9]">
      {/* Home Button */}
      <Link 
        to="/" 
        className={`flex flex-col items-center gap-1 transition-all duration-300 group ${
          isActive('/') ? 'scale-110' : 'hover:scale-110'
        }`}
      >
        <div className={`p-2 rounded-xl transition-all duration-300 ${
          isActive('/') 
            ? 'bg-white/20 shadow-lg' 
            : 'group-hover:bg-white/10 group-hover:shadow-md'
        }`}>
          <Home 
            size={24} 
            className={`transition-all duration-300 ${
              isActive('/') 
                ? 'text-[#00D9FF] drop-shadow-[0_0_8px_rgba(0,217,255,0.8)]' 
                : 'group-hover:text-[#00D9FF] group-hover:drop-shadow-[0_0_8px_rgba(0,217,255,0.6)]'
            }`}
          />
        </div>
        <span className={`text-xs font-semibold transition-all duration-300 ${
          isActive('/') 
            ? 'text-[#00D9FF] drop-shadow-[0_0_4px_rgba(0,217,255,0.8)]' 
            : 'group-hover:text-[#00D9FF]'
        }`}>
          Home
        </span>
      </Link>

      {/* Starting Button - Center with Special Effect */}
      <Link 
        to="/starting" 
        className="flex flex-col items-center gap-1 relative -mt-8 group"
      >
        <div className={`bg-gradient-to-br from-[#00D9FF] to-[#00a8cc] rounded-full p-5 shadow-2xl transition-all duration-300 ${
          isActive('/starting') 
            ? 'animate-pulse-glow scale-110' 
            : 'group-hover:scale-110 group-hover:shadow-[0_0_30px_rgba(0,217,255,0.6)]'
        }`}>
          <svg 
            width="28" 
            height="28" 
            viewBox="0 0 24 24" 
            fill="white" 
            className="drop-shadow-lg transition-transform duration-300 group-hover:rotate-12"
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        </div>
        <span className={`text-xs font-bold mt-2 transition-all duration-300 ${
          isActive('/starting') 
            ? 'text-[#00D9FF] drop-shadow-[0_0_6px_rgba(0,217,255,0.8)] scale-110' 
            : 'group-hover:text-[#00D9FF] group-hover:scale-105'
        }`}>
          Starting
        </span>
        
        {/* Ripple Effect on Hover */}
        <div className="absolute inset-0 -top-8 flex items-center justify-center pointer-events-none">
          <div className={`absolute w-20 h-20 rounded-full border-2 border-[#00D9FF] transition-all duration-700 ${
            isActive('/starting') 
              ? 'opacity-0 scale-150' 
              : 'opacity-0 group-hover:opacity-30 group-hover:scale-150'
          }`}></div>
        </div>
      </Link>

      {/* Records Button */}
      <Link 
        to="/records" 
        className={`flex flex-col items-center gap-1 transition-all duration-300 group ${
          isActive('/records') ? 'scale-110' : 'hover:scale-110'
        }`}
      >
        <div className={`p-2 rounded-xl transition-all duration-300 ${
          isActive('/records') 
            ? 'bg-white/20 shadow-lg' 
            : 'group-hover:bg-white/10 group-hover:shadow-md'
        }`}>
          <FileCheck 
            size={24} 
            className={`transition-all duration-300 ${
              isActive('/records') 
                ? 'text-[#00D9FF] drop-shadow-[0_0_8px_rgba(0,217,255,0.8)]' 
                : 'group-hover:text-[#00D9FF] group-hover:drop-shadow-[0_0_8px_rgba(0,217,255,0.6)]'
            }`}
          />
        </div>
        <span className={`text-xs font-semibold transition-all duration-300 ${
          isActive('/records') 
            ? 'text-[#00D9FF] drop-shadow-[0_0_4px_rgba(0,217,255,0.8)]' 
            : 'group-hover:text-[#00D9FF]'
        }`}>
          Records
        </span>
      </Link>
    </nav>
  );
}
