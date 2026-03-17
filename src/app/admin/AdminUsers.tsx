import React, { useState } from 'react';
import { Plus, UserCog, ShieldCheck, LinkIcon, Info, X, Users, Check, Lock, XCircle, Shield, Eye, Edit, Trash2, RefreshCw, Key, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router';
import InvitationCodes from '@/app/components/admin/InvitationCodes';
import { Suspense } from 'react';
import AdminPanelFallback from '../components/AdminPanelFallback';
import { buildLoginRedirectState } from '../services/loginRedirect';
import { signOutAdminSession } from '../services/supabaseAuth';

interface AdminUsersProps {
  activeAdminTab: any;
  setActiveAdminTab: any;
  adminUsers: any[];
  adminRoles: any[];
  adminUsersLoading: boolean;
  adminUsersError: string | null;
  showAdminVisibilityNotice: boolean;
  setShowAdminVisibilityNotice: (show: boolean) => void;
  isSuperAdmin: boolean;
  setSelectedItem: (item: any) => void;
  setModalType: any;
  loadAdminUsers: () => void;
  currentAdminId: string | null;
  currentAdminInvitationCode: string | null;
  currentAdminCodeLoading: boolean;
  referralSummary: any;
  referralsLoading: boolean;
  referralsError: string | null;
  referralRows: any[];
  referralEvents: any[];
  loadReferralOverview: () => void;
  buildAdminAuthHeaders: () => Promise<Record<string, string>>;
  serverUrl: string;
}

export default function AdminUsers({
  activeAdminTab,
  setActiveAdminTab,
  adminUsers,
  adminRoles,
  adminUsersLoading,
  adminUsersError,
  showAdminVisibilityNotice,
  setShowAdminVisibilityNotice,
  isSuperAdmin,
  setSelectedItem,
  setModalType,
  loadAdminUsers,
  currentAdminId,
  currentAdminInvitationCode,
  currentAdminCodeLoading,
  referralSummary,
  referralsLoading,
  referralsError,
  referralRows,
  referralEvents,
  loadReferralOverview,
  buildAdminAuthHeaders,
  serverUrl,
}: AdminUsersProps) {
  const navigate = useNavigate();
  const [authRedirected, setAuthRedirected] = useState(false);
  const [referralRows_local] = useState(referralRows);

  const handleAdminError = (errorValue: unknown, fallbackMessage: string) => {
    const message = errorValue instanceof Error ? errorValue.message : fallbackMessage;
    const normalized = message.toLowerCase();
    const isAuthError = normalized.includes('session expired')
      || normalized.includes('access denied')
      || normalized.includes('not authorized')
      || normalized.includes('authorized admin account')
      || normalized.includes('sign in again');

    if (isAuthError) {
      if (!authRedirected) {
        setAuthRedirected(true);
        toast.error(message);
        void signOutAdminSession();
        navigate('/login', {
          replace: true,
          state: buildLoginRedirectState('/admin', {
            adminRequired: true,
            authReason: normalized.includes('access denied') || normalized.includes('not authorized')
              ? 'admin-access-required'
              : 'session-expired',
            authMessage: message,
          }),
        });
      }

      return;
    }

    toast.error(message);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Admin Users & Role Management</h2>
          <p className="text-gray-400 text-sm mt-1">Manage admin accounts and configure role-based access control</p>
        </div>
        <div className="flex gap-3">
          {activeAdminTab === 'admins' && (
            <button onClick={() => setModalType('add-admin')} className="flex items-center gap-2 bg-[#00D9FF] hover:bg-[#00c5e6] text-[#1a1f2e] px-5 py-2.5 rounded-lg font-semibold transition-colors shadow-lg">
              <Plus size={18} />
              Add Admin User
            </button>
          )}
          {activeAdminTab === 'roles' && (
            <button onClick={() => setModalType('add-role')} className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-5 py-2.5 rounded-lg font-semibold transition-colors shadow-lg">
              <Plus size={18} />
              Create New Role
            </button>
          )}
          {activeAdminTab === 'referrals' && (
            <button
              onClick={() => void loadReferralOverview()}
              className="flex items-center gap-2 bg-[#00D9FF] hover:bg-[#00c5e6] text-[#1a1f2e] px-5 py-2.5 rounded-lg font-semibold transition-colors shadow-lg"
            >
              <RefreshCw size={18} />
              Refresh Referrals
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-[#252b3d] p-2 rounded-lg">
        <button 
          onClick={() => setActiveAdminTab('admins')}
          className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-colors ${activeAdminTab === 'admins' ? 'bg-[#00D9FF] text-[#1a1f2e]' : 'text-gray-400 hover:text-white'}`}
        >
          <UserCog size={16} className="inline mr-2" />
          Admin Users
        </button>
        <button 
          onClick={() => setActiveAdminTab('roles')}
          className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-colors ${activeAdminTab === 'roles' ? 'bg-[#00D9FF] text-[#1a1f2e]' : 'text-gray-400 hover:text-white'}`}
        >
          <ShieldCheck size={16} className="inline mr-2" />
          Roles & Permissions
        </button>
        <button
          onClick={() => setActiveAdminTab('referrals')}
          className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-colors ${activeAdminTab === 'referrals' ? 'bg-[#00D9FF] text-[#1a1f2e]' : 'text-gray-400 hover:text-white'}`}
        >
          <LinkIcon size={16} className="inline mr-2" />
          Referral Management
        </button>
      </div>

      {/* Admin Users Tab */}
      {activeAdminTab === 'admins' && (
        <div className="space-y-4">
          {!isSuperAdmin && showAdminVisibilityNotice && (
            <div className="flex items-start justify-between gap-3 rounded-lg border border-blue-500/20 bg-blue-500/10 p-3 text-sm text-blue-200">
              <div className="flex items-start gap-2">
                <Info size={16} className="mt-0.5 shrink-0" />
                <p>Super-admin accounts are hidden for your role.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAdminVisibilityNotice(false)}
                className="rounded p-1 text-blue-200/80 hover:bg-blue-500/10 hover:text-blue-100 transition-colors"
                aria-label="Dismiss visibility notice"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-[#252b3d] border border-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="text-blue-400" size={18} />
                <p className="text-gray-400 text-xs">Total Admins</p>
              </div>
              <p className="text-2xl font-bold text-white">{adminUsers.length}</p>
            </div>
            <div className="bg-[#252b3d] border border-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Check className="text-green-400" size={18} />
                <p className="text-gray-400 text-xs">Active Admins</p>
              </div>
              <p className="text-2xl font-bold text-white">{adminUsers.filter(a => a.status === 'Active').length}</p>
            </div>
            <div className="bg-[#252b3d] border border-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="text-yellow-400" size={18} />
                <p className="text-gray-400 text-xs">2FA Enabled</p>
              </div>
              <p className="text-2xl font-bold text-white">{adminUsers.filter(a => a.twoFactorEnabled).length}</p>
            </div>
            <div className="bg-[#252b3d] border border-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="text-red-400" size={18} />
                <p className="text-gray-400 text-xs">Total Roles</p>
              </div>
              <p className="text-2xl font-bold text-white">{adminRoles.length}</p>
            </div>
          </div>

          {/* Admin Users Table */}
          <div className="bg-[#252b3d] border border-gray-700 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#1a1f2e]">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Admin User</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Role</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Department</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Last Login</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">2FA</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {adminUsersLoading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-10 text-center text-gray-400">
                        Loading admin users...
                      </td>
                    </tr>
                  ) : adminUsersError ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-10 text-center">
                        <div className="space-y-3">
                          <p className="text-red-300">{adminUsersError}</p>
                          <button
                            onClick={() => void loadAdminUsers()}
                            className="inline-flex items-center gap-2 bg-[#00D9FF] hover:bg-[#00c5e6] text-[#1a1f2e] px-4 py-2 rounded-lg font-semibold transition-colors"
                          >
                            <RefreshCw size={16} />
                            Retry
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : adminUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-10 text-center text-gray-400">
                        No admin users found in the live backend.
                      </td>
                    </tr>
                  ) : adminUsers.map((admin) => (
                    <tr key={admin.id} className="hover:bg-[#1a1f2e] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white ${
                            admin.roleColor === 'red' ? 'bg-red-500' : 
                            admin.roleColor === 'green' ? 'bg-green-500' : 
                            admin.roleColor === 'blue' ? 'bg-blue-500' : 
                            admin.roleColor === 'purple' ? 'bg-purple-500' : 
                            'bg-yellow-500'
                          }`}>
                            {admin.avatar}
                          </div>
                          <div>
                            <p className="text-white font-semibold">{admin.fullName}</p>
                            <p className="text-gray-400 text-xs">{admin.email}</p>
                            <p className="text-gray-500 text-xs">@{admin.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          admin.roleColor === 'red' ? 'bg-red-500/20 text-red-300' : 
                          admin.roleColor === 'green' ? 'bg-green-500/20 text-green-300' : 
                          admin.roleColor === 'blue' ? 'bg-blue-500/20 text-blue-300' : 
                          admin.roleColor === 'purple' ? 'bg-purple-500/20 text-purple-300' : 
                          'bg-yellow-500/20 text-yellow-300'
                        }`}>
                          {admin.roleName}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-300 text-sm">{admin.department}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-300 text-sm">{admin.lastLogin}</span>
                      </td>
                      <td className="px-6 py-4">
                        {admin.twoFactorEnabled ? (
                          <span className="flex items-center gap-1 text-green-400 text-sm">
                            <Lock size={14} />
                            Enabled
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-gray-500 text-sm">
                            <XCircle size={14} />
                            Disabled
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          admin.status === 'Active' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                        }`}>
                          {admin.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => { setSelectedItem(admin); setModalType('view-admin'); }} className="p-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors" title="View Details">
                            <Eye size={14} />
                          </button>
                          <button onClick={() => { setSelectedItem(admin); setModalType('edit-admin'); }} className="p-1.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded transition-colors" title="Edit Admin">
                            <Edit size={14} />
                          </button>
                          <button onClick={() => { setSelectedItem(admin); setModalType('delete-admin'); }} className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded transition-colors" title="Delete Admin">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Roles Tab */}
      {activeAdminTab === 'roles' && (
        <div className="space-y-4">
          {/* Roles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {adminRoles.map((role) => {
              const permissionCount = Object.values(role.permissions).filter(p => p === true).length;
              const totalPermissions = Object.keys(role.permissions).length;
              
              return (
                <div key={role.id} className={`bg-[#252b3d] border-2 ${
                  role.color === 'red' ? 'border-red-500/50' : 
                  role.color === 'green' ? 'border-green-500/50' : 
                  role.color === 'blue' ? 'border-blue-500/50' : 
                  role.color === 'purple' ? 'border-purple-500/50' : 
                  'border-yellow-500/50'
                } rounded-lg p-6 hover:shadow-lg hover:shadow-${role.color}-500/20 transition-all`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-lg ${
                        role.color === 'red' ? 'bg-red-500/20' : 
                        role.color === 'green' ? 'bg-green-500/20' : 
                        role.color === 'blue' ? 'bg-blue-500/20' : 
                        role.color === 'purple' ? 'bg-purple-500/20' : 
                        'bg-yellow-500/20'
                      }`}>
                        <Shield className={`${
                          role.color === 'red' ? 'text-red-400' : 
                          role.color === 'green' ? 'text-green-400' : 
                          role.color === 'blue' ? 'text-blue-400' : 
                          role.color === 'purple' ? 'text-purple-400' : 
                          'text-yellow-400'
                        }`} size={24} />
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-lg">{role.name}</h3>
                        {role.isDefault && (
                          <span className="inline-block px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs font-semibold rounded mt-1">
                            Default
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {!role.isDefault && (
                        <>
                          <button onClick={() => { setSelectedItem(role); setModalType('edit-role'); }} className="p-1.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded transition-colors" title="Edit Role">
                            <Edit size={14} />
                          </button>
                          <button onClick={() => { setSelectedItem(role); setModalType('delete-role'); }} className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded transition-colors" title="Delete Role">
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <p className="text-gray-400 text-sm mb-4">{role.description}</p>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-gray-400 text-xs">Permissions</span>
                    <span className={`text-sm font-bold ${
                      role.color === 'red' ? 'text-red-400' : 
                      role.color === 'green' ? 'text-green-400' : 
                      role.color === 'blue' ? 'text-blue-400' : 
                      role.color === 'purple' ? 'text-purple-400' : 
                      'text-yellow-400'
                    }`}>{permissionCount} / {totalPermissions}</span>
                  </div>
                  <div className="w-full bg-[#1a1f2e] rounded-full h-2 mb-4">
                    <div className={`h-2 rounded-full ${
                      role.color === 'red' ? 'bg-red-500' : 
                      role.color === 'green' ? 'bg-green-500' : 
                      role.color === 'blue' ? 'bg-blue-500' : 
                      role.color === 'purple' ? 'bg-purple-500' : 
                      'bg-yellow-500'
                    }`} style={{ width: `${(permissionCount / totalPermissions) * 100}%` }}></div>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <Users size={14} className="text-gray-500" />
                    <span className="text-gray-400 text-xs">{adminUsers.filter(u => u.roleId === role.id).length} admin(s) with this role</span>
                  </div>
                  <button onClick={() => { setSelectedItem(role); setModalType('view-role-permissions'); }} className={`w-full py-2 rounded-lg font-semibold text-sm transition-colors ${
                    role.color === 'red' ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30' : 
                    role.color === 'green' ? 'bg-green-500/20 text-green-300 hover:bg-green-500/30' : 
                    role.color === 'blue' ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30' : 
                    role.color === 'purple' ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30' : 
                    'bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30'
                  }`}>
                    View All Permissions
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Referrals Tab */}
      {activeAdminTab === 'referrals' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-[#252b3d] border border-gray-700 rounded-lg p-4">
              <p className="text-gray-400 text-xs">Parent Commission Rate</p>
              <p className="text-2xl font-bold text-white mt-1">{((referralSummary?.referralRate ?? 0.2) * 100).toFixed(0)}%</p>
            </div>
            <div className="bg-[#252b3d] border border-gray-700 rounded-lg p-4">
              <p className="text-gray-400 text-xs">Referral Users</p>
              <p className="text-2xl font-bold text-white mt-1">{referralSummary?.totalReferralUsers ?? 0}</p>
            </div>
            <div className="bg-[#252b3d] border border-gray-700 rounded-lg p-4">
              <p className="text-gray-400 text-xs">Total Referral Earnings</p>
              <p className="text-2xl font-bold text-green-300 mt-1">${(referralSummary?.totalReferralEarnings ?? 0).toFixed(2)}</p>
            </div>
            <div className="bg-[#252b3d] border border-gray-700 rounded-lg p-4">
              <p className="text-gray-400 text-xs">Total Parent Rewards (events)</p>
              <p className="text-2xl font-bold text-[#00D9FF] mt-1">${(referralSummary?.totalParentRewards ?? 0).toFixed(2)}</p>
            </div>
          </div>

          {referralsLoading ? (
            <div className="bg-[#252b3d] border border-gray-700 rounded-lg p-8 text-center text-gray-400">
              Loading referral overview...
            </div>
          ) : referralsError ? (
            <div className="bg-[#252b3d] border border-gray-700 rounded-lg p-8 text-center space-y-3">
              <p className="text-red-300">{referralsError}</p>
              <button
                onClick={() => void loadReferralOverview()}
                className="inline-flex items-center gap-2 bg-[#00D9FF] hover:bg-[#00c5e6] text-[#1a1f2e] px-4 py-2 rounded-lg font-semibold transition-colors"
              >
                <RefreshCw size={16} />
                Retry
              </button>
            </div>
          ) : (
            <>
              <div className="bg-[#252b3d] border border-gray-700 rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-700">
                  <h3 className="text-white font-semibold">Referral Hierarchy</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#1a1f2e]">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">User</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Invite Code</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Parent</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Children</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Referral Earnings</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {referralRows_local.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-gray-400">No referral data found.</td>
                        </tr>
                      ) : referralRows_local.map((row) => (
                        <tr key={row.username} className="hover:bg-[#1a1f2e] transition-colors">
                          <td className="px-6 py-3 text-white font-semibold">{row.username}</td>
                          <td className="px-6 py-3 text-[#00D9FF] font-mono text-sm">{row.invitationCode ?? '-'}</td>
                          <td className="px-6 py-3 text-gray-300 text-sm">{row.parentUsername ?? row.invitedByCode ?? '-'}</td>
                          <td className="px-6 py-3 text-gray-300 text-sm">{row.childrenCount}</td>
                          <td className="px-6 py-3 text-green-300 font-semibold">${row.referralEarnings.toFixed(2)}</td>
                          <td className="px-6 py-3 text-white font-semibold">${row.balance.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Invitation Codes Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Key size={18} />
                    Sub-Admin Invitation Codes
                  </h3>
                  {isSuperAdmin && (
                    <button
                      onClick={async () => {
                        try {
                          const headers = await buildAdminAuthHeaders();
                          const response = await fetch(`${serverUrl}/admin/invitation-codes/assign-missing`, {
                            method: 'POST',
                            headers,
                          });
                          const payload = await response.json().catch(() => ({}));
                          if (!response.ok) {
                            throw new Error(payload?.error ?? 'Failed to assign codes');
                          }
                          const { assigned, already_had } = payload;
                          if (assigned > 0) {
                            toast.success(`Assigned codes to ${assigned} admin(s). ${already_had > 0 ? `${already_had} already had codes.` : ''}`);
                          } else {
                            toast.success(`All admins already have codes! (${already_had} total)`);
                          }
                        } catch (error) {
                          handleAdminError(error, 'Failed to assign codes');
                        }
                      }}
                      className="px-3 py-1.5 text-sm bg-[#00D9FF]/20 hover:bg-[#00D9FF]/30 text-[#00D9FF] rounded-lg transition-colors font-semibold"
                      title="Assign invitation codes to admins without one"
                    >
                      Assign Missing Codes
                    </button>
                  )}
                </div>
                {isSuperAdmin ? (
                  <Suspense fallback={<AdminPanelFallback label="Loading invitation codes..." />}>
                    <InvitationCodes currentAdminId={currentAdminId ?? ''} />
                  </Suspense>
                ) : (
                  <div className="rounded-lg border border-[#00D9FF]/30 bg-[#1a1f2e] p-4">
                    {currentAdminCodeLoading ? (
                      <div className="text-center py-6 text-gray-400">
                        Loading your invitation code...
                      </div>
                    ) : currentAdminInvitationCode ? (
                      <div className="space-y-3">
                        <p className="text-sm text-gray-400">Your Invitation Code</p>
                        <div className="flex items-center justify-between bg-[#252b3d] rounded-lg p-4">
                          <code className="text-2xl font-bold text-[#00D9FF] tracking-widest">
                            {currentAdminInvitationCode}
                          </code>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(currentAdminInvitationCode);
                              toast.success('Code copied to clipboard!');
                            }}
                            className="p-2.5 bg-[#00D9FF]/20 hover:bg-[#00D9FF]/30 text-[#00D9FF] rounded-lg transition-colors"
                            title="Copy code"
                          >
                            <Copy size={20} />
                          </button>
                        </div>
                        <p className="text-xs text-gray-500">
                          Share this code with users who want to create accounts under your hierarchy.
                        </p>
                      </div>
                    ) : (
                      <div className="text-center py-6 text-gray-400 text-sm">
                        Invitation code management is available to super-admin accounts only.
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-[#252b3d] border border-gray-700 rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-700">
                  <h3 className="text-white font-semibold">Latest Referral Payout Events</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#1a1f2e]">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Time</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Parent</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Child</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Child Commission</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Parent Reward</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {referralEvents.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-gray-400">No payout events recorded yet.</td>
                        </tr>
                      ) : referralEvents.map((event, index) => (
                        <tr key={`${event.createdAt}-${event.parentUsername ?? 'na'}-${index}`} className="hover:bg-[#1a1f2e] transition-colors">
                          <td className="px-6 py-3 text-gray-300 text-sm">{new Date(event.createdAt).toLocaleString()}</td>
                          <td className="px-6 py-3 text-white text-sm">{event.parentUsername ?? '-'}</td>
                          <td className="px-6 py-3 text-white text-sm">{event.childUsername ?? '-'}</td>
                          <td className="px-6 py-3 text-gray-200 text-sm">${event.childCommission.toFixed(2)}</td>
                          <td className="px-6 py-3 text-[#00D9FF] font-semibold">${event.parentReward.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
          
        </div>
      )}
    </div>
  );
}
