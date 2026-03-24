import { UserCircle } from 'lucide-react';
import { Link } from 'react-router';
import logoImage from '../../assets/4b611159e2ff0ca97c6252bef878e480dedd2a43.png';
import { getCurrentUsername } from '../services/referralSystem';

interface HeaderProps {
  onContactClick?: () => void;
}

export function Header({ onContactClick }: HeaderProps) {
  const homePath = getCurrentUsername() ? '/home' : '/';

  return (
    <header className="sticky top-0 z-40 border-b border-[#2c3f58] bg-[#1a2637]/95 px-3 py-2.5 text-white backdrop-blur-sm sm:px-6 sm:py-3">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
        {/* Left Side - Logo */}
        <Link to={homePath} className="group flex items-center gap-2.5 sm:gap-3">
          <div className="rounded-sm border border-[#3a5678] bg-[#132136] p-1.5 sm:p-2">
            <img 
              src={logoImage} 
              alt="Steadfast Digital Logo" 
              className="h-7 w-7 object-contain transition-transform duration-300 group-hover:scale-105 sm:h-8 sm:w-8"
            />
          </div>

          <div className="flex flex-col">
            <span className="text-base font-extrabold tracking-tight text-[#6fd0ff] sm:text-lg">
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
              className="rounded-lg bg-[#56b6ea] px-3.5 py-1.5 text-xs font-semibold text-[#17314a] transition-colors hover:bg-[#69c3f2] sm:px-5 sm:py-2 sm:text-sm"
            >
              Contact
            </button>
          )}

          {/* Profile Icon */}
          <Link 
            to="/profile"
            className="rounded-full border border-[#3c536f] p-1 text-[#d8e5f4] transition-colors hover:border-[#69c3f2] hover:text-[#69c3f2]"
          >
            <UserCircle size={24} />
          </Link>
        </div>
      </div>
    </header>
  );
}
