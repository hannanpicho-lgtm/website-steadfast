import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { buildAdminAuthHeaders } from '../services/supabaseAuth';
import { projectId } from '@utils/supabase/info';

type PlatformMode = 'active' | 'readonly' | 'shutdown';
type PlatformModeStrategy = 'immediate' | 'phased' | 'auto-health';

type ModeRecord = {
  mode: PlatformMode;
  previousMode: PlatformMode | null;
  strategy: PlatformModeStrategy;
  initiatedBy: string;
  initiatedAt: string;
  gracePeriodMs: number;
  graceDeadline: string | null;
  autoRevertAt: string | null;
  reason: string;
  version: number;
};

type AuditEntry = {
  id: string;
  action: string;
  fromMode: string;
  toMode: string;
  actor: string;
  reason: string;
  durationMs: number | null;
  createdAt: string;
};

type HealthCheck = {
  status: 'healthy' | 'degraded' | 'critical';
  checks: Array<{ name: string; status: 'ok' | 'fail'; latencyMs: number }>;
  consecutiveFailures: number;
  consecutivePasses: number;
};

const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a1c55d7e`;

const MODE_COLORS: Record<PlatformMode, string> = {
  active: 'bg-emerald-500',
  readonly: 'bg-amber-500',
  shutdown: 'bg-red-500',
};

const MODE_LABELS: Record<PlatformMode, string> = {
  active: 'Active',
  readonly: 'Read-Only',
  shutdown: 'Shutdown',
};

export default function PlatformModePanel({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const [modeRecord, setModeRecord] = useState<ModeRecord | null>(null);
  const [graceActive, setGraceActive] = useState(false);
  const [graceRemainingMs, setGraceRemainingMs] = useState(0);
  const [recentAudit, setRecentAudit] = useState<AuditEntry[]>([]);
  const [health, setHealth] = useState<HealthCheck | null>(null);
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState(false);

  // Change form state
  const [targetMode, setTargetMode] = useState<PlatformMode>('readonly');
  const [strategy, setStrategy] = useState<PlatformModeStrategy>('phased');
  const [gracePeriodMs, setGracePeriodMs] = useState('30000');
  const [autoRevertAfterMs, setAutoRevertAfterMs] = useState('');
  const [reason, setReason] = useState('');

  const fetchMode = async () => {
    try {
      const headers = await buildAdminAuthHeaders(false);
      const res = await fetch(`${serverUrl}/admin/platform-mode`, { headers });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setModeRecord(data.mode);
      setGraceActive(data.graceActive);
      setGraceRemainingMs(data.graceRemainingMs);
      setRecentAudit(data.recentAudit ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const fetchHealth = async () => {
    try {
      const headers = await buildAdminAuthHeaders(false);
      const res = await fetch(`${serverUrl}/admin/platform-mode/health`, { headers });
      if (!res.ok) return;
      const data = await res.json();
      setHealth(data.health);
    } catch {
      // silent
    }
  };

  useEffect(() => {
    fetchMode();
    fetchHealth();
  }, []);

  const handleModeChange = async () => {
    if (!isSuperAdmin) {
      toast.error('Only super admins can change platform mode.');
      return;
    }
    if (!reason.trim()) {
      toast.error('Reason is required.');
      return;
    }

    setChanging(true);
    try {
      const headers = await buildAdminAuthHeaders();
      const body: Record<string, unknown> = {
        mode: targetMode,
        strategy,
        reason: reason.trim(),
      };
      if (strategy === 'phased') {
        body.gracePeriodMs = parseInt(gracePeriodMs, 10) || 30000;
      }
      if (autoRevertAfterMs.trim()) {
        body.autoRevertAfterMs = parseInt(autoRevertAfterMs, 10);
      }

      const res = await fetch(`${serverUrl}/admin/platform-mode`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to change mode');
        return;
      }
      toast.success(`Platform mode changed to ${targetMode}`);
      setReason('');
      await fetchMode();
    } catch {
      toast.error('Failed to change platform mode');
    } finally {
      setChanging(false);
    }
  };

  const handleRollback = async (forceSkipVerification = false) => {
    if (!isSuperAdmin) return;
    setChanging(true);
    try {
      const headers = await buildAdminAuthHeaders();
      const body: Record<string, unknown> = { reason: 'Manual rollback from admin panel' };
      if (forceSkipVerification) {
        body.skipReconciliation = true;
      }
      const res = await fetch(`${serverUrl}/admin/platform-mode/rollback`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        const errMsg = data.error ?? 'Rollback failed';
        if (!forceSkipVerification && errMsg.toLowerCase().includes('verification')) {
          toast.error(errMsg, {
            duration: 8000,
            action: {
              label: 'Force Rollback',
              onClick: () => handleRollback(true),
            },
          });
        } else {
          toast.error(errMsg);
        }
        return;
      }
      toast.success(forceSkipVerification ? 'Platform mode force-rolled back (verification skipped)' : 'Platform mode rolled back successfully');
      await fetchMode();
    } catch {
      toast.error('Rollback failed');
    } finally {
      setChanging(false);
    }
  };

  const handleVerify = async () => {
    try {
      const headers = await buildAdminAuthHeaders();
      const res = await fetch(`${serverUrl}/admin/platform-mode/verify`, {
        method: 'POST',
        headers,
      });
      const data = await res.json();
      if (data.verification?.passed) {
        toast.success('All verification checks passed');
      } else {
        const failed = data.verification?.results?.filter((r: any) => !r.passed) ?? [];
        toast.error(`Verification failed: ${failed.map((f: any) => f.check).join(', ')}`);
      }
    } catch {
      toast.error('Verification request failed');
    }
  };

  if (loading) {
    return (
      <div className="bg-[#252b3d] rounded-lg p-6 animate-pulse">
        <div className="h-6 bg-gray-700 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-gray-700 rounded w-2/3"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Current Mode Status */}
      <div className="bg-[#252b3d] rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold text-lg">Platform Mode (Kill-Switch)</h3>
          {modeRecord && (
            <span className={`${MODE_COLORS[modeRecord.mode]} text-white text-xs font-bold px-3 py-1 rounded-full uppercase`}>
              {MODE_LABELS[modeRecord.mode]}
            </span>
          )}
        </div>

        {modeRecord && (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-400">
              <span>Strategy</span>
              <span className="text-white">{modeRecord.strategy}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Initiated by</span>
              <span className="text-white">{modeRecord.initiatedBy}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Changed at</span>
              <span className="text-white">{new Date(modeRecord.initiatedAt).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Version</span>
              <span className="text-white">v{modeRecord.version}</span>
            </div>
            {modeRecord.reason && (
              <div className="text-gray-400 mt-2">
                <span className="block text-gray-500 text-xs">Reason:</span>
                <span className="text-white">{modeRecord.reason}</span>
              </div>
            )}
            {graceActive && (
              <p className="text-amber-400 text-sm bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2 mt-2">
                ⏳ Grace period active — {Math.ceil(graceRemainingMs / 1000)}s remaining
              </p>
            )}
            {modeRecord.autoRevertAt && (
              <p className="text-cyan-400 text-sm mt-1">
                Auto-revert scheduled: {new Date(modeRecord.autoRevertAt).toLocaleString()}
              </p>
            )}
          </div>
        )}

        {/* Quick Actions */}
        {isSuperAdmin && modeRecord && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-700">
            {modeRecord.previousMode && (
              <>
                <button
                  onClick={() => handleRollback(false)}
                  disabled={changing}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-sm rounded-lg disabled:opacity-50 transition-colors"
                >
                  ↩ Rollback to {MODE_LABELS[modeRecord.previousMode]}
                </button>
                <button
                  onClick={() => handleRollback(true)}
                  disabled={changing}
                  className="px-3 py-1.5 bg-red-700 hover:bg-red-600 text-white text-sm rounded-lg disabled:opacity-50 transition-colors"
                  title="Skip verification checks and force rollback"
                >
                  ⚡ Force Rollback
                </button>
              </>
            )}
            <button
              onClick={handleVerify}
              className="px-3 py-1.5 bg-cyan-700 hover:bg-cyan-600 text-white text-sm rounded-lg transition-colors"
            >
              ✓ Run Verification
            </button>
          </div>
        )}
      </div>

      {/* Health Status */}
      {health && (
        <div className="bg-[#252b3d] rounded-lg p-6">
          <h4 className="text-white font-semibold mb-3">System Health</h4>
          <div className="grid grid-cols-3 gap-3">
            {health.checks.map((check) => (
              <div key={check.name} className={`rounded-lg p-3 text-center ${check.status === 'ok' ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                <div className={`text-lg ${check.status === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {check.status === 'ok' ? '✓' : '✗'}
                </div>
                <div className="text-white text-xs mt-1">{check.name.replace(/_/g, ' ')}</div>
                <div className="text-gray-500 text-xs">{check.latencyMs}ms</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mode Change Form */}
      {isSuperAdmin && (
        <div className="bg-[#252b3d] rounded-lg p-6">
          <h4 className="text-white font-semibold mb-3">Change Platform Mode</h4>
          <div className="space-y-3">
            <div>
              <label className="text-gray-400 text-sm block mb-1">Target Mode</label>
              <select
                value={targetMode}
                onChange={(e) => setTargetMode(e.target.value as PlatformMode)}
                className="w-full bg-[#1a1f2e] text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-cyan-400/50 focus:outline-none"
              >
                <option value="active">Active — Full operations</option>
                <option value="readonly">Read-Only — Reads OK, writes blocked</option>
                <option value="shutdown">Shutdown — Maintenance page</option>
              </select>
            </div>
            <div>
              <label className="text-gray-400 text-sm block mb-1">Strategy</label>
              <select
                value={strategy}
                onChange={(e) => setStrategy(e.target.value as PlatformModeStrategy)}
                className="w-full bg-[#1a1f2e] text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-cyan-400/50 focus:outline-none"
              >
                <option value="immediate">Immediate — No grace period</option>
                <option value="phased">Phased — Grace period for in-flight</option>
              </select>
            </div>
            {strategy === 'phased' && (
              <div>
                <label className="text-gray-400 text-sm block mb-1">Grace Period (ms)</label>
                <input
                  type="number"
                  value={gracePeriodMs}
                  onChange={(e) => setGracePeriodMs(e.target.value)}
                  min="0"
                  max="300000"
                  className="w-full bg-[#1a1f2e] text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-cyan-400/50 focus:outline-none"
                />
              </div>
            )}
            <div>
              <label className="text-gray-400 text-sm block mb-1">Auto-Revert After (ms, optional)</label>
              <input
                type="number"
                value={autoRevertAfterMs}
                onChange={(e) => setAutoRevertAfterMs(e.target.value)}
                placeholder="e.g. 900000 (15 minutes)"
                min="60000"
                max="86400000"
                className="w-full bg-[#1a1f2e] text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-cyan-400/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-gray-400 text-sm block mb-1">Reason (required)</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why are you changing the platform mode?"
                rows={2}
                className="w-full bg-[#1a1f2e] text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-cyan-400/50 focus:outline-none resize-none"
              />
            </div>
            <button
              onClick={handleModeChange}
              disabled={changing || !reason.trim()}
              className="w-full py-2 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg disabled:opacity-50 transition-colors"
            >
              {changing ? 'Changing...' : `Switch to ${MODE_LABELS[targetMode]}`}
            </button>
          </div>
        </div>
      )}

      {/* Recent Audit Log */}
      {recentAudit.length > 0 && (
        <div className="bg-[#252b3d] rounded-lg p-6">
          <h4 className="text-white font-semibold mb-3">Recent Mode Changes</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {recentAudit.map((entry) => (
              <div key={entry.id} className="bg-[#1a1f2e] rounded-lg p-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-cyan-400 font-mono text-xs">{entry.action}</span>
                  <span className="text-gray-500 text-xs">{new Date(entry.createdAt).toLocaleString()}</span>
                </div>
                <div className="text-white mt-1">
                  {entry.fromMode} → {entry.toMode}
                  {entry.durationMs != null && (
                    <span className="text-gray-500 ml-2">({Math.round(entry.durationMs / 1000)}s in prev mode)</span>
                  )}
                </div>
                <div className="text-gray-400 text-xs mt-1">{entry.actor} — {entry.reason}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
