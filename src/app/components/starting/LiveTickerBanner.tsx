import { memo } from 'react';
import { type WinnersTickerEntry } from '../../services/winnersTicker';

interface LiveTickerBannerProps {
  entries: WinnersTickerEntry[];
}

export const LiveTickerBanner = memo(function LiveTickerBanner({ entries }: LiveTickerBannerProps) {
  return (
    <div className="relative overflow-hidden bg-[linear-gradient(90deg,#04182e_0%,#072240_50%,#04182e_100%)] border-y border-[#00D9FF]/20 py-2.5">
      {/* Edge fade masks */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#04182e] to-transparent z-10" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#04182e] to-transparent z-10" />
      {/* LIVE badge */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex items-center gap-1.5 bg-[#00D9FF]/10 border border-[#00D9FF]/40 rounded-full px-2.5 py-1">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
        </span>
        <span className="text-[10px] font-bold tracking-widest text-[#00D9FF] uppercase">Live</span>
      </div>
      {/* Scrolling winners */}
      <div className="pl-28 animate-marquee whitespace-nowrap">
        {[...entries, ...entries].map((entry, idx) => (
          <span key={`${entry.user}-${idx}`}>
            <span className="mx-3 text-sm font-semibold text-[#00D9FF]">
              {entry.emoji} <span className="text-white">{entry.user}</span> just won <span className="text-[#00D9FF] font-bold">{entry.amount}</span>
            </span>
            <span className="text-[#00D9FF]/30 mx-1">•</span>
          </span>
        ))}
      </div>
    </div>
  );
});
