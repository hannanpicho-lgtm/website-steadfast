# Staging Environment Runbook

## Purpose

This project now uses a backend/frontend compatibility contract to prevent partial deploy regressions.
Staging must validate that contract before any production rollout.

## Required Staging Topology

- Separate Supabase project ref for staging.
- Separate Cloudflare Pages deployment/environment for staging.
- Same function slug and route structure as production.
- Version endpoint must expose:
  - deployment metadata
  - supported API versions
  - minimum frontend contract version
  - feature flags
  - environment/stage metadata

## Mandatory Deploy Order

1. Deploy backend to staging.
2. Verify live staging backend contract.
3. Run full-flow smoke on staging.
4. Deploy frontend to staging.
5. Re-run staging verification against live frontend/backend pair.
6. Promote backend to production.
7. Verify live production backend contract.
8. Deploy production frontend only after production backend verification passes.

## Backend Verification

Use the live version verifier against the staging backend base URL.

```powershell
node scripts/verify-live-version.mjs \
  --base https://<staging-project-ref>.supabase.co/functions/v1/make-server-a1c55d7e \
  --expected-function make-server-a1c55d7e \
  --expected-frontend-contract 2026-03-31-contract-v1 \
  --require-api-version v2 \
  --require-features startingSnapshotV2,recordsSnapshotV2,activitySnapshotV2,compatibilityTelemetryV2 \
  --verify-route-health true
```

Any failure blocks frontend deployment.

## Staging Smoke Expectations

Validate these flows before production promotion:

- Login/session restore
- Starting page load
- Task submit
- Records page load
- Activity page load
- Admin user task controls
- VIP manual override behavior
- Cross-user isolation after logout/login swap in the same browser session

## Production Promotion Gate

Production frontend deploy is blocked unless production backend verifies with the same contract checks.

## Monitoring

After deploy, review:

- /admin/observability/endpoint-latency-report
- /admin/observability/compatibility-report

Fallback spikes or version mismatches indicate backend/frontend contract drift and must be treated as release blockers.