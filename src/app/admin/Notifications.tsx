import React from 'react';
import { Bell, Clock, TrendingUp, Shield } from 'lucide-react';

interface NotificationsProps {
  setModalType: any;
  formatRelativeTime: (date: string) => string;
}

export default function Notifications({
  setModalType,
  formatRelativeTime,
}: NotificationsProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Notifications</h2>
          <p className="text-gray-400 text-sm mt-1">Send announcements and alerts to users</p>
        </div>
        <button onClick={() => setModalType('notification')} className="flex items-center gap-2 bg-[#00D9FF] hover:bg-[#00c5e6] text-[#1a1f2e] px-4 py-2 rounded-lg font-semibold transition-colors">
          <Bell size={18} />
          Send Notification
        </button>
      </div>

      {/* Recent Notifications */}
      <div className="space-y-4">
        <div className="bg-[#252b3d] rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <Bell className="text-blue-400" size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-semibold mb-1">System Maintenance Notice</h3>
              <p className="text-gray-400 text-sm mb-2">Scheduled maintenance on March 10, 2024 from 2:00 AM - 4:00 AM EST</p>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1"><Clock size={12} /> {formatRelativeTime('2026-03-17T02:55:00Z')}</span>
                <span>Sent to: All Users</span>
                <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded">High Priority</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#252b3d] rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-green-500/20 rounded-lg">
              <TrendingUp className="text-green-400" size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-semibold mb-1">New VIP Benefits Available</h3>
              <p className="text-gray-400 text-sm mb-2">VIP 4 and VIP 5 members can now access exclusive high-commission tasks</p>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1"><Clock size={12} /> {formatRelativeTime('2026-03-16T10:00:00Z')}</span>
                <span>Sent to: VIP 4, VIP 5</span>
                <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded">Normal</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#252b3d] rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-purple-500/20 rounded-lg">
              <Shield className="text-purple-400" size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-semibold mb-1">Security Update Required</h3>
              <p className="text-gray-400 text-sm mb-2">Please update your password for enhanced security</p>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1"><Clock size={12} /> {formatRelativeTime('2026-03-14T16:30:00Z')}</span>
                <span>Sent to: All Users</span>
                <span className="px-2 py-1 bg-red-500/20 text-red-300 rounded">Urgent</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
