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
  // Use getSession() instead of getUser() — getSession() reads from in-memory
  // storage without a network call, avoiding concurrent request races that
  // cause "Signal is aborted without a reason" AbortErrors on new devices.
  const { data } = await supabase.auth.getSession();
  return userHasAdminRole(data.session?.user ?? null);
}

export async function requireAdminAccessToken(): Promise<string> {
  // Use the session object directly — it already contains the user and their
  // role claims. Calling getUser() separately makes an extra network request
  // to Supabase Auth on every admin API call, which races with the SDK's own
  // background token refresh on new devices and causes AbortError failures.
  const { data: sessionData } = await supabase.auth.getSession();
  let session = sessionData.session;

  // No session at all — try an explicit refresh before giving up
  if (!session?.access_token) {
    const { data: refreshData } = await supabase.auth.refreshSession();
    session = refreshData.session;
  }

  if (!session?.access_token) {
    throw new Error('Admin session expired. Please sign in again.');
  }

  // The session user already has app_metadata/user_metadata with role claims
  if (!userHasAdminRole(session.user)) {
    throw new Error('Admin access denied. Please sign in with an authorized admin account.');
  }

  return session.access_token;
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
