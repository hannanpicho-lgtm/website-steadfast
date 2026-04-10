import { useEffect, useRef, useState, useCallback } from 'react';

interface UsePullToRefreshOptions {
  /** Callback when pull is triggered. Should return a Promise. */
  onRefresh: () => Promise<void>;
  /** Pull distance threshold in px. Default: 80 */
  threshold?: number;
  /** Maximum pull distance in px. Default: 120 */
  maxPull?: number;
  /** Whether the hook is enabled. Default: true */
  enabled?: boolean;
}

interface PullToRefreshState {
  pulling: boolean;
  pullDistance: number;
  refreshing: boolean;
  progress: number; // 0 to 1
}

/**
 * Native-feeling pull-to-refresh for mobile PWA.
 * Returns a ref to attach to the scrollable container and state for rendering the indicator.
 *
 * Usage:
 *   const { containerRef, state, indicatorStyle } = usePullToRefresh({
 *     onRefresh: async () => { await fetchData(); }
 *   });
 *   <div ref={containerRef}>
 *     <PullToRefreshIndicator style={indicatorStyle} state={state} />
 *     ...content
 *   </div>
 */
export function usePullToRefresh<T extends HTMLElement = HTMLDivElement>(
  options: UsePullToRefreshOptions
) {
  const { onRefresh, threshold = 80, maxPull = 120, enabled = true } = options;
  const containerRef = useRef<T | null>(null);
  const [state, setState] = useState<PullToRefreshState>({
    pulling: false,
    pullDistance: 0,
    refreshing: false,
    progress: 0,
  });

  const touchStartY = useRef(0);
  const isPulling = useRef(false);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!enabled || state.refreshing) return;
      const el = containerRef.current;
      // Only activate when scrolled to top
      if (el && el.scrollTop <= 0) {
        touchStartY.current = e.touches[0].clientY;
        isPulling.current = true;
      }
    },
    [enabled, state.refreshing]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isPulling.current || !enabled || state.refreshing) return;

      const currentY = e.touches[0].clientY;
      const diff = currentY - touchStartY.current;

      if (diff > 0) {
        // Apply resistance — pull feels harder the more you pull
        const resistance = Math.min(diff * 0.45, maxPull);
        const progress = Math.min(resistance / threshold, 1);

        setState({
          pulling: true,
          pullDistance: resistance,
          refreshing: false,
          progress,
        });

        // Prevent default scroll when pulling down
        if (diff > 10) {
          e.preventDefault();
        }
      }
    },
    [enabled, maxPull, threshold, state.refreshing]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current) return;
    isPulling.current = false;

    if (state.pullDistance >= threshold && !state.refreshing) {
      setState((prev) => ({ ...prev, pulling: false, refreshing: true, pullDistance: threshold * 0.6 }));

      try {
        await onRefresh();
      } catch {
        // Silently handle refresh errors
      }

      setState({ pulling: false, pullDistance: 0, refreshing: false, progress: 0 });
    } else {
      setState({ pulling: false, pullDistance: 0, refreshing: false, progress: 0 });
    }
  }, [state.pullDistance, state.refreshing, threshold, onRefresh]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !enabled) return;

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, enabled]);

  const indicatorStyle: React.CSSProperties = {
    height: state.pullDistance,
    opacity: state.progress,
    transition: state.pulling ? 'none' : 'all 300ms cubic-bezier(0.22, 1, 0.36, 1)',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  return { containerRef, state, indicatorStyle };
}

/**
 * Pull-to-refresh visual indicator component.
 */
export function PullToRefreshIndicator({
  state,
  style,
}: {
  state: PullToRefreshState;
  style: React.CSSProperties;
}) {
  if (!state.pulling && !state.refreshing && state.pullDistance === 0) return null;

  return (
    <div style={style} className="pointer-events-none select-none">
      {state.refreshing ? (
        <div className="h-6 w-6 rounded-full border-2 border-[#00D9FF]/30 border-t-[#00D9FF] animate-spin" />
      ) : (
        <div className="flex flex-col items-center gap-1">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            className="transition-transform duration-200"
            style={{
              transform: state.progress >= 1 ? 'rotate(180deg)' : 'rotate(0deg)',
              opacity: Math.max(0.3, state.progress),
            }}
          >
            <path
              d="M12 4v12m0 0l-4-4m4 4l4-4"
              stroke="#00D9FF"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span
            className="text-[10px] uppercase tracking-widest text-[#00D9FF]/60"
            style={{ opacity: state.progress }}
          >
            {state.progress >= 1 ? 'Release' : 'Pull to refresh'}
          </span>
        </div>
      )}
    </div>
  );
}
