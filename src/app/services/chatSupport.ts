import { projectId } from '@utils/supabase/info';
import { buildPublicApiHeaders } from './publicApi';
import { buildAdminAuthHeaders } from './supabaseAuth';
import { getSessionUsername } from './serverAuth';

const SERVER_URL = `https://${projectId}.supabase.co/functions/v1/make-server-a1c55d7e`;
const REALTIME_CHAT_URL = (import.meta.env.VITE_CHAT_REALTIME_URL as string | undefined)?.trim() ?? '';
const REALTIME_CHAT_TOKEN = (import.meta.env.VITE_CHAT_REALTIME_TOKEN as string | undefined)?.trim() ?? '';
const REALTIME_CHAT_FLAG = String(import.meta.env.VITE_CHAT_REALTIME_ENABLED ?? '').toLowerCase();

export type ChatAttachmentType = 'image' | 'video' | 'audio' | 'file';

export type ChatAttachment = {
  type: ChatAttachmentType;
  dataUrl: string;
  name: string;
  mimeType: string;
  size: number;
};

export type ChatMessage = {
  id: string;
  message: string;
  sender: string;
  isAdmin: boolean;
  timestamp: string;
  read: boolean;
  deliveredAt?: string;
};

export type ChatResponseState = 'idle' | 'awaiting-support' | 'support-replied';

export type RealtimeChatEvent =
  | {
      type: 'message';
      id: string;
      sequence: number;
      conversationId: string;
      senderRole: 'user' | 'admin' | 'system';
      senderId: string;
      body: string;
      createdAt: string;
    }
  | {
      type: 'typing';
      conversationId: string;
      actorId: string;
      actorRole: 'user' | 'admin';
      isTyping: boolean;
    }
  | {
      type: 'presence';
      conversationId?: string;
      actorId: string;
      actorRole: 'user' | 'admin';
      state: 'online' | 'offline';
    };

export type ChatThreadSummary = {
  username: string;
  lastMessage: string;
  lastMessagePreview: string;
  lastMessageTime: string;
  unreadCount: number;
  totalMessages: number;
  pendingUserMessages: number;
  unreadAdminCount: number;
  lastSenderRole: 'user' | 'admin' | 'system';
  latestUserMessageAt: string | null;
  latestAdminMessageAt: string | null;
  responseState: ChatResponseState;
  averageAdminResponseMs: number | null;
  lastMessageAttachmentType: ChatAttachmentType | null;
};

export const CHAT_IMAGE_PREFIX = '__img__:';
export const CHAT_ATTACHMENT_PREFIX = '__att__:';
export const CHAT_ATTACHMENT_PREFIX_LEGACY = '__att_:';
export const MAX_CHAT_ATTACHMENT_SIZE_BYTES = 250 * 1024;

function isChatAttachmentType(value: unknown): value is ChatAttachmentType {
  return value === 'image' || value === 'video' || value === 'audio' || value === 'file';
}

export function getAttachmentType(file: File): ChatAttachmentType {
  if (file.type.startsWith('image/')) {
    return 'image';
  }
  if (file.type.startsWith('video/')) {
    return 'video';
  }
  if (file.type.startsWith('audio/')) {
    return 'audio';
  }
  return 'file';
}

export function buildAttachmentLabel(type: ChatAttachmentType) {
  switch (type) {
    case 'image':
      return 'Image';
    case 'video':
      return 'Video';
    case 'audio':
      return 'Audio';
    default:
      return 'File';
  }
}

export function downloadAttachment(attachment: ChatAttachment) {
  const link = document.createElement('a');
  link.href = attachment.dataUrl;
  link.download = attachment.name || `attachment-${Date.now()}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function decodeChatMessage(rawMessage: string): { text: string; attachment: ChatAttachment | null } {
  const isAttachmentPayload = rawMessage.startsWith(CHAT_ATTACHMENT_PREFIX) || rawMessage.startsWith(CHAT_ATTACHMENT_PREFIX_LEGACY);
  if (isAttachmentPayload) {
    try {
      const payloadString = rawMessage.startsWith(CHAT_ATTACHMENT_PREFIX)
        ? rawMessage.slice(CHAT_ATTACHMENT_PREFIX.length)
        : rawMessage.slice(CHAT_ATTACHMENT_PREFIX_LEGACY.length);
      const payload = JSON.parse(payloadString) as {
        text?: string;
        attachment?: Record<string, unknown>;
      };
      const candidateAttachment = payload.attachment;
      const normalizedAttachment: ChatAttachment | null = candidateAttachment
        && typeof candidateAttachment === 'object'
        && typeof candidateAttachment.dataUrl === 'string'
        && isChatAttachmentType(candidateAttachment.type)
        ? {
          type: candidateAttachment.type as ChatAttachmentType,
            dataUrl: candidateAttachment.dataUrl,
            name: typeof candidateAttachment.name === 'string' ? candidateAttachment.name : 'attachment',
            mimeType: typeof candidateAttachment.mimeType === 'string' ? candidateAttachment.mimeType : '',
            size: Number.isFinite(Number(candidateAttachment.size)) ? Number(candidateAttachment.size) : 0,
          }
        : null;

      return {
        text: typeof payload.text === 'string' ? payload.text : '',
        attachment: normalizedAttachment,
      };
    } catch {
      return {
        text: 'Attachment could not be previewed. Please resend a smaller file.',
        attachment: null,
      };
    }
  }

  if (!rawMessage.startsWith(CHAT_IMAGE_PREFIX)) {
    return { text: rawMessage, attachment: null };
  }

  const payload = rawMessage.slice(CHAT_IMAGE_PREFIX.length);
  const newlineIndex = payload.indexOf('\n');
  if (newlineIndex === -1) {
    return {
      text: '',
      attachment: {
        type: 'image' as const,
        dataUrl: payload.trim(),
        name: 'chat-image',
        mimeType: 'image/*',
        size: 0,
      },
    };
  }

  return {
    text: payload.slice(newlineIndex + 1),
    attachment: {
      type: 'image' as const,
      dataUrl: payload.slice(0, newlineIndex).trim(),
      name: 'chat-image',
      mimeType: 'image/*',
      size: 0,
    },
  };
}

export function buildChatPreview(rawMessage: string) {
  const decoded = decodeChatMessage(rawMessage);
  if (decoded.attachment) {
    const prefix = `[${buildAttachmentLabel(decoded.attachment.type)}]`;
    return decoded.text ? `${prefix} ${decoded.text}` : prefix;
  }

  const text = decoded.text.trim();
  if (!text) {
    return 'New message';
  }
  return text;
}

export function encodeChatMessage(text: string, attachment: ChatAttachment | null) {
  if (!attachment) {
    return text;
  }

  return `${CHAT_ATTACHMENT_PREFIX}${JSON.stringify({ text, attachment })}`;
}

export function formatChatResponseTime(value: number | null) {
  if (!Number.isFinite(Number(value)) || value === null || value < 0) {
    return 'Pending';
  }

  const totalSeconds = Math.round(value / 1000);
  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }

  const totalMinutes = Math.round(totalSeconds / 60);
  if (totalMinutes < 60) {
    return `${totalMinutes}m`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

async function parseJsonResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMessage = typeof (payload as { error?: unknown })?.error === 'string'
      ? String((payload as { error?: string }).error)
      : fallbackMessage;
    throw new Error(errorMessage);
  }

  return payload as T;
}

export async function fetchUserChatMessages(username: string): Promise<ChatMessage[]> {
  const response = await fetch(`${SERVER_URL}/cs/chat/${username}`, {
    credentials: 'include',
    headers: buildPublicApiHeaders(),
  });

  const payload = await parseJsonResponse<unknown>(response, 'Failed to fetch chat messages');
  return Array.isArray(payload) ? payload as ChatMessage[] : [];
}

export async function fetchUserChatSummary(): Promise<ChatThreadSummary> {
  const response = await fetch(`${SERVER_URL}/me/chat/summary`, {
    credentials: 'include',
    headers: buildPublicApiHeaders(),
  });

  return parseJsonResponse<ChatThreadSummary>(response, 'Failed to fetch chat summary');
}

export async function sendUserChatMessage(message: string): Promise<ChatMessage> {
  const response = await fetch(`${SERVER_URL}/cs/chat/send`, {
    method: 'POST',
    credentials: 'include',
    headers: buildPublicApiHeaders(true),
    body: JSON.stringify({ message, isAdmin: false }),
  });

  const payload = await parseJsonResponse<{ success: boolean; message: ChatMessage }>(response, 'Failed to send chat message');
  return payload.message;
}

export async function markUserChatRead(): Promise<number> {
  const response = await fetch(`${SERVER_URL}/cs/chat/mark-read`, {
    method: 'POST',
    credentials: 'include',
    headers: buildPublicApiHeaders(true),
    body: JSON.stringify({ viewer: 'user' }),
  });

  const payload = await parseJsonResponse<{ success: boolean; updated: number }>(response, 'Failed to mark chat as read');
  return Number(payload.updated ?? 0);
}

export async function fetchAdminChatSummaries(): Promise<ChatThreadSummary[]> {
  const response = await fetch(`${SERVER_URL}/cs/admin/chats`, {
    headers: await buildAdminAuthHeaders(false),
  });

  const payload = await parseJsonResponse<unknown>(response, 'Failed to fetch admin chats');
  return Array.isArray(payload) ? payload as ChatThreadSummary[] : [];
}

export async function fetchAdminChatMessages(username: string): Promise<ChatMessage[]> {
  const response = await fetch(`${SERVER_URL}/cs/chat/${username}`, {
    headers: await buildAdminAuthHeaders(false),
  });

  const payload = await parseJsonResponse<unknown>(response, 'Failed to fetch admin chat thread');
  return Array.isArray(payload) ? payload as ChatMessage[] : [];
}

export async function sendAdminChatMessage(username: string, message: string): Promise<ChatMessage> {
  const response = await fetch(`${SERVER_URL}/cs/chat/send`, {
    method: 'POST',
    headers: await buildAdminAuthHeaders(),
    body: JSON.stringify({
      username,
      message,
      isAdmin: true,
    }),
  });

  const payload = await parseJsonResponse<{ success: boolean; message: ChatMessage }>(response, 'Failed to send admin chat message');
  return payload.message;
}

export async function markAdminChatRead(username: string): Promise<number> {
  const response = await fetch(`${SERVER_URL}/cs/chat/mark-read`, {
    method: 'POST',
    headers: await buildAdminAuthHeaders(),
    body: JSON.stringify({ username, viewer: 'admin' }),
  });

  const payload = await parseJsonResponse<{ success: boolean; updated: number }>(response, 'Failed to mark admin chat as read');
  return Number(payload.updated ?? 0);
}

function resolveRealtimeHttpUrl(path: string) {
  if (!REALTIME_CHAT_URL) {
    return '';
  }
  return `${REALTIME_CHAT_URL.replace(/\/$/, '')}${path}`;
}

export function isRealtimeChatEnabled() {
  return Boolean(REALTIME_CHAT_URL) && (REALTIME_CHAT_FLAG === '1' || REALTIME_CHAT_FLAG === 'true' || REALTIME_CHAT_FLAG === 'yes');
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split('.');
  if (parts.length < 2) {
    return {};
  }
  try {
    const value = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = value + '='.repeat((4 - (value.length % 4)) % 4);
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function buildRealtimeAdminIdentityHeaders(contentType = false): Promise<Record<string, string>> {
  const headers = await buildAdminAuthHeaders(contentType);
  const jwt = headers['x-user-jwt'] || '';
  const payload = jwt ? decodeJwtPayload(jwt) : {};
  const userMetadata = payload.user_metadata && typeof payload.user_metadata === 'object'
    ? (payload.user_metadata as Record<string, unknown>)
    : null;
  const adminId =
    (typeof payload.sub === 'string' && payload.sub)
    || (typeof payload.email === 'string' && payload.email)
    || (userMetadata && typeof userMetadata.username === 'string' ? userMetadata.username : '')
    || '';

  if (!adminId) {
    throw new Error('Unable to resolve authenticated admin identity for realtime chat');
  }

  return {
    ...headers,
    ...(REALTIME_CHAT_TOKEN ? { authorization: `Bearer ${REALTIME_CHAT_TOKEN}` } : {}),
    'x-chat-role': 'admin',
    'x-chat-admin-id': adminId,
  };
}

export async function openRealtimeChatSocket(params: {
  conversationId: string;
  actorId: string;
  actorRole: 'user' | 'admin';
  onEvent: (event: RealtimeChatEvent) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: () => void;
}): Promise<WebSocket | null> {
  if (!isRealtimeChatEnabled()) {
    return null;
  }

  const ticket = await fetchRealtimeSocketTicket(params.conversationId, params.actorRole, params.actorId);
  if (!ticket?.ticket) {
    throw new Error('Failed to acquire websocket ticket');
  }

  const base = REALTIME_CHAT_URL.replace(/\/$/, '');
  const wsBase = base.replace(/^http/i, 'ws');
  const query = new URLSearchParams({
    conversationId: params.conversationId,
    ticket: ticket.ticket,
  });

  const ws = new WebSocket(`${wsBase}/chat/ws?${query.toString()}`);
  ws.onopen = () => params.onOpen?.();
  ws.onclose = () => params.onClose?.();
  ws.onerror = () => params.onError?.();
  ws.onmessage = (event) => {
    try {
      const parsed = JSON.parse(event.data) as RealtimeChatEvent;
      params.onEvent(parsed);
    } catch {
      // Ignore malformed socket events and keep stream alive.
    }
  };

  return ws;
}

async function realtimeJsonFetch<T>(url: string, init: RequestInit, fallbackMessage: string): Promise<T> {
  const response = await fetch(url, init);
  return parseJsonResponse<T>(response, fallbackMessage);
}

export async function sendRealtimeUserChatMessage(conversationId: string, senderId: string, body: string) {
  const url = resolveRealtimeHttpUrl('/chat/message');
  if (!url) {
    throw new Error('Realtime chat URL is not configured');
  }

  const sessionUsername = getSessionUsername() || senderId;
  return realtimeJsonFetch<{ ok: true; id: string; sequence: number }>(
    url,
    {
      method: 'POST',
      credentials: 'include',
      headers: {
        ...buildPublicApiHeaders(true),
        ...(REALTIME_CHAT_TOKEN ? { authorization: `Bearer ${REALTIME_CHAT_TOKEN}` } : {}),
        'x-chat-role': 'user',
        'x-chat-user-id': sessionUsername,
        'x-session-username': sessionUsername,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        conversationId,
        username: sessionUsername,
        senderRole: 'user',
        senderId: sessionUsername,
        body,
      }),
    },
    'Failed to send realtime chat message',
  );
}

export async function sendRealtimeTyping(conversationId: string, actorId: string, actorRole: 'user' | 'admin', isTyping: boolean) {
  const url = resolveRealtimeHttpUrl('/chat/typing');
  if (!url) {
    return;
  }

  if (actorRole === 'admin') {
    const adminHeaders = await buildRealtimeAdminIdentityHeaders(true);
    await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: {
        ...adminHeaders,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ conversationId, actorId: adminHeaders['x-chat-admin-id'], actorRole, isTyping }),
    });
    return;
  }

  const sessionUsername = getSessionUsername() || actorId;
  await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: {
      ...(REALTIME_CHAT_TOKEN ? { authorization: `Bearer ${REALTIME_CHAT_TOKEN}` } : {}),
      'x-chat-role': 'user',
      'x-chat-user-id': sessionUsername,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ conversationId, actorId: sessionUsername, actorRole: 'user', isTyping }),
  });
}

export async function fetchRealtimeAdminConversations() {
  const url = resolveRealtimeHttpUrl('/admin/conversations');
  if (!url) {
    throw new Error('Realtime chat URL is not configured');
  }

  const headers = await buildRealtimeAdminIdentityHeaders(false);
  return realtimeJsonFetch<{ conversations: unknown[] }>(
    url,
    {
      headers: {
        ...headers,
      },
    },
    'Failed to fetch realtime conversations',
  );
}

export async function patchRealtimeConversation(conversationId: string, patch: {
  assignedAgent?: string | null;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  tags?: string[];
  slaDueAt?: string | null;
  status?: 'open' | 'pending' | 'resolved' | 'closed';
}) {
  const url = resolveRealtimeHttpUrl(`/admin/conversations/${encodeURIComponent(conversationId)}`);
  if (!url) {
    throw new Error('Realtime chat URL is not configured');
  }

  const headers = await buildAdminAuthHeaders();
  const identityHeaders = await buildRealtimeAdminIdentityHeaders(true);
  return realtimeJsonFetch<{ ok: true }>(
    url,
    {
      method: 'PATCH',
      headers: {
        ...headers,
        ...identityHeaders,
        'content-type': 'application/json',
      },
      body: JSON.stringify(patch),
    },
    'Failed to update realtime conversation',
  );
}

export async function fetchRealtimeMetricsSummary() {
  const url = resolveRealtimeHttpUrl('/admin/metrics/summary');
  if (!url) {
    throw new Error('Realtime chat URL is not configured');
  }

  const headers = await buildRealtimeAdminIdentityHeaders(false);
  return realtimeJsonFetch<{
    metrics: unknown;
    recentFailures: unknown[];
    activeConversations: number;
    openLoadByPriority: unknown[];
    slaBreaches: number;
  }>(
    url,
    {
      headers: {
        ...headers,
      },
    },
    'Failed to fetch realtime metrics',
  );
}

export async function fetchRealtimeConversationTimeline(conversationId: string) {
  const url = resolveRealtimeHttpUrl(`/admin/conversations/${encodeURIComponent(conversationId)}`);
  if (!url) {
    throw new Error('Realtime chat URL is not configured');
  }

  const headers = await buildRealtimeAdminIdentityHeaders(false);
  return realtimeJsonFetch<{ conversationId: string; messages: unknown[] }>(
    url,
    {
      headers: {
        ...headers,
      },
    },
    'Failed to fetch realtime conversation timeline',
  );
}

export async function sendRealtimeAdminChatMessage(conversationId: string, body: string) {
  const url = resolveRealtimeHttpUrl('/chat/message');
  if (!url) {
    throw new Error('Realtime chat URL is not configured');
  }

  const headers = await buildRealtimeAdminIdentityHeaders(true);
  return realtimeJsonFetch<{ ok: true; id: string; sequence: number }>(
    url,
    {
      method: 'POST',
      headers: {
        ...headers,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        conversationId,
        senderRole: 'admin',
        senderId: headers['x-chat-admin-id'],
        body,
      }),
    },
    'Failed to send realtime admin chat message',
  );
}

export async function fetchRealtimeSocketTicket(conversationId: string, actorRole: 'user' | 'admin', actorId: string) {
  const url = resolveRealtimeHttpUrl('/chat/ws-ticket');
  if (!url) {
    throw new Error('Realtime chat URL is not configured');
  }

  if (actorRole === 'admin') {
    const headers = await buildRealtimeAdminIdentityHeaders(true);
    return realtimeJsonFetch<{ ticket: string; expiresAt: string; conversationId: string }>(
      url,
      {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({ conversationId }),
      },
      'Failed to issue admin websocket ticket',
    );
  }

  const sessionUsername = getSessionUsername() || actorId;
  return realtimeJsonFetch<{ ticket: string; expiresAt: string; conversationId: string }>(
    url,
    {
      method: 'POST',
      credentials: 'include',
      headers: {
        ...buildPublicApiHeaders(true),
        ...(REALTIME_CHAT_TOKEN ? { authorization: `Bearer ${REALTIME_CHAT_TOKEN}` } : {}),
        'x-chat-role': 'user',
        'x-chat-user-id': sessionUsername,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ conversationId }),
    },
    'Failed to issue user websocket ticket',
  );
}