import { ArrowLeft, Send } from 'lucide-react';
import { Link } from 'react-router';
import { useEffect, useState } from 'react';
import steadfastLogo from '../../assets/4b611159e2ff0ca97c6252bef878e480dedd2a43.png';
import { projectId, publicAnonKey } from '@utils/supabase/info';

export default function ForgotPassword() {
  const [supportLinks, setSupportLinks] = useState({
    telegramUsername: 'steadfastdigital',
  });

  const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a1c55d7e`;

  useEffect(() => {
    const loadLinks = async () => {
      try {
        const response = await fetch(`${serverUrl}/cs/support-links`, {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          return;
        }

        setSupportLinks({
          telegramUsername: typeof payload?.telegramUsername === 'string' ? payload.telegramUsername : 'steadfastdigital',
        });
      } catch {
        // Keep defaults if network call fails.
      }
    };

    void loadLinks();
  }, [serverUrl]);

  const telegramUrl = supportLinks.telegramUsername.startsWith('http')
    ? supportLinks.telegramUsername
    : `https://t.me/${supportLinks.telegramUsername}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1f2e] to-[#2d3548] flex items-center justify-center px-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <img src={steadfastLogo} alt="Steadfast Digital" className="h-16 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-2">Password Help</h1>
          <p className="text-gray-300">For password assistance, contact support via WhatsApp or Telegram only.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="space-y-3">
            <a
              href={telegramUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-mobile-primary"
            >
              <Send size={20} />
              Contact via Telegram
            </a>

            <div className="mt-6 text-center">
              <Link to="/login" className="btn-mobile-text-action">
                <ArrowLeft size={16} />
                Back to Login
              </Link>
            </div>
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-6 text-center">
          <p className="text-gray-400 text-sm">
            Support channel: Telegram only.
          </p>
        </div>
      </div>
    </div>
  );
}
