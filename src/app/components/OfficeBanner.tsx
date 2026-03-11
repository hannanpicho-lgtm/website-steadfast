import { ExternalLink, Building2 } from 'lucide-react';

export function OfficeBanner() {
  return (
    <div className="bg-gradient-to-r from-[#1a1f2e] via-[#2a3f4e] to-[#1a1f2e] border-b border-[#00D9FF]/20">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Left side - Company info */}
        <div className="flex items-center gap-3">
          <Building2 className="text-[#00D9FF]" size={20} />
          <span className="text-white text-sm font-medium hidden sm:inline">
            Steadfast Digital Official Platform
          </span>
        </div>

        {/* Right side - Office website button */}
        <a
          href="https://steadfastdigital.com"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-gradient-to-r from-[#00D9FF] to-[#00b8d4] hover:from-[#00c5e6] hover:to-[#00a5c1] text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-[#00D9FF]/50"
        >
          <span>Visit Office Website</span>
          <ExternalLink size={16} />
        </a>
      </div>
    </div>
  );
}
