import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router';
import { Header } from '../components/Header';
import { BottomNavigation } from '../components/BottomNavigation';
import { LiveChat } from '../components/LiveChat';
import { 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  Loader2,
  Send,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { getCurrentUsername } from '../services/referralSystem';

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
  const username = sessionUsername ?? 'ugreen';
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
      navigate('/login');
      return;
    }
    fetchTickets();
    fetchSupportLinks();
  }, [navigate, sessionUsername]);

  useEffect(() => {
    if (!sessionUsername) {
      return;
    }

    const intervalId = window.setInterval(() => {
      fetchTickets(true);
    }, 10000);

    return () => window.clearInterval(intervalId);
  }, [sessionUsername, username]);

  const fetchTickets = async (silent: boolean = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      let response = await fetch(`${serverUrl}/cs/tickets/${username}`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      if (!response.ok && username !== 'ugreen') {
        response = await fetch(`${serverUrl}/cs/tickets/ugreen`, {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        });
      }

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
    
    if (!subject || !message) {
      toast.error('Please fill in all fields.');
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`${serverUrl}/cs/create-ticket`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          username,
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
    const replyMessage = replyDrafts[ticketId]?.trim() ?? '';
    if (!replyMessage.trim()) {
      toast.error('Please enter a message.');
      return;
    }

    try {
      const response = await fetch(`${serverUrl}/cs/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          ticketId,
          message: replyMessage,
          respondedBy: username,
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
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'resolved':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'closed':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'urgent':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const sortedTickets = [...tickets].sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );

  return (
    <div className="size-full overflow-auto pb-20 bg-[#1a1f2e]">
      <Header onContactClick={() => setIsChatOpen(true)} />
      
      <div className="max-w-4xl mx-auto px-6 py-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Customer Support</h1>
          <p className="text-gray-400">Get help with your account, tasks, or payments</p>
        </div>

        {/* Contact Methods */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => setIsChatOpen(true)}
            className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4 rounded-lg flex items-center justify-center gap-3 hover:from-purple-700 hover:to-purple-800 transition-all"
          >
            <MessageSquare size={24} />
            <span className="font-semibold">Live Chat</span>
          </button>

          <a
            href={supportLinks.telegramUsername.startsWith('http') ? supportLinks.telegramUsername : `https://t.me/${supportLinks.telegramUsername}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-lg flex items-center justify-center gap-3 hover:from-blue-600 hover:to-blue-700 transition-all group"
          >
            <Send size={24} className="group-hover:scale-110 transition-transform" />
            <span className="font-semibold">Telegram Support</span>
          </a>
        </div>

        {/* Tickets List */}
        <div className="bg-[#252b3d] rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-bold text-white mb-4">My Support Tickets</h2>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-[#00D9FF]" size={40} />
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="mx-auto mb-4 text-gray-600" size={48} />
              <p className="text-gray-400 mb-2">No support tickets yet</p>
              <p className="text-gray-500 text-sm">Create your first ticket to get help from our support team</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className={`rounded-lg border overflow-hidden transition-all ${recentlyUpdatedTicketIds.includes(ticket.id) ? 'bg-[#22314f] border-[#5dade2] ring-2 ring-[#5dade2]/30 shadow-lg' : 'bg-[#1a1f2e] border-gray-700'}`}
                >
                  {/* Ticket Header */}
                  <div
                    onClick={() => setExpandedTicket(expandedTicket === ticket.id ? null : ticket.id)}
                    className="p-4 cursor-pointer hover:bg-[#252b3d] transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="text-white font-semibold text-lg mb-1">{ticket.subject}</h3>
                        <p className="text-gray-400 text-sm">
                          Ticket ID: {ticket.id}
                        </p>
                      </div>
                      {expandedTicket === ticket.id ? (
                        <ChevronUp className="text-gray-400" size={20} />
                      ) : (
                        <ChevronDown className="text-gray-400" size={20} />
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className={`flex items-center gap-1 px-3 py-1 rounded-full border ${getStatusColor(ticket.status)}`}>
                        {getStatusIcon(ticket.status)}
                        <span className="text-xs font-semibold uppercase">{ticket.status}</span>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-semibold ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority.toUpperCase()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {ticket.category}
                      </div>
                      <div className="text-xs text-gray-500 ml-auto">
                        {new Date(ticket.createdAt).toLocaleString()}
                      </div>
                    </div>
                    {recentlyUpdatedTicketIds.includes(ticket.id) && (
                      <p className="text-xs font-semibold text-[#8fdcff] mt-3">New activity</p>
                    )}
                  </div>

                  {/* Ticket Details */}
                  {expandedTicket === ticket.id && (
                    <div className="border-t border-gray-700 p-4">
                      {/* Original Message */}
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                            {ticket.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-white font-semibold text-sm">{ticket.username}</p>
                            <p className="text-gray-500 text-xs">{new Date(ticket.createdAt).toLocaleString()}</p>
                          </div>
                        </div>
                        <p className="text-gray-300 bg-[#252b3d] p-3 rounded-lg">{ticket.message}</p>
                      </div>

                      {/* Responses */}
                      {ticket.responses.length > 0 && (
                        <div className="space-y-3 mb-4">
                          {ticket.responses.map((response) => (
                            <div key={response.id}>
                              <div className="flex items-center gap-2 mb-2">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${response.isAdmin ? 'bg-purple-500' : 'bg-blue-500'}`}>
                                  {response.respondedBy.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="text-white font-semibold text-sm">
                                    {response.respondedBy}
                                    {response.isAdmin && <span className="ml-2 text-xs bg-purple-500 px-2 py-0.5 rounded">Support</span>}
                                  </p>
                                  <p className="text-gray-500 text-xs">{new Date(response.createdAt).toLocaleString()}</p>
                                </div>
                              </div>
                              <p className="text-gray-300 bg-[#252b3d] p-3 rounded-lg ml-10">{response.message}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reply Form */}
                      {ticket.status !== 'closed' && ticket.status !== 'resolved' && (
                        <div>
                          {replyingTo === ticket.id ? (
                            <div className="space-y-3">
                              <textarea
                                value={replyDrafts[ticket.id] ?? ''}
                                onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [ticket.id]: e.target.value }))}
                                placeholder="Type your reply..."
                                rows={3}
                                className="w-full px-4 py-2 bg-[#252b3d] border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-[#00D9FF] focus:outline-none resize-none"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleReply(ticket.id)}
                                  className="flex-1 bg-[#00D9FF] text-white py-2 px-4 rounded-lg font-semibold hover:bg-[#00c0e6] transition-colors flex items-center justify-center gap-2"
                                >
                                  <Send size={16} />
                                  Send Reply
                                </button>
                                <button
                                  onClick={() => {
                                    setReplyingTo(null);
                                    setReplyDrafts((prev) => {
                                      const next = { ...prev };
                                      delete next[ticket.id];
                                      return next;
                                    });
                                  }}
                                  className="px-4 bg-gray-700 text-white py-2 rounded-lg font-semibold hover:bg-gray-600 transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => setReplyingTo(ticket.id)}
                              className="w-full bg-gray-700 text-white py-2 rounded-lg font-semibold hover:bg-gray-600 transition-colors"
                            >
                              Reply to Ticket
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <LiveChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} username={username} />
      <BottomNavigation />
    </div>
  );
}