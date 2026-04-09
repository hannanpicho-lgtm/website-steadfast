import React, { useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Check, X, Download, Search, CheckSquare } from 'lucide-react';
import { useTableSort } from '../hooks/useTableSort';
import { SortIcon } from './SortIcon';

interface WithdrawalsProps {
  withdrawalRequests: any[];
  pendingWithdrawalCount: number;
  financeLoading: boolean;
  handleExport: () => void;
  handleApproveWithdrawal: (id: string) => void;
  handleRejectWithdrawal: (id: string) => void;
  handleBulkApprove?: (ids: string[]) => void;
  handleBulkReject?: (ids: string[]) => void;
  formatCurrency: (amount: number) => string;
  formatDateTime: (date: string) => string;
}

const SEARCH_FIELDS = ['id', 'username', 'walletAddress'] as const;

function Withdrawals({
  withdrawalRequests,
  pendingWithdrawalCount,
  financeLoading,
  handleExport,
  handleApproveWithdrawal,
  handleRejectWithdrawal,
  handleBulkApprove,
  handleBulkReject,
  formatCurrency,
  formatDateTime,
}: WithdrawalsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const defaultFormatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);
  const defaultFormatDateTime = (date: string) => new Date(date).toLocaleString();

  const fmt = formatCurrency || defaultFormatCurrency;
  const fmtDt = formatDateTime || defaultFormatDateTime;

  const { sortCol, sortDir, handleSort, sorted } = useTableSort({
    items: withdrawalRequests,
    defaultDateCol: 'requestedDate',
    searchFields: SEARCH_FIELDS as unknown as (keyof any)[],
    searchTerm,
    filterStatus,
  });

  const handleSearch = (val: string) => { setSearchTerm(val); };
  const handleFilterStatus = (val: string) => { setFilterStatus(val); };

  const pendingSorted = sorted.filter((w: any) => w.status === 'Pending');
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (selectedIds.size === pendingSorted.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingSorted.map((w: any) => w.id)));
    }
  };
  const selectedCount = selectedIds.size;

  const tableRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: sorted.length,
    getScrollElement: () => tableRef.current,
    estimateSize: () => 56,
    overscan: 20,
  });
  const virtualItems = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom = virtualItems.length > 0 ? totalSize - virtualItems[virtualItems.length - 1].end : 0;

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

      {/* Bulk Action Bar */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-3 bg-[#00D9FF]/10 border border-[#00D9FF]/30 rounded-lg px-4 py-3">
          <CheckSquare size={18} className="text-[#00D9FF]" />
          <span className="text-white text-sm font-medium">{selectedCount} selected</span>
          <div className="flex-1" />
          {handleBulkApprove && (
            <button
              onClick={() => { handleBulkApprove([...selectedIds]); setSelectedIds(new Set()); }}
              className="px-4 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
            >
              <Check size={14} />
              Approve All
            </button>
          )}
          {handleBulkReject && (
            <button
              onClick={() => { handleBulkReject([...selectedIds]); setSelectedIds(new Set()); }}
              className="px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
            >
              <X size={14} />
              Reject All
            </button>
          )}
          <button
            onClick={() => setSelectedIds(new Set())}
            className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-xs transition-colors"
          >
            Clear
          </button>
        </div>
      )}

      {/* Withdrawals Table */}
      <div className="bg-[#252b3d] rounded-lg overflow-hidden">
        <div ref={tableRef} className="overflow-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
          <table className="w-full">
            <thead className="sticky top-0 z-30 bg-[#1a1f2e] border-b border-gray-700">
              <tr>
                <th className="px-3 py-4 text-center w-10">
                  <input
                    type="checkbox"
                    checked={pendingSorted.length > 0 && selectedIds.size === pendingSorted.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 accent-[#00D9FF] rounded"
                    aria-label="Select all pending"
                  />
                </th>
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
                  <td colSpan={9} className="px-6 py-10 text-center text-gray-400">Loading withdrawal requests…</td>
                </tr>
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-10 text-center text-gray-400">
                    {withdrawalRequests.length === 0 ? 'No withdrawal requests submitted yet.' : 'No withdrawals match your filters.'}
                  </td>
                </tr>
              ) : (<>
              {paddingTop > 0 && <tr><td style={{ height: paddingTop }} /></tr>}
              {virtualItems.map((virtualRow) => {
                const withdrawal = sorted[virtualRow.index];
                return (
                <tr key={withdrawal.id} className="hover:bg-[#2c3e50] transition-colors">
                  <td className="px-3 py-4 text-center">
                    {withdrawal.status === 'Pending' ? (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(withdrawal.id)}
                        onChange={() => toggleSelect(withdrawal.id)}
                        className="w-4 h-4 accent-[#00D9FF] rounded"
                        aria-label={`Select withdrawal ${withdrawal.id}`}
                      />
                    ) : <span className="block w-4" />}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">{withdrawal.id}</td>
                  <td className="px-6 py-4 text-sm font-medium text-white">{withdrawal.username}</td>
                  <td className="px-6 py-4 text-sm font-bold text-[#00D9FF]">{fmt(withdrawal.amount)}</td>
                  <td className="px-6 py-4 text-sm text-gray-300">
                    <div className="leading-snug">
                      <div>{withdrawal.method}</div>
                      {withdrawal.network ? (
                        <div className="text-[11px] text-gray-500 uppercase tracking-wide">{withdrawal.network}</div>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400 font-mono text-xs max-w-[220px] whitespace-normal break-all leading-snug">
                    {withdrawal.walletAddress}
                  </td>
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
                );
              })}
              {paddingBottom > 0 && <tr><td style={{ height: paddingBottom }} /></tr>}
              </>)}
            </tbody>
          </table>
        </div>
      </div>

      {/* Result count */}
      <div className="bg-[#252b3d] px-6 py-4 rounded-lg">
        <p className="text-sm text-gray-400">
          {sorted.length} request{sorted.length !== 1 ? 's' : ''}{sorted.length !== withdrawalRequests.length ? ` (filtered from ${withdrawalRequests.length})` : ''}
        </p>
      </div>
    </div>
  );
}

export default React.memo(Withdrawals);
