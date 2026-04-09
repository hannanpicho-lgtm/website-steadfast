import { useCallback, useEffect, useRef, useState } from 'react';
import { Info, AlertTriangle, AlertCircle, X } from 'lucide-react';
import { RUNTIME_ENVIRONMENT } from '../services/runtimeEnvironment';
import { getStoredSessionToken } from '../services/serverAuth';

interface Announcement {
  id: string;
  text: string;
  linkUrl: string | null;
  linkLabel: string | null;
  priority: 'info' | 'warning' | 'urgent';
}

const CACHE_KEY = 'steadfast_announcements_cache';
const CACHE_TTL = 120_000; // 2 minutes
const DISMISSED_KEY = 'steadfast_announcements_dismissed';
const ROTATE_INTERVAL = 6_000;

const PRIORITY_CONFIG = {
  info: {
    border: 'border-l-[#c8956c]',
    bg: '',
    bgStyle: 'linear-gradient(135deg, #1f1710 0%, #18120d 100%)',
    icon: Info,
    iconColor: 'text-[#d4a87d]',
    dotColor: 'bg-[#c8956c]',
    bottomBorder: 'rgba(200, 149, 108, 0.25)',
  },
  warning: {
    border: 'border-l-[#d4a853]',
    bg: '',
    bgStyle: 'linear-gradient(135deg, #1f1a0e 0%, #181308 100%)',
    icon: AlertTriangle,
    iconColor: 'text-[#d4a853]',
    dotColor: 'bg-[#d4a853]',
    bottomBorder: 'rgba(212, 168, 83, 0.25)',
  },
  urgent: {
    border: 'border-l-[#d4935a]',
    bg: '',
    bgStyle: 'linear-gradient(135deg, #1f140e 0%, #18100a 100%)',
    icon: AlertCircle,
    iconColor: 'text-[#d4935a]',
    dotColor: 'bg-[#d4935a]',
    bottomBorder: 'rgba(212, 147, 90, 0.25)',
  },
} as const;

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try {
      const stored = sessionStorage.getItem(DISMISSED_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [visible, setVisible] = useState(false);
  const [sliding, setSliding] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('left');
  const pausedRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(null);

  // Fetch announcements
  useEffect(() => {
    const token = getStoredSessionToken();
    if (!token) return;

    const fetchAnnouncements = async () => {
      // Check cache first
      try {
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data, ts } = JSON.parse(cached);
          if (Date.now() - ts < CACHE_TTL) {
            setAnnouncements(Array.isArray(data) ? data : []);
            return;
          }
        }
      } catch { /* ignore */ }

      try {
        const res = await fetch(`${RUNTIME_ENVIRONMENT.apiBaseUrl}/announcements`);
        if (!res.ok) return;
        const json = await res.json();
        const items: Announcement[] = Array.isArray(json?.announcements) ? json.announcements : [];
        setAnnouncements(items);
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: items, ts: Date.now() }));
        } catch { /* quota exceeded — ignore */ }
      } catch { /* network error — silent */ }
    };

    fetchAnnouncements();
  }, []);

  // Filter out dismissed
  const live = announcements.filter((a) => !dismissed.has(a.id));

  // Entrance animation
  useEffect(() => {
    if (live.length > 0) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [live.length]);

  // Safe index
  useEffect(() => {
    if (activeIndex >= live.length) setActiveIndex(0);
  }, [activeIndex, live.length]);

  // Auto-rotate
  useEffect(() => {
    if (live.length <= 1) return;

    intervalRef.current = setInterval(() => {
      if (pausedRef.current) return;
      setSlideDirection('left');
      setSliding(true);
      setTimeout(() => {
        setActiveIndex((prev) => (prev + 1) % live.length);
        setSliding(false);
      }, 300);
    }, ROTATE_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [live.length]);

  const handleDismiss = useCallback((id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      try { sessionStorage.setItem(DISMISSED_KEY, JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const goToSlide = useCallback((idx: number) => {
    if (idx === activeIndex) return;
    setSlideDirection(idx > activeIndex ? 'left' : 'right');
    setSliding(true);
    setTimeout(() => {
      setActiveIndex(idx);
      setSliding(false);
    }, 300);
  }, [activeIndex]);

  if (live.length === 0) return null;

  const current = live[activeIndex] ?? live[0];
  if (!current) return null;

  const config = PRIORITY_CONFIG[current.priority] ?? PRIORITY_CONFIG.info;
  const Icon = config.icon;

  return (
    <div
      className={`transition-all duration-500 ease-out overflow-hidden ${visible ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}
      role="status"
      aria-live="polite"
      onMouseEnter={() => { pausedRef.current = true; }}
      onMouseLeave={() => { pausedRef.current = false; }}
      onFocusCapture={() => { pausedRef.current = true; }}
      onBlurCapture={() => { pausedRef.current = false; }}
    >
      <div
        className={`relative border-l-4 ${config.border} ${current.priority === 'urgent' ? 'announcement-urgent-pulse' : ''}`}
        style={{ background: config.bgStyle, borderBottom: `1px solid ${config.bottomBorder}` }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center gap-3">
          <Icon size={20} className={`${config.iconColor} flex-shrink-0`} />

          <div
            className={`flex-1 min-w-0 transition-all duration-300 ease-in-out ${
              sliding
                ? slideDirection === 'left'
                  ? '-translate-x-4 opacity-0'
                  : 'translate-x-4 opacity-0'
                : 'translate-x-0 opacity-100'
            }`}
          >
            <p className="text-sm font-medium text-[#f5f0eb] truncate sm:whitespace-normal leading-relaxed">
              {current.text}
              {current.linkUrl && (
                <a
                  href={current.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-[#c8956c] hover:text-[#d4a87d] font-semibold underline underline-offset-2 transition-colors"
                >
                  {current.linkLabel || 'Learn more →'}
                </a>
              )}
            </p>
          </div>

          {/* Dot indicators */}
          {live.length > 1 && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {live.map((a, i) => (
                <button
                  key={a.id}
                  onClick={() => goToSlide(i)}
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                    i === activeIndex
                      ? `${config.dotColor} w-3`
                      : 'bg-[#a89f95]/40 hover:bg-[#a89f95]/70'
                  }`}
                  aria-label={`Announcement ${i + 1} of ${live.length}`}
                />
              ))}
            </div>
          )}

          <button
            onClick={() => handleDismiss(current.id)}
            className="flex-shrink-0 text-[#a89f95] hover:text-[#f5f0eb] transition-colors p-1.5 rounded-md hover:bg-white/10"
            aria-label="Dismiss announcement"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
