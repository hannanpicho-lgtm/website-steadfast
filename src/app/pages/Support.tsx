import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Clock, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useLocation, useNavigate } from 'react-router';
import { Header } from '../components/Header';
import { BottomNavigation } from '../components/BottomNavigation';
import { UserLiveChat } from '../components/UserLiveChat';
import { SupportContactMethods } from '../components/SupportContactMethods';

import { projectId, publicAnonKey } from '@utils/supabase/info';
import { getCurrentUsername } from '../services/referralSystem';
import { buildLoginRedirectState } from '../services/loginRedirect';

interface Ticket {
  id: string;
  username: string;
  subject: string;
  message: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  responses: Array<{
    id: string;
    message: string;
    respondedBy: string;
    isAdmin: boolean;
    createdAt: string;
  }>;
}

interface SupportLinks {
  whatsappNumber: string;
  telegramUsername: string;
  supportEmail: string;
}

const defaultSupportLinks: SupportLinks = {
  whatsappNumber: '1234567890',
  telegramUsername: 'steadfastdigital',
  supportEmail: 'support@steadfastdigital.com',
};

export default function Support() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [recentlyUpdatedTicketIds, setRecentlyUpdatedTicketIds] = useState<string[]>([]);
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [supportLinks, setSupportLinks] = useState<SupportLinks>(defaultSupportLinks);
  const ticketUpdatedAtRef = useRef<Record<string, string>>({});
  const ticketHighlightTimeoutsRef = useRef<Record<string, number>>({});
  
  // New ticket form
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('general');
  const [priority, setPriority] = useState('medium');

  const sessionUsername = getCurrentUsername();
  const username = sessionUsername;
  const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a1c55d7e`;

  useEffect(() => {
    return () => {
      Object.values(ticketHighlightTimeoutsRef.current).forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, []);

  const markTicketsAsRecentlyUpdated = (ticketIds: string[]) => {
    if (ticketIds.length === 0) {
      return;
    }

    setRecentlyUpdatedTicketIds((prev) => [...new Set([...prev, ...ticketIds])]);

    ticketIds.forEach((ticketId) => {
      const existingTimeout = ticketHighlightTimeoutsRef.current[ticketId];
      if (existingTimeout) {
        window.clearTimeout(existingTimeout);
      }

      ticketHighlightTimeoutsRef.current[ticketId] = window.setTimeout(() => {
        setRecentlyUpdatedTicketIds((prev) => prev.filter((id) => id !== ticketId));
        delete ticketHighlightTimeoutsRef.current[ticketId];
      }, 12000);
    });
  };

  const applyFetchedTickets = (nextTickets: Ticket[], silent: boolean) => {
    const previousUpdatedAt = ticketUpdatedAtRef.current;
    const updatedTicketIds = silent
      ? nextTickets
          .filter((ticket) => previousUpdatedAt[ticket.id] && previousUpdatedAt[ticket.id] !== ticket.updatedAt)
          .map((ticket) => ticket.id)
      : [];

    ticketUpdatedAtRef.current = Object.fromEntries(nextTickets.map((ticket) => [ticket.id, ticket.updatedAt]));
    setTickets(nextTickets);
    markTicketsAsRecentlyUpdated(updatedTicketIds);
  };

  useEffect(() => {
    if (!sessionUsername) {
      navigate('/login', {
        replace: true,
        state: buildLoginRedirectState(location.pathname, {
          authReason: 'session-expired',
          authMessage: 'Your session ended. Please sign in again to access support tickets.',
        }),
      });
      return;
    }
    fetchTickets();
    fetchSupportLinks();
  }, [location.pathname, navigate, sessionUsername]);

  useEffect(() => {
    if (!sessionUsername || !username) {
      return;
    }

    const intervalId = window.setInterval(() => {
      fetchTickets(true);
    }, 10000);

    return () => window.clearInterval(intervalId);
  }, [sessionUsername, username]);

  const fetchTickets = async (silent: boolean = false) => {
    if (!username) {
      return;
    }

    try {
      if (!silent) {
        setLoading(true);
      }
      const response = await fetch(`${serverUrl}/me/support`, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tickets');
      }

      const data = await response.json();
      applyFetchedTickets(data, silent);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const fetchSupportLinks = async () => {
    try {
      const response = await fetch(`${serverUrl}/cs/support-links`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch support links');
      }

      const data = await response.json();
      setSupportLinks({
        whatsappNumber: data.whatsappNumber ?? defaultSupportLinks.whatsappNumber,
        telegramUsername: data.telegramUsername ?? defaultSupportLinks.telegramUsername,
        supportEmail: data.supportEmail ?? defaultSupportLinks.supportEmail,
      });
    } catch (error) {
      console.error('Error fetching support links:', error);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username) {
      toast.error('Your session ended. Please sign in again.');
      return;
    }
    
    if (!subject || !message) {
      toast.error('Please fill in all fields.');
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`${serverUrl}/cs/create-ticket`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          subject,
          message,
          category,
          priority,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create ticket');
      }

      await response.json();
      
      // Reset form
      setSubject('');
      setMessage('');
      setCategory('general');
      setPriority('medium');
      setShowNewTicket(false);
      
      // Refresh tickets
      await fetchTickets();
      
      toast.success('Support ticket created successfully.');
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast.error('Failed to create support ticket.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (ticketId: string) => {
    if (!username) {
      toast.error('Your session ended. Please sign in again.');
      return;
    }

    const replyMessage = replyDrafts[ticketId]?.trim() ?? '';
    if (!replyMessage.trim()) {
      toast.error('Please enter a message.');
      return;
    }

    try {
      const response = await fetch(`${serverUrl}/cs/respond`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          ticketId,
          message: replyMessage,
          isAdmin: false,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send reply');
      }

      setReplyDrafts((prev) => {
        const next = { ...prev };
        delete next[ticketId];
        return next;
      });
      setReplyingTo(null);
      await fetchTickets();
      toast.success('Reply sent successfully.');
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error('Failed to send reply.');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <AlertCircle className="text-blue-500" size={20} />;
      case 'in-progress':
        return <Clock className="text-yellow-500" size={20} />;
      case 'resolved':
        return <CheckCircle className="text-green-500" size={20} />;
      case 'closed':
        return <XCircle className="text-gray-500" size={20} />;
      default:
        return <AlertCircle className="text-gray-500" size={20} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-blue-900/30 text-blue-300 border-blue-700/40';
      case 'in-progress':
        return 'bg-yellow-900/30 text-yellow-300 border-yellow-700/40';
      case 'resolved':
        return 'bg-green-900/30 text-green-300 border-green-700/40';
      case 'closed':
        return 'bg-gray-800/40 text-gray-300 border-gray-600/40';
      default:
        return 'bg-gray-800/40 text-gray-300 border-gray-600/40';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low':
        return 'bg-green-900/30 text-green-300';
      case 'medium':
        return 'bg-yellow-900/30 text-yellow-300';
      case 'high':
        return 'bg-orange-900/30 text-orange-300';
      case 'urgent':
        return 'bg-red-900/30 text-red-300';
      default:
        return 'bg-gray-800/40 text-gray-300';
    }
  };

  const sortedTickets = [...tickets].sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );

  return (
    <div className="size-full overflow-auto pb-20 bg-[#0a0a0a]">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Customer Support</h1>
          <p className="text-gray-400">Get help with your account, tasks, or payments</p>
        </div>

        {/* Contact Methods */}
        <div className="mb-6">
          <SupportContactMethods
            telegramUsername={supportLinks.telegramUsername}
            onOpenLiveChat={() => setIsChatOpen(true)}
            layout="grid"
          />
        </div>

        {/* Welcome Card */}
        <div className="rounded-2xl overflow-hidden border border-amber-500/20 shadow-2xl">
          {/* Warm illustration area */}
          <div className="relative bg-gradient-to-br from-amber-600/30 via-orange-500/15 to-[#00D9FF]/15 px-6 pt-10 pb-8 text-center overflow-hidden">
            {/* Decorative blobs */}
            <div className="absolute top-0 right-0 w-56 h-56 bg-amber-400/10 rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-[#00D9FF]/10 rounded-full translate-y-1/2 -translate-x-1/3 pointer-events-none" />

            {/* SVG Illustration */}
            <div className="relative mx-auto mb-5 w-32 h-32">
              <svg viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <circle cx="70" cy="70" r="68" fill="url(#bgGrad)" />
                <circle cx="70" cy="70" r="68" stroke="url(#borderGrad)" strokeWidth="2" />
                {/* Sparkles */}
                <path d="M107 22 L108.5 18 L110 22 L114 23.5 L110 25 L108.5 29 L107 25 L103 23.5Z" fill="#FCD34D" />
                <circle cx="120" cy="55" r="2.5" fill="#FCD34D" opacity="0.5" />
                <circle cx="118" cy="90" r="2" fill="#FCD34D" opacity="0.5" />
                <circle cx="22" cy="45" r="2.5" fill="#00D9FF" opacity="0.5" />
                <circle cx="25" cy="100" r="3" fill="#00D9FF" opacity="0.45" />
                {/* Body */}
                <ellipse cx="70" cy="107" rx="28" ry="22" fill="#2563EB" />
                <ellipse cx="70" cy="110" rx="32" ry="9" fill="#1D4ED8" />
                {/* Neck */}
                <rect x="63" y="74" width="14" height="16" rx="7" fill="#FBBF7C" />
                {/* Head */}
                <circle cx="70" cy="58" r="22" fill="#FBBF7C" />
                {/* Hair */}
                <path d="M48 54 Q48 33 70 32 Q92 33 92 54 Q92 40 70 39 Q48 40 48 54Z" fill="#92400E" />
                <path d="M48 54 Q46 58 48 64 C48 54 52 51 48 54Z" fill="#92400E" />
                <path d="M92 54 Q94 58 92 64 C92 54 88 51 92 54Z" fill="#92400E" />
                {/* Happy eyes */}
                <path d="M60 56 Q63 52.5 66 56" stroke="#78350F" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                <path d="M74 56 Q77 52.5 80 56" stroke="#78350F" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                {/* Smile */}
                <path d="M61 67 Q70 75 79 67" stroke="#92400E" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                {/* Rosy cheeks */}
                <circle cx="57" cy="65" r="6" fill="#FCA5A5" fillOpacity="0.45" />
                <circle cx="83" cy="65" r="6" fill="#FCA5A5" fillOpacity="0.45" />
                {/* Headset band */}
                <path d="M47 52 Q47 28 70 28 Q93 28 93 52" stroke="#1F2937" strokeWidth="6" fill="none" strokeLinecap="round" />
                {/* Ear cups */}
                <rect x="42" y="49" width="10" height="16" rx="5" fill="#1F2937" />
                <rect x="44" y="51" width="6" height="12" rx="3" fill="#374151" />
                <rect x="88" y="49" width="10" height="16" rx="5" fill="#1F2937" />
                <rect x="90" y="51" width="6" height="12" rx="3" fill="#374151" />
                {/* Mic arm */}
                <path d="M47 63 Q40 68 37 76" stroke="#1F2937" strokeWidth="3" strokeLinecap="round" />
                <circle cx="36" cy="78" r="5" fill="#00D9FF" />
                <circle cx="36" cy="78" r="3" fill="#38BDF8" />
                <defs>
                  <radialGradient id="bgGrad" cx="50%" cy="40%" r="55%">
                    <stop offset="0%" stopColor="#3B1E08" stopOpacity="0.95" />
                    <stop offset="100%" stopColor="#0F1929" stopOpacity="0.98" />
                  </radialGradient>
                  <linearGradient id="borderGrad" x1="0" y1="0" x2="140" y2="140" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#00D9FF" stopOpacity="0.9" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            <h2 className="relative text-2xl font-bold text-white mb-3">
              Welcome to Steadfast Customer Service
            </h2>
            <p className="relative text-amber-100/75 text-sm max-w-sm mx-auto leading-relaxed">
              We're here for you — every question, every concern, every step of the way. Our team is dedicated to making your experience exceptional.
            </p>

            {/* Star row */}
            <div className="relative flex items-center justify-center gap-1 mt-4">
              {[0,1,2,3,4].map((i) => (
                <svg key={i} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
              <span className="text-amber-300 text-xs ml-1.5 font-semibold">5-star support</span>
            </div>
          </div>

          {/* Service promise strip */}
          <div className="grid grid-cols-3 bg-[#1e2535] border-t border-white/5">
            <div className="text-center px-3 py-4 border-r border-white/5">
              <div className="w-10 h-10 bg-amber-500/15 rounded-full flex items-center justify-center mx-auto mb-2 text-xl">⚡</div>
              <p className="text-white text-xs font-semibold">Fast Response</p>
              <p className="text-gray-500 text-xs mt-0.5">Quick replies</p>
            </div>
            <div className="text-center px-3 py-4 border-r border-white/5">
              <div className="w-10 h-10 bg-[#00D9FF]/15 rounded-full flex items-center justify-center mx-auto mb-2 text-xl">🛡️</div>
              <p className="text-white text-xs font-semibold">Secure & Private</p>
              <p className="text-gray-500 text-xs mt-0.5">Your data is safe</p>
            </div>
            <div className="text-center px-3 py-4">
              <div className="w-10 h-10 bg-green-500/15 rounded-full flex items-center justify-center mx-auto mb-2 text-xl">💬</div>
              <p className="text-white text-xs font-semibold">Always Available</p>
              <p className="text-gray-500 text-xs mt-0.5">24/7 support</p>
            </div>
          </div>
        </div>
      </div>

      <UserLiveChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />

      <BottomNavigation />
    </div>
  );
}