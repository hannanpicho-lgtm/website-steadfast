import { projectId, publicAnonKey } from '@utils/supabase/info';
import { buildAdminAuthHeaders } from './supabaseAuth';
import { buildPublicCacheKey } from './apiCompatibility';
import { fetchJsonWithRetry } from './networkClient';

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
  premiumEnabled: boolean;
  premiumTriggerTaskNumber: number;
  premiumBaseValue: number;
  premiumValueMode: 'multiplier' | 'range';
  vipPremiumAdjustments: Array<{
    vipLevel: number;
    multiplier: number;
    minValue: number;
    maxValue: number;
    upholdAmount: number;
  }>;
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
    { id: 1, days: 2, salary: 120, enabled: true },
    { id: 2, days: 5, salary: 1000, enabled: true },
    { id: 3, days: 10, salary: 1400, enabled: true },
    { id: 4, days: 20, salary: 1600, enabled: true },
    { id: 5, days: 30, salary: 2000, enabled: true },
  ],
  reset: [
    { id: 1, deposit: 100, reward: 10, label: 'Starter', color: 'bg-cyan-100', labelColor: 'bg-cyan-600', enabled: true },
    { id: 2, deposit: 500, reward: 60, label: 'Hot Picks', color: 'bg-cyan-100', labelColor: 'bg-[#f0a23a]', enabled: true },
    { id: 3, deposit: 1000, reward: 120, label: 'Value', color: 'bg-cyan-100', labelColor: 'bg-cyan-600', enabled: true },
    { id: 4, deposit: 1600, reward: 200, label: 'Limited Offer', color: 'bg-cyan-100', labelColor: 'bg-[#e3b23c]', enabled: true },
    { id: 5, deposit: 5500, reward: 1200, label: 'Growth', color: 'bg-cyan-100', labelColor: 'bg-cyan-600', enabled: true },
    { id: 6, deposit: 10000, reward: 2400, label: 'Best Deal', color: 'bg-cyan-100', labelColor: 'bg-[#cf4d64]', enabled: true },
  ],
  accumulated: [
    { id: 1, minDeposit: 1500, maxDeposit: 9999, rate: 0.04, enabled: true },
    { id: 2, minDeposit: 10000, maxDeposit: 19999, rate: 0.08, enabled: true },
    { id: 3, minDeposit: 20000, maxDeposit: 49999, rate: 0.12, enabled: true },
    { id: 4, minDeposit: 50000, maxDeposit: null, rate: 0.20, enabled: true },
  ],
  productSystem: {
    productsPerSet: 10,
    maxSetsPerDay: 5,
    minTimePerProduct: 30,
    autoApproveCommission: true,
    requireProductConfirmation: true,
    premiumEnabled: true,
    premiumTriggerTaskNumber: 10,
    premiumBaseValue: 300,
    premiumValueMode: 'multiplier',
    vipPremiumAdjustments: [
      { vipLevel: 1, multiplier: 1.1, minValue: 220, maxValue: 420, upholdAmount: 330 },
      { vipLevel: 2, multiplier: 1.2, minValue: 300, maxValue: 620, upholdAmount: 360 },
      { vipLevel: 3, multiplier: 1.35, minValue: 500, maxValue: 1300, upholdAmount: 405 },
      { vipLevel: 4, multiplier: 1.5, minValue: 900, maxValue: 2600, upholdAmount: 450 },
      { vipLevel: 5, multiplier: 1.8, minValue: 1800, maxValue: 5200, upholdAmount: 540 },
    ],
  },
};

function normalizeVipPremiumAdjustments(rawAdjustments: unknown): ProductSystemConfig['vipPremiumAdjustments'] {
  const fallback = defaultRewardsConfig.productSystem.vipPremiumAdjustments;
  const parsed = Array.isArray(rawAdjustments) ? rawAdjustments : [];
  const byLevel = new Map<number, ProductSystemConfig['vipPremiumAdjustments'][number]>();

  for (const entry of parsed) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }

    const candidate = entry as Partial<ProductSystemConfig['vipPremiumAdjustments'][number]>;
    const vipLevel = Number.isFinite(Number(candidate.vipLevel))
      ? Math.max(1, Math.round(Number(candidate.vipLevel)))
      : NaN;

    if (!Number.isFinite(vipLevel)) {
      continue;
    }

    const fallbackForLevel = fallback.find((item) => item.vipLevel === vipLevel)
      ?? fallback[fallback.length - 1]
      ?? { vipLevel, multiplier: 1, minValue: 0, maxValue: 0 };

    const minValue = Number.isFinite(Number(candidate.minValue))
      ? Math.max(0, Number(candidate.minValue))
      : fallbackForLevel.minValue;
    const maxRaw = Number.isFinite(Number(candidate.maxValue))
      ? Number(candidate.maxValue)
      : fallbackForLevel.maxValue;
    const upholdAmount = Number.isFinite(Number((candidate as Record<string, unknown>).upholdAmount))
      ? Math.max(0, Number((candidate as Record<string, unknown>).upholdAmount))
      : (fallbackForLevel as Record<string, unknown>).upholdAmount as number ?? 0;

    byLevel.set(vipLevel, {
      vipLevel,
      multiplier: Number.isFinite(Number(candidate.multiplier)) ? Math.max(0.1, Number(candidate.multiplier)) : fallbackForLevel.multiplier,
      minValue,
      maxValue: Math.max(minValue, maxRaw),
      upholdAmount,
    });
  }

  for (const entry of fallback) {
    if (!byLevel.has(entry.vipLevel)) {
      byLevel.set(entry.vipLevel, { ...entry, upholdAmount: entry.upholdAmount ?? 0 });
    }
  }

  return [...byLevel.values()].sort((left, right) => left.vipLevel - right.vipLevel);
}

function normalizeProductSystemConfig(rawProductSystem: unknown): ProductSystemConfig {
  const fallback = defaultRewardsConfig.productSystem;
  const source = rawProductSystem && typeof rawProductSystem === 'object'
    ? (rawProductSystem as Partial<ProductSystemConfig>)
    : {};

  const premiumValueMode = source.premiumValueMode === 'range' ? 'range' : 'multiplier';

  return {
    productsPerSet: Number.isFinite(Number(source.productsPerSet)) ? Math.max(1, Math.round(Number(source.productsPerSet))) : fallback.productsPerSet,
    maxSetsPerDay: Number.isFinite(Number(source.maxSetsPerDay)) ? Math.max(1, Math.round(Number(source.maxSetsPerDay))) : fallback.maxSetsPerDay,
    minTimePerProduct: Number.isFinite(Number(source.minTimePerProduct)) ? Math.max(1, Math.round(Number(source.minTimePerProduct))) : fallback.minTimePerProduct,
    autoApproveCommission: typeof source.autoApproveCommission === 'boolean' ? source.autoApproveCommission : fallback.autoApproveCommission,
    requireProductConfirmation: typeof source.requireProductConfirmation === 'boolean' ? source.requireProductConfirmation : fallback.requireProductConfirmation,
    premiumEnabled: typeof source.premiumEnabled === 'boolean' ? source.premiumEnabled : fallback.premiumEnabled,
    premiumTriggerTaskNumber: Number.isFinite(Number(source.premiumTriggerTaskNumber)) ? Math.max(1, Math.round(Number(source.premiumTriggerTaskNumber))) : fallback.premiumTriggerTaskNumber,
    premiumBaseValue: Number.isFinite(Number(source.premiumBaseValue)) ? Math.max(0, Number(source.premiumBaseValue)) : fallback.premiumBaseValue,
    premiumValueMode,
    vipPremiumAdjustments: normalizeVipPremiumAdjustments(source.vipPremiumAdjustments),
  };
}

const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a1c55d7e`;

async function parseRewardsResponse(response: Response): Promise<RewardsConfig> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error ?? `Request failed (${response.status})`);
  }

  return parseRewardsPayload(payload);
}

function parseRewardsPayload(payload: Record<string, unknown>): RewardsConfig {

  const config = payload?.config as RewardsConfig | undefined;
  if (!config || !Array.isArray(config.workday) || !Array.isArray(config.reset) || !Array.isArray(config.accumulated) || !config.productSystem) {
    return defaultRewardsConfig;
  }

  return {
    ...defaultRewardsConfig,
    ...config,
    workday: config.workday.length > 0 ? config.workday : defaultRewardsConfig.workday,
    reset: config.reset.length > 0 ? config.reset : defaultRewardsConfig.reset,
    accumulated: config.accumulated.length > 0 ? config.accumulated : defaultRewardsConfig.accumulated,
    productSystem: normalizeProductSystemConfig(config.productSystem),
  };
}

export async function fetchPublicRewardsConfig() {
  const payload = await fetchJsonWithRetry<any>({
    url: `${serverUrl}/rewards-config`,
    init: {
      headers: {
        Authorization: `Bearer ${publicAnonKey}`,
      },
    },
    timeoutMs: 7000,
    retries: 2,
    retryDelayMs: 250,
    cacheKey: buildPublicCacheKey('rewards-config', 'v1'),
    cacheTtlMs: 5 * 60 * 1000,
    pageTag: 'rewards-config',
  });
  return parseRewardsPayload(payload);
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
