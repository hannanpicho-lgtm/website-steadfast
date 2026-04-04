import { projectId, publicAnonKey } from '@utils/supabase/info';
import { buildAdminAuthHeaders } from './supabaseAuth';
import { buildPublicCacheKey } from './apiCompatibility';
import { fetchJsonWithRetry } from './networkClient';

export type VipConfig = {
  level: number;
  name: string;
  investment: number;
  dailyTasks: number;
  commission: number;
  color: string;
  taskPriceMin?: number;
  taskPriceMax?: number;
  createdAt?: string;
  updatedAt?: string;
};

const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a1c55d7e`;

function parseVipPayload(payload: Record<string, unknown>) {
  const tiers = (payload as Record<string, unknown>)?.tiers;
  return Array.isArray(tiers) ? tiers as VipConfig[] : [];
}

async function parseVipResponse(response: Response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error ?? `Request failed (${response.status})`);
  }
  return parseVipPayload(payload);
}

export async function fetchPublicVipConfig() {
  const payload = await fetchJsonWithRetry<Record<string, unknown>>({
    url: `${serverUrl}/vip-config`,
    init: {
      headers: {
        Authorization: `Bearer ${publicAnonKey}`,
      },
    },
    timeoutMs: 7000,
    retries: 2,
    retryDelayMs: 250,
    cacheKey: buildPublicCacheKey('vip-config', 'v1'),
    cacheTtlMs: 5 * 60 * 1000,
    pageTag: 'vip-config',
  });
  return parseVipPayload(payload);
}

export async function fetchAdminVipConfig() {
  const headers = await buildAdminAuthHeaders(false);
  const response = await fetch(`${serverUrl}/admin/vip-config`, { headers });
  return parseVipResponse(response);
}

export async function updateAdminVipConfig(level: number, payload: Partial<Pick<VipConfig, 'name' | 'investment' | 'dailyTasks' | 'commission' | 'color' | 'taskPriceMin' | 'taskPriceMax'>>) {
  const headers = await buildAdminAuthHeaders();
  const response = await fetch(`${serverUrl}/admin/vip-config/${level}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(payload),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body?.error ?? `Request failed (${response.status})`);
  }

  return body?.tier as VipConfig;
}