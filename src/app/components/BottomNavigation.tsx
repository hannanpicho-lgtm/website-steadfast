import { Home, FileCheck } from 'lucide-react';
import { Link, useLocation } from 'react-router';

export function BottomNavigation() {
  const location = useLocation();
  const homePath = '/home';
  
  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#0f6ea8] bg-[#0b5f94] px-3 pb-[calc(0.8rem+env(safe-area-inset-bottom))] pt-3 text-white shadow-[0_-8px_20px_rgba(4,45,74,0.2)]">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-3 items-end">
        <Link 
          to={homePath} 
          className={`flex min-w-0 flex-col items-center gap-1.5 py-1 transition-colors ${isActive(homePath) ? 'text-white' : 'text-white/90 hover:text-white'}`}
        >
          <div className={`rounded-xl px-3 py-2 ${isActive(homePath) ? 'bg-white/18' : 'bg-transparent'}`}>
            <Home size={26} strokeWidth={2.2} className={isActive(homePath) ? 'text-[#dff4ff]' : 'text-white'} />
          </div>
          <span className="text-[15px] font-semibold leading-none">Home</span>
        </Link>

        <Link 
          to="/starting" 
          className="relative -mt-10 flex min-w-0 flex-col items-center gap-1.5 py-1"
        >
          <div className={`rounded-full border-[5px] border-[#0b5f94] p-4 shadow-[0_6px_14px_rgba(8,57,92,0.35)] transition-colors ${isActive('/starting') ? 'bg-[#53b8ea]' : 'bg-[#dceff9] hover:bg-[#7acdf6]'}`}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill={isActive('/starting') ? '#ffffff' : '#0b5f94'}>
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <span className={`text-[16px] font-bold leading-none ${isActive('/starting') ? 'text-white' : 'text-white/90'}`}>Starting</span>
        </Link>

        <Link 
          to="/records" 
          className={`flex min-w-0 flex-col items-center gap-1.5 py-1 transition-colors ${isActive('/records') ? 'text-white' : 'text-white/90 hover:text-white'}`}
        >
          <div className={`rounded-xl px-3 py-2 ${isActive('/records') ? 'bg-white/18' : 'bg-transparent'}`}>
            <FileCheck size={26} strokeWidth={2.2} className={isActive('/records') ? 'text-[#dff4ff]' : 'text-white'} />
          </div>
          <span className="text-[15px] font-semibold leading-none">Records</span>
        </Link>
      </div>
    </nav>
  );
}
