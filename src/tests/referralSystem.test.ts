// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  logoutCurrentUser,
  getCurrentUsername,
  isAuthenticated,
  isCurrentUserAdmin,
  getSystemInviteCode,
  getAdminCredentials,
} from '../app/services/referralSystem';
import { clearSessionToken, storeSessionToken } from '../app/services/serverAuth';

const CURRENT_USER_KEY = 'steadfast_current_user_v1';

function clearStorage() {
  clearSessionToken();
  localStorage.removeItem(CURRENT_USER_KEY);
}

function seedSessionFor(username: string) {
  storeSessionToken('', username, false);
}

describe('getSystemInviteCode', () => {
  it('returns STF01', () => {
    expect(getSystemInviteCode()).toBe('STF01');
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

  it('clears the in-memory session markers', () => {
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
});

describe('legacy identity key cleanup', () => {
  beforeEach(clearStorage);

  it('does not use localStorage identity as auth source', () => {
    localStorage.setItem(CURRENT_USER_KEY, 'admin');
    expect(getCurrentUsername()).toBeNull();
    expect(localStorage.getItem(CURRENT_USER_KEY)).toBeNull();
  });
});
