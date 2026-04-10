import { useCallback } from 'react';

/**
 * F4: Smart link prefetch on hover — prefetches route chunks when hovering nav items.
 * Returns onMouseEnter/onFocus handlers to attach to link elements.
 *
 * Usage:
 *   const prefetch = usePrefetchOnHover('/starting', () => import('../pages/Starting'));
 *   <Link to="/starting" {...prefetch}>Starting</Link>
 */
export function usePrefetchOnHover(
  _path: string,
  loader: () => Promise<unknown>
) {
  const prefetched = new Set<string>();

  const trigger = useCallback(() => {
    if (prefetched.has(_path)) return;
    prefetched.add(_path);
    loader().catch(() => {});
  }, [_path, loader]);

  return {
    onMouseEnter: trigger,
    onFocus: trigger,
  } as const;
}
