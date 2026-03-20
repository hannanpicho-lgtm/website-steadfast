// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerUserWithInvitation,
  authenticateUser,
  logoutCurrentUser,
  getCurrentUsername,
  isAuthenticated,
  isCurrentUserAdmin,
  getInvitationCodeForCurrentUser,
  getSystemInviteCode,
  getDemoCredentials,
  getAdminCredentials,
  ensureReferralStore,
  type RegisterPayload,
} from '../app/services/referralSystem';
import { clearSessionToken, storeSessionToken } from '../app/services/serverAuth';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'steadfast_referral_accounts_v1';
const CURRENT_USER_KEY = 'steadfast_current_user_v1';
const SESSION_TOKEN_KEY = 'steadfast_user_session_token_v1';

function clearStorage() {
  clearSessionToken();
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(CURRENT_USER_KEY);
  localStorage.removeItem(SESSION_TOKEN_KEY);
  sessionStorage.removeItem(SESSION_TOKEN_KEY);
}

function seedSessionFor(username: string) {
  const payload = { u: username, e: Date.now() + 60_000 };
  const payloadB64 = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  storeSessionToken(`${payloadB64}.testsig`, username, false);
}

function makePayload(overrides: Partial<RegisterPayload> = {}): RegisterPayload {
  return {
    username: 'newuser',
    phone: '+1 555-1234',
    loginPassword: 'pass1234',
    transactionPassword: 'txn1234',
    gender: 'male',
    invitationCode: 'STF01',   // system root code
    ...overrides,
  };
}

// ─── Store constants ───────────────────────────────────────────────────────────

describe('getSystemInviteCode', () => {
  it('returns STF01', () => {
    expect(getSystemInviteCode()).toBe('STF01');
  });
});

describe('getDemoCredentials', () => {
  it('returns the static demo credentials', () => {
    const creds = getDemoCredentials();
    expect(creds.username).toBe('ugreen');
    expect(creds.password).toBe('demo123');
    expect(creds.inviteCode).toBe('UGR01');
  });
});

describe('getAdminCredentials', () => {
  it('returns the static admin credentials', () => {
    const creds = getAdminCredentials();
    expect(creds.username).toBe('admin');
    expect(creds.password).toBe('admin123');
    expect(creds.inviteCode).toBe('ADM01');
  });
});

// ─── ensureReferralStore ───────────────────────────────────────────────────────

describe('ensureReferralStore', () => {
  beforeEach(clearStorage);

  it('creates the store with three seed accounts on first call', () => {
    ensureReferralStore();
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    const usernames = parsed.accounts.map((a: any) => a.username);
    expect(usernames).toContain('steadfast_root');
    expect(usernames).toContain('ugreen');
    expect(usernames).toContain('admin');
  });

  it('is idempotent — calling again does not duplicate accounts', () => {
    ensureReferralStore();
    ensureReferralStore();
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = JSON.parse(raw!);
    const roots = parsed.accounts.filter((a: any) => a.username === 'steadfast_root');
    expect(roots).toHaveLength(1);
  });
});

// ─── registerUserWithInvitation ────────────────────────────────────────────────

describe('registerUserWithInvitation', () => {
  beforeEach(clearStorage);

  it('returns ok:true with a new user on a valid invitation', () => {
    const result = registerUserWithInvitation(makePayload());
    expect(result.ok).toBe(true);
    expect(result.createdUser?.username).toBe('newuser');
  });

  it('assigns the new user a unique invitation code', () => {
    const result = registerUserWithInvitation(makePayload());
    expect(result.createdUser?.invitationCode).toMatch(/^[A-Z0-9]{5}$/);
    // Must contain at least one digit (enforced by isCodeValid)
    expect(result.createdUser?.invitationCode).toMatch(/\d/);
  });

  it('stores invitedByCode pointing at the parent', () => {
    const result = registerUserWithInvitation(makePayload());
    expect(result.createdUser?.invitedByCode).toBe('STF01');
  });

  it('credits the parent with a referral reward (20% of 100 = $20)', () => {
    // ugreen is a child of steadfast_root; register a child of ugreen
    const ugreen = authenticateUser('ugreen', 'demo123');
    const ugreenCode = ugreen.user!.invitationCode;

    const result = registerUserWithInvitation(makePayload({ invitationCode: ugreenCode }));
    expect(result.ok).toBe(true);
    expect(result.parentReward).toBe(20);
  });

  it('new user starts with balance 0', () => {
    const result = registerUserWithInvitation(makePayload());
    expect(result.createdUser?.balance).toBe(0);
  });

  it('returns ok:false for unknown invitation code', () => {
    // 'ZZ1ZZ' is a valid format (5 chars, contains digit) but doesn't exist in the store
    const result = registerUserWithInvitation(makePayload({ invitationCode: 'ZZ1ZZ' }));
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/invitation code not found/i);
  });

  it('returns ok:false for invitation code that fails format validation', () => {
    // Must be 5 chars with at least one digit
    const result = registerUserWithInvitation(makePayload({ invitationCode: 'AAAAA' }));
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/invitation code must/i);
  });

  it('returns ok:false for an invitation code that is too short', () => {
    const result = registerUserWithInvitation(makePayload({ invitationCode: 'A1' }));
    expect(result.ok).toBe(false);
  });

  it('returns ok:false for duplicate username (case-insensitive)', () => {
    registerUserWithInvitation(makePayload({ username: 'Alice' }));
    const result = registerUserWithInvitation(makePayload({ username: 'alice' }));
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/username already exists/i);
  });

  it('returns ok:false for empty username', () => {
    const result = registerUserWithInvitation(makePayload({ username: '' }));
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/username is required/i);
  });

  it('returns ok:false for username with spaces', () => {
    const result = registerUserWithInvitation(makePayload({ username: 'user name' }));
    expect(result.ok).toBe(false);
  });

  it('returns ok:false for username with special chars beyond _ - .', () => {
    const result = registerUserWithInvitation(makePayload({ username: 'user@name!' }));
    expect(result.ok).toBe(false);
  });

  it('does not persist CURRENT_USER_KEY after successful registration', () => {
    registerUserWithInvitation(makePayload({ username: 'freshuser' }));
    expect(localStorage.getItem(CURRENT_USER_KEY)).toBeNull();
  });
});

// ─── authenticateUser ─────────────────────────────────────────────────────────

describe('authenticateUser', () => {
  beforeEach(clearStorage);

  it('returns ok:true and user for valid demo credentials', () => {
    const result = authenticateUser('ugreen', 'demo123');
    expect(result.ok).toBe(true);
    expect(result.user?.username).toBe('ugreen');
  });

  it('is case-insensitive for username', () => {
    const result = authenticateUser('UGREEN', 'demo123');
    expect(result.ok).toBe(true);
  });

  it('returns ok:false for wrong password', () => {
    const result = authenticateUser('ugreen', 'wrongpassword');
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/invalid username or password/i);
  });

  it('returns ok:false for non-existent user', () => {
    const result = authenticateUser('doesnotexist', 'any');
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/account not found/i);
  });

  it('does not persist CURRENT_USER_KEY after successful login', () => {
    authenticateUser('ugreen', 'demo123');
    expect(localStorage.getItem(CURRENT_USER_KEY)).toBeNull();
  });
});

// ─── getCurrentUsername / isAuthenticated ─────────────────────────────────────

describe('getCurrentUsername / isAuthenticated', () => {
  beforeEach(clearStorage);

  it('returns null before any login', () => {
    expect(getCurrentUsername()).toBeNull();
  });

  it('returns the username after login', () => {
    seedSessionFor('ugreen');
    expect(getCurrentUsername()).toBe('ugreen');
  });

  it('isAuthenticated returns false before login', () => {
    expect(isAuthenticated()).toBe(false);
  });

  it('isAuthenticated returns true after login', () => {
    seedSessionFor('ugreen');
    expect(isAuthenticated()).toBe(true);
  });
});

// ─── logoutCurrentUser ────────────────────────────────────────────────────────

describe('logoutCurrentUser', () => {
  beforeEach(clearStorage);

  it('clears the current user from storage', () => {
    seedSessionFor('ugreen');
    expect(isAuthenticated()).toBe(true);
    logoutCurrentUser();
    expect(isAuthenticated()).toBe(false);
    expect(getCurrentUsername()).toBeNull();
  });

  it('is safe to call when no user is logged in', () => {
    expect(() => logoutCurrentUser()).not.toThrow();
  });
});

// ─── isCurrentUserAdmin ───────────────────────────────────────────────────────

describe('isCurrentUserAdmin', () => {
  beforeEach(clearStorage);

  it('returns false when no user is logged in', () => {
    expect(isCurrentUserAdmin()).toBe(false);
  });

  it('returns true for the admin account', () => {
    seedSessionFor('admin');
    expect(isCurrentUserAdmin()).toBe(true);
  });

  it('returns false for a regular (demo) user', () => {
    seedSessionFor('ugreen');
    expect(isCurrentUserAdmin()).toBe(false);
  });

  it('returns false for a newly registered user', () => {
    registerUserWithInvitation(makePayload({ username: 'regularjoe' }));
    expect(isCurrentUserAdmin()).toBe(false);
  });
});

// ─── getInvitationCodeForCurrentUser ──────────────────────────────────────────

describe('getInvitationCodeForCurrentUser', () => {
  beforeEach(clearStorage);

  it('returns the fallback when no user is logged in', () => {
    expect(getInvitationCodeForCurrentUser('FALLBACK')).toBe('FALLBACK');
  });

  it('returns default fallback N/A when no argument provided', () => {
    expect(getInvitationCodeForCurrentUser()).toBe('N/A');
  });

  it('returns the user invitation code after login', () => {
    seedSessionFor('ugreen');
    const code = getInvitationCodeForCurrentUser('FALLBACK');
    expect(code).not.toBe('FALLBACK');
    expect(code).toMatch(/^[A-Z0-9]{5}$/);
  });
});

// ─── referral chain integrity ─────────────────────────────────────────────────

describe('referral chain integrity', () => {
  beforeEach(clearStorage);

  it('two different users get unique invitation codes', () => {
    const r1 = registerUserWithInvitation(makePayload({ username: 'user_one' }));
    const r2 = registerUserWithInvitation(makePayload({ username: 'user_two' }));
    expect(r1.createdUser?.invitationCode).not.toBe(r2.createdUser?.invitationCode);
  });

  it('a child can use their own code to invite another user', () => {
    const r1 = registerUserWithInvitation(makePayload({ username: 'firstgen' }));
    const childCode = r1.createdUser!.invitationCode;

    const r2 = registerUserWithInvitation(makePayload({
      username: 'secondgen',
      invitationCode: childCode,
    }));
    expect(r2.ok).toBe(true);
    expect(r2.createdUser?.invitedByCode).toBe(childCode);
  });
});
