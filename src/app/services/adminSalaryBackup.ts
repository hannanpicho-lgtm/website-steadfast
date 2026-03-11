export type RewardTab = 'workday' | 'reset' | 'accumulated' | 'product-system' | 'salary-payments';

export type SalaryPayment = {
  id: number;
  username: string;
  daysWorked: number;
  salaryDue: number;
  status: 'Pending' | 'Paid';
  dueDate: string;
  paidDate?: string;
  paymentMode: 'Automatic' | 'Manual';
};

export type SalaryRestorePoint = {
  id: number;
  createdAt: string;
  label: string;
  payments: SalaryPayment[];
};

export type SalaryBackupExport = {
  version: 1;
  exportedAt: string;
  checksum: string;
  uiState: {
    activeRewardTab: RewardTab;
    selectedBulkOption: 'all' | 'auto' | 'manual';
    autoBackupEnabled: boolean;
    autoBackupIntervalMinutes: number;
    backupRetentionDays: number;
  };
  points: SalaryRestorePoint[];
};

export type SalaryAuditAction =
  | 'auto-backup'
  | 'manual-backup'
  | 'pre-restore-snapshot'
  | 'restore'
  | 'restore-cancel'
  | 'delete-backup'
  | 'clear-backups'
  | 'import-backups'
  | 'export-backups'
  | 'single-payment'
  | 'bulk-payment'
  | 'settings-change';

export type SalaryAuditEvent = {
  id: number;
  at: string;
  action: SalaryAuditAction;
  detail: string;
};

type SalaryProjectAutosave = {
  version: 1;
  savedAt: string;
  checksum: string;
  uiState: {
    activeRewardTab: RewardTab;
    selectedBulkOption: 'all' | 'auto' | 'manual';
    autoBackupEnabled: boolean;
    autoBackupIntervalMinutes: number;
    backupRetentionDays: number;
  };
  payments: SalaryPayment[];
  points: SalaryRestorePoint[];
};

const SALARY_PROJECT_AUTOSAVE_KEY = 'steadfast_admin_salary_project_v1';
const SALARY_AUDIT_LOG_KEY = 'steadfast_admin_salary_audit_log_v1';
const VALID_REWARD_TABS: RewardTab[] = ['workday', 'reset', 'accumulated', 'product-system', 'salary-payments'];
const VALID_BULK_OPTIONS = ['all', 'auto', 'manual'] as const;

export const AUTO_BACKUP_INTERVAL_MS = 60_000;
export const MAX_RESTORE_POINTS = 10;
export const MAX_AUDIT_EVENTS = 50;

function computeChecksum(value: unknown): string {
  const text = JSON.stringify(value);
  let hash = 5381;

  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 33) ^ text.charCodeAt(index);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}

function sanitizeRewardTab(value: unknown): RewardTab {
  return typeof value === 'string' && VALID_REWARD_TABS.includes(value as RewardTab)
    ? (value as RewardTab)
    : 'workday';
}

function sanitizeBulkOption(value: unknown): 'all' | 'auto' | 'manual' {
  return typeof value === 'string' && (VALID_BULK_OPTIONS as readonly string[]).includes(value)
    ? (value as 'all' | 'auto' | 'manual')
    : 'all';
}

function sanitizeAutoBackupEnabled(value: unknown): boolean {
  return typeof value === 'boolean' ? value : true;
}

function sanitizeAutoBackupIntervalMinutes(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 1;
  }

  const rounded = Math.round(value);
  if (rounded < 1) {
    return 1;
  }
  if (rounded > 60) {
    return 60;
  }
  return rounded;
}

function sanitizeBackupRetentionDays(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 30;
  }

  const rounded = Math.round(value);
  if (rounded < 1) {
    return 1;
  }
  if (rounded > 365) {
    return 365;
  }
  return rounded;
}

function sanitizeSalaryPayment(value: unknown): SalaryPayment | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Partial<SalaryPayment>;
  const status = candidate.status === 'Paid' ? 'Paid' : candidate.status === 'Pending' ? 'Pending' : null;
  const paymentMode = candidate.paymentMode === 'Automatic' ? 'Automatic' : candidate.paymentMode === 'Manual' ? 'Manual' : null;

  if (
    typeof candidate.id !== 'number' ||
    typeof candidate.username !== 'string' ||
    typeof candidate.daysWorked !== 'number' ||
    typeof candidate.salaryDue !== 'number' ||
    typeof candidate.dueDate !== 'string' ||
    !status ||
    !paymentMode
  ) {
    return null;
  }

  return {
    id: candidate.id,
    username: candidate.username,
    daysWorked: candidate.daysWorked,
    salaryDue: candidate.salaryDue,
    status,
    dueDate: candidate.dueDate,
    paidDate: typeof candidate.paidDate === 'string' ? candidate.paidDate : undefined,
    paymentMode,
  };
}

function sanitizeRestorePoint(value: unknown): SalaryRestorePoint | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Partial<SalaryRestorePoint>;
  const payments = Array.isArray(candidate.payments)
    ? candidate.payments
        .map((payment) => sanitizeSalaryPayment(payment))
        .filter((payment): payment is SalaryPayment => payment !== null)
    : [];

  if (payments.length === 0) {
    return null;
  }

  return {
    id: typeof candidate.id === 'number' ? candidate.id : Date.now(),
    createdAt: typeof candidate.createdAt === 'string' ? candidate.createdAt : new Date().toISOString(),
    label: typeof candidate.label === 'string' && candidate.label.trim() ? candidate.label : 'Imported backup',
    payments,
  };
}

function sanitizePayments(values: unknown, fallback: SalaryPayment[]): SalaryPayment[] {
  if (!Array.isArray(values)) {
    return fallback;
  }

  const sanitized = values
    .map((value) => sanitizeSalaryPayment(value))
    .filter((payment): payment is SalaryPayment => payment !== null);

  return sanitized.length > 0 ? sanitized : fallback;
}

function sanitizeRestorePoints(values: unknown): SalaryRestorePoint[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((value) => sanitizeRestorePoint(value))
    .filter((point): point is SalaryRestorePoint => point !== null)
    .slice(0, MAX_RESTORE_POINTS);
}

function sanitizeAuditAction(value: unknown): SalaryAuditAction | null {
  if (typeof value !== 'string') {
    return null;
  }

  const valid: SalaryAuditAction[] = [
    'auto-backup',
    'manual-backup',
    'pre-restore-snapshot',
    'restore',
    'restore-cancel',
    'delete-backup',
    'clear-backups',
    'import-backups',
    'export-backups',
    'single-payment',
    'bulk-payment',
    'settings-change',
  ];

  return valid.includes(value as SalaryAuditAction) ? (value as SalaryAuditAction) : null;
}

function sanitizeAuditEvent(value: unknown): SalaryAuditEvent | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Partial<SalaryAuditEvent>;
  const action = sanitizeAuditAction(candidate.action);
  if (!action) {
    return null;
  }

  return {
    id: typeof candidate.id === 'number' ? candidate.id : Date.now(),
    at: typeof candidate.at === 'string' ? candidate.at : new Date().toISOString(),
    action,
    detail: typeof candidate.detail === 'string' ? candidate.detail : '',
  };
}

function sanitizeAuditEvents(values: unknown): SalaryAuditEvent[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((value) => sanitizeAuditEvent(value))
    .filter((event): event is SalaryAuditEvent => event !== null)
    .slice(0, MAX_AUDIT_EVENTS);
}

export function loadSalaryProjectAutosave(defaultPayments: SalaryPayment[]): {
  payments: SalaryPayment[];
  points: SalaryRestorePoint[];
  activeRewardTab: RewardTab;
  selectedBulkOption: 'all' | 'auto' | 'manual';
  autoBackupEnabled: boolean;
  autoBackupIntervalMinutes: number;
  backupRetentionDays: number;
} {
  let restoredPayments = defaultPayments.map((payment) => ({ ...payment }));
  let restoredPoints: SalaryRestorePoint[] = [];
  let restoredRewardTab: RewardTab = 'workday';
  let restoredBulkOption: 'all' | 'auto' | 'manual' = 'all';
  let restoredAutoBackupEnabled = true;
  let restoredAutoBackupIntervalMinutes = 1;
  let restoredBackupRetentionDays = 30;

  try {
    const savedProject = localStorage.getItem(SALARY_PROJECT_AUTOSAVE_KEY);
    if (savedProject) {
      const parsedProject = JSON.parse(savedProject) as SalaryProjectAutosave;
      if (parsedProject?.version === 1) {
        const payloadWithoutChecksum = {
          version: 1,
          savedAt: parsedProject.savedAt,
          uiState: parsedProject.uiState,
          payments: parsedProject.payments,
          points: parsedProject.points,
        };

        if (typeof parsedProject.checksum === 'string') {
          const expected = computeChecksum(payloadWithoutChecksum);
          if (expected !== parsedProject.checksum) {
            throw new Error('Autosave checksum mismatch.');
          }
        }

        restoredPayments = sanitizePayments(parsedProject.payments, defaultPayments);
        restoredPoints = sanitizeRestorePoints(parsedProject.points);
        restoredRewardTab = sanitizeRewardTab(parsedProject.uiState?.activeRewardTab);
        restoredBulkOption = sanitizeBulkOption(parsedProject.uiState?.selectedBulkOption);
        restoredAutoBackupEnabled = sanitizeAutoBackupEnabled(parsedProject.uiState?.autoBackupEnabled);
        restoredAutoBackupIntervalMinutes = sanitizeAutoBackupIntervalMinutes(parsedProject.uiState?.autoBackupIntervalMinutes);
        restoredBackupRetentionDays = sanitizeBackupRetentionDays(parsedProject.uiState?.backupRetentionDays);
      }
    }
  } catch {
    // Ignore malformed local storage and continue with defaults.
  }

  return {
    payments: restoredPayments,
    points: restoredPoints,
    activeRewardTab: restoredRewardTab,
    selectedBulkOption: restoredBulkOption,
    autoBackupEnabled: restoredAutoBackupEnabled,
    autoBackupIntervalMinutes: restoredAutoBackupIntervalMinutes,
    backupRetentionDays: restoredBackupRetentionDays,
  };
}

export function saveSalaryProjectAutosave(payload: {
  activeRewardTab: RewardTab;
  selectedBulkOption: 'all' | 'auto' | 'manual';
  autoBackupEnabled: boolean;
  autoBackupIntervalMinutes: number;
  backupRetentionDays: number;
  payments: SalaryPayment[];
  points: SalaryRestorePoint[];
}): void {
  const dataWithoutChecksum = {
    version: 1,
    savedAt: new Date().toISOString(),
    uiState: {
      activeRewardTab: payload.activeRewardTab,
      selectedBulkOption: payload.selectedBulkOption,
      autoBackupEnabled: payload.autoBackupEnabled,
      autoBackupIntervalMinutes: sanitizeAutoBackupIntervalMinutes(payload.autoBackupIntervalMinutes),
      backupRetentionDays: sanitizeBackupRetentionDays(payload.backupRetentionDays),
    },
    payments: payload.payments,
    points: payload.points,
  };

  const data: SalaryProjectAutosave = {
    ...dataWithoutChecksum,
    checksum: computeChecksum(dataWithoutChecksum),
  };

  localStorage.setItem(SALARY_PROJECT_AUTOSAVE_KEY, JSON.stringify(data));
}

export function createSalaryRestorePoint(label: string, payments: SalaryPayment[]): SalaryRestorePoint {
  return {
    id: Date.now(),
    createdAt: new Date().toISOString(),
    label,
    payments: payments.map((payment) => ({ ...payment })),
  };
}

export function createAutoBackupPoint(
  payments: SalaryPayment[],
  lastSignature: string,
): { point: SalaryRestorePoint | null; signature: string } {
  const snapshot = payments.map((payment) => ({ ...payment }));
  const signature = JSON.stringify(snapshot);

  if (signature === lastSignature) {
    return { point: null, signature };
  }

  return {
    point: {
      id: Date.now(),
      createdAt: new Date().toISOString(),
      label: `Auto backup ${new Date().toLocaleTimeString()}`,
      payments: snapshot,
    },
    signature,
  };
}

export function buildBackupExport(payload: {
  activeRewardTab: RewardTab;
  selectedBulkOption: 'all' | 'auto' | 'manual';
  autoBackupEnabled: boolean;
  autoBackupIntervalMinutes: number;
  backupRetentionDays: number;
  points: SalaryRestorePoint[];
}): SalaryBackupExport {
  const dataWithoutChecksum = {
    version: 1,
    exportedAt: new Date().toISOString(),
    uiState: {
      activeRewardTab: payload.activeRewardTab,
      selectedBulkOption: payload.selectedBulkOption,
      autoBackupEnabled: payload.autoBackupEnabled,
      autoBackupIntervalMinutes: sanitizeAutoBackupIntervalMinutes(payload.autoBackupIntervalMinutes),
      backupRetentionDays: sanitizeBackupRetentionDays(payload.backupRetentionDays),
    },
    points: payload.points,
  };

  return {
    ...dataWithoutChecksum,
    checksum: computeChecksum(dataWithoutChecksum),
  };
}

export function parseBackupImport(text: string): {
  points: SalaryRestorePoint[];
  activeRewardTab?: RewardTab;
  selectedBulkOption?: 'all' | 'auto' | 'manual';
  autoBackupEnabled?: boolean;
  autoBackupIntervalMinutes?: number;
  backupRetentionDays?: number;
} {
  const parsed = JSON.parse(text) as SalaryBackupExport;
  if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.points)) {
    throw new Error('Invalid backup file format.');
  }

  if (typeof parsed.checksum === 'string') {
    const payloadWithoutChecksum = {
      version: 1,
      exportedAt: parsed.exportedAt,
      uiState: parsed.uiState,
      points: parsed.points,
    };
    const expected = computeChecksum(payloadWithoutChecksum);
    if (expected !== parsed.checksum) {
      throw new Error('Backup checksum mismatch. File may be corrupted.');
    }
  }

  const importedPoints = sanitizeRestorePoints(parsed.points);
  if (importedPoints.length === 0) {
    throw new Error('No valid backup points found in file.');
  }

  return {
    points: importedPoints,
    activeRewardTab: sanitizeRewardTab(parsed.uiState?.activeRewardTab),
    selectedBulkOption: sanitizeBulkOption(parsed.uiState?.selectedBulkOption),
    autoBackupEnabled: sanitizeAutoBackupEnabled(parsed.uiState?.autoBackupEnabled),
    autoBackupIntervalMinutes: sanitizeAutoBackupIntervalMinutes(parsed.uiState?.autoBackupIntervalMinutes),
    backupRetentionDays: sanitizeBackupRetentionDays(parsed.uiState?.backupRetentionDays),
  };
}

export function pruneExpiredRestorePoints(
  points: SalaryRestorePoint[],
  retentionDays: number,
  referenceTimeMs: number = Date.now(),
): SalaryRestorePoint[] {
  const maxAgeMs = sanitizeBackupRetentionDays(retentionDays) * 24 * 60 * 60 * 1000;

  return points.filter((point) => {
    const createdMs = new Date(point.createdAt).getTime();
    if (Number.isNaN(createdMs)) {
      return false;
    }

    return referenceTimeMs - createdMs <= maxAgeMs;
  });
}

export function createAuditEvent(action: SalaryAuditAction, detail: string): SalaryAuditEvent {
  return {
    id: Date.now(),
    at: new Date().toISOString(),
    action,
    detail,
  };
}

export function loadSalaryAuditLog(): SalaryAuditEvent[] {
  try {
    const raw = localStorage.getItem(SALARY_AUDIT_LOG_KEY);
    if (!raw) {
      return [];
    }

    return sanitizeAuditEvents(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function saveSalaryAuditLog(events: SalaryAuditEvent[]): void {
  localStorage.setItem(SALARY_AUDIT_LOG_KEY, JSON.stringify(events.slice(0, MAX_AUDIT_EVENTS)));
}
