import { useEffect, useState } from 'react';
import { Bell, Clock, Trash2, AlertTriangle, Info } from 'lucide-react';
import { toast } from 'sonner';
import { buildAdminAuthHeaders } from '../services/supabaseAuth';
import { RUNTIME_ENVIRONMENT } from '../services/runtimeEnvironment';

interface NotificationRecord {
  id: string;
  title: string;
  message: string;
  priority: 'normal' | 'high' | 'urgent';
  recipientType: string;
  recipientFilter: string | null;
  sentBy: string;
  sentAt: string;
}

interface NotificationsProps {
  setModalType: any;
  formatRelativeTime: (date: string) => string;
}

const PRIORITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  normal: { bg: 'bg-green-500/20', text: 'text-green-300', label: 'Normal' },
  high: { bg: 'bg-blue-500/20', text: 'text-blue-300', label: 'High Priority' },
  urgent: { bg: 'bg-red-500/20', text: 'text-red-300', label: 'Urgent' },
};

const RECIPIENT_LABELS: Record<string, string> = {
  all: 'All Users',
  active: 'Active Users',
  vip: 'VIP',
  specific: 'Specific User',
};

export default function Notifications({
  setModalType,
  formatRelativeTime,
}: NotificationsProps) {
  const serverUrl = RUNTIME_ENVIRONMENT.apiBaseUrl;
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchNotifications = async () => {
    try {
      const headers = await buildAdminAuthHeaders();
      const response = await fetch(`${serverUrl}/admin/notifications`, { headers });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error ?? 'Failed to fetch');
      setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNotifications(); }, []);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const headers = await buildAdminAuthHeaders();
      const response = await fetch(`${serverUrl}/admin/notifications/${id}`, {
        method: 'DELETE',
        headers,
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? 'Delete failed');
      }
      setNotifications(prev => prev.filter(n => n.id !== id));
      toast.success('Notification deleted.');
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to delete notification');
    } finally {
      setDeletingId(null);
    }
  };

  const getRecipientLabel = (n: NotificationRecord) => {
    if (n.recipientType === 'vip' && n.recipientFilter) return `VIP ${n.recipientFilter}+`;
    if (n.recipientType === 'specific' && n.recipientFilter) return `User: ${n.recipientFilter}`;
    return RECIPIENT_LABELS[n.recipientType] ?? n.recipientType;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Notifications</h2>
          <p className="text-gray-400 text-sm mt-1">Send announcements and alerts to users</p>
        </div>
        <button onClick={() => setModalType('notification')} className="flex items-center gap-2 bg-[#00D9FF] hover:bg-[#00c5e6] text-[#1a1f2e] px-4 py-2 rounded-lg font-semibold transition-colors">
          <Bell size={18} />
          Send Notification
        </button>
      </div>

      <div className="space-y-4">
        {loading && (
          <div className="bg-[#252b3d] rounded-lg p-8 text-center">
            <p className="text-gray-400">Loading notifications...</p>
          </div>
        )}
        {!loading && notifications.length === 0 && (
          <div className="bg-[#252b3d] rounded-lg p-8 text-center">
            <Info className="text-gray-500 mx-auto mb-2" size={32} />
            <p className="text-gray-400">No notifications sent yet.</p>
            <p className="text-gray-500 text-sm mt-1">Click "Send Notification" to create one.</p>
          </div>
        )}
        {notifications.map(n => {
          const ps = PRIORITY_STYLES[n.priority] ?? PRIORITY_STYLES.normal;
          return (
            <div key={n.id} className="bg-[#252b3d] rounded-lg p-6">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${n.priority === 'urgent' ? 'bg-red-500/20' : n.priority === 'high' ? 'bg-blue-500/20' : 'bg-green-500/20'}`}>
                  {n.priority === 'urgent' ? <AlertTriangle className="text-red-400" size={24} /> : <Bell className={n.priority === 'high' ? 'text-blue-400' : 'text-green-400'} size={24} />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold mb-1">{n.title}</h3>
                  <p className="text-gray-400 text-sm mb-2 whitespace-pre-line">{n.message}</p>
                  <div className="flex items-center flex-wrap gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Clock size={12} /> {formatRelativeTime(n.sentAt)}</span>
                    <span>Sent to: {getRecipientLabel(n)}</span>
                    <span className={`px-2 py-1 rounded ${ps.bg} ${ps.text}`}>{ps.label}</span>
                    <span>By: Customer Support</span>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(n.id)}
                  disabled={deletingId === n.id}
                  className="text-gray-500 hover:text-red-400 transition-colors p-1 flex-shrink-0 disabled:opacity-50"
                  aria-label="Delete notification"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
