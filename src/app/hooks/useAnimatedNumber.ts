import { useEffect, useRef, useState, useCallback } from 'react';

interface UseAnimatedNumberOptions {
  /** Animation duration in ms. Default: 800 */
  duration?: number;
  /** Decimal places. Default: 2 */
  decimals?: number;
  /** Easing function. Default: easeOutExpo */
  easing?: (t: number) => number;
  /** Prefix string (e.g., '$'). Default: '' */
  prefix?: string;
  /** Suffix string (e.g., ' USD'). Default: '' */
  suffix?: string;
  /** Whether to use locale formatting. Default: true */
  locale?: boolean;
  /** Delay before animation starts in ms. Default: 0 */
  delay?: number;
}

// Easing functions
const easings = {
  easeOutExpo: (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  easeOutCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  easeInOutQuart: (t: number) =>
    t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2,
};

/**
 * Animates a number from its previous value to the new target.
 * Returns the formatted display string.
 *
 * Usage:
 *   const displayBalance = useAnimatedNumber(balance, { prefix: '$', suffix: ' USD' });
 *   <span>{displayBalance}</span>
 */
export function useAnimatedNumber(
  target: number,
  options: UseAnimatedNumberOptions = {}
): string {
  const {
    duration = 800,
    decimals = 2,
    easing = easings.easeOutExpo,
    prefix = '',
    suffix = '',
    locale = true,
    delay = 0,
  } = options;

  const [displayValue, setDisplayValue] = useState(target);
  const previousRef = useRef(target);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef(0);

  useEffect(() => {
    // Respect prefers-reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayValue(target);
      previousRef.current = target;
      return;
    }

    const from = previousRef.current;
    const to = target;

    if (from === to) return;

    const startAnimation = () => {
      startTimeRef.current = 0;

      const animate = (timestamp: number) => {
        if (!startTimeRef.current) startTimeRef.current = timestamp;
        const elapsed = timestamp - startTimeRef.current;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = easing(progress);

        const current = from + (to - from) * easedProgress;
        setDisplayValue(current);

        if (progress < 1) {
          rafRef.current = requestAnimationFrame(animate);
        } else {
          setDisplayValue(to);
          previousRef.current = to;
        }
      };

      rafRef.current = requestAnimationFrame(animate);
    };

    if (delay > 0) {
      const timeoutId = window.setTimeout(startAnimation, delay);
      return () => {
        window.clearTimeout(timeoutId);
        cancelAnimationFrame(rafRef.current);
      };
    }

    startAnimation();
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration, easing, delay]);

  // Format the display value
  const formatted = locale
    ? displayValue.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
    : displayValue.toFixed(decimals);

  return `${prefix}${formatted}${suffix}`;
}

/**
 * Simplified variant that returns just the number for custom formatting.
 */
export function useAnimatedRawNumber(
  target: number,
  options: Omit<UseAnimatedNumberOptions, 'prefix' | 'suffix' | 'locale'> = {}
): number {
  const {
    duration = 800,
    decimals = 2,
    easing = easings.easeOutExpo,
    delay = 0,
  } = options;

  const [displayValue, setDisplayValue] = useState(target);
  const previousRef = useRef(target);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayValue(target);
      previousRef.current = target;
      return;
    }

    const from = previousRef.current;
    if (from === target) return;

    let startTime = 0;

    const doAnimate = () => {
      const animate = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        const current = from + (target - from) * easing(progress);
        setDisplayValue(Number(current.toFixed(decimals)));

        if (progress < 1) {
          rafRef.current = requestAnimationFrame(animate);
        } else {
          setDisplayValue(target);
          previousRef.current = target;
        }
      };
      rafRef.current = requestAnimationFrame(animate);
    };

    if (delay > 0) {
      const tid = window.setTimeout(doAnimate, delay);
      return () => { window.clearTimeout(tid); cancelAnimationFrame(rafRef.current); };
    }

    doAnimate();
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration, decimals, easing, delay]);

  return displayValue;
}
