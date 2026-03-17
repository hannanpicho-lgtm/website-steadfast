import { useState, useEffect } from 'react';
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
