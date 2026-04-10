/**
 * F3: Trigger haptic feedback on supported mobile devices.
 * Safe no-op on devices/browsers without vibration API.
 */
export function hapticTap(durationMs = 10): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(durationMs);
    } catch {
      // Vibration API not available or blocked — silent no-op
    }
  }
}

export function hapticSuccess(): void {
  hapticTap(15);
}

export function hapticError(): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([10, 30, 10]);
    } catch {
      // silent
    }
  }
}
