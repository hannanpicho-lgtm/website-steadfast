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

export const AUTO_BACKUP_INTERVAL_MS = 60_000;
export const MAX_RESTORE_POINTS = 10;

export function loadSalaryProjectAutosave(defaultPayments: SalaryPayment[]): {
  payments: SalaryPayment[];
  points: SalaryRestorePoint[];
  activeRewardTab: RewardTab;
  selectedBulkOption: 'all' | 'auto' | 'manual';
} {
  let restoredPayments = defaultPayments;
  let restoredPoints: SalaryRestorePoint[] = [];
  let restoredRewardTab: RewardTab = 'workday';
  let restoredBulkOption: 'all' | 'auto' | 'manual' = 'all';

  try {
    const savedProject = localStorage.getItem(SALARY_PROJECT_AUTOSAVE_KEY);
    if (savedProject) {
      const parsedProject = JSON.parse(savedProject) as SalaryProjectAutosave;
      if (parsedProject?.version === 1) {
        if (Array.isArray(parsedProject.payments) && parsedProject.payments.length > 0) {
          restoredPayments = parsedProject.payments;
        }
        if (Array.isArray(parsedProject.points)) {
          restoredPoints = parsedProject.points.slice(0, MAX_RESTORE_POINTS);
        }
        if (parsedProject.uiState?.activeRewardTab) {
          restoredRewardTab = parsedProject.uiState.activeRewardTab;
        }
        if (parsedProject.uiState?.selectedBulkOption) {
          restoredBulkOption = parsedProject.uiState.selectedBulkOption;
        }
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

  const importedPoints = parsed.points
    .filter((point) => point && Array.isArray(point.payments))
    .map((point) => ({
      id: Number(point.id) || Date.now(),
      createdAt: point.createdAt || new Date().toISOString(),
      label: point.label || 'Imported backup',
      payments: point.payments.map((payment) => ({ ...payment })),
    }));

  return {
    points: importedPoints,
    activeRewardTab: parsed.uiState?.activeRewardTab,
    selectedBulkOption: parsed.uiState?.selectedBulkOption,
  };
}
