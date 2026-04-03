import { Home, FileCheck } from 'lucide-react';
import { Link, useLocation } from 'react-router';
import logoImage from '../../assets/4b611159e2ff0ca97c6252bef878e480dedd2a43.png';

export function BottomNavigation() {
  const location = useLocation();
  const homePath = '/home';
  
  const isActive = (path: string) => location.pathname === path;
  const isHomeActive = isActive(homePath);
  const isStartingActive = isActive('/starting');
  const isRecordsActive = isActive('/records');

  return (
    <nav aria-label="Main navigation" className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#0f6ea8] bg-gradient-to-b from-[#0d689f] to-[#0b5f94] px-3 pb-[calc(0.9rem+env(safe-area-inset-bottom))] pt-3 text-white shadow-[0_-10px_28px_rgba(4,45,74,0.28)] backdrop-blur-sm">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-3 items-end">
        <Link 
          to={homePath} 
          className={`group flex min-w-0 flex-col items-center gap-1 py-1.5 transition-all duration-300 ${isHomeActive ? 'text-white' : 'text-white/90 hover:text-white'}`}
        >
          <div className={`relative overflow-hidden rounded-xl px-3 py-1.5 transition-all duration-300 ${isHomeActive ? 'bg-white/22 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_6px_14px_rgba(1,43,72,0.28)] ring-1 ring-white/30 platform-side-glow' : 'bg-transparent group-hover:bg-white/10'}`}>
            <span className={`pointer-events-none absolute inset-0 ${isHomeActive ? 'platform-side-sheen' : 'opacity-0 group-hover:opacity-100 platform-side-hover-sheen'}`} />
            <Home size={25} strokeWidth={2.3} className={`${isHomeActive ? 'text-[#eaf8ff] platform-side-float' : 'text-white'} relative z-[1]`} />
          </div>
          <span className={`text-[15px] font-semibold leading-none ${isHomeActive ? 'platform-side-title-glow' : ''}`}>Home</span>
          <span className={`h-1 rounded-full bg-[#00D9FF] transition-all duration-300 ${isHomeActive ? 'w-6 opacity-100 platform-side-underline-pulse' : 'w-0 opacity-0'}`} />
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
              width={30}
              height={30}
              className={`relative z-[1] h-[30px] w-[30px] object-contain transition-transform duration-300 ${isStartingActive ? 'platform-icon-float' : ''}`}
            />
          </div>
          <span className={`text-[16px] font-bold leading-none ${isStartingActive ? 'text-white platform-title-glow' : 'text-white/92'}`}>Starting</span>
          <span className={`h-1 rounded-full bg-[#00D9FF] transition-all duration-300 ${isStartingActive ? 'w-7 opacity-100 platform-underline-pulse' : 'w-0 opacity-0'}`} />
        </Link>

        <Link 
          to="/records" 
          className={`group flex min-w-0 flex-col items-center gap-1 py-1.5 transition-all duration-300 ${isRecordsActive ? 'text-white' : 'text-white/90 hover:text-white'}`}
        >
          <div className={`relative overflow-hidden rounded-xl px-3 py-1.5 transition-all duration-300 ${isRecordsActive ? 'bg-white/22 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_6px_14px_rgba(1,43,72,0.28)] ring-1 ring-white/30 platform-side-glow' : 'bg-transparent group-hover:bg-white/10'}`}>
            <span className={`pointer-events-none absolute inset-0 ${isRecordsActive ? 'platform-side-sheen' : 'opacity-0 group-hover:opacity-100 platform-side-hover-sheen'}`} />
            <FileCheck size={25} strokeWidth={2.3} className={`${isRecordsActive ? 'text-[#eaf8ff] platform-side-float' : 'text-white'} relative z-[1]`} />
          </div>
          <span className={`text-[15px] font-semibold leading-none ${isRecordsActive ? 'platform-side-title-glow' : ''}`}>Records</span>
          <span className={`h-1 rounded-full bg-[#00D9FF] transition-all duration-300 ${isRecordsActive ? 'w-6 opacity-100 platform-side-underline-pulse' : 'w-0 opacity-0'}`} />
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

        @keyframes platformSideGlow {
          0%, 100% { box-shadow: inset 0 1px 0 rgba(255,255,255,0.25), 0 6px 14px rgba(1,43,72,0.28), 0 0 0 rgba(0,217,255,0); }
          50% { box-shadow: inset 0 1px 0 rgba(255,255,255,0.25), 0 6px 14px rgba(1,43,72,0.28), 0 0 16px rgba(0,217,255,0.18); }
        }

        @keyframes platformSideFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-1px); }
        }

        @keyframes platformSideUnderlinePulse {
          0%, 100% { opacity: 0.85; }
          50% { opacity: 1; }
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

        .platform-side-glow {
          animation: platformSideGlow 2.6s ease-in-out infinite;
        }

        .platform-side-float {
          animation: platformSideFloat 2.6s ease-in-out infinite;
        }

        .platform-side-sheen {
          background: linear-gradient(120deg, transparent 20%, rgba(255, 255, 255, 0.28) 50%, transparent 80%);
          transform: translateX(-130%);
          animation: platformSheenSweep 3.2s ease-in-out infinite;
          opacity: 0.45;
        }

        .platform-side-hover-sheen {
          background: linear-gradient(120deg, transparent 20%, rgba(255, 255, 255, 0.2) 50%, transparent 80%);
          transform: translateX(-130%);
          animation: platformSheenSweep 1.8s ease-in-out infinite;
        }

        .platform-side-title-glow {
          text-shadow: 0 0 7px rgba(77, 208, 255, 0.32);
        }

        .platform-side-underline-pulse {
          animation: platformSideUnderlinePulse 2.4s ease-in-out infinite;
          box-shadow: 0 0 7px rgba(0, 217, 255, 0.42);
        }
      `}</style>
    </nav>
  );
}
