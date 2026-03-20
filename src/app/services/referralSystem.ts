import { clearSessionToken, getSessionUsername, serverLogout } from './serverAuth';

const STORAGE_KEY = 'steadfast_referral_accounts_v1';
const CURRENT_USER_KEY = 'steadfast_current_user_v1';

const SYSTEM_ROOT_USERNAME = 'steadfast_root';
const SYSTEM_ROOT_INVITE_CODE = 'STF01';
const DEMO_USERNAME = 'ugreen';
const DEMO_INVITE_CODE = 'UGR01';
const DEMO_PASSWORD = 'demo123';
const ADMIN_USERNAME = 'admin';
const ADMIN_INVITE_CODE = 'ADM01';
const ADMIN_PASSWORD = 'admin123';
const REFERRAL_RATE = 0.2;
const CHILD_SIGNUP_VALUE = 100;

type ReferralEvent = {
  childUsername: string;
  parentUsername: string;
  parentInviteCode: string;
  rate: number;
  sourceValue: number;
  rewardAmount: number;
  createdAt: string;
};

export type ReferralAccount = {
  username: string;
  phone: string;
  loginPassword: string;
  transactionPassword: string;
  gender: string;
  invitationCode: string;
  invitedByCode: string;
  tier: number;
  balance: number;
  referralEarnings: number;
  children: string[];
  createdAt: string;
};

type ReferralStore = {
  accounts: ReferralAccount[];
  events: ReferralEvent[];
};

export type RegisterPayload = {
  username: string;
  phone: string;
  loginPassword: string;
  transactionPassword: string;
  gender: string;
  invitationCode: string;
};

export type RegisterResult = {
  ok: boolean;
  error?: string;
  createdUser?: ReferralAccount;
  parentReward?: number;
};

export type LoginResult = {
  ok: boolean;
  error?: string;
  user?: ReferralAccount;
};

function createSystemRootAccount(): ReferralAccount {
  return {
    username: SYSTEM_ROOT_USERNAME,
    phone: '-',
    loginPassword: '-',
    transactionPassword: '-',
    gender: 'unknown',
    invitationCode: SYSTEM_ROOT_INVITE_CODE,
    invitedByCode: SYSTEM_ROOT_INVITE_CODE,
    tier: 1,
    balance: 0,
    referralEarnings: 0,
    children: [],
    createdAt: new Date().toISOString(),
  };
}

function createDemoAccount(): ReferralAccount {
  return {
    username: DEMO_USERNAME,
    phone: '+1 555-0000',
    loginPassword: DEMO_PASSWORD,
    transactionPassword: DEMO_PASSWORD,
    gender: 'male',
    invitationCode: DEMO_INVITE_CODE,
    invitedByCode: SYSTEM_ROOT_INVITE_CODE,
    tier: 1,
    balance: 100,
    referralEarnings: 0,
    children: [],
    createdAt: new Date().toISOString(),
  };
}

function createAdminAccount(): ReferralAccount {
  return {
    username: ADMIN_USERNAME,
    phone: '+1 555-0001',
    loginPassword: ADMIN_PASSWORD,
    transactionPassword: ADMIN_PASSWORD,
    gender: 'male',
    invitationCode: ADMIN_INVITE_CODE,
    invitedByCode: SYSTEM_ROOT_INVITE_CODE,
    tier: 5,
    balance: 1000,
    referralEarnings: 0,
    children: [],
    createdAt: new Date().toISOString(),
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function randomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const digitChars = '0123456789';
  let out = '';
  for (let i = 0; i < 5; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  const digitPosition = Math.floor(Math.random() * 5);
  const digit = digitChars[Math.floor(Math.random() * digitChars.length)];
  out = `${out.slice(0, digitPosition)}${digit}${out.slice(digitPosition + 1)}`;
  return out;
}

function isCodeValid(code: string): boolean {
  return /^(?=.*\d)[A-Z0-9]{5}$/.test(code);
}

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

function readStore(): ReferralStore {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return {
      accounts: [
        createSystemRootAccount(),
        createDemoAccount(),
        createAdminAccount(),
      ],
      events: [],
    };
  }

  try {
    const parsed = JSON.parse(raw) as ReferralStore;
    if (!Array.isArray(parsed.accounts) || !Array.isArray(parsed.events)) {
      throw new Error('Invalid referral store shape');
    }

    const hasSystemRoot = parsed.accounts.some((x) => x.invitationCode === SYSTEM_ROOT_INVITE_CODE);
    if (!hasSystemRoot) {
      parsed.accounts.push(createSystemRootAccount());
    }

    const hasDemo = parsed.accounts.some((x) => x.username.toLowerCase() === DEMO_USERNAME.toLowerCase());
    if (!hasDemo) {
      parsed.accounts.push(createDemoAccount());
    }

    const hasAdmin = parsed.accounts.some((x) => x.username.toLowerCase() === ADMIN_USERNAME.toLowerCase());
    if (!hasAdmin) {
      parsed.accounts.push(createAdminAccount());
    }

    return parsed;
  } catch {
    return {
      accounts: [
        createSystemRootAccount(),
        createDemoAccount(),
        createAdminAccount(),
      ],
      events: [],
    };
  }
}

function writeStore(store: ReferralStore): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function getUniqueInviteCode(existing: Set<string>): string {
  let next = randomCode();
  while (existing.has(next)) {
    next = randomCode();
  }
  return next;
}

export function ensureReferralStore(): void {
  const store = readStore();
  writeStore(store);
}

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

// Legacy referral-account helpers retained for backward compatibility while
// auth/session authority stays token-based in serverAuth.
export function registerUserWithInvitation(payload: RegisterPayload): RegisterResult {
  ensureReferralStore();
  const store = readStore();

  const inviteCode = normalizeCode(payload.invitationCode);
  if (!isCodeValid(inviteCode)) {
    return { ok: false, error: 'Invitation code must be exactly 5 letters/numbers and include at least one number.' };
  }

  const parent = store.accounts.find((x) => x.invitationCode === inviteCode);
  if (!parent) {
    return { ok: false, error: 'Invitation code not found. Please check and try again.' };
  }

  const username = payload.username.trim();
  if (!username) {
    return { ok: false, error: 'Username is required.' };
  }

  if (!/^[a-zA-Z0-9_.\-]{1,64}$/.test(username)) {
    return { ok: false, error: 'Username can only use letters, numbers, underscore (_), hyphen (-), and dot (.) with no spaces.' };
  }

  const exists = store.accounts.some((x) => x.username.toLowerCase() === username.toLowerCase());
  if (exists) {
    return { ok: false, error: 'Username already exists.' };
  }

  const usedCodes = new Set(store.accounts.map((x) => x.invitationCode));
  const newCode = getUniqueInviteCode(usedCodes);

  const createdUser: ReferralAccount = {
    username,
    phone: payload.phone.trim(),
    loginPassword: payload.loginPassword,
    transactionPassword: payload.transactionPassword,
    gender: payload.gender,
    invitationCode: newCode,
    invitedByCode: inviteCode,
    tier: 1,
    balance: 0,
    referralEarnings: 0,
    children: [],
    createdAt: new Date().toISOString(),
  };

  const parentReward = round2(CHILD_SIGNUP_VALUE * REFERRAL_RATE);
  parent.balance = round2(parent.balance + parentReward);
  parent.referralEarnings = round2(parent.referralEarnings + parentReward);
  if (!parent.children.includes(createdUser.username)) {
    parent.children.push(createdUser.username);
  }

  store.accounts.push(createdUser);
  store.events.push({
    childUsername: createdUser.username,
    parentUsername: parent.username,
    parentInviteCode: inviteCode,
    rate: REFERRAL_RATE,
    sourceValue: CHILD_SIGNUP_VALUE,
    rewardAmount: parentReward,
    createdAt: new Date().toISOString(),
  });

  writeStore(store);

  return { ok: true, createdUser, parentReward };
}

export function getCurrentUserAccount(): ReferralAccount | null {
  ensureReferralStore();
  const username = getCurrentUsername();
  if (!username) {
    return null;
  }
  const store = readStore();
  return store.accounts.find((x) => x.username === username) ?? null;
}

export function getInvitationCodeForCurrentUser(fallback = 'N/A'): string {
  const current = getCurrentUserAccount();
  return current?.invitationCode ?? fallback;
}

export function getCurrentUsername(): string | null {
  const tokenUsername = getSessionUsername();
  if (tokenUsername) {
    localStorage.removeItem(CURRENT_USER_KEY);
    return tokenUsername;
  }

  // Legacy cleanup: do not authorize from persistent local username cache.
  localStorage.removeItem(CURRENT_USER_KEY);
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

export function authenticateUser(username: string, loginPassword: string): LoginResult {
  ensureReferralStore();
  const store = readStore();

  const normalizedUser = username.trim().toLowerCase();
  const user = store.accounts.find((x) => x.username.toLowerCase() === normalizedUser);

  if (!user) {
    return { ok: false, error: 'Account not found.' };
  }

  if (user.loginPassword !== loginPassword) {
    return { ok: false, error: 'Invalid username or password.' };
  }

  return { ok: true, user };
}
