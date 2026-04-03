import { X, MessageCircle, ShieldCheck, Sparkles, Clock3 } from 'lucide-react';
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
    if (!isOpen) {
      return;
    }

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
  }, [isOpen, serverUrl]);

  if (!isOpen && !isUserLiveChatOpen) {
    return null;
  }

  return (
    <>
      {isOpen ? (
        <>
          <div className="fixed inset-0 z-[60] bg-black/50" onClick={onClose}></div>

          <div className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] left-3 right-3 z-[60] mx-auto w-auto max-w-[380px] sm:left-auto sm:right-6 overflow-hidden rounded-[28px] border border-cyan-200/20 bg-[linear-gradient(165deg,#0a1f2b_0%,#0d3442_58%,#102b38_100%)] shadow-[0_28px_70px_rgba(2,12,19,0.45)] animate-slideUp">
            <div className="flex items-center justify-between bg-[linear-gradient(120deg,rgba(72,223,255,0.95)_0%,rgba(21,180,196,0.88)_100%)] p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950/15 text-slate-950">
                  <MessageCircle size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-950">Steadfast Live Care</h3>
                  <p className="text-xs font-medium text-slate-900/70">Fast human follow-up with account-linked history</p>
                </div>
              </div>
              <button onClick={onClose} className="rounded-xl p-2 text-slate-950 transition-colors hover:bg-white/20">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 text-white">
              {message ? (
                <div className="mb-4 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-3">
                  <p className="text-sm font-medium text-cyan-100">{message}</p>
                </div>
              ) : null}

              <div className="mb-5 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <ShieldCheck className="mx-auto mb-2 text-cyan-200" size={18} />
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Secure</p>
                  <p className="mt-1 text-xs text-white/80">Session-bound replies</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <Clock3 className="mx-auto mb-2 text-cyan-200" size={18} />
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Fast</p>
                  <p className="mt-1 text-xs text-white/80">Live inbox polling</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <Sparkles className="mx-auto mb-2 text-cyan-200" size={18} />
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Modern</p>
                  <p className="mt-1 text-xs text-white/80">Rich attachments</p>
                </div>
              </div>

              <p className="mb-6 text-sm text-slate-200/80">
                Start with live chat for the fastest response, or switch to Telegram if you want an external support channel.
              </p>

              <SupportContactMethods
                telegramUsername={supportLinks.telegramUsername}
                onOpenLiveChat={() => {
                  setIsUserLiveChatOpen(true);
                }}
                layout="stack"
              />
            </div>

            <div className="border-t border-white/10 bg-slate-950/20 p-4">
              <p className="text-center text-xs text-slate-200/70">
                Live care team coverage: 9 AM – 10 PM EST. Message history stays attached to your account.
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
