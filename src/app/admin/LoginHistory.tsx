import React, { useCallback, useEffect, useState } from 'react';
import { Search, RefreshCw, MapPin, Globe, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { projectId } from '@utils/supabase/info';
import { buildAdminAuthHeaders } from '../services/supabaseAuth';

const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a1c55d7e`;

interface LoginEntry {
  id: string;
  username: string;
  at: string;
  ip: string;
  location: string;
}

export default function LoginHistory() {
  const [entries, setEntries] = useState<LoginEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUser, setFilterUser] = useState('');

  const fetchHistory = useCallback(async (username?: string) => {
    setLoading(true);
    try {
      const headers = await buildAdminAuthHeaders(false);
      const qs = username ? `?username=${encodeURIComponent(username)}` : '';
      const res = await fetch(`${serverUrl}/admin/login-history${qs}`, { headers });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setEntries(Array.isArray(data.entries) ? data.entries : []);
    } catch {
      toast.error('Failed to load login history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  const handleSearch = () => {
    const trimmed = filterUser.trim();
    void fetchHistory(trimmed || undefined);
  };

  const displayed = searchTerm
    ? entries.filter(
        (e) =>
          e.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
          e.ip.includes(searchTerm) ||
          e.location.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    : entries;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Login History</h2>
        <p className="text-gray-400 text-sm mt-1">View login events across all platform users</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-[#252b3d] p-4 rounded-lg">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Filter results by username, IP, or location…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#00D9FF]"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Load user…"
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
            className="w-40 px-3 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#00D9FF]"
          />
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-[#00D9FF] hover:bg-[#00c5e6] text-[#1a1f2e] font-semibold rounded-lg transition-colors text-sm"
          >
            Load
          </button>
          <button
            onClick={() => { setFilterUser(''); void fetchHistory(); }}
            className="p-2 bg-[#1a1f2e] hover:bg-[#2c3e50] border border-gray-600 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw size={16} className={`text-gray-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="bg-[#252b3d] rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 flex items-center justify-center gap-2">
            <RefreshCw size={16} className="animate-spin" /> Loading login history…
          </div>
        ) : displayed.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No login events found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#1a1f2e] border-b border-gray-700">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">User</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Date & Time</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">IP Address</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {displayed.map((entry) => (
                  <tr key={entry.id} className="hover:bg-[#2c3e50] transition-colors">
                    <td className="px-5 py-3 text-sm font-medium text-white">{entry.username}</td>
                    <td className="px-5 py-3 text-sm text-gray-300">
                      <div className="flex items-center gap-1.5">
                        <Clock size={13} className="text-gray-500" />
                        {entry.at ? new Date(entry.at).toLocaleString() : '—'}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-300">
                      <div className="flex items-center gap-1.5">
                        <Globe size={13} className="text-gray-500" />
                        <code className="text-xs bg-[#1a1f2e] px-2 py-0.5 rounded">{entry.ip || '—'}</code>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-300">
                      <div className="flex items-center gap-1.5">
                        <MapPin size={13} className="text-gray-500" />
                        {entry.location || '—'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && displayed.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-700 text-xs text-gray-500">
            Showing {displayed.length} login event{displayed.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  );
}
