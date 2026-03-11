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
  uiState: {
    activeRewardTab: RewardTab;
    selectedBulkOption: 'all' | 'auto' | 'manual';
  };
  points: SalaryRestorePoint[];
};

type SalaryProjectAutosave = {
  version: 1;
  savedAt: string;
  uiState: {
    activeRewardTab: RewardTab;
    selectedBulkOption: 'all' | 'auto' | 'manual';
  };
  payments: SalaryPayment[];
  points: SalaryRestorePoint[];
};

const SALARY_PROJECT_AUTOSAVE_KEY = 'steadfast_admin_salary_project_v1';
const VALID_REWARD_TABS: RewardTab[] = ['workday', 'reset', 'accumulated', 'product-system', 'salary-payments'];
const VALID_BULK_OPTIONS = ['all', 'auto', 'manual'] as const;

export const AUTO_BACKUP_INTERVAL_MS = 60_000;
export const MAX_RESTORE_POINTS = 10;

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

export function loadSalaryProjectAutosave(defaultPayments: SalaryPayment[]): {
  payments: SalaryPayment[];
  points: SalaryRestorePoint[];
  activeRewardTab: RewardTab;
  selectedBulkOption: 'all' | 'auto' | 'manual';
} {
  let restoredPayments = defaultPayments.map((payment) => ({ ...payment }));
  let restoredPoints: SalaryRestorePoint[] = [];
  let restoredRewardTab: RewardTab = 'workday';
  let restoredBulkOption: 'all' | 'auto' | 'manual' = 'all';

  try {
    const savedProject = localStorage.getItem(SALARY_PROJECT_AUTOSAVE_KEY);
    if (savedProject) {
      const parsedProject = JSON.parse(savedProject) as SalaryProjectAutosave;
      if (parsedProject?.version === 1) {
        restoredPayments = sanitizePayments(parsedProject.payments, defaultPayments);
        restoredPoints = sanitizeRestorePoints(parsedProject.points);
        restoredRewardTab = sanitizeRewardTab(parsedProject.uiState?.activeRewardTab);
        restoredBulkOption = sanitizeBulkOption(parsedProject.uiState?.selectedBulkOption);
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
  };
}

export function saveSalaryProjectAutosave(payload: {
  activeRewardTab: RewardTab;
  selectedBulkOption: 'all' | 'auto' | 'manual';
  payments: SalaryPayment[];
  points: SalaryRestorePoint[];
}): void {
  const data: SalaryProjectAutosave = {
    version: 1,
    savedAt: new Date().toISOString(),
    uiState: {
      activeRewardTab: payload.activeRewardTab,
      selectedBulkOption: payload.selectedBulkOption,
    },
    payments: payload.payments,
    points: payload.points,
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
  points: SalaryRestorePoint[];
}): SalaryBackupExport {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    uiState: {
      activeRewardTab: payload.activeRewardTab,
      selectedBulkOption: payload.selectedBulkOption,
    },
    points: payload.points,
  };
}

export function parseBackupImport(text: string): {
  points: SalaryRestorePoint[];
  activeRewardTab?: RewardTab;
  selectedBulkOption?: 'all' | 'auto' | 'manual';
} {
  const parsed = JSON.parse(text) as SalaryBackupExport;
  if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.points)) {
    throw new Error('Invalid backup file format.');
  }

  const importedPoints = sanitizeRestorePoints(parsed.points);
  if (importedPoints.length === 0) {
    throw new Error('No valid backup points found in file.');
  }

  return {
    points: importedPoints,
    activeRewardTab: sanitizeRewardTab(parsed.uiState?.activeRewardTab),
    selectedBulkOption: sanitizeBulkOption(parsed.uiState?.selectedBulkOption),
  };
}
