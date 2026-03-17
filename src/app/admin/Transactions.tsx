import React from 'react';
import { Download } from 'lucide-react';

interface TransactionsProps {
  transactions: any[];
  financeLoading: boolean;
  handleExport: () => void;
  formatCurrency: (amount: number) => string;
  formatDateTime: (date: string) => string;
}

export default function Transactions({
  transactions,
  financeLoading,
  handleExport,
  formatCurrency,
  formatDateTime,
}: TransactionsProps) {
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
          <h2 className="text-2xl font-bold text-white">Transaction History</h2>
          <p className="text-gray-400 text-sm mt-1">Monitor all platform transactions</p>
        </div>
        <button onClick={handleExport} className="flex items-center gap-2 bg-[#00D9FF] hover:bg-[#00c5e6] text-[#1a1f2e] px-4 py-2 rounded-lg font-semibold transition-colors">
          <Download size={18} />
          Export Report
        </button>
      </div>

      {/* Transactions Table */}
      <div className="bg-[#252b3d] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#1a1f2e] border-b border-gray-700">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">TX ID</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Username</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Method</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Date & Time</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">TX Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {financeLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-gray-400">Loading transactions…</td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-gray-400">No transactions recorded yet.</td>
                </tr>
              ) : transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-[#2c3e50] transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-300">{tx.id}</td>
                  <td className="px-6 py-4 text-sm font-medium text-white">{tx.username}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      tx.type === 'Deposit' ? 'bg-blue-500/20 text-blue-300' :
                      tx.type === 'Withdrawal' ? 'bg-orange-500/20 text-orange-300' :
                      'bg-green-500/20 text-green-300'
                    }`}>
                      {tx.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-[#00D9FF]">{(formatCurrency || defaultFormatCurrency)(tx.amount)}</td>
                  <td className="px-6 py-4 text-sm text-gray-300">{tx.method}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      tx.status === 'Completed' ? 'bg-green-500/20 text-green-300' :
                      tx.status === 'Pending' ? 'bg-yellow-500/20 text-yellow-300' :
                      'bg-red-500/20 text-red-300'
                    }`}>
                      {tx.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">{(formatDateTime || defaultFormatDateTime)(tx.date)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 font-mono">{tx.txHash || 'Pending'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
