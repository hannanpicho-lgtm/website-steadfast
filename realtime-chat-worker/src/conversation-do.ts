import type { ChatMessagePayload, Env, PresencePayload, TypingPayload } from './types';
import { getMaxRetryAttempts, logEvent, nowIso, randomId } from './utils';

interface SocketClient {
  ws: WebSocket;
  actorId: string;
  actorRole: 'user' | 'admin';
}

export class ConversationDurableObject {
  private readonly state: DurableObjectState;
  private readonly env: Env;
  private sequence = 0;
  private clients = new Set<SocketClient>();

  private async ensureSequenceInitialized(conversationId: string): Promise<void> {
    if (this.sequence > 0) {
      return;
    }

    const storedSequence = await this.state.storage.get<number>('sequence');
    if (storedSequence && storedSequence > 0) {
      this.sequence = storedSequence;
      return;
    }

    const row = await this.env.CHAT_DB.prepare(
      `SELECT MAX(sequence) AS max_sequence FROM chat_messages WHERE conversation_id = ?`,
    )
      .bind(conversationId)
      .first<{ max_sequence?: number }>();
    this.sequence = Number(row?.max_sequence ?? 0);
    await this.state.storage.put('sequence', this.sequence);
  }

  private async insertDeliveryFailure(params: {
    conversationId: string;
    messageId?: string;
    reason: string;
    retryCount: number;
    dropped: boolean;
  }): Promise<void> {
    await this.env.CHAT_DB.prepare(
      `INSERT INTO chat_delivery_failures
       (id, conversation_id, message_id, reason, retry_count, dropped, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        randomId('fail'),
        params.conversationId,
        params.messageId ?? null,
        params.reason,
        params.retryCount,
        params.dropped ? 1 : 0,
        nowIso(),
      )
      .run();
  }

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
    this.state.blockConcurrencyWhile(async () => {
      const seq = await this.state.storage.get<number>('sequence');
      this.sequence = seq ?? 0;
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.endsWith('/ws') && request.headers.get('upgrade') === 'websocket') {
      return this.handleWebSocket(request);
    }

    if (request.method === 'POST' && url.pathname.endsWith('/message')) {
      const payload = (await request.json()) as ChatMessagePayload;
      return this.handleMessage(payload);
    }

    if (request.method === 'POST' && url.pathname.endsWith('/typing')) {
      const payload = (await request.json()) as TypingPayload;
      this.broadcast({ type: 'typing', ...payload });
      return new Response(null, { status: 204 });
    }

    if (request.method === 'POST' && url.pathname.endsWith('/presence')) {
      const payload = (await request.json()) as PresencePayload;
      this.broadcast({ type: 'presence', ...payload });
      return new Response(null, { status: 204 });
    }

    return new Response('Not found', { status: 404 });
  }

  private async handleMessage(payload: ChatMessagePayload): Promise<Response> {
    const start = Date.now();
    await this.ensureSequenceInitialized(payload.conversationId);
    this.sequence += 1;
    await this.state.storage.put('sequence', this.sequence);

    const messageId = randomId('msg');
    const createdAt = nowIso();
    const maxRetries = getMaxRetryAttempts(this.env);
    let finalLatency = Date.now() - start;
    let lastError: unknown = null;
    let retryCount = 0;
    while (retryCount <= maxRetries) {
      try {
        finalLatency = Date.now() - start;
        await this.env.CHAT_DB.prepare(
          `INSERT INTO chat_messages
            (id, conversation_id, sequence, sender_role, sender_id, body, attachment_json, created_at, delivered_at, latency_ms, read_at, retry_count, delivery_failed, delayed_delivery)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, 0, ?)`,
        )
          .bind(
            messageId,
            payload.conversationId,
            this.sequence,
            payload.senderRole,
            payload.senderId,
            payload.body,
            payload.attachments ? JSON.stringify(payload.attachments) : null,
            createdAt,
            createdAt,
            finalLatency,
            retryCount,
            finalLatency > 2000 ? 1 : 0,
          )
          .run();

        if (retryCount > 0) {
          await logEvent(this.env, {
            conversationId: payload.conversationId,
            eventType: 'message.retry',
            actorId: payload.senderId,
            actorRole: payload.senderRole,
            payloadJson: JSON.stringify({ retryCount }),
            durationMs: finalLatency,
            success: true,
          });
        }
        break;
      } catch (error) {
        lastError = error;
        retryCount += 1;
        if (retryCount > maxRetries) {
          await this.insertDeliveryFailure({
            conversationId: payload.conversationId,
            messageId,
            reason: String(error),
            retryCount: retryCount - 1,
            dropped: true,
          });
          await logEvent(this.env, {
            conversationId: payload.conversationId,
            eventType: 'message.delivery.failed',
            actorId: payload.senderId,
            actorRole: payload.senderRole,
            payloadJson: JSON.stringify({ error: String(error), retries: retryCount - 1 }),
            durationMs: Date.now() - start,
            success: false,
          });
          return new Response(
            JSON.stringify({ ok: false, error: 'Message delivery failed after retries' }),
            { status: 500, headers: { 'content-type': 'application/json; charset=utf-8' } },
          );
        }
      }
    }

    if (lastError && retryCount > 0) {
      await this.insertDeliveryFailure({
        conversationId: payload.conversationId,
        messageId,
        reason: String(lastError),
        retryCount,
        dropped: false,
      });
    }

    await this.env.CHAT_DB.prepare(
      `UPDATE chat_conversations
       SET last_message_at = ?, updated_at = ?
       WHERE id = ?`,
    )
      .bind(createdAt, createdAt, payload.conversationId)
      .run();

    const failedSockets = this.broadcast({
      type: 'message',
      id: messageId,
      sequence: this.sequence,
      createdAt,
      ...payload,
    });

    if (finalLatency > 2000) {
      await logEvent(this.env, {
        conversationId: payload.conversationId,
        eventType: 'message.delayed',
        actorId: payload.senderId,
        actorRole: payload.senderRole,
        durationMs: finalLatency,
        success: true,
      });
    }

    if (failedSockets > 0) {
      await logEvent(this.env, {
        conversationId: payload.conversationId,
        eventType: 'socket.broadcast.dropped',
        actorId: payload.senderId,
        actorRole: payload.senderRole,
        payloadJson: JSON.stringify({ failedSockets }),
        success: false,
      });
    }

    await logEvent(this.env, {
      conversationId: payload.conversationId,
      eventType: 'message.sent',
      actorId: payload.senderId,
      actorRole: payload.senderRole,
      durationMs: finalLatency,
      success: true,
    });

    return new Response(JSON.stringify({ ok: true, id: messageId, sequence: this.sequence, retryCount, latencyMs: finalLatency }), {
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
  }

  private async handleWebSocket(request: Request): Promise<Response> {
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    server.accept();

    const actorId = request.headers.get('x-chat-actor-id') || 'unknown';
    const actorRole = (request.headers.get('x-chat-actor-role') as 'user' | 'admin') || 'user';

    const clientRecord: SocketClient = { ws: server, actorId, actorRole };
    this.clients.add(clientRecord);

    server.addEventListener('close', () => {
      this.clients.delete(clientRecord);
      this.broadcast({
        type: 'presence',
        actorId,
        actorRole,
        state: 'offline',
      });
    });

    server.addEventListener('message', (evt: MessageEvent) => {
      try {
        const data = JSON.parse(String(evt.data));
        if (data?.type === 'typing') {
          this.broadcast({
            type: 'typing',
            actorId,
            actorRole,
            isTyping: Boolean(data.isTyping),
          });
        }
      } catch {
        // Ignore malformed payloads.
      }
    });

    this.broadcast({ type: 'presence', actorId, actorRole, state: 'online' });

    return new Response(null, {
      status: 101,
      webSocket: client,
    } as WorkerResponseInit);
  }

  private broadcast(payload: unknown): number {
    const text = JSON.stringify(payload);
    let failures = 0;
    for (const client of this.clients) {
      try {
        client.ws.send(text);
      } catch {
        this.clients.delete(client);
        failures += 1;
      }
    }
    return failures;
  }
}
