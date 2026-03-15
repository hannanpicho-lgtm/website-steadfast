// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildBackupExport,
  parseBackupImport,
  pruneExpiredRestorePoints,
  createAuditEvent,
  createSalaryRestorePoint,
  createAutoBackupPoint,
  loadSalaryProjectAutosave,
  saveSalaryProjectAutosave,
  loadSalaryAuditLog,
  saveSalaryAuditLog,
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
  beforeEach(() => localStorage.clear());

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

  it('returns default payments when storage is empty', () => {
    const { payments } = loadSalaryProjectAutosave(DEFAULT_PAYMENTS);
    expect(payments).toEqual(DEFAULT_PAYMENTS);
  });

  it('returns defaults when storage contains malformed JSON', () => {
    localStorage.setItem('steadfast_admin_salary_project_v1', '{{invalid}}');
    const { payments } = loadSalaryProjectAutosave(DEFAULT_PAYMENTS);
    expect(payments).toEqual(DEFAULT_PAYMENTS);
  });

  it('returns defaults when checksum is tampered', () => {
    save();
    const raw = JSON.parse(localStorage.getItem('steadfast_admin_salary_project_v1')!);
    raw.checksum = 'tampered00';
    localStorage.setItem('steadfast_admin_salary_project_v1', JSON.stringify(raw));
    const { payments } = loadSalaryProjectAutosave(DEFAULT_PAYMENTS);
    expect(payments).toEqual(DEFAULT_PAYMENTS);
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
  beforeEach(() => localStorage.clear());

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

  it(`truncates the log to MAX_AUDIT_EVENTS (${MAX_AUDIT_EVENTS}) on save`, () => {
    const events = Array.from({ length: 70 }, (_, i) =>
      createAuditEvent('auto-backup', `event ${i}`),
    );
    saveSalaryAuditLog(events);
    expect(loadSalaryAuditLog().length).toBeLessThanOrEqual(MAX_AUDIT_EVENTS);
  });

  it('returns empty array when storage contains invalid JSON', () => {
    localStorage.setItem('steadfast_admin_salary_audit_log_v1', 'bad');
    expect(loadSalaryAuditLog()).toEqual([]);
  });
});
