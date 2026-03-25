import { Home, FileCheck, Navigation } from 'lucide-react';
import { Link, useLocation } from 'react-router';

export function BottomNavigation() {
  const location = useLocation();
  const homePath = '/home';
  
  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#0f6ea8] bg-gradient-to-b from-[#0d689f] to-[#0b5f94] px-3 pb-[calc(0.9rem+env(safe-area-inset-bottom))] pt-3 text-white shadow-[0_-10px_28px_rgba(4,45,74,0.28)] backdrop-blur-sm">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-3 items-end">
        <Link 
          to={homePath} 
          className={`flex min-w-0 flex-col items-center gap-1 py-1.5 transition-all duration-300 ${isActive(homePath) ? 'text-white' : 'text-white/90 hover:text-white'}`}
        >
          <div className={`rounded-xl px-3 py-1.5 transition-all duration-300 ${isActive(homePath) ? 'bg-white/22 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_6px_14px_rgba(1,43,72,0.28)] ring-1 ring-white/30' : 'bg-transparent'}`}>
            <Home size={25} strokeWidth={2.3} className={isActive(homePath) ? 'text-[#eaf8ff]' : 'text-white'} />
          </div>
          <span className="text-[15px] font-semibold leading-none">Home</span>
          <span className={`h-1 rounded-full bg-[#00D9FF] transition-all duration-300 ${isActive(homePath) ? 'w-6 opacity-100' : 'w-0 opacity-0'}`} />
        </Link>

        <Link 
          to="/starting" 
          className="relative -mt-11 flex min-w-0 flex-col items-center gap-1 py-1"
        >
          <div className={`rounded-full border-[5px] border-[#0b5f94] p-3.5 shadow-[0_9px_20px_rgba(8,57,92,0.4)] transition-all duration-300 ${isActive('/starting') ? 'bg-[#48b9eb] ring-2 ring-[#8be7ff]/60 scale-[1.03]' : 'bg-[#dceff9] hover:bg-[#7acdf6]'}`}>
            <Navigation size={30} strokeWidth={2.7} className={isActive('/starting') ? 'text-white' : 'text-[#0b5f94]'} />
          </div>
          <span className={`text-[16px] font-bold leading-none ${isActive('/starting') ? 'text-white' : 'text-white/92'}`}>Starting</span>
          <span className={`h-1 rounded-full bg-[#00D9FF] transition-all duration-300 ${isActive('/starting') ? 'w-7 opacity-100' : 'w-0 opacity-0'}`} />
        </Link>

        <Link 
          to="/records" 
          className={`flex min-w-0 flex-col items-center gap-1 py-1.5 transition-all duration-300 ${isActive('/records') ? 'text-white' : 'text-white/90 hover:text-white'}`}
        >
          <div className={`rounded-xl px-3 py-1.5 transition-all duration-300 ${isActive('/records') ? 'bg-white/22 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_6px_14px_rgba(1,43,72,0.28)] ring-1 ring-white/30' : 'bg-transparent'}`}>
            <FileCheck size={25} strokeWidth={2.3} className={isActive('/records') ? 'text-[#eaf8ff]' : 'text-white'} />
          </div>
          <span className="text-[15px] font-semibold leading-none">Records</span>
          <span className={`h-1 rounded-full bg-[#00D9FF] transition-all duration-300 ${isActive('/records') ? 'w-6 opacity-100' : 'w-0 opacity-0'}`} />
        </Link>
      </div>
    </nav>
  );
}
