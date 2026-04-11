import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@utils/supabase/info', () => ({
  projectId: 'test-project',
}));

const { buildAdminAuthHeadersMock } = vi.hoisted(() => ({
  buildAdminAuthHeadersMock: vi.fn(),
}));

vi.mock('../app/services/supabaseAuth', () => ({
  buildAdminAuthHeaders: buildAdminAuthHeadersMock,
}));

import {
  fetchAdminPlatformSettingsFromServer,
  getDefaultAdminPlatformSettings,
  normalizeAdminPlatformSettings,
  saveAdminPlatformSettingsToServer,
  type AdminPlatformSettings,
} from '../app/services/adminPlatformSettings';

const fetchMock = vi.fn();

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const makeSettings = (overrides: Partial<AdminPlatformSettings> = {}): AdminPlatformSettings => ({
  maintenanceMode: false,
  allowNewRegistration: true,
  minWithdrawal: 50,
  maxWithdrawal: 10000,
  withdrawalFee: 2,
  minDeposit: 10,
  taskRefreshHours: 24,
  autoAssignTasks: 'Enabled',
  platformHoursEnabled: false,
  platformHoursStart: 9,
  platformHoursEnd: 22,
  platformScheduleMode: 'simple',
  weeklySchedule: {
    sunday: { enabled: true, start: 9, end: 22 },
    monday: { enabled: true, start: 9, end: 22 },
    tuesday: { enabled: true, start: 9, end: 22 },
    wednesday: { enabled: true, start: 9, end: 22 },
    thursday: { enabled: true, start: 9, end: 22 },
    friday: { enabled: true, start: 9, end: 22 },
    saturday: { enabled: true, start: 9, end: 22 },
  },
  defaultTaskSetCount: 3,
  savedAt: '2026-03-20T00:00:00.000Z',
  ...overrides,
});

beforeEach(() => {
  fetchMock.mockReset();
  buildAdminAuthHeadersMock.mockReset();
  vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getDefaultAdminPlatformSettings', () => {
  it('returns the expected default values', () => {
    const result = getDefaultAdminPlatformSettings();

    expect(result.maintenanceMode).toBe(false);
    expect(result.allowNewRegistration).toBe(true);
    expect(result.minWithdrawal).toBe(50);
    expect(result.maxWithdrawal).toBe(10000);
    expect(result.withdrawalFee).toBe(2);
    expect(result.minDeposit).toBe(10);
    expect(result.taskRefreshHours).toBe(24);
    expect(result.autoAssignTasks).toBe('Enabled');
    expect(new Date(result.savedAt).toString()).not.toBe('Invalid Date');
  });
});

describe('normalizeAdminPlatformSettings', () => {
  it('returns null for non-object input', () => {
    expect(normalizeAdminPlatformSettings(null)).toBeNull();
    expect(normalizeAdminPlatformSettings('bad')).toBeNull();
  });

  it('returns null for invalid numeric constraints', () => {
    expect(normalizeAdminPlatformSettings(makeSettings({ minWithdrawal: 0 }))).toBeNull();
    expect(normalizeAdminPlatformSettings(makeSettings({ maxWithdrawal: 50 }))).toBeNull();
    expect(normalizeAdminPlatformSettings(makeSettings({ withdrawalFee: 51 }))).toBeNull();
    expect(normalizeAdminPlatformSettings(makeSettings({ minDeposit: 0 }))).toBeNull();
    expect(normalizeAdminPlatformSettings(makeSettings({ taskRefreshHours: 169 }))).toBeNull();
  });

  it('normalizes booleans, rounds values, and clamps supported ranges', () => {
    const result = normalizeAdminPlatformSettings({
      maintenanceMode: 1,
      allowNewRegistration: false,
      minWithdrawal: 12.345,
      maxWithdrawal: 9999999,
      withdrawalFee: 2.345,
      minDeposit: 45.678,
      taskRefreshHours: 12.9,
      autoAssignTasks: 'Disabled',
      savedAt: '',
    });

    expect(result).not.toBeNull();
    expect(result?.maintenanceMode).toBe(false);
    expect(result?.allowNewRegistration).toBe(false);
    expect(result?.minWithdrawal).toBe(12.35);
    expect(result?.maxWithdrawal).toBe(1_000_000);
    expect(result?.withdrawalFee).toBe(2.35);
    expect(result?.minDeposit).toBe(45.68);
    expect(result?.taskRefreshHours).toBe(13);
    expect(result?.autoAssignTasks).toBe('Disabled');
    expect(new Date(String(result?.savedAt)).toString()).not.toBe('Invalid Date');
  });

  it('defaults autoAssignTasks to Enabled for unexpected values', () => {
    const result = normalizeAdminPlatformSettings(makeSettings({ autoAssignTasks: 'other' as 'Enabled' }));
    expect(result?.autoAssignTasks).toBe('Enabled');
  });
});

describe('admin platform settings server helpers', () => {
  it('fetchAdminPlatformSettingsFromServer loads normalized settings', async () => {
    buildAdminAuthHeadersMock.mockResolvedValueOnce({ Authorization: 'Bearer read' });
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        settings: {
          ...makeSettings(),
          minWithdrawal: 12.345,
          maxWithdrawal: 1000.567,
          withdrawalFee: 2.999,
          minDeposit: 25.555,
          taskRefreshHours: 24.4,
          autoAssignTasks: 'Disabled',
        },
      }),
    );

    const result = await fetchAdminPlatformSettingsFromServer();

    expect(buildAdminAuthHeadersMock).toHaveBeenCalledWith(false);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://test-project.supabase.co/functions/v1/make-server-a1c55d7e/admin/platform-settings',
      { headers: { Authorization: 'Bearer read' } },
    );
    expect(result?.minWithdrawal).toBe(12.35);
    expect(result?.maxWithdrawal).toBe(1000.57);
    expect(result?.withdrawalFee).toBe(3);
    expect(result?.minDeposit).toBe(25.56);
    expect(result?.taskRefreshHours).toBe(24);
    expect(result?.autoAssignTasks).toBe('Disabled');
  });

  it('fetchAdminPlatformSettingsFromServer returns null for invalid payload', async () => {
    buildAdminAuthHeadersMock.mockResolvedValueOnce({ Authorization: 'Bearer read' });
    fetchMock.mockResolvedValueOnce(jsonResponse({ settings: { ...makeSettings(), minWithdrawal: 0 } }));

    const result = await fetchAdminPlatformSettingsFromServer();
    expect(result).toBeNull();
  });

  it('fetchAdminPlatformSettingsFromServer throws on non-ok response', async () => {
    buildAdminAuthHeadersMock.mockResolvedValueOnce({ Authorization: 'Bearer read' });
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'forbidden' }, 403));

    await expect(fetchAdminPlatformSettingsFromServer()).rejects.toThrow('Failed to load platform settings');
  });

  it('saveAdminPlatformSettingsToServer sends PUT and returns normalized payload', async () => {
    buildAdminAuthHeadersMock.mockResolvedValueOnce({ Authorization: 'Bearer write', 'Content-Type': 'application/json' });
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        settings: {
          ...makeSettings(),
          minWithdrawal: 88.889,
          maxWithdrawal: 1200.333,
          withdrawalFee: 1.239,
          minDeposit: 9.999,
          taskRefreshHours: 48.6,
        },
      }),
    );

    const result = await saveAdminPlatformSettingsToServer(makeSettings());

    expect(buildAdminAuthHeadersMock).toHaveBeenCalledWith();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://test-project.supabase.co/functions/v1/make-server-a1c55d7e/admin/platform-settings',
    );

    const requestInit = fetchMock.mock.calls[0][1] as RequestInit;
    expect(requestInit.method).toBe('PUT');
    expect(requestInit.headers).toEqual({ Authorization: 'Bearer write', 'Content-Type': 'application/json' });
    expect(JSON.parse(String(requestInit.body))).toEqual({ settings: makeSettings() });
    expect(result.minWithdrawal).toBe(88.89);
    expect(result.maxWithdrawal).toBe(1200.33);
    expect(result.withdrawalFee).toBe(1.24);
    expect(result.minDeposit).toBe(10);
    expect(result.taskRefreshHours).toBe(49);
  });

  it('saveAdminPlatformSettingsToServer throws on non-ok response', async () => {
    buildAdminAuthHeadersMock.mockResolvedValueOnce({ Authorization: 'Bearer write' });
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'blocked' }, 500));

    await expect(saveAdminPlatformSettingsToServer(makeSettings())).rejects.toThrow('Failed to save platform settings');
  });

  it('saveAdminPlatformSettingsToServer throws when server payload is invalid', async () => {
    buildAdminAuthHeadersMock.mockResolvedValueOnce({ Authorization: 'Bearer write' });
    fetchMock.mockResolvedValueOnce(jsonResponse({ settings: { ...makeSettings(), maxWithdrawal: 10, minWithdrawal: 20 } }));

    await expect(saveAdminPlatformSettingsToServer(makeSettings())).rejects.toThrow(
      'Server returned invalid platform settings payload',
    );
  });
});