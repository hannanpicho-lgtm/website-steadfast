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
import { formatChatResponseTime } from '../../services/chatSupport';
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
}

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a1c55d7e`;

  useEffect(() => {
    fetchChats();
    // Poll for updates every 5 seconds to reduce UI churn
    const interval = setInterval(fetchChats, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedChat) {
      hasAutoScrolledRef.current = false;
      lastMessageSignatureRef.current = '';
      fetchMessages(selectedChat);
      markMessagesAsRead(selectedChat);
      // Poll for new messages in the selected chat
      const interval = setInterval(() => {
        fetchMessages(selectedChat);
        markMessagesAsRead(selectedChat);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedChat]);

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

      const response = await fetch(`${serverUrl}/cs/admin/chats`, {
        headers: await buildAdminAuthHeaders(false),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error((payload as { error?: string }).error || 'Failed to fetch chats');
      }

      const data = await response.json();
      setChatSummaries(data);
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
      const response = await fetch(`${serverUrl}/cs/chat/${username}`, {
        headers: await buildAdminAuthHeaders(false),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error((payload as { error?: string }).error || 'Failed to fetch messages');
      }

      const data = await response.json();
      const nextMessages = Array.isArray(data) ? data : [];
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
      const response = await fetch(`${serverUrl}/cs/chat/send`, {
        method: 'POST',
        headers: await buildAdminAuthHeaders(),
        body: JSON.stringify({
          username: selectedChat,
          message: encodeChatMessage(newMessage.trim(), selectedAttachment),
          isAdmin: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

  setNewMessage('');
  setSelectedAttachment(null);
  setAttachmentError(null);
      await fetchMessages(selectedChat);
      await fetchChats();
      scrollToBottom('smooth');
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

  const filteredChats = chatSummaries.filter(chat =>
    chat.username.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const selectedChatSummary = chatSummaries.find((chat) => chat.username === selectedChat) ?? null;

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
                  <button type="button" onClick={() => setPreviewAttachment(null)} className="rounded-full border border-gray-300 p-2 text-gray-600">
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
      <div className="col-span-1 bg-white rounded-lg border border-gray-200 flex flex-col min-h-0">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-bold text-gray-900 mb-3">Active Chats</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
            />
          </div>
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
              <MessageSquare className="text-gray-300 mb-3" size={48} />
              <p className="text-gray-500 text-sm">No active chats</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredChats.map((chat) => (
                
                <button
                  key={chat.username}
                  onClick={() => setSelectedChat(chat.username)}
                  className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                    selectedChat === chat.username ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                        {chat.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{chat.username}</p>
                        <p className="text-xs text-gray-500">{chat.totalMessages} messages</p>
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
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">
                      Avg {formatChatResponseTime(chat.averageAdminResponseMs)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 truncate mb-1">{chat.lastMessagePreview || chat.lastMessage}</p>
                  <p className="text-xs text-gray-400 flex items-center gap-1">
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
      <div className="col-span-1 lg:col-span-2 bg-white rounded-lg border border-gray-200 flex flex-col min-h-0">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                  {selectedChat.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{selectedChat}</p>
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
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedChat(null)}
                className="text-gray-400 hover:text-gray-600 p-2"
              >
                <X size={20} />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 bg-gray-50">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageSquare className="text-gray-300 mb-3" size={48} />
                  <p className="text-gray-500">No messages yet</p>
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
                            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs font-bold">
                                {msg.sender.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500">{msg.sender}</span>
                          </div>
                        )}
                        <div
                          className={`rounded-lg px-4 py-2 ${
                            msg.isAdmin
                              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                              : 'bg-white border border-gray-200 text-gray-900'
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
                            <div className="mb-2 flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                              <div className="flex min-w-0 items-center gap-2">
                                <FileText size={16} className="shrink-0 text-blue-600" />
                                <div className="min-w-0">
                                  <p className="truncate text-xs font-semibold text-gray-900">{attachment.name}</p>
                                  <p className="text-[10px] text-gray-500">{buildAttachmentLabel(attachment.type)}</p>
                                </div>
                              </div>
                              <button type="button" onClick={() => downloadAttachment(attachment)} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600">
                                <Download size={12} />
                                Download
                              </button>
                            </div>
                          ) : null}
                          {decoded.text ? <p className="text-sm break-all whitespace-pre-wrap">{decoded.text}</p> : null}
                          <div className="flex items-center justify-end gap-1 mt-1">
                            <p className={`text-xs ${msg.isAdmin ? 'text-white/70' : 'text-gray-400'}`}>
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            {msg.isAdmin && (
                              <CheckCircle size={12} className="text-white/70" />
                            )}
                          </div>
                        </div>
                        {msg.isAdmin && (
                          <p className="text-xs text-gray-400 text-right mt-1">You</p>
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
            <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-200 shrink-0">
              {selectedAttachment ? (
                <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    {selectedAttachment.type === 'image' ? <ImageIcon size={16} className="text-blue-600" /> : null}
                    {selectedAttachment.type === 'video' ? <Video size={16} className="text-blue-600" /> : null}
                    {selectedAttachment.type === 'audio' ? <Music2 size={16} className="text-blue-600" /> : null}
                    {selectedAttachment.type === 'file' ? <FileText size={16} className="text-blue-600" /> : null}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">{selectedAttachment.name}</p>
                      <p className="text-[11px] text-gray-500">{buildAttachmentLabel(selectedAttachment.type)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setPreviewAttachment(selectedAttachment)} className="text-xs font-semibold text-blue-600">
                      Preview
                    </button>
                    <button type="button" onClick={() => setSelectedAttachment(null)} className="rounded-full bg-gray-200 p-1 text-gray-600">
                      <X size={12} />
                    </button>
                  </div>
                </div>
              ) : null}

              {attachmentError ? <p className="mb-3 text-xs text-amber-600">{attachmentError}</p> : null}

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
                  className="rounded-lg border border-gray-300 px-3 py-2 text-gray-600 transition-colors hover:border-blue-500 hover:text-blue-600"
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
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none disabled:bg-gray-100"
                />
                <button
                  type="submit"
                  disabled={sending || (!newMessage.trim() && !selectedAttachment)}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-2 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
            <MessageSquare className="text-gray-300 mb-4" size={64} />
            <p className="text-gray-600 font-semibold mb-2">No chat selected</p>
            <p className="text-gray-400 text-sm">Select a chat from the list to start responding</p>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
