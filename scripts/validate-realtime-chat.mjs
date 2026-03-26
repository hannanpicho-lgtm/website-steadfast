#!/usr/bin/env node

const baseUrl = process.env.CHAT_REALTIME_VALIDATE_URL || '';
const workerToken = process.env.CHAT_REALTIME_VALIDATE_TOKEN || '';
const adminJwt = process.env.CHAT_REALTIME_VALIDATE_ADMIN_JWT || '';
const adminId = process.env.CHAT_REALTIME_VALIDATE_ADMIN_ID || '';

if (!baseUrl) {
  console.error('CHAT_REALTIME_VALIDATE_URL is required');
  process.exit(1);
}

if (!adminJwt || !adminId) {
  console.error('CHAT_REALTIME_VALIDATE_ADMIN_JWT and CHAT_REALTIME_VALIDATE_ADMIN_ID are required');
  process.exit(1);
}

const normalizedBase = baseUrl.replace(/\/$/, '');

async function call(path, init = {}) {
  const response = await fetch(`${normalizedBase}${path}`, {
    ...init,
    headers: {
      ...(init.headers || {}),
      ...(workerToken ? { authorization: `Bearer ${workerToken}` } : {}),
      'x-chat-role': 'admin',
      'x-chat-admin-id': adminId,
      'x-user-jwt': adminJwt,
      'content-type': 'application/json',
    },
  });

  const payload = await response.json().catch(() => ({}));
  return { status: response.status, ok: response.ok, payload };
}

async function main() {
  const health = await call('/health', { method: 'GET' });
  const metrics = await call('/admin/metrics/summary', { method: 'GET' });
  const conversations = await call('/admin/conversations', { method: 'GET' });

  console.log('Realtime worker health:', health.status, health.ok ? 'ok' : 'failed');
  console.log('Metrics endpoint:', metrics.status, metrics.ok ? 'ok' : 'failed');
  console.log('Conversations endpoint:', conversations.status, conversations.ok ? 'ok' : 'failed');

  if (!health.ok || !metrics.ok || !conversations.ok) {
    console.error('Realtime chat validation failed', {
      health: health.payload,
      metrics: metrics.payload,
      conversations: conversations.payload,
    });
    process.exit(1);
  }

  const conversationCount = Array.isArray(conversations.payload?.conversations)
    ? conversations.payload.conversations.length
    : 0;
  console.log('Validation succeeded. Conversation count:', conversationCount);
}

main().catch((error) => {
  console.error('Validation command failed:', error);
  process.exit(1);
});
