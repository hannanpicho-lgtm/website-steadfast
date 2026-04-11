import React, { useCallback, useEffect, useState } from 'react';
import { Clock, RefreshCw, Search, AlertCircle } from 'lucide-react';
import { buildAdminAuthHeaders } from '../services/supabaseAuth';

interface ActivityEvent {
  id: string;
  at: string;
  action: string;
  actor: string;
  detail: string;
}

const serverUrl = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID || 'gvqwvuqeenkusdayosty'}.supabase.co/functions/v1/make-server-a1c55d7e`;

const ACTION_COLORS: Record<string, { bg: string; text: string }> = {
  'admin-withdrawal-approve': { bg: 'bg-green-500/20', text: 'text-green-300' },
  'admin-withdrawal-reject': { bg: 'bg-red-500/20', text: 'text-red-300' },
  'admin-user-create': { bg: 'bg-blue-500/20', text: 'text-blue-300' },
  'admin-user-delete': { bg: 'bg-red-500/20', text: 'text-red-300' },
  'admin-user-delete-denied': { bg: 'bg-yellow-500/20', text: 'text-yellow-300' },
  'platform-settings-update': { bg: 'bg-purple-500/20', text: 'text-purple-300' },
  default: { bg: 'bg-gray-500/20', text: 'text-gray-300' },
};

function getActionStyle(action: string) {
  return ACTION_COLORS[action] ?? ACTION_COLORS.default;
}

function formatActionLabel(action: string): string {
  return action
    .replace(/^admin-/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function ActivityLog() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchLog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = await buildAdminAuthHeaders();
      const res = await fetch(`${serverUrl}/admin/activity-log?limit=200`, { headers });
      if (res.status === 401 || res.status === 403) {
        setError('Unauthorized — please refresh and log in again.');
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch activity log');
      const data = await res.json();
      setEvents(data.items ?? []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchLog(); }, [fetchLog]);

  const filtered = searchTerm
    ? events.filter(e =>
        e.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.actor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.detail.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : events;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Activity Log</h2>
          <p className="text-gray-400 text-sm mt-1">Track all admin actions on the platform</p>
        </div>
        <button
          onClick={fetchLog}
          disabled={loading}
          className="flex items-center gap-2 bg-[#00D9FF] hover:bg-[#00c4e6] text-[#1a1f2e] px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Search */}
      <div className="bg-[#252b3d] p-4 rounded-lg">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search actions, actors, or details..."
            aria-label="Search activity log"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#00D9FF] text-sm"
          />
        </div>
      </div>

      {/* Log entries */}
      {error ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 text-center">
          <AlertCircle className="mx-auto text-red-400 mb-2" size={24} />
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      ) : loading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-[#252b3d] rounded-lg p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="h-4 w-24 bg-gray-700/50 rounded" />
                <div className="h-3 w-32 bg-gray-700/40 rounded" />
                <div className="flex-1" />
                <div className="h-3 w-16 bg-gray-700/30 rounded" />
              </div>
              <div className="h-3 w-3/4 bg-gray-700/30 rounded mt-2" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#252b3d] rounded-lg p-12 text-center">
          <Clock className="mx-auto text-gray-600 mb-3" size={48} />
          <p className="text-gray-400">{searchTerm ? 'No matching activity found.' : 'No activity recorded yet.'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((event) => {
            const style = getActionStyle(event.action);
            return (
              <div key={event.id} className="bg-[#252b3d] border border-gray-700/50 rounded-lg px-4 py-3 hover:border-gray-600 transition-colors">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${style.bg} ${style.text}`}>
                    {formatActionLabel(event.action)}
                  </span>
                  <span className="text-gray-400 text-xs">by</span>
                  <span className="text-white text-sm font-medium">{event.actor}</span>
                  <span className="flex-1" />
                  <span className="text-gray-500 text-xs flex items-center gap-1">
                    <Clock size={12} />
                    {formatRelativeTime(event.at)}
                  </span>
                </div>
                <p className="text-gray-300 text-sm mt-1.5 leading-relaxed">{event.detail}</p>
              </div>
            );
          })}
          <p className="text-gray-500 text-xs text-center pt-2">
            Showing {filtered.length} of {events.length} events
          </p>
        </div>
      )}
    </div>
  );
}

export default React.memo(ActivityLog);
