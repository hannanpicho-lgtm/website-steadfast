import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import LiveChatAdmin from './LiveChatAdmin';
import { 
  MessageSquare, 
  Ticket,
  Send, 
  Loader2,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  User,
  Filter,
  Search,
  Link as LinkIcon,
  Plus,
  Edit,
  Trash2,
  Save,
  Eye
} from 'lucide-react';

interface TicketType {
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
  assignedTo: string | null;
}

interface ChatSummary {
  username: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  totalMessages: number;
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

export default function CustomerSupport() {
  const [activeTab, setActiveTab] = useState<'tickets' | 'chats' | 'links'>('tickets');
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Links management state
  const [whatsappNumber, setWhatsappNumber] = useState(defaultSupportLinks.whatsappNumber);
  const [telegramUsername, setTelegramUsername] = useState(defaultSupportLinks.telegramUsername);
  const [supportEmail, setSupportEmail] = useState(defaultSupportLinks.supportEmail);
  const [savedSupportLinks, setSavedSupportLinks] = useState<SupportLinks>(defaultSupportLinks);
  const [isEditingLinks, setIsEditingLinks] = useState(false);

  const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a1c55d7e`;

  const refreshActiveTab = () => {
    if (activeTab === 'tickets') {
      fetchTickets();
      return;
    }
    if (activeTab === 'chats') {
      fetchChats();
      return;
    }
    fetchSupportLinks();
  };

  useEffect(() => {
    if (activeTab === 'tickets') {
      fetchTickets();
    } else if (activeTab === 'chats') {
      fetchChats();
    } else if (activeTab === 'links') {
      fetchSupportLinks();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'links') {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (activeTab === 'tickets') {
        fetchTickets(true);
        return;
      }

      fetchChats(true);
    }, 10000);

    return () => window.clearInterval(intervalId);
  }, [activeTab]);

  const applySupportLinks = (links: SupportLinks) => {
    setWhatsappNumber(links.whatsappNumber);
    setTelegramUsername(links.telegramUsername);
    setSupportEmail(links.supportEmail);
    setSavedSupportLinks(links);
  };

  const fetchTickets = async (silent: boolean = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      const response = await fetch(`${serverUrl}/cs/admin/tickets`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tickets');
      }

      const data = await response.json();
      setTickets(data);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const fetchChats = async (silent: boolean = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      const response = await fetch(`${serverUrl}/cs/admin/chats`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch chats');
      }

      const data = await response.json();
      setChats(data);
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const fetchSupportLinks = async (silent: boolean = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      const response = await fetch(`${serverUrl}/cs/support-links`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch support links');
      }

      const data = await response.json();
      applySupportLinks({
        whatsappNumber: data.whatsappNumber ?? defaultSupportLinks.whatsappNumber,
        telegramUsername: data.telegramUsername ?? defaultSupportLinks.telegramUsername,
        supportEmail: data.supportEmail ?? defaultSupportLinks.supportEmail,
      });
    } catch (error) {
      console.error('Error fetching support links:', error);
      toast.error('Failed to load support links.');
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const saveSupportLinks = async () => {
    try {
      const response = await fetch(`${serverUrl}/cs/support-links`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          whatsappNumber,
          telegramUsername,
          supportEmail,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save support links');
      }

      const result = await response.json();
      applySupportLinks(result.links ?? {
        whatsappNumber,
        telegramUsername,
        supportEmail,
      });
      setIsEditingLinks(false);
      toast.success('Support links saved successfully.');
    } catch (error) {
      console.error('Error saving support links:', error);
      toast.error('Failed to save support links.');
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
          respondedBy: 'Admin',
          isAdmin: true,
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
      await fetchTickets();
      toast.success('Reply sent successfully.');
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error('Failed to send reply.');
    }
  };

  const handleUpdateStatus = async (ticketId: string, newStatus: string) => {
    try {
      const response = await fetch(`${serverUrl}/cs/update-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          ticketId,
          status: newStatus,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      await fetchTickets();
      toast.success('Ticket status updated.');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status.');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <AlertCircle className="text-blue-500" size={18} />;
      case 'in-progress':
        return <Clock className="text-yellow-500" size={18} />;
      case 'resolved':
        return <CheckCircle className="text-green-500" size={18} />;
      case 'closed':
        return <XCircle className="text-gray-500" size={18} />;
      default:
        return <AlertCircle className="text-gray-500" size={18} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-blue-100 text-blue-800';
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
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

  const filteredTickets = tickets
    .filter(ticket => {
      if (filterStatus !== 'all' && ticket.status !== filterStatus) return false;
      if (searchQuery && !ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) && 
          !ticket.username.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });

  const ticketStats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => t.status === 'in-progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Customer Support Management</h2>
        <button
          onClick={refreshActiveTab}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('tickets')}
          className={`px-6 py-3 font-semibold transition-colors relative ${
            activeTab === 'tickets'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <Ticket size={20} />
            Support Tickets
            {ticketStats.open > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{ticketStats.open}</span>
            )}
          </div>
        </button>
        <button
          onClick={() => setActiveTab('chats')}
          className={`px-6 py-3 font-semibold transition-colors relative ${
            activeTab === 'chats'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <MessageSquare size={20} />
            Live Chats
            {chats.filter(c => c.unreadCount > 0).length > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {chats.filter(c => c.unreadCount > 0).length}
              </span>
            )}
          </div>
        </button>
        <button
          onClick={() => setActiveTab('links')}
          className={`px-6 py-3 font-semibold transition-colors relative ${
            activeTab === 'links'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <LinkIcon size={20} />
            Support Links
          </div>
        </button>
      </div>

      {/* Tickets Tab */}
      {activeTab === 'tickets' && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Total Tickets</p>
              <p className="text-2xl font-bold text-gray-900">{ticketStats.total}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-600 mb-1">Open</p>
              <p className="text-2xl font-bold text-blue-900">{ticketStats.open}</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-600 mb-1">In Progress</p>
              <p className="text-2xl font-bold text-yellow-900">{ticketStats.inProgress}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-sm text-green-600 mb-1">Resolved</p>
              <p className="text-2xl font-bold text-green-900">{ticketStats.resolved}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by subject or username..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="in-progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          {/* Tickets List */}
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-blue-600" size={40} />
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <Ticket className="mx-auto mb-4 text-gray-400" size={48} />
              <p className="text-gray-600 mb-2">No tickets found</p>
              <p className="text-gray-400 text-sm">All tickets will appear here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTickets.map((ticket) => (
                <div key={ticket.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div
                    onClick={() => setSelectedTicket(selectedTicket === ticket.id ? null : ticket.id)}
                    className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <User size={16} className="text-gray-500" />
                          <span className="font-semibold text-gray-900">{ticket.username}</span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">{ticket.subject}</h3>
                        <p className="text-sm text-gray-500">Ticket ID: {ticket.id}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${getStatusColor(ticket.status)}`}>
                        {getStatusIcon(ticket.status)}
                        <span className="text-xs font-semibold uppercase">{ticket.status}</span>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-semibold ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority.toUpperCase()}
                      </div>
                      <div className="text-xs text-gray-500">{ticket.category}</div>
                      <div className="text-xs text-gray-500 ml-auto">
                        {new Date(ticket.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {selectedTicket === ticket.id && (
                    <div className="border-t border-gray-200 p-4 bg-gray-50">
                      <div className="mb-4">
                        <p className="text-sm text-gray-600 mb-2">Original Message:</p>
                        <p className="text-gray-900 bg-white p-3 rounded-lg border border-gray-200">{ticket.message}</p>
                      </div>

                      {ticket.responses.length > 0 && (
                        <div className="mb-4 space-y-3">
                          <p className="text-sm text-gray-600 font-semibold">Responses ({ticket.responses.length}):</p>
                          {ticket.responses.map((response) => (
                            <div key={response.id} className="bg-white p-3 rounded-lg border border-gray-200">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-semibold text-gray-900">
                                  {response.respondedBy}
                                  {response.isAdmin && <span className="ml-2 text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">Admin</span>}
                                </span>
                                <span className="text-xs text-gray-500">{new Date(response.createdAt).toLocaleString()}</span>
                              </div>
                              <p className="text-gray-700">{response.message}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdateStatus(ticket.id, 'in-progress')}
                            disabled={ticket.status === 'in-progress'}
                            className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
                          >
                            Mark In Progress
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(ticket.id, 'resolved')}
                            disabled={ticket.status === 'resolved'}
                            className="px-4 py-2 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
                          >
                            Mark Resolved
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(ticket.id, 'closed')}
                            disabled={ticket.status === 'closed'}
                            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
                          >
                            Close Ticket
                          </button>
                        </div>

                        {ticket.status !== 'closed' && (
                          <div className="space-y-2">
                            <textarea
                              value={replyDrafts[ticket.id] ?? ''}
                              onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [ticket.id]: e.target.value }))}
                              placeholder="Type your reply..."
                              rows={3}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none resize-none"
                            />
                            <button
                              onClick={() => handleReply(ticket.id)}
                              className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                            >
                              <Send size={16} />
                              Send Reply as Admin
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Chats Tab */}
      {activeTab === 'chats' && (
        <LiveChatAdmin />
      )}

      {/* Links Tab */}
      {activeTab === 'links' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Support Contact Links</h3>
              <p className="text-sm text-gray-500 mt-1">Manage the contact methods displayed on the Support page</p>
            </div>
            {!isEditingLinks ? (
              <button
                onClick={() => setIsEditingLinks(true)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                <Edit size={18} />
                Edit Links
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={saveSupportLinks}
                  className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-semibold"
                >
                  <Save size={18} />
                  Save Changes
                </button>
                <button
                  onClick={() => {
                    setWhatsappNumber(savedSupportLinks.whatsappNumber);
                    setTelegramUsername(savedSupportLinks.telegramUsername);
                    setSupportEmail(savedSupportLinks.supportEmail);
                    setIsEditingLinks(false);
                  }}
                  className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Links Configuration */}
          <div className="grid gap-6">
            {/* WhatsApp */}
            <div className="bg-white p-6 rounded-lg border-2 border-gray-200 hover:border-green-300 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-green-100 p-3 rounded-lg">
                  <MessageSquare className="text-green-600" size={24} />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900">WhatsApp Support</h4>
                  <p className="text-sm text-gray-500">Direct messaging via WhatsApp</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number (International Format)</label>
                  <input
                    type="text"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="15551234567"
                    disabled={!isEditingLinks}
                    className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-green-500 focus:outline-none ${isEditingLinks ? 'bg-white' : 'bg-gray-50 cursor-not-allowed'}`}
                  />
                  <p className="text-xs text-gray-500 mt-1">Format: Country code + number (no spaces or symbols). Example: 15551234567</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                  <p className="text-sm font-semibold text-green-800 mb-1">Generated Link:</p>
                  <code className="text-xs text-green-700 break-all">https://wa.me/{whatsappNumber}</code>
                </div>
              </div>
            </div>

            {/* Telegram */}
            <div className="bg-white p-6 rounded-lg border-2 border-gray-200 hover:border-blue-300 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Send className="text-blue-600" size={24} />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900">Telegram Support</h4>
                  <p className="text-sm text-gray-500">Direct messaging via Telegram</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Telegram Username or Group</label>
                  <input
                    type="text"
                    value={telegramUsername}
                    onChange={(e) => setTelegramUsername(e.target.value)}
                    placeholder="steadfastdigital"
                    disabled={!isEditingLinks}
                    className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none ${isEditingLinks ? 'bg-white' : 'bg-gray-50 cursor-not-allowed'}`}
                  />
                  <p className="text-xs text-gray-500 mt-1">Username (no @ symbol) or full invite link</p>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <p className="text-sm font-semibold text-blue-800 mb-1">Generated Link:</p>
                  <code className="text-xs text-blue-700 break-all">
                    {telegramUsername.startsWith('http') ? telegramUsername : `https://t.me/${telegramUsername}`}
                  </code>
                </div>
              </div>
            </div>

            {/* Email */}
            <div className="bg-white p-6 rounded-lg border-2 border-gray-200 hover:border-purple-300 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-purple-100 p-3 rounded-lg">
                  <User className="text-purple-600" size={24} />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900">Email Support</h4>
                  <p className="text-sm text-gray-500">Direct email communication</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Support Email Address</label>
                  <input
                    type="email"
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                    placeholder="support@steadfastdigital.com"
                    disabled={!isEditingLinks}
                    className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none ${isEditingLinks ? 'bg-white' : 'bg-gray-50 cursor-not-allowed'}`}
                  />
                  <p className="text-xs text-gray-500 mt-1">Valid email address for user support</p>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                  <p className="text-sm font-semibold text-purple-800 mb-1">Generated Link:</p>
                  <code className="text-xs text-purple-700 break-all">mailto:{supportEmail}</code>
                </div>
              </div>
            </div>
          </div>

          {/* Preview Section */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-lg border border-gray-300">
            <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Eye className="text-gray-600" size={20} />
              Live Preview (as seen on Support page)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <a
                href={`https://wa.me/${whatsappNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4 rounded-lg flex items-center justify-center gap-3 hover:from-green-700 hover:to-green-800 transition-all group cursor-pointer"
              >
                <MessageSquare size={24} className="group-hover:scale-110 transition-transform" />
                <span className="font-semibold">WhatsApp Support</span>
              </a>

              <a
                href={telegramUsername.startsWith('http') ? telegramUsername : `https://t.me/${telegramUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-lg flex items-center justify-center gap-3 hover:from-blue-600 hover:to-blue-700 transition-all group cursor-pointer"
              >
                <Send size={24} className="group-hover:scale-110 transition-transform" />
                <span className="font-semibold">Telegram Support</span>
              </a>

              <a
                href={`mailto:${supportEmail}`}
                className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 rounded-lg flex items-center justify-center gap-3 hover:from-purple-600 hover:to-purple-700 transition-all group cursor-pointer"
              >
                <User size={24} className="group-hover:scale-110 transition-transform" />
                <span className="font-semibold">Email Support</span>
              </a>
            </div>
            <p className="text-sm text-gray-600 mt-4 text-center">✨ Click the buttons above to test the links</p>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h5 className="font-semibold text-blue-900 mb-2">📝 Instructions:</h5>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Click "Edit Links" to modify the contact information</li>
              <li>WhatsApp: Enter number in international format (no + or spaces)</li>
              <li>Telegram: Enter username without @ symbol, or full invite link for groups</li>
              <li>Email: Enter a valid support email address</li>
              <li>Use the preview section to test your links before saving</li>
              <li>Click "Save Changes" to apply the new contact details to the Support page</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
