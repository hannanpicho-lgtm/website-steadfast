import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Phone, Minimize2 } from 'lucide-react';
import { useLocation } from 'react-router';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { getCurrentUsername } from '../services/referralSystem';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'support';
  timestamp: Date;
}

interface SupportLinks {
  whatsappNumber: string;
  telegramUsername: string;
  supportEmail: string;
}

export function FloatingLiveChat() {
  const location = useLocation();
  const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a1c55d7e`;
  const currentUsername = getCurrentUsername();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [showNotification, setShowNotification] = useState(true);
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [supportLinks, setSupportLinks] = useState<SupportLinks>({
    whatsappNumber: '1234567890',
    telegramUsername: 'steadfastdigital',
    supportEmail: 'support@steadfastdigital.com',
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const loadSupportLinks = async () => {
      try {
        const response = await fetch(`${serverUrl}/cs/support-links`, {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          return;
        }
        setSupportLinks({
          whatsappNumber: typeof payload?.whatsappNumber === 'string' ? payload.whatsappNumber : '1234567890',
          telegramUsername: typeof payload?.telegramUsername === 'string' ? payload.telegramUsername : 'steadfastdigital',
          supportEmail: typeof payload?.supportEmail === 'string' ? payload.supportEmail : 'support@steadfastdigital.com',
        });
      } catch {
        // Keep defaults if support links cannot be loaded.
      }
    };

    void loadSupportLinks();
  }, [serverUrl]);

  useEffect(() => {
    if (!isOpen || isMinimized || !currentUsername) {
      return;
    }

    let cancelled = false;

    const loadMessages = async () => {
      try {
        setLoadingMessages(true);
        const response = await fetch(`${serverUrl}/cs/chat/${currentUsername}`, {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        });
        const payload = await response.json().catch(() => ([]));
        if (!response.ok || cancelled) {
          return;
        }

        const nextMessages = Array.isArray(payload)
          ? payload.map((entry: any) => ({
              id: String(entry.id ?? `${entry.timestamp}-${entry.sender}`),
              text: String(entry.message ?? ''),
              sender: entry.isAdmin ? 'support' : 'user',
              timestamp: new Date(entry.timestamp ?? Date.now()),
            }))
          : [];

        setMessages(nextMessages);

        await fetch(`${serverUrl}/cs/chat/mark-read`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ username: currentUsername, viewer: 'user' }),
        });
      } catch {
        // Keep last known messages if polling fails.
      } finally {
        if (!cancelled) {
          setLoadingMessages(false);
        }
      }
    };

    void loadMessages();
    const intervalId = window.setInterval(() => {
      void loadMessages();
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [currentUsername, isMinimized, isOpen, serverUrl]);

  const handleSendMessage = async () => {
    if (!message.trim() || !currentUsername || sending) {
      return;
    }

    try {
      setSending(true);
      const trimmedMessage = message.trim();
      const response = await fetch(`${serverUrl}/cs/chat/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ username: currentUsername, message: trimmedMessage }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to send message');
      }

      setMessages((prev) => [
        ...prev,
        {
          id: String(payload?.message?.id ?? Date.now()),
          text: trimmedMessage,
          sender: 'user',
          timestamp: new Date(payload?.message?.timestamp ?? Date.now()),
        },
      ]);
      setMessage('');
    } catch (error) {
      console.error('Error sending live chat message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
    setShowNotification(false);
    setIsMinimized(false);
  };

  const handleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  // Don't show on login page - but still render the component to keep hooks consistent
  const shouldShow = location.pathname !== '/login';

  return (
    <>
      {shouldShow && (
        <>
          {/* Floating Chat Button */}
          {!isOpen && (
            <button
              onClick={toggleChat}
              className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-[#00D9FF] to-[#00b8d4] text-white rounded-full p-4 shadow-2xl hover:shadow-[#00D9FF]/50 transition-all duration-300 hover:scale-110 group"
              style={{
                boxShadow: '0 8px 32px rgba(0, 217, 255, 0.4)',
              }}
            >
              <MessageCircle size={28} className="animate-pulse" />
              {showNotification && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold animate-bounce">
                  1
                </span>
              )}
              <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                Need Help? Chat with us!
              </span>
            </button>
          )}

          {/* Chat Window */}
          {isOpen && (
            <div
              className={`fixed bottom-6 right-6 z-50 bg-white rounded-2xl shadow-2xl transition-all duration-300 ${
                isMinimized ? 'w-80 h-16' : 'w-96 h-[600px]'
              }`}
              style={{
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              }}
            >
              {/* Chat Header */}
              <div className="bg-gradient-to-r from-[#1a1f2e] to-[#2a3f4e] text-white p-4 rounded-t-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 bg-[#00D9FF] rounded-full flex items-center justify-center">
                      <MessageCircle size={20} />
                    </div>
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span>
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">Steadfast Support</h3>
                    <p className="text-xs text-gray-300">Live support messaging</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleMinimize}
                    className="hover:bg-white/10 p-2 rounded-lg transition-colors"
                  >
                    <Minimize2 size={18} />
                  </button>
                  <button
                    onClick={toggleChat}
                    className="hover:bg-white/10 p-2 rounded-lg transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {!isMinimized && (
                <>
                  {/* Messages Area */}
                  <div className="h-[420px] overflow-y-auto p-4 bg-gray-50">
                    {loadingMessages && messages.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-sm text-gray-500">
                        Loading conversation...
                      </div>
                    ) : !currentUsername ? (
                      <div className="h-full flex items-center justify-center text-center text-sm text-gray-500 px-6">
                        Log in to use live chat, or contact support using WhatsApp or Telegram below.
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-center text-sm text-gray-500 px-6">
                        No messages yet. Start the conversation and support will reply here.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${
                            msg.sender === 'user' ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          <div
                            className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                              msg.sender === 'user'
                                ? 'bg-[#00D9FF] text-white rounded-br-none'
                                : 'bg-white text-gray-800 rounded-bl-none shadow-md'
                            }`}
                          >
                            <p className="text-sm leading-relaxed">{msg.text}</p>
                            <p
                              className={`text-xs mt-1 ${
                                msg.sender === 'user' ? 'text-white/70' : 'text-gray-500'
                              }`}
                            >
                              {msg.timestamp.toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </div>
                        ))}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </div>

                  {/* Quick Actions */}
                  <div className="px-4 py-2 bg-gray-100 border-t border-gray-200">
                    <p className="text-xs text-gray-600 mb-2">Quick Contact:</p>
                    <div className="flex gap-2">
                      <a
                        href={`https://wa.me/${supportLinks.whatsappNumber}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 bg-[#25D366] hover:bg-[#20bd5a] text-white py-2 px-3 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2"
                      >
                        <Phone size={14} />
                        WhatsApp
                      </a>
                      <a
                        href={`https://t.me/${supportLinks.telegramUsername}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 bg-[#0088cc] hover:bg-[#0077b5] text-white py-2 px-3 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2"
                      >
                        <Phone size={14} />
                        Telegram
                      </a>
                    </div>
                  </div>

                  {/* Input Area */}
                  <div className="p-4 border-t border-gray-200 bg-white rounded-b-2xl">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder={currentUsername ? 'Type your message...' : 'Log in to send messages'}
                        disabled={!currentUsername || sending}
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-[#00D9FF] focus:ring-2 focus:ring-[#00D9FF]/20 text-sm"
                      />
                      <button
                        onClick={() => void handleSendMessage()}
                        disabled={!message.trim() || !currentUsername || sending}
                        className="bg-[#00D9FF] hover:bg-[#00c5e6] disabled:bg-gray-300 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-all duration-200 hover:scale-105 disabled:scale-100"
                      >
                        <Send size={20} />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
}
