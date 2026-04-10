import { useState, useEffect, useCallback } from 'react';

export type PlatformMode = 'active' | 'readonly' | 'shutdown';

type PlatformModeState = {
  mode: PlatformMode;
  graceActive: boolean;
  graceRemainingMs: number;
  lastUpdated: number;
};

const POLL_INTERVAL_MS = 30_000;
const HEADER_MODE_KEY = 'x-platform-mode';
const HEADER_GRACE_KEY = 'x-platform-mode-grace';

let _globalPlatformMode: PlatformModeState = {
  mode: 'active',
  graceActive: false,
  graceRemainingMs: 0,
  lastUpdated: 0,
};

const listeners = new Set<() => void>();

function notify() {
  for (const fn of listeners) fn();
}

/** Update global platform mode from any fetch response headers */
export function updatePlatformModeFromHeaders(headers: Headers): void {
  const mode = headers.get(HEADER_MODE_KEY) as PlatformMode | null;
  if (mode && ['active', 'readonly', 'shutdown'].includes(mode)) {
    const graceActive = headers.get(HEADER_GRACE_KEY) === 'true';
    const graceRemainingStr = headers.get('x-platform-grace-remaining-sec');
    const graceRemainingMs = graceRemainingStr ? parseInt(graceRemainingStr, 10) * 1000 : 0;

    if (mode !== _globalPlatformMode.mode || graceActive !== _globalPlatformMode.graceActive) {
      _globalPlatformMode = {
        mode,
        graceActive,
        graceRemainingMs: Number.isFinite(graceRemainingMs) ? graceRemainingMs : 0,
        lastUpdated: Date.now(),
      };
      notify();
    }
  }
}

export function usePlatformMode(): PlatformModeState {
  const [state, setState] = useState<PlatformModeState>(_globalPlatformMode);

  useEffect(() => {
    const handler = () => setState({ ..._globalPlatformMode });
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, []);

  return state;
}

export function getPlatformMode(): PlatformMode {
  return _globalPlatformMode.mode;
}

export function isPlatformWritable(): boolean {
  return _globalPlatformMode.mode === 'active' ||
    (_globalPlatformMode.mode === 'readonly' && _globalPlatformMode.graceActive);
}
