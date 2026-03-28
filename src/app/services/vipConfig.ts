import { projectId, publicAnonKey } from '@utils/supabase/info';
import { buildAdminAuthHeaders } from './supabaseAuth';

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

async function parseVipResponse(response: Response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error ?? `Request failed (${response.status})`);
  }
  return Array.isArray(payload?.tiers) ? payload.tiers as VipConfig[] : [];
}

export async function fetchPublicVipConfig() {
  const response = await fetch(`${serverUrl}/vip-config`, {
    headers: {
      Authorization: `Bearer ${publicAnonKey}`,
    },
  });

  return parseVipResponse(response);
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