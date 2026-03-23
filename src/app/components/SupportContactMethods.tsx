import { MessageSquare, Send } from 'lucide-react';

interface SupportContactMethodsProps {
  telegramUsername: string;
  onOpenLiveChat: () => void;
  layout?: 'grid' | 'stack';
}

export function SupportContactMethods({
  telegramUsername,
  onOpenLiveChat,
  layout = 'grid',
}: SupportContactMethodsProps) {
  const telegramUrl = telegramUsername.startsWith('http')
    ? telegramUsername
    : `https://t.me/${telegramUsername}`;

  return (
    <div className={layout === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'flex flex-col gap-3'}>
      <a
        href={telegramUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-lg flex items-center justify-center gap-3 hover:from-blue-600 hover:to-blue-700 transition-all group"
      >
        <Send size={24} className="group-hover:scale-110 transition-transform" />
        <span className="font-semibold">Expert Team</span>
      </a>

      <button
        type="button"
        onClick={onOpenLiveChat}
        className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white p-4 rounded-lg flex items-center justify-center gap-3 hover:from-cyan-600 hover:to-blue-600 transition-all group"
      >
        <MessageSquare size={24} className="group-hover:scale-110 transition-transform" />
        <span className="font-semibold">Steadfast online CS</span>
      </button>
    </div>
  );
}
