import { X, MessageCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';

interface LiveChatBoxProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
}

export function LiveChatBox({ isOpen, onClose, message }: LiveChatBoxProps) {
  const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a1c55d7e`;
  const [supportLinks, setSupportLinks] = useState({
    whatsappNumber: '1234567890',
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
          whatsappNumber: typeof payload?.whatsappNumber === 'string' ? payload.whatsappNumber : '1234567890',
          telegramUsername: typeof payload?.telegramUsername === 'string' ? payload.telegramUsername : 'steadfastdigital',
        });
      } catch {
        // Keep defaults on failure.
      }
    };

    void loadSupportLinks();
  }, [serverUrl]);

  if (!isOpen) return null;

  const handleWhatsApp = () => {
    window.open(`https://wa.me/${supportLinks.whatsappNumber}`, '_blank');
  };

  const handleTelegram = () => {
    window.open(`https://t.me/${supportLinks.telegramUsername}`, '_blank');
  };

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 z-[60]"
        onClick={onClose}
      ></div>

      {/* Chat Box */}
      <div className="fixed bottom-24 right-6 w-[360px] bg-[#2c3e50] rounded-lg shadow-2xl z-[60] border border-gray-700/30 animate-slideUp">
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

          {/* WhatsApp Option */}
          <button
            onClick={handleWhatsApp}
            className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white p-4 rounded-lg mb-3 flex items-center gap-3 transition-colors group"
          >
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="#25D366">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
            </div>
            <div className="text-left flex-1">
              <div className="font-bold text-lg">WhatsApp</div>
              <div className="text-sm text-white/90">Chat with us instantly</div>
            </div>
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Telegram Option */}
          <button
            onClick={handleTelegram}
            className="w-full bg-[#0088cc] hover:bg-[#0077b5] text-white p-4 rounded-lg flex items-center gap-3 transition-colors group"
          >
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="#0088cc">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
            </div>
            <div className="text-left flex-1">
              <div className="font-bold text-lg">Telegram</div>
              <div className="text-sm text-white/90">Message us on Telegram</div>
            </div>
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Footer */}
        <div className="bg-[#252b3d] p-3 rounded-b-lg border-t border-gray-700/30">
          <p className="text-xs text-gray-400 text-center">
            Our support team is available 24/7
          </p>
        </div>
      </div>
    </>
  );
}