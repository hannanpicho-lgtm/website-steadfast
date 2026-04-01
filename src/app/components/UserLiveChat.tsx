import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Clock3, Download, FileText, Image as ImageIcon, Loader2, MessageCircle, Music2, Paperclip, Send, ShieldCheck, Smile, Sparkles, Video, Wifi, WifiOff, X } from 'lucide-react';
import { getCurrentUsername } from '../services/referralSystem';
import {
  type ChatAttachment,
  type ChatMessage,
  type ChatThreadSummary,
  MAX_CHAT_ATTACHMENT_SIZE_BYTES,
  buildAttachmentLabel,
  decodeChatMessage,
  downloadAttachment,
  encodeChatMessage,
  fetchUserChatMessages,
  fetchUserChatSummary,
  formatChatResponseTime,
  getAttachmentType,
  isRealtimeChatEnabled,
  markUserChatRead,
  openRealtimeChatSocket,
  sendRealtimeTyping,
  sendRealtimeUserChatMessage,
  sendUserChatMessage,
} from '../services/chatSupport';

interface UserLiveChatProps {
  isOpen: boolean;
  onClose: () => void;
}

const QUICK_EMOJIS = ['😀', '😁', '😂', '😊', '😉', '😍', '🤩', '😎', '🙂', '😌', '🤝', '👏', '👍', '🙏', '💪', '🎯', '🎉', '✨', '🔥', '💯', '✅', '⭐', '💡', '📌'];
const QUICK_REPLY_CHIPS = [
  'I need help with withdrawal review',
  'Please reset my task set',
  'I need help with my bonus',
  'Can you verify my latest transaction?',
];

function getConnectionTone(connectionState: 'connecting' | 'live' | 'reconnecting') {
  if (connectionState === 'live') {
    return 'bg-emerald-400/20 text-emerald-100';
  }
  if (connectionState === 'reconnecting') {
    return 'bg-amber-400/20 text-amber-100';
  }
  return 'bg-white/15 text-white';
}

export function UserLiveChat({ isOpen, onClose }: UserLiveChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedAttachment, setSelectedAttachment] = useState<ChatAttachment | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<ChatAttachment | null>(null);
  const [attachmentError, setAttachmentError] = useState('');
  const [showEmojiPanel, setShowEmojiPanel] = useState(false);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connectionState, setConnectionState] = useState<'connecting' | 'live' | 'reconnecting'>('connecting');
  const [threadSummary, setThreadSummary] = useState<ChatThreadSummary | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<number | null>(null);
  const realtimeSocketRef = useRef<WebSocket | null>(null);
  const realtimeRefreshTimeoutRef = useRef<number | null>(null);
  const reconnectToastShownRef = useRef(false);
  const wsReconnectTimerRef = useRef<number | null>(null);
  const reconnectToastTimerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const username = getCurrentUsername();
  const draftStorageKey = username ? `live-chat-draft:${username}` : null;
  const realtimeEnabled = isRealtimeChatEnabled();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversation = async (silent = false) => {
    if (!username) {
      return;
    }

    try {
      if (!silent) {
        setLoading(true);
      }

      setConnectionState((prev) => (silent && prev === 'live' ? 'live' : 'connecting'));

      const [nextMessages, nextSummary] = await Promise.all([
        fetchUserChatMessages(username),
        fetchUserChatSummary(),
      ]);

      setMessages(nextMessages);
      setThreadSummary(nextSummary);
      setConnectionState('live');

      if (Number(nextSummary.unreadAdminCount ?? 0) > 0) {
        const markedCount = await markUserChatRead();
        if (markedCount > 0) {
          setThreadSummary((current) => current ? {
            ...current,
            unreadAdminCount: Math.max(0, Number(current.unreadAdminCount ?? 0) - markedCount),
          } : current);
          setMessages((current) => current.map((message) => (
            message.isAdmin ? { ...message, read: true } : message
          )));
        }
      }
    } catch {
      setConnectionState('reconnecting');
      if (!silent) {
        toast.error('Chat connection is temporarily unavailable. Retrying in the background.');
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (draftStorageKey) {
      try {
        const persistedDraft = localStorage.getItem(draftStorageKey);
        if (persistedDraft) {
          setNewMessage(persistedDraft);
        }
      } catch {
        // ignore storage read failures
      }
    }

    void loadConversation();

    let cancelled = false;
    if (realtimeEnabled && username) {
      const connectSocket = async () => {
        if (cancelled) return;
        try {
          realtimeSocketRef.current?.close();
          const socket = await openRealtimeChatSocket({
            conversationId: username,
            actorId: username,
            actorRole: 'user',
            onOpen: () => setConnectionState('live'),
            onClose: () => {
              setConnectionState('reconnecting');
              if (!cancelled) {
                wsReconnectTimerRef.current = window.setTimeout(connectSocket, 3000);
              }
            },
            onError: () => setConnectionState('reconnecting'),
            onEvent: () => {
              if (realtimeRefreshTimeoutRef.current !== null) {
                window.clearTimeout(realtimeRefreshTimeoutRef.current);
              }
              realtimeRefreshTimeoutRef.current = window.setTimeout(() => {
                void loadConversation(true);
              }, 120);
            },
          });
          if (!cancelled) {
            realtimeSocketRef.current = socket;
          } else {
            socket?.close();
          }
        } catch {
          if (!cancelled) {
            setConnectionState('reconnecting');
            wsReconnectTimerRef.current = window.setTimeout(connectSocket, 5000);
          }
        }
      };
      void connectSocket();
    }

    pollRef.current = window.setInterval(() => {
      void loadConversation(true);
    }, realtimeEnabled ? 15000 : 4000);

    return () => {
      cancelled = true;
      if (pollRef.current !== null) {
        window.clearInterval(pollRef.current);
      }
      if (realtimeRefreshTimeoutRef.current !== null) {
        window.clearTimeout(realtimeRefreshTimeoutRef.current);
      }
      if (wsReconnectTimerRef.current !== null) {
        window.clearTimeout(wsReconnectTimerRef.current);
      }
      realtimeSocketRef.current?.close();
      realtimeSocketRef.current = null;
    };
  }, [draftStorageKey, isOpen, realtimeEnabled, username]);

  useEffect(() => {
    if (!draftStorageKey) {
      return;
    }

    try {
      if (newMessage.trim()) {
        localStorage.setItem(draftStorageKey, newMessage);
      } else {
        localStorage.removeItem(draftStorageKey);
      }
    } catch {
      // ignore storage write failures
    }
  }, [draftStorageKey, newMessage]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (connectionState === 'reconnecting' && !reconnectToastShownRef.current) {
      // Debounce: only show toast after 4s of sustained disconnection to avoid
      // false alarms from brief WS close/reopen cycles (e.g. after sending a message).
      reconnectToastTimerRef.current = window.setTimeout(() => {
        reconnectToastShownRef.current = true;
        toast.error('Live channel dropped. Reconnecting in the background.');
      }, 4000);
      return;
    }

    // Clear pending toast if we recovered quickly.
    if (reconnectToastTimerRef.current !== null) {
      window.clearTimeout(reconnectToastTimerRef.current);
      reconnectToastTimerRef.current = null;
    }

    if (connectionState === 'live' && reconnectToastShownRef.current) {
      toast.success('Live chat connection restored.');
      reconnectToastShownRef.current = false;
    }
  }, [connectionState]);

  const sendCurrentMessage = async () => {
    const trimmedMessage = newMessage.trim();
    if ((!trimmedMessage && !selectedAttachment) || !username) {
      return;
    }

    try {
      setSending(true);
      const payload = encodeChatMessage(trimmedMessage, selectedAttachment);
      if (realtimeEnabled && username) {
        try {
          await sendRealtimeUserChatMessage(username, username, payload);
        } catch {
          // Realtime worker unavailable - fall back to main REST endpoint silently.
          await sendUserChatMessage(payload);
        }
      } else {
        await sendUserChatMessage(payload);
      }
      setNewMessage('');
      setSelectedAttachment(null);
      setAttachmentError('');
      setShowEmojiPanel(false);

      if (draftStorageKey) {
        try {
          localStorage.removeItem(draftStorageKey);
        } catch {
          // ignore storage write failures
        }
      }

      await loadConversation(true);
    } catch {
      toast.error('Message could not be delivered. Please retry.');
      setConnectionState('reconnecting');
    } finally {
      setSending(false);
    }
  };

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    await sendCurrentMessage();
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
        setAttachmentError('');
      }
    };
    reader.readAsDataURL(selectedFile);
    event.target.value = '';
  };

  const appendEmoji = (emoji: string) => {
    setNewMessage((prev) => `${prev}${emoji}`);
  };

  const appendQuickReply = (value: string) => {
    setNewMessage((prev) => (prev.trim() ? `${prev.trim()}\n${value}` : value));
  };

  const handleComposerKeyDown = async (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      await sendCurrentMessage();
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <>
      {previewAttachment ? (
        <div className="fixed inset-0 z-[70] bg-black/80 p-4" onClick={() => setPreviewAttachment(null)}>
          <div className="mx-auto flex h-full max-w-4xl items-center justify-center" onClick={(event) => event.stopPropagation()}>
            <div className="w-full rounded-2xl bg-[#0f172a] p-4 text-white shadow-2xl">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold">{previewAttachment.name || 'Attachment preview'}</p>
                  <p className="text-xs text-slate-400">{buildAttachmentLabel(previewAttachment.type)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => downloadAttachment(previewAttachment)}
                    className="inline-flex items-center gap-2 rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950"
                  >
                    <Download size={16} />
                    Download
                  </button>
                  <button type="button" onClick={() => setPreviewAttachment(null)} className="rounded-full border border-slate-700 p-2 text-slate-300">
                    <X size={18} />
                  </button>
                </div>
              </div>
              <div className="flex min-h-[280px] items-center justify-center rounded-2xl bg-slate-950/60 p-4">
                {previewAttachment.type === 'image' ? (
                  <img src={previewAttachment.dataUrl} alt={previewAttachment.name} className="max-h-[70vh] w-auto rounded-xl object-contain" />
                ) : previewAttachment.type === 'video' ? (
                  <video controls src={previewAttachment.dataUrl} className="max-h-[70vh] w-full rounded-xl" />
                ) : previewAttachment.type === 'audio' ? (
                  <audio controls src={previewAttachment.dataUrl} className="w-full" />
                ) : (
                  <div className="text-center">
                    <FileText className="mx-auto mb-3 text-slate-400" size={36} />
                    <p className="text-sm text-slate-300">Preview is not available for this file type.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="fixed inset-0 z-[60] bg-black/50" onClick={onClose} />

      <div className="fixed bottom-24 right-6 z-[60] flex h-[620px] w-[390px] max-w-[calc(100vw-18px)] flex-col overflow-hidden rounded-[30px] border border-cyan-200/20 bg-[linear-gradient(180deg,#08141c_0%,#0d1d29_100%)] shadow-[0_28px_70px_rgba(2,12,19,0.52)]">
        <div className="shrink-0 border-b border-white/10 bg-[linear-gradient(120deg,rgba(72,223,255,0.94)_0%,rgba(18,196,217,0.88)_100%)] px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950/10">
                <MessageCircle size={18} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-950">Steadfast Live Care</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${getConnectionTone(connectionState)}`}>
                    {connectionState === 'live' ? <Wifi size={10} /> : <WifiOff size={10} />}
                    {connectionState === 'live' ? 'Live' : connectionState === 'reconnecting' ? 'Retrying' : 'Connecting'}
                  </span>
                  <span className="text-[11px] font-medium text-slate-900/70">Session-secured support</span>
                </div>
              </div>
            </div>

            <button onClick={onClose} className="rounded-xl p-2 text-slate-950/80 transition-colors hover:bg-white/20 hover:text-slate-950">
              <X size={20} />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-slate-950/12 px-3 py-2 text-slate-950">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-950/65">Unread</p>
              <p className="mt-1 text-sm font-bold">{Number(threadSummary?.unreadAdminCount ?? 0)}</p>
            </div>
            <div className="rounded-2xl bg-slate-950/12 px-3 py-2 text-slate-950">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-950/65">Response</p>
              <p className="mt-1 text-sm font-bold">{formatChatResponseTime(threadSummary?.averageAdminResponseMs ?? null)}</p>
            </div>
            <div className="rounded-2xl bg-slate-950/12 px-3 py-2 text-slate-950">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-950/65">State</p>
              <p className="mt-1 text-sm font-bold capitalize">{String(threadSummary?.responseState ?? 'idle').replace('-', ' ')}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(43,88,112,0.28),transparent_40%),linear-gradient(180deg,rgba(7,20,28,0.96)_0%,rgba(9,17,24,0.96)_100%)] px-4 py-4">
          {connectionState === 'reconnecting' ? (
            <div className="rounded-xl border border-amber-300/30 bg-amber-400/10 px-3 py-2 text-xs font-medium text-amber-100">
              Live updates are unstable. Messages are still syncing through fallback refresh.
            </div>
          ) : null}

          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-slate-200">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck size={16} className="text-cyan-300" />
              Human support, account-linked history, and attachment-aware replies.
            </div>
            <div className="mt-2 flex items-center gap-3 text-xs text-slate-300/70">
              <span className="inline-flex items-center gap-1"><Clock3 size={12} /> 9AM - 10PM EST</span>
              <span className="inline-flex items-center gap-1"><Sparkles size={12} /> Modern support inbox</span>
            </div>
          </div>

          {loading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="animate-spin text-cyan-400" size={28} />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <MessageCircle className="mb-3 text-slate-600" size={40} />
              <p className="text-sm text-slate-300">No messages yet</p>
              <p className="mt-1 text-xs text-slate-400">Start with a short request or tap a suggested prompt below.</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {QUICK_REPLY_CHIPS.slice(0, 3).map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => appendQuickReply(chip)}
                    className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-100"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const decoded = decodeChatMessage(msg.message);
              const attachment = decoded.attachment;

              return (
                <div key={msg.id} className={`flex ${msg.isAdmin ? 'justify-start' : 'justify-end'}`}>
                  <div
                    className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${
                      msg.isAdmin
                        ? 'rounded-tl-sm bg-[#252b3d] text-gray-200'
                        : 'rounded-tr-sm bg-cyan-500 text-white'
                    }`}
                  >
                    {msg.isAdmin ? <p className="mb-1 text-[10px] font-semibold text-cyan-400">Support</p> : null}

                    {attachment?.type === 'image' ? (
                      <button type="button" onClick={() => setPreviewAttachment(attachment)} className="mb-2 block w-full overflow-hidden rounded-lg">
                        <img src={attachment.dataUrl} alt={attachment.name || 'Chat attachment'} className="max-h-52 w-full rounded-lg object-cover" />
                      </button>
                    ) : null}

                    {attachment?.type === 'video' ? (
                      <div className="mb-2 rounded-lg bg-black/20 p-2">
                        <video controls src={attachment.dataUrl} className="max-h-52 w-full rounded-lg" />
                        <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
                          <span className="truncate">{attachment.name}</span>
                          <button type="button" onClick={() => downloadAttachment(attachment)} className="inline-flex items-center gap-1 font-semibold">
                            <Download size={12} />
                            Download
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {attachment?.type === 'audio' ? (
                      <div className="mb-2 rounded-lg bg-black/20 p-3">
                        <audio controls src={attachment.dataUrl} className="w-full" />
                        <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
                          <span className="truncate">{attachment.name}</span>
                          <button type="button" onClick={() => downloadAttachment(attachment)} className="inline-flex items-center gap-1 font-semibold">
                            <Download size={12} />
                            Download
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {attachment?.type === 'file' ? (
                      <div className="mb-2 flex items-center justify-between gap-3 rounded-lg border border-white/15 bg-black/10 px-3 py-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <FileText size={16} className="shrink-0" />
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold">{attachment.name}</p>
                            <p className="text-[10px] opacity-70">{buildAttachmentLabel(attachment.type)}</p>
                          </div>
                        </div>
                        <button type="button" onClick={() => downloadAttachment(attachment)} className="inline-flex items-center gap-1 text-xs font-semibold">
                          <Download size={12} />
                          Download
                        </button>
                      </div>
                    ) : null}

                    {decoded.text ? <p className="whitespace-pre-wrap break-words">{decoded.text}</p> : null}
                    <div className={`mt-1 flex items-center justify-between gap-3 text-[10px] ${msg.isAdmin ? 'text-gray-500' : 'text-white/70'}`}>
                      <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {!msg.isAdmin ? <span>{msg.read ? 'Seen by support' : 'Delivered'}</span> : null}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSend} className="shrink-0 border-t border-white/10 bg-[#09131b] px-3 py-3">
          <div className="mb-3 flex flex-wrap gap-2">
            {QUICK_REPLY_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => appendQuickReply(chip)}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-slate-200 transition-colors hover:border-cyan-300/30 hover:bg-cyan-300/10 hover:text-cyan-100"
              >
                {chip}
              </button>
            ))}
          </div>

          {selectedAttachment ? (
            <div className="mb-2 flex items-center justify-between gap-3 rounded-xl border border-gray-700 bg-[#111827] px-3 py-2">
              <div className="flex min-w-0 items-center gap-2">
                {selectedAttachment.type === 'image' ? <ImageIcon size={16} className="text-cyan-300" /> : null}
                {selectedAttachment.type === 'video' ? <Video size={16} className="text-cyan-300" /> : null}
                {selectedAttachment.type === 'audio' ? <Music2 size={16} className="text-cyan-300" /> : null}
                {selectedAttachment.type === 'file' ? <FileText size={16} className="text-cyan-300" /> : null}
                <div className="min-w-0">
                  <p className="truncate text-sm text-white">{selectedAttachment.name}</p>
                  <p className="text-[11px] text-gray-400">{buildAttachmentLabel(selectedAttachment.type)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setPreviewAttachment(selectedAttachment)} className="text-xs font-semibold text-cyan-300">
                  Preview
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedAttachment(null)}
                  className="rounded-full bg-red-500 p-1 text-white"
                  aria-label="Remove selected attachment"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          ) : null}

          {attachmentError ? <p className="mb-2 text-xs text-amber-400">{attachmentError}</p> : null}

          {showEmojiPanel ? (
            <div className="mb-2 flex flex-wrap gap-1.5 rounded-lg border border-gray-700 bg-[#111827] p-2">
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => appendEmoji(emoji)}
                  className="text-lg leading-none transition-transform hover:scale-110"
                >
                  {emoji}
                </button>
              ))}
            </div>
          ) : null}

          <div className="flex items-end gap-2">
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
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#252b3d] transition-colors hover:bg-[#2f374a] shrink-0"
              aria-label="Attach file"
            >
              <Paperclip size={16} className="text-gray-200" />
            </button>

            <button
              type="button"
              onClick={() => setShowEmojiPanel((prev) => !prev)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#252b3d] transition-colors hover:bg-[#2f374a] shrink-0"
              aria-label="Open emoji picker"
            >
              <Smile size={16} className="text-gray-200" />
            </button>

            <textarea
              value={newMessage}
              onChange={(event) => {
                const nextValue = event.target.value;
                setNewMessage(nextValue);
                if (realtimeEnabled && username) {
                  void sendRealtimeTyping(username, username, 'user', nextValue.trim().length > 0);
                }
              }}
              onKeyDown={handleComposerKeyDown}
              rows={1}
              placeholder="Describe the issue, upload evidence, or ask for a reset..."
              className="max-h-28 min-h-[44px] flex-1 resize-none rounded-3xl border border-gray-600 bg-[#252b3d] px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
            />

            <button
              type="submit"
              disabled={sending || (!newMessage.trim() && !selectedAttachment)}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-cyan-500 transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50 shrink-0"
              aria-label="Send message"
            >
              {sending ? <Loader2 size={18} className="animate-spin text-white" /> : <Send size={18} className="text-white" />}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}