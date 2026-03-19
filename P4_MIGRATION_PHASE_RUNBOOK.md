# P4 Migration Phase Runbook

This runbook defines the execution standard for each migration phase in P4.

Scope: Planning and operational control only.
Constraint: No feature work during migration phases.

## Phase Order

1. Phase 1 - Authentication and Session State
2. Phase 2 - User Financial and Account Data
3. Phase 3 - Wallet and Banking Data
4. Phase 4 - Admin Salary and Audit Systems
5. Phase 5 - Admin Settings Centralization

## Global Rules

- One phase active at a time.
- No overlapping cutovers.
- No hybrid source of truth after cutover.
- Phase N+1 cannot start before Phase N signoff.
- Roll back immediately on failed gate.

## Ownership

- Phase Owner:
- Backend Owner:
- Frontend Owner:
- QA Owner:
- Release Owner:
- Approver:

## Runbook Template (Use For Every Phase)

### 1. Phase Header

- Phase Name:
- Date Window:
- Target Commit:
- Feature Flag:
- Rollback Commit:
- Change Ticket:

### 2. Scope Definition

- In Scope Files:
- In Scope Services:
- In Scope Endpoints:
- Out of Scope:

### 3. Backend Readiness Checklist

- [ ] Schema and storage model reviewed.
- [ ] Data constraints defined.
- [ ] Endpoint contracts finalized.
- [ ] Auth and authorization requirements verified.
- [ ] Audit logging fields defined.
- [ ] Error codes standardized.

### 4. Frontend Readiness Checklist

- [ ] Legacy localStorage usage mapped.
- [ ] New API integration path mapped.
- [ ] Fallback behavior defined for backend unavailable state.
- [ ] Cutover guard flag wired.
- [ ] Legacy keys purge plan defined.

### 5. Data Migration Plan

- Source Keys:
- Migration Trigger:
- Import Strategy (one-time or batch):
- Validation Rule:
- Post-import Key Purge Rule:
- Failure Handling:

### 6. Cutover Plan

- Flag Off Preconditions:
- Flag On Criteria:
- Exact Cutover Steps:
  1.
  2.
  3.
- Success Criteria:
- Stop Criteria:

### 7. Validation Gates

#### Functional Validation

- [ ] Core flow executes end-to-end.
- [ ] No blocked user/admin operation in scope.

#### Persistence Validation

- [ ] Data survives hard refresh.
- [ ] Data survives full browser restart.

#### Cross-Domain Validation

- [ ] Behavior consistent on all production domains.
- [ ] Same account/session state across domains.

#### Security Validation

- [ ] No in-scope sensitive data in localStorage.
- [ ] No plaintext credential or financial payload in browser storage.
- [ ] Endpoint authorization behavior verified.

### 8. Observability Checks

- [ ] Request and correlation IDs visible for in-scope operations.
- [ ] Read/write success and error rates observed.
- [ ] Migration event logs captured.
- [ ] Alerts reviewed for anomalies.

### 9. Rollback Plan

- Rollback Trigger Conditions:
- Rollback Operator:
- Rollback Steps:
  1.
  2.
  3.
- Post-rollback Verification:
- Incident Notes Link:

### 10. Signoff Sheet

- Backend Owner Signoff: Pass or Fail
- Frontend Owner Signoff: Pass or Fail
- QA Owner Signoff: Pass or Fail
- Release Owner Signoff: Pass or Fail
- Final Approver: Pass or Fail
- Timestamp:

## Phase-Specific Execution Notes

### Phase 1 - Authentication and Session State

Primary Goal: Backend-only session authority.

Required Backend Endpoints:
- Auth login issue session
- Auth verify session
- Auth logout revoke session
- Auth current session introspection

Local Keys To Remove As Authority:
- steadfast_user_session_token_v1
- steadfast_current_user_v1
- steadfast_force_password_change_v1

Cutover Completion Criteria:
- User and admin route guards depend on backend session verification.
- Local auth keys are not used as source of truth.

### Phase 2 - User Financial and Account Data

Primary Goal: Remove local account and referral financial state authority.

Data Domains:
- Balance
- Referral earnings
- Invite graph
- Account profile fields tied to business logic

Local Key To Decommission:
- steadfast_referral_accounts_v1

Cutover Completion Criteria:
- Financial and account data reads and writes are backend-only.
- No financial calculations rely on browser storage.

### Phase 3 - Wallet and Banking Data

Primary Goal: Store wallet and banking details only on backend.

Data Domains:
- Banking account details
- Crypto wallet details

Local Keys To Decommission:
- steadfast_wallet_{username}

Cutover Completion Criteria:
- Wallet forms read and write through backend only.
- Browser storage contains no wallet payload data.

### Phase 4 - Admin Salary and Audit Systems

Primary Goal: Move salary project snapshots and audit events to backend.

Data Domains:
- Salary payments
- Restore points
- Audit log events

Local Keys To Decommission:
- steadfast_admin_salary_project_v1
- steadfast_admin_salary_audit_log_v1

Cutover Completion Criteria:
- Salary state and audit records are backend-managed.
- Restore operations and audit trail are server-backed and immutable.

### Phase 5 - Admin Settings Centralization

Primary Goal: Replace browser-only admin settings storage with centralized backend settings.

Data Domains:
- Maintenance mode
- Registration and transaction constraints
- Task operation settings

Local Key To Decommission:
- steadfast_admin_platform_settings

Cutover Completion Criteria:
- Settings read and write are backend-only.
- Settings are consistent across sessions and admins.

## Suggested Validation Command Set

Run these commands as part of phase validation.

- npm run build
- npm run verify:deploy:p4
- npm run smoke
- npm run test:integration

If admin checks are required:
- Set SUPABASE_ADMIN_TEST_JWT and rerun integration checks.

## Release Record

- Phase:
- Commit SHA:
- Cloudflare Deployment ID:
- Deployed Source SHA:
- Validation Summary:
- Security Review Result:
- Final Decision: Go or No-Go
