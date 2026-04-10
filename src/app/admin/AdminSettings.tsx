import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  fetchAdminPlatformSettingsFromServer,
  saveAdminPlatformSettingsToServer,
  type AdminPlatformSettings,
  type WeeklySchedule,
  type DaySchedule,
  DAY_KEYS,
  getDefaultWeeklySchedule,
} from '../services/adminPlatformSettings';
import PlatformModePanel from './PlatformModePanel';

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
  const [autoAssignTasks, setAutoAssignTasks] = useState<'Enabled' | 'Disabled'>('Enabled');
  const [platformHoursEnabled, setPlatformHoursEnabled] = useState(false);
  const [platformHoursStart, setPlatformHoursStart] = useState('9');
  const [platformHoursEnd, setPlatformHoursEnd] = useState('22');
  const [platformScheduleMode, setPlatformScheduleMode] = useState<'simple' | 'per-day'>('simple');
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>(getDefaultWeeklySchedule());
  const [defaultTaskSetCount, setDefaultTaskSetCount] = useState('2');
  const [isHydrating, setIsHydrating] = useState(true);
  const [saving, setSaving] = useState(false);

  const applySettings = (settings: AdminPlatformSettings) => {
    setMaintenanceMode(settings.maintenanceMode);
    setAllowNewRegistration(settings.allowNewRegistration);
    setMinWithdrawal(String(settings.minWithdrawal));
    setMaxWithdrawal(String(settings.maxWithdrawal));
    setWithdrawalFee(String(settings.withdrawalFee));
    setMinDeposit(String(settings.minDeposit));
    setTaskRefreshHours(String(settings.taskRefreshHours));
    setAutoAssignTasks(settings.autoAssignTasks);
    setPlatformHoursEnabled(settings.platformHoursEnabled ?? false);
    setPlatformHoursStart(String(settings.platformHoursStart ?? 9));
    setPlatformHoursEnd(String(settings.platformHoursEnd ?? 22));
    setPlatformScheduleMode(settings.platformScheduleMode ?? 'simple');
    setWeeklySchedule(settings.weeklySchedule ?? getDefaultWeeklySchedule());
    setDefaultTaskSetCount(String(settings.defaultTaskSetCount ?? 2));
  };

  useEffect(() => {
    let cancelled = false;

    const hydrateSettings = async () => {
      try {
        const serverSettings = await fetchAdminPlatformSettingsFromServer();
        if (cancelled) {
          return;
        }

        if (serverSettings) {
          applySettings(serverSettings);
          return;
        }
      } catch {
        // Keep defaults if backend fetch fails.
      } finally {
        if (!cancelled) {
          setIsHydrating(false);
        }
      }
    };

    void hydrateSettings();

    return () => {
      cancelled = true;
    };
  }, [isSuperAdmin]);

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
    const pStart = parseInt(platformHoursStart, 10);
    const pEnd = parseInt(platformHoursEnd, 10);
    const sets = parseInt(defaultTaskSetCount, 10);

    if (isNaN(minW) || minW < 1) { toast.error('Minimum withdrawal must be at least $1.'); return; }
    if (isNaN(maxW) || maxW <= minW) { toast.error('Maximum withdrawal must be greater than minimum.'); return; }
    if (isNaN(fee) || fee < 0 || fee > 50) { toast.error('Withdrawal fee must be between 0% and 50%.'); return; }
    if (isNaN(minD) || minD < 1) { toast.error('Minimum deposit must be at least $1.'); return; }
    if (isNaN(refresh) || refresh < 1 || refresh > 168) { toast.error('Task refresh time must be between 1 and 168 hours.'); return; }
    if (platformHoursEnabled) {
      if (isNaN(pStart) || pStart < 0 || pStart > 23) { toast.error('Working hours start must be between 0 and 23.'); return; }
      if (isNaN(pEnd) || pEnd < 1 || pEnd > 24) { toast.error('Working hours end must be between 1 and 24.'); return; }
      if (pEnd <= pStart) { toast.error('Working hours end must be after start.'); return; }
    }
    if (isNaN(sets) || sets < 2 || sets > 10) { toast.error('Default task sets must be between 2 and 10.'); return; }

    setSaving(true);
    try {
      const settings: AdminPlatformSettings = {
        maintenanceMode,
        allowNewRegistration,
        minWithdrawal: minW,
        maxWithdrawal: maxW,
        withdrawalFee: fee,
        minDeposit: minD,
        taskRefreshHours: refresh,
        autoAssignTasks,
        platformHoursEnabled,
        platformHoursStart: platformHoursEnabled ? pStart : 9,
        platformHoursEnd: platformHoursEnabled ? pEnd : 22,
        platformScheduleMode,
        weeklySchedule,
        defaultTaskSetCount: sets,
        savedAt: new Date().toISOString(),
      };
      await saveAdminPlatformSettingsToServer(settings);
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

      {/* Platform Mode (Kill-Switch) Panel */}
      <PlatformModePanel isSuperAdmin={isSuperAdmin} />

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
                onChange={(e) => setAutoAssignTasks(e.target.value === 'Disabled' ? 'Disabled' : 'Enabled')}
                className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none"
              >
                <option>Enabled</option>
                <option>Disabled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Platform Working Hours — Time Management */}
        <div className="bg-[#252b3d] rounded-lg p-6">
          <h3 className="text-white font-semibold text-lg mb-1">Time Management</h3>
          <p className="text-gray-400 text-sm mb-4">Restrict task submission and customer support to set hours (EST). Disable to keep platform open 24/7 or for testing.</p>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-white">Enforce Working Hours</p>
              <p className="text-gray-400 text-sm">When enabled, users cannot submit tasks or access CS outside the window</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={platformHoursEnabled}
                onChange={(e) => setPlatformHoursEnabled(e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00D9FF]"></div>
            </label>
          </div>
          {platformHoursEnabled && (
            <>
              {/* Schedule Mode Toggle */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-gray-400 text-sm">Mode:</span>
                <button
                  type="button"
                  onClick={() => setPlatformScheduleMode('simple')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${platformScheduleMode === 'simple' ? 'bg-[#00D9FF] text-[#1a1f2e]' : 'bg-[#1a1f2e] text-gray-400 hover:text-white border border-gray-600'}`}
                >
                  Same Every Day
                </button>
                <button
                  type="button"
                  onClick={() => setPlatformScheduleMode('per-day')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${platformScheduleMode === 'per-day' ? 'bg-[#00D9FF] text-[#1a1f2e]' : 'bg-[#1a1f2e] text-gray-400 hover:text-white border border-gray-600'}`}
                >
                  Per Day
                </button>
              </div>

              {platformScheduleMode === 'simple' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Open Hour (0-23, EST)</label>
                    <input
                      type="number"
                      value={platformHoursStart}
                      min={0}
                      max={23}
                      onChange={(e) => setPlatformHoursStart(e.target.value)}
                      className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none"
                    />
                    <p className="text-gray-500 text-xs mt-1">9 = 9:00 AM EST</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Close Hour (1-24, EST)</label>
                    <input
                      type="number"
                      value={platformHoursEnd}
                      min={1}
                      max={24}
                      onChange={(e) => setPlatformHoursEnd(e.target.value)}
                      className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none"
                    />
                    <p className="text-gray-500 text-xs mt-1">22 = 10:00 PM EST</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {DAY_KEYS.map((day) => {
                    const schedule = weeklySchedule[day];
                    const dayLabel = day.charAt(0).toUpperCase() + day.slice(1);
                    return (
                      <div key={day} className="flex items-center gap-3 bg-[#1a1f2e] rounded-lg px-4 py-3">
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={schedule.enabled}
                            onChange={(e) => {
                              setWeeklySchedule((prev) => ({
                                ...prev,
                                [day]: { ...prev[day], enabled: e.target.checked },
                              }));
                            }}
                          />
                          <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#00D9FF]"></div>
                        </label>
                        <span className={`w-24 text-sm font-semibold ${schedule.enabled ? 'text-white' : 'text-gray-500'}`}>{dayLabel}</span>
                        {schedule.enabled ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={0}
                              max={23}
                              value={schedule.start}
                              onChange={(e) => {
                                const val = Math.min(23, Math.max(0, parseInt(e.target.value, 10) || 0));
                                setWeeklySchedule((prev) => ({
                                  ...prev,
                                  [day]: { ...prev[day], start: val },
                                }));
                              }}
                              className="w-16 px-2 py-1 bg-[#252b3d] border border-gray-600 rounded text-white text-sm text-center focus:border-[#00D9FF] focus:outline-none"
                            />
                            <span className="text-gray-500 text-xs">to</span>
                            <input
                              type="number"
                              min={1}
                              max={24}
                              value={schedule.end}
                              onChange={(e) => {
                                const val = Math.min(24, Math.max(1, parseInt(e.target.value, 10) || 1));
                                setWeeklySchedule((prev) => ({
                                  ...prev,
                                  [day]: { ...prev[day], end: val },
                                }));
                              }}
                              className="w-16 px-2 py-1 bg-[#252b3d] border border-gray-600 rounded text-white text-sm text-center focus:border-[#00D9FF] focus:outline-none"
                            />
                            <span className="text-gray-500 text-xs">EST</span>
                          </div>
                        ) : (
                          <span className="text-gray-500 text-xs italic">Closed all day</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
          {platformHoursEnabled && (
            <p className="text-amber-400 text-xs mt-3 bg-amber-400/10 border border-amber-400/30 rounded-lg px-3 py-2">
              ⚠️ Working hours ON — {platformScheduleMode === 'simple'
                ? `users can only submit tasks and access CS from ${platformHoursStart}:00 to ${platformHoursEnd}:00 EST daily.`
                : 'users can only submit tasks and access CS during the per-day windows configured above.'
              } Disable to open access for updates/testing.
            </p>
          )}
        </div>

        {/* Default Task Sets */}
        <div className="bg-[#252b3d] rounded-lg p-6">
          <h3 className="text-white font-semibold text-lg mb-1">Default Task Sets Per User</h3>
          <p className="text-gray-400 text-sm mb-4">Number of task sets automatically assigned to every newly created user account. All existing users are re-synced to this value on their next login or VIP sync.</p>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Task Sets (2–10)</label>
            <input
              type="number"
              value={defaultTaskSetCount}
              min={2}
              max={10}
              onChange={(e) => setDefaultTaskSetCount(e.target.value)}
              className="w-full max-w-xs px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none"
            />
            <p className="text-gray-500 text-xs mt-1">Default: 2 — each user completes this many full task sets per day.</p>
          </div>
        </div>

        <button
          onClick={() => void handleSaveSettings()}
          disabled={saving || isHydrating}
          className="w-full bg-[#00D9FF] hover:bg-[#00c5e6] disabled:opacity-60 disabled:cursor-not-allowed text-[#1a1f2e] font-bold py-3 rounded-lg transition-colors"
        >
          {saving ? 'Saving…' : isHydrating ? 'Loading Settings…' : 'Save All Settings'}
        </button>
      </div>
    </div>
  );
}
