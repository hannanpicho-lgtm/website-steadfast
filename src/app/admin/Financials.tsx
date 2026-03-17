import React from 'react';
import { Download, TrendingUp, ArrowDownRight, ArrowUpRight, Percent, Wallet, BarChart3, Clock, CreditCard, Target, Calendar, PieChart, Shield } from 'lucide-react';

interface FinancialsProps {
  platformRevenue: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalCommissions: number;
  deposits: any[];
  withdrawalRequests: any[];
  transactions: any[];
  financeLoading: boolean;
  totalUserBalances: number;
  averageBalance: number;
  platformUsers: any[];
  pendingWithdrawalAmount: number;
  pendingWithdrawalCount: number;
  totalFinanceVolume: number;
  vipConfigurations: any[];
  activePlatformUsers: number;
  totalCompletedTasks: number;
  taskConfigurations: any[];
  averageCommissionRate: number;
  handleExport: () => void;
  formatCurrency?: (value: number) => string;
}

const defaultFormatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
};

export default function Financials({
  platformRevenue,
  totalDeposits,
  totalWithdrawals,
  totalCommissions,
  deposits,
  withdrawalRequests,
  transactions,
  financeLoading,
  totalUserBalances,
  averageBalance,
  platformUsers,
  pendingWithdrawalAmount,
  pendingWithdrawalCount,
  totalFinanceVolume,
  vipConfigurations,
  activePlatformUsers,
  totalCompletedTasks,
  taskConfigurations,
  averageCommissionRate,
  handleExport,
  formatCurrency = defaultFormatCurrency,
}: FinancialsProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Financial Overview</h2>
          <p className="text-gray-400 text-sm mt-1">Comprehensive financial analytics and metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExport} className="flex items-center gap-2 bg-[#00D9FF] hover:bg-[#00c5e6] text-[#1a1f2e] px-4 py-2 rounded-lg font-semibold transition-colors">
            <Download size={18} />
            Export Report
          </button>
        </div>
      </div>

      {/* Primary Financial Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Revenue */}
        <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30 rounded-lg p-6">
          <div className="flex items-start justify-between mb-3">
            <div className="p-3 bg-green-500/20 rounded-lg">
              <TrendingUp className="text-green-400" size={24} />
            </div>
            <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded text-xs font-semibold">+12.5%</span>
          </div>
          <p className="text-gray-400 text-sm mb-1">Total Revenue</p>
          <p className="text-3xl font-bold text-white mb-2">{formatCurrency(platformRevenue)}</p>
          <div className="flex items-center gap-1 text-green-400 text-xs">
            <ArrowUpRight size={14} />
            <span>{financeLoading ? 'Refreshing live ledger…' : 'Calculated from completed deposits, withdrawals, and commissions'}</span>
          </div>
        </div>

        {/* Total Deposits */}
        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-lg p-6">
          <div className="flex items-start justify-between mb-3">
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <ArrowDownRight className="text-blue-400" size={24} />
            </div>
            <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs font-semibold">Income</span>
          </div>
          <p className="text-gray-400 text-sm mb-1">Total Deposits</p>
          <p className="text-3xl font-bold text-white mb-2">{formatCurrency(totalDeposits)}</p>
          <p className="text-gray-400 text-xs">{deposits.length} transactions</p>
        </div>

        {/* Total Withdrawals */}
        <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 border border-orange-500/30 rounded-lg p-6">
          <div className="flex items-start justify-between mb-3">
            <div className="p-3 bg-orange-500/20 rounded-lg">
              <ArrowUpRight className="text-orange-400" size={24} />
            </div>
            <span className="px-2 py-1 bg-orange-500/20 text-orange-300 rounded text-xs font-semibold">Outflow</span>
          </div>
          <p className="text-gray-400 text-sm mb-1">Total Withdrawals</p>
          <p className="text-3xl font-bold text-white mb-2">{formatCurrency(totalWithdrawals)}</p>
          <p className="text-gray-400 text-xs">{transactions.filter((tx) => tx.type === 'Withdrawal').length} transactions</p>
        </div>

        {/* Total Commissions Paid */}
        <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-lg p-6">
          <div className="flex items-start justify-between mb-3">
            <div className="p-3 bg-purple-500/20 rounded-lg">
              <Percent className="text-purple-400" size={24} />
            </div>
            <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs font-semibold">Paid</span>
          </div>
          <p className="text-gray-400 text-sm mb-1">Commissions Paid</p>
          <p className="text-3xl font-bold text-white mb-2">{formatCurrency(totalCommissions)}</p>
          <p className="text-gray-400 text-xs">Across {platformUsers.length} users</p>
        </div>
      </div>

      {/* Secondary Financial Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* User Balances */}
        <div className="bg-[#252b3d] border border-gray-700 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-[#00D9FF]/20 rounded-lg">
              <Wallet className="text-[#00D9FF]" size={20} />
            </div>
            <h3 className="text-white font-semibold">Total User Balances</h3>
          </div>
          <p className="text-3xl font-bold text-[#00D9FF] mb-2">{formatCurrency(totalUserBalances)}</p>
          <p className="text-gray-400 text-sm">Across {platformUsers.length} users</p>
          <div className="mt-4 pt-4 border-t border-gray-700">
            <p className="text-gray-400 text-xs mb-1">Average Balance</p>
            <p className="text-white font-semibold">{formatCurrency(averageBalance)}</p>
          </div>
        </div>

        {/* Platform Earnings */}
        <div className="bg-[#252b3d] border border-gray-700 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <BarChart3 className="text-green-400" size={20} />
            </div>
            <h3 className="text-white font-semibold">Platform Net Profit</h3>
          </div>
          <p className="text-3xl font-bold text-green-400 mb-2">{formatCurrency(platformRevenue)}</p>
          <p className="text-gray-400 text-sm">After all expenses</p>
          <div className="mt-4 pt-4 border-t border-gray-700">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Profit Margin</span>
              <span className="text-green-400 font-semibold">{totalDeposits > 0 ? ((platformRevenue / totalDeposits) * 100).toFixed(1) : '0.0'}%</span>
            </div>
          </div>
        </div>

        {/* Pending Withdrawals */}
        <div className="bg-[#252b3d] border border-gray-700 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <Clock className="text-yellow-400" size={20} />
            </div>
            <h3 className="text-white font-semibold">Pending Withdrawals</h3>
          </div>
          <p className="text-3xl font-bold text-yellow-400 mb-2">{formatCurrency(pendingWithdrawalAmount)}</p>
          <p className="text-gray-400 text-sm">{pendingWithdrawalCount} requests</p>
          <div className="mt-4 pt-4 border-t border-gray-700">
            <p className="text-red-400 text-xs">⚠️ Requires immediate action</p>
          </div>
        </div>
      </div>

      {/* Transaction Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transaction Type Breakdown */}
        <div className="bg-[#252b3d] rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-white font-semibold text-lg">Transaction Breakdown</h3>
            <PieChart className="text-gray-400" size={20} />
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">Deposits</span>
                <span className="text-white font-semibold">{formatCurrency(totalDeposits)}</span>
              </div>
              <div className="w-full bg-[#1a1f2e] rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${totalFinanceVolume > 0 ? (totalDeposits / totalFinanceVolume) * 100 : 0}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">Withdrawals</span>
                <span className="text-white font-semibold">{formatCurrency(totalWithdrawals)}</span>
              </div>
              <div className="w-full bg-[#1a1f2e] rounded-full h-2">
                <div className="bg-orange-500 h-2 rounded-full" style={{ width: `${totalFinanceVolume > 0 ? (totalWithdrawals / totalFinanceVolume) * 100 : 0}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">Commissions</span>
                <span className="text-white font-semibold">{formatCurrency(totalCommissions)}</span>
              </div>
              <div className="w-full bg-[#1a1f2e] rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: `${totalFinanceVolume > 0 ? (totalCommissions / totalFinanceVolume) * 100 : 0}%` }}></div>
              </div>
            </div>
            <div className="pt-4 border-t border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 font-semibold">Total Volume</span>
                <span className="text-[#00D9FF] font-bold text-lg">{formatCurrency(totalFinanceVolume)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* VIP Revenue Breakdown */}
        <div className="bg-[#252b3d] rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-white font-semibold text-lg">Balances by VIP Level</h3>
            <Shield className="text-gray-400" size={20} />
          </div>
          <div className="space-y-3">
            {vipConfigurations.map((vip) => {
              const vipUsers = platformUsers.filter((user) => user.vipLevel === vip.level);
              const vipRevenue = vipUsers.reduce((sum, user) => sum + user.balance, 0);
              const maxRevenue = Math.max(...vipConfigurations.map(v => 
                platformUsers.filter((user) => user.vipLevel === v.level).reduce((sum, user) => sum + user.balance, 0)
              ));
              
              return (
                <div key={vip.level} className="bg-[#1a1f2e] p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Shield className="text-purple-400" size={16} />
                      <span className="text-white font-semibold text-sm">{vip.name}</span>
                      <span className="text-gray-500 text-xs">({vipUsers.length} users)</span>
                    </div>
                    <span className="text-[#00D9FF] font-bold">{formatCurrency(vipRevenue)}</span>
                  </div>
                  <div className="w-full bg-[#252b3d] rounded-full h-1.5">
                    <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${maxRevenue > 0 ? (vipRevenue / maxRevenue) * 100 : 0}%` }}></div>
                  </div>
                </div>
              );
            })}
            <div className="pt-3 border-t border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 font-semibold">Total User Balances</span>
                <span className="text-green-400 font-bold text-lg">{formatCurrency(totalUserBalances)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#252b3d] border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="text-gray-400" size={16} />
            <p className="text-gray-400 text-xs">Active Users</p>
          </div>
          <p className="text-2xl font-bold text-white">{activePlatformUsers}</p>
          <p className="text-green-400 text-xs mt-1">
            {platformUsers.length > 0 ? ((activePlatformUsers / platformUsers.length) * 100).toFixed(1) : '0.0'}% of total
          </p>
        </div>

        <div className="bg-[#252b3d] border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="text-gray-400" size={16} />
            <p className="text-gray-400 text-xs">Tasks Completed</p>
          </div>
          <p className="text-2xl font-bold text-white">{totalCompletedTasks}</p>
          <p className="text-blue-400 text-xs mt-1">
            {taskConfigurations.reduce((sum, t) => sum + t.completedToday, 0)} today
          </p>
        </div>

        <div className="bg-[#252b3d] border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="text-gray-400" size={16} />
            <p className="text-gray-400 text-xs">Avg Commission Rate</p>
          </div>
          <p className="text-2xl font-bold text-white">
            {averageCommissionRate.toFixed(2)}%
          </p>
          <p className="text-purple-400 text-xs mt-1">Across all VIP levels</p>
        </div>

        <div className="bg-[#252b3d] border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="text-gray-400" size={16} />
            <p className="text-gray-400 text-xs">Monthly Growth</p>
          </div>
          <p className="text-2xl font-bold text-white">+12.5%</p>
          <p className="text-green-400 text-xs mt-1 flex items-center gap-1">
            <ArrowUpRight size={12} />
            Trending upward
          </p>
        </div>
      </div>
    </div>
  );
}
