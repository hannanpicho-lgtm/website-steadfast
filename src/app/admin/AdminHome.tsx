import React, { useEffect, useState } from 'react';
import { Users, DollarSign, Activity, Bell } from 'lucide-react';
import { projectId, publicAnonKey } from '@utils/supabase/info';

interface AdminHomeProps {
  platformUsersLoaded: boolean;
  platformUsers: any[];
  platformRevenue: number;
  formatCurrency: (amount: number) => string;
  taskConfigurations: any[];
  pendingWithdrawalCount: number;
  financeLoading: boolean;
  transactions: any[];
}

export default function AdminHome({
  platformUsersLoaded,
  platformUsers,
  platformRevenue,
  formatCurrency,
  taskConfigurations,
  pendingWithdrawalCount,
  financeLoading,
  transactions,
}: AdminHomeProps) {
  const [apiVersionState, setApiVersionState] = useState<{
    loading: boolean;
    error: string | null;
    payload: any | null;
  }>({ loading: true, error: null, payload: null });

  useEffect(() => {
    let cancelled = false;

    const loadVersion = async () => {
      try {
        const baseUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a1c55d7e`;
        const response = await fetch(`${baseUrl}/version`, {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            apikey: publicAnonKey,
          },
        });
        const payload = await response.json().catch(() => null);

        if (!response.ok || !payload) {
          throw new Error(`Version endpoint failed (${response.status})`);
        }

        if (!cancelled) {
          setApiVersionState({ loading: false, error: null, payload });
        }
      } catch (error) {
        if (!cancelled) {
          setApiVersionState({
            loading: false,
            error: error instanceof Error ? error.message : 'Failed to load deployment metadata.',
            payload: null,
          });
        }
      }
    };

    void loadVersion();
    const refreshId = window.setInterval(loadVersion, 60_000);

    return () => {
      cancelled = true;
      window.clearInterval(refreshId);
    };
  }, []);

  const topPerformers = platformUsersLoaded
    ? [...platformUsers]
        .sort((a, b) => Number(b.tasksCompleted ?? 0) - Number(a.tasksCompleted ?? 0))
        .slice(0, 5)
    : [];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Dashboard Overview</h2>

      <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">API Deployment Status</p>
            {apiVersionState.loading && <p className="text-sm text-gray-300 mt-1">Checking live version metadata…</p>}
            {apiVersionState.error && <p className="text-sm text-red-300 mt-1">{apiVersionState.error}</p>}
            {!apiVersionState.loading && !apiVersionState.error && apiVersionState.payload?.version && (
              <div className="mt-1 text-sm text-cyan-100 space-y-1">
                <p>Service: {String(apiVersionState.payload.version.service ?? 'unknown')}</p>
                <p>Commit: {String(apiVersionState.payload.version.commitShort ?? apiVersionState.payload.version.commitSha ?? 'n/a')}</p>
                <p>Deployed At: {String(apiVersionState.payload.version.deployedAtUtc ?? 'n/a')}</p>
                <p>Deployment ID: {String(apiVersionState.payload.version.deploymentId ?? 'n/a')}</p>
              </div>
            )}
          </div>
          {!apiVersionState.loading && !apiVersionState.error && apiVersionState.payload?.version && (
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${apiVersionState.payload.version.stale ? 'bg-red-500/20 text-red-200' : 'bg-emerald-500/20 text-emerald-200'}`}>
              {apiVersionState.payload.version.stale ? 'Version stale warning' : 'Version fresh'}
            </span>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Users</p>
              <p className="text-3xl font-bold text-white mt-2">
                {platformUsersLoaded ? platformUsers.length : '...'}
              </p>
              <p className="text-green-400 text-xs mt-2">{platformUsersLoaded ? 'Live platform data' : 'Loading live platform data'}</p>
            </div>
            <Users className="text-blue-400" size={40} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Revenue</p>
              <p className="text-3xl font-bold text-white mt-2">{formatCurrency(platformRevenue)}</p>
              <p className="text-green-400 text-xs mt-2">Live finance ledger</p>
            </div>
            <DollarSign className="text-green-400" size={40} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Active Tasks</p>
              <p className="text-3xl font-bold text-white mt-2">
                {taskConfigurations.filter((t) => t.status === 'Active').length}
              </p>
              <p className="text-yellow-400 text-xs mt-2">
                {taskConfigurations.reduce((sum, t) => sum + t.completedToday, 0)} completed today
              </p>
            </div>
            <Activity className="text-purple-400" size={40} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 border border-orange-500/30 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Pending Withdrawals</p>
              <p className="text-3xl font-bold text-white mt-2">{pendingWithdrawalCount}</p>
              <p className={`text-xs mt-2 ${pendingWithdrawalCount > 0 ? 'text-red-400' : 'text-gray-400'}`}>
                {pendingWithdrawalCount > 0 ? 'Requires attention' : 'All clear'}
              </p>
            </div>
            <Bell className="text-orange-400" size={40} />
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#252b3d] rounded-lg p-6">
          <h3 className="text-white font-semibold text-lg mb-4">Recent Transactions</h3>
          <div className="space-y-3">
            {financeLoading && (
              <div className="p-3 bg-[#1a1f2e] rounded-lg text-sm text-gray-400">Loading recent transactions…</div>
            )}
            {!financeLoading && transactions.length === 0 && (
              <div className="p-3 bg-[#1a1f2e] rounded-lg text-sm text-gray-400">No transactions recorded yet.</div>
            )}
            {!financeLoading && transactions.slice(0, 5).map((tx: any) => (
              <div key={tx.id} className="flex items-center justify-between p-3 bg-[#1a1f2e] rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    tx.type === 'Deposit' ? 'bg-blue-500/20' :
                    tx.type === 'Withdrawal' ? 'bg-orange-500/20' :
                    'bg-green-500/20'
                  }`}>
                    <DollarSign size={16} className={
                      tx.type === 'Deposit' ? 'text-blue-400' :
                      tx.type === 'Withdrawal' ? 'text-orange-400' :
                      'text-green-400'
                    } />
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">{tx.username}</p>
                    <p className="text-gray-400 text-xs">{tx.type}</p>
                  </div>
                </div>
                <p className="text-[#00D9FF] font-bold">{formatCurrency(tx.amount)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#252b3d] rounded-lg p-6">
          <h3 className="text-white font-semibold text-lg mb-4">Top Performers</h3>
          <div className="space-y-3">
            {!platformUsersLoaded && (
              <div className="p-3 bg-[#1a1f2e] rounded-lg text-sm text-gray-400">Loading live user performance…</div>
            )}
            {platformUsersLoaded && topPerformers.length === 0 && (
              <div className="p-3 bg-[#1a1f2e] rounded-lg text-sm text-gray-400">No user performance data available yet.</div>
            )}
            {topPerformers.map((user: any, index: number) => (
                <div key={user.id} className="flex items-center justify-between p-3 bg-[#1a1f2e] rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                      <span className="text-purple-300 font-bold text-sm">#{index + 1}</span>
                    </div>
                    <div>
                      <p className="text-white text-sm font-semibold">{user.username}</p>
                      <p className="text-gray-400 text-xs">VIP {Number(user.vipLevel ?? 0)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[#00D9FF] font-bold text-sm">{Number(user.tasksCompleted ?? 0)} tasks</p>
                    <p className="text-green-400 text-xs">{formatCurrency(Number(user.balance ?? 0))} balance</p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
