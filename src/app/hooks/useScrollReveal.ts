import { useEffect, useRef, useState, useCallback } from 'react';

type RevealDirection = 'up' | 'down' | 'left' | 'right' | 'none';

interface UseScrollRevealOptions {
  /** Trigger threshold (0-1). Default: 0.15 */
  threshold?: number;
  /** Delay in ms before the reveal starts. Default: 0 */
  delay?: number;
  /** Slide direction. Default: 'up' */
  direction?: RevealDirection;
  /** Distance in pixels for the slide. Default: 24 */
  distance?: number;
  /** Animation duration in ms. Default: 500 */
  duration?: number;
  /** Only animate once. Default: true */
  once?: boolean;
  /** Root margin for IntersectionObserver. Default: '0px 0px -40px 0px' */
  rootMargin?: string;
}

const translateMap: Record<RevealDirection, (d: number) => string> = {
  up: (d) => `translateY(${d}px)`,
  down: (d) => `translateY(-${d}px)`,
  left: (d) => `translateX(${d}px)`,
  right: (d) => `translateX(-${d}px)`,
  none: () => 'translate(0)',
};

/**
 * Intersection-based scroll-reveal hook.
 * Returns a ref to attach to the element and whether it's visible.
 *
 * Usage:
 *   const [ref, isVisible] = useScrollReveal({ direction: 'up', delay: 100 });
 *   <div ref={ref} className={isVisible ? 'revealed' : ''}>
 *
 * Or use the style-based approach (no CSS classes needed):
 *   const [ref, isVisible] = useScrollReveal();
 *   <div ref={ref} style={scrollRevealStyle(isVisible)}>
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options: UseScrollRevealOptions = {}
): [React.RefObject<T | null>, boolean] {
  const {
    threshold = 0.15,
    once = true,
    rootMargin = '0px 0px -40px 0px',
  } = options;

  const ref = useRef<T | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect prefers-reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, once, rootMargin]);

  return [ref, isVisible];
}

/**
 * Generates inline styles for scroll-reveal animations.
 * Avoids the need for CSS classes — everything is GPU-composited.
 */
export function scrollRevealStyle(
  isVisible: boolean,
  options: Omit<UseScrollRevealOptions, 'threshold' | 'once' | 'rootMargin'> = {}
): React.CSSProperties {
  const {
    delay = 0,
    direction = 'up',
    distance = 24,
    duration = 500,
  } = options;

  return {
    opacity: isVisible ? 1 : 0,
    transform: isVisible ? 'translate(0)' : translateMap[direction](distance),
    transition: `opacity ${duration}ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms, transform ${duration}ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms`,
    willChange: isVisible ? 'auto' : 'opacity, transform',
  };
}

/**
 * Hook for staggered reveal of multiple children.
 * Returns a function that generates style for each index.
 */
export function useStaggerReveal<T extends HTMLElement = HTMLDivElement>(
  itemCount: number,
  options: UseScrollRevealOptions & { staggerDelay?: number } = {}
) {
  const { staggerDelay = 60, ...revealOptions } = options;
  const [ref, isVisible] = useScrollReveal<T>(revealOptions);

  const getItemStyle = useCallback(
    (index: number): React.CSSProperties =>
      scrollRevealStyle(isVisible, {
        ...revealOptions,
        delay: (revealOptions.delay ?? 0) + index * staggerDelay,
      }),
    [isVisible, staggerDelay, revealOptions.delay, revealOptions.direction, revealOptions.distance, revealOptions.duration]
  );

  return { containerRef: ref, isVisible, getItemStyle };
}
