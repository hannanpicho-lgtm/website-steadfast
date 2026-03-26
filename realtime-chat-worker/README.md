# Realtime Chat Worker (Durable Objects + D1)

This folder contains a Cloudflare Worker runtime for a real-time support platform.

## What it provides

- Durable Object per conversation/session
- WebSocket message broadcasting
- Typing indicators and presence tracking
- Ordered message delivery via sequence numbers
- D1 persistence for conversations/messages/events
- Admin controls: assignment, tags, priority, SLA
- Observability endpoints for latency/failures

## Environment bindings expected

- `CHAT_DB`: D1 database binding
- `CHAT_SESSION`: Durable Object namespace for conversation sessions
- `REALTIME_CHAT_SECRET`: shared secret used by edge auth middleware

## Routes

- `POST /api/chat/session`
- `GET /api/chat/session/:id/bootstrap`
- `GET /api/chat/session/:id/ws`
- `POST /api/chat/session/:id/assign`
- `POST /api/chat/session/:id/tags`
- `POST /api/chat/session/:id/priority`
- `POST /api/chat/session/:id/sla`
- `GET /api/chat/admin/inbox`
- `GET /api/chat/admin/context/:username`
- `GET /api/chat/metrics`

## Notes

- The frontend rollout should stay feature-flagged (`VITE_REALTIME_CHAT_ENABLED`) and preserve fallback to the existing Supabase chat APIs.
- Message read models in the existing backend remain the compatibility source during migration.
