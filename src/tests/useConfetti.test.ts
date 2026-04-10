/** @vitest-environment jsdom */
import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { useConfetti } from '@/app/hooks/useConfetti';

describe('useConfetti', () => {
  const mockMatchMedia = vi.fn().mockReturnValue({
    matches: false,
    media: '',
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  });

  beforeEach(() => {
    window.matchMedia = mockMatchMedia;
    // jsdom doesn't implement canvas — stub getContext
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      clearRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      globalAlpha: 1,
      fillStyle: '',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.querySelectorAll('canvas').forEach((c) => c.remove());
  });

  it('returns fire and fireCelebration functions', () => {
    const { result } = renderHook(() => useConfetti());
    expect(typeof result.current.fire).toBe('function');
    expect(typeof result.current.fireCelebration).toBe('function');
  });

  it('creates and removes canvas on fire()', () => {
    const { result } = renderHook(() => useConfetti());

    const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1);

    act(() => {
      result.current.fire({ count: 2, duration: 100 });
    });

    expect(document.querySelector('canvas')).toBeTruthy();
    expect(rafSpy).toHaveBeenCalled();
    rafSpy.mockRestore();
  });

  it('respects prefers-reduced-motion', () => {
    mockMatchMedia.mockReturnValueOnce({
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    });

    const { result } = renderHook(() => useConfetti());
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame');

    act(() => {
      result.current.fire();
    });

    expect(rafSpy).not.toHaveBeenCalled();
    expect(document.querySelector('canvas')).toBeFalsy();
    rafSpy.mockRestore();
  });

  it('fireCelebration calls fire with celebration preset', () => {
    const { result } = renderHook(() => useConfetti());
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1);

    act(() => {
      result.current.fireCelebration();
    });

    expect(document.querySelector('canvas')).toBeTruthy();
    rafSpy.mockRestore();
  });
});
