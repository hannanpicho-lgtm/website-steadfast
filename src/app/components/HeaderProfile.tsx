import { UserCircle, ExternalLink } from 'lucide-react';
import { Link } from 'react-router';

export function HeaderProfile() {
  return (
    <div className="flex flex-col items-end gap-2">
      {/* Profile Icon */}
      <Link to="/profile">
        <UserCircle size={32} className="text-white cursor-pointer hover:text-[#00D9FF] transition-colors" />
      </Link>
      
      {/* Office Website Button - Small */}
      <a
        href="https://steadfastdigital.com"
        target="_blank"
        rel="noopener noreferrer"
        className="bg-[#00D9FF]/10 hover:bg-[#00D9FF]/20 border border-[#00D9FF]/30 hover:border-[#00D9FF] text-[#00D9FF] px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-all duration-300"
      >
        <span>Official Site</span>
        <ExternalLink size={12} />
      </a>
    </div>
  );
}