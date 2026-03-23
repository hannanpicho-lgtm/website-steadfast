import { ExternalLink, UserCircle } from 'lucide-react';
import { Link } from 'react-router';
import logoImage from '../../assets/4b611159e2ff0ca97c6252bef878e480dedd2a43.png';
import { getCurrentUsername } from '../services/referralSystem';

interface HeaderProps {
  onContactClick?: () => void;
}

export function Header({ onContactClick }: HeaderProps) {
  const homePath = getCurrentUsername() ? '/home' : '/';

  return (
    <header className="bg-gradient-to-r from-[#1e2838] via-[#2c3e50] to-[#34495e] text-white py-4 px-6 border-b border-[#5dade2]/20 shadow-lg shadow-[#5dade2]/5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left Side - Logo */}
        <Link to={homePath} className="flex items-center gap-3 group">
          {/* Enhanced Logo */}
          <div className="relative">
            {/* Glow effect */}
            <div className="absolute inset-0 bg-[#5dade2] blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
            
            {/* Logo Image */}
            <img 
              src={logoImage} 
              alt="Steadfast Digital Logo" 
              className="relative z-10 w-14 h-14 object-contain drop-shadow-lg group-hover:scale-110 transition-transform duration-300"
            />
          </div>
          
          {/* Brand Text */}
          <div className="flex flex-col">
            <span className="text-2xl font-black tracking-tight bg-gradient-to-r from-[#5dade2] via-[#60a5fa] to-[#5dade2] bg-clip-text text-transparent group-hover:from-[#60a5fa] group-hover:via-[#5dade2] group-hover:to-[#60a5fa] transition-all duration-500">
              STEADFAST
            </span>
            <span className="text-xs tracking-[0.3em] text-gray-400 font-semibold uppercase -mt-1">
              Digital
            </span>
          </div>
        </Link>

        {/* Right Side - Actions */}
        <div className="flex items-center gap-4">
          {/* Contact Button */}
          {onContactClick && (
            <button 
              onClick={onContactClick}
              className="relative group/btn overflow-hidden bg-gradient-to-r from-[#5dade2] to-[#4a9cd6] hover:from-[#60a5fa] hover:to-[#5dade2] text-[#2c3e50] px-6 py-2.5 rounded-lg font-bold text-sm tracking-wide transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-[#5dade2]/50"
            >
              {/* Shimmer effect */}
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700"></div>
              <span className="relative z-10">Contact</span>
            </button>
          )}

          {/* Official Site Link */}
          <a
            href="https://steadfastdigital.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-2 bg-[#5dade2]/10 hover:bg-[#5dade2]/20 border border-[#5dade2]/30 hover:border-[#5dade2] text-[#5dade2] px-4 py-2 rounded-lg text-xs font-bold tracking-wide transition-all duration-300 hover:scale-105 hover:shadow-md hover:shadow-[#5dade2]/20"
          >
            <span>Official Site</span>
            <ExternalLink size={14} className="group-hover:rotate-12 transition-transform" />
          </a>

          {/* Profile Icon */}
          <Link 
            to="/profile"
            className="relative group/profile"
          >
            {/* Glow ring */}
            <div className="absolute inset-0 bg-[#5dade2] rounded-full blur-md opacity-0 group-hover/profile:opacity-50 transition-opacity duration-300"></div>
            
            {/* Icon with border */}
            <div className="relative z-10 p-1 rounded-full border-2 border-transparent group-hover/profile:border-[#5dade2] transition-all duration-300">
              <UserCircle size={32} className="text-white group-hover/profile:text-[#5dade2] transition-colors" />
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
}
