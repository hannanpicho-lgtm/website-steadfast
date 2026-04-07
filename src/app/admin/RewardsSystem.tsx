import React, { useRef } from 'react';
import { Upload, Download, RefreshCw, Award, Gift, TrendingUp, Settings2, Wallet, Coins, Clock, Zap, Package, Check, Edit } from 'lucide-react';
import { toast } from 'sonner';

interface RewardsSystemProps {
  activeRewardTab: any;
  setActiveRewardTab: any;
  rewardsConfig: any;
  autoSavedAt: string | null;
  autoBackupEnabled: boolean;
  autoBackupIntervalMinutes: number;
  backupRetentionDays: number;
  storageWarning: string | null;
  handleAutoBackupEnabledChange: (enabled: boolean) => void;
  handleAutoBackupIntervalChange: (minutes: number) => void;
  handleBackupRetentionChange: (days: number) => void;
  importBackupPoints: (event: React.ChangeEvent<HTMLInputElement>) => void;
  exportBackupPoints: () => void;
  createAutoBackupPoint: (label: string) => void;
  restoreLatestSalaryPoint: () => void;
  undoLastRestore: () => void;
  salaryRestorePoints: any[];
  clearAllBackupPoints: () => void;
  auditSearchTerm: string;
  setAuditSearchTerm: (term: string) => void;
  auditFilterAction: any;
  setAuditFilterAction: any;
  filteredAuditLog: any[];
  getAuditActionTone: (action: string) => string;
  getAuditActionLabel: (action: string) => string;
  exportSalaryAuditLog: () => void;
  clearSalaryAuditLog: () => void;
  cardItems?: any;
  setModalType: any;
  setSelectedItem: (item: any) => void;
  salaryPayments: any[];
  requestRestoreSalaryPoint: (id: any) => void;
  deleteSalaryPointById: (id: any) => void;
}

export default function RewardsSystem({
  activeRewardTab,
  setActiveRewardTab,
  rewardsConfig,
  autoSavedAt,
  autoBackupEnabled,
  autoBackupIntervalMinutes,
  backupRetentionDays,
  storageWarning,
  handleAutoBackupEnabledChange,
  handleAutoBackupIntervalChange,
  handleBackupRetentionChange,
  importBackupPoints,
  exportBackupPoints,
  createAutoBackupPoint,
  restoreLatestSalaryPoint,
  undoLastRestore,
  salaryRestorePoints,
  clearAllBackupPoints,
  auditSearchTerm,
  setAuditSearchTerm,
  auditFilterAction,
  setAuditFilterAction,
  filteredAuditLog,
  getAuditActionTone,
  getAuditActionLabel,
  exportSalaryAuditLog,
  clearSalaryAuditLog,
  setModalType,
  setSelectedItem,
  salaryPayments,
  requestRestoreSalaryPoint,
  deleteSalaryPointById,
}: RewardsSystemProps) {
  const importBackupInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Rewards & Salary System</h2>
          <p className="text-gray-400 text-sm mt-1">Manage all reward schemes, salaries, and bonus systems</p>
          <p className="text-gray-500 text-xs mt-1">
            Autosave: {autoSavedAt ? new Date(autoSavedAt).toLocaleTimeString() : 'waiting for first save'}
          </p>
          <p className="text-gray-500 text-xs mt-1">
            Auto backup: {autoBackupEnabled ? `on (${autoBackupIntervalMinutes} min)` : 'off'}
          </p>
          <p className="text-gray-500 text-xs mt-1">
            Retention: {backupRetentionDays} day{backupRetentionDays === 1 ? '' : 's'}
          </p>
          {storageWarning && (
            <p className="text-red-300 text-xs mt-1">Storage warning: {storageWarning}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleAutoBackupEnabledChange(!autoBackupEnabled)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition-colors ${autoBackupEnabled ? 'bg-green-600/30 hover:bg-green-600/40 text-green-200' : 'bg-gray-700 hover:bg-gray-600 text-gray-200'}`}
          >
            {autoBackupEnabled ? 'Auto On' : 'Auto Off'}
          </button>
          <select
            value={autoBackupIntervalMinutes}
            onChange={(event) => handleAutoBackupIntervalChange(Number(event.target.value))}
            className="px-3 py-2.5 bg-[#1a1f2e] border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-[#00D9FF]"
          >
            <option value={1}>1 min</option>
            <option value={5}>5 min</option>
            <option value={15}>15 min</option>
            <option value={30}>30 min</option>
            <option value={60}>60 min</option>
          </select>
          <select
            value={backupRetentionDays}
            onChange={(event) => handleBackupRetentionChange(Number(event.target.value))}
            className="px-3 py-2.5 bg-[#1a1f2e] border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-[#00D9FF]"
          >
            <option value={7}>Keep 7d</option>
            <option value={30}>Keep 30d</option>
            <option value={90}>Keep 90d</option>
            <option value={180}>Keep 180d</option>
            <option value={365}>Keep 365d</option>
          </select>
          <input
            ref={importBackupInputRef}
            type="file"
            accept="application/json"
            onChange={importBackupPoints}
            className="hidden"
          />
          <button onClick={() => importBackupInputRef.current?.click()} className="flex items-center gap-2 bg-[#2f374d] hover:bg-[#3a4460] text-white px-4 py-2.5 rounded-lg font-semibold transition-colors">
            <Upload size={18} />
            Import
          </button>
          <button onClick={exportBackupPoints} className="flex items-center gap-2 bg-[#2f374d] hover:bg-[#3a4460] text-white px-4 py-2.5 rounded-lg font-semibold transition-colors">
            <Download size={18} />
            Export
          </button>
          <button onClick={() => createAutoBackupPoint('manual-backup')} className="flex items-center gap-2 bg-[#2f374d] hover:bg-[#3a4460] text-white px-4 py-2.5 rounded-lg font-semibold transition-colors">
            <Download size={18} />
            Backup Now
          </button>
          <button onClick={restoreLatestSalaryPoint} className="flex items-center gap-2 bg-[#3b4258] hover:bg-[#4a536f] text-white px-4 py-2.5 rounded-lg font-semibold transition-colors">
            <RefreshCw size={18} />
            Restore Point {salaryRestorePoints.length > 0 ? `(${salaryRestorePoints.length})` : ''}
          </button>
          <button onClick={undoLastRestore} className="flex items-center gap-2 bg-[#3b4258] hover:bg-[#4a536f] text-white px-4 py-2.5 rounded-lg font-semibold transition-colors">
            <RefreshCw size={18} />
            Undo Restore
          </button>
          <button onClick={() => setModalType('pay-salary-bulk')} className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-5 py-2.5 rounded-lg font-semibold transition-colors shadow-lg">
            <Coins size={18} />
            Auto Process
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-[#252b3d] p-2 rounded-lg overflow-x-auto">
        <button 
          onClick={() => setActiveRewardTab('workday')}
          className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-colors ${activeRewardTab === 'workday' ? 'bg-[#00D9FF] text-[#1a1f2e]' : 'text-gray-400 hover:text-white'}`}
        >
          <Award size={16} className="inline mr-2" />
          Workday Rewards
        </button>
        <button 
          onClick={() => setActiveRewardTab('reset')}
          className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-colors ${activeRewardTab === 'reset' ? 'bg-[#00D9FF] text-[#1a1f2e]' : 'text-gray-400 hover:text-white'}`}
        >
          <Gift size={16} className="inline mr-2" />
          Reset Rewards
        </button>
        <button 
          onClick={() => setActiveRewardTab('accumulated')}
          className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-colors ${activeRewardTab === 'accumulated' ? 'bg-[#00D9FF] text-[#1a1f2e]' : 'text-gray-400 hover:text-white'}`}
        >
          <TrendingUp size={16} className="inline mr-2" />
          Accumulated Rewards
        </button>
        <button 
          onClick={() => setActiveRewardTab('product-system')}
          className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-colors ${activeRewardTab === 'product-system' ? 'bg-[#00D9FF] text-[#1a1f2e]' : 'text-gray-400 hover:text-white'}`}
        >
          <Settings2 size={16} className="inline mr-2" />
          Product System
        </button>
        <button 
          onClick={() => setActiveRewardTab('salary-payments')}
          className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-colors ${activeRewardTab === 'salary-payments' ? 'bg-[#00D9FF] text-[#1a1f2e]' : 'text-gray-400 hover:text-white'}`}
        >
          <Wallet size={16} className="inline mr-2" />
          Salary Payments
        </button>
      </div>

      <div className="bg-[#252b3d] border border-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-bold">Auto Backup Points</h3>
          <button onClick={clearAllBackupPoints} className="text-xs text-gray-300 hover:text-white transition-colors">
            Clear All
          </button>
        </div>

        {salaryRestorePoints.length === 0 ? (
          <p className="text-gray-400 text-sm">No backup points yet. Use Backup Now or process salaries to generate points.</p>
        ) : (
          <div className="space-y-2">
            {salaryRestorePoints.slice(0, 5).map((point) => (
              <div key={point.id} className="bg-[#1a1f2e] border border-gray-700 rounded-lg px-3 py-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{point.label}</p>
                  <p className="text-gray-400 text-xs">{new Date(point.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => requestRestoreSalaryPoint(point.id)} className="text-xs bg-[#3b4258] hover:bg-[#4a536f] text-white px-3 py-1.5 rounded transition-colors">
                    Restore
                  </button>
                  <button onClick={() => deleteSalaryPointById(point.id)} className="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-300 px-3 py-1.5 rounded transition-colors">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-[#252b3d] border border-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-bold">Backup Audit Log</h3>
          <div className="flex items-center gap-3">
            <button onClick={exportSalaryAuditLog} className="text-xs text-gray-300 hover:text-white transition-colors">
              Export Log
            </button>
            <button onClick={clearSalaryAuditLog} className="text-xs text-gray-300 hover:text-white transition-colors">
              Clear Log
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <input
            type="text"
            placeholder="Search action or detail..."
            value={auditSearchTerm}
            onChange={(event) => setAuditSearchTerm(event.target.value)}
            className="w-full px-3 py-2 bg-[#1a1f2e] border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#00D9FF]"
          />
          <select
            value={auditFilterAction}
            onChange={(event) => setAuditFilterAction(event.target.value)}
            className="w-full px-3 py-2 bg-[#1a1f2e] border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-[#00D9FF]"
          >
            <option value="all">All Actions</option>
            <option value="auto-backup">Auto Backup</option>
            <option value="manual-backup">Manual Backup</option>
            <option value="pre-restore-snapshot">Pre-Restore Snapshot</option>
            <option value="undo-restore">Undo Restore</option>
            <option value="restore">Restore</option>
            <option value="restore-cancel">Restore Cancel</option>
            <option value="delete-backup">Delete Backup</option>
            <option value="clear-backups">Clear Backups</option>
            <option value="import-backups">Import Backups</option>
            <option value="export-backups">Export Backups</option>
            <option value="single-payment">Single Payment</option>
            <option value="bulk-payment">Bulk Payment</option>
            <option value="settings-change">Settings Change</option>
          </select>
        </div>

        {filteredAuditLog.length === 0 ? (
          <p className="text-gray-400 text-sm">No audit events yet.</p>
        ) : (
          <div className="space-y-2">
            {filteredAuditLog.slice(0, 8).map((event) => (
              <div key={event.id} className="bg-[#1a1f2e] border border-gray-700 rounded-lg px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <p className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${getAuditActionTone(event.action)}`}>
                    {getAuditActionLabel(event.action)}
                  </p>
                  <p className="text-gray-400 text-xs">{new Date(event.at).toLocaleString()}</p>
                </div>
                <p className="text-gray-300 text-xs mt-1">{event.detail}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Workday Rewards Tab */}
      {activeRewardTab === 'workday' && (
        <div className="space-y-4">
          <div className="bg-[#252b3d] border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Workday Salary Rewards</h3>
              <p className="text-gray-400 text-sm">Configure daily attendance salary rewards</p>
            </div>
            <div className="space-y-3">
              {(rewardsConfig?.workday ?? []).map((reward: any) => (
                <div key={reward.id} className="bg-[#1a1f2e] rounded-lg p-4 flex items-center justify-between hover:ring-2 hover:ring-[#00D9FF] transition-all">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="bg-blue-500/20 p-3 rounded-lg">
                      <Clock className="text-blue-400" size={24} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h4 className="text-white font-bold text-lg">{reward.days} Days Worked</h4>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${reward.enabled ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-400'}`}>
                          {reward.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm">Salary earned for {reward.days} days of perfect attendance</p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-400 text-xs">Salary Amount</p>
                      <p className="text-[#00D9FF] font-bold text-2xl">${(Number(reward.salary) || 0).toLocaleString()}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => { setSelectedItem(reward); setModalType('edit-workday-reward'); }}
                    className="ml-4 p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                  >
                    <Edit size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Reset Rewards Tab */}
      {activeRewardTab === 'reset' && (
        <div className="space-y-4">
          <div className="bg-[#252b3d] border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Anniversary Reset Rewards</h3>
              <p className="text-gray-400 text-sm">Configure deposit-based bonus rewards</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(rewardsConfig?.reset ?? []).map((reward: any) => (
                <div key={reward.id} className={`${reward.color} rounded-xl p-5 relative overflow-hidden hover:ring-4 hover:ring-[#00D9FF] transition-all`}>
                  <div className={`absolute top-2 right-2 px-2 py-1 ${reward.labelColor} text-white rounded-full text-xs font-bold`}>
                    {reward.label}
                  </div>
                  <div className={`absolute top-2 left-2 px-2 py-1 rounded text-xs font-semibold ${reward.enabled ? 'bg-green-600 text-white' : 'bg-gray-600 text-white'}`}>
                    {reward.enabled ? 'Active' : 'Inactive'}
                  </div>
                  <div className="mt-6 mb-3 text-center">
                    <p className="text-black text-xs mb-1">Deposit Amount</p>
                    <p className="text-black font-bold text-2xl">${(Number(reward.deposit) || 0).toLocaleString()}</p>
                  </div>
                  <div className="mb-4 text-center">
                    <p className="text-black text-xs mb-1">Extra Reward</p>
                    <p className="text-black font-bold text-3xl">${(Number(reward.reward) || 0).toLocaleString()}</p>
                  </div>
                  <button 
                    onClick={() => { setSelectedItem(reward); setModalType('edit-reset-reward'); }}
                    className="w-full bg-black/20 hover:bg-black/30 text-black font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Edit size={16} />
                    Edit Reward
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Accumulated Rewards Tab */}
      {activeRewardTab === 'accumulated' && (
        <div className="space-y-4">
          <div className="bg-[#252b3d] border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Accumulated Deposit Rewards</h3>
              <p className="text-gray-400 text-sm">Daily deposit accumulation percentage rewards</p>
            </div>
            <div className="space-y-3">
              {(rewardsConfig?.accumulated ?? []).map((reward: any) => (
                <div key={reward.id} className="bg-[#1a1f2e] rounded-lg p-5 hover:ring-2 hover:ring-[#00D9FF] transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-4 rounded-lg">
                        <TrendingUp className="text-white" size={28} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="text-white font-bold text-lg">
                            ${(Number(reward.minDeposit) || 0).toLocaleString()} {reward.maxDeposit ? `- $${(Number(reward.maxDeposit) || 0).toLocaleString()}` : '& Above'}
                          </h4>
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${reward.enabled ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-400'}`}>
                            {reward.enabled ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <p className="text-gray-400 text-sm">Accumulated deposits within this range per day</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-gray-400 text-xs mb-1">Reward Rate</p>
                        <p className="text-[#00D9FF] font-bold text-3xl">{((Number(reward.rate) || 0) * 100).toFixed(1)}%</p>
                      </div>
                      <button 
                        onClick={() => { setSelectedItem(reward); setModalType('edit-accumulated-reward'); }}
                        className="p-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
                      >
                        <Edit size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Product System Tab */}
      {activeRewardTab === 'product-system' && (
        <div className="space-y-4">
          <div className="bg-[#252b3d] border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Product System Configuration</h3>
              <button 
                onClick={() => setModalType('edit-product-system')}
                className="flex items-center gap-2 bg-[#00D9FF] hover:bg-[#00c5e6] text-[#1a1f2e] px-4 py-2 rounded-lg font-semibold transition-colors"
              >
                <Settings2 size={18} />
                Edit Configuration
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#1a1f2e] rounded-lg p-5 border-l-4 border-blue-500">
                <div className="flex items-center gap-3 mb-2">
                  <Package className="text-blue-400" size={24} />
                  <h4 className="text-white font-bold">Products Per Set</h4>
                </div>
                <p className="text-[#00D9FF] font-bold text-3xl">{rewardsConfig?.productSystem?.productsPerSet ?? 0}</p>
                <p className="text-gray-400 text-sm mt-1">Number of products in each task set</p>
              </div>
              <div className="bg-[#1a1f2e] rounded-lg p-5 border-l-4 border-green-500">
                <div className="flex items-center gap-3 mb-2">
                  <Zap className="text-green-400" size={24} />
                  <h4 className="text-white font-bold">Max Sets Per Day</h4>
                </div>
                <p className="text-green-400 font-bold text-3xl">{rewardsConfig?.productSystem?.maxSetsPerDay ?? 0}</p>
                <p className="text-gray-400 text-sm mt-1">Maximum task sets users can complete daily</p>
              </div>
              <div className="bg-[#1a1f2e] rounded-lg p-5 border-l-4 border-yellow-500">
                <div className="flex items-center gap-3 mb-2">
                  <Clock className="text-yellow-400" size={24} />
                  <h4 className="text-white font-bold">Min Time Per Product</h4>
                </div>
                <p className="text-yellow-400 font-bold text-3xl">{rewardsConfig?.productSystem?.minTimePerProduct ?? 0}s</p>
                <p className="text-gray-400 text-sm mt-1">Minimum time required per product task</p>
              </div>
              <div className="bg-[#1a1f2e] rounded-lg p-5 border-l-4 border-purple-500">
                <div className="flex items-center gap-3 mb-2">
                  <Check className="text-purple-400" size={24} />
                  <h4 className="text-white font-bold">Auto-Approve Commission</h4>
                </div>
                <p className={`font-bold text-3xl ${rewardsConfig?.productSystem?.autoApproveCommission ? 'text-green-400' : 'text-red-400'}`}>
                  {rewardsConfig?.productSystem?.autoApproveCommission ? 'ON' : 'OFF'}
                </p>
                <p className="text-gray-400 text-sm mt-1">Automatically approve commission payments</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Salary Payments Tab */}
      {activeRewardTab === 'salary-payments' && (
        <div className="space-y-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-[#252b3d] border border-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="text-yellow-400" size={18} />
                <p className="text-gray-400 text-xs">Pending Payments</p>
              </div>
              <p className="text-2xl font-bold text-white">{salaryPayments.filter(p => p.status === 'Pending').length}</p>
              <p className="text-gray-400 text-xs mt-1">${salaryPayments.filter(p => p.status === 'Pending').reduce((sum: number, p: any) => sum + (Number(p.salaryDue) || 0), 0).toLocaleString()} total</p>
            </div>
            <div className="bg-[#252b3d] border border-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Check className="text-green-400" size={18} />
                <p className="text-gray-400 text-xs">Paid This Month</p>
              </div>
              <p className="text-2xl font-bold text-white">{salaryPayments.filter(p => p.status === 'Paid').length}</p>
              <p className="text-gray-400 text-xs mt-1">${salaryPayments.filter(p => p.status === 'Paid').reduce((sum: number, p: any) => sum + (Number(p.salaryDue) || 0), 0).toLocaleString()} total</p>
            </div>
            <div className="bg-[#252b3d] border border-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="text-blue-400" size={18} />
                <p className="text-gray-400 text-xs">Automatic Mode</p>
              </div>
              <p className="text-2xl font-bold text-white">{salaryPayments.filter(p => p.paymentMode === 'Automatic').length}</p>
              <p className="text-gray-400 text-xs mt-1">Auto-processed</p>
            </div>
            <div className="bg-[#252b3d] border border-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="text-purple-400" size={18} />
                <p className="text-gray-400 text-xs">Manual Mode</p>
              </div>
              <p className="text-2xl font-bold text-white">{salaryPayments.filter(p => p.paymentMode === 'Manual').length}</p>
              <p className="text-gray-400 text-xs mt-1">Requires approval</p>
            </div>
          </div>

          {/* Salary Payments Table */}
          <div className="bg-[#252b3d] border border-gray-700 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#1a1f2e]">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">User</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Days Worked</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Salary Due</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Due Date</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Payment Mode</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {salaryPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-[#1a1f2e] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-[#00D9FF] rounded-full flex items-center justify-center text-[#1a1f2e] font-bold text-sm">
                            {payment.username.charAt(0)}
                          </div>
                          <span className="text-white font-semibold">{payment.username}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-white font-bold">{payment.daysWorked} days</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[#00D9FF] font-bold text-lg">${(Number(payment.salaryDue) || 0).toLocaleString()}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-300">{payment.dueDate}</span>
                        {payment.paidDate && <p className="text-green-400 text-xs">Paid: {payment.paidDate}</p>}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          payment.paymentMode === 'Automatic' ? 'bg-blue-500/20 text-blue-300' : 'bg-purple-500/20 text-purple-300'
                        }`}>
                          {payment.paymentMode}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          payment.status === 'Paid' ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'
                        }`}>
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {payment.status === 'Pending' && (
                          <button 
                            onClick={() => { setSelectedItem(payment); setModalType('pay-salary'); }}
                            className="flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors"
                          >
                            <Wallet size={14} />
                            Pay Now
                          </button>
                        )}
                        {payment.status === 'Paid' && (
                          <span className="text-green-400 text-sm flex items-center gap-1">
                            <Check size={14} />
                            Completed
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
