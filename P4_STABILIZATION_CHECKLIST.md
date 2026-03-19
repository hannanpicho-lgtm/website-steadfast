# P4 Stabilization Checklist

This checklist is for stabilization-only work on P4 (Steadfast).

## Change Control

- [ ] P4 fix is tagged `p4-stability`.
- [ ] Commit contains one issue only (no bundled fixes).
- [ ] No feature or architecture changes are included.
- [ ] Root cause and confidence level are documented before code changes.

## Deployment Integrity

- [ ] Local target commit is identified (`git rev-parse HEAD`).
- [ ] Cloudflare latest production deploy source SHA matches target commit.
- [ ] Command run: `npm run verify:deploy:p4`.
- [ ] Latest production deploy status is success.

## Backend Linkage

- [ ] Frontend project ref matches P4 Supabase project (`gvqwvuqeenkusdayosty`).
- [ ] Health endpoint returns OK.
- [ ] Login and verify-token endpoints succeed against the same backend.

## Session Reliability

- [ ] User route guard requires a valid server session token.
- [ ] Login success verified.
- [ ] Session survives refresh.
- [ ] Session behavior verified after full browser restart.

## Data Persistence

- [ ] User data read is stable across repeated requests.
- [ ] No critical user/auth path relies only on localStorage.
- [ ] Any localStorage usage is non-critical and documented.

## Release Evidence

- [ ] Validation timestamp recorded.
- [ ] Cloudflare deployment ID recorded.
- [ ] Tested commit SHA recorded.
- [ ] Rollback commit identified.
