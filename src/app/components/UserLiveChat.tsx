import { useState, useEffect, useRef } from 'react';
import { X, Send, MessageCircle, Loader2, ImagePlus, Smile } from 'lucide-react';
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

interface UserLiveChatProps {
  isOpen: boolean;
  onClose: () => void;
}

const CHAT_IMAGE_PREFIX = '__img__:';
const MAX_CHAT_IMAGE_SIZE_BYTES = 350 * 1024;
const QUICK_EMOJIS = ['😀', '😁', '😂', '😊', '😍', '👍', '🙏', '🎉', '🔥', '💯'];

function decodeChatMessage(rawMessage: string) {
  if (!rawMessage.startsWith(CHAT_IMAGE_PREFIX)) {
    return { text: rawMessage, imageUrl: '' };
  }

  const payload = rawMessage.slice(CHAT_IMAGE_PREFIX.length);
  const newlineIndex = payload.indexOf('\n');
  if (newlineIndex === -1) {
    return { text: '', imageUrl: payload.trim() };
  }

  return {
    imageUrl: payload.slice(0, newlineIndex).trim(),
    text: payload.slice(newlineIndex + 1),
  };
}

export function UserLiveChat({ isOpen, onClose }: UserLiveChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedImageDataUrl, setSelectedImageDataUrl] = useState('');
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
    if ((!trimmedMessage && !selectedImageDataUrl) || !username) return;

    const outgoingMessage = selectedImageDataUrl
      ? `${CHAT_IMAGE_PREFIX}${selectedImageDataUrl}${trimmedMessage ? `\n${trimmedMessage}` : ''}`
      : trimmedMessage;

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
        setSelectedImageDataUrl('');
        setShowEmojiPanel(false);
        await fetchMessages(true);
      }
    } catch {
      // silently ignore
    } finally {
      setSending(false);
    }
  };

  const handlePickImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) {
      return;
    }

    if (!selectedFile.type.startsWith('image/')) {
      event.target.value = '';
      return;
    }

    if (selectedFile.size > MAX_CHAT_IMAGE_SIZE_BYTES) {
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (result) {
        setSelectedImageDataUrl(result);
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
                    {decoded.imageUrl ? (
                      <img
                        src={decoded.imageUrl}
                        alt="Chat attachment"
                        className="w-full max-h-52 object-cover rounded-lg mb-2"
                      />
                    ) : null}
                    {decoded.text ? <p className="whitespace-pre-wrap">{decoded.text}</p> : null}
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
          {selectedImageDataUrl ? (
            <div className="mb-2 relative inline-block">
              <img src={selectedImageDataUrl} alt="Selected attachment" className="h-16 w-16 object-cover rounded-md border border-gray-600" />
              <button
                type="button"
                onClick={() => setSelectedImageDataUrl('')}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                aria-label="Remove selected image"
              >
                <X size={12} />
              </button>
            </div>
          ) : null}

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
              accept="image/*"
              onChange={handlePickImage}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-9 h-9 bg-[#252b3d] hover:bg-[#2f374a] rounded-full flex items-center justify-center transition-colors shrink-0"
              aria-label="Attach image"
            >
              <ImagePlus size={16} className="text-gray-200" />
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
            disabled={(!newMessage.trim() && !selectedImageDataUrl) || sending}
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
