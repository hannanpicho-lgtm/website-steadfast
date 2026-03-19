# P4 Phase 1 Tracker - Authentication and Session State

Phase: 1
Status: Planned
Objective: Switch authentication and session state to backend-only authority with zero regression.

## 1. Ownership and Control

- Phase Owner:
- Backend Owner:
- Frontend Owner:
- QA Owner:
- Release Owner:
- Approver:
- Change Ticket:

## 2. Fixed Scope

In scope:
- Session issue, verify, and revoke authority
- Frontend route guard session authority
- Removal of local auth keys as source of truth

Out of scope:
- Financial/account migration
- Wallet/banking migration
- Salary/audit migration
- Admin settings migration

## 3. Source of Truth Rule

Cutover rule:
- Backend session is the only source of truth when Phase 1 flag is on.
- Local auth keys may only be used for one-time migration exchange, then purged.

Feature flag:
- p4_phase1_auth_backend_only

## 4. Keys and Data Targets

Legacy keys in scope:
- steadfast_user_session_token_v1
- steadfast_current_user_v1
- steadfast_force_password_change_v1

Expected post-cutover behavior:
- No auth decision is made from localStorage-only state.
- Route authorization requires backend session verification path.

## 5. Backend Requirements Checklist

- [ ] Session lifecycle model finalized.
- [ ] Session expiry and revocation behavior finalized.
- [ ] Login endpoint issues backend-validated session.
- [ ] Verify endpoint returns authoritative session state.
- [ ] Logout endpoint revokes session.
- [ ] Audit log records auth lifecycle events.

## 6. Frontend Requirements Checklist

- [ ] Login path consumes backend session response.
- [ ] Route guard checks backend session authority.
- [ ] Local auth fallback paths removed from authorization decisions.
- [ ] One-time exchange path defined for existing users.
- [ ] Legacy local auth keys purged after successful exchange.

## 7. One-Time Migration Procedure

- [ ] Detect legacy local auth token on first post-cutover visit.
- [ ] Attempt backend session exchange.
- [ ] If exchange succeeds:
  - [ ] Persist backend session only.
  - [ ] Purge legacy local auth keys immediately.
- [ ] If exchange fails:
  - [ ] Purge legacy local auth keys.
  - [ ] Force login with clear user message.

## 8. Cutover Run Steps

Pre-cutover:
- [ ] Build passes (`npm run build`).
- [ ] Deploy SHA gate passes (`npm run verify:deploy:p4`).
- [ ] Backup created and recorded.
- [ ] Rollback commit identified.

Cutover:
- [ ] Enable flag p4_phase1_auth_backend_only.
- [ ] Deploy to production.
- [ ] Confirm deployment source SHA matches target commit.

Post-cutover immediate checks:
- [ ] Login works for user path.
- [ ] Login works for admin path.
- [ ] Auth-protected routes gate correctly.
- [ ] Logout revokes active session.

## 9. Validation Gates (Must All Pass)

Functional validation:
- [ ] User login success.
- [ ] Admin login success.
- [ ] Unauthorized route redirect behavior correct.
- [ ] Logout and re-login behavior correct.

Persistence validation:
- [ ] User session survives refresh.
- [ ] User session survives browser restart.
- [ ] Admin session survives refresh.
- [ ] Admin session survives browser restart.

Cross-domain validation:
- [ ] Consistent auth behavior on `steadfastworkbench.org`.
- [ ] Consistent auth behavior on `www.steadfastworkbench.org`.
- [ ] Consistent auth behavior on `website-steadfast.pages.dev`.

Security validation:
- [ ] No plaintext credentials in browser storage.
- [ ] No auth decisions depend on localStorage-only identity.
- [ ] Sensitive auth data not exposed in browser storage.

## 10. Observability and Diagnostics

Required logs:
- [ ] Login success/failure with correlation id.
- [ ] Session verify success/failure with correlation id.
- [ ] Logout and revoke events with correlation id.

Required dashboard checks:
- [ ] Auth error rate baseline vs post-cutover.
- [ ] Session verify endpoint latency.
- [ ] 401/403 rate trend within tolerance.

## 11. Stop and Rollback Criteria

Trigger rollback if any occur:
- [ ] Login failure rate exceeds threshold.
- [ ] Persistent unauthorized redirects for valid sessions.
- [ ] Session loss across restart exceeds threshold.
- [ ] Any security leakage or inconsistent auth authority.

Rollback steps:
- [ ] Disable p4_phase1_auth_backend_only.
- [ ] Redeploy rollback commit.
- [ ] Verify deployment SHA alignment.
- [ ] Re-run auth verification checks.
- [ ] Open incident report and root cause log.

## 12. Evidence Record

- Backup path:
- Backup timestamp:
- Cutover commit SHA:
- Rollback commit SHA:
- Cloudflare deployment ID:
- Deployed source SHA:
- Validation result summary:
- Incident references:

## 13. Signoff

- Backend Owner: Pass or Fail
- Frontend Owner: Pass or Fail
- QA Owner: Pass or Fail
- Release Owner: Pass or Fail
- Final Approver: Pass or Fail
- Signoff timestamp:
