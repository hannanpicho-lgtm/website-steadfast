import { ConversationDurableObject } from './conversation-do';
import type { ChatMessagePayload, ConversationPatchPayload, Env } from './types';
import { badRequest, getAuthPrincipal, json, logEvent, notFound, nowIso, unauthorized } from './utils';

export { ConversationDurableObject };

function getSocketPrincipal(url: URL, env: Env): { id: string; role: 'admin' | 'user' } | null {
  const token = url.searchParams.get('token') || '';
  if (env.CHAT_AUTH_TOKEN && token !== env.CHAT_AUTH_TOKEN) {
    return null;
  }

  const role = url.searchParams.get('role');
  const actorId = url.searchParams.get('actorId');
  if (!actorId || (role !== 'admin' && role !== 'user')) {
    return null;
  }

  return { id: actorId, role };
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
  const rows = await env.CHAT_DB.prepare(
    `SELECT id, username, status, priority, assigned_agent, tags_json, sla_due_at, last_message_at, last_response_at, created_at, updated_at
     FROM chat_conversations
     ORDER BY COALESCE(last_message_at, created_at) DESC
     LIMIT 200`,
  ).all();

  return json({ conversations: rows.results ?? [] });
}

async function conversationTimeline(env: Env, conversationId: string): Promise<Response> {
  const rows = await env.CHAT_DB.prepare(
    `SELECT id, sequence, sender_role, sender_id, body, attachment_json, created_at, delivered_at, latency_ms, read_at
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
  const metrics = await env.CHAT_DB.prepare(
    `SELECT
      COUNT(*) AS total_events,
      SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) AS success_events,
      AVG(CASE WHEN duration_ms IS NOT NULL THEN duration_ms END) AS avg_duration_ms
     FROM chat_events`,
  ).first();

  const recentFailures = await env.CHAT_DB.prepare(
    `SELECT event_type, actor_role, created_at
     FROM chat_events
     WHERE success = 0
     ORDER BY created_at DESC
     LIMIT 25`,
  ).all();

  return json({ metrics, recentFailures: recentFailures.results ?? [] });
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
    const url = new URL(request.url);
    const isSocketRequest = request.method === 'GET' && url.pathname === '/chat/ws';
    const principal = isSocketRequest ? getSocketPrincipal(url, env) : getAuthPrincipal(request, env);
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
        await ensureConversation(env, payload.conversationId, payload.username || payload.senderId);

        const stub = doStubForConversation(env, payload.conversationId);
        const response = await stub.fetch('https://do.internal/message', {
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

        return response;
      }

      if (request.method === 'POST' && url.pathname === '/chat/typing') {
        const payload = await request.json();
        if (!payload?.conversationId) {
          return badRequest('conversationId is required');
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
  },
};
