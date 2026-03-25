import React, { useState, useMemo } from 'react';
import { Download, Search, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

interface DepositsProps {
  deposits: any[];
  financeLoading: boolean;
  handleExport: () => void;
  formatCurrency: (amount: number) => string;
  formatDateTime: (date: string) => string;
}

type SortDir = 'asc' | 'desc';
type SortCol = 'date' | 'amount' | 'username' | '';

const DEP_PER_PAGE = 15;

function SortIcon({ col, sortCol, sortDir }: { col: string; sortCol: SortCol; sortDir: SortDir }) {
  if (sortCol !== col) return <ChevronsUpDown size={14} className="ml-1 inline opacity-40" />;
  return sortDir === 'asc'
    ? <ChevronUp size={14} className="ml-1 inline text-[#00D9FF]" />
    : <ChevronDown size={14} className="ml-1 inline text-[#00D9FF]" />;
}

export default function Deposits({
  deposits,
  financeLoading,
  handleExport,
  formatCurrency,
  formatDateTime,
}: DepositsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [depPage, setDepPage] = useState(1);
  const [sortCol, setSortCol] = useState<SortCol>('date');
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
      setSortDir(col === 'date' ? 'desc' : 'asc');
    }
    setDepPage(1);
  };

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return deposits.filter((dep) => {
      const matchSearch = !q ||
        String(dep.id ?? '').toLowerCase().includes(q) ||
        String(dep.username ?? '').toLowerCase().includes(q) ||
        String(dep.txHash ?? '').toLowerCase().includes(q);
      const matchStatus = filterStatus === 'all' || (dep.status ?? '').toLowerCase() === filterStatus.toLowerCase();
      return matchSearch && matchStatus;
    });
  }, [deposits, searchTerm, filterStatus]);

  const sorted = useMemo(() => {
    if (!sortCol) return filtered;
    return [...filtered].sort((a, b) => {
      let aVal: any, bVal: any;
      if (sortCol === 'date') { aVal = new Date(a.date).getTime(); bVal = new Date(b.date).getTime(); }
      else if (sortCol === 'amount') { aVal = a.amount ?? 0; bVal = b.amount ?? 0; }
      else { aVal = (a.username ?? '').toLowerCase(); bVal = (b.username ?? '').toLowerCase(); }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filtered, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / DEP_PER_PAGE));
  const safePage = Math.min(depPage, totalPages);
  const startIdx = (safePage - 1) * DEP_PER_PAGE;
  const paginated = sorted.slice(startIdx, startIdx + DEP_PER_PAGE);

  const handleSearch = (val: string) => { setSearchTerm(val); setDepPage(1); };
  const handleFilterStatus = (val: string) => { setFilterStatus(val); setDepPage(1); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Deposit Records</h2>
          <p className="text-gray-400 text-sm mt-1">Track all user deposits and funding transactions</p>
        </div>
        <button onClick={handleExport} className="flex items-center gap-2 bg-[#00D9FF] hover:bg-[#00c5e6] text-[#1a1f2e] px-4 py-2 rounded-lg font-semibold transition-colors">
          <Download size={18} />
          Export
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-3 bg-[#252b3d] p-4 rounded-lg flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search by username, TX ID, or hash..."
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
          <option value="Completed">Completed</option>
          <option value="Pending">Pending</option>
          <option value="Failed">Failed</option>
        </select>
      </div>

      {/* Deposits Table */}
      <div className="bg-[#252b3d] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-10 bg-[#1a1f2e] border-b border-gray-700">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">TX ID</th>
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
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th
                  className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-white"
                  onClick={() => handleSort('date')}
                >
                  Date & Time<SortIcon col="date" sortCol={sortCol} sortDir={sortDir} />
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">TX Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {financeLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-gray-400">Loading deposits…</td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-gray-400">
                    {deposits.length === 0 ? 'No deposit records available.' : 'No deposits match your filters.'}
                  </td>
                </tr>
              ) : paginated.map((deposit) => (
                <tr key={deposit.id} className="hover:bg-[#2c3e50] transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-300">{deposit.id}</td>
                  <td className="px-6 py-4 text-sm font-medium text-white">{deposit.username}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-[#00D9FF]">{fmt(deposit.amount)}</td>
                  <td className="px-6 py-4 text-sm text-gray-300">{deposit.method}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      deposit.status === 'Completed' ? 'bg-green-500/20 text-green-300' :
                      deposit.status === 'Pending' ? 'bg-yellow-500/20 text-yellow-300' :
                      'bg-red-500/20 text-red-300'
                    }`}>
                      {deposit.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">{fmtDt(deposit.date)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 font-mono">{deposit.txHash || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between bg-[#252b3d] px-6 py-4 rounded-lg">
        <p className="text-sm text-gray-400">
          {sorted.length === 0 ? '0 results' : `Showing ${startIdx + 1}–${Math.min(startIdx + paginated.length, sorted.length)} of ${sorted.length} deposits`}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDepPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className="px-3 py-1 bg-[#1a1f2e] border border-gray-600 text-gray-400 rounded hover:bg-[#2c3e50] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button className="px-3 py-1 bg-[#00D9FF] text-[#1a1f2e] font-semibold rounded">
            {safePage} / {totalPages}
          </button>
          <button
            onClick={() => setDepPage((p) => Math.min(totalPages, p + 1))}
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
