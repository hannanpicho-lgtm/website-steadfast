import { UserCircle } from 'lucide-react';
import { Link } from 'react-router';
import { memo } from 'react';
import logoImage from '../../assets/4b611159e2ff0ca97c6252bef878e480dedd2a43.png';
import { getCurrentUsername } from '../services/referralSystem';

interface HeaderProps {
  onContactClick?: () => void;
}

export const Header = memo(function Header({ onContactClick }: HeaderProps) {
  const homePath = getCurrentUsername() ? '/home' : '/';

  return (
    <header className="sticky top-0 z-40 border-b border-[#2c3f58] bg-[#1a2637]/95 px-3 py-2.5 text-white backdrop-blur-md sm:px-6 sm:py-3 shadow-[0_2px_12px_rgba(0,0,0,0.25)]">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
        {/* Left Side - Logo */}
        <Link to={homePath} className="group flex items-center gap-2.5 sm:gap-3">
          <div className="rounded-lg border border-[#3a5678]/80 bg-[#132136] p-1.5 sm:p-2 transition-all duration-300 group-hover:border-[#00D9FF]/40 group-hover:shadow-[0_0_12px_rgba(0,217,255,0.15)]">
            <img 
              src={logoImage} 
              alt="Steadfast Digital Logo" 
              width={32}
              height={32}
              decoding="async"
              className="h-7 w-7 object-contain transition-transform duration-300 group-hover:scale-105 sm:h-8 sm:w-8"
            />
          </div>

          <div className="flex flex-col">
            <span className="text-base font-extrabold tracking-tight sm:text-lg" style={{ background: 'linear-gradient(135deg, #6fd0ff, #00D9FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              STEADFAST
            </span>
            <span className="-mt-1 text-[9px] font-semibold uppercase tracking-[0.24em] text-[#8ea5c2] sm:text-[10px]">
              Digital
            </span>
          </div>
        </Link>

        {/* Right Side - Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Contact Button */}
          {onContactClick && (
            <button 
              onClick={onContactClick}
              className="rounded-lg bg-gradient-to-r from-[#00D9FF] to-[#00b4d8] px-4 py-2 text-xs font-bold text-[#08111f] shadow-[0_2px_10px_rgba(0,217,255,0.35)] transition-all hover:shadow-[0_4px_16px_rgba(0,217,255,0.55)] hover:scale-105 active:scale-95 sm:px-5 sm:py-2 sm:text-sm min-h-[44px]"
            >
              Contact
            </button>
          )}

          {/* Profile Icon */}
          <Link 
            to="/profile"
            className="flex items-center justify-center rounded-full border border-[#3c536f] p-2 text-[#d8e5f4] transition-all duration-200 hover:border-[#00D9FF]/60 hover:text-[#00D9FF] hover:shadow-[0_0_10px_rgba(0,217,255,0.2)] min-h-[44px] min-w-[44px]"
          >
            <UserCircle size={24} />
          </Link>
        </div>
      </div>
    </header>
  );
});
