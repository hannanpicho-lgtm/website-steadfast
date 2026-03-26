# Realtime Chat Worker (Durable Objects + D1)

This folder contains the Cloudflare Worker runtime for production realtime chat.

## Production capabilities

- Durable Object per conversation/session
- Ordered delivery via per-conversation sequence numbers
- WebSocket broadcasting for message, typing, and presence
- Typing indicators and presence tracking
- D1 persistence for conversations/messages/events
- Retry + delivery failure tracking
- Delayed message tracking
- Admin controls: assignment, tags, priority, SLA, status
- RBAC-gated admin APIs
- Observability endpoints for latency/failures/load/SLA breaches

## Worker configuration

- Worker config file: `wrangler.toml`
- D1 migrations: `migrations/0001_init_chat.sql`
- NPM scripts (from repo root):
	- `npm run chat:worker:check`
	- `npm run chat:worker:migrate`
	- `npm run chat:worker:deploy`
	- `npm run chat:worker:tail`
	- `npm run chat:worker:validate`

## Required bindings and vars

- Binding: `CHAT_DO` durable object namespace
- Binding: `CHAT_DB` D1 database
- Variable: `CHAT_AUTH_TOKEN` shared service token
- Variable: `SUPABASE_JWT_SECRET` for JWT signature verification
- Variable: `ADMIN_ROLE_NAMES` comma-separated admin role names
- Variable: `USER_ROLE_NAMES` comma-separated user role names
- Variable: `SLA_BREACH_MINUTES` threshold for breach counting
- Variable: `MAX_RETRY_ATTEMPTS` durable object write retry count

## API surface

- `GET /health`
- `POST /chat/message`
- `POST /chat/typing`
- `POST /chat/presence`
- `GET /chat/ws?conversationId=...&actorId=...&role=user&token=...`
- `POST /chat/ws-ticket`
- `GET /chat/ws?conversationId=...&ticket=...`
- `GET /admin/conversations`
- `GET /admin/conversations/:conversationId`
- `PATCH /admin/conversations/:conversationId`
- `GET /admin/metrics/summary`
- `GET /admin/metrics/failures`
- `POST /admin/sla/enforce`

## Identity and RBAC

- Admin endpoints require:
	- valid `x-user-jwt` signed with `SUPABASE_JWT_SECRET`
	- admin role claim match (`ADMIN_ROLE_NAMES`)
	- principal identity bound to `x-chat-admin-id`
- User endpoints:
	- identity bound to `x-chat-user-id`
	- optional strict JWT mode via `CHAT_REQUIRE_USER_JWT=true`
- WebSocket authentication:
	- uses short-lived tickets from `POST /chat/ws-ticket`
	- ticket is one-time use and expires quickly (`WS_TICKET_TTL_SECONDS`)
	- ticket is consumed and invalidated on successful connection
- All mutation events are logged with actor id/role in `chat_events`.

## Reliability behavior

- Durable Object restores sequence on recovery using state storage, with D1 fallback (`MAX(sequence)`).
- Message writes retry up to `MAX_RETRY_ATTEMPTS`.
- Exhausted retries create `chat_delivery_failures` rows and `message.delivery.failed` events.
- Broadcast socket send failures emit `socket.broadcast.dropped` events.
- High-latency message writes emit `message.delayed` events.
- SLA breach enforcement emits `sla.breach` and optional `sla.auto_escalated` events.

## End-to-end validation

1. Configure worker secrets and routes in Cloudflare.
2. Run migrations: `npm run chat:worker:migrate`.
3. Deploy worker: `npm run chat:worker:deploy`.
4. Validate endpoints with environment variables:
	 - `CHAT_REALTIME_VALIDATE_URL`
	 - `CHAT_REALTIME_VALIDATE_TOKEN`
	 - `CHAT_REALTIME_VALIDATE_ADMIN_JWT`
	 - `CHAT_REALTIME_VALIDATE_ADMIN_ID`
5. Run: `npm run chat:worker:validate`.
6. Run smoke suite: `npm run test:predeploy:realtime`.
6. Observe live logs with `npm run chat:worker:tail`.

## Rollout safety

- Keep realtime disabled by default via `VITE_CHAT_REALTIME_ENABLED=false`.
- Enable realtime for controlled cohorts only after metrics and failures stay within threshold.
- Polling fallback remains active in user/admin UI to avoid degraded service during rollout.
