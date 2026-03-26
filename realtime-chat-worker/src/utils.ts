import type { Env } from './types';

export function json(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...(init?.headers ?? {}),
    },
  });
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function randomId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function unauthorized(message = 'Unauthorized'): Response {
  return json({ error: message }, { status: 401 });
}

export function badRequest(message: string): Response {
  return json({ error: message }, { status: 400 });
}

export function notFound(message = 'Not found'): Response {
  return json({ error: message }, { status: 404 });
}

export function getAuthPrincipal(request: Request, env: Env): { id: string; role: 'admin' | 'user' } | null {
  const auth = request.headers.get('authorization') || '';
  const headerToken = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (env.CHAT_AUTH_TOKEN && headerToken !== env.CHAT_AUTH_TOKEN) {
    return null;
  }

  const roleHeader = request.headers.get('x-chat-role');
  const idHeader = request.headers.get('x-chat-user-id') || request.headers.get('x-chat-admin-id');
  if (!idHeader || (roleHeader !== 'admin' && roleHeader !== 'user')) {
    return null;
  }

  return { id: idHeader, role: roleHeader };
}

export async function logEvent(
  env: Env,
  event: {
    conversationId?: string;
    eventType: string;
    actorId?: string;
    actorRole?: string;
    payloadJson?: string;
    durationMs?: number;
    success: boolean;
  },
): Promise<void> {
  const id = randomId('evt');
  const createdAt = nowIso();
  await env.CHAT_DB.prepare(
    `INSERT INTO chat_events
      (id, conversation_id, event_type, actor_id, actor_role, payload_json, duration_ms, success, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      event.conversationId ?? null,
      event.eventType,
      event.actorId ?? null,
      event.actorRole ?? null,
      event.payloadJson ?? null,
      event.durationMs ?? null,
      event.success ? 1 : 0,
      createdAt,
    )
    .run();
}
