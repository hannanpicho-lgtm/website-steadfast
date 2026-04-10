/**
 * Mock for @tanstack/react-virtual that renders ALL items without virtualization.
 * JSDOM has zero-size elements, so the real virtualizer renders nothing.
 */
import { vi } from 'vitest';

interface VirtualItem {
  index: number;
  start: number;
  end: number;
  size: number;
  key: number;
}

export function useVirtualizer(opts: { count: number; estimateSize: () => number }) {
  const itemSize = opts.estimateSize();
  const items: VirtualItem[] = Array.from({ length: opts.count }, (_, i) => ({
    index: i,
    start: i * itemSize,
    end: (i + 1) * itemSize,
    size: itemSize,
    key: i,
  }));

  return {
    getVirtualItems: () => items,
    getTotalSize: () => opts.count * itemSize,
    measureElement: vi.fn(),
    scrollToIndex: vi.fn(),
  };
}
