import React from 'react';
import { Plus, Search, Download, Eye, Edit, Key, Check, X, Trash2, RefreshCw, Shield } from 'lucide-react';
import { toast } from 'sonner';

interface UserManagementProps {
  platformUsers: any[];
  platformUsersLoaded: boolean;
  platformUsersLoading: boolean;
  isSuperAdmin: boolean;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterStatus: string;
  setFilterStatus: (status: string) => void;
  userPage: number;
  setUserPage: React.Dispatch<React.SetStateAction<number>>;
  usersPerPage: number;
  setSelectedItem: (item: any) => void;
  setModalType: any;
  handleExport: () => void;
  onToggleSuspension: (user: any) => void | Promise<void>;
  onResetTaskSet: (user: any) => void | Promise<void>;
  onRestoreNaturalState: (user: any) => void | Promise<void>;
  onResetCredentials: (user: any) => void | Promise<void>;
}

export default function UserManagement({
  platformUsers,
  platformUsersLoaded,
  platformUsersLoading,
  isSuperAdmin,
  searchTerm,
  setSearchTerm,
  filterStatus,
  setFilterStatus,
  userPage,
  setUserPage,
  usersPerPage,
  setSelectedItem,
  setModalType,
  handleExport,
  onToggleSuspension,
  onResetTaskSet,
  onRestoreNaturalState,
  onResetCredentials,
}: UserManagementProps) {
  type DisplayUser = {
    id: number;
    username: string;
    email: string;
    phone: string;
    vipLevel: number;
    balance: number;
    status: string;
    registered: string;
    tasksCompleted: number;
    referredByAdminName: string;
    taskSetCount?: number;
    tasksPerSet?: number;
    tasksCompletedInSet?: number;
    completedTaskSets?: number;
    pendingTaskReset?: boolean;
    holdAmount?: number;
    isFrozen?: boolean;
  };
  const normalizedUsers: DisplayUser[] = platformUsersLoaded
    ? [...platformUsers]
        .sort((a, b) => {
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bTime - aTime;
        })
        .map((u, i) => ({ id: i + 1, username: u.username, email: '—', phone: '—', vipLevel: u.vipLevel, balance: u.balance, status: u.isFrozen ? 'Suspended' : 'Active', registered: u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—', tasksCompleted: u.tasksCompleted, referredByAdminName: u.referredByAdminName || '—', taskSetCount: u.taskSetCount, tasksPerSet: u.tasksPerSet, tasksCompletedInSet: u.tasksCompletedInSet, completedTaskSets: u.completedTaskSets, pendingTaskReset: u.pendingTaskReset, holdAmount: u.holdAmount, isFrozen: u.isFrozen }))
    : [];
  const filteredUsers = normalizedUsers.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.phone.includes(searchTerm);
    const matchesFilter = filterStatus === 'all' || user.status.toLowerCase() === filterStatus;
    return matchesSearch && matchesFilter;
  });
  const totalUserPages = Math.max(1, Math.ceil(filteredUsers.length / usersPerPage));
  const safeUserPage = Math.min(userPage, totalUserPages);
  const userStartIndex = (safeUserPage - 1) * usersPerPage;
  const paginatedUsers = filteredUsers.slice(userStartIndex, userStartIndex + usersPerPage);

  return (
    <div className="space-y-6">
      {/* Scoping Banner (sub-admins only) */}
      {!isSuperAdmin && (
        <div className="flex items-center gap-2 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 text-sm text-blue-300">
          <Shield size={14} />
          You are viewing only users who signed up with your invitation code.
        </div>
      )}
      {!platformUsersLoaded && platformUsersLoading && (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <RefreshCw size={14} className="animate-spin" />
          Loading users…
        </div>
      )}
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">User Management</h2>
          <p className="text-gray-400 text-sm mt-1">Manage all registered users and their accounts</p>
        </div>
        <button onClick={() => setModalType('add-user')} className="flex items-center gap-2 bg-[#00D9FF] hover:bg-[#00c5e6] text-[#1a1f2e] px-4 py-2 rounded-lg font-semibold transition-colors">
          <Plus size={18} />
          Add User
        </button>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex items-center gap-4 bg-[#252b3d] p-4 rounded-lg">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by username, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#00D9FF]"
          />
        </div>
        <select 
          value={filterStatus} 
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="suspended">Suspended</option>
        </select>
        <button onClick={handleExport} className="flex items-center gap-2 bg-[#1a1f2e] hover:bg-[#2c3e50] border border-gray-600 text-white px-4 py-2 rounded-lg transition-colors">
          <Download size={18} />
          Export
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-[#252b3d] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#1a1f2e] border-b border-gray-700">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">ID</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Username</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">VIP Level</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Balance</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Registered</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Referred By</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Set Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {paginatedUsers.map((user) => (
                <tr key={user.id} className="hover:bg-[#2c3e50] transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-300">{user.id}</td>
                  <td className="px-6 py-4 text-sm font-medium text-white">{user.username}</td>
                  <td className="px-6 py-4 text-sm text-gray-300">
                    <div>{user.email}</div>
                    <div className="text-xs text-gray-500">{user.phone}</div>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300">
                      {user.vipLevel}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-[#00D9FF]">${user.balance.toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      user.status === 'Active' ? 'bg-green-500/20 text-green-300' :
                      user.status === 'Suspended' ? 'bg-red-500/20 text-red-300' :
                      'bg-yellow-500/20 text-yellow-300'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">{user.registered}</td>
                  <td className="px-6 py-4 text-sm text-gray-400">{user.referredByAdminName}</td>
                  <td className="px-6 py-4 text-sm text-gray-300">
                    {typeof user.tasksPerSet === 'number' && typeof user.taskSetCount === 'number' ? (
                      <div className="space-y-1">
                        <p className="text-xs text-gray-300">{user.tasksCompletedInSet ?? 0}/{user.tasksPerSet} in set</p>
                        <p className="text-xs text-gray-400">Sets {user.completedTaskSets ?? 0}/{user.taskSetCount}</p>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${user.pendingTaskReset ? 'bg-yellow-500/20 text-yellow-300' : 'bg-green-500/20 text-green-300'}`}>
                          {user.pendingTaskReset ? 'Reset Needed' : 'Ready'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-500">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => { setSelectedItem(user); setModalType('view-user'); }}
                        className="p-1 hover:bg-[#1a1f2e] rounded transition-colors" 
                        title="View Details"
                      >
                        <Eye size={16} className="text-gray-400 hover:text-[#00D9FF]" />
                      </button>
                      <button 
                        onClick={() => { setSelectedItem(user); setModalType('edit-user'); }}
                        className="p-1 hover:bg-[#1a1f2e] rounded transition-colors" 
                        title="Edit User"
                      >
                        <Edit size={16} className="text-gray-400 hover:text-blue-400" />
                      </button>
                      <button 
                        onClick={() => { if (confirm(`Reset login and transaction passwords for ${user.username}?`)) { void onResetCredentials(user); } }}
                        className="p-1 hover:bg-[#1a1f2e] rounded transition-colors" 
                        title="Reset User Credentials"
                      >
                        <Key size={16} className="text-gray-400 hover:text-yellow-400" />
                      </button>
                      {user.status === 'Suspended' ? (
                        <button 
                          onClick={() => { if (confirm(`Restore account for ${user.username}?`)) { void onRestoreNaturalState(user); } }}
                          className="p-1 hover:bg-[#1a1f2e] rounded transition-colors" 
                          title="Restore Account"
                        >
                          <Check size={16} className="text-gray-400 hover:text-green-400" />
                        </button>
                      ) : (
                        <button 
                          onClick={() => { if (confirm(`Suspend account for ${user.username}?`)) { void onToggleSuspension(user); } }}
                          className="p-1 hover:bg-[#1a1f2e] rounded transition-colors" 
                          title="Suspend Account"
                        >
                          <X size={16} className="text-gray-400 hover:text-orange-400" />
                        </button>
                      )}
                      <button 
                        onClick={() => {
                          if (!user.pendingTaskReset) {
                            toast.info('This user has not finished the current task set yet.');
                            return;
                          }
                          if (confirm(`Reset completed task set for ${user.username}?`)) {
                            void onResetTaskSet(user);
                          }
                        }}
                        className="p-1 hover:bg-[#1a1f2e] rounded transition-colors" 
                        title="Reset Completed Task Set"
                      >
                        <RefreshCw size={16} className={`text-gray-400 ${user.pendingTaskReset ? 'hover:text-yellow-400' : ''}`} />
                      </button>
                      <button 
                        onClick={() => { setSelectedItem(user); setModalType('delete-user'); }}
                        className="p-1 hover:bg-[#1a1f2e] rounded transition-colors" 
                        title="Delete User"
                      >
                        <Trash2 size={16} className="text-gray-400 hover:text-red-400" />
                      </button>
                    </div>
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
          Showing {filteredUsers.length === 0 ? 0 : userStartIndex + 1}
          -{Math.min(userStartIndex + paginatedUsers.length, filteredUsers.length)} of {filteredUsers.length} results
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setUserPage((current) => Math.max(1, current - 1))}
            disabled={safeUserPage <= 1}
            className="px-3 py-1 bg-[#1a1f2e] border border-gray-600 text-gray-400 rounded hover:bg-[#2c3e50] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button className="px-3 py-1 bg-[#00D9FF] text-[#1a1f2e] font-semibold rounded">
            {safeUserPage} / {totalUserPages}
          </button>
          <button
            onClick={() => setUserPage((current) => Math.min(totalUserPages, current + 1))}
            disabled={safeUserPage >= totalUserPages}
            className="px-3 py-1 bg-[#1a1f2e] border border-gray-600 text-gray-400 rounded hover:bg-[#2c3e50] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
