import { projectId } from '@utils/supabase/info';
import { buildAdminAuthHeaders } from './supabaseAuth';

export type AdminPlatformSettings = {
  maintenanceMode: boolean;
  allowNewRegistration: boolean;
  minWithdrawal: number;
  maxWithdrawal: number;
  withdrawalFee: number;
  minDeposit: number;
  taskRefreshHours: number;
  autoAssignTasks: 'Enabled' | 'Disabled';
  platformHoursEnabled: boolean;
  platformHoursStart: number;
  platformHoursEnd: number;
  defaultTaskSetCount: number;
  savedAt: string;
};

const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a1c55d7e`;

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}

function sanitizeAutoAssignTasks(value: unknown): 'Enabled' | 'Disabled' {
  return value === 'Disabled' ? 'Disabled' : 'Enabled';
}

export function getDefaultAdminPlatformSettings(): AdminPlatformSettings {
  return {
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
    defaultTaskSetCount: 2,
    savedAt: new Date().toISOString(),
  };
}

export function normalizeAdminPlatformSettings(value: unknown): AdminPlatformSettings | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const source = value as Record<string, unknown>;
  const minWithdrawal = Number(source.minWithdrawal);
  const maxWithdrawal = Number(source.maxWithdrawal);
  const withdrawalFee = Number(source.withdrawalFee);
  const minDeposit = Number(source.minDeposit);
  const taskRefreshHours = Number(source.taskRefreshHours);

  if (!Number.isFinite(minWithdrawal) || minWithdrawal < 1) {
    return null;
  }
  if (!Number.isFinite(maxWithdrawal) || maxWithdrawal <= minWithdrawal) {
    return null;
  }
  if (!Number.isFinite(withdrawalFee) || withdrawalFee < 0 || withdrawalFee > 50) {
    return null;
  }
  if (!Number.isFinite(minDeposit) || minDeposit < 1) {
    return null;
  }
  if (!Number.isFinite(taskRefreshHours) || taskRefreshHours < 1 || taskRefreshHours > 168) {
    return null;
  }

  return {
    maintenanceMode: source.maintenanceMode === true,
    allowNewRegistration: source.allowNewRegistration !== false,
    minWithdrawal: clamp(Math.round(minWithdrawal * 100) / 100, 1, 1_000_000),
    maxWithdrawal: clamp(Math.round(maxWithdrawal * 100) / 100, 1, 1_000_000),
    withdrawalFee: clamp(Math.round(withdrawalFee * 100) / 100, 0, 50),
    minDeposit: clamp(Math.round(minDeposit * 100) / 100, 1, 1_000_000),
    taskRefreshHours: clamp(Math.round(taskRefreshHours), 1, 168),
    autoAssignTasks: sanitizeAutoAssignTasks(source.autoAssignTasks),
    platformHoursEnabled: source.platformHoursEnabled === true,
    platformHoursStart: Number.isInteger(Number(source.platformHoursStart)) ? Math.min(23, Math.max(0, Math.round(Number(source.platformHoursStart)))) : 9,
    platformHoursEnd: Number.isInteger(Number(source.platformHoursEnd)) ? Math.min(24, Math.max(1, Math.round(Number(source.platformHoursEnd)))) : 22,
    defaultTaskSetCount: Number.isFinite(Number(source.defaultTaskSetCount)) ? Math.min(10, Math.max(1, Math.round(Number(source.defaultTaskSetCount)))) : 2,
    savedAt: typeof source.savedAt === 'string' && source.savedAt ? source.savedAt : new Date().toISOString(),
  };
}

export async function fetchAdminPlatformSettingsFromServer(): Promise<AdminPlatformSettings | null> {
  const headers = await buildAdminAuthHeaders(false);
  const response = await fetch(`${serverUrl}/admin/platform-settings`, { headers });

  if (!response.ok) {
    throw new Error('Failed to load platform settings');
  }

  const body = await response.json().catch(() => ({}));
  return normalizeAdminPlatformSettings((body as Record<string, unknown>).settings ?? null);
}

export async function saveAdminPlatformSettingsToServer(settings: AdminPlatformSettings): Promise<AdminPlatformSettings> {
  const headers = await buildAdminAuthHeaders();
  const response = await fetch(`${serverUrl}/admin/platform-settings`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ settings }),
  });

  if (!response.ok) {
    throw new Error('Failed to save platform settings');
  }

  const body = await response.json().catch(() => ({}));
  const saved = normalizeAdminPlatformSettings((body as Record<string, unknown>).settings ?? null);
  if (!saved) {
    throw new Error('Server returned invalid platform settings payload');
  }

  return saved;
}
