/**
 * API Integration Tests
 *
 * These tests hit the live Supabase Edge Function.
 * They verify status codes, response schemas, validation enforcement,
 * and the security fixes applied to the backend.
 *
 * Run with:  npm run test:integration
 * Requires network access to gvqwvuqeenkusdayosty.supabase.co
 */
import { describe, it, expect, beforeAll } from 'vitest';

const BASE = 'https://gvqwvuqeenkusdayosty.supabase.co/functions/v1/make-server-a1c55d7e';

// Unique test username per run to avoid polluting production state
const RUN_ID = Date.now();
const TEST_USER = `test_audit_${RUN_ID}`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function request(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

function post(path: string, payload: unknown, extraHeaders: Record<string, string> = {}) {
  return request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
    body: JSON.stringify(payload),
  });
}

// ─── Health ───────────────────────────────────────────────────────────────────

describe('Health check', () => {
  it('GET /health → 200 { status: "ok" }', async () => {
    const { status, body } = await request('/health');
    expect(status).toBe(200);
    expect(body.status).toBe('ok');
  });
});

// ─── User ─────────────────────────────────────────────────────────────────────

describe('User endpoints', () => {
  it('GET /user/:username auto-creates a user and returns correct shape', async () => {
    const { status, body } = await request(`/user/${TEST_USER}`);
    expect(status).toBe(200);
    expect(body.username).toBe(TEST_USER);
    expect(typeof body.balance).toBe('number');
    expect(typeof body.vipLevel).toBe('number');
    expect(typeof body.tasksCompleted).toBe('number');
    expect(typeof body.isFrozen).toBe('boolean');
  });

  it('GET /user/:username is idempotent (same data on second call)', async () => {
    const { status, body } = await request(`/user/${TEST_USER}`);
    expect(status).toBe(200);
    expect(body.username).toBe(TEST_USER);
  });
});

// ─── Submit Task ──────────────────────────────────────────────────────────────

describe('POST /submit-task', () => {
  it('returns 400 when username is missing', async () => {
    const { status, body } = await post('/submit-task', { productPrice: 100 });
    expect(status).toBe(400);
    expect(typeof body.error).toBe('string');
  });

  it('returns 400 when productPrice is missing', async () => {
    const { status, body } = await post('/submit-task', { username: TEST_USER });
    expect(status).toBe(400);
    expect(typeof body.error).toBe('string');
  });

  it('returns 400 for a negative productPrice', async () => {
    const { status } = await post('/submit-task', { username: TEST_USER, productPrice: -50 });
    expect(status).toBe(400);
  });

  it('returns 400 for productPrice of 0', async () => {
    const { status } = await post('/submit-task', { username: TEST_USER, productPrice: 0 });
    expect(status).toBe(400);
  });

  it('returns 400 for a non-numeric productPrice', async () => {
    const { status } = await post('/submit-task', { username: TEST_USER, productPrice: 'free' });
    expect(status).toBe(400);
  });

  it('succeeds with a valid productPrice and returns commission', async () => {
    const { status, body } = await post('/submit-task', {
      username: TEST_USER,
      productPrice: 299.99,
    });
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(typeof body.commission).toBe('number');
    expect(body.commission).toBeGreaterThan(0);
    expect(typeof body.balance).toBe('number');
    expect(typeof body.tasksCompleted).toBe('number');
  });

  it('commission is never negative for any positive price', async () => {
    const { body } = await post('/submit-task', {
      username: TEST_USER,
      productPrice: 0.01,
    });
    if (body.success) {
      expect(body.commission).toBeGreaterThanOrEqual(0);
    }
  });
});

// ─── Task Records ─────────────────────────────────────────────────────────────

describe('GET /tasks/:username', () => {
  it('returns an array of task records', async () => {
    const { status, body } = await request(`/tasks/${TEST_USER}`);
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
  });

  it('each record has expected fields', async () => {
    const { body } = await request(`/tasks/${TEST_USER}`);
    if (body.length > 0) {
      const record = body[0];
      expect(typeof record.username).toBe('string');
      expect(typeof record.productPrice).toBe('number');
      expect(typeof record.commission).toBe('number');
      expect(typeof record.timestamp).toBe('string');
    }
  });
});

// ─── Support Links ────────────────────────────────────────────────────────────

describe('Support links', () => {
  it('GET /cs/support-links → 200 with correct shape', async () => {
    const { status, body } = await request('/cs/support-links');
    expect(status).toBe(200);
    expect(typeof body.whatsappNumber).toBe('string');
    expect(typeof body.telegramUsername).toBe('string');
    expect(typeof body.supportEmail).toBe('string');
  });

  it('POST /cs/support-links saves and GET retrieves the new values', async () => {
    const unique = `audit-${RUN_ID}@test.com`;
    const { status } = await post('/cs/support-links', {
      whatsappNumber: `1555${RUN_ID.toString().slice(-7)}`,
      telegramUsername: `auditbot_${RUN_ID}`,
      supportEmail: unique,
    });
    expect(status).toBe(200);

    const { body } = await request('/cs/support-links');
    expect(body.supportEmail).toBe(unique);
  });
});

// ─── Support Tickets ──────────────────────────────────────────────────────────

describe('Support tickets', () => {
  let createdTicketId: string;

  it('POST /cs/create-ticket returns 400 when required fields are missing', async () => {
    const { status } = await post('/cs/create-ticket', { username: TEST_USER });
    expect(status).toBe(400);
  });

  it('POST /cs/create-ticket creates a ticket and returns its id', async () => {
    const { status, body } = await post('/cs/create-ticket', {
      username: TEST_USER,
      subject: 'Audit test ticket',
      message: 'Automated integration test message',
      category: 'general',
      priority: 'low',
    });
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(typeof body.ticket.id).toBe('string');
    expect(body.ticket.status).toBe('open');
    createdTicketId = body.ticket.id;
  });

  it('GET /cs/tickets/:username returns the created ticket', async () => {
    const { status, body } = await request(`/cs/tickets/${TEST_USER}`);
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
    expect(body.some((t: { subject: string }) => t.subject === 'Audit test ticket')).toBe(true);
  });

  it('POST /cs/respond returns 400 when required fields are missing', async () => {
    const { status } = await post('/cs/respond', { ticketId: createdTicketId });
    expect(status).toBe(400);
  });

  it('POST /cs/respond adds a response to the ticket', async () => {
    const { status, body } = await post('/cs/respond', {
      ticketId: createdTicketId,
      message: 'Admin reply to audit ticket',
      respondedBy: 'admin',
      isAdmin: true,
    });
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.ticket.responses).toHaveLength(1);
  });

  it('POST /cs/update-status rejects invalid status strings', async () => {
    const { status } = await post('/cs/update-status', {
      ticketId: createdTicketId,
      status: 'hacked',
    });
    expect(status).toBe(400);
  });

  it('POST /cs/update-status accepts valid status values', async () => {
    for (const validStatus of ['in-progress', 'resolved', 'closed', 'open'] as const) {
      const { status } = await post('/cs/update-status', {
        ticketId: createdTicketId,
        status: validStatus,
      });
      expect(status).toBe(200);
    }
  });

  it('POST /cs/update-status returns 404 for non-existent ticket', async () => {
    const { status } = await post('/cs/update-status', {
      ticketId: 'ticket_nonexistent_abc',
      status: 'open',
    });
    expect(status).toBe(404);
  });
});

// ─── Live Chat ────────────────────────────────────────────────────────────────

describe('Live chat', () => {
  it('POST /cs/chat/send returns 400 when message is missing', async () => {
    const { status } = await post('/cs/chat/send', { username: TEST_USER });
    expect(status).toBe(400);
  });

  it('POST /cs/chat/send returns 400 when username is missing', async () => {
    const { status } = await post('/cs/chat/send', { message: 'hello' });
    expect(status).toBe(400);
  });

  it('POST /cs/chat/send sends a user message and returns it', async () => {
    const { status, body } = await post('/cs/chat/send', {
      username: TEST_USER,
      message: 'Integration test chat message',
    });
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message.message).toBe('Integration test chat message');
    expect(body.message.isAdmin).toBe(false);
    expect(typeof body.message.id).toBe('string');
    expect(body.message.read).toBe(false);
  });

  it('GET /cs/chat/:username returns an array of messages', async () => {
    const { status, body } = await request(`/cs/chat/${TEST_USER}`);
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });

  it('POST /cs/chat/mark-read returns 400 for an invalid viewer value', async () => {
    const { status } = await post('/cs/chat/mark-read', {
      username: TEST_USER,
      viewer: 'superadmin',
    });
    expect(status).toBe(400);
  });

  it('POST /cs/chat/mark-read returns 400 when username is missing', async () => {
    const { status } = await post('/cs/chat/mark-read', { viewer: 'user' });
    expect(status).toBe(400);
  });

  it('POST /cs/chat/mark-read viewer=user marks admin messages read', async () => {
    // First send an admin message
    await post('/cs/chat/send', { username: TEST_USER, message: 'Admin says hi', isAdmin: true });

    const { status, body } = await post('/cs/chat/mark-read', {
      username: TEST_USER,
      viewer: 'user',
    });
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(typeof body.updated).toBe('number');
  });

  it('POST /cs/chat/mark-read viewer=admin marks user messages read', async () => {
    const { status, body } = await post('/cs/chat/mark-read', {
      username: TEST_USER,
      viewer: 'admin',
    });
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });
});

// ─── Auth ─────────────────────────────────────────────────────────────────────

describe('Auth endpoints', () => {
  it('POST /auth/forgot-password returns 400 when email is missing', async () => {
    const { status } = await post('/auth/forgot-password', {});
    expect(status).toBe(400);
  });

  it('POST /auth/forgot-password does NOT leak _devToken in the response body', async () => {
    const { body } = await post('/auth/forgot-password', { email: `audit${RUN_ID}@example.com` });
    expect(body._devToken).toBeUndefined();
  });

  it('GET /auth/verify-reset-token/:token returns 400 for a bogus token', async () => {
    const { status, body } = await request('/auth/verify-reset-token/totally-fake-token-xyz');
    expect(status).toBe(400);
    expect(body.valid).toBe(false);
  });

  it('POST /auth/reset-password returns 400 when fields are missing', async () => {
    const { status } = await post('/auth/reset-password', { token: 'x' });
    expect(status).toBe(400);
  });

  it('POST /auth/reset-password rejects passwords shorter than 8 characters', async () => {
    const { status } = await post('/auth/reset-password', {
      token: 'fake_token',
      username: TEST_USER,
      newPassword: 'short',
    });
    expect(status).toBe(400);
  });

  it('POST /auth/change-password returns 400 when fields are missing', async () => {
    const { status } = await post('/auth/change-password', { username: TEST_USER });
    expect(status).toBe(400);
  });

  it('POST /auth/change-password rejects new passwords shorter than 8 characters', async () => {
    const { status } = await post('/auth/change-password', {
      username: TEST_USER,
      currentPassword: 'oldpassword',
      newPassword: 'abc',
    });
    expect(status).toBe(400);
  });

  it('POST /auth/reset-password returns 400 for an invalid/expired token', async () => {
    const { status } = await post('/auth/reset-password', {
      token: 'invalid_token_xyz',
      username: TEST_USER,
      newPassword: 'newpassword123',
    });
    expect(status).toBe(400);
  });
});

// ─── Admin auth enforcement (P1 security fix) ─────────────────────────────────

describe('Admin route authentication', () => {
  it('POST /admin/assign-premium-bundle → 401 without x-admin-secret', async () => {
    const { status } = await post('/admin/assign-premium-bundle', {
      username: TEST_USER,
      premiumProductValue: 500,
      bundledProductCount: 1,
    });
    expect(status).toBe(401);
  });

  it('DELETE /admin/cancel-premium/:username/:id → 401 without x-admin-secret', async () => {
    const { status } = await request(
      `/admin/cancel-premium/${TEST_USER}/premium-fake`,
      { method: 'DELETE' },
    );
    expect(status).toBe(401);
  });

  it('GET /cs/admin/tickets → 401 without x-admin-secret', async () => {
    const { status } = await request('/cs/admin/tickets');
    expect(status).toBe(401);
  });

  it('GET /cs/admin/chats → 401 without x-admin-secret', async () => {
    const { status } = await request('/cs/admin/chats');
    expect(status).toBe(401);
  });

  it('GET /cs/admin/tickets → 401 with a wrong secret', async () => {
    const { status } = await request('/cs/admin/tickets', {
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': 'wrong-secret' },
    });
    expect(status).toBe(401);
  });
});
