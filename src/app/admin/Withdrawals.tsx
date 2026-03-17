import React from 'react';
import { Check, X, Download } from 'lucide-react';

interface WithdrawalsProps {
  withdrawalRequests: any[];
  pendingWithdrawalCount: number;
  financeLoading: boolean;
  handleExport: () => void;
  handleApproveWithdrawal: (id: string) => void;
  handleRejectWithdrawal: (id: string) => void;
  formatCurrency: (amount: number) => string;
  formatDateTime: (date: string) => string;
}

export default function Withdrawals({
  withdrawalRequests,
  pendingWithdrawalCount,
  financeLoading,
  handleExport,
  handleApproveWithdrawal,
  handleRejectWithdrawal,
  formatCurrency,
  formatDateTime,
}: WithdrawalsProps) {
  const defaultFormatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);

  const defaultFormatDateTime = (date: string) => new Date(date).toLocaleString();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Withdrawal Requests</h2>
          <p className="text-gray-400 text-sm mt-1">Review and approve user withdrawal requests</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-3 py-2 bg-yellow-500/20 text-yellow-300 rounded-lg text-sm font-semibold">
            {pendingWithdrawalCount} Pending
          </span>
        </div>
      </div>

      {/* Withdrawals Table */}
      <div className="bg-[#252b3d] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#1a1f2e] border-b border-gray-700">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">ID</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Username</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Method</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Wallet Address</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Requested</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {financeLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-gray-400">Loading withdrawal requests…</td>
                </tr>
              ) : withdrawalRequests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-gray-400">No withdrawal requests submitted yet.</td>
                </tr>
              ) : withdrawalRequests.map((withdrawal) => (
                <tr key={withdrawal.id} className="hover:bg-[#2c3e50] transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-300">{withdrawal.id}</td>
                  <td className="px-6 py-4 text-sm font-medium text-white">{withdrawal.username}</td>
                  <td className="px-6 py-4 text-sm font-bold text-[#00D9FF]">{(formatCurrency || defaultFormatCurrency)(withdrawal.amount)}</td>
                  <td className="px-6 py-4 text-sm text-gray-300">{withdrawal.method}</td>
                  <td className="px-6 py-4 text-sm text-gray-400 font-mono text-xs">{withdrawal.walletAddress.slice(0, 10)}...{withdrawal.walletAddress.slice(-8)}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      withdrawal.status === 'Pending' ? 'bg-yellow-500/20 text-yellow-300' :
                      withdrawal.status === 'Approved' ? 'bg-green-500/20 text-green-300' :
                      'bg-red-500/20 text-red-300'
                    }`}>
                      {withdrawal.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">{(formatDateTime || defaultFormatDateTime)(withdrawal.requestedDate)}</td>
                  <td className="px-6 py-4 text-sm">
                    {withdrawal.status === 'Pending' ? (
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleApproveWithdrawal(withdrawal.id)}
                          className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                        >
                          <Check size={14} />
                          Approve
                        </button>
                        <button 
                          onClick={() => handleRejectWithdrawal(withdrawal.id)}
                          className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                        >
                          <X size={14} />
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-500 text-xs">Processed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
