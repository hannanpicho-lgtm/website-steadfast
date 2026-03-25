import { Home, FileCheck } from 'lucide-react';
import { Link, useLocation } from 'react-router';
import logoImage from '../../assets/4b611159e2ff0ca97c6252bef878e480dedd2a43.png';

export function BottomNavigation() {
  const location = useLocation();
  const homePath = '/home';
  
  const isActive = (path: string) => location.pathname === path;
  const isStartingActive = isActive('/starting');

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
          className="group relative -mt-12 flex min-w-0 flex-col items-center gap-1 py-1"
        >
          <div className={`absolute top-[-6px] h-16 w-16 rounded-full ${isStartingActive ? 'platform-orbit-ring opacity-100' : 'opacity-0'}`} />
          <div className={`absolute top-[-10px] h-[72px] w-[72px] rounded-full ${isStartingActive ? 'platform-glow-aura opacity-100' : 'opacity-0'}`} />
          <div className={`relative overflow-hidden rounded-full border-[5px] border-[#0b5f94] p-3.5 shadow-[0_10px_24px_rgba(8,57,92,0.45)] transition-all duration-300 ${isStartingActive ? 'bg-[#48b9eb] ring-2 ring-[#8be7ff]/60 scale-[1.04]' : 'bg-[#dceff9] group-hover:bg-[#7acdf6]'}`}>
            <span className={`pointer-events-none absolute inset-0 ${isStartingActive ? 'platform-sheen' : ''}`} />
            <img
              src={logoImage}
              alt="Steadfast Platform"
              className={`relative z-[1] h-[30px] w-[30px] object-contain transition-transform duration-300 ${isStartingActive ? 'platform-icon-float' : ''}`}
            />
          </div>
          <span className={`text-[16px] font-bold leading-none ${isStartingActive ? 'text-white platform-title-glow' : 'text-white/92'}`}>Starting</span>
          <span className={`h-1 rounded-full bg-[#00D9FF] transition-all duration-300 ${isStartingActive ? 'w-7 opacity-100 platform-underline-pulse' : 'w-0 opacity-0'}`} />
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
      <style>{`
        @keyframes platformFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-1.8px); }
        }

        @keyframes platformAura {
          0%, 100% { box-shadow: 0 0 0 0 rgba(0, 217, 255, 0.34), 0 0 26px rgba(83, 184, 234, 0.38); }
          50% { box-shadow: 0 0 0 7px rgba(0, 217, 255, 0.08), 0 0 34px rgba(83, 184, 234, 0.48); }
        }

        @keyframes platformOrbit {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes platformUnderlinePulse {
          0%, 100% { opacity: 0.82; }
          50% { opacity: 1; }
        }

        @keyframes platformSheenSweep {
          0% { transform: translateX(-130%); }
          100% { transform: translateX(130%); }
        }

        .platform-icon-float {
          animation: platformFloat 2.8s ease-in-out infinite;
        }

        .platform-glow-aura {
          animation: platformAura 2.8s ease-in-out infinite;
          background: radial-gradient(circle, rgba(0, 217, 255, 0.18) 0%, rgba(0, 217, 255, 0) 70%);
        }

        .platform-orbit-ring {
          border: 1.5px dashed rgba(141, 229, 255, 0.45);
          animation: platformOrbit 12s linear infinite;
        }

        .platform-sheen {
          background: linear-gradient(120deg, transparent 20%, rgba(255, 255, 255, 0.42) 50%, transparent 80%);
          transform: translateX(-130%);
          animation: platformSheenSweep 2.8s ease-in-out infinite;
          opacity: 0.6;
        }

        .platform-title-glow {
          text-shadow: 0 0 10px rgba(77, 208, 255, 0.42);
        }

        .platform-underline-pulse {
          animation: platformUnderlinePulse 2.2s ease-in-out infinite;
          box-shadow: 0 0 9px rgba(0, 217, 255, 0.48);
        }
      `}</style>
    </nav>
  );
}
