import React from 'react';
import { Users, DollarSign, Activity, Bell } from 'lucide-react';

interface AdminHomeProps {
  platformUsersLoaded: boolean;
  platformUsers: any[];
  mockUsers: any[];
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
  mockUsers,
  platformRevenue,
  formatCurrency,
  taskConfigurations,
  pendingWithdrawalCount,
  financeLoading,
  transactions,
}: AdminHomeProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Dashboard Overview</h2>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Users</p>
              <p className="text-3xl font-bold text-white mt-2">
                {platformUsersLoaded ? platformUsers.length : mockUsers.length}
              </p>
              <p className="text-green-400 text-xs mt-2">Live platform data</p>
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
            {[...mockUsers]
              .sort((a, b) => b.tasksCompleted - a.tasksCompleted)
              .slice(0, 5)
              .map((user: any, index: number) => (
                <div key={user.id} className="flex items-center justify-between p-3 bg-[#1a1f2e] rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                      <span className="text-purple-300 font-bold text-sm">#{index + 1}</span>
                    </div>
                    <div>
                      <p className="text-white text-sm font-semibold">{user.username}</p>
                      <p className="text-gray-400 text-xs">{user.vipLevel}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[#00D9FF] font-bold text-sm">{user.tasksCompleted} tasks</p>
                    <p className="text-green-400 text-xs">${user.totalEarnings.toFixed(2)}</p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
