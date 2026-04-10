import { useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
  X,
  Check,
  XCircle,
  Target,
  Image,
  Sparkles,
  Upload,
  Edit,
  Gift,
  Award,
  Copy,
} from 'lucide-react';
import type { RewardsConfig } from '../services/rewardsConfig';
import type { VipConfig } from '../services/vipConfig';
import type { SalaryPayment } from '../services/adminSalaryBackup';
import { normalizeHttpUrl } from '../utils/urlValidation';
import { formatRelativeTime } from './adminTypes';
import type {
  AdminRole,
  AdminUserRecord,
  ModalType,
  PlatformUser,
  PlatformUserAudit,
  TaskConfig,
  TransactionRecord,
  UserBalanceAdjustmentDraft,
  UserTaskControlDraft,
  UserVipLevelDraft,
  VipDraftState,
  WithdrawalRequestRecord,
} from './adminTypes';

const PRODUCT_IMAGE_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect width='100%25' height='100%25' fill='%231a2234'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2394a3b8' font-family='Arial' font-size='18'%3EImage unavailable%3C/text%3E%3C/svg%3E";

const hasLikelyHttpPrefix = (value: string): boolean => /^https?:\/\/\S+/i.test(value.trim());

export interface AdminModalsProps {
  // Modal state
  modalType: ModalType;
  selectedItem: any;
  setModalType: Dispatch<SetStateAction<ModalType>>;

  // Data
  vipConfigurations: VipConfig[];
  roleDefinitions: AdminRole[];
  adminUsers: AdminUserRecord[];
  adminUsersLoading: boolean;
  rewardsConfig: RewardsConfig;
  salaryPayments: SalaryPayment[];
  platformUsers: PlatformUser[];
  taskConfigurations: TaskConfig[];
  transactions: TransactionRecord[];
  withdrawalRequests: WithdrawalRequestRecord[];

  // User edit state
  selectedUserAudit: PlatformUserAudit | null;
  selectedUserAuditLoading: boolean;
  userTaskControlDraft: UserTaskControlDraft;
  userTaskControlSaving: boolean;
  userBalanceAdjustmentDraft: UserBalanceAdjustmentDraft;
  userBalanceAdjustmentSaving: boolean;
  userVipLevelDraft: UserVipLevelDraft;
  userVipLevelSaving: boolean;
  setUserTaskControlDraft: Dispatch<SetStateAction<UserTaskControlDraft>>;
  setUserBalanceAdjustmentDraft: Dispatch<SetStateAction<UserBalanceAdjustmentDraft>>;
  setUserVipLevelDraft: Dispatch<SetStateAction<UserVipLevelDraft>>;

  // Premium reconciliation
  premiumReconcileSaving: boolean;
  premiumReconcileAllSaving: boolean;

  // Delete user
  deletePlatformUserConfirmation: string;
  deletingPlatformUser: boolean;
  setDeletePlatformUserConfirmation: Dispatch<SetStateAction<string>>;

  // Withdrawal
  approveWithdrawalTxHash: string;
  rejectWithdrawalReason: string;
  processingWithdrawal: boolean;
  setApproveWithdrawalTxHash: Dispatch<SetStateAction<string>>;
  setRejectWithdrawalReason: Dispatch<SetStateAction<string>>;

  // Admin invitation
  newAdminInvitationCode: string;

  // AI product generation
  aiGenerateVipLevels: number[];
  aiGenerateCount: number;
  aiGenerateCategories: string[];
  aiGenerating: boolean;
  aiPreviewItems: any[];
  setAiGenerateVipLevels: Dispatch<SetStateAction<number[]>>;
  setAiGenerateCount: Dispatch<SetStateAction<number>>;
  setAiGenerateCategories: Dispatch<SetStateAction<string[]>>;
  setAiPreviewItems: Dispatch<SetStateAction<any[]>>;

  // Bulk salary
  selectedBulkOption: string;
  setSelectedBulkOption: Dispatch<SetStateAction<string>>;
  processBulkSalaryPayments: (option: string) => void;
  processSingleSalaryPayment: (paymentId: number) => void;

  // Handlers
  handleCreateManualProduct: (e: React.FormEvent) => void;
  handleCreateTask: (e: React.FormEvent) => void;
  handleCreateAdminUser: (e: React.FormEvent) => void;
  // Add platform user
  addUserDraft: { username: string; phone: string; password: string; invitationCode: string };
  setAddUserDraft: React.Dispatch<React.SetStateAction<{ username: string; phone: string; password: string; invitationCode: string }>>;
  addUserSaving: boolean;
  handleCreatePlatformUser: (e: React.FormEvent<HTMLFormElement>) => void;
  currentAdminInvitationCode: string | null;
  handleSaveUserTaskControls: () => void;
  handleResetUserTaskSet: (user: any) => void;
  handleRestorePlatformUser: (user: any) => void;
  handleTogglePlatformUserSuspension: (user: any) => void;
  handleRecalculateFinancialState: (user: any) => void;
  handleReconcilePremiumSettlements: (params?: { username?: string; dryRun?: boolean; maxUsers?: number }) => void;
  handleAdjustPlatformUserBalance: () => void;
  handleAssignAdmin: (username: string, subAdminId: string | null) => void;
  handleSaveUserVipLevel: () => void;
  handleDeletePlatformUser: () => void;
  handleSaveWorkdayReward: (e: React.FormEvent) => void;
  handleSaveResetReward: (e: React.FormEvent) => void;
  handleSaveAccumulatedReward: (e: React.FormEvent) => void;
  handleSaveProductSystemConfig: (e: React.FormEvent) => void;
  handleGenerateProducts: () => void;
  handleConfirmGenerateProducts: () => void;
  handleBulkImportProducts: (rawText: string, format: 'csv' | 'json') => void;
  handleSaveProductEdit: (e: React.FormEvent) => void;
  handleDeleteSelectedProduct: () => void;
  handleUpdateAdminDetails: (e: React.FormEvent) => void;
  handleDeleteAdminUser: () => void;
  handleCreateRole: (e: React.FormEvent) => void;
  handleUpdateRole: (e: React.FormEvent) => void;
  handleDeleteRole: () => void;
  processWithdrawalReview: (id: string, action: 'approve' | 'reject') => void;
  buildRolePermissionsFromForm: (formData: FormData) => Record<string, boolean>;

  // Notifications
  handleSendNotification: (data: { title: string; message: string; priority: string; recipientType: string; recipientFilter: string | null; scheduledFor: string | null }) => Promise<boolean>;
  notificationSending: boolean;
}

function ModalFocusTrap({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      // Trap Tab focus within the modal
      if (e.key === 'Tab' && overlayRef.current) {
        const focusable = overlayRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    // Auto-focus first focusable element
    const timer = setTimeout(() => {
      if (overlayRef.current) {
        const first = overlayRef.current.querySelector<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])'
        );
        first?.focus();
      }
    }, 50);

    document.addEventListener('keydown', handleKeyDown);
    // Prevent body scroll
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prev;
      clearTimeout(timer);
    };
  }, [onClose]);

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {children}
    </div>
  );
}

function NotificationSendForm({ onSend, sending, onClose }: {
  onSend: (data: { title: string; message: string; priority: string; recipientType: string; recipientFilter: string | null; scheduledFor: string | null }) => Promise<boolean>;
  sending: boolean;
  onClose: () => void;
}) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('normal');
  const [recipientType, setRecipientType] = useState('all');
  const [recipientFilter, setRecipientFilter] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await onSend({
      title,
      message,
      priority,
      recipientType,
      recipientFilter: (recipientType === 'vip' || recipientType === 'specific') ? recipientFilter || null : null,
      scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : null,
    });
    if (success) onClose();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-white">Send Notification</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Close dialog">
          <X size={24} />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Recipient Type</label>
          <select value={recipientType} onChange={e => setRecipientType(e.target.value)} className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none">
            <option value="all">All Users</option>
            <option value="vip">Specific VIP Level</option>
            <option value="active">Active Users Only</option>
            <option value="specific">Specific User</option>
          </select>
        </div>
        {recipientType === 'vip' && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Minimum VIP Level</label>
            <input type="number" min={1} max={10} value={recipientFilter} onChange={e => setRecipientFilter(e.target.value)} className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" placeholder="e.g. 4" />
          </div>
        )}
        {recipientType === 'specific' && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Username</label>
            <input type="text" value={recipientFilter} onChange={e => setRecipientFilter(e.target.value)} className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" placeholder="Enter username" />
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Notification Title</label>
          <input type="text" required value={title} onChange={e => setTitle(e.target.value)} className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" placeholder="Enter title" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Message</label>
          <textarea required value={message} onChange={e => setMessage(e.target.value)} className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" rows={5} placeholder="Enter notification message..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Priority</label>
          <select value={priority} onChange={e => setPriority(e.target.value)} className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none">
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Schedule (Optional)</label>
          <input type="datetime-local" value={scheduledFor} onChange={e => setScheduledFor(e.target.value)} className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" />
          <p className="text-gray-500 text-xs mt-1">{scheduledFor ? 'Notification will be delivered at the scheduled time.' : 'Leave empty to send immediately.'}</p>
        </div>
        <div className="flex gap-3 mt-6">
          <button type="submit" disabled={sending} className="flex-1 bg-[#00D9FF] hover:bg-[#00c5e6] text-[#1a1f2e] font-bold py-3 rounded-lg transition-colors disabled:opacity-50">
            {sending ? 'Sending...' : 'Send Notification'}
          </button>
          <button type="button" onClick={onClose} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded-lg transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default function AdminModals(props: AdminModalsProps) {
  const {
    modalType,
    selectedItem,
    setModalType,
    vipConfigurations,
    roleDefinitions,
    adminUsers,
    adminUsersLoading,
    rewardsConfig,
    salaryPayments,
    platformUsers,
    taskConfigurations,
    transactions,
    withdrawalRequests,
    selectedUserAudit,
    selectedUserAuditLoading,
    userTaskControlDraft,
    userTaskControlSaving,
    userBalanceAdjustmentDraft,
    userBalanceAdjustmentSaving,
    userVipLevelDraft,
    userVipLevelSaving,
    setUserTaskControlDraft,
    setUserBalanceAdjustmentDraft,
    setUserVipLevelDraft,
    premiumReconcileSaving,
    premiumReconcileAllSaving,
    deletePlatformUserConfirmation,
    deletingPlatformUser,
    setDeletePlatformUserConfirmation,
    approveWithdrawalTxHash,
    rejectWithdrawalReason,
    processingWithdrawal,
    setApproveWithdrawalTxHash,
    setRejectWithdrawalReason,
    newAdminInvitationCode,
    aiGenerateVipLevels,
    aiGenerateCount,
    aiGenerateCategories,
    aiGenerating,
    aiPreviewItems,
    setAiGenerateVipLevels,
    setAiGenerateCount,
    setAiGenerateCategories,
    setAiPreviewItems,
    selectedBulkOption,
    setSelectedBulkOption,
    processBulkSalaryPayments,
    processSingleSalaryPayment,
    handleCreateManualProduct,
    handleCreateTask,
    handleCreateAdminUser,
    addUserDraft,
    setAddUserDraft,
    addUserSaving,
    handleCreatePlatformUser,
    currentAdminInvitationCode,
    handleSaveUserTaskControls,
    handleResetUserTaskSet,
    handleRestorePlatformUser,
    handleTogglePlatformUserSuspension,
    handleRecalculateFinancialState,
    handleReconcilePremiumSettlements,
    handleAdjustPlatformUserBalance,
    handleAssignAdmin,
    handleSaveUserVipLevel,
    handleDeletePlatformUser,
    handleSaveWorkdayReward,
    handleSaveResetReward,
    handleSaveAccumulatedReward,
    handleSaveProductSystemConfig,
    handleGenerateProducts,
    handleConfirmGenerateProducts,
    handleBulkImportProducts,
    handleSaveProductEdit,
    handleDeleteSelectedProduct,
    handleUpdateAdminDetails,
    handleDeleteAdminUser,
    handleCreateRole,
    handleUpdateRole,
    handleDeleteRole,
    processWithdrawalReview,
    buildRolePermissionsFromForm,
  } = props;

  const [manualImageDraft, setManualImageDraft] = useState('');
  const [manualImageStatus, setManualImageStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [editImageDraft, setEditImageDraft] = useState('');
  const [editImageStatus, setEditImageStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [manualAllowUnreachable, setManualAllowUnreachable] = useState(false);
  const [editAllowUnreachable, setEditAllowUnreachable] = useState(false);
  const [assignAdminSelectedId, setAssignAdminSelectedId] = useState<string>('');
  const [assignAdminSaving, setAssignAdminSaving] = useState(false);

  useEffect(() => {
    if (modalType === 'assign-admin') {
      setAssignAdminSelectedId('');
      setAssignAdminSaving(false);
      return;
    }
    if (modalType === 'add-product-manual') {
      setManualImageDraft('');
      setManualImageStatus('idle');
      setManualAllowUnreachable(false);
      return;
    }

    if (modalType === 'edit-product' && selectedItem) {
      const initialImage = String(selectedItem.image || selectedItem.imageUrl || '').trim();
      setEditImageDraft(initialImage);
      setEditAllowUnreachable(false);
      if (!initialImage) {
        setEditImageStatus('idle');
      } else {
        setEditImageStatus(normalizeHttpUrl(initialImage) ? 'loading' : 'error');
      }
    }
  }, [modalType, selectedItem]);

  const normalizedManualImageUrl = normalizeHttpUrl(manualImageDraft);
  const normalizedEditImageUrl = normalizeHttpUrl(editImageDraft);
  const manualHasValidImageUrl = normalizedManualImageUrl.length > 0;
  const editHasValidImageUrl = normalizedEditImageUrl.length > 0;
  const manualCanUseWarningOverride = manualImageStatus === 'error' && (manualHasValidImageUrl || hasLikelyHttpPrefix(manualImageDraft));
  const editCanUseWarningOverride = editImageStatus === 'error' && (editHasValidImageUrl || hasLikelyHttpPrefix(editImageDraft));
  const manualCanSubmit = manualHasValidImageUrl && (manualImageStatus === 'ok' || (manualCanUseWarningOverride && manualAllowUnreachable));
  const editCanSubmit = editHasValidImageUrl && (editImageStatus === 'ok' || (editCanUseWarningOverride && editAllowUnreachable));

  if (!modalType) return null;

  return (
  <ModalFocusTrap onClose={() => setModalType(null)}>
    <div className="bg-[#252b3d] rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      {/* Add User Modal */}
      {modalType === 'add-user' && (
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-white">Add New User</h3>
            <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white" aria-label="Close dialog">
              <X size={24} />
            </button>
          </div>
          <form className="space-y-4" onSubmit={handleCreatePlatformUser}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Username <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={addUserDraft.username}
                  onChange={(e) => setAddUserDraft((d) => ({ ...d, username: e.target.value }))}
                  className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none"
                  placeholder="Enter username"
                  required
                  disabled={addUserSaving}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Phone <span className="text-red-400">*</span></label>
                <input
                  type="tel"
                  value={addUserDraft.phone}
                  onChange={(e) => setAddUserDraft((d) => ({ ...d, phone: e.target.value }))}
                  className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none"
                  placeholder="Enter phone number"
                  required
                  disabled={addUserSaving}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Login Password <span className="text-red-400">*</span></label>
              <input
                type="password"
                value={addUserDraft.password}
                onChange={(e) => setAddUserDraft((d) => ({ ...d, password: e.target.value }))}
                className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none"
                placeholder="Minimum 6 characters"
                minLength={6}
                required
                disabled={addUserSaving}
              />
              <p className="text-xs text-gray-500 mt-1">Transaction password will default to 000000 — user must change on first login.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Invitation Code
                <span className="ml-2 text-xs text-gray-500">(optional — links user to a referral tree)</span>
              </label>
              <input
                type="text"
                value={addUserDraft.invitationCode}
                onChange={(e) => setAddUserDraft((d) => ({ ...d, invitationCode: e.target.value.toUpperCase() }))}
                className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none font-mono"
                placeholder={currentAdminInvitationCode ? `Leave blank to use your code: ${currentAdminInvitationCode}` : 'Enter user or admin invite code'}
                disabled={addUserSaving}
              />
              <p className="text-xs text-gray-500 mt-1">
                If left blank, the user is linked under your admin invitation code so they appear in your referral commission tree.
              </p>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                type="submit"
                disabled={addUserSaving}
                className="flex-1 bg-[#00D9FF] hover:bg-[#00c5e6] text-[#1a1f2e] font-bold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addUserSaving ? 'Creating…' : 'Create User'}
              </button>
              <button type="button" onClick={() => setModalType(null)} disabled={addUserSaving} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* View User Modal */}
      {modalType === 'view-user' && selectedItem && (
        <div className="p-4 sm:p-6">
          <div className="sticky top-0 z-10 -mx-4 sm:-mx-6 mb-4 px-4 sm:px-6 py-3 bg-[#0f172a]/95 border-b border-[#2a3448] backdrop-blur-sm flex items-center justify-between">
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-white">User Details</h3>
              <p className="text-xs text-gray-400 mt-0.5">Audit snapshot for {selectedItem.username}</p>
            </div>
            <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white" aria-label="Close dialog">
              <X size={24} />
            </button>
          </div>
          {selectedUserAuditLoading ? (
            <div className="bg-[#1a1f2e] p-8 rounded-lg text-center text-gray-400">Loading audit details…</div>
          ) : (
            <div className="space-y-4 max-h-[70vh] overflow-auto pr-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#1a1f2e] p-4 rounded-lg">
                  <p className="text-gray-400 text-sm">Username</p>
                  <p className="text-white font-semibold mt-1">{selectedItem.username}</p>
                </div>
                <div className="bg-[#1a1f2e] p-4 rounded-lg">
                  <p className="text-gray-400 text-sm">Phone Number</p>
                  <p className="text-white font-semibold mt-1">{selectedUserAudit?.phone ?? selectedItem.phone ?? '—'}</p>
                </div>
                <div className="bg-[#1a1f2e] p-4 rounded-lg">
                  <p className="text-gray-400 text-sm">Invitation Code</p>
                  <p className="text-white font-semibold mt-1">{selectedUserAudit?.invitationCode ?? '—'}</p>
                </div>
                <div className="bg-[#1a1f2e] p-4 rounded-lg">
                  <p className="text-gray-400 text-sm">Wallet Address</p>
                  <p className="text-white font-semibold mt-1 break-all">{selectedUserAudit?.walletProfile?.walletAddress ?? 'No wallet bound'}</p>
                </div>
              </div>

              <div className="bg-[#1a1f2e] p-4 rounded-lg">
                <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-300 mb-3">Financial Card Snapshot</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <p className="text-gray-500 text-xs">VIP</p>
                    <p className="text-purple-300 font-semibold mt-1">VIP {selectedUserAudit?.financialCard?.vipLevel ?? selectedItem.vipLevel}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Balance</p>
                    <p className="text-[#00D9FF] font-bold mt-1">${Number(selectedUserAudit?.financialCard?.balance ?? selectedItem.balance ?? 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Hold</p>
                    <p className="text-white font-semibold mt-1">${Number(selectedUserAudit?.financialCard?.holdAmount ?? selectedItem.holdAmount ?? 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Available</p>
                    <p className="text-green-400 font-semibold mt-1">${Number(selectedUserAudit?.financialCard?.availableAmount ?? selectedItem.availableAmount ?? 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Today Commission</p>
                    <p className="text-white font-semibold mt-1">${Number(selectedUserAudit?.financialCard?.todayCommission ?? 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Lucky Bonus</p>
                    <p className="text-white font-semibold mt-1">${Number(selectedUserAudit?.financialCard?.luckyBonus ?? 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Total Balance</p>
                    <p className="text-white font-semibold mt-1">${Number(selectedUserAudit?.financialCard?.totalBalance ?? 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Credit Score</p>
                    <p className="text-yellow-300 font-semibold mt-1">{selectedUserAudit?.financialCard?.creditScore ?? selectedItem.creditScore ?? 100}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#1a1f2e] p-4 rounded-lg">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-300 mb-3">Account Status</p>
                  <div className="space-y-2 text-sm">
                    <p className="text-white">Frozen: <span className="font-semibold">{selectedUserAudit?.accountStatus?.isFrozen ? 'Yes' : 'No'}</span></p>
                    <p className="text-white">Suspended: <span className="font-semibold">{selectedUserAudit?.accountStatus?.isSuspended ? 'Yes' : 'No'}</span></p>
                    <p className="text-white">Reset Required: <span className="font-semibold">{selectedUserAudit?.accountStatus?.pendingTaskReset ? 'Yes' : 'No'}</span></p>
                    <p className="text-white">Premium State: <span className="font-semibold">{selectedUserAudit?.accountStatus?.activePremiumStatus ?? 'None'}</span></p>
                    <p className="text-white">Set Progress: <span className="font-semibold">{selectedUserAudit?.taskProgress?.tasksCompletedInSet ?? selectedItem.tasksCompletedInSet ?? 0}/{selectedUserAudit?.taskProgress?.tasksPerSet ?? selectedItem.tasksPerSet ?? 0}</span></p>
                    <p className="text-white">Completed Sets: <span className="font-semibold">{selectedUserAudit?.taskProgress?.completedTaskSets ?? selectedItem.completedTaskSets ?? 0}/{selectedUserAudit?.taskProgress?.taskSetCount ?? selectedItem.taskSetCount ?? 0}</span></p>
                  </div>
                </div>
                <div className="bg-[#1a1f2e] p-4 rounded-lg">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-300 mb-3">Audit Trail</p>
                  <div className="space-y-2 text-sm">
                    <p className="text-white">Registered: <span className="font-semibold">{selectedUserAudit?.audit?.registeredAt ? new Date(selectedUserAudit.audit.registeredAt).toLocaleString() : selectedItem.registered}</span></p>
                    <p className="text-white">Last Login: <span className="font-semibold">{selectedUserAudit?.audit?.lastLoginAt ? new Date(selectedUserAudit.audit.lastLoginAt).toLocaleString() : '—'}</span></p>
                    <p className="text-white">Last Login IP: <span className="font-semibold">{selectedUserAudit?.audit?.lastLoginIp ?? '—'}</span></p>
                    <p className="text-white">Approx. Location: <span className="font-semibold">{selectedUserAudit?.audit?.lastLoginLocation ?? '—'}</span></p>
                    <p className="text-white">Last Activity: <span className="font-semibold">{selectedUserAudit?.audit?.lastActivityAt ? new Date(selectedUserAudit.audit.lastActivityAt).toLocaleString() : '—'}</span></p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#1a1f2e] p-4 rounded-lg">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-300 mb-3">Deposits</p>
                  {selectedUserAudit?.deposits?.length ? selectedUserAudit.deposits.slice(0, 5).map((deposit, index) => (
                    <div key={`${deposit.id ?? index}`} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-b-0 text-sm">
                      <div>
                        <p className="text-white font-medium">${Number(deposit.amount ?? 0).toFixed(2)}</p>
                        <p className="text-gray-500 text-xs">{deposit.method ?? 'Deposit'}</p>
                      </div>
                      <p className="text-gray-400 text-xs">{deposit.date ? new Date(deposit.date).toLocaleString() : '—'}</p>
                    </div>
                  )) : <p className="text-gray-500 text-sm">No deposit history.</p>}
                </div>
                <div className="bg-[#1a1f2e] p-4 rounded-lg">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-300 mb-3">Withdrawals</p>
                  {selectedUserAudit?.withdrawals?.length ? selectedUserAudit.withdrawals.slice(0, 5).map((withdrawal, index) => (
                    <div key={`${withdrawal.id ?? index}`} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-b-0 text-sm">
                      <div>
                        <p className="text-white font-medium">${Number(withdrawal.amount ?? 0).toFixed(2)}</p>
                        <p className="text-gray-500 text-xs">{withdrawal.status ?? 'Pending'}</p>
                      </div>
                      <p className="text-gray-400 text-xs">{withdrawal.requestedDate ? new Date(withdrawal.requestedDate).toLocaleString() : '—'}</p>
                    </div>
                  )) : <p className="text-gray-500 text-sm">No withdrawal history.</p>}
                </div>
              </div>
            </div>
          )}
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={() => setModalType('adjust-user-balance')}
              className="flex-1 bg-[#00D9FF] hover:bg-[#00c5e6] text-[#1a1f2e] font-bold py-3 rounded-lg transition-colors"
            >
              Top Up / Adjust Balance
            </button>
            <button onClick={() => setModalType(null)} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded-lg transition-colors">
              Close
            </button>
          </div>
        </div>
      )}

      {modalType === 'adjust-user-balance' && selectedItem && userBalanceAdjustmentDraft && (
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-white">Adjust User Balance</h3>
            <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white" aria-label="Close dialog">
              <X size={24} />
            </button>
          </div>
          <div className="space-y-4">
            <div className="bg-[#1a1f2e] p-4 rounded-lg">
              <p className="text-gray-400 text-sm">Username</p>
              <p className="text-white font-semibold mt-1">{selectedItem.username}</p>
            </div>
            <div className="bg-[#1a1f2e] p-4 rounded-lg">
              <p className="text-gray-400 text-sm">Current Balance</p>
              <p className="text-[#00D9FF] font-bold text-xl mt-1">${Number(selectedItem.balance ?? 0).toFixed(2)}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <label className="bg-[#1a1f2e] p-4 rounded-lg block">
                <p className="text-gray-400 text-sm">Action</p>
                <select
                  value={userBalanceAdjustmentDraft.mode}
                  onChange={(event) => setUserBalanceAdjustmentDraft((current) => current ? { ...current, mode: event.target.value as 'credit' | 'debit', isBonus: false } : current)}
                  className="w-full px-4 py-2 bg-[#252b3d] border border-gray-600 rounded-lg text-white mt-2 focus:border-[#00D9FF] focus:outline-none"
                >
                  <option value="credit">Top Up / Credit</option>
                  <option value="debit">Debit / Deduct</option>
                </select>
              </label>
              <label className="bg-[#1a1f2e] p-4 rounded-lg block">
                <p className="text-gray-400 text-sm">Amount</p>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={userBalanceAdjustmentDraft.amount}
                  onChange={(event) => setUserBalanceAdjustmentDraft((current) => current ? { ...current, amount: event.target.value } : current)}
                  className="w-full px-4 py-2 bg-[#252b3d] border border-gray-600 rounded-lg text-white mt-2 focus:border-[#00D9FF] focus:outline-none"
                  placeholder="0.00"
                />
              </label>
            </div>
            {userBalanceAdjustmentDraft.mode === 'credit' && (
              <div className="bg-[#1a1f2e] p-4 rounded-lg">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={userBalanceAdjustmentDraft.isBonus}
                    onChange={(event) => setUserBalanceAdjustmentDraft((current) => current ? { ...current, isBonus: event.target.checked } : current)}
                    className="w-4 h-4 accent-[#00D9FF]"
                  />
                  <span className="text-white font-semibold text-sm">Mark as Bonus Credit</span>
                </label>
                {userBalanceAdjustmentDraft.isBonus && (
                  <div className="mt-3 space-y-3">
                    <div>
                      <p className="text-gray-400 text-xs mb-1">Bonus Label <span className="text-gray-500">(optional)</span></p>
                      <input
                        type="text"
                        value={userBalanceAdjustmentDraft.bonusLabel}
                        onChange={(event) => setUserBalanceAdjustmentDraft((current) => current ? { ...current, bonusLabel: event.target.value } : current)}
                        className="w-full px-3 py-2 bg-[#252b3d] border border-gray-600 rounded-lg text-white text-sm focus:border-[#00D9FF] focus:outline-none"
                        placeholder="e.g. Lucky Bonus, Welcome Reward..."
                      />
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs mb-1">Assignment Mode</p>
                      <select
                        value={userBalanceAdjustmentDraft.bonusAssignmentMode}
                        onChange={(event) => setUserBalanceAdjustmentDraft((current) => current ? { ...current, bonusAssignmentMode: event.target.value as 'automatic' | 'semi-automatic' | 'manual' } : current)}
                        className="w-full px-3 py-2 bg-[#252b3d] border border-gray-600 rounded-lg text-white text-sm focus:border-[#00D9FF] focus:outline-none"
                      >
                        <option value="manual">Manual</option>
                        <option value="semi-automatic">Semi-Automatic</option>
                        <option value="automatic">Automatic</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}
            <label className="bg-[#1a1f2e] p-4 rounded-lg block">
              <p className="text-gray-400 text-sm">Reason</p>
              <textarea
                value={userBalanceAdjustmentDraft.reason}
                onChange={(event) => setUserBalanceAdjustmentDraft((current) => current ? { ...current, reason: event.target.value } : current)}
                className="w-full px-4 py-2 bg-[#252b3d] border border-gray-600 rounded-lg text-white mt-2 focus:border-[#00D9FF] focus:outline-none"
                rows={3}
                placeholder="Why are you adjusting this balance?"
              />
            </label>
          </div>
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={() => void handleAdjustPlatformUserBalance()}
              disabled={userBalanceAdjustmentSaving}
              className="flex-1 bg-[#00D9FF] hover:bg-[#00c5e6] text-[#1a1f2e] font-bold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {userBalanceAdjustmentSaving ? 'Saving...' : 'Save Balance Adjustment'}
            </button>
            <button
              type="button"
              onClick={() => setModalType(null)}
              disabled={userBalanceAdjustmentSaving}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {modalType === 'assign-admin' && selectedItem && (
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-white">Assign Sub-Admin Owner</h3>
            <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white" aria-label="Close dialog">
              <X size={24} />
            </button>
          </div>
          <div className="space-y-4">
            <div className="bg-[#1a1f2e] p-4 rounded-lg">
              <p className="text-gray-400 text-sm">User</p>
              <p className="text-white font-semibold mt-1">{selectedItem.username}</p>
            </div>
            <div className="bg-[#1a1f2e] p-4 rounded-lg">
              <p className="text-gray-400 text-sm">Current Owner</p>
              <p className="text-white font-semibold mt-1">
                {selectedItem.referredByAdminName && selectedItem.referredByAdminName !== '—'
                  ? selectedItem.referredByAdminName
                  : <span className="text-gray-500 italic">Direct (no sub-admin)</span>
                }
              </p>
            </div>
            <div className="bg-[#1a1f2e] p-4 rounded-lg">
              <p className="text-gray-400 text-sm mb-2">Assign to Sub-Admin</p>
              {adminUsersLoading ? (
                <div className="w-full px-4 py-3 bg-[#252b3d] border border-gray-600 rounded-lg text-gray-400 text-sm">
                  Loading sub-admins...
                </div>
              ) : (
                <select
                  value={assignAdminSelectedId}
                  onChange={(e) => setAssignAdminSelectedId(e.target.value)}
                  className="w-full px-4 py-2 bg-[#252b3d] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none"
                >
                  <option value="">— Direct (no sub-admin) —</option>
                  {adminUsers
                    .filter((a) => a.roleId !== 1)
                    .map((a) => (
                      <option key={String(a.id)} value={String(a.id)}>
                        {a.fullName || a.username} ({a.email})
                      </option>
                    ))}
                </select>
              )}
              {!adminUsersLoading && adminUsers.filter((a) => a.roleId !== 1).length === 0 && (
                <p className="text-yellow-400 text-xs mt-2">No sub-admin accounts found.</p>
              )}
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              disabled={assignAdminSaving}
              onClick={async () => {
                setAssignAdminSaving(true);
                await handleAssignAdmin(selectedItem.username, assignAdminSelectedId || null);
                setAssignAdminSaving(false);
                setModalType(null);
              }}
              className="flex-1 bg-[#00D9FF] hover:bg-[#00c5e6] text-[#1a1f2e] font-bold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {assignAdminSaving ? 'Saving...' : 'Save Assignment'}
            </button>
            <button
              type="button"
              onClick={() => setModalType(null)}
              disabled={assignAdminSaving}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {modalType === 'edit-user' && selectedItem && userTaskControlDraft && (
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-white">Edit User Task Controls</h3>
            <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white" aria-label="Close dialog">
              <X size={24} />
            </button>
          </div>
          <div className="space-y-4">
            <div className="bg-[#1a1f2e] p-4 rounded-lg">
              <p className="text-gray-400 text-sm">Username</p>
              <p className="text-white font-semibold mt-1">{selectedItem.username}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <label className="bg-[#1a1f2e] p-4 rounded-lg block">
                <p className="text-gray-400 text-sm">Task Sets</p>
                <input
                  type="number"
                  min={1}
                  value={userTaskControlDraft.taskSetCount}
                  onChange={(event) => setUserTaskControlDraft((current) => current ? { ...current, taskSetCount: event.target.value } : current)}
                  className="w-full px-4 py-2 bg-[#252b3d] border border-gray-600 rounded-lg text-white mt-2 focus:border-[#00D9FF] focus:outline-none"
                />
              </label>
              <div className="bg-[#1a1f2e] p-4 rounded-lg">
                <p className="text-gray-400 text-sm">Tasks Per Set</p>
                <p className="text-white font-semibold mt-1">{selectedItem.tasksPerSet ?? 0} (Auto from VIP {selectedItem.vipLevel ?? 1})</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#1a1f2e] p-4 rounded-lg">
                <p className="text-gray-400 text-sm">Current Set Progress</p>
                <p className="text-white font-semibold mt-1">{selectedItem.tasksCompletedInSet ?? 0}/{selectedItem.tasksPerSet ?? 0}</p>
              </div>
              <div className="bg-[#1a1f2e] p-4 rounded-lg">
                <p className="text-gray-400 text-sm">Completed Sets</p>
                <p className="text-white font-semibold mt-1">{selectedItem.completedTaskSets ?? 0}/{selectedItem.taskSetCount ?? 0}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#1a1f2e] p-4 rounded-lg">
                <p className="text-gray-400 text-sm">Reset Required</p>
                <p className={`font-semibold mt-1 ${selectedItem.pendingTaskReset ? 'text-yellow-300' : 'text-white'}`}>
                  {selectedItem.pendingTaskReset ? 'Yes, admin reset required' : 'No'}
                </p>
              </div>
              <div className="bg-[#1a1f2e] p-4 rounded-lg">
                <p className="text-gray-400 text-sm">Held Amount</p>
                <p className="text-white font-semibold mt-1">${(selectedItem.holdAmount ?? 0).toFixed(2)}</p>
              </div>
            </div>
            <div className="bg-[#1a1f2e] p-4 rounded-lg space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                <div className="flex-1">
                  <p className="text-gray-400 text-sm">Set VIP Level</p>
                  <select
                    value={userVipLevelDraft?.vipLevel ?? 'auto'}
                    onChange={(event) => setUserVipLevelDraft((current) => current ? { ...current, vipLevel: event.target.value } : current)}
                    disabled={userVipLevelSaving}
                    className="w-full px-4 py-2 bg-[#252b3d] border border-gray-600 rounded-lg text-white mt-2 focus:border-[#00D9FF] focus:outline-none disabled:opacity-50"
                  >
                    <option value="auto">Auto (balance-based)</option>
                    <option value="1">VIP 1</option>
                    <option value="2">VIP 2</option>
                    <option value="3">VIP 3</option>
                    <option value="4">VIP 4</option>
                    <option value="5">VIP 5</option>
                  </select>
                </div>
                <div className="min-w-[180px] bg-[#252b3d] border border-gray-700 rounded-lg px-3 py-2">
                  <p className="text-gray-400 text-xs">Current VIP</p>
                  <p className="text-white font-semibold">
                    VIP {selectedItem.vipLevel ?? 1}
                    {Number.isFinite(Number(selectedItem.manualVipLevel)) ? ' (Manual)' : ' (Auto)'}
                  </p>
                </div>
              </div>
              <label className="block">
                <p className="text-gray-400 text-sm">Reason</p>
                <input
                  type="text"
                  value={userVipLevelDraft?.reason ?? ''}
                  onChange={(event) => setUserVipLevelDraft((current) => current ? { ...current, reason: event.target.value } : current)}
                  placeholder="Why are you changing this VIP level?"
                  disabled={userVipLevelSaving}
                  className="w-full px-4 py-2 bg-[#252b3d] border border-gray-600 rounded-lg text-white mt-2 focus:border-[#00D9FF] focus:outline-none disabled:opacity-50"
                />
              </label>
              <button
                type="button"
                onClick={() => void handleSaveUserVipLevel()}
                disabled={userVipLevelSaving}
                className="bg-violet-500 hover:bg-violet-600 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {userVipLevelSaving ? 'Updating VIP...' : 'Save VIP Level'}
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              <button
                type="button"
                onClick={() => void handleResetUserTaskSet(selectedItem)}
                disabled={userTaskControlSaving || !selectedItem.pendingTaskReset}
                className="bg-yellow-500 hover:bg-yellow-600 text-[#1a1f2e] font-bold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reset Completed Set
              </button>
              <button
                type="button"
                onClick={() => void handleRestorePlatformUser(selectedItem)}
                disabled={userTaskControlSaving || (!selectedItem.isFrozen && (selectedItem.holdAmount ?? 0) <= 0)}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Unfreeze Account
              </button>
              <button
                type="button"
                onClick={() => void handleTogglePlatformUserSuspension(selectedItem)}
                disabled={userTaskControlSaving}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {selectedItem.isSuspended ? 'Enable Account' : 'Disable Account'}
              </button>
              <button
                type="button"
                onClick={() => void handleRecalculateFinancialState(selectedItem)}
                disabled={userTaskControlSaving || premiumReconcileSaving}
                className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Recalculate Financial State
              </button>
              <button
                type="button"
                onClick={() => void handleReconcilePremiumSettlements({ username: selectedItem.username })}
                disabled={userTaskControlSaving || premiumReconcileSaving || premiumReconcileAllSaving}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {premiumReconcileSaving ? 'Reconciling...' : 'Reconcile Premium'}
              </button>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={() => void handleSaveUserTaskControls()}
              disabled={userTaskControlSaving}
              className="flex-1 bg-[#00D9FF] hover:bg-[#00c5e6] text-[#1a1f2e] font-bold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Task Controls
            </button>
            <button
              type="button"
              onClick={() => setModalType(null)}
              disabled={userTaskControlSaving}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {modalType === 'delete-user' && selectedItem && (
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-white">Delete User</h3>
            <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white" aria-label="Close dialog">
              <X size={24} />
            </button>
          </div>
          <div className="text-center py-6">
            <XCircle className="mx-auto text-red-400 mb-4" size={64} />
            <p className="text-white text-lg mb-2">Are you sure you want to delete this user?</p>
            <p className="text-gray-400 mb-4">Username: <span className="text-white font-semibold">{selectedItem.username}</span></p>
            <p className="text-red-400 text-sm">This action cannot be undone!</p>
            <div className="mt-4 text-left">
              <label className="block text-sm text-gray-300 mb-2" htmlFor="delete-user-confirmation">
                Type <span className="font-semibold text-white">{selectedItem.username}</span> to confirm
              </label>
              <input
                id="delete-user-confirmation"
                type="text"
                value={deletePlatformUserConfirmation}
                onChange={(event) => setDeletePlatformUserConfirmation(event.target.value)}
                className="w-full px-4 py-2 bg-[#252b3d] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none"
                placeholder={selectedItem.username}
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setModalType(null)} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded-lg transition-colors">
              Cancel
            </button>
            <button
              onClick={() => void handleDeletePlatformUser()}
              disabled={deletingPlatformUser || deletePlatformUserConfirmation.trim().toLowerCase() !== selectedItem.username.toLowerCase()}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {deletingPlatformUser ? 'Deleting...' : 'Delete User'}
            </button>
          </div>
        </div>
      )}

      {/* Approve Withdrawal Modal */}
      {modalType === 'approve-withdrawal' && selectedItem && (
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-white">Approve Withdrawal</h3>
            <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white" aria-label="Close dialog">
              <X size={24} />
            </button>
          </div>
          <div className="space-y-4 mb-6">
            <div className="bg-[#1a1f2e] p-4 rounded-lg">
              <p className="text-gray-400 text-sm">Username</p>
              <p className="text-white font-semibold mt-1">{selectedItem.username}</p>
            </div>
            <div className="bg-[#1a1f2e] p-4 rounded-lg">
              <p className="text-gray-400 text-sm">Amount</p>
              <p className="text-[#00D9FF] font-bold text-2xl mt-1">${selectedItem.amount.toFixed(2)}</p>
            </div>
            <div className="bg-[#1a1f2e] p-4 rounded-lg">
              <p className="text-gray-400 text-sm">Wallet Address</p>
              <p className="text-white font-mono text-sm mt-1 break-all">{selectedItem.walletAddress}</p>
            </div>
            <div className="bg-[#1a1f2e] p-4 rounded-lg">
              <p className="text-gray-400 text-sm">Transaction Hash (Optional)</p>
              <input
                type="text"
                value={approveWithdrawalTxHash}
                onChange={(event) => setApproveWithdrawalTxHash(event.target.value)}
                className="w-full px-4 py-2 bg-[#252b3d] border border-gray-600 rounded-lg text-white mt-2 focus:border-[#00D9FF] focus:outline-none"
                placeholder="Enter blockchain TX hash"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setModalType(null)} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded-lg transition-colors">
              Cancel
            </button>
            <button
              onClick={() => void processWithdrawalReview('approve')}
              disabled={processingWithdrawal}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-60"
            >
              Approve & Process
            </button>
          </div>
        </div>
      )}

      {/* Reject Withdrawal Modal */}
      {modalType === 'reject-withdrawal' && selectedItem && (
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-white">Reject Withdrawal</h3>
            <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white" aria-label="Close dialog">
              <X size={24} />
            </button>
          </div>
          <div className="space-y-4 mb-6">
            <div className="bg-[#1a1f2e] p-4 rounded-lg">
              <p className="text-gray-400 text-sm">Username</p>
              <p className="text-white font-semibold mt-1">{selectedItem.username}</p>
            </div>
            <div className="bg-[#1a1f2e] p-4 rounded-lg">
              <p className="text-gray-400 text-sm">Amount</p>
              <p className="text-red-400 font-bold text-2xl mt-1">${selectedItem.amount.toFixed(2)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Reason for Rejection</label>
              <textarea
                value={rejectWithdrawalReason}
                onChange={(event) => setRejectWithdrawalReason(event.target.value)}
                className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none"
                rows={4}
                placeholder="Enter reason..."
              ></textarea>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setModalType(null)} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded-lg transition-colors">
              Cancel
            </button>
            <button
              onClick={() => void processWithdrawalReview('reject')}
              disabled={processingWithdrawal}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-60"
            >
              Reject Request
            </button>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {modalType === 'add-task' && (
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-white">Add New Task</h3>
            <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white" aria-label="Close dialog">
              <X size={24} />
            </button>
          </div>
          <form className="space-y-4" onSubmit={handleCreateTask}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Merchant</label>
                <select name="merchant" className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none">
                  <option>Amazon</option>
                  <option>Walmart</option>
                  <option>Target</option>
                  <option>Best Buy</option>
                  <option>eBay</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Product Name</label>
                <input name="product" type="text" className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" placeholder="Enter product name" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Product Price ($)</label>
                <input name="price" type="number" step="0.01" className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" placeholder="0.00" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Commission Rate (%)</label>
                <input name="commissionPercent" type="number" step="0.001" className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" placeholder="0.000" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Product URL</label>
              <input name="productUrl" type="url" className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" placeholder="https://..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
              <select name="status" className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none">
                <option>Active</option>
                <option>Paused</option>
              </select>
            </div>
            <div className="flex gap-3 mt-6">
              <button type="submit" className="flex-1 bg-[#00D9FF] hover:bg-[#00c5e6] text-[#1a1f2e] font-bold py-3 rounded-lg transition-colors">
                Create Task
              </button>
              <button type="button" onClick={() => setModalType(null)} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded-lg transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Send Notification Modal */}
      {modalType === 'notification' && (
        <NotificationSendForm
          onSend={props.handleSendNotification}
          sending={props.notificationSending}
          onClose={() => setModalType(null)}
        />
      )}

      {/* Add Product Manual Modal */}
      {modalType === 'add-product-manual' && (
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Upload className="text-blue-400" size={24} />
              </div>
              <h3 className="text-2xl font-bold text-white">Add Product Manually</h3>
            </div>
            <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white" aria-label="Close dialog">
              <X size={24} />
            </button>
          </div>
          <form className="space-y-4" onSubmit={(e) => { void handleCreateTask(e); }}>
            <input type="hidden" name="status" value="Active" />
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">Product Name</label>
                <input type="text" name="product" required className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" placeholder="Enter product name" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">Image URL</label>
                <input
                  type="url"
                  name="image"
                  required
                  className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none"
                  placeholder="https://image.example/product.jpg"
                  value={manualImageDraft}
                  onChange={(e) => {
                    const next = e.target.value;
                    setManualImageDraft(next);
                    setManualAllowUnreachable(false);
                    if (!next.trim()) {
                      setManualImageStatus('idle');
                    } else {
                      setManualImageStatus(normalizeHttpUrl(next) ? 'loading' : 'error');
                    }
                  }}
                />
                <div className="mt-3 rounded-lg border border-gray-700 bg-[#1a1f2e] p-3">
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="text-gray-400">Image Health Check</span>
                    {manualImageStatus === 'ok' && <span className="text-green-400">Reachable</span>}
                    {manualImageStatus === 'loading' && <span className="text-yellow-300">Checking...</span>}
                    {manualImageStatus === 'error' && (
                      <span className="text-red-400">
                        {manualHasValidImageUrl ? 'Unreachable in preview' : 'Invalid URL format'}
                      </span>
                    )}
                    {manualImageStatus === 'idle' && <span className="text-gray-500">Paste image URL</span>}
                  </div>
                  <img
                    src={normalizedManualImageUrl || PRODUCT_IMAGE_PLACEHOLDER}
                    alt="Manual product preview"
                    className="h-36 w-full rounded border border-gray-700 object-cover"
                    referrerPolicy="no-referrer"
                    onLoad={() => {
                      if (normalizedManualImageUrl) {
                        setManualImageStatus('ok');
                      }
                    }}
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.onerror = null;
                      target.src = PRODUCT_IMAGE_PLACEHOLDER;
                      if (manualImageDraft.trim()) {
                        setManualImageStatus('error');
                      }
                    }}
                  />
                </div>
                {manualCanUseWarningOverride && (
                  <label className="mt-2 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                    <input
                      type="checkbox"
                      checked={manualAllowUnreachable}
                      onChange={(e) => setManualAllowUnreachable(e.target.checked)}
                      className="mt-0.5"
                    />
                    <span>
                      Save with warning: this URL is valid but preview failed to load. Some CDNs block hotlink previews by referrer.
                    </span>
                  </label>
                )}
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">Product Page URL (Optional)</label>
                <input type="url" name="productUrl" className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" placeholder="https://merchant.example/product-page" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Product Value (USD)</label>
                <input type="number" name="price" required min="0.01" step="0.01" className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" placeholder="Enter product value" />
              </div>
              <div className="col-span-2 rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-xs text-cyan-200">
                Use absolute http/https URLs. Merchant and commission can be inferred from URLs when available.
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button type="submit" disabled={!manualCanSubmit} className="flex-1 bg-[#00D9FF] hover:bg-[#00c5e6] disabled:opacity-60 disabled:cursor-not-allowed text-[#1a1f2e] font-bold py-3 rounded-lg transition-colors">
                {manualCanUseWarningOverride && manualAllowUnreachable ? 'Create Product (Warning Override)' : 'Create Product'}
              </button>
              <button type="button" onClick={() => setModalType(null)} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded-lg transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Product AI Generated Modal — VIP-Aware Intelligent Generation */}
      {modalType === 'add-product-ai' && (
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Sparkles className="text-purple-400" size={24} />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">AI Product Generation</h3>
                <p className="text-gray-400 text-xs mt-0.5">Intelligently generate products across VIP tiers</p>
              </div>
            </div>
            <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white" aria-label="Close dialog">
              <X size={24} />
            </button>
          </div>

          {/* VIP Tier Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">Target VIP Tiers</label>
            <div className="flex gap-2 flex-wrap">
              {[
                { level: 1, label: 'VIP 1', color: 'orange', range: '$25–$120', rate: '0.5%' },
                { level: 2, label: 'VIP 2', color: 'gray', range: '$100–$280', rate: '1.0%' },
                { level: 3, label: 'VIP 3', color: 'yellow', range: '$240–$600', rate: '1.5%' },
                { level: 4, label: 'VIP 4', color: 'cyan', range: '$500–$1,250', rate: '2.0%' },
                { level: 5, label: 'VIP 5', color: 'purple', range: '$1,100–$2,600', rate: '2.5%' },
              ].map(({ level, label, range, rate }) => {
                const isSelected = aiGenerateVipLevels.includes(level);
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() =>
                      setAiGenerateVipLevels((prev) =>
                        isSelected ? prev.filter((l) => l !== level) : [...prev, level].sort(),
                      )
                    }
                    className={`flex-1 min-w-[120px] px-3 py-2.5 rounded-lg border text-xs font-semibold transition-all ${
                      isSelected
                        ? 'bg-purple-500/20 border-purple-400 text-purple-300'
                        : 'bg-[#1a1f2e] border-gray-600 text-gray-400 hover:border-gray-400'
                    }`}
                  >
                    <div className="font-bold">{label}</div>
                    <div className="text-[10px] opacity-75 mt-0.5">{range}</div>
                    <div className="text-[10px] opacity-60">{rate} commission</div>
                  </button>
                );
              })}
            </div>
            {aiGenerateVipLevels.length === 0 && (
              <p className="text-red-400 text-xs mt-1">Select at least one VIP tier</p>
            )}
          </div>

          {/* Count per level */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Products per VIP Tier
              <span className="text-gray-500 font-normal ml-2">
                ({aiGenerateVipLevels.length * aiGenerateCount} total)
              </span>
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={50}
                value={aiGenerateCount}
                onChange={(e) => setAiGenerateCount(Number(e.target.value))}
                className="flex-1 accent-purple-400"
              />
              <span className="w-10 text-center text-white font-bold text-lg">{aiGenerateCount}</span>
            </div>
          </div>

          {/* Category filter (optional) */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Categories
              <span className="text-gray-500 font-normal ml-2">(leave empty for all)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {['Electronics', 'Wearables', 'Gaming', 'Office', 'Accessories', 'Home & Living', 'Fitness', 'Kitchen'].map((cat) => {
                const isSel = aiGenerateCategories.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() =>
                      setAiGenerateCategories((prev) =>
                        isSel ? prev.filter((c) => c !== cat) : [...prev, cat],
                      )
                    }
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      isSel
                        ? 'bg-purple-500/30 border border-purple-400 text-purple-300'
                        : 'bg-[#1a1f2e] border border-gray-600 text-gray-400 hover:border-gray-400'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Summary */}
          <div className="mb-5 p-3 bg-[#1a1f2e] rounded-lg border border-gray-700 text-xs text-gray-400">
            <div className="flex items-center justify-between">
              <span>Will preview up to <span className="text-white font-semibold">{aiGenerateVipLevels.length * aiGenerateCount}</span> products</span>
              <span>Tiers: <span className="text-purple-300 font-semibold">{aiGenerateVipLevels.length > 0 ? aiGenerateVipLevels.map((l) => `VIP${l}`).join(', ') : 'None'}</span></span>
            </div>
            <div className="mt-1 text-[11px] text-gray-500">Products are shown for review before saving. Duplicate names auto-skipped. Remove items you don't want before confirming.</div>
          </div>

          {/* Preview table — shown after generation, before commit */}
          {aiPreviewItems && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-white">{aiPreviewItems.length} products ready — review before saving</p>
                <button type="button" onClick={() => setAiPreviewItems(null)} className="text-xs text-gray-400 hover:text-white underline">Clear preview</button>
              </div>
              <div className="max-h-52 overflow-y-auto rounded-lg border border-gray-700 text-xs">
                <table className="w-full">
                  <thead className="bg-[#1a1f2e] sticky top-0">
                    <tr className="text-gray-400 text-left">
                      <th className="px-3 py-2">Product</th>
                      <th className="px-3 py-2">Merchant</th>
                      <th className="px-3 py-2">Price</th>
                      <th className="px-3 py-2">Commission</th>
                      <th className="px-3 py-2">VIP</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {aiPreviewItems.map((item, idx) => (
                      <tr key={item.id ?? idx} className="border-t border-gray-700/50 hover:bg-white/5">
                        <td className="px-3 py-2 text-white font-medium">{item.product}</td>
                        <td className="px-3 py-2 text-gray-300">{item.merchant}</td>
                        <td className="px-3 py-2 text-green-400">${Number(item.price).toFixed(2)}</td>
                        <td className="px-3 py-2 text-purple-300">{(Number(item.commission) * 100).toFixed(2)}%</td>
                        <td className="px-3 py-2 text-cyan-400">VIP{item.vipTier}</td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => setAiPreviewItems((prev) => prev ? prev.filter((_, i) => i !== idx) : prev)}
                            className="text-red-400 hover:text-red-300 font-bold"
                            title="Remove"
                          >✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            {aiPreviewItems ? (
              <>
                <button
                  type="button"
                  disabled={aiGenerating || aiPreviewItems.length === 0}
                  onClick={() => void handleConfirmGenerateProducts()}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {aiGenerating ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving...</>
                  ) : (
                    <>Confirm &amp; Save {aiPreviewItems.length} Product{aiPreviewItems.length !== 1 ? 's' : ''}</>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setAiPreviewItems(null)}
                  className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-5 rounded-lg transition-colors"
                >
                  Regenerate
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={aiGenerating || aiGenerateVipLevels.length === 0}
                onClick={() => void handleGenerateProducts()}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {aiGenerating ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Generating preview...</>
                ) : (
                  <><Sparkles size={18} />Preview Products</>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={() => { setModalType(null); setAiPreviewItems(null); }}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* CSV/JSON Bulk Import Modal */}
      {modalType === 'bulk-import-products' && (
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Upload className="text-green-400" size={24} />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">Import Products</h3>
                <p className="text-gray-400 text-xs mt-0.5">Upload CSV or JSON file to bulk-create products</p>
              </div>
            </div>
            <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white" aria-label="Close dialog">
              <X size={24} />
            </button>
          </div>

          <div className="mb-4 p-4 bg-[#1a1f2e] rounded-lg border border-gray-600 text-xs text-gray-400 space-y-2">
            <p className="text-white font-semibold text-sm">Expected format</p>
            <p><span className="text-green-400">CSV</span> — header row + data rows. Required fields: <code className="text-cyan-300">product, price</code>. Optional: <code className="text-cyan-300">merchant, commission, image, vipTier, category, status</code></p>
            <p><span className="text-blue-400">JSON</span> — array of objects, or <code className="text-cyan-300">{'{"tasks": [...]}'}</code></p>
            <div className="bg-black/30 rounded p-2 font-mono text-[10px] leading-relaxed">
              <div className="text-gray-500">// CSV example</div>
              <div>product,price,merchant,commission,vipTier</div>
              <div>Premium Keyboard,89.99,Amazon,0.005,1</div>
              <div>Ultra Smart Watch,249.00,Best Buy,0.01,2</div>
            </div>
          </div>

          <div
            className="border-2 border-dashed border-gray-600 hover:border-green-400 rounded-lg p-8 text-center cursor-pointer transition-colors"
            onClick={() => productImportInputRef.current?.click()}
          >
            <Upload className="mx-auto text-gray-400 mb-2" size={36} />
            <p className="text-white font-semibold">Click to select file</p>
            <p className="text-gray-500 text-xs mt-1">Supports .csv and .json files (max 500 products)</p>
          </div>

          <input
            ref={productImportInputRef}
            type="file"
            accept=".csv,.json,text/csv,application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const format: 'csv' | 'json' = file.name.endsWith('.json') ? 'json' : 'csv';
              const reader = new FileReader();
              reader.onload = (evt) => {
                const text = evt.target?.result;
                if (typeof text === 'string') {
                  void handleBulkImportProducts(text, format);
                }
              };
              reader.readAsText(file);
              e.target.value = '';
            }}
          />

          <div className="flex gap-3 mt-5">
            <button
              type="button"
              onClick={() => productImportInputRef.current?.click()}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Upload size={18} />
              Choose File
            </button>
            <button type="button" onClick={() => setModalType(null)} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded-lg transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* View Product Modal */}
      {modalType === 'view-product' && selectedItem && (
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-white">Product Details</h3>
            <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white" aria-label="Close dialog">
              <X size={24} />
            </button>
          </div>
          <div className="space-y-4">
            <div className="bg-[#1a1f2e] p-4 rounded-lg">
              <img
                src={String(selectedItem.image || selectedItem.imageUrl || '').trim() || PRODUCT_IMAGE_PLACEHOLDER}
                alt={selectedItem.product || selectedItem.name || 'Product'}
                className="w-full h-64 object-cover rounded-lg mb-4"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.onerror = null;
                  target.src = PRODUCT_IMAGE_PLACEHOLDER;
                }}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#1a1f2e] p-4 rounded-lg col-span-2">
                <p className="text-gray-400 text-sm">Product Name</p>
                <p className="text-white font-semibold mt-1">{selectedItem.product || selectedItem.name}</p>
              </div>
              <div className="bg-[#1a1f2e] p-4 rounded-lg col-span-2">
                <p className="text-gray-400 text-sm">Description</p>
                <p className="text-white mt-1">{selectedItem.description}</p>
              </div>
              <div className="bg-[#1a1f2e] p-4 rounded-lg">
                <p className="text-gray-400 text-sm">Category</p>
                <p className="text-white font-semibold mt-1">{selectedItem.category}</p>
              </div>
              <div className="bg-[#1a1f2e] p-4 rounded-lg">
                <p className="text-gray-400 text-sm">Merchant</p>
                <p className="text-white font-semibold mt-1">{selectedItem.merchant}</p>
              </div>
              <div className="bg-[#1a1f2e] p-4 rounded-lg">
                <p className="text-gray-400 text-sm">Price</p>
                <p className="text-[#00D9FF] font-bold text-xl mt-1">${selectedItem.price}</p>
              </div>
              <div className="bg-[#1a1f2e] p-4 rounded-lg">
                <p className="text-gray-400 text-sm">Commission Rate</p>
                <p className="text-green-400 font-bold text-xl mt-1">{(selectedItem.commission * 100).toFixed(1)}%</p>
              </div>
              <div className="bg-[#1a1f2e] p-4 rounded-lg">
                <p className="text-gray-400 text-sm">SKU</p>
                <p className="text-white font-semibold mt-1">{selectedItem.sku}</p>
              </div>
              <div className="bg-[#1a1f2e] p-4 rounded-lg">
                <p className="text-gray-400 text-sm">Stock</p>
                <p className="text-white font-semibold mt-1">{selectedItem.stock} units</p>
              </div>
              <div className="bg-[#1a1f2e] p-4 rounded-lg">
                <p className="text-gray-400 text-sm">Status</p>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mt-1 ${
                  selectedItem.status === 'Active' ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-300'
                }`}>
                  {selectedItem.status}
                </span>
              </div>
              <div className="bg-[#1a1f2e] p-4 rounded-lg">
                <p className="text-gray-400 text-sm">Source</p>
                <div className="flex items-center gap-2 mt-1">
                  {selectedItem.source === 'AI Generated' ? (
                    <><Sparkles size={14} className="text-purple-400" /><span className="text-purple-300 font-semibold text-sm">{selectedItem.source}</span></>
                  ) : (
                    <><Upload size={14} className="text-blue-400" /><span className="text-blue-300 font-semibold text-sm">{selectedItem.source}</span></>
                  )}
                </div>
              </div>
              <div className="bg-[#1a1f2e] p-4 rounded-lg col-span-2">
                <p className="text-gray-400 text-sm">Created Date</p>
                <p className="text-white font-semibold mt-1">{selectedItem.createdDate}</p>
              </div>
            </div>
          </div>
          <button onClick={() => setModalType(null)} className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded-lg mt-6 transition-colors">
            Close
          </button>
        </div>
      )}

        {/* Edit Product Modal */}
        {modalType === 'edit-product' && selectedItem && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Edit className="text-blue-400" size={24} />
                </div>
                <h3 className="text-2xl font-bold text-white">Edit Product</h3>
              </div>
              <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white" aria-label="Close dialog">
                <X size={24} />
              </button>
            </div>
            <form className="space-y-4" onSubmit={(e) => { void handleSaveProductEdit(e); }}>
              <input type="hidden" name="status" value="Active" />
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Product Name</label>
                  <input type="text" name="product" required defaultValue={selectedItem.product || selectedItem.name || ''} className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" placeholder="Enter product name" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Image URL</label>
                  <input
                    type="url"
                    name="image"
                    required
                    value={editImageDraft}
                    onChange={(e) => {
                      const next = e.target.value;
                      setEditImageDraft(next);
                      setEditAllowUnreachable(false);
                      if (!next.trim()) {
                        setEditImageStatus('idle');
                      } else {
                        setEditImageStatus(normalizeHttpUrl(next) ? 'loading' : 'error');
                      }
                    }}
                    className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none"
                    placeholder="https://image.example/product.jpg"
                  />
                  <div className="mt-3 rounded-lg border border-gray-700 bg-[#1a1f2e] p-3">
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="text-gray-400">Image Health Check</span>
                      {editImageStatus === 'ok' && <span className="text-green-400">Reachable</span>}
                      {editImageStatus === 'loading' && <span className="text-yellow-300">Checking...</span>}
                      {editImageStatus === 'error' && (
                        <span className="text-red-400">
                          {editHasValidImageUrl ? 'Unreachable in preview' : 'Invalid URL format'}
                        </span>
                      )}
                      {editImageStatus === 'idle' && <span className="text-gray-500">Paste image URL</span>}
                    </div>
                    <img
                      src={normalizedEditImageUrl || PRODUCT_IMAGE_PLACEHOLDER}
                      alt="Edit product preview"
                      className="h-36 w-full rounded border border-gray-700 object-cover"
                      referrerPolicy="no-referrer"
                      onLoad={() => {
                        if (normalizedEditImageUrl) {
                          setEditImageStatus('ok');
                        }
                      }}
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.onerror = null;
                        target.src = PRODUCT_IMAGE_PLACEHOLDER;
                        if (editImageDraft.trim()) {
                          setEditImageStatus('error');
                        }
                      }}
                    />
                  </div>
                  {editCanUseWarningOverride && (
                    <label className="mt-2 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                      <input
                        type="checkbox"
                        checked={editAllowUnreachable}
                        onChange={(e) => setEditAllowUnreachable(e.target.checked)}
                        className="mt-0.5"
                      />
                      <span>
                        Save with warning: this URL is valid but preview failed to load. Some CDNs block hotlink previews by referrer.
                      </span>
                    </label>
                  )}
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Product Page URL (Optional)</label>
                  <input type="url" name="productUrl" defaultValue={selectedItem.productUrl || ''} className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" placeholder="https://merchant.example/product-page" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Product Value (USD)</label>
                  <input type="number" name="price" required min="0.01" step="0.01" defaultValue={selectedItem.price ?? ''} className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" placeholder="Enter product value" />
                </div>
                <div className="col-span-2 rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-xs text-cyan-200">
                  Keep image URLs stable and absolute (http/https) to avoid broken thumbnails across admin and user dashboards.
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button type="submit" disabled={!editCanSubmit} className="flex-1 bg-[#00D9FF] hover:bg-[#00c5e6] disabled:opacity-60 disabled:cursor-not-allowed text-[#1a1f2e] font-bold py-3 rounded-lg transition-colors">
                  {editCanUseWarningOverride && editAllowUnreachable ? 'Save Changes (Warning Override)' : 'Save Changes'}
                </button>
                <button type="button" onClick={() => setModalType(null)} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded-lg transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Delete Product Modal */}
      {modalType === 'delete-product' && selectedItem && (
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-white">Delete Product</h3>
            <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white" aria-label="Close dialog">
              <X size={24} />
            </button>
          </div>
          <div className="text-center py-6">
            <XCircle className="mx-auto text-red-400 mb-4" size={64} />
            <p className="text-white text-lg mb-2">Are you sure you want to delete this product?</p>
            <p className="text-gray-400 mb-4">Product: <span className="text-white font-semibold">{selectedItem.product || selectedItem.name || 'Unknown product'}</span></p>
            <p className="text-red-400 text-sm">This action cannot be undone!</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setModalType(null)} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded-lg transition-colors">
              Cancel
            </button>
            <button onClick={() => void handleDeleteSelectedProduct()} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-lg transition-colors">
              Delete Product
            </button>
          </div>
        </div>
      )}

      {/* Edit Workday Reward Modal */}
      {modalType === 'edit-workday-reward' && selectedItem && (
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Award className="text-blue-400" size={24} />
              </div>
              <h3 className="text-2xl font-bold text-white">Edit Workday Reward</h3>
            </div>
            <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white" aria-label="Close dialog">
              <X size={24} />
            </button>
          </div>
          <form className="space-y-4" onSubmit={handleSaveWorkdayReward}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Days Worked</label>
                <input name="days" type="number" defaultValue={selectedItem.days} className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Salary Amount ($)</label>
                <input name="salary" type="number" step="0.01" defaultValue={selectedItem.salary} className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" />
              </div>
              <div className="col-span-2">
                <label className="flex items-center gap-2">
                  <input name="enabled" type="checkbox" defaultChecked={selectedItem.enabled} className="w-5 h-5 rounded bg-[#1a1f2e] border-gray-600 text-[#00D9FF] focus:ring-[#00D9FF]" />
                  <span className="text-white font-medium">Enable this reward tier</span>
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button type="submit" disabled={rewardsConfigSaving} className="flex-1 bg-[#00D9FF] hover:bg-[#00c5e6] disabled:opacity-60 text-[#1a1f2e] font-bold py-3 rounded-lg transition-colors">
                Save Changes
              </button>
              <button type="button" onClick={() => setModalType(null)} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded-lg transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Reset Reward Modal */}
      {modalType === 'edit-reset-reward' && selectedItem && (
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                <Gift className="text-white" size={24} />
              </div>
              <h3 className="text-2xl font-bold text-white">Edit Reset Reward</h3>
            </div>
            <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white" aria-label="Close dialog">
              <X size={24} />
            </button>
          </div>
          <form className="space-y-4" onSubmit={handleSaveResetReward}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Deposit Amount ($)</label>
                <input name="deposit" type="number" defaultValue={selectedItem.deposit} className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Reward Amount ($)</label>
                <input name="reward" type="number" step="0.01" defaultValue={selectedItem.reward} className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Tier Label</label>
                <input name="label" type="text" defaultValue={selectedItem.label} className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                <select name="enabled" defaultValue={selectedItem.enabled ? 'true' : 'false'} className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none">
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button type="submit" disabled={rewardsConfigSaving} className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-60 text-white font-bold py-3 rounded-lg transition-colors">
                Save Changes
              </button>
              <button type="button" onClick={() => setModalType(null)} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded-lg transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Accumulated Reward Modal */}
      {modalType === 'edit-accumulated-reward' && selectedItem && (
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <TrendingUp className="text-purple-400" size={24} />
              </div>
              <h3 className="text-2xl font-bold text-white">Edit Accumulated Reward</h3>
            </div>
            <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white" aria-label="Close dialog">
              <X size={24} />
            </button>
          </div>
          <form className="space-y-4" onSubmit={handleSaveAccumulatedReward}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Minimum Deposit ($)</label>
                <input name="minDeposit" type="number" defaultValue={selectedItem.minDeposit} className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Maximum Deposit ($)</label>
                <input name="maxDeposit" type="number" defaultValue={selectedItem.maxDeposit || ''} placeholder="Leave empty for unlimited" className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Reward Rate (%)</label>
                <input name="ratePercent" type="number" step="0.001" defaultValue={(selectedItem.rate * 100).toFixed(3)} className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                <select name="enabled" defaultValue={selectedItem.enabled ? 'true' : 'false'} className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none">
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button type="submit" disabled={rewardsConfigSaving} className="flex-1 bg-[#00D9FF] hover:bg-[#00c5e6] disabled:opacity-60 text-[#1a1f2e] font-bold py-3 rounded-lg transition-colors">
                Save Changes
              </button>
              <button type="button" onClick={() => setModalType(null)} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded-lg transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Product System Configuration Modal */}
      {modalType === 'edit-product-system' && (
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Settings2 className="text-blue-400" size={24} />
              </div>
              <h3 className="text-2xl font-bold text-white">Product System Configuration</h3>
            </div>
            <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white" aria-label="Close dialog">
              <X size={24} />
            </button>
          </div>
          <form className="space-y-4" onSubmit={handleSaveProductSystemConfig}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Products Per Set</label>
                <input name="productsPerSet" type="number" defaultValue={rewardsConfig.productSystem.productsPerSet} className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" />
                <p className="text-gray-500 text-xs mt-1">How many products in each task set</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Max Sets Per Day</label>
                <input name="maxSetsPerDay" type="number" defaultValue={rewardsConfig.productSystem.maxSetsPerDay} className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" />
                <p className="text-gray-500 text-xs mt-1">Maximum sets users can complete daily</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Min Time Per Product (seconds)</label>
                <input name="minTimePerProduct" type="number" defaultValue={rewardsConfig.productSystem.minTimePerProduct} className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" />
                <p className="text-gray-500 text-xs mt-1">Minimum time required per product</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Commission Approval</label>
                <select name="commissionApproval" defaultValue={rewardsConfig.productSystem.autoApproveCommission ? 'auto' : 'manual'} className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none">
                  <option value="auto">Automatic</option>
                  <option value="manual">Manual Approval</option>
                </select>
                <p className="text-gray-500 text-xs mt-1">How commissions are approved</p>
              </div>
              <div className="col-span-2">
                <label className="flex items-center gap-2">
                  <input name="requireProductConfirmation" type="checkbox" defaultChecked={rewardsConfig.productSystem.requireProductConfirmation} className="w-5 h-5 rounded bg-[#1a1f2e] border-gray-600 text-[#00D9FF] focus:ring-[#00D9FF]" />
                  <span className="text-white font-medium">Require product submission confirmation</span>
                </label>
                <p className="text-gray-500 text-xs mt-1 ml-7">Users must confirm each product submission</p>
              </div>

              <div className="col-span-2 border-t border-gray-700 pt-4 mt-2">
                <h4 className="text-white font-semibold mb-3">Premium Task Rule Engine</h4>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Enable Premium Trigger</label>
                <label className="flex items-center gap-2">
                  <input
                    name="premiumEnabled"
                    type="checkbox"
                    defaultChecked={rewardsConfig.productSystem.premiumEnabled ?? true}
                    className="w-5 h-5 rounded bg-[#1a1f2e] border-gray-600 text-[#00D9FF] focus:ring-[#00D9FF]"
                  />
                  <span className="text-white text-sm">Premium rules active</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Trigger At Submission #</label>
                <input
                  name="premiumTriggerTaskNumber"
                  type="number"
                  min={1}
                  defaultValue={rewardsConfig.productSystem.premiumTriggerTaskNumber ?? 10}
                  className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none"
                />
                <p className="text-gray-500 text-xs mt-1">Example: 10 means the 10th submission triggers premium check</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Premium Base Value</label>
                <input
                  name="premiumBaseValue"
                  type="number"
                  min={0}
                  step="0.01"
                  defaultValue={rewardsConfig.productSystem.premiumBaseValue ?? 300}
                  className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Premium Value Mode</label>
                <select
                  name="premiumValueMode"
                  defaultValue={rewardsConfig.productSystem.premiumValueMode ?? 'multiplier'}
                  className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none"
                >
                  <option value="multiplier">Multiplier</option>
                  <option value="range">Range</option>
                </select>
                <p className="text-gray-500 text-xs mt-1">Range mode uses min/max per VIP tier. Multiplier mode uses base value x multiplier.</p>
              </div>

              <div className="col-span-2">
                <div className="rounded-lg border border-gray-700 overflow-hidden">
                  <div className="grid grid-cols-4 gap-2 bg-[#1a1f2e] px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    <span>VIP</span>
                    <span>Multiplier</span>
                    <span>Range Min</span>
                    <span>Range Max</span>
                  </div>
                  {vipConfigurations.map((tier) => {
                    const existing = rewardsConfig.productSystem.vipPremiumAdjustments?.find((entry) => entry.vipLevel === tier.level);
                    return (
                      <div key={tier.level} className="grid grid-cols-4 gap-2 px-3 py-3 border-t border-gray-700 bg-[#252b3d]">
                        <span className="text-white text-sm font-semibold self-center">VIP {tier.level}</span>
                        <input
                          name={`premiumMultiplier_${tier.level}`}
                          type="number"
                          min={0.1}
                          step="0.01"
                          defaultValue={existing?.multiplier ?? 1}
                          className="w-full px-2 py-1.5 text-sm bg-[#1a1f2e] border border-gray-600 rounded text-white focus:border-[#00D9FF] focus:outline-none"
                        />
                        <input
                          name={`premiumMin_${tier.level}`}
                          type="number"
                          min={0}
                          step="0.01"
                          defaultValue={existing?.minValue ?? 0}
                          className="w-full px-2 py-1.5 text-sm bg-[#1a1f2e] border border-gray-600 rounded text-white focus:border-[#00D9FF] focus:outline-none"
                        />
                        <input
                          name={`premiumMax_${tier.level}`}
                          type="number"
                          min={0}
                          step="0.01"
                          defaultValue={existing?.maxValue ?? 0}
                          className="w-full px-2 py-1.5 text-sm bg-[#1a1f2e] border border-gray-600 rounded text-white focus:border-[#00D9FF] focus:outline-none"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button type="submit" disabled={rewardsConfigSaving} className="flex-1 bg-[#00D9FF] hover:bg-[#00c5e6] disabled:opacity-60 text-[#1a1f2e] font-bold py-3 rounded-lg transition-colors">
                Save Configuration
              </button>
              <button type="button" onClick={() => setModalType(null)} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded-lg transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Pay Salary Modal */}
      {modalType === 'pay-salary' && selectedItem && (
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Send className="text-green-400" size={24} />
              </div>
              <h3 className="text-2xl font-bold text-white">Process Salary Payment</h3>
            </div>
            <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white" aria-label="Close dialog">
              <X size={24} />
            </button>
          </div>
          <div className="space-y-4">
            <div className="bg-[#1a1f2e] rounded-lg p-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Username</p>
                  <p className="text-white font-bold text-lg">{selectedItem.username}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Days Worked</p>
                  <p className="text-white font-bold text-lg">{selectedItem.daysWorked} days</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Salary Amount</p>
                  <p className="text-[#00D9FF] font-bold text-2xl">${selectedItem.salaryDue.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Payment Mode</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                    selectedItem.paymentMode === 'Automatic' ? 'bg-blue-500/20 text-blue-300' : 'bg-purple-500/20 text-purple-300'
                  }`}>
                    {selectedItem.paymentMode}
                  </span>
                </div>
              </div>
            </div>
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Zap className="text-yellow-400 mt-1" size={20} />
                <div>
                  <p className="text-yellow-300 font-semibold text-sm">Payment Confirmation</p>
                  <p className="text-gray-400 text-xs mt-1">This will credit ${selectedItem.salaryDue.toLocaleString()} to the user's balance immediately.</p>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Payment Note (Optional)</label>
              <textarea className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" rows={3} placeholder="Add a note for this payment..."></textarea>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={() => processSingleSalaryPayment(selectedItem.id)} className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2">
              <Send size={18} />
              Process Payment
            </button>
            <button onClick={() => setModalType(null)} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded-lg transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Bulk Pay Salary Modal */}
      {modalType === 'pay-salary-bulk' && (
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg">
                <Coins className="text-white" size={24} />
              </div>
              <h3 className="text-2xl font-bold text-white">Bulk Salary Processing</h3>
            </div>
            <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white" aria-label="Close dialog">
              <X size={24} />
            </button>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-[#1a1f2e] rounded-lg p-4 text-center">
                <p className="text-gray-400 text-xs mb-1">Pending Payments</p>
                <p className="text-white font-bold text-2xl">{salaryPayments.filter(p => p.status === 'Pending').length}</p>
              </div>
              <div className="bg-[#1a1f2e] rounded-lg p-4 text-center">
                <p className="text-gray-400 text-xs mb-1">Total Amount</p>
                <p className="text-[#00D9FF] font-bold text-2xl">${salaryPayments.filter(p => p.status === 'Pending').reduce((sum, p) => sum + p.salaryDue, 0).toLocaleString()}</p>
              </div>
              <div className="bg-[#1a1f2e] rounded-lg p-4 text-center">
                <p className="text-gray-400 text-xs mb-1">Auto Mode</p>
                <p className="text-green-400 font-bold text-2xl">{salaryPayments.filter(p => p.status === 'Pending' && p.paymentMode === 'Automatic').length}</p>
              </div>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Zap className="text-blue-400 mt-1" size={20} />
                <div>
                  <p className="text-blue-300 font-semibold text-sm">Bulk Processing Options</p>
                  <p className="text-gray-400 text-xs mt-1">Choose which payments to process automatically</p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 p-3 bg-[#1a1f2e] rounded-lg hover:bg-[#252b3d] cursor-pointer">
                <input type="radio" name="bulkOption" value="all" checked={selectedBulkOption === 'all'} onChange={() => setSelectedBulkOption('all')} className="w-4 h-4 text-[#00D9FF] focus:ring-[#00D9FF]" />
                <span className="text-white font-medium">Process all pending payments</span>
              </label>
              <label className="flex items-center gap-2 p-3 bg-[#1a1f2e] rounded-lg hover:bg-[#252b3d] cursor-pointer">
                <input type="radio" name="bulkOption" value="auto" checked={selectedBulkOption === 'auto'} onChange={() => setSelectedBulkOption('auto')} className="w-4 h-4 text-[#00D9FF] focus:ring-[#00D9FF]" />
                <span className="text-white font-medium">Process only automatic mode payments</span>
              </label>
              <label className="flex items-center gap-2 p-3 bg-[#1a1f2e] rounded-lg hover:bg-[#252b3d] cursor-pointer">
                <input type="radio" name="bulkOption" value="manual" checked={selectedBulkOption === 'manual'} onChange={() => setSelectedBulkOption('manual')} className="w-4 h-4 text-[#00D9FF] focus:ring-[#00D9FF]" />
                <span className="text-white font-medium">Process only manual mode payments</span>
              </label>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={() => processBulkSalaryPayments(selectedBulkOption)} className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2">
              <Coins size={18} />
              Process Selected
            </button>
            <button onClick={() => setModalType(null)} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded-lg transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Add Admin Modal */}
      {modalType === 'add-admin' && (
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#00D9FF]/20 rounded-lg">
                <UserCog className="text-[#00D9FF]" size={24} />
              </div>
              <h3 className="text-2xl font-bold text-white">Create New Admin User</h3>
            </div>
            <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white" aria-label="Close dialog">
              <X size={24} />
            </button>
          </div>
          <form className="space-y-4" onSubmit={handleCreateAdminUser}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Full Name *</label>
                <input name="fullName" type="text" placeholder="John Doe" className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Username *</label>
                <input name="username" type="text" placeholder="johndoe" className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email *</label>
                <input name="email" type="email" placeholder="john@steadfastdigital.com" className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Phone</label>
                <input name="phone" type="tel" placeholder="+1 555-0000" className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Department</label>
                <input name="department" type="text" placeholder="IT & Operations" className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Role *</label>
                <select name="roleId" className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" required>
                  <option value="">Select Role</option>
                  {roleDefinitions.map(role => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">Temporary Password *</label>
                <input name="temporaryPassword" type="password" placeholder="Min. 8 characters" className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" required />
                <p className="text-gray-500 text-xs mt-1">Admin will be required to change password on first login</p>
              </div>
              <div className="col-span-2 flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input name="twoFactorEnabled" type="checkbox" className="w-5 h-5 rounded bg-[#1a1f2e] border-gray-600 text-[#00D9FF] focus:ring-[#00D9FF]" />
                  <span className="text-white font-medium">Enable Two-Factor Authentication</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="w-5 h-5 rounded bg-[#1a1f2e] border-gray-600 text-[#00D9FF] focus:ring-[#00D9FF]" />
                  <span className="text-white font-medium">Send welcome email</span>
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button type="submit" className="flex-1 bg-[#00D9FF] hover:bg-[#00c5e6] text-[#1a1f2e] font-bold py-3 rounded-lg transition-colors">
                Create Admin User
              </button>
              <button type="button" onClick={() => setModalType(null)} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded-lg transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Admin Modal */}
      {modalType === 'edit-admin' && selectedItem && (
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                selectedItem.roleColor === 'red' ? 'bg-red-500/20' : 
                selectedItem.roleColor === 'green' ? 'bg-green-500/20' : 
                selectedItem.roleColor === 'blue' ? 'bg-blue-500/20' : 
                selectedItem.roleColor === 'purple' ? 'bg-purple-500/20' : 
                'bg-yellow-500/20'
              }`}>
                <Edit className={`${
                  selectedItem.roleColor === 'red' ? 'text-red-400' : 
                  selectedItem.roleColor === 'green' ? 'text-green-400' : 
                  selectedItem.roleColor === 'blue' ? 'text-blue-400' : 
                  selectedItem.roleColor === 'purple' ? 'text-purple-400' : 
                  'text-yellow-400'
                }`} size={24} />
              </div>
              <h3 className="text-2xl font-bold text-white">Edit Admin User</h3>
            </div>
            <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white" aria-label="Close dialog">
              <X size={24} />
            </button>
          </div>
          <form onSubmit={handleUpdateAdminDetails} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
                <input type="text" defaultValue={selectedItem.fullName} className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Username</label>
                <input type="text" defaultValue={selectedItem.username} className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" disabled />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                <input type="email" defaultValue={selectedItem.email} className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Phone</label>
                <input type="tel" defaultValue={selectedItem.phone} className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Department</label>
                <input type="text" defaultValue={selectedItem.department} className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
                <select name="roleId" defaultValue={selectedItem.roleId} className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none">
                  {roleDefinitions.map(role => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                <select name="status" defaultValue={selectedItem.status} className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none">
                  <option value="Active">Active</option>
                  <option value="Suspended">Suspended</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Two-Factor Auth</label>
                <select name="twoFactorEnabled" defaultValue={selectedItem.twoFactorEnabled ? 'enabled' : 'disabled'} className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none">
                  <option value="enabled">Enabled</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button type="submit" className="flex-1 bg-[#00D9FF] hover:bg-[#00c5e6] text-[#1a1f2e] font-bold py-3 rounded-lg transition-colors">
                Save Changes
              </button>
              <button type="button" onClick={() => setModalType(null)} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded-lg transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* View Admin Modal */}
      {modalType === 'view-admin' && selectedItem && (
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg text-white ${
                selectedItem.roleColor === 'red' ? 'bg-red-500' : 
                selectedItem.roleColor === 'green' ? 'bg-green-500' : 
                selectedItem.roleColor === 'blue' ? 'bg-blue-500' : 
                selectedItem.roleColor === 'purple' ? 'bg-purple-500' : 
                'bg-yellow-500'
              }`}>
                {selectedItem.avatar}
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">{selectedItem.fullName}</h3>
                <p className="text-gray-400 text-sm">@{selectedItem.username}</p>
              </div>
            </div>
            <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white" aria-label="Close dialog">
              <X size={24} />
            </button>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#1a1f2e] rounded-lg p-4">
                <p className="text-gray-400 text-xs mb-1">Email</p>
                <p className="text-white font-semibold">{selectedItem.email}</p>
              </div>
              <div className="bg-[#1a1f2e] rounded-lg p-4">
                <p className="text-gray-400 text-xs mb-1">Phone</p>
                <p className="text-white font-semibold">{selectedItem.phone}</p>
              </div>
              <div className="bg-[#1a1f2e] rounded-lg p-4">
                <p className="text-gray-400 text-xs mb-1">Department</p>
                <p className="text-white font-semibold">{selectedItem.department}</p>
              </div>
              <div className="bg-[#1a1f2e] rounded-lg p-4">
                <p className="text-gray-400 text-xs mb-1">Role</p>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                  selectedItem.roleColor === 'red' ? 'bg-red-500/20 text-red-300' : 
                  selectedItem.roleColor === 'green' ? 'bg-green-500/20 text-green-300' : 
                  selectedItem.roleColor === 'blue' ? 'bg-blue-500/20 text-blue-300' : 
                  selectedItem.roleColor === 'purple' ? 'bg-purple-500/20 text-purple-300' : 
                  'bg-yellow-500/20 text-yellow-300'
                }`}>
                  {selectedItem.roleName}
                </span>
              </div>
              <div className="bg-[#1a1f2e] rounded-lg p-4">
                <p className="text-gray-400 text-xs mb-1">Status</p>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                  selectedItem.status === 'Active' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                }`}>
                  {selectedItem.status}
                </span>
              </div>
              <div className="bg-[#1a1f2e] rounded-lg p-4">
                <p className="text-gray-400 text-xs mb-1">Two-Factor Auth</p>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                  selectedItem.twoFactorEnabled ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-400'
                }`}>
                  {selectedItem.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="bg-[#1a1f2e] rounded-lg p-4">
                <p className="text-gray-400 text-xs mb-1">Last Login</p>
                <p className="text-white font-semibold text-sm">{selectedItem.lastLogin}</p>
              </div>
              <div className="bg-[#1a1f2e] rounded-lg p-4">
                <p className="text-gray-400 text-xs mb-1">Created Date</p>
                <p className="text-white font-semibold text-sm">{selectedItem.createdDate}</p>
              </div>
            </div>
            <button onClick={() => setModalType(null)} className="w-full bg-[#00D9FF] hover:bg-[#00c5e6] text-[#1a1f2e] font-bold py-3 rounded-lg transition-colors">
              Close
            </button>
          </div>
        </div>
      )}

      {/* Delete Admin Modal */}
      {modalType === 'delete-admin' && selectedItem && (
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-white">Delete Admin User</h3>
            <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white" aria-label="Close dialog">
              <X size={24} />
            </button>
          </div>
          <div className="text-center py-6">
            <XCircle className="mx-auto text-red-400 mb-4" size={64} />
            <p className="text-white text-lg mb-2">Are you sure you want to delete this admin?</p>
            <p className="text-gray-400 mb-1">Admin: <span className="text-white font-semibold">{selectedItem.fullName}</span></p>
            <p className="text-gray-400 mb-4">Role: <span className="text-white font-semibold">{selectedItem.roleName}</span></p>
            <p className="text-red-400 text-sm">This will revoke all admin access immediately!</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setModalType(null)} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded-lg transition-colors">
              Cancel
            </button>
            <button onClick={() => void handleDeleteAdminUser()} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-lg transition-colors">
              Delete Admin
            </button>
          </div>
        </div>
      )}

      {/* Admin Invitation Code Modal */}
      {modalType === 'admin-invitation-code' && selectedItem && (
        <div className="p-6 text-center">
          <div className="flex items-center justify-center mb-6">
            <button onClick={() => setModalType(null)} className="absolute right-6 text-gray-400 hover:text-white" aria-label="Close dialog">
              <X size={24} />
            </button>
          </div>
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-green-500/20 mb-4">
              <Check className="text-green-400" size={32} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">Admin Account Created!</h3>
          <p className="text-gray-400 mb-6">
            Invitation code for <span className="text-white font-semibold">{selectedItem.name}</span>
          </p>
          
          <div className="bg-[#1a1f2e] border border-[#00D9FF]/30 rounded-lg p-4 mb-6">
            <p className="text-gray-400 text-sm mb-2">Invitation Code</p>
            <div className="flex items-center justify-center gap-3">
              <code className="text-3xl font-bold text-[#00D9FF] tracking-widest">
                {selectedItem.invitationCode}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(selectedItem.invitationCode);
                  toast.success('Code copied to clipboard!');
                }}
                className="p-2.5 bg-[#00D9FF]/20 hover:bg-[#00D9FF]/30 text-[#00D9FF] rounded-lg transition-colors"
                title="Copy code"
              >
                <Copy size={20} />
              </button>
            </div>
          </div>

          <p className="text-gray-400 text-sm mb-6">
            Share this code with the user. They can use it to create accounts under this admin's hierarchy.
          </p>

          <button
            onClick={() => setModalType(null)}
            className="w-full bg-[#00D9FF] hover:bg-[#00c5e6] text-[#1a1f2e] font-bold py-3 rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      )}

      {/* View Role Permissions Modal */}
      {modalType === 'view-role-permissions' && selectedItem && (
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                selectedItem.color === 'red' ? 'bg-red-500/20' : 
                selectedItem.color === 'green' ? 'bg-green-500/20' : 
                selectedItem.color === 'blue' ? 'bg-blue-500/20' : 
                selectedItem.color === 'purple' ? 'bg-purple-500/20' : 
                'bg-yellow-500/20'
              }`}>
                <Shield className={`${
                  selectedItem.color === 'red' ? 'text-red-400' : 
                  selectedItem.color === 'green' ? 'text-green-400' : 
                  selectedItem.color === 'blue' ? 'text-blue-400' : 
                  selectedItem.color === 'purple' ? 'text-purple-400' : 
                  'text-yellow-400'
                }`} size={24} />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">{selectedItem.name}</h3>
                <p className="text-gray-400 text-sm">{selectedItem.description}</p>
              </div>
            </div>
            <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white" aria-label="Close dialog">
              <X size={24} />
            </button>
          </div>
          <div className="space-y-3">
            <h4 className="text-white font-bold text-sm uppercase text-gray-400">Permission Matrix</h4>
            {Object.entries(selectedItem.permissions).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between bg-[#1a1f2e] rounded-lg p-3">
                <span className="text-white font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                {value ? (
                  <Check className="text-green-400" size={20} />
                ) : (
                  <X className="text-red-400" size={20} />
                )}
              </div>
            ))}
          </div>
          <button onClick={() => setModalType(null)} className="w-full mt-6 bg-[#00D9FF] hover:bg-[#00c5e6] text-[#1a1f2e] font-bold py-3 rounded-lg transition-colors">
            Close
          </button>
        </div>
      )}

      {/* Add Role Modal */}
      {modalType === 'add-role' && (
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <ShieldCheck className="text-purple-400" size={24} />
              </div>
              <h3 className="text-2xl font-bold text-white">Create New Role</h3>
            </div>
            <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white" aria-label="Close dialog">
              <X size={24} />
            </button>
          </div>
          <form onSubmit={handleCreateRole} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Role Name *</label>
                <input type="text" name="name" placeholder="e.g. Marketing Manager" className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Color Theme</label>
                <select name="color" className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none">
                  <option value="blue">Blue</option>
                  <option value="green">Green</option>
                  <option value="purple">Purple</option>
                  <option value="red">Red</option>
                  <option value="yellow">Yellow</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <textarea name="description" className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" rows={2} placeholder="Brief description of this role..."></textarea>
              </div>
            </div>
            <div>
              <h4 className="text-white font-bold mb-3">Permissions</h4>
              <div className="grid grid-cols-2 gap-3">
                {(rolePermissionKeys || []).map((key) => (
                  <label key={key} className="flex items-center gap-2 bg-[#1a1f2e] p-3 rounded-lg cursor-pointer hover:bg-[#252b3d]">
                    <input type="checkbox" name={`perm_${key}`} className="w-4 h-4 rounded bg-[#1a1f2e] border-gray-600 text-[#00D9FF] focus:ring-[#00D9FF]" />
                    <span className="text-white text-sm capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button type="submit" className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-3 rounded-lg transition-colors">
                Create Role
              </button>
              <button type="button" onClick={() => setModalType(null)} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded-lg transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Role Modal */}
      {modalType === 'edit-role' && selectedItem && (
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                selectedItem.color === 'red' ? 'bg-red-500/20' : 
                selectedItem.color === 'green' ? 'bg-green-500/20' : 
                selectedItem.color === 'blue' ? 'bg-blue-500/20' : 
                selectedItem.color === 'purple' ? 'bg-purple-500/20' : 
                'bg-yellow-500/20'
              }`}>
                <Shield className={`${
                  selectedItem.color === 'red' ? 'text-red-400' : 
                  selectedItem.color === 'green' ? 'text-green-400' : 
                  selectedItem.color === 'blue' ? 'text-blue-400' : 
                  selectedItem.color === 'purple' ? 'text-purple-400' : 
                  'text-yellow-400'
                }`} size={24} />
              </div>
              <h3 className="text-2xl font-bold text-white">Edit Role</h3>
            </div>
            <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white" aria-label="Close dialog">
              <X size={24} />
            </button>
          </div>
          <form onSubmit={handleUpdateRole} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Role Name</label>
                <input type="text" name="name" defaultValue={selectedItem.name} className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Color Theme</label>
                <select name="color" defaultValue={selectedItem.color} className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none">
                  <option value="blue">Blue</option>
                  <option value="green">Green</option>
                  <option value="purple">Purple</option>
                  <option value="red">Red</option>
                  <option value="yellow">Yellow</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <textarea name="description" defaultValue={selectedItem.description} className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" rows={2}></textarea>
              </div>
            </div>
            <div>
              <h4 className="text-white font-bold mb-3">Permissions</h4>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(selectedItem.permissions).map(([key, value]) => (
                  <label key={key} className="flex items-center gap-2 bg-[#1a1f2e] p-3 rounded-lg cursor-pointer hover:bg-[#252b3d]">
                    <input type="checkbox" name={`perm_${key}`} defaultChecked={value as boolean} className="w-4 h-4 rounded bg-[#1a1f2e] border-gray-600 text-[#00D9FF] focus:ring-[#00D9FF]" />
                    <span className="text-white text-sm capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button type="submit" className="flex-1 bg-[#00D9FF] hover:bg-[#00c5e6] text-[#1a1f2e] font-bold py-3 rounded-lg transition-colors">
                Save Changes
              </button>
              <button type="button" onClick={() => setModalType(null)} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded-lg transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Role Modal */}
      {modalType === 'delete-role' && selectedItem && (
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-white">Delete Role</h3>
            <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white" aria-label="Close dialog">
              <X size={24} />
            </button>
          </div>
          <div className="text-center py-6">
            <XCircle className="mx-auto text-red-400 mb-4" size={64} />
            <p className="text-white text-lg mb-2">Are you sure you want to delete this role?</p>
            <p className="text-gray-400 mb-1">Role: <span className="text-white font-semibold">{selectedItem.name}</span></p>
            <p className="text-gray-400 mb-4">{adminUsers.filter(u => u.roleId === selectedItem.id).length} admin(s) currently have this role</p>
            <p className="text-red-400 text-sm">Admins with this role will lose their permissions!</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setModalType(null)} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded-lg transition-colors">
              Cancel
            </button>
            <button onClick={() => void handleDeleteRole()} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-lg transition-colors">
              Delete Role
            </button>
          </div>
        </div>
      )}
    </div>
  </ModalFocusTrap>

  );
}