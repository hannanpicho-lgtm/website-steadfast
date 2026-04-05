import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { projectId } from '@utils/supabase/info';
import { handleAdminAuthError } from '../../services/adminAuthError';
import { 
  MessageSquare, 
  Send, 
  Loader2,
  CheckCircle,
  Clock,
  Search,
  X,
  Paperclip,
  Download,
  FileText,
  Image as ImageIcon,
  Video,
  Music2
} from 'lucide-react';
import { buildAdminAuthHeaders } from '../../services/supabaseAuth';
import {
  fetchRealtimeAdminConversations,
  fetchRealtimeConversationTimeline,
  fetchRealtimeMetricsSummary,
  formatChatResponseTime,
  isRealtimeChatEnabled,
  patchRealtimeConversation,
  sendRealtimeAdminChatMessage,
} from '../../services/chatSupport';
import React from 'react';

interface ChatMessage {
  id: string;
  message: string;
  sender: string;
  isAdmin: boolean;
  timestamp: string;
  read: boolean;
}

interface ChatSummary {
  username: string;
  conversationId?: string;
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
  responseState: 'idle' | 'awaiting-support' | 'support-replied';
  averageAdminResponseMs: number | null;
  lastMessageAttachmentType: ChatAttachmentType | null;
  assignedAgent?: string | null;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  tags?: string[];
  slaDueAt?: string | null;
  status?: 'open' | 'pending' | 'resolved' | 'closed';
  overdue?: boolean;
}

type RealtimeMetricsSummary = {
  metrics?: {
    total_events?: number;
    success_events?: number;
    avg_duration_ms?: number;
    retry_count?: number;
    failed_deliveries?: number;
    delayed_messages?: number;
  };
  recentFailures?: Array<{
    event_type?: string;
    actor_role?: string;
    created_at?: string;
  }>;
  activeConversations?: number;
  openLoadByPriority?: Array<{ priority?: string; count?: number }>;
  slaBreaches?: number;
};

type ChatAttachmentType = 'image' | 'video' | 'audio' | 'file';

type ChatAttachment = {
  type: ChatAttachmentType;
  dataUrl: string;
  name: string;
  mimeType: string;
  size: number;
};

const CHAT_IMAGE_PREFIX = '__img__:';
const CHAT_ATTACHMENT_PREFIX = '__att__:';
const CHAT_ATTACHMENT_PREFIX_LEGACY = '__att_:';
const MAX_CHAT_ATTACHMENT_SIZE_BYTES = 250 * 1024;

function isChatAttachmentType(value: unknown): value is ChatAttachmentType {
  return value === 'image' || value === 'video' || value === 'audio' || value === 'file';
}

function getAttachmentType(file: File): ChatAttachmentType {
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

function buildAttachmentLabel(type: ChatAttachmentType) {
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

function downloadAttachment(attachment: ChatAttachment) {
  const link = document.createElement('a');
  link.href = attachment.dataUrl;
  link.download = attachment.name || `attachment-${Date.now()}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function decodeChatMessage(rawMessage: string) {
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
            type: candidateAttachment.type,
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
        text: 'Attachment could not be previewed. Ask user to resend a smaller file.',
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
        type: 'image',
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
      type: 'image',
      dataUrl: payload.slice(0, newlineIndex).trim(),
      name: 'chat-image',
      mimeType: 'image/*',
      size: 0,
    },
  };
}

function encodeChatMessage(text: string, attachment: ChatAttachment | null) {
  if (!attachment) {
    return text;
  }

  return `${CHAT_ATTACHMENT_PREFIX}${JSON.stringify({ text, attachment })}`;
}

function mapRealtimeConversation(raw: Record<string, unknown>): ChatSummary {
  const username = typeof raw.username === 'string' ? raw.username : '';
  const lastMessageTime = typeof raw.last_message_at === 'string' ? raw.last_message_at : (typeof raw.created_at === 'string' ? raw.created_at : new Date().toISOString());
  return {
    username,
    conversationId: typeof raw.id === 'string' ? raw.id : username,
    lastMessage: '',
    lastMessagePreview: '',
    lastMessageTime,
    unreadCount: 0,
    totalMessages: 0,
    pendingUserMessages: 0,
    unreadAdminCount: 0,
    lastSenderRole: 'system',
    latestUserMessageAt: typeof raw.last_message_at === 'string' ? raw.last_message_at : null,
    latestAdminMessageAt: typeof raw.last_response_at === 'string' ? raw.last_response_at : null,
    responseState: 'idle',
    averageAdminResponseMs: null,
    lastMessageAttachmentType: null,
    assignedAgent: typeof raw.assigned_agent === 'string' ? raw.assigned_agent : null,
    priority: (typeof raw.priority === 'string' ? raw.priority : 'normal') as ChatSummary['priority'],
    tags: (() => {
      if (Array.isArray(raw.tags_json)) {
        return raw.tags_json.filter((value): value is string => typeof value === 'string');
      }
      if (typeof raw.tags_json === 'string') {
        try {
          const parsed = JSON.parse(raw.tags_json) as unknown;
          return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : [];
        } catch {
          return [];
        }
      }
      return [];
    })(),
    slaDueAt: typeof raw.sla_due_at === 'string' ? raw.sla_due_at : null,
    status: (typeof raw.status === 'string' ? raw.status : 'open') as ChatSummary['status'],
    overdue: Number(raw.overdue ?? 0) > 0,
  };
}

function mapRealtimeMessage(raw: Record<string, unknown>): ChatMessage {
  return {
    id: typeof raw.id === 'string' ? raw.id : crypto.randomUUID(),
    message: typeof raw.body === 'string' ? raw.body : '',
    sender: typeof raw.sender_id === 'string' ? raw.sender_id : 'unknown',
    isAdmin: raw.sender_role === 'admin',
    timestamp: typeof raw.created_at === 'string' ? raw.created_at : new Date().toISOString(),
    read: Boolean(raw.read_at),
  };
}

export default function LiveChatAdmin() {
  const navigate = useNavigate();
  const adminAuthRedirectedRef = useRef(false);
  const hasLoadedChatsRef = useRef(false);
  const hasAutoScrolledRef = useRef(false);
  const lastMessageSignatureRef = useRef('');
  const [chatSummaries, setChatSummaries] = useState<ChatSummary[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedAttachment, setSelectedAttachment] = useState<ChatAttachment | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<ChatAttachment | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [realtimeMetrics, setRealtimeMetrics] = useState<RealtimeMetricsSummary | null>(null);
  const [conversationTagsInput, setConversationTagsInput] = useState('');
  const [conversationPriority, setConversationPriority] = useState<ChatSummary['priority']>('normal');
  const [conversationStatus, setConversationStatus] = useState<ChatSummary['status']>('open');
  const [conversationAgent, setConversationAgent] = useState('');
  const [conversationSlaDueAt, setConversationSlaDueAt] = useState('');
  const realtimeEnabled = isRealtimeChatEnabled();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a1c55d7e`;
  const selectedChatSummary = chatSummaries.find((chat) => chat.username === selectedChat) ?? null;

  useEffect(() => {
    fetchChats();
    const interval = setInterval(fetchChats, 3000);
    return () => clearInterval(interval);
  }, [realtimeEnabled]);

  useEffect(() => {
    if (selectedChat) {
      hasAutoScrolledRef.current = false;
      lastMessageSignatureRef.current = '';
      fetchMessages(selectedChat);
      if (!realtimeEnabled) {
        markMessagesAsRead(selectedChat);
      }
      const interval = setInterval(() => {
        fetchMessages(selectedChat);
        if (!realtimeEnabled) {
          markMessagesAsRead(selectedChat);
        }
      }, realtimeEnabled ? 2000 : 3000);
      return () => clearInterval(interval);
    }
  }, [realtimeEnabled, selectedChat]);

  useEffect(() => {
    if (!selectedChatSummary) {
      return;
    }

    setConversationAgent(selectedChatSummary.assignedAgent || '');
    setConversationPriority(selectedChatSummary.priority || 'normal');
    setConversationStatus(selectedChatSummary.status || 'open');
    setConversationSlaDueAt(selectedChatSummary.slaDueAt || '');
    setConversationTagsInput((selectedChatSummary.tags || []).join(', '));
  }, [selectedChatSummary]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = (behavior: ScrollBehavior = 'auto') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const fetchChats = async () => {
    try {
      if (!hasLoadedChatsRef.current) {
        setLoading(true);
      }

      if (realtimeEnabled) {
        const realtimeData = await fetchRealtimeAdminConversations();
        const conversations = (realtimeData.conversations || []).map((item) => mapRealtimeConversation(item as Record<string, unknown>));
        setChatSummaries(conversations);

        const metrics = await fetchRealtimeMetricsSummary().catch(() => null);
        if (metrics) {
          setRealtimeMetrics(metrics);
        }
      } else {
        const response = await fetch(`${serverUrl}/cs/admin/chats`, {
          headers: await buildAdminAuthHeaders(false),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error((payload as { error?: string }).error || 'Failed to fetch chats');
        }

        const data = await response.json();
        setChatSummaries(data);
      }

      hasLoadedChatsRef.current = true;
      setLoadError(null);
    } catch (error) {
      if (!hasLoadedChatsRef.current) {
        setLoadError('Failed to connect to chat server. Please refresh and try again.');
      }
      handleAdminAuthError({
        errorValue: error,
        fallbackMessage: 'Failed to load chats',
        navigate,
        redirectedRef: adminAuthRedirectedRef,
        suppressToast: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (username: string) => {
    try {
      const nextMessages = realtimeEnabled
        ? ((await fetchRealtimeConversationTimeline(username)).messages || []).map((item) => mapRealtimeMessage(item as Record<string, unknown>))
        : await (async () => {
            const response = await fetch(`${serverUrl}/cs/chat/${username}`, {
              headers: await buildAdminAuthHeaders(false),
            });

            if (!response.ok) {
              const payload = await response.json().catch(() => ({}));
              throw new Error((payload as { error?: string }).error || 'Failed to fetch messages');
            }

            const data = await response.json();
            return Array.isArray(data) ? data : [];
          })();
      const signature = nextMessages.map((msg: ChatMessage) => `${msg.id}:${msg.read ? 1 : 0}`).join('|');

      if (signature !== lastMessageSignatureRef.current) {
        lastMessageSignatureRef.current = signature;
        setMessages(nextMessages);
        if (!hasAutoScrolledRef.current) {
          scrollToBottom('auto');
          hasAutoScrolledRef.current = true;
        }
      }
    } catch (error) {
      handleAdminAuthError({
        errorValue: error,
        fallbackMessage: 'Failed to load messages',
        navigate,
        redirectedRef: adminAuthRedirectedRef,
        suppressToast: true,
      });
    }
  };

  const markMessagesAsRead = async (username: string) => {
    try {
      const response = await fetch(`${serverUrl}/cs/chat/mark-read`, {
        method: 'POST',
        headers: await buildAdminAuthHeaders(),
        body: JSON.stringify({
          username,
          viewer: 'admin',
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error((payload as { error?: string }).error || 'Failed to mark messages as read');
      }

      const payload = await response.json().catch(() => ({} as { updated?: number }));
      if (typeof payload.updated === 'number' && payload.updated > 0) {
        setChatSummaries(prev =>
          prev.map(chat => chat.username === username ? { ...chat, unreadCount: 0 } : chat)
        );
      }
    } catch (error) {
      handleAdminAuthError({
        errorValue: error,
        fallbackMessage: 'Failed to mark messages as read',
        navigate,
        redirectedRef: adminAuthRedirectedRef,
        suppressToast: true,
      });
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if ((!newMessage.trim() && !selectedAttachment) || !selectedChat) return;

    try {
      setSending(true);
      const encoded = encodeChatMessage(newMessage.trim(), selectedAttachment);
      // Optimistic update — show message immediately while server call is in-flight
      setMessages((prev) => [
        ...prev,
        {
          id: `opt-${Date.now()}`,
          message: encoded,
          sender: 'admin',
          isAdmin: true,
          timestamp: new Date().toISOString(),
          read: false,
        },
      ]);
      setNewMessage('');
      setSelectedAttachment(null);
      setAttachmentError(null);
      scrollToBottom('smooth');
      if (realtimeEnabled) {
        await sendRealtimeAdminChatMessage(selectedChat, encoded);
      } else {
        const response = await fetch(`${serverUrl}/cs/chat/send`, {
          method: 'POST',
          headers: await buildAdminAuthHeaders(),
          body: JSON.stringify({
            username: selectedChat,
            message: encoded,
            isAdmin: true,
          }),
        });
        if (!response.ok) {
          throw new Error('Failed to send message');
        }
      }
      await fetchMessages(selectedChat);
      await fetchChats();
    } catch (error) {
      handleAdminAuthError({
        errorValue: error,
        fallbackMessage: 'Failed to send message.',
        navigate,
        redirectedRef: adminAuthRedirectedRef,
      });
    } finally {
      setSending(false);
    }
  };

  const handlePickAttachment = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) {
      return;
    }

    if (selectedFile.size > MAX_CHAT_ATTACHMENT_SIZE_BYTES) {
      setAttachmentError('Attachment must be 250 KB or smaller.');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (result) {
        setSelectedAttachment({
          type: getAttachmentType(selectedFile),
          dataUrl: result,
          name: selectedFile.name,
          mimeType: selectedFile.type,
          size: selectedFile.size,
        });
        setAttachmentError(null);
      }
    };
    reader.readAsDataURL(selectedFile);
    event.target.value = '';
  };

  const handleSaveConversationMeta = async () => {
    if (!realtimeEnabled || !selectedChat) {
      return;
    }

    try {
      await patchRealtimeConversation(selectedChat, {
        assignedAgent: conversationAgent.trim() || null,
        priority: conversationPriority || 'normal',
        status: conversationStatus || 'open',
        slaDueAt: conversationSlaDueAt.trim() || null,
        tags: conversationTagsInput
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
      });
      toast.success('Conversation metadata updated');
      await fetchChats();
    } catch (error) {
      handleAdminAuthError({
        errorValue: error,
        fallbackMessage: 'Failed to update conversation metadata',
        navigate,
        redirectedRef: adminAuthRedirectedRef,
      });
    }
  };

  const filteredChats = chatSummaries.filter(chat =>
    chat.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {previewAttachment ? (
        <div className="fixed inset-0 z-50 bg-slate-950/80 p-4" onClick={() => setPreviewAttachment(null)}>
          <div className="mx-auto flex h-full max-w-4xl items-center justify-center" onClick={(event) => event.stopPropagation()}>
            <div className="w-full rounded-2xl bg-white p-4 shadow-2xl">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{previewAttachment.name || 'Attachment preview'}</p>
                  <p className="text-xs text-gray-500">{buildAttachmentLabel(previewAttachment.type)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => downloadAttachment(previewAttachment)} className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
                    <Download size={16} />
                    Download
                  </button>
                  <button type="button" onClick={() => setPreviewAttachment(null)} className="rounded-full border border-gray-300 p-2 text-gray-600" aria-label="Close attachment preview">
                    <X size={18} />
                  </button>
                </div>
              </div>
              <div className="flex min-h-[280px] items-center justify-center rounded-2xl bg-gray-100 p-4">
                {previewAttachment.type === 'image' ? (
                  <img src={previewAttachment.dataUrl} alt={previewAttachment.name} className="max-h-[70vh] rounded-xl object-contain" />
                ) : previewAttachment.type === 'video' ? (
                  <video controls src={previewAttachment.dataUrl} className="max-h-[70vh] w-full rounded-xl" />
                ) : previewAttachment.type === 'audio' ? (
                  <audio controls src={previewAttachment.dataUrl} className="w-full" />
                ) : (
                  <div className="text-center text-gray-500">
                    <FileText className="mx-auto mb-3" size={36} />
                    <p>Preview is not available for this file type.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-210px)] min-h-[520px]">
      {/* Chat List */}
      <div className="col-span-1 bg-[#071626] rounded-xl border border-white/10 flex flex-col min-h-0">
        <div className="p-4 border-b border-white/10">
          <h3 className="font-bold text-white mb-3">Active Chats</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users..."
              className="w-full pl-10 pr-4 py-2 border border-white/15 rounded-lg focus:border-cyan-400 focus:outline-none text-sm bg-[#0d2035] text-white placeholder-slate-500"
            />
          </div>
          {realtimeEnabled && realtimeMetrics?.metrics ? (
            <div className="mt-3 space-y-2 rounded-lg border border-cyan-500/20 bg-[#051523] p-2 text-[11px]">
              <div className="grid grid-cols-3 gap-2">
              <div>
                <p className="text-cyan-400/60">Events</p>
                <p className="font-semibold text-cyan-100">{Number(realtimeMetrics.metrics.total_events ?? 0)}</p>
              </div>
              <div>
                <p className="text-cyan-400/60">Success</p>
                <p className="font-semibold text-cyan-100">{Number(realtimeMetrics.metrics.success_events ?? 0)}</p>
              </div>
              <div>
                <p className="text-cyan-400/60">Avg Latency</p>
                <p className="font-semibold text-cyan-100">{Math.round(Number(realtimeMetrics.metrics.avg_duration_ms ?? 0))}ms</p>
              </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <p className="text-cyan-400/60">Retries</p>
                  <p className="font-semibold text-cyan-100">{Number(realtimeMetrics.metrics.retry_count ?? 0)}</p>
                </div>
                <div>
                  <p className="text-cyan-400/60">Failures</p>
                  <p className="font-semibold text-rose-300">{Number(realtimeMetrics.metrics.failed_deliveries ?? 0)}</p>
                </div>
                <div>
                  <p className="text-cyan-400/60">Delayed</p>
                  <p className="font-semibold text-amber-300">{Number(realtimeMetrics.metrics.delayed_messages ?? 0)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-cyan-400/60">Active Conversations</p>
                  <p className="font-semibold text-cyan-100">{Number(realtimeMetrics.activeConversations ?? 0)}</p>
                </div>
                <div>
                  <p className="text-cyan-400/60">SLA Breaches</p>
                  <p className="font-semibold text-rose-300">{Number(realtimeMetrics.slaBreaches ?? 0)}</p>
                </div>
              </div>
              {Array.isArray(realtimeMetrics.openLoadByPriority) && realtimeMetrics.openLoadByPriority.length > 0 ? (
                <div className="rounded border border-white/10 bg-white/5 p-2">
                  <p className="mb-1 text-slate-400">Open Load by Priority</p>
                  <div className="flex flex-wrap gap-1">
                    {realtimeMetrics.openLoadByPriority.map((entry, index) => (
                      <span key={`${entry.priority || 'unknown'}-${index}`} className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-300">
                        {(entry.priority || 'unknown').toUpperCase()}: {Number(entry.count ?? 0)}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              {Array.isArray(realtimeMetrics.recentFailures) && realtimeMetrics.recentFailures.length > 0 ? (
                <div className="rounded border border-rose-500/20 bg-rose-500/5 p-2">
                  <p className="mb-1 text-rose-400/80">Recent Failures</p>
                  <div className="max-h-24 space-y-1 overflow-y-auto">
                    {realtimeMetrics.recentFailures.slice(0, 6).map((failure, index) => (
                      <p key={`${failure.event_type || 'event'}-${index}`} className="text-[10px] text-rose-300">
                        {(failure.event_type || 'unknown').replace(/\./g, ' ')} · {failure.actor_role || 'n/a'} · {failure.created_at ? new Date(failure.created_at).toLocaleTimeString() : 'n/a'}
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="animate-spin text-blue-500" size={32} />
            </div>
          ) : loadError ? (
            <div className="flex flex-col items-center justify-center h-full p-4 text-center">
              <MessageSquare className="text-red-300 mb-3" size={48} />
              <p className="text-red-500 text-sm font-medium">Failed to load chats</p>
              <p className="text-gray-400 text-xs mt-1">{loadError}</p>
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-4 text-center">
              <MessageSquare className="text-slate-600 mb-3" size={48} />
              <p className="text-slate-400 text-sm">No active chats</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredChats.map((chat) => (
                
                <button
                  key={chat.username}
                  onClick={() => setSelectedChat(chat.username)}
                  className={`w-full p-4 text-left hover:bg-white/5 transition-colors ${
                    selectedChat === chat.username ? 'bg-cyan-500/10 border-l-4 border-l-cyan-400' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-gradient-to-br from-[#0091b3] to-[#00c6ef] rounded-full flex items-center justify-center text-white font-bold">
                        {chat.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-white">{chat.username}</p>
                        <p className="text-xs text-slate-400">{chat.totalMessages} messages</p>
                      </div>
                    </div>
                    {chat.unreadCount > 0 && (
                      <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                        {chat.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${chat.responseState === 'awaiting-support' ? 'bg-amber-100 text-amber-700' : chat.responseState === 'support-replied' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                      {chat.responseState.replace('-', ' ')}
                    </span>
                    {chat.overdue ? (
                      <span className="rounded-full bg-rose-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-rose-700">
                        SLA Overdue
                      </span>
                    ) : null}
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">
                      Avg {formatChatResponseTime(chat.averageAdminResponseMs)}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 truncate mb-1">{chat.lastMessagePreview || chat.lastMessage}</p>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock size={12} />
                    {new Date(chat.lastMessageTime).toLocaleString()}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Window */}
      <div className="col-span-1 lg:col-span-2 bg-[#071626] rounded-xl border border-white/10 flex flex-col min-h-0">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#071626]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[#0091b3] to-[#00c6ef] rounded-full flex items-center justify-center text-white font-bold">
                  {selectedChat.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-white">{selectedChat}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${selectedChatSummary?.responseState === 'awaiting-support' ? 'bg-amber-100 text-amber-700' : selectedChatSummary?.responseState === 'support-replied' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                      {String(selectedChatSummary?.responseState ?? 'idle').replace('-', ' ')}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">
                      Avg {formatChatResponseTime(selectedChatSummary?.averageAdminResponseMs ?? null)}
                    </span>
                    <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700">
                      Pending {Number(selectedChatSummary?.pendingUserMessages ?? 0)}
                    </span>
                    {selectedChatSummary?.priority ? (
                      <span className="rounded-full bg-purple-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-purple-700">
                        {selectedChatSummary.priority}
                      </span>
                    ) : null}
                    {selectedChatSummary?.overdue ? (
                      <span className="rounded-full bg-rose-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-rose-700">
                        SLA Overdue
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedChat(null)}
                className="text-slate-400 hover:text-white p-2 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {realtimeEnabled ? (
              <div className="grid grid-cols-1 gap-2 border-b border-white/10 bg-[#0a1928] p-3 md:grid-cols-5">
                <input
                  type="text"
                  value={conversationAgent}
                  onChange={(event) => setConversationAgent(event.target.value)}
                  placeholder="Assigned agent"
                  className="rounded-md border border-white/15 px-2 py-1 text-xs bg-[#0d2035] text-white placeholder-slate-500"
                />
                <select value={conversationPriority} onChange={(event) => setConversationPriority(event.target.value as ChatSummary['priority'])} className="rounded-md border border-white/15 px-2 py-1 text-xs bg-[#0d2035] text-white">
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
                <select value={conversationStatus} onChange={(event) => setConversationStatus(event.target.value as ChatSummary['status'])} className="rounded-md border border-white/15 px-2 py-1 text-xs bg-[#0d2035] text-white">
                  <option value="open">Open</option>
                  <option value="pending">Pending</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
                <input
                  type="text"
                  value={conversationTagsInput}
                  onChange={(event) => setConversationTagsInput(event.target.value)}
                  placeholder="Tags: billing, vip"
                  className="rounded-md border border-white/15 px-2 py-1 text-xs bg-[#0d2035] text-white placeholder-slate-500"
                />
                <div className="flex gap-2">
                  <input
                    type="datetime-local"
                    value={conversationSlaDueAt}
                    onChange={(event) => setConversationSlaDueAt(event.target.value)}
                    className="min-w-0 flex-1 rounded-md border border-white/15 px-2 py-1 text-xs bg-[#0d2035] text-white"
                  />
                  <button
                    type="button"
                    onClick={() => void handleSaveConversationMeta()}
                    className="rounded-md bg-[#00c6ef] px-3 py-1 text-xs font-semibold text-slate-950"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : null}

            {/* Messages Area */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 bg-[#040e16]">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageSquare className="text-slate-600 mb-3" size={48} />
                  <p className="text-slate-400">No messages yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.isAdmin ? 'justify-end' : 'justify-start'}`}
                    >
                      {(() => {
                        const decoded = decodeChatMessage(msg.message);
                        const attachment = decoded.attachment;
                        return (
                      <div className={`max-w-[70%]`}>
                        {!msg.isAdmin && (
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-6 h-6 bg-gradient-to-br from-slate-600 to-slate-700 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs font-bold">
                                {msg.sender.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="text-xs text-slate-400">{msg.sender}</span>
                          </div>
                        )}
                        <div
                          className={`rounded-lg px-4 py-2 ${
                            msg.isAdmin
                              ? 'bg-gradient-to-r from-[#0091b3] to-[#00c6ef] text-white'
                              : 'bg-[#0d2035] border border-white/10 text-white'
                          }`}
                        >
                          {attachment?.type === 'image' ? (
                            <button type="button" onClick={() => setPreviewAttachment(attachment)} className="mb-2 block w-full overflow-hidden rounded-lg">
                              <img src={attachment.dataUrl} alt={attachment.name || 'Chat attachment'} className="w-full max-h-56 rounded-lg object-cover" />
                            </button>
                          ) : null}
                          {attachment?.type === 'video' ? (
                            <div className="mb-2 rounded-lg bg-black/5 p-2">
                              <video controls src={attachment.dataUrl} className="max-h-56 w-full rounded-lg" />
                              <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                                <span className="truncate">{attachment.name}</span>
                                <button type="button" onClick={() => downloadAttachment(attachment)} className="inline-flex items-center gap-1 font-semibold">
                                  <Download size={12} />
                                  Download
                                </button>
                              </div>
                            </div>
                          ) : null}
                          {attachment?.type === 'audio' ? (
                            <div className="mb-2 rounded-lg bg-black/5 p-3">
                              <audio controls src={attachment.dataUrl} className="w-full" />
                              <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                                <span className="truncate">{attachment.name}</span>
                                <button type="button" onClick={() => downloadAttachment(attachment)} className="inline-flex items-center gap-1 font-semibold">
                                  <Download size={12} />
                                  Download
                                </button>
                              </div>
                            </div>
                          ) : null}
                          {attachment?.type === 'file' ? (
                            <div className="mb-2 flex items-center justify-between gap-3 rounded-lg border border-white/15 bg-black/20 px-3 py-2">
                              <div className="flex min-w-0 items-center gap-2">
                                <FileText size={16} className="shrink-0 text-cyan-400" />
                                <div className="min-w-0">
                                  <p className="truncate text-xs font-semibold text-white">{attachment.name}</p>
                                  <p className="text-[10px] text-slate-400">{buildAttachmentLabel(attachment.type)}</p>
                                </div>
                              </div>
                              <button type="button" onClick={() => downloadAttachment(attachment)} className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-400">
                                <Download size={12} />
                                Download
                              </button>
                            </div>
                          ) : null}
                          {decoded.text ? <p className="text-sm break-all whitespace-pre-wrap">{decoded.text}</p> : null}
                          <div className="flex items-center justify-end gap-1 mt-1">
                            <p className={`text-xs ${msg.isAdmin ? 'text-white/60' : 'text-slate-400'}`}>
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            {msg.isAdmin && (
                              <CheckCircle size={12} className="text-white/70" />
                            )}
                          </div>
                        </div>
                        {msg.isAdmin && (
                          <p className="text-xs text-slate-500 text-right mt-1">You</p>
                        )}
                      </div>
                        );
                      })()}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input Area */}
            <form onSubmit={handleSendMessage} className="p-4 bg-[#071626] border-t border-white/10 shrink-0">
              {selectedAttachment ? (
                <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-white/15 bg-[#0d2035] px-3 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    {selectedAttachment.type === 'image' ? <ImageIcon size={16} className="text-cyan-400" /> : null}
                    {selectedAttachment.type === 'video' ? <Video size={16} className="text-cyan-400" /> : null}
                    {selectedAttachment.type === 'audio' ? <Music2 size={16} className="text-cyan-400" /> : null}
                    {selectedAttachment.type === 'file' ? <FileText size={16} className="text-cyan-400" /> : null}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{selectedAttachment.name}</p>
                      <p className="text-[11px] text-slate-400">{buildAttachmentLabel(selectedAttachment.type)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setPreviewAttachment(selectedAttachment)} className="text-xs font-semibold text-cyan-400">
                      Preview
                    </button>
                    <button type="button" onClick={() => setSelectedAttachment(null)} className="rounded-full bg-gray-200 p-1 text-gray-600" aria-label="Remove selected attachment">
                      <X size={12} />
                    </button>
                  </div>
                </div>
              ) : null}

              {attachmentError ? <p className="mb-3 text-xs text-amber-400">{attachmentError}</p> : null}

              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                  onChange={handlePickAttachment}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-lg border border-white/15 px-3 py-2 text-slate-400 transition-colors hover:border-cyan-400 hover:text-cyan-400"
                  aria-label="Attach file"
                >
                  <Paperclip size={18} />
                </button>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your response..."
                  disabled={sending}
                  className="flex-1 px-4 py-2 border border-white/15 rounded-xl focus:border-cyan-400 focus:outline-none bg-[#0d2035] text-white placeholder-slate-500 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={sending || (!newMessage.trim() && !selectedAttachment)}
                  className="bg-[#00c6ef] text-slate-950 px-6 py-2 rounded-xl hover:bg-[#2dd4ee] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-bold"
                >
                  {sending ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <>
                      <Send size={20} />
                      <span className="font-semibold">Send</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <MessageSquare className="text-slate-600 mb-4" size={64} />
            <p className="text-slate-300 font-semibold mb-2">No chat selected</p>
            <p className="text-slate-500 text-sm">Select a chat from the list to start responding</p>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
