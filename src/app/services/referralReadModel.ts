import { projectId, publicAnonKey } from '@utils/supabase/info';

const SERVER_URL = `https://${projectId}.supabase.co/functions/v1/make-server-a1c55d7e`;

export type ReferralSummaryResponse = {
  username: string;
  invitationCode: string | null;
  invitedByCode: string | null;
  parentUsername: string | null;
  referralRate: number;
  referralEarnings: number;
  childrenCount: number;
  children: string[];
  recentEvents: Array<{
    parentUsername: string | null;
    childUsername: string | null;
    type: string;
    childCommission: number;
    parentReward: number;
    rate: number;
    createdAt: string;
  }>;
  summary: {
    totalReferralEarnings: number;
    totalParentRewardsReceived: number;
    totalChildCommissionsObserved: number;
  };
};

export async function fetchReferralSummary(): Promise<ReferralSummaryResponse> {
  const response = await fetch(`${SERVER_URL}/me/referrals/summary`, {
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${publicAnonKey}`,
      apikey: publicAnonKey,
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(String((payload as Record<string, unknown>)?.error ?? 'Failed to fetch referral summary'));
  }

  return payload as ReferralSummaryResponse;
}
