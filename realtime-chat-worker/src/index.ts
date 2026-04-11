import { ConversationDurableObject } from './conversation-do';
import type { AuthPrincipal, ChatMessagePayload, ConversationPatchPayload, Env } from './types';
import { badRequest, getAuthPrincipal, getSlaBreachMinutes, json, logEvent, notFound, nowIso, tooManyRequests, unauthorized } from './utils';

export { ConversationDurableObject };

function getWsTicketTtlSeconds(env: Env): number {
  const value = Number(env.WS_TICKET_TTL_SECONDS ?? 45);
  if (!Number.isFinite(value) || value <= 0) {
    return 45;
  }
  return Math.min(120, Math.max(10, Math.floor(value)));
}

function shouldAutoEscalateSla(env: Env): boolean {
  return String(env.SLA_AUTO_ESCALATE ?? '').toLowerCase() === 'true';
}

function getWsTicketMaxPerMinute(env: Env): number {
  const value = Number(env.WS_TICKET_MAX_PER_MINUTE ?? 12);
  if (!Number.isFinite(value) || value <= 0) {
    return 12;
  }
  return Math.min(120, Math.max(3, Math.floor(value)));
}

function parseAllowedOrigins(env: Env): string[] {
  const configured = String(env.CORS_ALLOW_ORIGINS ?? '').trim();
  if (!configured) {
    return [];
  }
  return configured
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function isOriginAllowed(origin: string | null, env: Env): boolean {
  const allowedOrigins = parseAllowedOrigins(env);
  if (allowedOrigins.length === 0) {
    return true; // No origin restriction configured
  }
  if (!origin) {
    return false; // Require origin when allowlist is configured
  }
  const normalized = origin.trim().toLowerCase();
  return allowedOrigins.includes(normalized);
}

function applyCorsHeaders(request: Request, env: Env, response: Response): Response {
  const origin = request.headers.get('origin');
  if (origin && isOriginAllowed(origin, env)) {
    response.headers.set('access-control-allow-origin', origin);
  }
  response.headers.set('access-control-allow-methods', 'GET,POST,PATCH,OPTIONS');
  response.headers.set('access-control-allow-headers', 'authorization,content-type,x-chat-role,x-chat-user-id,x-chat-admin-id,x-user-jwt,x-session-username,apikey');
  response.headers.set('access-control-max-age', '86400');
  response.headers.set('vary', 'Origin');
  return response;
}

async function checkWsTicketRateLimit(env: Env, principal: AuthPrincipal, conversationId: string): Promise<boolean> {
  const thresholdIso = new Date(Date.now() - 60_000).toISOString();
  const row = await env.CHAT_DB.prepare(
    `SELECT COUNT(*) AS issued_count
     FROM chat_ws_tickets
     WHERE actor_id = ?
       AND conversation_id = ?
       AND created_at > ?`,
  )
    .bind(principal.id, conversationId, thresholdIso)
    .first<{ issued_count?: number }>();

  const issuedCount = Number(row?.issued_count ?? 0);
  return issuedCount < getWsTicketMaxPerMinute(env);
}

function sha256Hex(input: string): Promise<string> {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(input)).then((digest) => {
    const bytes = new Uint8Array(digest);
    return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  });
}

async function createWsTicket(env: Env, principal: AuthPrincipal, conversationId: string): Promise<{ ticket: string; expiresAt: string }> {
  const ticket = `wst_${crypto.randomUUID()}`;
  const tokenHash = await sha256Hex(ticket);
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + getWsTicketTtlSeconds(env) * 1000).toISOString();

  await env.CHAT_DB.prepare(
    `INSERT INTO chat_ws_tickets
      (id, conversation_id, actor_id, actor_role, token_hash, expires_at, used_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, NULL, ?)`,
  )
    .bind(
      crypto.randomUUID(),
      conversationId,
      principal.id,
      principal.role,
      tokenHash,
      expiresAt,
      createdAt,
    )
    .run();

  return { ticket, expiresAt };
}

async function consumeWsTicket(env: Env, ticket: string, conversationId: string): Promise<AuthPrincipal | null> {
  if (!ticket) {
    return null;
  }

  const tokenHash = await sha256Hex(ticket);
  const now = nowIso();
  const row = await env.CHAT_DB.prepare(
    `SELECT id, actor_id, actor_role, conversation_id, expires_at, used_at
     FROM chat_ws_tickets
     WHERE token_hash = ?
       AND conversation_id = ?
       AND used_at IS NULL
       AND expires_at > ?
     LIMIT 1`,
  )
    .bind(tokenHash, conversationId, now)
    .first<{ id?: string; actor_id?: string; actor_role?: string }>();

  if (!row?.id || !row.actor_id || (row.actor_role !== 'admin' && row.actor_role !== 'user')) {
    return null;
  }

  await env.CHAT_DB.prepare(
    `UPDATE chat_ws_tickets SET used_at = ? WHERE id = ? AND used_at IS NULL`,
  )
    .bind(now, row.id)
    .run();

  return {
    id: row.actor_id,
    role: row.actor_role,
    rawRoles: [],
  };
}

async function enforceSla(env: Env): Promise<{ breaches: number; escalated: number }> {
  const thresholdIso = new Date(Date.now() - getSlaBreachMinutes(env) * 60 * 1000).toISOString();
  const overdue = await env.CHAT_DB.prepare(
    `SELECT id, priority
     FROM chat_conversations
     WHERE status IN ('open', 'pending')
       AND last_response_at IS NULL
       AND COALESCE(last_message_at, created_at) < ?`,
  )
    .bind(thresholdIso)
    .all<{ id?: string; priority?: string }>();

  let escalated = 0;
  for (const convo of overdue.results ?? []) {
    if (!convo.id) {
      continue;
    }

    await env.CHAT_DB.prepare(
      `INSERT OR IGNORE INTO chat_sla_alerts
        (id, conversation_id, breached_at, acknowledged_at, escalated, created_at)
       VALUES (?, ?, ?, NULL, 0, ?)`,
    )
      .bind(crypto.randomUUID(), convo.id, nowIso(), nowIso())
      .run();

    await logEvent(env, {
      conversationId: convo.id,
      eventType: 'sla.breach',
      actorRole: 'system',
      success: true,
    });

    if (shouldAutoEscalateSla(env) && convo.priority !== 'urgent') {
      await env.CHAT_DB.prepare(
        `UPDATE chat_conversations SET priority = 'urgent', updated_at = ? WHERE id = ?`,
      )
        .bind(nowIso(), convo.id)
        .run();
      await env.CHAT_DB.prepare(
        `UPDATE chat_sla_alerts SET escalated = 1 WHERE conversation_id = ?`,
      )
        .bind(convo.id)
        .run();
      await logEvent(env, {
        conversationId: convo.id,
        eventType: 'sla.auto_escalated',
        actorRole: 'system',
        success: true,
      });
      escalated += 1;
    }
  }

  return { breaches: (overdue.results ?? []).length, escalated };
}

function doStubForConversation(env: Env, conversationId: string): DurableObjectStub {
  const id = env.CHAT_DO.idFromName(conversationId);
  return env.CHAT_DO.get(id);
}

async function ensureConversation(env: Env, conversationId: string, username: string): Promise<void> {
  const now = nowIso();
  await env.CHAT_DB.prepare(
    `INSERT OR IGNORE INTO chat_conversations
      (id, username, status, priority, assigned_agent, tags_json, sla_due_at, last_message_at, last_response_at, created_at, updated_at)
     VALUES (?, ?, 'open', 'normal', NULL, '[]', NULL, NULL, NULL, ?, ?)`,
  )
    .bind(conversationId, username, now, now)
    .run();
}

async function patchConversation(env: Env, conversationId: string, patch: ConversationPatchPayload): Promise<void> {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (patch.assignedAgent !== undefined) {
    fields.push('assigned_agent = ?');
    values.push(patch.assignedAgent);
  }
  if (patch.priority !== undefined) {
    fields.push('priority = ?');
    values.push(patch.priority);
  }
  if (patch.tags !== undefined) {
    fields.push('tags_json = ?');
    values.push(JSON.stringify(patch.tags));
  }
  if (patch.slaDueAt !== undefined) {
    fields.push('sla_due_at = ?');
    values.push(patch.slaDueAt);
  }
  if (patch.status !== undefined) {
    fields.push('status = ?');
    values.push(patch.status);
  }

  fields.push('updated_at = ?');
  values.push(nowIso());

  if (fields.length === 1) {
    return;
  }

  const sql = `UPDATE chat_conversations SET ${fields.join(', ')} WHERE id = ?`;
  await env.CHAT_DB.prepare(sql)
    .bind(...values, conversationId)
    .run();
}

async function listConversations(env: Env): Promise<Response> {
  const thresholdIso = new Date(Date.now() - getSlaBreachMinutes(env) * 60 * 1000).toISOString();
  const rows = await env.CHAT_DB.prepare(
    `SELECT id, username, status, priority, assigned_agent, tags_json, sla_due_at, last_message_at, last_response_at, created_at, updated_at,
      CASE WHEN status IN ('open', 'pending')
                AND last_response_at IS NULL
                AND COALESCE(last_message_at, created_at) < ?
           THEN 1 ELSE 0 END AS overdue
     FROM chat_conversations
     ORDER BY COALESCE(last_message_at, created_at) DESC
     LIMIT 200`,
  )
    .bind(thresholdIso)
    .all();

  return json({ conversations: rows.results ?? [] });
}

async function conversationTimeline(env: Env, conversationId: string): Promise<Response> {
  const rows = await env.CHAT_DB.prepare(
    `SELECT id, sequence, sender_role, sender_id, body, attachment_json, created_at, delivered_at, latency_ms, read_at, retry_count, delivery_failed, delayed_delivery
     FROM chat_messages
     WHERE conversation_id = ?
     ORDER BY sequence ASC
     LIMIT 1000`,
  )
    .bind(conversationId)
    .all();

  return json({ conversationId, messages: rows.results ?? [] });
}

async function summaryStats(env: Env): Promise<Response> {
  const slaEnforcement = await enforceSla(env);
  const metrics = await env.CHAT_DB.prepare(
    `SELECT
      COUNT(*) AS total_events,
      SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) AS success_events,
      AVG(CASE WHEN duration_ms IS NOT NULL THEN duration_ms END) AS avg_duration_ms,
      SUM(CASE WHEN event_type = 'message.retry' THEN 1 ELSE 0 END) AS retry_count,
      SUM(CASE WHEN event_type = 'message.delivery.failed' THEN 1 ELSE 0 END) AS failed_deliveries,
      SUM(CASE WHEN event_type = 'message.delayed' THEN 1 ELSE 0 END) AS delayed_messages
     FROM chat_events`,
  ).first();

  const activeConversations = await env.CHAT_DB.prepare(
    `SELECT COUNT(*) AS active_count
     FROM chat_conversations
     WHERE status IN ('open', 'pending')`,
  ).first<{ active_count?: number }>();

  const openLoadByPriority = await env.CHAT_DB.prepare(
    `SELECT priority, COUNT(*) AS count
     FROM chat_conversations
     WHERE status IN ('open', 'pending')
     GROUP BY priority`,
  ).all<{ priority?: string; count?: number }>();

  const slaBreachMinutes = getSlaBreachMinutes(env);
  const thresholdIso = new Date(Date.now() - slaBreachMinutes * 60 * 1000).toISOString();
  const slaBreaches = await env.CHAT_DB.prepare(
    `SELECT COUNT(*) AS breach_count
     FROM chat_conversations
     WHERE status IN ('open', 'pending')
       AND last_response_at IS NULL
       AND COALESCE(last_message_at, created_at) < ?`,
  )
    .bind(thresholdIso)
    .first<{ breach_count?: number }>();

  const recentFailures = await env.CHAT_DB.prepare(
    `SELECT event_type, actor_role, created_at
     FROM chat_events
     WHERE success = 0
     ORDER BY created_at DESC
     LIMIT 25`,
  ).all();

  return json({
    metrics,
    recentFailures: recentFailures.results ?? [],
    activeConversations: Number(activeConversations?.active_count ?? 0),
    openLoadByPriority: openLoadByPriority.results ?? [],
    slaBreaches: Number(slaBreaches?.breach_count ?? 0),
    slaEnforcement,
  });
}

async function deliveryFailures(env: Env): Promise<Response> {
  const rows = await env.CHAT_DB.prepare(
    `SELECT conversation_id, message_id, reason, retry_count, dropped, created_at
     FROM chat_delivery_failures
     ORDER BY created_at DESC
     LIMIT 100`,
  ).all();

  return json({ failures: rows.results ?? [] });
}

function extractConversationId(pathname: string): string | null {
  const parts = pathname.split('/').filter(Boolean);
  const idx = parts.findIndex((p) => p === 'conversations');
  if (idx === -1 || idx + 1 >= parts.length) {
    return null;
  }
  return parts[idx + 1] || null;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('origin');
    if (origin && !isOriginAllowed(origin, env)) {
      return applyCorsHeaders(request, env, json({ error: 'Origin not allowed' }, { status: 403 }));
    }

    if (request.method === 'OPTIONS') {
      return applyCorsHeaders(request, env, new Response(null, { status: 204 }));
    }

    const response = await (async (): Promise<Response> => {
      const url = new URL(request.url);
      const isSocketRequest = request.method === 'GET' && url.pathname === '/chat/ws';
      const principal = isSocketRequest
        ? await consumeWsTicket(env, url.searchParams.get('ticket') || '', url.searchParams.get('conversationId') || '')
        : await getAuthPrincipal(request, env);
      if (!principal) {
        return unauthorized();
      }

      const started = Date.now();

      try {
        if (request.method === 'GET' && url.pathname === '/health') {
          return json({ ok: true, service: 'realtime-chat-worker' });
        }

        if (request.method === 'GET' && url.pathname === '/admin/metrics/summary') {
          if (principal.role !== 'admin') {
            return unauthorized('Admin access required');
          }
          return summaryStats(env);
        }

        if (request.method === 'GET' && url.pathname === '/admin/metrics/failures') {
          if (principal.role !== 'admin') {
            return unauthorized('Admin access required');
          }
          return deliveryFailures(env);
        }

        if (request.method === 'POST' && url.pathname === '/admin/sla/enforce') {
          if (principal.role !== 'admin') {
            return unauthorized('Admin access required');
          }
          const result = await enforceSla(env);
          return json({ ok: true, ...result });
        }

        if (request.method === 'POST' && url.pathname === '/chat/ws-ticket') {
          const payload = (await request.json()) as { conversationId?: string };
          const conversationId = typeof payload.conversationId === 'string' ? payload.conversationId : '';
          if (!conversationId) {
            return badRequest('conversationId is required');
          }
          if (principal.role === 'user' && conversationId !== principal.id && conversationId !== principal.username) {
            return unauthorized('Users can only request websocket tickets for their own conversation');
          }

          const canIssueTicket = await checkWsTicketRateLimit(env, principal, conversationId);
          if (!canIssueTicket) {
            return tooManyRequests('Too many websocket ticket requests. Please wait a moment.');
          }

          const issued = await createWsTicket(env, principal, conversationId);
          return json({
            ticket: issued.ticket,
            expiresAt: issued.expiresAt,
            conversationId,
            actorId: principal.id,
            actorRole: principal.role,
          });
        }

        if (request.method === 'GET' && url.pathname === '/admin/conversations') {
          if (principal.role !== 'admin') {
            return unauthorized('Admin access required');
          }
          return listConversations(env);
        }

        if (request.method === 'GET' && url.pathname.startsWith('/admin/conversations/')) {
          if (principal.role !== 'admin') {
            return unauthorized('Admin access required');
          }
          const conversationId = extractConversationId(url.pathname);
          if (!conversationId) {
            return badRequest('Missing conversation id');
          }
          return conversationTimeline(env, conversationId);
        }

        if (request.method === 'PATCH' && url.pathname.startsWith('/admin/conversations/')) {
          if (principal.role !== 'admin') {
            return unauthorized('Admin access required');
          }
          const conversationId = extractConversationId(url.pathname);
          if (!conversationId) {
            return badRequest('Missing conversation id');
          }
          const patch = (await request.json()) as ConversationPatchPayload;
          await patchConversation(env, conversationId, patch);
          await logEvent(env, {
            conversationId,
            eventType: 'conversation.patched',
            actorId: principal.id,
            actorRole: principal.role,
            payloadJson: JSON.stringify(patch),
            durationMs: Date.now() - started,
            success: true,
          });
          return json({ ok: true });
        }

        if (request.method === 'POST' && url.pathname === '/chat/message') {
          const payload = (await request.json()) as ChatMessagePayload & { username?: string };
          if (!payload.conversationId || !payload.body || !payload.senderId || !payload.senderRole) {
            return badRequest('Missing required message fields');
          }
          if (payload.senderRole !== principal.role) {
            return unauthorized('Role mismatch for chat message sender');
          }
          if (payload.senderId !== principal.id && payload.senderId !== principal.username) {
            return unauthorized('Sender identity mismatch');
          }
          if (principal.role === 'user' && payload.conversationId !== payload.senderId && payload.conversationId !== principal.id) {
            return unauthorized('Users can only write to their own conversation id');
          }
          await ensureConversation(env, payload.conversationId, payload.username || payload.senderId);

          const stub = doStubForConversation(env, payload.conversationId);
          const stubResponse = await stub.fetch('https://do.internal/message', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(payload),
          });

          const createdAt = nowIso();
          if (payload.senderRole === 'admin') {
            await env.CHAT_DB.prepare(
              `UPDATE chat_conversations SET last_response_at = ?, updated_at = ? WHERE id = ?`,
            )
              .bind(createdAt, createdAt, payload.conversationId)
              .run();
          }

          return stubResponse;
        }

        if (request.method === 'POST' && url.pathname === '/chat/typing') {
          const payload = await request.json();
          if (!payload?.conversationId) {
            return badRequest('conversationId is required');
          }
          if (payload.actorRole !== principal.role) {
            return unauthorized('Actor role mismatch');
          }
          if (payload.actorId !== principal.id && payload.actorId !== principal.username) {
            return unauthorized('Actor identity mismatch');
          }
          const stub = doStubForConversation(env, payload.conversationId);
          return stub.fetch('https://do.internal/typing', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(payload),
          });
        }

        if (request.method === 'POST' && url.pathname === '/chat/presence') {
          const payload = await request.json();
          if (!payload?.conversationId) {
            return badRequest('conversationId is required');
          }
          if (payload.actorRole !== principal.role) {
            return unauthorized('Actor role mismatch');
          }
          if (payload.actorId !== principal.id && payload.actorId !== principal.username) {
            return unauthorized('Actor identity mismatch');
          }
          const stub = doStubForConversation(env, payload.conversationId);
          return stub.fetch('https://do.internal/presence', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(payload),
          });
        }

        if (request.method === 'GET' && url.pathname === '/chat/ws') {
          const conversationId = url.searchParams.get('conversationId');
          if (!conversationId) {
            return badRequest('conversationId is required');
          }
          const stub = doStubForConversation(env, conversationId);
          const forwarded = new Request('https://do.internal/ws', {
            headers: {
              upgrade: request.headers.get('upgrade') || '',
              connection: request.headers.get('connection') || '',
              'sec-websocket-key': request.headers.get('sec-websocket-key') || '',
              'sec-websocket-version': request.headers.get('sec-websocket-version') || '',
              'sec-websocket-protocol': request.headers.get('sec-websocket-protocol') || '',
              'x-chat-actor-id': principal.id,
              'x-chat-actor-role': principal.role,
            },
          });
          return stub.fetch(forwarded);
        }

        return notFound();
      } catch (error) {
        await logEvent(env, {
          eventType: 'request.error',
          actorId: principal.id,
          actorRole: principal.role,
          payloadJson: JSON.stringify({ path: url.pathname, error: String(error) }),
          durationMs: Date.now() - started,
          success: false,
        });

        return json(
          {
            error: 'Internal server error',
            message: String(error),
          },
          { status: 500 },
        );
      }
    })();

    return applyCorsHeaders(request, env, response);
  },
};
