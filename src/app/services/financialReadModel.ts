import { projectId, publicAnonKey } from '@utils/supabase/info';
import { fetchJsonWithRetry } from './networkClient';

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
  return fetchJsonWithRetry<FinancialSummaryResponse>({
    url: `${SERVER_URL}/me/financials`,
    init: {
      credentials: 'include',
      headers: {
        Authorization: `Bearer ${publicAnonKey}`,
        apikey: publicAnonKey,
      },
    },
    timeoutMs: FINANCIAL_FETCH_TIMEOUT_MS,
    retries: 2,
    retryDelayMs: 250,
    cacheKey: 'me:financial-summary:v2',
    cacheTtlMs: 45_000,
    pageTag: 'financial-summary',
  });
}
