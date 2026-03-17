import { projectId, publicAnonKey } from '@utils/supabase/info';
import { buildAdminAuthHeaders } from './supabaseAuth';

export type WorkdayReward = {
  id: number;
  days: number;
  salary: number;
  enabled: boolean;
};

export type ResetReward = {
  id: number;
  deposit: number;
  reward: number;
  label: string;
  color: string;
  labelColor: string;
  enabled: boolean;
};

export type AccumulatedReward = {
  id: number;
  minDeposit: number;
  maxDeposit: number | null;
  rate: number;
  enabled: boolean;
};

export type ProductSystemConfig = {
  productsPerSet: number;
  maxSetsPerDay: number;
  minTimePerProduct: number;
  autoApproveCommission: boolean;
  requireProductConfirmation: boolean;
};

export type RewardsConfig = {
  workday: WorkdayReward[];
  reset: ResetReward[];
  accumulated: AccumulatedReward[];
  productSystem: ProductSystemConfig;
  updatedAt?: string;
};

export const defaultRewardsConfig: RewardsConfig = {
  workday: [
    { id: 1, days: 1, salary: 204, enabled: true },
    { id: 2, days: 7, salary: 1428, enabled: true },
    { id: 3, days: 15, salary: 3060, enabled: true },
    { id: 4, days: 22, salary: 4488, enabled: true },
    { id: 5, days: 30, salary: 6120, enabled: true },
  ],
  reset: [
    { id: 1, deposit: 100, reward: 28, label: 'Bronze', color: 'bg-orange-300', labelColor: 'bg-orange-600', enabled: true },
    { id: 2, deposit: 500, reward: 158, label: 'Silver', color: 'bg-gray-300', labelColor: 'bg-gray-600', enabled: true },
    { id: 3, deposit: 2000, reward: 688, label: 'Gold', color: 'bg-yellow-300', labelColor: 'bg-yellow-600', enabled: true },
    { id: 4, deposit: 5000, reward: 1788, label: 'Platinum', color: 'bg-blue-300', labelColor: 'bg-blue-600', enabled: true },
    { id: 5, deposit: 10000, reward: 3888, label: 'Diamond', color: 'bg-purple-300', labelColor: 'bg-purple-600', enabled: true },
    { id: 6, deposit: 30000, reward: 12888, label: 'Crown', color: 'bg-red-300', labelColor: 'bg-red-600', enabled: true },
  ],
  accumulated: [
    { id: 1, minDeposit: 1000, maxDeposit: 4999, rate: 0.003, enabled: true },
    { id: 2, minDeposit: 5000, maxDeposit: 19999, rate: 0.005, enabled: true },
    { id: 3, minDeposit: 20000, maxDeposit: 49999, rate: 0.008, enabled: true },
    { id: 4, minDeposit: 50000, maxDeposit: null, rate: 0.01, enabled: true },
  ],
  productSystem: {
    productsPerSet: 10,
    maxSetsPerDay: 5,
    minTimePerProduct: 30,
    autoApproveCommission: true,
    requireProductConfirmation: true,
  },
};

const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a1c55d7e`;

async function parseRewardsResponse(response: Response): Promise<RewardsConfig> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error ?? `Request failed (${response.status})`);
  }

  const config = payload?.config as RewardsConfig | undefined;
  if (!config || !Array.isArray(config.workday) || !Array.isArray(config.reset) || !Array.isArray(config.accumulated) || !config.productSystem) {
    return defaultRewardsConfig;
  }

  return config;
}

export async function fetchPublicRewardsConfig() {
  const response = await fetch(`${serverUrl}/rewards-config`, {
    headers: {
      Authorization: `Bearer ${publicAnonKey}`,
    },
  });

  return parseRewardsResponse(response);
}

export async function fetchAdminRewardsConfig() {
  const headers = await buildAdminAuthHeaders(false);
  const response = await fetch(`${serverUrl}/admin/rewards-config`, { headers });
  return parseRewardsResponse(response);
}

export async function updateAdminRewardsConfig(payload: Partial<RewardsConfig>) {
  const headers = await buildAdminAuthHeaders();
  const response = await fetch(`${serverUrl}/admin/rewards-config`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(payload),
  });

  return parseRewardsResponse(response);
}
