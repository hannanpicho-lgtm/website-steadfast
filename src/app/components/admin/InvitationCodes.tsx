import { useCallback, useEffect, useRef, useState } from 'react';
import { Copy, RefreshCw, Key, Users, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router';
import { buildAdminAuthHeaders, signOutAdminSession } from '../../services/supabaseAuth';
import { buildLoginRedirectState } from '../../services/loginRedirect';
import { projectId } from '@utils/supabase/info';

type AdminCodeEntry = {
  subAdminId: string;
  subAdminEmail: string;
  subAdminName: string;
  roleName: string;
  isSuperAdmin: boolean;
  code: string | null;
  usageCount: number;
  createdAt: string | null;
};

type InvitationCodesProps = {
  /** The Supabase user ID of the currently logged-in admin – used to skip showing super-admin's own row */
  currentAdminId: string;
};

export default function InvitationCodes({ currentAdminId }: InvitationCodesProps) {
  const navigate = useNavigate();
  const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a1c55d7e`;
  const [entries, setEntries] = useState<AdminCodeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const adminAuthRedirectedRef = useRef(false);

  const handleAdminError = (errorValue: unknown, fallbackMessage: string) => {
    const message = errorValue instanceof Error ? errorValue.message : fallbackMessage;
    const normalized = message.toLowerCase();
    const isAuthError = normalized.includes('session expired')
      || normalized.includes('access denied')
      || normalized.includes('not authorized')
      || normalized.includes('authorized admin account')
      || normalized.includes('sign in again');

    if (isAuthError) {
      if (!adminAuthRedirectedRef.current) {
        adminAuthRedirectedRef.current = true;
        toast.error(message);
        void signOutAdminSession();
        navigate('/login', {
          replace: true,
          state: buildLoginRedirectState('/admin', {
            adminRequired: true,
            authReason: normalized.includes('access denied') || normalized.includes('not authorized')
              ? 'admin-access-required'
              : 'session-expired',
            authMessage: message,
          }),
        });
      }

      return;
    }

    toast.error(message);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = await buildAdminAuthHeaders(false);
      const res = await fetch(`${serverUrl}/admin/invitation-codes`, { headers });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error ?? `Failed to load codes (${res.status})`);
      setEntries(Array.isArray(payload?.codes) ? payload.codes : []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load invitation codes';
      setError(msg);
      handleAdminError(err, 'Failed to load invitation codes');
    } finally {
      setLoading(false);
    }
  }, [serverUrl]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleGenerate = async (subAdminId: string, subAdminName: string) => {
    setGeneratingFor(subAdminId);
    try {
      const headers = await buildAdminAuthHeaders();
      const res = await fetch(`${serverUrl}/admin/invitation-codes/generate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ subAdminId }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error ?? `Failed to generate code (${res.status})`);

      toast.success(`New code generated for ${subAdminName}`);
      setEntries((prev) =>
        prev.map((e) =>
          e.subAdminId === subAdminId
            ? { ...e, code: payload.code, usageCount: 0, createdAt: payload.createdAt }
            : e,
        ),
      );
    } catch (err) {
      handleAdminError(err, 'Failed to generate code');
    } finally {
      setGeneratingFor(null);
    }
  };

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast.success('Code copied to clipboard');
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      toast.error('Failed to copy code');
    }
  };

  const subAdmins = entries.filter((e) => !e.isSuperAdmin);
  const withCodes = subAdmins.filter((e) => e.code !== null).length;
  const pendingCodes = subAdmins.length - withCodes;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#252b3d] border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="text-blue-400" size={18} />
            <p className="text-gray-400 text-xs">Sub-Admins</p>
          </div>
          <p className="text-2xl font-bold text-white">{subAdmins.length}</p>
        </div>
        <div className="bg-[#252b3d] border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Key className="text-green-400" size={18} />
            <p className="text-gray-400 text-xs">Active Codes</p>
          </div>
          <p className="text-2xl font-bold text-white">{withCodes}</p>
        </div>
        <div className="bg-[#252b3d] border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="text-yellow-400" size={18} />
            <p className="text-gray-400 text-xs">No Code Yet</p>
          </div>
          <p className="text-2xl font-bold text-white">{pendingCodes}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#252b3d] border border-gray-700 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h3 className="text-white font-semibold">Sub-Admin Invitation Codes</h3>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3">
            <AlertTriangle className="text-yellow-300 mt-0.5 shrink-0" size={14} />
            <p className="text-yellow-200 text-sm">{error}</p>
          </div>
        )}

        {loading && !entries.length ? (
          <div className="text-center text-gray-400 py-10 text-sm">Loading invitation codes…</div>
        ) : subAdmins.length === 0 ? (
          <div className="text-center text-gray-400 py-10 text-sm">
            No sub-admins found. Add admin users first.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#1a1f2e] border-b border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Admin</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Invitation Code</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Usage</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Generated</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {subAdmins.map((entry) => (
                  <tr key={entry.subAdminId} className="hover:bg-[#2c3e50] transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-white">{entry.subAdminName}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{entry.subAdminEmail}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-blue-500/20 text-blue-300">
                        {entry.roleName}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {entry.code ? (
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-[#00D9FF] bg-[#1a1f2e] px-3 py-1 rounded border border-gray-600 select-all">
                            {entry.code}
                          </span>
                          <button
                            type="button"
                            onClick={() => void handleCopy(entry.code!)}
                            className="text-gray-400 hover:text-[#00D9FF] transition-colors"
                            title="Copy code"
                          >
                            {copiedCode === entry.code ? (
                              <CheckCircle size={14} className="text-green-400" />
                            ) : (
                              <Copy size={14} />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-500 text-xs italic">No code yet</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <Users size={13} className="text-gray-400" />
                        <span className="text-sm text-white">{entry.usageCount}</span>
                        <span className="text-xs text-gray-500">
                          {entry.usageCount === 1 ? 'user' : 'users'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-400">
                      {entry.createdAt
                        ? new Date(entry.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })
                        : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => void handleGenerate(entry.subAdminId, entry.subAdminName)}
                        disabled={generatingFor === entry.subAdminId}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00D9FF]/10 hover:bg-[#00D9FF]/20 border border-[#00D9FF]/30 text-[#00D9FF] text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <RefreshCw
                          size={12}
                          className={generatingFor === entry.subAdminId ? 'animate-spin' : ''}
                        />
                        {entry.code ? 'Regenerate' : 'Generate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info note */}
      <div className="flex items-start gap-3 rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
        <Key className="text-blue-400 mt-0.5 shrink-0" size={16} />
        <div className="text-sm text-gray-300 leading-5">
          <span className="font-semibold text-white">How it works: </span>
          Share a sub-admin's invitation code with users they manage. When a user enters the code
          during sign-up, they are linked to that sub-admin's portfolio. Sub-admins can only view
          and manage users assigned to them. Regenerating a code does not affect existing linked
          users.
        </div>
      </div>
    </div>
  );
}
