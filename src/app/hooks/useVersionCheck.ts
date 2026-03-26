import { useEffect, useRef } from 'react';
import { projectId, publicAnonKey } from '@utils/supabase/info';

const EXPECTED_SERVICE = 'make-server-a1c55d7e';
const BASE_URL = `https://${projectId}.supabase.co/functions/v1/${EXPECTED_SERVICE}`;
const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export interface VersionCheckPayload {
  service: string;
  commitSha: string | null;
  commitShort: string | null;
  deployedAtUtc: string | null;
  deploymentAgeMinutes: number | null;
  staleThresholdMinutes: number | null;
  stale: boolean;
}

export type VersionCheckState =
  | { status: 'pending' }
  | { status: 'ok'; payload: VersionCheckPayload }
  | { status: 'stale'; payload: VersionCheckPayload }
  | { status: 'mismatch'; service: string; expected: string }
  | { status: 'error'; message: string };

type OnChangeCallback = (state: VersionCheckState) => void;

async function fetchVersionState(): Promise<VersionCheckState> {
  try {
    const res = await fetch(`${BASE_URL}/version`, {
      headers: {
        apikey: publicAnonKey,
        Authorization: `Bearer ${publicAnonKey}`,
      },
    });

    if (!res.ok) {
      return { status: 'error', message: `Version endpoint returned ${res.status}` };
    }

    const body = await res.json().catch(() => null);
    const version = body?.version;

    if (!version || typeof version !== 'object') {
      return { status: 'error', message: 'Malformed version payload' };
    }

    if (version.service !== EXPECTED_SERVICE) {
      return {
        status: 'mismatch',
        service: String(version.service ?? ''),
        expected: EXPECTED_SERVICE,
      };
    }

    const payload: VersionCheckPayload = {
      service: String(version.service),
      commitSha: typeof version.commitSha === 'string' ? version.commitSha : null,
      commitShort: typeof version.commitShort === 'string' ? version.commitShort : null,
      deployedAtUtc: typeof version.deployedAtUtc === 'string' ? version.deployedAtUtc : null,
      deploymentAgeMinutes: typeof version.deploymentAgeMinutes === 'number' ? version.deploymentAgeMinutes : null,
      staleThresholdMinutes: typeof version.staleThresholdMinutes === 'number' ? version.staleThresholdMinutes : null,
      stale: version.stale === true,
    };

    return payload.stale ? { status: 'stale', payload } : { status: 'ok', payload };
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Version check failed' };
  }
}

/**
 * Polls /version every 5 minutes and calls `onChange` when the state changes.
 * Logs warnings to console on stale or mismatch.
 * Runs silently — no UI side-effects. Callers decide how to present state.
 */
export function useVersionCheck(onChange: OnChangeCallback): void {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const alertedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const state = await fetchVersionState();
      if (cancelled) return;

      if (state.status === 'stale') {
        console.warn(
          `[VersionCheck] API deployment is stale (age=${state.payload.deploymentAgeMinutes}m, threshold=${state.payload.staleThresholdMinutes}m).`,
        );
      } else if (state.status === 'mismatch') {
        console.error(
          `[VersionCheck] Service name mismatch: expected="${state.expected}", got="${state.service}".`,
        );
      } else if (state.status === 'error') {
        console.warn(`[VersionCheck] Could not reach version endpoint: ${state.message}`);
      }

      onChangeRef.current(state);
    };

    void check();
    const timer = window.setInterval(() => void check(), POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  // Expose ref for one-time alert tracking
  void alertedRef;
}
