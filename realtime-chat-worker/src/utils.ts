import type { AuthPrincipal, Env } from './types';

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

export function tooManyRequests(message: string): Response {
  return json({ error: message }, { status: 429 });
}

export function notFound(message = 'Not found'): Response {
  return json({ error: message }, { status: 404 });
}

function parseRoleList(input: string | undefined, fallback: string[]): string[] {
  if (!input) {
    return fallback;
  }
  const roles = input
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
  return roles.length > 0 ? roles : fallback;
}

function base64UrlToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const raw = atob(padded);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    bytes[i] = raw.charCodeAt(i);
  }
  return bytes;
}

function extractRoles(payload: Record<string, unknown>): string[] {
  const roleCandidates = new Set<string>();
  const topLevelRole = payload.role;
  if (typeof topLevelRole === 'string') {
    roleCandidates.add(topLevelRole.toLowerCase());
  }

  const topLevelRoles = payload.roles;
  if (Array.isArray(topLevelRoles)) {
    topLevelRoles.forEach((entry) => {
      if (typeof entry === 'string') {
        roleCandidates.add(entry.toLowerCase());
      }
    });
  }

  const appMetadata = payload.app_metadata;
  if (appMetadata && typeof appMetadata === 'object') {
    const appRole = (appMetadata as Record<string, unknown>).role;
    if (typeof appRole === 'string') {
      roleCandidates.add(appRole.toLowerCase());
    }
    const appRoles = (appMetadata as Record<string, unknown>).roles;
    if (Array.isArray(appRoles)) {
      appRoles.forEach((entry) => {
        if (typeof entry === 'string') {
          roleCandidates.add(entry.toLowerCase());
        }
      });
    }
  }

  const userMetadata = payload.user_metadata;
  if (userMetadata && typeof userMetadata === 'object') {
    const userRole = (userMetadata as Record<string, unknown>).role;
    if (typeof userRole === 'string') {
      roleCandidates.add(userRole.toLowerCase());
    }
    const userRoles = (userMetadata as Record<string, unknown>).roles;
    if (Array.isArray(userRoles)) {
      userRoles.forEach((entry) => {
        if (typeof entry === 'string') {
          roleCandidates.add(entry.toLowerCase());
        }
      });
    }
  }

  return Array.from(roleCandidates);
}

async function verifySupabaseJwt(jwt: string, env: Env): Promise<Record<string, unknown> | null> {
  const parts = jwt.split('.');
  if (parts.length !== 3) {
    return null;
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const payloadBytes = base64UrlToBytes(encodedPayload);

  let header: Record<string, unknown>;
  let payload: Record<string, unknown>;
  try {
    header = JSON.parse(new TextDecoder().decode(base64UrlToBytes(encodedHeader))) as Record<string, unknown>;
    payload = JSON.parse(new TextDecoder().decode(payloadBytes)) as Record<string, unknown>;
  } catch {
    return null;
  }

  if (header.alg !== 'HS256') {
    return null;
  }

  const secret = env.SUPABASE_JWT_SECRET;
  if (!secret) {
    return null;
  }

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );

  const isValid = await crypto.subtle.verify(
    'HMAC',
    key,
    (() => {
      const bytes = base64UrlToBytes(encodedSignature);
      return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as unknown as BufferSource;
    })() as BufferSource,
    (() => {
      const bytes = new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`);
      return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as unknown as BufferSource;
    })() as BufferSource,
  );
  if (!isValid) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  const exp = Number(payload.exp);
  if (Number.isFinite(exp) && exp > 0 && exp < now) {
    return null;
  }

  return payload;
}

export function getMaxRetryAttempts(env: Env): number {
  const value = Number(env.MAX_RETRY_ATTEMPTS ?? 2);
  if (!Number.isFinite(value)) {
    return 2;
  }
  return Math.max(0, Math.min(10, Math.trunc(value)));
}

export function getSlaBreachMinutes(env: Env): number {
  const value = Number(env.SLA_BREACH_MINUTES ?? 30);
  if (!Number.isFinite(value) || value <= 0) {
    return 30;
  }
  return value;
}

function resolveJwtIdentity(payload: Record<string, unknown>): { id: string; username?: string; roles: string[] } | null {
  const sub = typeof payload.sub === 'string' ? payload.sub : '';
  const email = typeof payload.email === 'string' ? payload.email : '';
  const userMetadata = payload.user_metadata && typeof payload.user_metadata === 'object'
    ? (payload.user_metadata as Record<string, unknown>)
    : null;
  const username = userMetadata && typeof userMetadata.username === 'string' ? userMetadata.username : undefined;
  const id = sub || email || username || '';
  if (!id) {
    return null;
  }
  return {
    id,
    username,
    roles: extractRoles(payload),
  };
}

export async function getAuthPrincipal(request: Request, env: Env): Promise<AuthPrincipal | null> {
  const auth = request.headers.get('authorization') || '';
  const headerToken = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (env.CHAT_AUTH_TOKEN && headerToken !== env.CHAT_AUTH_TOKEN) {
    return null;
  }

  const roleHeader = request.headers.get('x-chat-role');
  if (roleHeader !== 'admin' && roleHeader !== 'user') {
    return null;
  }

  const jwt = request.headers.get('x-user-jwt') || '';
  const adminRoles = parseRoleList(env.ADMIN_ROLE_NAMES, ['admin', 'super_admin']);
  const userRoles = parseRoleList(env.USER_ROLE_NAMES, ['user', 'member']);

  const jwtPayload = jwt ? await verifySupabaseJwt(jwt, env) : null;
  const jwtIdentity = jwtPayload ? resolveJwtIdentity(jwtPayload) : null;
  const requestedId = request.headers.get('x-chat-user-id') || request.headers.get('x-chat-admin-id') || '';

  if (roleHeader === 'admin') {
    if (!jwtIdentity) {
      return null;
    }
    const hasAdminRole = jwtIdentity.roles.some((role) => adminRoles.includes(role));
    if (!hasAdminRole) {
      return null;
    }
    if (requestedId && requestedId !== jwtIdentity.id && requestedId !== jwtIdentity.username) {
      return null;
    }
    return {
      id: jwtIdentity.id,
      username: jwtIdentity.username,
      role: 'admin',
      rawRoles: jwtIdentity.roles,
    };
  }

  const requireUserJwt = String(env.CHAT_REQUIRE_USER_JWT ?? '').toLowerCase() === 'true';
  if (jwtIdentity) {
    const hasUserRole = jwtIdentity.roles.length === 0 || jwtIdentity.roles.some((role) => userRoles.includes(role) || adminRoles.includes(role));
    if (!hasUserRole) {
      return null;
    }
    if (requestedId && requestedId !== jwtIdentity.id && requestedId !== jwtIdentity.username) {
      return null;
    }
    return {
      id: jwtIdentity.id,
      username: jwtIdentity.username,
      role: 'user',
      rawRoles: jwtIdentity.roles,
    };
  }

  if (requireUserJwt) {
    return null;
  }

  if (!requestedId) {
    return null;
  }

  return {
    id: requestedId,
    role: 'user',
    rawRoles: [],
  };
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
