# Phase 1: Authentication & Session State Migration Plan

**Objective:** Move authentication from browser-managed localStorage to fully server-backed, secure session state.

**Status:** Planning only. Implementation TBD.

**Timeline:** Single implementation slice (modify backend + frontend + tests + deploy in one cycle).

---

## 1. Backend Session Model

### Session Storage Structure (Supabase KV)

**Key Format:** `session:${sessionId}` (nanoid-based deterministic key)

**Session Record Schema:**
```typescript
{
  sessionId: string;              // nanoid-generated unique ID
  username: string;               // account owner
  createdAt: number;              // Unix timestamp (ms)
  expiresAt: number;              // Unix timestamp (ms)
  mustChangePassword: boolean;    // password reset flag
  lastActivityAt: number;         // Unix timestamp (ms) for activity tracking
  ipAddress?: string;             // optional: geo-lock / audit trail
  userAgent?: string;             // optional: browser fingerprint for abuse detection
}
```

### Session Lifecycle

**Creation:** 
- Triggered on successful login (`POST /auth/login`).
- Generates nanoid sessionId; stores record in KV with TTL hint.
- Sets httpOnly, Secure, SameSite=Strict cookie: `steadfast_session_id=${sessionId}`.
- Cookie domain: root domain (no subdomain isolation); Path: /; Max-Age: 86400 (24h).

**Validation:**
- On incoming request: extract `steadfast_session_id` from cookie.
- Lookup session record in KV.
- Verify expiration: `expiresAt > now()`.
- Update `lastActivityAt` to current timestamp (refresh TTL touch-up or reset-on-activity).
- Return session payload for downstream use.

**Refresh/Restoration (page load/restart):**
- `POST /auth/session/restore` endpoint always called during app initialization.
- Client passes credentials: `include` (automatic cookie send).
- Server validates session cookie + KV record.
- On success: returns username + mustChangePassword flag (no token/credential leakage).
- On failure/expiry/missing: returns 401; client clears in-memory cache.

**Invalidation (logout):**
- `POST /auth/session/logout` endpoint.
- Extracts and deletes session record from KV.
- Clears cookie by sending Set-Cookie with Max-Age=0 and empty value.
- Frontend clears in-memory username/password-change caches.

**Expiration:**
- Sessions expire at `expiresAt` timestamp; KV storage TTL expires alongside.
- Cleanup: on validation failure, delete stale KV record.
- No persistent session DB needed; KV with TTL is sufficient.

---

## 2. API Layer

### Endpoints Summary

| Method | Path | Purpose | Auth | Response |
|--------|------|---------|------|----------|
| POST | `/auth/login` | Authenticate user, create session | Anon | `{ ok: true, username, mustChangePassword }` or `{ ok: false, error }` |
| POST | `/auth/session/restore` | Validate + restore session from cookie | Session Cookie | `{ ok: true, username, mustChangePassword }` or `{ ok: false }` (401/invalid) |
| POST | `/auth/session/logout` | Invalidate session + clear cookie | Session Cookie | `{ ok: true }` or `{ ok: false, error }` |
| POST | `/auth/signup` | Create user + session | Anon | `{ ok: true, username, invitationCode, parentReward, referralRate }` or `{ ok: false, error }` |
| POST | `/auth/change-password` | Update password (via session context) | Session Cookie | `{ ok: true }` or `{ ok: false, error }` |

### Endpoint Specifications

#### `POST /auth/login`
- **Payload:** `{ username: string, loginPassword: string }`
- **Validation:**
  - Username & password both required (400 if missing).
  - Username exists and password hash matches (400 if not).
- **Success (200):**
  1. Generate nanoid sessionId.
  2. Create session record in KV with 24h TTL.
  3. Set httpOnly secure cookie: `steadfast_session_id=${sessionId}`.
  4. Return: `{ ok: true, username, mustChangePassword }`
- **Failure (400):** Invalid credentials → `{ ok: false, error: "Invalid username or password." }`
- **Failure (500):** KV write fails → `{ ok: false, error: "Server error." }`

#### `POST /auth/session/restore`
- **Payload:** None (cookie auto-sent via credentials).
- **Cookie Header:** `Cookie: steadfast_session_id=${sessionId}`
- **Validation:**
  1. Extract sessionId from cookie.
  2. Lookup session record in KV.
  3. Verify not expired: `expiresAt > now()`.
  4. Update `lastActivityAt` (optional: touch TTL).
- **Success (200):**
  - Return: `{ ok: true, username, mustChangePassword }`
- **Failure (401):**
  - Missing/invalid sessionId → `{ ok: false }`
  - Expired session → delete KV record, return `{ ok: false }`
  - Session not found in KV → `{ ok: false }`
- **Side-effect:** Set/refresh cookie TTL (Max-Age).

#### `POST /auth/session/logout`
- **Payload:** None.
- **Cookie Header:** `Cookie: steadfast_session_id=${sessionId}`
- **Validation:** Extract sessionId from cookie.
- **Action:**
  1. Delete session record from KV.
  2. Clear cookie: `Set-Cookie: steadfast_session_id=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Strict`
- **Response (200):** `{ ok: true }`
- **Side-effect (even on KV deletion fail):** Always clear cookie.

#### `POST /auth/change-password`
- **Payload:** `{ currentLoginPassword: string, newLoginPassword?: string, newTransactionPassword?: string }`
- **Auth:** Must have valid session cookie.
- **Validation:**
  1. Restore session from cookie (as with session/restore).
  2. Verify currentLoginPassword matches user record.
  3. Update password hash(es) if provided.
  4. Clear all sessions for this user (force re-login) if login password changed.
- **Response (200):** `{ ok: true }`
- **Response (401):** Invalid/missing session → `{ ok: false }`  
- **Response (400):** Wrong current password → `{ ok: false, error: "Current password is incorrect." }`

---

## 3. Frontend Changes

### File: `src/app/services/serverAuth.ts`

**Current (To Be Replaced):**
- `storeSessionToken()`: writes cookie-less marker to in-memory cache.
- `clearSessionToken()`: clears in-memory cache + cleanup removes from localStorage.
- `getStoredSessionToken()`: returns null (no persistent token).
- `verifyAndRestoreSession()`: calls `/auth/session/restore`, populates in-memory cache.

**After Migration:**
- Keep in-memory caches: `sessionUsernameCache`, `mustChangePasswordCache`.
- All storage cleanup calls (`localStorage.removeItem()`, `sessionStorage.removeItem()`) become **cleanup-only removals** (no auth logic depends on them).
- `verifyAndRestoreSession()`:
  - Already calls `/auth/session/restore` via `credentials: 'include'` (cookie auto-sent).
  - Server sets httpOnly cookie (browser auto-stores, not readable by JS).
  - Populate in-memory caches on success, clear on failure.
- `serverLogout()`:
  - Already calls `/auth/session/logout` via credentials.
  - Server clears KV record + cookie.
  - Frontend clears in-memory caches.
- `changeUserCredentials()`:
  - Already calls `/auth/change-password` via credentials.
  - No changes needed; server validates session from cookie.

**Code Pattern (Same, Refined):**
```typescript
// No persistent token storage
export function getStoredSessionToken(): string | null {
  return null; // Session lives in httpOnly cookie on backend KV.
}

// In-memory identity markers only
export function getSessionUsername(): string | null {
  return sessionUsernameCache;
}

export function isPasswordChangeRequired(): boolean {
  return mustChangePasswordCache;
}

// Populate in-memory markers on login success
export function storeSessionToken(token: string, username: string, mustChangePassword = false): void {
  sessionUsernameCache = username.trim() || null;
  mustChangePasswordCache = mustChangePassword;
  // Legacy cleanup only (no auth logic):
  sessionStorage.removeItem(SESSION_TOKEN_KEY);
  localStorage.removeItem(SESSION_TOKEN_KEY);
  // ... etc
}

// Clear in-memory markers on logout
export function clearSessionToken(): void {
  sessionUsernameCache = null;
  mustChangePasswordCache = false;
  // Legacy cleanup only:
  sessionStorage.removeItem(SESSION_TOKEN_KEY);
  localStorage.removeItem(SESSION_TOKEN_KEY);
  // ... etc
}

// Restore session from backend cookie on app init
export async function verifyAndRestoreSession(): Promise<string | null> {
  try {
    const res = await fetch(`${SERVER_URL}/auth/session/restore`, {
      method: 'POST',
      credentials: 'include', // Browser auto-sends cookie
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
    });
    if (!res.ok) {
      clearSessionToken();
      return null;
    }
    const data = await res.json() as Record<string, unknown>;
    const username = String(data.username ?? '');
    if (!username) {
      clearSessionToken();
      return null;
    }
    storeSessionToken('', username, Boolean(data.mustChangePassword));
    return username;
  } catch {
    clearSessionToken();
    return null;
  }
}

// Logout via backend session invalidation
export async function serverLogout(): Promise<void> {
  try {
    await fetch(`${SERVER_URL}/auth/session/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: { Authorization: `Bearer ${publicAnonKey}` },
    });
  } catch {
    // Best effort.
  } finally {
    clearSessionToken();
  }
}
```

### File: `src/app/services/referralSystem.ts`

**Auth-Related Logic:**
- `getCurrentUsername()`:
  - Currently: checks in-memory `getSessionUsername()` first, then cleanup-removes from localStorage.
  - **No change:** remains the same (already backend-authoritative).
- `logoutCurrentUser()`:
  - Currently: calls `serverLogout()` then `clearSessionToken()`.
  - **No change:** already uses backend logout.

**Remaining localStorage:**
- `STORAGE_KEY = 'steadfast_referral_accounts_v1'`: referral/account store (not auth).
- `CURRENT_USER_KEY = 'steadfast_current_user_v1'`: **auth-adjacent**, cleanup-only after Phase 1 implemented.

**After Migration:**
- Keep cleanup-only removals in `getCurrentUsername()`.
- No auth logic depends on localStorage; in-memory referral store + backend session is authoritative.

### File: `src/app/layouts/RequireAuthLayout.tsx`

**Current Flow:**
1. On mount, calls `verifyAndRestoreSession()`.
2. If session restored, user is authorized.
3. If not, redirects to login.

**After Migration:**
- **No change to visible behavior.**
- Internal: session restoration now solely backend-cookie-backed.
- in-memory cache populates on successful restore.

### File: `src/tests/referralSystem.test.ts`

**Current:**
- Tests cleanup-only localStorage removals.
- Verifies in-memory auth cache behavior.

**After Migration:**
- Tests remain the same (cleanup-only logic unchanged).
- If localStorage assertions fail, update to remove deprecated getItem checks (but cleanup-only removals still run).

---

## 4. Cutover Strategy

### Two-Phase Rollout

#### Phase 1a: Backend Ready (Deploy alone)
1. Implement backend session endpoints (`/auth/login`, `/auth/session/restore`, `/auth/session/logout`).
2. Legacy login endpoint still writes In-memory markers (no breaking change).
3. Frontend still uses localStorage fallback (coexist, not conflict).
4. Deploy to Supabase function.
5. **Validation:** Backend endpoints testable via integration tests; no frontend impact yet.

#### Phase 1b: Frontend Cutover (Deploy with frontend)
1. Frontend `serverAuth.ts` updated to use backend session endpoints.
2. Remove all direct localStorage *auth* reads (keep cleanup-only removals).
3. Redirect to `/auth/session/restore` on app init (already happening, just backend-validated now).
4. Deploy frontend.
5. **Validation:** Full login/restore/logout cycle tested end-to-end.

**No Dual Authority:**
- After Phase 1b, localStorage has zero auth authority.
- In-memory caches are ephemeral; session stored in backend KV + httpOnly cookie.
- All flows validated in integration tests before pushing.

---

## 5. Rollback Plan

### Scope
- Phase 1a (backend): Can revert by deploying old backend code (no frontend impact).
- Phase 1b (frontend): Can revert by deploying old frontend code (users stay logged in via cookie, but session restore will fail if backend code also reverted).

### Rollback Procedure

**If backend is corrupted post-Phase1a:**
1. Revert to prior backend SHA (Supabase function redeploy from prior version).
2. Frontend will see 500/error on `/auth/session/restore`, fallback to login.
3. No data loss (session KV is immutable during rollback).

**If frontend breaks post-Phase1b:**
1. Revert to prior frontend SHA via Cloudflare.
2. No session loss (httpOnly cookie + KV remain valid).
3. Users can log back in with old frontend code.

**If entire Phase 1 is corrupted:**
1. Revert both backend + frontend to pre-Phase1.
2. Old localStorage fallback logic re-enabled.
3. Existing HTTP cookies become stale (expired within 24h naturally, or manual clear).

### Safeguards
- Pre-Phase1b deploy: verify integration tests pass (login → restore → logout all green).
- Deploy SHA gate: confirm Cloudflare serving the intended commit before releasing users.
- Monitoring: track login success rate post-deploy; alert on spike in 401 responses.

---

## 6. Validation Checklist

### Unit Tests (existing `serverAuth.ts` tests)
- [ ] `storeSessionToken()` populates in-memory caches.
- [ ] `clearSessionToken()` clears in-memory caches.
- [ ] `getSessionUsername()` returns in-memory username or null.
- [ ] `isPasswordChangeRequired()` returns in-memory flag.

### Integration Tests (new `auth.integration.test.ts`)
- [ ] Login success: `POST /auth/login` returns username + mustChangePassword=false, sets cookie.
- [ ] Login failure: invalid credentials return 400.
- [ ] Session restore success: `POST /auth/session/restore` with valid cookie returns username.
- [ ] Session restore failure (expired): returns 401, deletes KV record.
- [ ] Session restore failure (missing/invalid cookie): returns 401.
- [ ] Logout success: `POST /auth/session/logout` deletes KV record, clears cookie.
- [ ] Logout clears in-memory cache.
- [ ] Change password success: updates password hash + invalidates all sessions.
- [ ] Change password failure: wrong current password returns 400.

### End-to-End Tests (manual + Playwright if available)

**Scenario 1: Login → Page Refresh → Still Authenticated**
- [ ] Open login page.
- [ ] Enter valid credentials, click Login.
- [ ] Redirected to user home (store credentials).
- [ ] Verify httpOnly cookie present (via DevTools).
- [ ] Refresh page: user stays logged in (no re-login prompt).
- [ ] Verify in-memory cache populated from `/auth/session/restore`.

**Scenario 2: Browser Restart → Still Authenticated**
- [ ] User logged in (as above).
- [ ] Close browser tab/window.
- [ ] Reopen site in new tab/window.
- [ ] Verify: httpOnly cookie persists (browser stores it).
- [ ] Verify: `/auth/session/restore` called on app init.
- [ ] Verify: user logged in without re-login prompt.

**Scenario 3: Logout → Redirect to Login**
- [ ] User logged in.
- [ ] Click Logout button.
- [ ] `POST /auth/session/logout` called.
- [ ] In-memory cache cleared.
- [ ] Cookie cleared (Set-Cookie with Max-Age=0).
- [ ] Redirected to login page.

**Scenario 4: Invalid Session (Expired/Tampered)**
- [ ] User logged in.
- [ ] Manually delete session KV record (simulate admin cleanup).
- [ ] Refresh page.
- [ ] `/auth/session/restore` returns 401.
- [ ] User redirected to login.

**Scenario 5: Cross-Tab Logout**
- [ ] User logged in (Tab A).
- [ ] User also logged in on Tab B (same browser).
- [ ] Logout on Tab A → session KV deleted, cookie cleared.
- [ ] Manual refresh on Tab B: `/auth/session/restore` returns 401.
- [ ] Expected: Tab B also logs out (no cross-tab sync needed; next restore fails).

**Scenario 6: Password Change → Re-Login Required**
- [ ] User logged in.
- [ ] Navigate to change-password page.
- [ ] Change login password successfully.
- [ ] All sessions for this user invalidated (KV cleared).
- [ ] Other tabs refresh: `/auth/session/restore` returns 401.
- [ ] User prompted to login with new password.

**Scenario 7: localStorage Cleanup After Logout**
- [ ] Perform logout (as above).
- [ ] Open DevTools → Application → localStorage.
- [ ] Verify: old keys (`steadfast_user_session_token_v1`, `steadfast_current_user_v1`) removed.
- [ ] Verify: no auth data leaked in persistent storage.

### Cross-Domain Consistency
- [ ] If running on multiple subdomains: cookie domain set to root (e.g., `.website-steadfast.com`).
- [ ] Login on subdomain A → session cookie usable on subdomain B (verify via restore).
- [ ] Or, if single domain: cookie restricted to `/` path only (verify Domain/Path in DevTools).

### Security Checks
- [ ] Cookie flags: HttpOnly=true, Secure=true, SameSite=Strict.
- [ ] No session ID or credentials in URL/request body after login.
- [ ] No token leakage in console logs or error messages.
- [ ] CORS headers: credentials allowed only for same origin.
- [ ] KV access: backend-only (no frontend read of session records).

---

## 7. Implementation Sequence (When Ready)

### Commit 1: Backend Session Endpoints
- Add `/auth/login`, `/auth/session/restore`, `/auth/session/logout` to `supabase/functions/server/index.tsx`.
- Add session KV helpers (`createSession`, `validateSession`, `invalidateSession`).
- Keep old login endpoint working (no breaking change).
- Tests: all endpoints pass integration suite.
- Deploy: function alone, no frontend impact.

### Commit 2: Frontend Cutover
- Update `src/app/services/serverAuth.ts` (auth-related cleanup only, no new logic).
- Update `src/tests/referralSystem.test.ts` (verify cleanup paths unchanged).
- Tests: all existing tests pass, plus new integration auth tests.
- Deploy: frontend, verify SHA gate + deploy verification.

### Commit 3 (if needed): Edge Cases & Polish
- Fix any discovered edge cases (cross-tab sync, timeout handling, etc.).
- Performance tuning (KV TTL strategy, activity refresh logic).

---

## 8. Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Session KV quota exceeded | Low | High | Monitor KV write volumes; implement per-user session limits (e.g., 3 concurrent sessions max). |
| Browser cookie blocked | Low | High | Detect and warn user; provide plain login guidance. |
| Session restore 500 error (backend down) | Low | High | Return user-friendly error; provide manual re-login fallback. |
| Logout fails (KV delete fails) | Low | Medium | Clear cookie anyway (client-enforced logout); user can refresh to confirm logout. |
| CSRF/cookie theft | Medium | Critical | Cookie flags (SameSite=Strict) prevent; IP/user-agent mismatch validation optional. |
| Session data poisoned (KV corruption) | Very Low | Medium | TTL ensures expiration; no critical data in session (only username & password-change flag). |

---

## 9. Notes & Assumptions

1. **Supabase KV is available:** Assuming the project uses Supabase Durable Objects or KV store (confirm if edge function supports KV).
2. **httpOnly cookies are respected:** Modern browsers + same-origin policy enforce this; no JS can read the cookie.
3. **CORS credentials setting:** Frontend already uses `credentials: 'include'` in fetch calls; backend respects this (CORS headers allow credentials).
4. **No strict domain separation:** Assumes single root domain or wildcard cookie domain; subdomain isolation not required.
5. **Session expiry is 24h:** Can be tuned based on user policy (shorter for high-security apps, longer for convenience).
6. **Backward compatibility during Phase 1a:** Old frontend code continues working (calls old endpoints, still functional).

---

## 10. Success Criteria

- [ ] All login/restore/logout flows work end-to-end.
- [ ] Session persists across page refresh + browser restart.
- [ ] localStorage has zero auth authority; all cleanup-only.
- [ ] Integration tests pass (73 pass or more, only known finance failures remain).
- [ ] Deploy SHA verified post-push.
- [ ] No new console errors or warnings in browser DevTools.
- [ ] No increase in error logs post-deploy compared to baseline.
