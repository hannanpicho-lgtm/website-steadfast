import { Home, FileCheck } from 'lucide-react';
import { Link, useLocation } from 'react-router';

export function BottomNavigation() {
  const location = useLocation();
  const homePath = '/home';
  
  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#0f6ea8] bg-[#0b5f94] px-3 pb-[calc(0.55rem+env(safe-area-inset-bottom))] pt-2.5 text-white shadow-lg">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-3 items-end">
        <Link 
          to={homePath} 
          className={`flex min-w-0 flex-col items-center gap-1 py-1 transition-colors ${isActive(homePath) ? 'text-white' : 'text-white/85 hover:text-white'}`}
        >
          <div className={`rounded-lg px-2 py-1.5 ${isActive(homePath) ? 'bg-white/15' : ''}`}>
            <Home size={20} className={isActive(homePath) ? 'text-[#dff4ff]' : 'text-white'} />
          </div>
          <span className="text-[11px] font-semibold sm:text-xs">Home</span>
        </Link>

        <Link 
          to="/starting" 
          className="relative -mt-7 flex min-w-0 flex-col items-center gap-1 py-1"
        >
          <div className={`rounded-full border-4 border-[#0b5f94] p-3 shadow-lg transition-colors ${isActive('/starting') ? 'bg-[#5dc2f2]' : 'bg-[#dceff9] hover:bg-[#7acdf6]'}`}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill={isActive('/starting') ? '#ffffff' : '#0b5f94'}>
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <span className={`text-[11px] font-bold sm:text-xs ${isActive('/starting') ? 'text-white' : 'text-white/90'}`}>Starting</span>
        </Link>

        <Link 
          to="/records" 
          className={`flex min-w-0 flex-col items-center gap-1 py-1 transition-colors ${isActive('/records') ? 'text-white' : 'text-white/85 hover:text-white'}`}
        >
          <div className={`rounded-lg px-2 py-1.5 ${isActive('/records') ? 'bg-white/15' : ''}`}>
            <FileCheck size={20} className={isActive('/records') ? 'text-[#dff4ff]' : 'text-white'} />
          </div>
          <span className="text-[11px] font-semibold sm:text-xs">Records</span>
        </Link>
      </div>
    </nav>
  );
}
