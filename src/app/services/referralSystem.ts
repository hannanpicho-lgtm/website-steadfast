import { clearSessionToken, getSessionUsername, serverLogout } from './serverAuth';

const SYSTEM_ROOT_USERNAME = 'steadfast_root';
const SYSTEM_ROOT_INVITE_CODE = 'STF01';
const DEMO_USERNAME = 'ugreen';
const DEMO_INVITE_CODE = 'UGR01';
const DEMO_PASSWORD = 'demo123';
const ADMIN_USERNAME = 'admin';
const ADMIN_INVITE_CODE = 'ADM01';
const ADMIN_PASSWORD = 'admin123';
const LEGACY_CURRENT_USER_KEY = 'steadfast_current_user_v1';

export function getSystemInviteCode(): string {
  return SYSTEM_ROOT_INVITE_CODE;
}

export function getDemoCredentials(): { username: string; password: string; inviteCode: string } {
  return {
    username: DEMO_USERNAME,
    password: DEMO_PASSWORD,
    inviteCode: DEMO_INVITE_CODE,
  };
}

export function getAdminCredentials(): { username: string; password: string; inviteCode: string } {
  return {
    username: ADMIN_USERNAME,
    password: ADMIN_PASSWORD,
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
