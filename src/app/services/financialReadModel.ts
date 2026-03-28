import { projectId, publicAnonKey } from '@utils/supabase/info';

const SERVER_URL = `https://${projectId}.supabase.co/functions/v1/make-server-a1c55d7e`;
const FINANCIAL_FETCH_TIMEOUT_MS = 6000;

export type FinancialSummaryResponse = {
  username: string;
  vipLevel: number;
  balance: number;
  holdAmount: number;
  availableAmount: number;
  todayCommission: number;
  luckyBonus: number;
  tasksCompleted: number;
  tasksLimit: number;
  taskSetCount: number;
  tasksPerSet: number;
  tasksCompletedInSet: number;
  completedTaskSets: number;
  pendingTaskReset: boolean;
  isFrozen: boolean;
  isSuspended?: boolean;
  createdAt: string;
  lastReset: string;
    creditScore?: number;
  taskProgress: {
    taskSetCount: number;
    tasksPerSet: number;
    tasksCompleted: number;
    tasksCompletedInSet: number;
    completedTaskSets: number;
    tasksLimit: number;
    pendingTaskReset: boolean;
  };
  summary: {
    availableAmount: number;
    totalBalance: number;
    isFrozen: boolean;
  };
  [key: string]: unknown;
};

export async function fetchFinancialSummary(): Promise<FinancialSummaryResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FINANCIAL_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(`${SERVER_URL}/me/financials`, {
      credentials: 'include',
      headers: {
        Authorization: `Bearer ${publicAnonKey}`,
        apikey: publicAnonKey,
      },
      signal: controller.signal,
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(String((payload as Record<string, unknown>)?.error ?? 'Failed to fetch financial summary'));
    }

    return payload as FinancialSummaryResponse;
  } finally {
    clearTimeout(timeoutId);
  }
}
