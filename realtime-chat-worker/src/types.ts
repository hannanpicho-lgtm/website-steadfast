export type ChatRole = 'user' | 'admin' | 'system';

export interface ChatMessagePayload {
  conversationId: string;
  senderRole: ChatRole;
  senderId: string;
  body: string;
  attachments?: Array<{
    type: string;
    url: string;
    name?: string;
  }>;
}

export interface PresencePayload {
  conversationId: string;
  actorId: string;
  actorRole: 'user' | 'admin';
  state: 'online' | 'offline';
}

export interface TypingPayload {
  conversationId: string;
  actorId: string;
  actorRole: 'user' | 'admin';
  isTyping: boolean;
}

export interface ConversationPatchPayload {
  assignedAgent?: string | null;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  tags?: string[];
  slaDueAt?: string | null;
  status?: 'open' | 'pending' | 'resolved' | 'closed';
}

export interface Env {
  CHAT_DO: DurableObjectNamespace;
  CHAT_DB: D1Database;
  CHAT_AUTH_TOKEN?: string;
  SUPABASE_JWT_SECRET?: string;
  ADMIN_ROLE_NAMES?: string;
  USER_ROLE_NAMES?: string;
  SLA_BREACH_MINUTES?: string;
  MAX_RETRY_ATTEMPTS?: string;
  CHAT_REQUIRE_USER_JWT?: string;
}

export interface AuthPrincipal {
  id: string;
  role: 'admin' | 'user';
  username?: string;
  rawRoles: string[];
}
