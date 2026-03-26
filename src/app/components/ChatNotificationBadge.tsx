import { useEffect, useState } from 'react';
import { MessageCircle, Sparkles, Wifi, WifiOff } from 'lucide-react';
import { fetchUserChatSummary, type ChatResponseState } from '../services/chatSupport';

interface ChatNotificationBadgeProps {
  username: string;
  onClick: () => void;
}

export function ChatNotificationBadge({ username, onClick }: ChatNotificationBadgeProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [connectionState, setConnectionState] = useState<'live' | 'reconnecting'>('live');
  const [responseState, setResponseState] = useState<ChatResponseState>('idle');

  useEffect(() => {
    void fetchUnreadCount();

    const interval = setInterval(() => {
      void fetchUnreadCount();
    }, 5000);

    return () => clearInterval(interval);
  }, [username]);

  const fetchUnreadCount = async () => {
    try {
      const summary = await fetchUserChatSummary();
      setUnreadCount(Number(summary.unreadAdminCount ?? 0));
      setResponseState(summary.responseState ?? 'idle');
      setConnectionState('live');
    } catch {
      setConnectionState('reconnecting');
    }
  };

  const responseLabel = unreadCount > 0
    ? `${unreadCount} new ${unreadCount === 1 ? 'reply' : 'replies'}`
    : responseState === 'awaiting-support'
      ? 'Waiting for support'
      : 'Live support ready';

  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-full border border-cyan-300/30 bg-[linear-gradient(135deg,#052a38_0%,#0b4e63_46%,#0f7b86_100%)] px-4 py-3 text-white shadow-[0_20px_50px_rgba(3,18,31,0.34)] transition-all hover:translate-y-[-1px] hover:shadow-[0_24px_55px_rgba(3,18,31,0.4)]"
      aria-label="Open live chat"
    >
      <div className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white/14">
        <MessageCircle size={24} />
        <span className="absolute -bottom-1 -right-1 rounded-full bg-white/90 p-1 text-slate-900">
          <Sparkles size={10} />
        </span>
      </div>

      <div className="hidden text-left sm:block">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold">Live Support</p>
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${connectionState === 'live' ? 'bg-emerald-400/20 text-emerald-100' : 'bg-amber-400/20 text-amber-100'}`}>
            {connectionState === 'live' ? <Wifi size={10} /> : <WifiOff size={10} />}
            {connectionState === 'live' ? 'Live' : 'Retrying'}
          </span>
        </div>
        <p className="text-xs text-cyan-50/85">{responseLabel}</p>
      </div>

      {unreadCount > 0 ? (
        <span className="absolute -top-2 -right-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-rose-500 px-1.5 text-xs font-bold text-white animate-pulse">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      ) : null}
    </button>
  );
}import { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { projectId, publicAnonKey } from '@utils/supabase/info';

interface ChatNotificationBadgeProps {
  username: string;
  onClick: () => void;
}

export function ChatNotificationBadge({ username, onClick }: ChatNotificationBadgeProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a1c55d7e`;

  useEffect(() => {
    fetchUnreadCount();
    // Poll every 5 seconds for new messages
    const interval = setInterval(fetchUnreadCount, 5000);
    return () => clearInterval(interval);
  }, [username]);

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch(`${serverUrl}/cs/chat/${username}`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      if (response.ok) {
        const messages = await response.json();
        const unread = messages.filter((msg: any) => !msg.read && msg.isAdmin).length;
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4 rounded-full shadow-2xl hover:from-purple-700 hover:to-purple-800 transition-all z-50 flex items-center justify-center"
      aria-label="Open live chat"
    >
      <MessageCircle size={28} />
      {unreadCount > 0 && (
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
}
