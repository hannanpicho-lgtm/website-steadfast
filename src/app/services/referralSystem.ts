import { clearSessionToken, getSessionUsername, serverLogout } from './serverAuth';

const SYSTEM_ROOT_USERNAME = 'steadfast_root';
const SYSTEM_ROOT_INVITE_CODE = 'STF01';
const ADMIN_USERNAME = 'admin';
const ADMIN_INVITE_CODE = 'ADM01';
const LEGACY_CURRENT_USER_KEY = 'steadfast_current_user_v1';

export function getSystemInviteCode(): string {
  return SYSTEM_ROOT_INVITE_CODE;
}

export function getAdminCredentials(): { username: string; inviteCode: string } {
  return {
    username: ADMIN_USERNAME,
    inviteCode: ADMIN_INVITE_CODE,
  };
}

export function getCurrentUsername(): string | null {
  const username = getSessionUsername();
  if (username) {
    return username;
  }

  // Legacy cleanup only: this key must never be an auth or financial source.
  localStorage.removeItem(LEGACY_CURRENT_USER_KEY);
  return null;
}

export function isAuthenticated(): boolean {
  return Boolean(getCurrentUsername());
}

export function isCurrentUserAdmin(): boolean {
  const username = getCurrentUsername();
  if (!username) return false;
  return username.toLowerCase() === SYSTEM_ROOT_USERNAME.toLowerCase() || username.toLowerCase() === ADMIN_USERNAME.toLowerCase();
}

export function logoutCurrentUser(): void {
  void serverLogout();
  clearSessionToken();
}
