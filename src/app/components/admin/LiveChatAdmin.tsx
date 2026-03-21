import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { projectId } from '@utils/supabase/info';
import { handleAdminAuthError } from '../../services/adminAuthError';
import { 
  MessageSquare, 
  Send, 
  Loader2,
  User,
  CheckCircle,
  Clock,
  Search,
  X
} from 'lucide-react';
import { buildAdminAuthHeaders } from '../../services/supabaseAuth';
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
  lastMessageTime: string;
  unreadCount: number;
  totalMessages: number;
}

export default function LiveChatAdmin() {
  const navigate = useNavigate();
  const adminAuthRedirectedRef = useRef(false);
  const hasLoadedChatsRef = useRef(false);
  const [chatSummaries, setChatSummaries] = useState<ChatSummary[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a1c55d7e`;

  useEffect(() => {
    fetchChats();
    // Poll for updates every 3 seconds
    const interval = setInterval(fetchChats, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat);
      markMessagesAsRead(selectedChat);
      // Poll for new messages in the selected chat
      const interval = setInterval(() => {
        fetchMessages(selectedChat);
        markMessagesAsRead(selectedChat);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [selectedChat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
    } catch (error) {
      handleAdminAuthError({
        errorValue: error,
        fallbackMessage: 'Failed to load chats',
        navigate,
        redirectedRef: adminAuthRedirectedRef,
        suppressToast: true,
      });
    } finally {
      if (!hasLoadedChatsRef.current) {
        setLoading(false);
      }
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
      setMessages(data);
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
        await fetchChats();
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
    
    if (!newMessage.trim() || !selectedChat) return;

    try {
      setSending(true);
      const response = await fetch(`${serverUrl}/cs/chat/send`, {
        method: 'POST',
        headers: await buildAdminAuthHeaders(),
        body: JSON.stringify({
          username: selectedChat,
          message: newMessage,
          isAdmin: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      setNewMessage('');
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

  const filteredChats = chatSummaries.filter(chat =>
    chat.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="grid grid-cols-3 gap-6 h-[700px]">
      {/* Chat List */}
      <div className="col-span-1 bg-white rounded-lg border border-gray-200 flex flex-col">
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
                  <p className="text-sm text-gray-600 truncate mb-1">{chat.lastMessage}</p>
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
      <div className="col-span-2 bg-white rounded-lg border border-gray-200 flex flex-col">
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
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <p className="text-xs text-gray-500">Online</p>
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
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
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
                          <p className="text-sm break-words">{msg.message}</p>
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
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input Area */}
            <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-200">
              <div className="flex gap-2">
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
                  disabled={sending || !newMessage.trim()}
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
  );
}
