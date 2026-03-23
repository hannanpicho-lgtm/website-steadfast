// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  buildBackupExport,
  parseBackupImport,
  pruneExpiredRestorePoints,
  createAuditEvent,
  createSalaryRestorePoint,
  createRecoveryPoint,
  createAutoBackupPoint,
  loadSalaryProjectAutosave,
  saveSalaryProjectAutosave,
  loadSalaryAuditLog,
  saveSalaryAuditLog,
  fetchAdminSalaryProjectState,
  saveAdminSalaryProjectState,
  fetchAdminSalaryAuditLogFromServer,
  saveAdminSalaryAuditLogToServer,
  resetAdminSalaryCompatibilityStorageForTests,
  seedAdminSalaryProjectCompatibilityStorageForTests,
  seedAdminSalaryAuditCompatibilityStorageForTests,
  MAX_RESTORE_POINTS,
  MAX_AUDIT_EVENTS,
  AUTO_BACKUP_INTERVAL_MS,
  type SalaryPayment,
  type SalaryRestorePoint,
} from '../app/services/adminSalaryBackup';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makePayment = (overrides: Partial<SalaryPayment> = {}): SalaryPayment => ({
  id: 1,
  username: 'alice',
  daysWorked: 15,
  salaryDue: 3060,
  status: 'Pending',
  dueDate: '2026-03-10',
  paymentMode: 'Automatic',
  ...overrides,
});

const makeRestorePoint = (overrides: Partial<SalaryRestorePoint> = {}): SalaryRestorePoint => ({
  id: Date.now(),
  createdAt: new Date().toISOString(),
  label: 'Test backup',
  payments: [makePayment()],
  ...overrides,
});

const DEFAULT_PAYMENTS = [makePayment(), makePayment({ id: 2, username: 'bob', salaryDue: 1428 })];
const fetchMock = vi.fn();

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ─── Constants ─────────────────────────────────────────────────────────────────

describe('exported constants', () => {
  it('AUTO_BACKUP_INTERVAL_MS is 60 000 ms', () => {
    expect(AUTO_BACKUP_INTERVAL_MS).toBe(60_000);
  });
  it('MAX_RESTORE_POINTS is 10', () => {
    expect(MAX_RESTORE_POINTS).toBe(10);
  });
  it('MAX_AUDIT_EVENTS is 50', () => {
    expect(MAX_AUDIT_EVENTS).toBe(50);
  });
});

// ─── createSalaryRestorePoint ──────────────────────────────────────────────────

describe('createSalaryRestorePoint', () => {
  it('returns a point with the correct shape', () => {
    const point = createSalaryRestorePoint('My backup', DEFAULT_PAYMENTS);
    expect(point.label).toBe('My backup');
    expect(point.payments).toHaveLength(2);
    expect(typeof point.id).toBe('number');
    expect(typeof point.createdAt).toBe('string');
  });

  it('deep-copies payments so later mutations do not affect the stored point', () => {
    const payments = [makePayment()];
    const point = createSalaryRestorePoint('deep copy test', payments);
    payments[0].salaryDue = 99_999;
    expect(point.payments[0].salaryDue).toBe(3060);
  });
});

// ─── createRecoveryPoint ─────────────────────────────────────────────────────

describe('createRecoveryPoint', () => {
  it('prefixes labels with Recovery point', () => {
    const point = createRecoveryPoint('Bulk payment (all)', DEFAULT_PAYMENTS);
    expect(point.label).toBe('Recovery point: Bulk payment (all)');
  });

  it('deep-copies payments for recovery snapshots', () => {
    const payments = [makePayment()];
    const point = createRecoveryPoint('Before restore', payments);
    payments[0].status = 'Paid';
    expect(point.payments[0].status).toBe('Pending');
  });
});

// ─── createAutoBackupPoint ─────────────────────────────────────────────────────

describe('createAutoBackupPoint', () => {
  it('produces a point on first call (empty signature)', () => {
    const { point } = createAutoBackupPoint([makePayment()], '');
    expect(point).not.toBeNull();
  });

  it('returns null point when data is unchanged', () => {
    const payments = [makePayment()];
    const { signature } = createAutoBackupPoint(payments, '');
    const { point } = createAutoBackupPoint(payments, signature);
    expect(point).toBeNull();
  });

  it('returns a point when payments change', () => {
    const payments = [makePayment()];
    const { signature } = createAutoBackupPoint(payments, '');
    payments[0].salaryDue = 99_999;
    const { point } = createAutoBackupPoint(payments, signature);
    expect(point).not.toBeNull();
  });

  it('labels the point with the current time', () => {
    const { point } = createAutoBackupPoint([makePayment()], '');
    expect(point?.label).toMatch(/^Auto backup /);
  });
});

// ─── pruneExpiredRestorePoints ─────────────────────────────────────────────────

describe('pruneExpiredRestorePoints', () => {
  const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

  it('removes points older than the retention period', () => {
    const old = makeRestorePoint({ createdAt: daysAgo(32), label: 'old' });
    const fresh = makeRestorePoint({ createdAt: daysAgo(1), label: 'fresh' });
    const result = pruneExpiredRestorePoints([old, fresh], 30);
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe('fresh');
  });

  it('keeps all points within the retention period', () => {
    const points = [makeRestorePoint(), makeRestorePoint()];
    expect(pruneExpiredRestorePoints(points, 30)).toHaveLength(2);
  });

  it('clamps retentionDays of 0 to 1 day minimum', () => {
    const recent = makeRestorePoint({ createdAt: daysAgo(2) });
    // Anything older than 1 day should be pruned when retention=0 (clamped to 1)
    expect(pruneExpiredRestorePoints([recent], 0)).toHaveLength(0);
  });

  it('drops points with unparseable createdAt', () => {
    const bad = makeRestorePoint({ createdAt: 'not-a-date' });
    expect(pruneExpiredRestorePoints([bad], 30)).toHaveLength(0);
  });
});

// ─── buildBackupExport / parseBackupImport round-trip ─────────────────────────

describe('buildBackupExport / parseBackupImport', () => {
  const makeExport = (overrides = {}) =>
    buildBackupExport({
      activeRewardTab: 'workday',
      selectedBulkOption: 'all',
      autoBackupEnabled: true,
      autoBackupIntervalMinutes: 5,
      backupRetentionDays: 30,
      points: [makeRestorePoint({ label: 'round-trip' })],
      ...overrides,
    });

  it('round-trips restore points correctly', () => {
    const imported = parseBackupImport(JSON.stringify(makeExport()));
    expect(imported.points).toHaveLength(1);
    expect(imported.points[0].label).toBe('round-trip');
  });

  it('throws on a tampered checksum', () => {
    const exported = makeExport();
    exported.checksum = 'deadbeef';
    expect(() => parseBackupImport(JSON.stringify(exported))).toThrow(/checksum/i);
  });

  it('throws on version !== 1', () => {
    expect(() => parseBackupImport(JSON.stringify({ version: 2, points: [] }))).toThrow();
  });

  it('throws when no valid restore points in file', () => {
    const raw = JSON.parse(JSON.stringify(makeExport())) as Record<string, unknown>;
    delete raw.checksum; // skip checksum validation
    raw.points = [{ id: 'bad', payments: [] }]; // empty payments → sanitize returns null
    expect(() => parseBackupImport(JSON.stringify(raw))).toThrow(/no valid/i);
  });

  it('restores UI state fields correctly', () => {
    const exported = makeExport({
      activeRewardTab: 'salary-payments',
      selectedBulkOption: 'manual',
      autoBackupEnabled: false,
      autoBackupIntervalMinutes: 15,
      backupRetentionDays: 7,
    });
    const imported = parseBackupImport(JSON.stringify(exported));
    expect(imported.activeRewardTab).toBe('salary-payments');
    expect(imported.selectedBulkOption).toBe('manual');
    expect(imported.autoBackupEnabled).toBe(false);
    expect(imported.autoBackupIntervalMinutes).toBe(15);
    expect(imported.backupRetentionDays).toBe(7);
  });

  it('clamps out-of-range interval minutes (0 → 1, 999 → 60)', () => {
    const e1 = buildBackupExport({
      activeRewardTab: 'workday',
      selectedBulkOption: 'all',
      autoBackupEnabled: true,
      autoBackupIntervalMinutes: 0,
      backupRetentionDays: 30,
      points: [makeRestorePoint()],
    });
    const e2 = buildBackupExport({
      activeRewardTab: 'workday',
      selectedBulkOption: 'all',
      autoBackupEnabled: true,
      autoBackupIntervalMinutes: 999,
      backupRetentionDays: 30,
      points: [makeRestorePoint()],
    });
    expect(e1.uiState.autoBackupIntervalMinutes).toBe(1);
    expect(e2.uiState.autoBackupIntervalMinutes).toBe(60);
  });
});

// ─── saveSalaryProjectAutosave / loadSalaryProjectAutosave ────────────────────

describe('saveSalaryProjectAutosave / loadSalaryProjectAutosave', () => {
  beforeEach(() => resetAdminSalaryCompatibilityStorageForTests());

  const save = (overrides = {}) =>
    saveSalaryProjectAutosave({
      activeRewardTab: 'workday',
      selectedBulkOption: 'all',
      autoBackupEnabled: true,
      autoBackupIntervalMinutes: 1,
      backupRetentionDays: 30,
      payments: DEFAULT_PAYMENTS,
      points: [],
      ...overrides,
    });

  it('save returns ok: true', () => {
    expect(save().ok).toBe(true);
  });

  it('loads previously saved payments', () => {
    save();
    const { payments } = loadSalaryProjectAutosave(DEFAULT_PAYMENTS);
    expect(payments).toHaveLength(2);
    expect(payments[0].username).toBe('alice');
  });

  it('persists autosave data to browser localStorage when available', () => {
    save();
    const raw = localStorage.getItem('steadfast_admin_salary_project_v1');

    expect(raw).not.toBeNull();
    expect(JSON.parse(String(raw))).toMatchObject({
      version: 1,
      payments: DEFAULT_PAYMENTS,
    });
  });

  it('returns default payments when storage is empty', () => {
    const { payments } = loadSalaryProjectAutosave(DEFAULT_PAYMENTS);
    expect(payments).toEqual(DEFAULT_PAYMENTS);
  });

  it('returns defaults when storage contains malformed JSON', () => {
    seedAdminSalaryProjectCompatibilityStorageForTests('{{invalid}}');
    const { payments } = loadSalaryProjectAutosave(DEFAULT_PAYMENTS);
    expect(payments).toEqual(DEFAULT_PAYMENTS);
  });

  it('returns defaults when checksum is tampered', () => {
    save();
    const raw = {
      version: 1,
      savedAt: new Date().toISOString(),
      checksum: 'tampered00',
      uiState: {
        activeRewardTab: 'workday',
        selectedBulkOption: 'all',
        autoBackupEnabled: true,
        autoBackupIntervalMinutes: 1,
        backupRetentionDays: 30,
      },
      payments: DEFAULT_PAYMENTS,
      points: [],
    };
    raw.checksum = 'tampered00';
    seedAdminSalaryProjectCompatibilityStorageForTests(JSON.stringify(raw));
    const { payments } = loadSalaryProjectAutosave(DEFAULT_PAYMENTS);
    expect(payments).toEqual(DEFAULT_PAYMENTS);
  });

  it('surfaces browser storage write failures', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    expect(save()).toEqual({
      ok: false,
      message: 'Unable to save backup data to browser storage. quota exceeded',
    });

    setItemSpy.mockRestore();
  });

  it('saves and restores restore points', () => {
    const points = [makeRestorePoint({ label: 'persisted point' })];
    save({ points });
    const { points: loaded } = loadSalaryProjectAutosave(DEFAULT_PAYMENTS);
    expect(loaded).toHaveLength(1);
    expect(loaded[0].label).toBe('persisted point');
  });

  it('saves and restores all UI state fields', () => {
    save({
      activeRewardTab: 'salary-payments',
      selectedBulkOption: 'manual',
      autoBackupEnabled: false,
      autoBackupIntervalMinutes: 10,
      backupRetentionDays: 14,
    });
    const loaded = loadSalaryProjectAutosave(DEFAULT_PAYMENTS);
    expect(loaded.activeRewardTab).toBe('salary-payments');
    expect(loaded.selectedBulkOption).toBe('manual');
    expect(loaded.autoBackupEnabled).toBe(false);
    expect(loaded.autoBackupIntervalMinutes).toBe(10);
    expect(loaded.backupRetentionDays).toBe(14);
  });
});

// ─── createAuditEvent ─────────────────────────────────────────────────────────

describe('createAuditEvent', () => {
  it('creates an event with the correct shape', () => {
    const event = createAuditEvent('manual-backup', 'triggered by user');
    expect(event.action).toBe('manual-backup');
    expect(event.detail).toBe('triggered by user');
    expect(typeof event.id).toBe('number');
    expect(typeof event.at).toBe('string');
    expect(new Date(event.at).toString()).not.toBe('Invalid Date');
  });
});

// ─── saveSalaryAuditLog / loadSalaryAuditLog ────────────────────────────────────

describe('saveSalaryAuditLog / loadSalaryAuditLog', () => {
  beforeEach(() => resetAdminSalaryCompatibilityStorageForTests());

  it('returns empty array when no log exists', () => {
    expect(loadSalaryAuditLog()).toEqual([]);
  });

  it('saves and loads a single event', () => {
    const events = [createAuditEvent('auto-backup', 'test')];
    expect(saveSalaryAuditLog(events).ok).toBe(true);
    const loaded = loadSalaryAuditLog();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].action).toBe('auto-backup');
  });

  it('persists audit log data to browser localStorage when available', () => {
    const events = [createAuditEvent('manual-backup', 'persisted')];
    saveSalaryAuditLog(events);

    const raw = localStorage.getItem('steadfast_admin_salary_audit_log_v1');
    expect(raw).not.toBeNull();
    expect(JSON.parse(String(raw))).toHaveLength(1);
  });

  it(`truncates the log to MAX_AUDIT_EVENTS (${MAX_AUDIT_EVENTS}) on save`, () => {
    const events = Array.from({ length: 70 }, (_, i) =>
      createAuditEvent('auto-backup', `event ${i}`),
    );
    saveSalaryAuditLog(events);
    expect(loadSalaryAuditLog().length).toBeLessThanOrEqual(MAX_AUDIT_EVENTS);
  });

  it('returns empty array when storage contains invalid JSON', () => {
    seedAdminSalaryAuditCompatibilityStorageForTests('bad');
    expect(loadSalaryAuditLog()).toEqual([]);
  });
});

// ─── server sync helpers ─────────────────────────────────────────────────────

describe('salary backup server sync helpers', () => {
  const serverUrl = 'https://api.example.test';
  const headers = { Authorization: 'Bearer token' };

  it('fetchAdminSalaryProjectState returns sanitized project data on 200', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        project: {
          uiState: {
            activeRewardTab: 'salary-payments',
            selectedBulkOption: 'manual',
            autoBackupEnabled: false,
            autoBackupIntervalMinutes: 999,
            backupRetentionDays: 0,
          },
          payments: [makePayment({ username: 'server-user' })],
          points: [makeRestorePoint({ label: 'server point' })],
        },
      }),
    );

    const result = await fetchAdminSalaryProjectState({
      serverUrl,
      headers,
      defaultPayments: DEFAULT_PAYMENTS,
    });

    expect(result).not.toBeNull();
    expect(result?.payments[0].username).toBe('server-user');
    expect(result?.points[0].label).toBe('server point');
    expect(result?.activeRewardTab).toBe('salary-payments');
    expect(result?.selectedBulkOption).toBe('manual');
    expect(result?.autoBackupEnabled).toBe(false);
    expect(result?.autoBackupIntervalMinutes).toBe(60);
    expect(result?.backupRetentionDays).toBe(1);
  });

  it('fetchAdminSalaryProjectState returns null for non-ok response', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'forbidden' }, 403));

    const result = await fetchAdminSalaryProjectState({
      serverUrl,
      headers,
      defaultPayments: DEFAULT_PAYMENTS,
    });

    expect(result).toBeNull();
  });

  it('fetchAdminSalaryProjectState returns null when fetch throws', async () => {
    fetchMock.mockRejectedValueOnce(new Error('request failed'));

    const result = await fetchAdminSalaryProjectState({
      serverUrl,
      headers,
      defaultPayments: DEFAULT_PAYMENTS,
    });

    expect(result).toBeNull();
  });

  it('saveAdminSalaryProjectState returns ok and sends PUT payload', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }, 200));

    const result = await saveAdminSalaryProjectState({
      serverUrl,
      headers,
      payload: {
        activeRewardTab: 'workday',
        selectedBulkOption: 'all',
        autoBackupEnabled: true,
        autoBackupIntervalMinutes: 0,
        backupRetentionDays: 999,
        payments: DEFAULT_PAYMENTS,
        points: [makeRestorePoint()],
      },
    });

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(`${serverUrl}/admin/salary/project`);

    const requestInit = fetchMock.mock.calls[0][1] as RequestInit;
    expect(requestInit.method).toBe('PUT');
    const body = JSON.parse(String(requestInit.body)) as {
      project: {
        uiState: {
          autoBackupIntervalMinutes: number;
          backupRetentionDays: number;
        };
        checksum: string;
      };
    };
    expect(body.project.uiState.autoBackupIntervalMinutes).toBe(1);
    expect(body.project.uiState.backupRetentionDays).toBe(365);
    expect(typeof body.project.checksum).toBe('string');
    expect(body.project.checksum.length).toBeGreaterThan(0);
  });

  it('saveAdminSalaryProjectState returns error message from server on failure', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'no access' }, 401));

    const result = await saveAdminSalaryProjectState({
      serverUrl,
      headers,
      payload: {
        activeRewardTab: 'workday',
        selectedBulkOption: 'all',
        autoBackupEnabled: true,
        autoBackupIntervalMinutes: 1,
        backupRetentionDays: 30,
        payments: DEFAULT_PAYMENTS,
        points: [],
      },
    });

    expect(result).toEqual({ ok: false, message: 'no access' });
  });

  it('saveAdminSalaryProjectState returns default message when error payload is not JSON', async () => {
    fetchMock.mockResolvedValueOnce(new Response('upstream failure', { status: 500 }));

    const result = await saveAdminSalaryProjectState({
      serverUrl,
      headers,
      payload: {
        activeRewardTab: 'workday',
        selectedBulkOption: 'all',
        autoBackupEnabled: true,
        autoBackupIntervalMinutes: 1,
        backupRetentionDays: 30,
        payments: DEFAULT_PAYMENTS,
        points: [],
      },
    });

    expect(result).toEqual({
      ok: false,
      message: 'Unable to save salary backup state to server.',
    });
  });

  it('saveAdminSalaryProjectState returns network error details when fetch throws', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network down'));

    const result = await saveAdminSalaryProjectState({
      serverUrl,
      headers,
      payload: {
        activeRewardTab: 'workday',
        selectedBulkOption: 'all',
        autoBackupEnabled: true,
        autoBackupIntervalMinutes: 1,
        backupRetentionDays: 30,
        payments: DEFAULT_PAYMENTS,
        points: [],
      },
    });

    expect(result).toEqual({
      ok: false,
      message: 'Unable to save salary backup state to server. network down',
    });
  });

  it('saveAdminSalaryProjectState returns default message when a non-Error is thrown', async () => {
    fetchMock.mockRejectedValueOnce('boom');

    const result = await saveAdminSalaryProjectState({
      serverUrl,
      headers,
      payload: {
        activeRewardTab: 'workday',
        selectedBulkOption: 'all',
        autoBackupEnabled: true,
        autoBackupIntervalMinutes: 1,
        backupRetentionDays: 30,
        payments: DEFAULT_PAYMENTS,
        points: [],
      },
    });

    expect(result).toEqual({
      ok: false,
      message: 'Unable to save salary backup state to server.',
    });
  });

  it('fetchAdminSalaryAuditLogFromServer sanitizes and returns events', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        events: [
          { id: 1, at: new Date().toISOString(), action: 'manual-backup', detail: 'ok' },
          { id: 'bad', action: 'unknown' },
        ],
      }),
    );

    const result = await fetchAdminSalaryAuditLogFromServer({ serverUrl, headers });
    expect(result).toHaveLength(1);
    expect(result?.[0].action).toBe('manual-backup');
  });

  it('fetchAdminSalaryAuditLogFromServer returns null for non-ok response', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'forbidden' }, 403));
    const result = await fetchAdminSalaryAuditLogFromServer({ serverUrl, headers });
    expect(result).toBeNull();
  });

  it('fetchAdminSalaryAuditLogFromServer returns null when fetch throws', async () => {
    fetchMock.mockRejectedValueOnce(new Error('timeout'));
    const result = await fetchAdminSalaryAuditLogFromServer({ serverUrl, headers });
    expect(result).toBeNull();
  });

  it('saveAdminSalaryAuditLogToServer trims payload and returns ok', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }, 200));
    const events = Array.from({ length: MAX_AUDIT_EVENTS + 5 }, (_, index) =>
      createAuditEvent('auto-backup', `e-${index}`),
    );

    const result = await saveAdminSalaryAuditLogToServer({ serverUrl, headers, events });
    expect(result).toEqual({ ok: true });

    const requestInit = fetchMock.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(String(requestInit.body)) as { events: unknown[] };
    expect(body.events).toHaveLength(MAX_AUDIT_EVENTS);
  });

  it('saveAdminSalaryAuditLogToServer returns error message from server on failure', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'blocked' }, 403));

    const result = await saveAdminSalaryAuditLogToServer({
      serverUrl,
      headers,
      events: [createAuditEvent('manual-backup', 'x')],
    });

    expect(result).toEqual({ ok: false, message: 'blocked' });
  });

  it('saveAdminSalaryAuditLogToServer returns default message when response is not JSON', async () => {
    fetchMock.mockResolvedValueOnce(new Response('fail', { status: 500 }));

    const result = await saveAdminSalaryAuditLogToServer({
      serverUrl,
      headers,
      events: [createAuditEvent('manual-backup', 'x')],
    });

    expect(result).toEqual({
      ok: false,
      message: 'Unable to save salary audit log to server.',
    });
  });

  it('saveAdminSalaryAuditLogToServer returns network error details when fetch throws', async () => {
    fetchMock.mockRejectedValueOnce(new Error('socket closed'));

    const result = await saveAdminSalaryAuditLogToServer({
      serverUrl,
      headers,
      events: [createAuditEvent('manual-backup', 'x')],
    });

    expect(result).toEqual({
      ok: false,
      message: 'Unable to save salary audit log to server. socket closed',
    });
  });

  it('saveAdminSalaryAuditLogToServer returns default message when a non-Error is thrown', async () => {
    fetchMock.mockRejectedValueOnce({ unexpected: true });

    const result = await saveAdminSalaryAuditLogToServer({
      serverUrl,
      headers,
      events: [createAuditEvent('manual-backup', 'x')],
    });

    expect(result).toEqual({
      ok: false,
      message: 'Unable to save salary audit log to server.',
    });
  });
});
