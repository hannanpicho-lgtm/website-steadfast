import { projectId } from '@utils/supabase/info';
import { buildPublicApiHeaders } from './publicApi';
import { buildAdminAuthHeaders } from './supabaseAuth';

const SERVER_URL = `https://${projectId}.supabase.co/functions/v1/make-server-a1c55d7e`;

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