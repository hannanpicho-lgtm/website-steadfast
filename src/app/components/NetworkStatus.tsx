import { useEffect, useState, memo } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

/**
 * F1: Network status indicator — shows a toast banner when going offline/online.
 * Auto-dismisses "back online" after 3 seconds.
 */
export const NetworkStatus = memo(function NetworkStatus() {
  const [status, setStatus] = useState<'online' | 'offline' | null>(null);

  useEffect(() => {
    const goOffline = () => setStatus('offline');
    const goOnline = () => {
      setStatus('online');
      const t = setTimeout(() => setStatus(null), 3000);
      return () => clearTimeout(t);
    };
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  if (status === null) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-0 inset-x-0 z-[9998] flex items-center justify-center gap-2 py-2 px-4 text-xs font-semibold transition-all duration-300 ${
        status === 'offline'
          ? 'bg-red-600/95 text-white'
          : 'bg-emerald-600/95 text-white'
      }`}
      style={{ backdropFilter: 'blur(8px)' }}
    >
      {status === 'offline' ? (
        <>
          <WifiOff size={14} />
          <span>You're offline — changes may not save</span>
        </>
      ) : (
        <>
          <Wifi size={14} />
          <span>Back online</span>
        </>
      )}
    </div>
  );
});
