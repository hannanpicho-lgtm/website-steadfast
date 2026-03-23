import { X, MessageCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { projectId, publicAnonKey } from '@utils/supabase/info';
import { UserLiveChat } from './UserLiveChat';
import { SupportContactMethods } from './SupportContactMethods';

interface LiveChatBoxProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
}

export function LiveChatBox({ isOpen, onClose, message }: LiveChatBoxProps) {
  const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a1c55d7e`;
  const [isUserLiveChatOpen, setIsUserLiveChatOpen] = useState(false);
  const [supportLinks, setSupportLinks] = useState({
    telegramUsername: 'steadfastdigital',
  });

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
          telegramUsername: typeof payload?.telegramUsername === 'string' ? payload.telegramUsername : 'steadfastdigital',
        });
      } catch {
        // Keep defaults on failure.
      }
    };

    void loadSupportLinks();
  }, [serverUrl]);

  if (!isOpen && !isUserLiveChatOpen) return null;

  return (
    <>
      {isOpen ? (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black/50 z-[60]"
            onClick={onClose}
          ></div>

          {/* Chat Box */}
          <div className="fixed bottom-24 right-6 w-[360px] max-w-[calc(100vw-24px)] bg-[#2c3e50] rounded-lg shadow-2xl z-[60] border border-gray-700/30 animate-slideUp">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#5dade2] to-[#3498db] p-4 rounded-t-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle size={24} className="text-[#2c3e50]" />
            <h3 className="font-bold text-[#2c3e50]">Contact Support</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-[#2c3e50] hover:bg-white/20 rounded p-1 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {message && (
            <div className="mb-4 p-3 bg-[#5dade2]/10 border border-[#5dade2]/30 rounded-lg">
              <p className="text-[#5dade2] text-sm font-medium">{message}</p>
            </div>
          )}
          
          <p className="text-gray-300 mb-6 text-sm">
            Choose your preferred messaging platform to connect with our support team
          </p>

          <SupportContactMethods
            telegramUsername={supportLinks.telegramUsername}
            onOpenLiveChat={() => {
              setIsUserLiveChatOpen(true);
              onClose();
            }}
            layout="stack"
          />
        </div>

        {/* Footer */}
        <div className="bg-[#252b3d] p-3 rounded-b-lg border-t border-gray-700/30">
          <p className="text-xs text-gray-400 text-center">
            Our support team is available 9Am - 10PM EST
          </p>
        </div>

            </div>
          </>
        ) : null}

        <UserLiveChat
          isOpen={isUserLiveChatOpen}
          onClose={() => {
            setIsUserLiveChatOpen(false);
          }}
        />
    </>
  );
}