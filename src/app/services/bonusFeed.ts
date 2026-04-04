import { projectId, publicAnonKey } from '@utils/supabase/info';

const SERVER_URL = `https://${projectId}.supabase.co/functions/v1/make-server-a1c55d7e`;

export type BonusFeedItem = {
  id: string;
  amount: number;
  assignmentMode: 'automatic' | 'semi-automatic' | 'manual';
  source: string;
  label: string;
  description: string;
  createdAt: string;
  seenAt: string | null;
};

export async function fetchBonusFeed(options?: { unseenOnly?: boolean; limit?: number }): Promise<BonusFeedItem[]> {
  const params = new URLSearchParams();
  if (options?.unseenOnly) {
    params.set('unseenOnly', 'true');
  }
  if (Number.isFinite(Number(options?.limit))) {
    params.set('limit', String(Math.max(1, Math.min(50, Math.round(Number(options?.limit))))));
  }

  const response = await fetch(`${SERVER_URL}/me/bonuses${params.toString() ? `?${params.toString()}` : ''}`, {
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${publicAnonKey}`,
      apikey: publicAnonKey,
    },
  });

  const payload = await response.json().catch(() => ([]));
  if (!response.ok) {
    const errorMessage = typeof payload?.error === 'string' ? payload.error : 'Failed to fetch bonus feed';
    throw new Error(errorMessage);
  }

  if (!Array.isArray(payload)) {
    return [];
  }

  return payload.map((item: Record<string, unknown>) => ({
    id: String(item?.id ?? ''),
    amount: Number(item?.amount ?? 0),
    assignmentMode: (String(item?.assignmentMode ?? 'automatic').toLowerCase() as BonusFeedItem['assignmentMode']),
    source: String(item?.source ?? ''),
    label: String(item?.label ?? 'Bonus Reward'),
    description: String(item?.description ?? ''),
    createdAt: String(item?.createdAt ?? new Date().toISOString()),
    seenAt: item?.seenAt ? String(item.seenAt) : null,
  })).filter((item) => item.id && Number.isFinite(item.amount));
}

export async function acknowledgeBonusFeedItems(bonusIds: string[]): Promise<number> {
  if (!Array.isArray(bonusIds) || bonusIds.length === 0) {
    return 0;
  }

  const response = await fetch(`${SERVER_URL}/me/bonuses/ack`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${publicAnonKey}`,
      apikey: publicAnonKey,
    },
    body: JSON.stringify({ bonusIds }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMessage = typeof payload?.error === 'string' ? payload.error : 'Failed to acknowledge bonus items';
    throw new Error(errorMessage);
  }

  return Number(payload?.updated ?? 0);
}
