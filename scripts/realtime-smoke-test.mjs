#!/usr/bin/env node

const baseUrl = process.env.CHAT_REALTIME_VALIDATE_URL || '';
const workerToken = process.env.CHAT_REALTIME_VALIDATE_TOKEN || '';
const adminJwt = process.env.CHAT_REALTIME_VALIDATE_ADMIN_JWT || '';
const adminId = process.env.CHAT_REALTIME_VALIDATE_ADMIN_ID || '';
const smokeRequired = String(process.env.REALTIME_SMOKE_REQUIRED || '').toLowerCase() === 'true';

if (!baseUrl || !adminJwt || !adminId) {
  const message = 'Realtime smoke skipped. Set CHAT_REALTIME_VALIDATE_URL, CHAT_REALTIME_VALIDATE_ADMIN_JWT, and CHAT_REALTIME_VALIDATE_ADMIN_ID.';
  if (smokeRequired) {
    console.error(message);
    process.exit(1);
  }
  console.log(message);
  process.exit(0);
}

const normalizedBase = baseUrl.replace(/\/$/, '');
const conversationId = `smoke_user_${Date.now()}`;

async function request(path, init = {}) {
  const response = await fetch(`${normalizedBase}${path}`, init);
  const payload = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, payload };
}

function adminHeaders(contentType = false) {
  return {
    ...(contentType ? { 'content-type': 'application/json' } : {}),
    ...(workerToken ? { authorization: `Bearer ${workerToken}` } : {}),
    'x-chat-role': 'admin',
    'x-chat-admin-id': adminId,
    'x-user-jwt': adminJwt,
  };
}

function userHeaders(contentType = false) {
  return {
    ...(contentType ? { 'content-type': 'application/json' } : {}),
    ...(workerToken ? { authorization: `Bearer ${workerToken}` } : {}),
    'x-chat-role': 'user',
    'x-chat-user-id': conversationId,
  };
}

function assertOrThrow(condition, message, context = {}) {
  if (!condition) {
    const error = new Error(message);
    error.context = context;
    throw error;
  }
}

async function run() {
  const userTicket = await request('/chat/ws-ticket', {
    method: 'POST',
    headers: userHeaders(true),
    body: JSON.stringify({ conversationId }),
  });
  assertOrThrow(userTicket.ok, 'User websocket ticket issuance failed', userTicket);

  const adminTicket = await request('/chat/ws-ticket', {
    method: 'POST',
    headers: adminHeaders(true),
    body: JSON.stringify({ conversationId }),
  });
  assertOrThrow(adminTicket.ok, 'Admin websocket ticket issuance failed', adminTicket);

  const presence = await request('/chat/presence', {
    method: 'POST',
    headers: userHeaders(true),
    body: JSON.stringify({
      conversationId,
      actorId: conversationId,
      actorRole: 'user',
      state: 'online',
    }),
  });
  assertOrThrow(presence.status === 204, 'Presence update failed', presence);

  const message = await request('/chat/message', {
    method: 'POST',
    headers: userHeaders(true),
    body: JSON.stringify({
      conversationId,
      senderRole: 'user',
      senderId: conversationId,
      body: `Smoke message ${Date.now()}`,
    }),
  });
  assertOrThrow(message.ok, 'Realtime message delivery failed', message);

  const timeline = await request(`/admin/conversations/${encodeURIComponent(conversationId)}`, {
    method: 'GET',
    headers: adminHeaders(false),
  });
  assertOrThrow(timeline.ok, 'Conversation timeline fetch failed', timeline);
  const firstMessage = Array.isArray(timeline.payload?.messages) ? timeline.payload.messages[0] : null;
  assertOrThrow(Boolean(firstMessage), 'Timeline does not contain delivered message', timeline.payload);
  assertOrThrow(Object.prototype.hasOwnProperty.call(firstMessage, 'retry_count'), 'Timeline missing retry_count field', firstMessage);
  assertOrThrow(Object.prototype.hasOwnProperty.call(firstMessage, 'delivery_failed'), 'Timeline missing delivery_failed field', firstMessage);

  const metrics = await request('/admin/metrics/summary', {
    method: 'GET',
    headers: adminHeaders(false),
  });
  assertOrThrow(metrics.ok, 'Metrics summary fetch failed', metrics);
  assertOrThrow(metrics.payload?.metrics && Object.prototype.hasOwnProperty.call(metrics.payload.metrics, 'retry_count'), 'Metrics missing retry_count', metrics.payload);
  assertOrThrow(metrics.payload?.metrics && Object.prototype.hasOwnProperty.call(metrics.payload.metrics, 'failed_deliveries'), 'Metrics missing failed_deliveries', metrics.payload);

  const failures = await request('/admin/metrics/failures', {
    method: 'GET',
    headers: adminHeaders(false),
  });
  assertOrThrow(failures.ok, 'Failure metrics fetch failed', failures);
  assertOrThrow(Array.isArray(failures.payload?.failures), 'Failure metrics payload malformed', failures.payload);

  const enforceSla = await request('/admin/sla/enforce', {
    method: 'POST',
    headers: adminHeaders(false),
  });
  assertOrThrow(enforceSla.ok, 'SLA enforcement endpoint failed', enforceSla);

  console.log('Realtime smoke test passed', {
    conversationId,
    userTicketExpiresAt: userTicket.payload?.expiresAt,
    adminTicketExpiresAt: adminTicket.payload?.expiresAt,
    messageId: message.payload?.id,
  });
}

run().catch((error) => {
  console.error('Realtime smoke test failed:', error.message || error);
  if (error.context) {
    console.error('Context:', JSON.stringify(error.context));
  }
  process.exit(1);
});
