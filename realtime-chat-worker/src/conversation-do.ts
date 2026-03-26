import type { ChatMessagePayload, Env, PresencePayload, TypingPayload } from './types';
import { logEvent, nowIso, randomId } from './utils';

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
    this.sequence += 1;
    await this.state.storage.put('sequence', this.sequence);

    const messageId = randomId('msg');
    const createdAt = nowIso();

    await this.env.CHAT_DB.prepare(
      `INSERT INTO chat_messages
        (id, conversation_id, sequence, sender_role, sender_id, body, attachment_json, created_at, delivered_at, latency_ms, read_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
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
        Date.now() - start,
      )
      .run();

    await this.env.CHAT_DB.prepare(
      `UPDATE chat_conversations
       SET last_message_at = ?, updated_at = ?
       WHERE id = ?`,
    )
      .bind(createdAt, createdAt, payload.conversationId)
      .run();

    this.broadcast({
      type: 'message',
      id: messageId,
      sequence: this.sequence,
      createdAt,
      ...payload,
    });

    await logEvent(this.env, {
      conversationId: payload.conversationId,
      eventType: 'message.sent',
      actorId: payload.senderId,
      actorRole: payload.senderRole,
      durationMs: Date.now() - start,
      success: true,
    });

    return new Response(JSON.stringify({ ok: true, id: messageId, sequence: this.sequence }), {
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

  private broadcast(payload: unknown): void {
    const text = JSON.stringify(payload);
    for (const client of this.clients) {
      try {
        client.ws.send(text);
      } catch {
        this.clients.delete(client);
      }
    }
  }
}
