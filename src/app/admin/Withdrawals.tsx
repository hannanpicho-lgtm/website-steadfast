import React, { useState, useMemo } from 'react';
import { Check, X, Download, Search, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

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

type SortDir = 'asc' | 'desc';
type SortCol = 'requestedDate' | 'amount' | 'username' | '';

const WD_PER_PAGE = 15;

function SortIcon({ col, sortCol, sortDir }: { col: string; sortCol: SortCol; sortDir: SortDir }) {
  if (sortCol !== col) return <ChevronsUpDown size={14} className="ml-1 inline opacity-40" />;
  return sortDir === 'asc'
    ? <ChevronUp size={14} className="ml-1 inline text-[#00D9FF]" />
    : <ChevronDown size={14} className="ml-1 inline text-[#00D9FF]" />;
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
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [wdPage, setWdPage] = useState(1);
  const [sortCol, setSortCol] = useState<SortCol>('requestedDate');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const defaultFormatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);
  const defaultFormatDateTime = (date: string) => new Date(date).toLocaleString();

  const fmt = formatCurrency || defaultFormatCurrency;
  const fmtDt = formatDateTime || defaultFormatDateTime;

  const handleSort = (col: SortCol) => {
    if (sortCol === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir(col === 'requestedDate' ? 'desc' : 'asc');
    }
    setWdPage(1);
  };

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return withdrawalRequests.filter((wd) => {
      const matchSearch = !q ||
        String(wd.id ?? '').toLowerCase().includes(q) ||
        String(wd.username ?? '').toLowerCase().includes(q) ||
        String(wd.walletAddress ?? '').toLowerCase().includes(q);
      const matchStatus = filterStatus === 'all' || (wd.status ?? '').toLowerCase() === filterStatus.toLowerCase();
      return matchSearch && matchStatus;
    });
  }, [withdrawalRequests, searchTerm, filterStatus]);

  const sorted = useMemo(() => {
    if (!sortCol) return filtered;
    return [...filtered].sort((a, b) => {
      let aVal: any, bVal: any;
      if (sortCol === 'requestedDate') { aVal = new Date(a.requestedDate).getTime(); bVal = new Date(b.requestedDate).getTime(); }
      else if (sortCol === 'amount') { aVal = a.amount ?? 0; bVal = b.amount ?? 0; }
      else { aVal = (a.username ?? '').toLowerCase(); bVal = (b.username ?? '').toLowerCase(); }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filtered, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / WD_PER_PAGE));
  const safePage = Math.min(wdPage, totalPages);
  const startIdx = (safePage - 1) * WD_PER_PAGE;
  const paginated = sorted.slice(startIdx, startIdx + WD_PER_PAGE);

  const handleSearch = (val: string) => { setSearchTerm(val); setWdPage(1); };
  const handleFilterStatus = (val: string) => { setFilterStatus(val); setWdPage(1); };

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

      {/* Search & Filters */}
      <div className="flex items-center gap-3 bg-[#252b3d] p-4 rounded-lg flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search by username, ID, or wallet..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#00D9FF] text-sm"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => handleFilterStatus(e.target.value)}
          className="px-3 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none text-sm"
        >
          <option value="all">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>
        <button onClick={handleExport} className="flex items-center gap-2 bg-[#1a1f2e] hover:bg-[#2c3e50] border border-gray-600 text-white px-4 py-2 rounded-lg transition-colors text-sm">
          <Download size={16} />
          Export
        </button>
      </div>

      {/* Withdrawals Table */}
      <div className="bg-[#252b3d] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-10 bg-[#1a1f2e] border-b border-gray-700">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">ID</th>
                <th
                  className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-white"
                  onClick={() => handleSort('username')}
                >
                  Username<SortIcon col="username" sortCol={sortCol} sortDir={sortDir} />
                </th>
                <th
                  className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-white"
                  onClick={() => handleSort('amount')}
                >
                  Amount<SortIcon col="amount" sortCol={sortCol} sortDir={sortDir} />
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Method</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Wallet Address</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th
                  className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-white"
                  onClick={() => handleSort('requestedDate')}
                >
                  Requested<SortIcon col="requestedDate" sortCol={sortCol} sortDir={sortDir} />
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {financeLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-gray-400">Loading withdrawal requests…</td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-gray-400">
                    {withdrawalRequests.length === 0 ? 'No withdrawal requests submitted yet.' : 'No withdrawals match your filters.'}
                  </td>
                </tr>
              ) : paginated.map((withdrawal) => (
                <tr key={withdrawal.id} className="hover:bg-[#2c3e50] transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-300">{withdrawal.id}</td>
                  <td className="px-6 py-4 text-sm font-medium text-white">{withdrawal.username}</td>
                  <td className="px-6 py-4 text-sm font-bold text-[#00D9FF]">{fmt(withdrawal.amount)}</td>
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
                  <td className="px-6 py-4 text-sm text-gray-400">{fmtDt(withdrawal.requestedDate)}</td>
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

      {/* Pagination */}
      <div className="flex items-center justify-between bg-[#252b3d] px-6 py-4 rounded-lg">
        <p className="text-sm text-gray-400">
          {sorted.length === 0 ? '0 results' : `Showing ${startIdx + 1}–${Math.min(startIdx + paginated.length, sorted.length)} of ${sorted.length} requests`}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWdPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className="px-3 py-1 bg-[#1a1f2e] border border-gray-600 text-gray-400 rounded hover:bg-[#2c3e50] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button className="px-3 py-1 bg-[#00D9FF] text-[#1a1f2e] font-semibold rounded">
            {safePage} / {totalPages}
          </button>
          <button
            onClick={() => setWdPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            className="px-3 py-1 bg-[#1a1f2e] border border-gray-600 text-gray-400 rounded hover:bg-[#2c3e50] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
