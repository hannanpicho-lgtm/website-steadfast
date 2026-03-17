import React, { useState } from 'react';
import { toast } from 'sonner';

interface AdminSettingsProps {
  isSuperAdmin: boolean;
}

export default function AdminSettings({ isSuperAdmin }: AdminSettingsProps) {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [allowNewRegistration, setAllowNewRegistration] = useState(true);
  const [minWithdrawal, setMinWithdrawal] = useState('50');
  const [maxWithdrawal, setMaxWithdrawal] = useState('10000');
  const [withdrawalFee, setWithdrawalFee] = useState('2.0');
  const [minDeposit, setMinDeposit] = useState('10');
  const [taskRefreshHours, setTaskRefreshHours] = useState('24');
  const [autoAssignTasks, setAutoAssignTasks] = useState('Enabled');
  const [saving, setSaving] = useState(false);

  const handleSaveSettings = async () => {
    if (!isSuperAdmin) {
      toast.error('Only super admins can save platform settings.');
      return;
    }

    const minW = parseFloat(minWithdrawal);
    const maxW = parseFloat(maxWithdrawal);
    const fee = parseFloat(withdrawalFee);
    const minD = parseFloat(minDeposit);
    const refresh = parseInt(taskRefreshHours, 10);

    if (isNaN(minW) || minW < 1) { toast.error('Minimum withdrawal must be at least $1.'); return; }
    if (isNaN(maxW) || maxW <= minW) { toast.error('Maximum withdrawal must be greater than minimum.'); return; }
    if (isNaN(fee) || fee < 0 || fee > 50) { toast.error('Withdrawal fee must be between 0% and 50%.'); return; }
    if (isNaN(minD) || minD < 1) { toast.error('Minimum deposit must be at least $1.'); return; }
    if (isNaN(refresh) || refresh < 1 || refresh > 168) { toast.error('Task refresh time must be between 1 and 168 hours.'); return; }

    setSaving(true);
    try {
      // Persist to localStorage as the settings endpoint is not yet server-side
      const settings = {
        maintenanceMode,
        allowNewRegistration,
        minWithdrawal: minW,
        maxWithdrawal: maxW,
        withdrawalFee: fee,
        minDeposit: minD,
        taskRefreshHours: refresh,
        autoAssignTasks,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem('steadfast_admin_platform_settings', JSON.stringify(settings));
      toast.success('Platform settings saved successfully.');
    } catch {
      toast.error('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Platform Settings</h2>
        <p className="text-gray-400 text-sm mt-1">Configure global platform settings and parameters</p>
      </div>

      <div className="space-y-4">
        {/* General Settings */}
        <div className="bg-[#252b3d] rounded-lg p-6">
          <h3 className="text-white font-semibold text-lg mb-4">General Settings</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white">Platform Maintenance Mode</p>
                <p className="text-gray-400 text-sm">Temporarily disable user access</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={maintenanceMode}
                  onChange={(e) => setMaintenanceMode(e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
              </label>
            </div>
            {maintenanceMode && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2">
                ⚠️ Maintenance mode is ON — users will see a maintenance page when they visit the platform.
              </p>
            )}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white">Allow New User Registration</p>
                <p className="text-gray-400 text-sm">Enable or disable new sign-ups</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={allowNewRegistration}
                  onChange={(e) => setAllowNewRegistration(e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00D9FF]"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Transaction Settings */}
        <div className="bg-[#252b3d] rounded-lg p-6">
          <h3 className="text-white font-semibold text-lg mb-4">Transaction Settings</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Minimum Withdrawal Amount ($)</label>
              <input
                type="number"
                value={minWithdrawal}
                min={1}
                onChange={(e) => setMinWithdrawal(e.target.value)}
                className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Maximum Withdrawal Amount ($)</label>
              <input
                type="number"
                value={maxWithdrawal}
                min={1}
                onChange={(e) => setMaxWithdrawal(e.target.value)}
                className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Withdrawal Fee (%)</label>
              <input
                type="number"
                step="0.1"
                value={withdrawalFee}
                min={0}
                max={50}
                onChange={(e) => setWithdrawalFee(e.target.value)}
                className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Minimum Deposit Amount ($)</label>
              <input
                type="number"
                value={minDeposit}
                min={1}
                onChange={(e) => setMinDeposit(e.target.value)}
                className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Task Settings */}
        <div className="bg-[#252b3d] rounded-lg p-6">
          <h3 className="text-white font-semibold text-lg mb-4">Task Settings</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Task Refresh Time (hours)</label>
              <input
                type="number"
                value={taskRefreshHours}
                min={1}
                max={168}
                onChange={(e) => setTaskRefreshHours(e.target.value)}
                className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Auto-Assign Tasks</label>
              <select
                value={autoAssignTasks}
                onChange={(e) => setAutoAssignTasks(e.target.value)}
                className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none"
              >
                <option>Enabled</option>
                <option>Disabled</option>
              </select>
            </div>
          </div>
        </div>

        <button
          onClick={() => void handleSaveSettings()}
          disabled={saving}
          className="w-full bg-[#00D9FF] hover:bg-[#00c5e6] disabled:opacity-60 disabled:cursor-not-allowed text-[#1a1f2e] font-bold py-3 rounded-lg transition-colors"
        >
          {saving ? 'Saving…' : 'Save All Settings'}
        </button>
      </div>
    </div>
  );
}
