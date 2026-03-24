import { Home, FileCheck, Navigation } from 'lucide-react';
import { Link, useLocation } from 'react-router';

export function BottomNavigation() {
  const location = useLocation();
  const homePath = '/home';
  
  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#0f6ea8] bg-[#0b5f94] px-3 pb-[calc(0.9rem+env(safe-area-inset-bottom))] pt-3.5 text-white shadow-[0_-8px_20px_rgba(4,45,74,0.22)]">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-3 items-end">
        <Link 
          to={homePath} 
          className={`flex min-w-0 flex-col items-center gap-1.5 py-1 transition-colors ${isActive(homePath) ? 'text-white' : 'text-white/90 hover:text-white'}`}
        >
          <div className={`rounded-xl px-3.5 py-2 ${isActive(homePath) ? 'bg-white/20' : 'bg-transparent'}`}>
            <Home size={28} strokeWidth={2.3} className={isActive(homePath) ? 'text-[#dff4ff]' : 'text-white'} />
          </div>
          <span className="text-[16px] font-semibold leading-none">Home</span>
        </Link>

        <Link 
          to="/starting" 
          className="relative -mt-12 flex min-w-0 flex-col items-center gap-1.5 py-1"
        >
          <div className={`rounded-full border-[5px] border-[#0b5f94] p-4 shadow-[0_7px_16px_rgba(8,57,92,0.38)] transition-colors ${isActive('/starting') ? 'bg-[#53b8ea]' : 'bg-[#dceff9] hover:bg-[#7acdf6]'}`}>
            <Navigation size={32} strokeWidth={2.7} className={isActive('/starting') ? 'text-white' : 'text-[#0b5f94]'} />
          </div>
          <span className={`text-[17px] font-bold leading-none ${isActive('/starting') ? 'text-white' : 'text-white/92'}`}>Starting</span>
        </Link>

        <Link 
          to="/records" 
          className={`flex min-w-0 flex-col items-center gap-1.5 py-1 transition-colors ${isActive('/records') ? 'text-white' : 'text-white/90 hover:text-white'}`}
        >
          <div className={`rounded-xl px-3.5 py-2 ${isActive('/records') ? 'bg-white/20' : 'bg-transparent'}`}>
            <FileCheck size={28} strokeWidth={2.3} className={isActive('/records') ? 'text-[#dff4ff]' : 'text-white'} />
          </div>
          <span className="text-[16px] font-semibold leading-none">Records</span>
        </Link>
      </div>
    </nav>
  );
}
