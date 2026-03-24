import { useState, useEffect, useRef } from 'react';
import { X, Send, MessageCircle, Loader2, Paperclip, Smile, Download, FileText, Image as ImageIcon, Video, Music2 } from 'lucide-react';
import { projectId, publicAnonKey } from '@utils/supabase/info';
import { getCurrentUsername } from '../services/referralSystem';

interface ChatMessage {
  id: string;
  message: string;
  sender: string;
  isAdmin: boolean;
  timestamp: string;
  read: boolean;
}

type ChatAttachmentType = 'image' | 'video' | 'audio' | 'file';

type ChatAttachment = {
  type: ChatAttachmentType;
  dataUrl: string;
  name: string;
  mimeType: string;
  size: number;
};

interface UserLiveChatProps {
  isOpen: boolean;
  onClose: () => void;
}

const CHAT_IMAGE_PREFIX = '__img__:';
const CHAT_ATTACHMENT_PREFIX = '__att__:';
const CHAT_ATTACHMENT_PREFIX_LEGACY = '__att_:';
const MAX_CHAT_ATTACHMENT_SIZE_BYTES = 250 * 1024;
const QUICK_EMOJIS = ['😀', '😁', '😂', '😊', '😉', '😍', '🤩', '😎', '🙂', '😌', '🤝', '👏', '👍', '🙏', '💪', '🎯', '🎉', '✨', '🔥', '💯', '✅', '⭐', '💡', '📌'];

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

function isChatAttachmentType(value: unknown): value is ChatAttachmentType {
  return value === 'image' || value === 'video' || value === 'audio' || value === 'file';
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

function encodeChatMessage(text: string, attachment: ChatAttachment | null) {
  if (!attachment) {
    return text;
  }

  return `${CHAT_ATTACHMENT_PREFIX}${JSON.stringify({ text, attachment })}`;
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a1c55d7e`;
  const username = getCurrentUsername();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async (silent = false) => {
    if (!username) return;
    try {
      if (!silent) setLoading(true);
      const response = await fetch(`${serverUrl}/cs/chat/${username}`, {
        credentials: 'include',
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch {
      // silently ignore
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const markRead = async () => {
    if (!username) return;
    try {
      await fetch(`${serverUrl}/cs/chat/mark-read`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ username, viewer: 'user' }),
      });
    } catch {
      // silently ignore
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    fetchMessages();
    markRead();
    pollRef.current = window.setInterval(() => {
      fetchMessages(true);
      markRead();
    }, 3000);
    return () => {
      if (pollRef.current !== null) window.clearInterval(pollRef.current);
    };
  }, [isOpen, username]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedMessage = newMessage.trim();
    if ((!trimmedMessage && !selectedAttachment) || !username) return;

    const outgoingMessage = encodeChatMessage(trimmedMessage, selectedAttachment);

    try {
      setSending(true);
      const response = await fetch(`${serverUrl}/cs/chat/send`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ username, message: outgoingMessage, isAdmin: false }),
      });
      if (response.ok) {
        setNewMessage('');
        setSelectedAttachment(null);
        setAttachmentError('');
        setShowEmojiPanel(false);
        await fetchMessages(true);
      }
    } catch {
      // silently ignore
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
        setAttachmentError('');
      }
    };
    reader.readAsDataURL(selectedFile);
    event.target.value = '';
  };

  const appendEmoji = (emoji: string) => {
    setNewMessage((prev) => `${prev}${emoji}`);
  };

  if (!isOpen) return null;

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

      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-[60]" onClick={onClose} />

      {/* Chat panel */}
      <div className="fixed bottom-24 right-6 w-[360px] flex flex-col bg-[#1a1f2e] rounded-xl shadow-2xl z-[60] border border-gray-700 overflow-hidden" style={{ height: '480px' }}>
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <MessageCircle size={18} className="text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">Steadfast Online CS</p>
              <p className="text-white/80 text-xs">We typically reply instantly</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white hover:bg-white/20 rounded p-1 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="animate-spin text-cyan-400" size={28} />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageCircle className="text-gray-600 mb-3" size={40} />
              <p className="text-gray-400 text-sm">No messages yet</p>
              <p className="text-gray-500 text-xs mt-1">Send a message to start the conversation</p>
            </div>
          ) : (
            messages.map((msg) => {
              const decoded = decodeChatMessage(msg.message);
              const attachment = decoded.attachment;
              return (
                <div key={msg.id} className={`flex ${msg.isAdmin ? 'justify-start' : 'justify-end'}`}>
                  <div
                    className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                      msg.isAdmin
                        ? 'bg-[#252b3d] text-gray-200 rounded-tl-sm'
                        : 'bg-cyan-500 text-white rounded-tr-sm'
                    }`}
                  >
                    {msg.isAdmin && (
                      <p className="text-[10px] font-semibold text-cyan-400 mb-1">Support</p>
                    )}
                    {attachment?.type === 'image' ? (
                      <button type="button" onClick={() => setPreviewAttachment(attachment)} className="mb-2 block w-full overflow-hidden rounded-lg">
                        <img src={attachment.dataUrl} alt={attachment.name || 'Chat attachment'} className="w-full max-h-52 object-cover rounded-lg" />
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
                    {decoded.text ? <p className="whitespace-pre-wrap">{decoded.text}</p> : null}
                    {decoded.text ? <p className="whitespace-pre-wrap break-words">{decoded.text}</p> : null}
                    <p className={`text-[10px] mt-1 ${msg.isAdmin ? 'text-gray-500' : 'text-white/70'}`}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="px-3 py-3 border-t border-gray-700 shrink-0">
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
            <div className="mb-2 p-2 rounded-lg border border-gray-700 bg-[#111827] flex flex-wrap gap-1.5">
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => appendEmoji(emoji)}
                  className="text-lg leading-none hover:scale-110 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </div>
          ) : null}

          <div className="flex items-center gap-2">
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
              className="w-9 h-9 bg-[#252b3d] hover:bg-[#2f374a] rounded-full flex items-center justify-center transition-colors shrink-0"
              aria-label="Attach file"
            >
              <Paperclip size={16} className="text-gray-200" />
            </button>
            <button
              type="button"
              onClick={() => setShowEmojiPanel((prev) => !prev)}
              className="w-9 h-9 bg-[#252b3d] hover:bg-[#2f374a] rounded-full flex items-center justify-center transition-colors shrink-0"
              aria-label="Open emoji picker"
            >
              <Smile size={16} className="text-gray-200" />
            </button>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-[#252b3d] border border-gray-600 rounded-full px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
          />
          <button
            type="submit"
            disabled={(!newMessage.trim() && !selectedAttachment) || sending}
            className="w-9 h-9 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 rounded-full flex items-center justify-center transition-colors shrink-0"
          >
            {sending ? <Loader2 size={16} className="animate-spin text-white" /> : <Send size={16} className="text-white" />}
          </button>
          </div>
        </form>
      </div>
    </>
  );
}
