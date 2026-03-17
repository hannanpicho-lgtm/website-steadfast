import { createClient, type User } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '@utils/supabase/info';

const supabaseUrl = `https://${projectId}.supabase.co`;

export const supabase = createClient(supabaseUrl, publicAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

function normalizeIdentifier(identifier: string): string {
  return identifier.trim().toLowerCase();
}

export function resolveAdminIdentifier(identifier: string): string {
  return normalizeIdentifier(identifier);
}

export function userHasAdminRole(user: User | null | undefined): boolean {
  if (!user) {
    return false;
  }

  const roleCandidates = new Set<string>();
  const appMetadata = user.app_metadata ?? {};
  const userMetadata = user.user_metadata ?? {};

  if (typeof appMetadata.role === 'string') {
    roleCandidates.add(appMetadata.role.toLowerCase());
  }
  if (Array.isArray(appMetadata.roles)) {
    appMetadata.roles.forEach((role) => {
      if (typeof role === 'string') {
        roleCandidates.add(role.toLowerCase());
      }
    });
  }
  if (typeof userMetadata.role === 'string') {
    roleCandidates.add(userMetadata.role.toLowerCase());
  }
  if (Array.isArray(userMetadata.roles)) {
    userMetadata.roles.forEach((role) => {
      if (typeof role === 'string') {
        roleCandidates.add(role.toLowerCase());
      }
    });
  }

  return roleCandidates.has('admin') || roleCandidates.has('super_admin');
}

export async function signInAdmin(identifier: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const email = resolveAdminIdentifier(identifier);
  if (!email.includes('@')) {
    return { ok: false, error: 'Enter a valid admin email address.' };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return { ok: false, error: error?.message ?? 'Admin sign-in failed.' };
  }

  if (!userHasAdminRole(data.user)) {
    await supabase.auth.signOut();
    return { ok: false, error: 'This account is not authorized for admin access.' };
  }

  return { ok: true };
}

export async function signOutAdminSession(): Promise<void> {
  await supabase.auth.signOut();
}

export async function isSupabaseAdminAuthenticated(): Promise<boolean> {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    return false;
  }

  return userHasAdminRole(data.user);
}

export async function requireAdminAccessToken(): Promise<string> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) {
    throw new Error('Admin session expired. Please sign in again.');
  }

  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !userHasAdminRole(data.user)) {
    throw new Error('Admin access denied. Please sign in with an authorized admin account.');
  }

  return accessToken;
}

export async function buildAdminAuthHeaders(contentType = true): Promise<Record<string, string>> {
  const accessToken = await requireAdminAccessToken();
  return {
    ...(contentType ? { 'Content-Type': 'application/json' } : {}),
    apikey: publicAnonKey,
    Authorization: `Bearer ${publicAnonKey}`,
    'x-user-jwt': accessToken,
  };
}
