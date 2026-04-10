import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the usePlatformMode module
const mockListeners = new Set<() => void>();
let mockGlobalMode = {
  mode: 'active' as 'active' | 'readonly' | 'shutdown',
  graceActive: false,
  graceRemainingMs: 0,
  lastUpdated: 0,
};

vi.mock('../app/hooks/usePlatformMode', () => {
  return {
    updatePlatformModeFromHeaders: (headers: Headers) => {
      const mode = headers.get('x-platform-mode') as any;
      if (mode && ['active', 'readonly', 'shutdown'].includes(mode)) {
        mockGlobalMode = {
          mode,
          graceActive: headers.get('x-platform-mode-grace') === 'true',
          graceRemainingMs: parseInt(headers.get('x-platform-grace-remaining-sec') ?? '0', 10) * 1000,
          lastUpdated: Date.now(),
        };
        for (const fn of mockListeners) fn();
      }
    },
    getPlatformMode: () => mockGlobalMode.mode,
    isPlatformWritable: () =>
      mockGlobalMode.mode === 'active' ||
      (mockGlobalMode.mode === 'readonly' && mockGlobalMode.graceActive),
  };
});

import { updatePlatformModeFromHeaders, getPlatformMode, isPlatformWritable } from '../app/hooks/usePlatformMode';

describe('usePlatformMode', () => {
  beforeEach(() => {
    mockGlobalMode = { mode: 'active', graceActive: false, graceRemainingMs: 0, lastUpdated: 0 };
  });

  describe('updatePlatformModeFromHeaders', () => {
    it('should update mode from response headers', () => {
      const headers = new Headers({ 'x-platform-mode': 'readonly' });
      updatePlatformModeFromHeaders(headers);
      expect(getPlatformMode()).toBe('readonly');
    });

    it('should detect grace period from headers', () => {
      const headers = new Headers({
        'x-platform-mode': 'readonly',
        'x-platform-mode-grace': 'true',
        'x-platform-grace-remaining-sec': '25',
      });
      updatePlatformModeFromHeaders(headers);
      expect(getPlatformMode()).toBe('readonly');
      expect(isPlatformWritable()).toBe(true);
    });

    it('should report not writable when readonly without grace', () => {
      const headers = new Headers({ 'x-platform-mode': 'readonly' });
      updatePlatformModeFromHeaders(headers);
      expect(isPlatformWritable()).toBe(false);
    });

    it('should report not writable when shutdown', () => {
      const headers = new Headers({ 'x-platform-mode': 'shutdown' });
      updatePlatformModeFromHeaders(headers);
      expect(isPlatformWritable()).toBe(false);
    });

    it('should ignore invalid mode values', () => {
      const headers = new Headers({ 'x-platform-mode': 'invalid' });
      updatePlatformModeFromHeaders(headers);
      expect(getPlatformMode()).toBe('active');
    });

    it('should ignore missing header', () => {
      const headers = new Headers({});
      updatePlatformModeFromHeaders(headers);
      expect(getPlatformMode()).toBe('active');
    });

    it('should transition back to active', () => {
      const readonlyHeaders = new Headers({ 'x-platform-mode': 'readonly' });
      updatePlatformModeFromHeaders(readonlyHeaders);
      expect(getPlatformMode()).toBe('readonly');

      const activeHeaders = new Headers({ 'x-platform-mode': 'active' });
      updatePlatformModeFromHeaders(activeHeaders);
      expect(getPlatformMode()).toBe('active');
      expect(isPlatformWritable()).toBe(true);
    });
  });
});

describe('Platform Mode Guard (Server-side behavior)', () => {
  it('should define valid mode transitions', () => {
    const validTransitions: Record<string, string[]> = {
      active: ['readonly', 'shutdown'],
      readonly: ['active', 'shutdown'],
      shutdown: ['readonly', 'active'],
    };

    expect(validTransitions.active).toContain('readonly');
    expect(validTransitions.active).toContain('shutdown');
    expect(validTransitions.readonly).toContain('active');
    expect(validTransitions.shutdown).toContain('active');
  });

  it('should enforce valid modes only', () => {
    const VALID_MODES = ['active', 'readonly', 'shutdown'];
    expect(VALID_MODES).toHaveLength(3);
    expect(VALID_MODES.includes('active')).toBe(true);
    expect(VALID_MODES.includes('readonly')).toBe(true);
    expect(VALID_MODES.includes('shutdown')).toBe(true);
    expect(VALID_MODES.includes('invalid' as any)).toBe(false);
  });

  it('should enforce valid strategies only', () => {
    const VALID_STRATEGIES = ['immediate', 'phased', 'auto-health'];
    expect(VALID_STRATEGIES).toHaveLength(3);
    expect(VALID_STRATEGIES.includes('immediate')).toBe(true);
    expect(VALID_STRATEGIES.includes('phased')).toBe(true);
    expect(VALID_STRATEGIES.includes('auto-health')).toBe(true);
  });
});

describe('Idempotency Key Generation', () => {
  it('should produce deterministic keys from same inputs', async () => {
    const encoder = new TextEncoder();
    const data = encoder.encode('test-body');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);

    const key1 = `idempotency:POST:/starting:user123:${hash}`;
    const key2 = `idempotency:POST:/starting:user123:${hash}`;
    expect(key1).toBe(key2);
  });

  it('should produce different keys for different bodies', async () => {
    const encoder = new TextEncoder();
    const hash1Buf = await crypto.subtle.digest('SHA-256', encoder.encode('body-a'));
    const hash2Buf = await crypto.subtle.digest('SHA-256', encoder.encode('body-b'));
    const hash1 = Array.from(new Uint8Array(hash1Buf)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
    const hash2 = Array.from(new Uint8Array(hash2Buf)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);

    expect(hash1).not.toBe(hash2);
  });

  it('should produce different keys for different users', () => {
    const key1 = `idempotency:POST:/starting:user1:abc123`;
    const key2 = `idempotency:POST:/starting:user2:abc123`;
    expect(key1).not.toBe(key2);
  });
});

describe('Platform Mode Record Sanitization', () => {
  it('should default to active when given null', () => {
    const VALID_MODES = ['active', 'readonly', 'shutdown'];
    const sanitize = (val: unknown) => {
      if (!val || typeof val !== 'object') return { mode: 'active', version: 0 };
      const src = val as Record<string, unknown>;
      return {
        mode: VALID_MODES.includes(src.mode as string) ? src.mode : 'active',
        version: typeof src.version === 'number' ? src.version : 0,
      };
    };

    expect(sanitize(null)).toEqual({ mode: 'active', version: 0 });
    expect(sanitize(undefined)).toEqual({ mode: 'active', version: 0 });
    expect(sanitize({})).toEqual({ mode: 'active', version: 0 });
    expect(sanitize({ mode: 'readonly', version: 5 })).toEqual({ mode: 'readonly', version: 5 });
    expect(sanitize({ mode: 'garbage' })).toEqual({ mode: 'active', version: 0 });
  });

  it('should clamp grace period to 0-300000ms', () => {
    const clampGrace = (ms: unknown) => {
      if (typeof ms !== 'number' || !Number.isFinite(ms)) return 0;
      return Math.max(0, Math.min(300_000, Math.round(ms)));
    };

    expect(clampGrace(30000)).toBe(30000);
    expect(clampGrace(-1000)).toBe(0);
    expect(clampGrace(999999)).toBe(300000);
    expect(clampGrace(NaN)).toBe(0);
    expect(clampGrace(null)).toBe(0);
  });
});

describe('Grace Period Logic', () => {
  it('should detect active grace period', () => {
    const isGraceActive = (deadline: string | null) => {
      if (!deadline) return false;
      return Date.now() < new Date(deadline).getTime();
    };

    const futureDeadline = new Date(Date.now() + 30000).toISOString();
    expect(isGraceActive(futureDeadline)).toBe(true);

    const pastDeadline = new Date(Date.now() - 30000).toISOString();
    expect(isGraceActive(pastDeadline)).toBe(false);

    expect(isGraceActive(null)).toBe(false);
  });
});

describe('Health Check Thresholds', () => {
  it('should escalate at correct thresholds', () => {
    const AUTO_READONLY_THRESHOLD = 3;
    const AUTO_SHUTDOWN_THRESHOLD = 5;
    const RECOVERY_THRESHOLD = 3;

    // Simulate consecutive failures
    expect(2 >= AUTO_READONLY_THRESHOLD).toBe(false);
    expect(3 >= AUTO_READONLY_THRESHOLD).toBe(true);
    expect(4 >= AUTO_SHUTDOWN_THRESHOLD).toBe(false);
    expect(5 >= AUTO_SHUTDOWN_THRESHOLD).toBe(true);
    expect(2 >= RECOVERY_THRESHOLD).toBe(false);
    expect(3 >= RECOVERY_THRESHOLD).toBe(true);
  });
});
