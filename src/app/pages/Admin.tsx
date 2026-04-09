import { lazy, Suspense, useCallback, useEffect, useRef, useState, Component, type ReactNode, type ErrorInfo } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router';
import { defaultVipConfigurations, initialProductCatalog, initialAdminRoles } from '../admin/adminData';
import { formatRelativeTime } from '../admin/adminTypes';
import type { AdminUserRecord, AdminRole, ModalType, PlatformUser, PlatformUserAudit, ReferralOverviewRow, ReferralOverviewEvent, ReferralOverviewSummary, TaskConfig, TaskDraftState, TransactionRecord, UserBalanceAdjustmentDraft, UserTaskControlDraft, UserVipLevelDraft, VipDraftState, VipLevelConfig, WithdrawalRequestRecord, MenuItem } from '../admin/adminTypes';
const AdminModals = lazy(() => import('../admin/AdminModals'));
import { ResetCredentialsModal, CreditScoreModal } from '../admin/AdminPromptModals';
import ScrollToTop from '../admin/ScrollToTop';
import { 
  Home, 
  Users, 
  FileText, 
  Settings, 
  Database, 
  DollarSign, 
  Activity, 
  Shield,
  Bell,
  X,
  Target,
  Wallet,
  Image,
  Package,
  Gift,
  RefreshCw,
  UserCog,
  Lock,
  LogOut,
  Info,
  MessageSquare,
  CheckCircle,
  ClipboardList
} from 'lucide-react';
import steadfastLogo from '../../assets/4b611159e2ff0ca97c6252bef878e480dedd2a43.png';
import { buildAdminAuthHeaders, supabase } from '../services/supabaseAuth';
import { handleAdminAuthError } from '../services/adminAuthError';
import {
  defaultRewardsConfig,
  fetchAdminRewardsConfig,
  type RewardsConfig,
  updateAdminRewardsConfig,
} from '../services/rewardsConfig';
import { fetchAdminVipConfig, type VipConfig, updateAdminVipConfig } from '../services/vipConfig';
import { getRuntimeEnvironmentDebugSnapshot, RUNTIME_ENVIRONMENT } from '../services/runtimeEnvironment';
import { useAdminSalaryBackup } from '../hooks/useAdminSalaryBackup';
import { normalizeHttpUrl } from '../utils/urlValidation';

const PremiumBundles = lazy(() => import('../components/admin/PremiumBundles'));
const CustomerSupport = lazy(() => import('../components/admin/CustomerSupport'));
const InvitationCodes = lazy(() => import('../components/admin/InvitationCodes'));
const AdminUsers = lazy(() => import('../admin/AdminUsers'));
const RewardsSystem = lazy(() => import('../admin/RewardsSystem'));
const Financials = lazy(() => import('../admin/Financials'));
const Transactions = lazy(() => import('../admin/Transactions'));
const Withdrawals = lazy(() => import('../admin/Withdrawals'));
const Deposits = lazy(() => import('../admin/Deposits'));
const Notifications = lazy(() => import('../admin/Notifications'));
const UserManagement = lazy(() => import('../admin/UserManagement'));
const ProductManagement = lazy(() => import('../admin/ProductManagement'));
const Tasks = lazy(() => import('../admin/Tasks'));
const VipConfig = lazy(() => import('../admin/VipConfig'));
const AdminHome = lazy(() => import('../admin/AdminHome'));
const AdminSettings = lazy(() => import('../admin/AdminSettings'));
const LoginHistory = lazy(() => import('../admin/LoginHistory'));

function AdminPanelFallback({ label }: { label: string }) {
  return (
    <div className="space-y-4" aria-busy="true" aria-label={label}>
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-7 bg-gray-700/50 rounded w-48 animate-pulse" />
        <div className="h-9 bg-gray-700/50 rounded-lg w-32 animate-pulse" />
      </div>
      {/* Table skeleton rows */}
      <div className="bg-[#252b3d] border border-gray-700 rounded-lg overflow-hidden">
        {/* Header row */}
        <div className="flex gap-4 px-4 py-3 border-b border-gray-700">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-3 bg-gray-700/40 rounded animate-pulse" style={{ width: `${[30, 25, 20, 15][i]}%` }} />
          ))}
        </div>
        {/* Data rows */}
        {Array.from({ length: 5 }).map((_, r) => (
          <div key={r} className="flex gap-4 px-4 py-4 border-b border-gray-800">
            {Array.from({ length: 4 }).map((_, c) => (
              <div key={c} className="h-4 bg-gray-700/30 rounded animate-pulse" style={{ width: `${[28, 22, 18, 12][c]}%`, animationDelay: `${r * 75}ms` }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

class AdminSectionBoundary extends Component<
  { children: ReactNode; sectionName: string; onRetry?: () => void },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[Admin] ${this.props.sectionName} crashed:`, error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-[#252b3d] border border-red-400/30 rounded-lg p-8 text-center">
          <p className="text-red-300 font-semibold mb-2">This section encountered an error</p>
          <p className="text-gray-400 text-sm mb-4">The {this.props.sectionName} section could not be displayed.</p>
          <button
            onClick={() => {
              this.setState({ hasError: false });
              this.props.onRetry?.();
            }}
            className="px-4 py-2 bg-[#00D9FF] text-[#1a1f2e] rounded-lg font-semibold hover:bg-[#00c5e6] transition-colors"
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function Admin() {
  const navigate = useNavigate();
  const serverUrl = RUNTIME_ENVIRONMENT.apiBaseUrl;
  const runtimeEnvDebug = getRuntimeEnvironmentDebugSnapshot();
  const [showEnvironmentDebug, setShowEnvironmentDebug] = useState(false);
  const productsPerPage = 12;
  const usersPerPage = 15;
  const [activeMenu, setActiveMenu] = useState('home');
  const [searchTerm, setSearchTerm] = useState('');
  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [userTaskControlDraft, setUserTaskControlDraft] = useState<UserTaskControlDraft | null>(null);
  const [userTaskControlSaving, setUserTaskControlSaving] = useState(false);
  const [premiumReconcileSaving, setPremiumReconcileSaving] = useState(false);
  const [premiumReconcileAllSaving, setPremiumReconcileAllSaving] = useState(false);
  const [reconcileReport, setReconcileReport] = useState<{ processed: number; changed: number; settlementFixes: number; amount: number; target: string } | null>(null);
  const [userBalanceAdjustmentDraft, setUserBalanceAdjustmentDraft] = useState<UserBalanceAdjustmentDraft | null>(null);
  const [userBalanceAdjustmentSaving, setUserBalanceAdjustmentSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [activeAdminTab, setActiveAdminTab] = useState('admins');
  const [userVipLevelDraft, setUserVipLevelDraft] = useState<UserVipLevelDraft | null>(null);
  const [userVipLevelSaving, setUserVipLevelSaving] = useState(false);
  const [productPage, setProductPage] = useState(1);
  const [userPage, setUserPage] = useState(1);
  const [adminUsers, setAdminUsers] = useState<AdminUserRecord[]>([]);
  const [adminUsersLoading, setAdminUsersLoading] = useState(false);
  const [adminUsersError, setAdminUsersError] = useState<string | null>(null);
  const [referralRows, setReferralRows] = useState<ReferralOverviewRow[]>([]);
  const [referralEvents, setReferralEvents] = useState<ReferralOverviewEvent[]>([]);
  const [referralSummary, setReferralSummary] = useState<ReferralOverviewSummary | null>(null);
  const [referralsLoading, setReferralsLoading] = useState(false);
  const [referralsError, setReferralsError] = useState<string | null>(null);
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [platformUsers, setPlatformUsers] = useState<PlatformUser[]>([]);
  const [selectedUserAudit, setSelectedUserAudit] = useState<PlatformUserAudit | null>(null);
  const [selectedUserAuditLoading, setSelectedUserAuditLoading] = useState(false);
  const [platformUsersLoading, setPlatformUsersLoading] = useState(false);
  const [platformUsersLoaded, setPlatformUsersLoaded] = useState(false);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequestRecord[]>([]);
  const [financeLoading, setFinanceLoading] = useState(false);
  const [financeLoaded, setFinanceLoaded] = useState(false);
  const [approveWithdrawalTxHash, setApproveWithdrawalTxHash] = useState('');
  const [rejectWithdrawalReason, setRejectWithdrawalReason] = useState('');
  const [processingWithdrawal, setProcessingWithdrawal] = useState(false);
  const [showAdminVisibilityNotice, setShowAdminVisibilityNotice] = useState(true);
  const [newAdminInvitationCode, setNewAdminInvitationCode] = useState<string | null>(null);
  const [currentAdminInvitationCode, setCurrentAdminInvitationCode] = useState<string | null>(null);
  const [currentAdminCodeLoading, setCurrentAdminCodeLoading] = useState(false);
  const [vipConfigurations, setVipConfigurations] = useState<VipLevelConfig[]>(defaultVipConfigurations);
  const [vipConfigLoading, setVipConfigLoading] = useState(false);
  const [savingVipLevel, setSavingVipLevel] = useState<number | null>(null);
  const [editingVipLevel, setEditingVipLevel] = useState<number | null>(null);
  const [vipDraft, setVipDraft] = useState<VipDraftState | null>(null);
  const [rewardsConfig, setRewardsConfig] = useState<RewardsConfig>(defaultRewardsConfig);
  const [rewardsConfigLoading, setRewardsConfigLoading] = useState(false);
  const [rewardsConfigSaving, setRewardsConfigSaving] = useState(false);
  const [taskConfigurations, setTaskConfigurations] = useState<TaskConfig[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskDraft, setTaskDraft] = useState<TaskDraftState | null>(null);
  const [productCatalog, setProductCatalog] = useState(initialProductCatalog);
  const [roleDefinitions, setRoleDefinitions] = useState(initialAdminRoles);
  const [deletingPlatformUser, setDeletingPlatformUser] = useState(false);
  const [deletePlatformUserConfirmation, setDeletePlatformUserConfirmation] = useState('');
  const [syncingAllUsersVip, setSyncingAllUsersVip] = useState(false);
  const adminAuthRedirectedRef = useRef(false);
  const userScopeFallbackNoticeShownRef = useRef(false);
  const platformUsersFetchedAtRef = useRef(0);
  const mainScrollRef = useRef<HTMLElement>(null);
  const PLATFORM_USERS_STALE_MS = 60_000;
  const importBackupInputRef = useRef<HTMLInputElement | null>(null);

  // Bulk product generation state
  const [aiGenerateVipLevels, setAiGenerateVipLevels] = useState<number[]>([1, 2, 3, 4, 5]);
  const [aiGenerateCount, setAiGenerateCount] = useState(5);
  const [aiGenerateCategories, setAiGenerateCategories] = useState<string[]>([]);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiPreviewItems, setAiPreviewItems] = useState<Array<{ id: string; product: string; merchant: string; price: number; commission: number; vipTier: number; category: string }> | null>(null);

  // CSV/JSON import file ref
  const productImportInputRef = useRef<HTMLInputElement | null>(null);

  // Prompt-replacement modal state
  const [credentialResetTarget, setCredentialResetTarget] = useState<PlatformUser | null>(null);
  const [creditScoreTarget, setCreditScoreTarget] = useState<PlatformUser | null>(null);
  // Add platform user state
  const [addUserDraft, setAddUserDraft] = useState({ username: '', phone: '', password: '', invitationCode: '' });
  const [addUserSaving, setAddUserSaving] = useState(false);

  // Notification state
  const [notificationSending, setNotificationSending] = useState(false);

  useEffect(() => {
    try {
      const enabled = localStorage.getItem('sf_debug_env') === '1' || window.location.search.includes('debugEnv=1');
      setShowEnvironmentDebug(enabled);
    } catch {
      setShowEnvironmentDebug(false);
    }
  }, []);



  const handleAdminRequestError = (
    error: unknown,
    fallbackMessage: string,
    options?: {
      suppressToast?: boolean;
      onMessage?: (message: string) => void;
    },
  ) => {
    const normalizedFallback = fallbackMessage.trim().toLowerCase();
    const isBackgroundLoadOrSync = normalizedFallback.startsWith('failed to load')
      || normalizedFallback.startsWith('failed to sync');
    const suppressLimitedAdminScopeNoise = !isSuperAdmin
      && isBackgroundLoadOrSync
      && isPermissionDeniedError(error);

    handleAdminAuthError({
      errorValue: error,
      fallbackMessage,
      navigate,
      redirectedRef: adminAuthRedirectedRef,
      suppressToast: options?.suppressToast ?? suppressLimitedAdminScopeNoise,
      onMessage: options?.onMessage,
    });
  };

  const salary = useAdminSalaryBackup({ isSuperAdmin, serverUrl, handleAdminRequestError });
  const {
    salaryPayments,
    setSalaryPayments,
    salaryRestorePoints,
    selectedBulkOption,
    setSelectedBulkOption,
    activeRewardTab,
    setActiveRewardTab,
    autoBackupEnabled,
    autoBackupIntervalMinutes,
    backupRetentionDays,
    autoSavedAt,
    storageWarning,
    auditSearchTerm,
    setAuditSearchTerm,
    auditFilterAction,
    setAuditFilterAction,
    filteredAuditLog,
    pendingRestorePoint,
    pendingRestoreDiff,
    handleAutoBackupEnabledChange,
    handleAutoBackupIntervalChange,
    handleBackupRetentionChange,
    createAutoBackupPoint,
    restoreLatestSalaryPoint,
    undoLastRestore,
    requestRestoreSalaryPoint,
    confirmRestoreSalaryPoint,
    cancelRestoreSalaryPoint,
    deleteSalaryPointById,
    clearAllBackupPoints,
    processSingleSalaryPayment,
    processBulkSalaryPayments,
    exportBackupPoints,
    importBackupPoints,
    exportSalaryAuditLog,
    clearSalaryAuditLog,
    getAuditActionLabel,
    getAuditActionTone,
  } = salary;

  const isNotFoundError = (error: unknown): boolean => {
    if (!(error instanceof Error)) {
      return false;
    }

    const message = error.message.trim().toLowerCase();
    return message.includes('(404)') || message.startsWith('404 ');
  };

  const isPermissionDeniedError = (error: unknown): boolean => {
    if (!(error instanceof Error)) {
      return false;
    }

    const message = error.message.trim().toLowerCase();
    return message.includes('forbidden')
      || message.includes('super-admin access required')
      || message.includes('(403)')
      || message.startsWith('403 ');
  };

  useEffect(() => {
    if (modalType !== 'edit-user' || !selectedItem) {
      setUserTaskControlDraft(null);
      setUserVipLevelDraft(null);
      return;
    }

    setUserTaskControlDraft({
      taskSetCount: String(selectedItem.taskSetCount ?? 2),
    });
    setUserVipLevelDraft({
      vipLevel: Number.isFinite(Number(selectedItem.manualVipLevel))
        ? String(Math.max(1, Math.min(5, Math.round(Number(selectedItem.manualVipLevel)))))
        : 'auto',
      reason: '',
    });
  }, [modalType, selectedItem]);

  useEffect(() => {
    if (modalType !== 'adjust-user-balance' || !selectedItem) {
      setUserBalanceAdjustmentDraft(null);
      return;
    }

    setUserBalanceAdjustmentDraft({
      mode: 'credit',
      amount: '',
      reason: '',
      isBonus: false,
      bonusLabel: '',
      bonusAssignmentMode: 'semi-automatic',
    });
  }, [modalType, selectedItem]);

  useEffect(() => {
    if (modalType !== 'delete-user') {
      setDeletePlatformUserConfirmation('');
      return;
    }

    setDeletePlatformUserConfirmation('');
  }, [modalType, selectedItem]);

  // Load admin users when the assign-admin modal opens (they may not be loaded if
  // the Admin Users tab has never been visited in this session)
  useEffect(() => {
    if (modalType !== 'assign-admin') return;
    if (adminUsers.length === 0 && !adminUsersLoading) {
      void loadAdminUsers();
    }
  }, [modalType]);

  useEffect(() => {
    if (modalType !== 'view-user' || !selectedItem?.username) {
      setSelectedUserAudit(null);
      setSelectedUserAuditLoading(false);
      return;
    }

    let cancelled = false;

    const loadUserAudit = async () => {
      setSelectedUserAuditLoading(true);
      try {
        const headers = await buildAdminAuthHeaders(false);
        const response = await fetch(`${serverUrl}/admin/platform-users/${encodeURIComponent(selectedItem.username)}/audit`, {
          headers,
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.error ?? `Failed to load user audit (${response.status})`);
        }
        if (!cancelled) {
          setSelectedUserAudit(payload as PlatformUserAudit);
        }
      } catch (error) {
        if (!cancelled) {
          setSelectedUserAudit(null);
          handleAdminRequestError(error, 'Failed to load user audit details');
        }
      } finally {
        if (!cancelled) {
          setSelectedUserAuditLoading(false);
        }
      }
    };

    void loadUserAudit();

    return () => {
      cancelled = true;
    };
  }, [modalType, selectedItem, serverUrl]);

  const mergePlatformUser = (nextUser: PlatformUser) => {
    setPlatformUsers((current) => current.map((user) => (
      user.username === nextUser.username ? { ...user, ...nextUser } : user
    )));
    setSelectedItem((current: any) => (
      current?.username === nextUser.username
        ? {
            ...current,
            ...nextUser,
            status: nextUser.isSuspended ? 'Suspended' : 'Active',
            registered: nextUser.createdAt ? new Date(nextUser.createdAt).toLocaleDateString() : '—',
          }
        : current
    ));
  };

  const updatePlatformUserTaskControls = async (
    username: string,
    payload: Record<string, unknown>,
    successMessage: string,
  ) => {
    setUserTaskControlSaving(true);
    try {
      const headers = await buildAdminAuthHeaders();
      const response = await fetch(`${serverUrl}/admin/platform-users/${encodeURIComponent(username)}/task-controls`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.error ?? `Failed to update user task controls (${response.status})`);
      }

      if (result?.user) {
        mergePlatformUser(result.user as PlatformUser);
      } else {
        await loadPlatformUsers(true);
      }

      toast.success(successMessage);
      return result;
    } catch (error) {
      handleAdminRequestError(error, 'Failed to update user task controls');
      return null;
    } finally {
      setUserTaskControlSaving(false);
    }
  };

  const handleSaveUserTaskControls = async () => {
    if (!selectedItem?.username || !userTaskControlDraft) {
      return;
    }

    const taskSetCount = Math.max(2, Number.parseInt(userTaskControlDraft.taskSetCount, 10) || 2);
    const result = await updatePlatformUserTaskControls(
      selectedItem.username,
      { taskSetCount },
      'User task controls updated',
    );

    if (result?.user) {
      setUserTaskControlDraft({
        taskSetCount: String(result.user.taskSetCount ?? taskSetCount),
      });
    }
  };

  const handleResetUserTaskSet = async (user: PlatformUser) => {
    await updatePlatformUserTaskControls(user.username, {  resetCurrentSet: true }, `Task set reset for ${user.username}`);
  };

  const handleRestorePlatformUser = async (user: PlatformUser) => {
    await updatePlatformUserTaskControls(user.username, { unfreezeAccount: true }, `Account unfrozen for ${user.username}`);
  };

  const handleTogglePlatformUserSuspension = async (user: PlatformUser) => {
    if (user.isSuspended) {
      await updatePlatformUserTaskControls(user.username, { unsuspendAccount: true }, `Account enabled for ${user.username}`);
      return;
    }

    await updatePlatformUserTaskControls(user.username, { suspendAccount: true }, `Account disabled for ${user.username}`);
  };

  const handleResetUserCredentials = async (user: PlatformUser) => {
    setCredentialResetTarget(user);
  };

  const handleConfirmResetCredentials = async (loginPassword: string, transactionPassword: string) => {
    const user = credentialResetTarget;
    if (!user) return;
    setCredentialResetTarget(null);
    try {
      const headers = await buildAdminAuthHeaders();
      const response = await fetch(`${serverUrl}/admin/platform-users/${encodeURIComponent(user.username)}/reset-credentials`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ loginPassword, transactionPassword }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? `Failed to reset credentials (${response.status})`);
      }
      toast.success(`Credentials set for ${user.username}. User must change password at next login.`);
    } catch (error) {
      handleAdminRequestError(error, `Failed to reset credentials for ${user.username}`);
    }
  };

  const handleSetCreditScore = async (user: PlatformUser) => {
    setCreditScoreTarget(user);
  };

  const handleConfirmCreditScore = async (newScore: number) => {
    const user = creditScoreTarget;
    if (!user) return;
    setCreditScoreTarget(null);
    try {
      const headers = await buildAdminAuthHeaders();
      const response = await fetch(`${serverUrl}/admin/platform-users/${encodeURIComponent(user.username)}/credit-score`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ creditScore: newScore }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? `Failed to set credit score (${response.status})`);
      }
      toast.success(`Credit score set to ${newScore} for ${user.username}.`);
      if (payload?.user) {
        mergePlatformUser(payload.user as PlatformUser);
      } else {
        void loadPlatformUsers(true);
      }
    } catch (error) {
      handleAdminRequestError(error, `Failed to set credit score for ${user.username}`);
    }
  };

  const handleRecalculateFinancialState = async (user: PlatformUser) => {
    try {
      const headers = await buildAdminAuthHeaders();
      const response = await fetch(`${serverUrl}/admin/platform-users/${encodeURIComponent(user.username)}/recalculate-financial-state`, {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? `Failed to recalculate financial state (${response.status})`);
      }

      if (payload?.user) {
        mergePlatformUser(payload.user as PlatformUser);
      } else {
        void loadPlatformUsers(true);
      }

      const beforeBalance = Number(payload?.before?.balance ?? user.balance ?? 0);
      const afterBalance = Number(payload?.after?.balance ?? payload?.user?.balance ?? beforeBalance);
      toast.success(`Financial state recalculated for ${user.username} (${beforeBalance.toFixed(2)} -> ${afterBalance.toFixed(2)} USD).`);
    } catch (error) {
      handleAdminRequestError(error, `Failed to recalculate financial state for ${user.username}`);
    }
  };

  const handleReconcilePremiumSettlements = async (params?: {
    username?: string;
    dryRun?: boolean;
    maxUsers?: number;
  }) => {
    const isSingleUserRun = Boolean(params?.username);
    if (isSingleUserRun) {
      setPremiumReconcileSaving(true);
    } else {
      setPremiumReconcileAllSaving(true);
    }

    try {
      const headers = await buildAdminAuthHeaders();
      const reconcileController = new AbortController();
      const reconcileTimeout = setTimeout(() => reconcileController.abort(), 120_000);
      const response = await fetch(`${serverUrl}/admin/platform-users/reconcile-premium-settlements`, {
        method: 'POST',
        headers,
        signal: reconcileController.signal,
        body: JSON.stringify({
          username: params?.username,
          dryRun: params?.dryRun ?? false,
          reconcileTodayCommission: false,
          maxUsers: params?.maxUsers,
        }),
      }).finally(() => clearTimeout(reconcileTimeout));

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? `Failed to reconcile premium settlements (${response.status})`);
      }

      await loadPlatformUsers(true);

      const changed = Number(payload?.usersChanged ?? 0);
      const settlementFixes = Number(payload?.settlementBackfills ?? 0);
      const amount = Number(payload?.settlementBackfillAmount ?? 0);
      const processed = Number(payload?.processed ?? (isSingleUserRun ? 1 : 0));

      setReconcileReport({
        processed,
        changed,
        settlementFixes,
        amount,
        target: isSingleUserRun ? (params?.username ?? 'user') : `All Users (up to ${params?.maxUsers ?? 500})`,
      });
    } catch (error) {
      handleAdminRequestError(
        error,
        isSingleUserRun
          ? `Failed to reconcile premium settlements for ${params?.username}`
          : 'Failed to reconcile premium settlements for all users',
      );
    } finally {
      if (isSingleUserRun) {
        setPremiumReconcileSaving(false);
      } else {
        setPremiumReconcileAllSaving(false);
      }
    }
  };

  const handleAdjustPlatformUserBalance = async () => {
    if (!selectedItem?.username || !userBalanceAdjustmentDraft) {
      return;
    }

    const amount = Number(userBalanceAdjustmentDraft.amount);
    const reason = userBalanceAdjustmentDraft.reason.trim();

    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Adjustment amount must be greater than 0.');
      return;
    }

    if (!reason) {
      toast.error('Please provide a reason for this balance adjustment.');
      return;
    }

    setUserBalanceAdjustmentSaving(true);
    try {
      const headers = await buildAdminAuthHeaders();
      const isBonusCredit = userBalanceAdjustmentDraft.mode === 'credit' && userBalanceAdjustmentDraft.isBonus;
      const response = await fetch(`${serverUrl}/admin/platform-users/${encodeURIComponent(selectedItem.username)}/balance-adjustment`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          mode: userBalanceAdjustmentDraft.mode,
          amount,
          reason,
          ...(isBonusCredit && {
            isBonus: true,
            bonusLabel: userBalanceAdjustmentDraft.bonusLabel.trim() || 'Admin Bonus',
            bonusAssignmentMode: userBalanceAdjustmentDraft.bonusAssignmentMode,
          }),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? `Failed to adjust balance (${response.status})`);
      }

      if (payload?.user) {
        mergePlatformUser(payload.user as PlatformUser);
      } else {
        await loadPlatformUsers(true);
      }

      toast.success(
        userBalanceAdjustmentDraft.mode === 'credit'
          ? `Balance topped up for ${selectedItem.username}`
          : `Balance adjusted for ${selectedItem.username}`,
      );
      setModalType(null);
    } catch (error) {
      handleAdminRequestError(error, `Failed to adjust balance for ${selectedItem.username}`);
    } finally {
      setUserBalanceAdjustmentSaving(false);
    }
  };

  const handleAssignAdmin = async (username: string, subAdminId: string | null) => {
    try {
      const headers = await buildAdminAuthHeaders();
      const response = await fetch(`${serverUrl}/admin/platform-users/${encodeURIComponent(username)}/assign-admin`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ subAdminId: subAdminId ?? null }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? `Failed to assign admin (${response.status})`);
      }
      await loadPlatformUsers(true);
      toast.success(subAdminId ? `Sub-admin assigned to ${username}` : `${username} set to Direct (no sub-admin)`);
    } catch (error) {
      handleAdminRequestError(error, `Failed to assign sub-admin for ${username}`);
    }
  };

  const handleSaveUserVipLevel = async () => {
    if (!selectedItem?.username || !userVipLevelDraft) {
      return;
    }

    const reason = userVipLevelDraft.reason.trim();
    if (!reason) {
      toast.error('Please provide a reason for this VIP level change.');
      return;
    }

    const newVipLevel = userVipLevelDraft.vipLevel === 'auto' ? null : Number(userVipLevelDraft.vipLevel);
    if (newVipLevel !== null && (!Number.isFinite(newVipLevel) || newVipLevel < 1 || newVipLevel > 5)) {
      toast.error('VIP level must be between 1 and 5, or Auto.');
      return;
    }

    setUserVipLevelSaving(true);
    try {
      const headers = await buildAdminAuthHeaders();
      const response = await fetch(`${serverUrl}/admin/platform-users/${encodeURIComponent(selectedItem.username)}/vip-level`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          vipLevel: newVipLevel,
          reason,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? `Failed to update VIP level (${response.status})`);
      }

      if (payload?.user) {
        mergePlatformUser(payload.user as PlatformUser);
      } else {
        await loadPlatformUsers(true);
      }

      toast.success(
        newVipLevel === null
          ? `VIP override cleared for ${selectedItem.username}`
          : `VIP level updated to VIP${newVipLevel} for ${selectedItem.username}`,
      );
      setUserVipLevelDraft({ vipLevel: newVipLevel === null ? 'auto' : String(newVipLevel), reason: '' });
    } catch (error) {
      handleAdminRequestError(error, `Failed to update VIP level for ${selectedItem.username}`);
    } finally {
      setUserVipLevelSaving(false);
    }
  };

  const handleStartVipInlineEdit = (vip: VipLevelConfig) => {
    setEditingVipLevel(vip.level);
    setVipDraft({
      investment: String(vip.investment),
      dailyTasks: String(vip.dailyTasks),
      commissionPercent: (vip.commission * 100).toFixed(2),
      taskPriceMin: String(vip.taskPriceMin ?? 0),
      taskPriceMax: String(vip.taskPriceMax ?? 0),
    });
  };

  const handleCancelVipInlineEdit = () => {
    setEditingVipLevel(null);
    setVipDraft(null);
  };

  const loadVipConfigurations = async () => {
    setVipConfigLoading(true);
    try {
      const tiers = await fetchAdminVipConfig();
      setVipConfigurations(tiers.length > 0 ? tiers : defaultVipConfigurations);
    } catch (error) {
      setVipConfigurations(defaultVipConfigurations);
      handleAdminRequestError(error, 'Failed to load VIP configuration', {
        suppressToast: isNotFoundError(error) || isPermissionDeniedError(error),
      });
    } finally {
      setVipConfigLoading(false);
    }
  };

  const handleSaveVipInlineEdit = async (level: number) => {
    if (!vipDraft) return;

    const investment = Number(vipDraft.investment);
    const dailyTasks = Number(vipDraft.dailyTasks);
    const commissionPercent = Number(vipDraft.commissionPercent);

    if (!Number.isFinite(investment) || investment <= 0) {
      toast.error('Investment must be greater than 0.');
      return;
    }

    if (!Number.isFinite(dailyTasks) || dailyTasks <= 0 || !Number.isInteger(dailyTasks)) {
      toast.error('Daily tasks must be a whole number greater than 0.');
      return;
    }

    if (!Number.isFinite(commissionPercent) || commissionPercent <= 0) {
      toast.error('Commission rate must be greater than 0.');
      return;
    }

    try {
      setSavingVipLevel(level);
      const updatedTier = await updateAdminVipConfig(level, {
        investment,
        dailyTasks,
        commission: commissionPercent / 100,
        taskPriceMin: Math.max(0, Number(vipDraft.taskPriceMin) || 0),
        taskPriceMax: Math.max(0, Number(vipDraft.taskPriceMax) || 0),
      });

      setVipConfigurations((prev) =>
        prev.map((vip) => (vip.level === level ? updatedTier : vip)),
      );

      toast.success('VIP level updated.');
      setEditingVipLevel(null);
      setVipDraft(null);
    } catch (error) {
      handleAdminRequestError(error, 'Failed to update VIP level');
    } finally {
      setSavingVipLevel(null);
    }
  };

  const handleSyncAllUsersVip = async () => {
    setSyncingAllUsersVip(true);
    try {
      const headers = await buildAdminAuthHeaders();
      const response = await fetch(`${serverUrl}/admin/sync-all-users-vip`, { method: 'POST', headers });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error ?? 'Sync failed');
      toast.success('All user task assignments updated to match their VIP tier.');
      await loadPlatformUsers(true);
    } catch (error) {
      handleAdminRequestError(error, 'Failed to sync users to VIP tiers');
    } finally {
      setSyncingAllUsersVip(false);
    }
  };

  const loadRewardsConfigurations = async () => {
    setRewardsConfigLoading(true);
    try {
      const config = await fetchAdminRewardsConfig();
      setRewardsConfig(config);
    } catch (error) {
      setRewardsConfig(defaultRewardsConfig);
      handleAdminRequestError(error, 'Failed to load rewards configuration', {
        suppressToast: isNotFoundError(error) || isPermissionDeniedError(error),
      });
    } finally {
      setRewardsConfigLoading(false);
    }
  };

  const persistRewardsConfig = async (payload: Partial<RewardsConfig>, successMessage: string) => {
    setRewardsConfigSaving(true);
    try {
      const updated = await updateAdminRewardsConfig(payload);
      setRewardsConfig(updated);
      toast.success(successMessage);
      setModalType(null);
      setSelectedItem(null);
    } catch (error) {
      handleAdminRequestError(error, 'Failed to update rewards configuration');
    } finally {
      setRewardsConfigSaving(false);
    }
  };

  const handleSaveWorkdayReward = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedItem?.id) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const days = Number(formData.get('days'));
    const salary = Number(formData.get('salary'));
    const enabled = formData.get('enabled') === 'on';

    if (!Number.isInteger(days) || days <= 0) {
      toast.error('Days worked must be a whole number greater than 0.');
      return;
    }
    if (!Number.isFinite(salary) || salary < 0) {
      toast.error('Salary must be 0 or greater.');
      return;
    }

    const workday = rewardsConfig.workday.map((reward) =>
      reward.id === selectedItem.id ? { ...reward, days, salary, enabled } : reward,
    );
    await persistRewardsConfig({ workday }, 'Workday reward updated.');
  };

  const handleSaveResetReward = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedItem?.id) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const deposit = Number(formData.get('deposit'));
    const rewardAmount = Number(formData.get('reward'));
    const label = String(formData.get('label') ?? '').trim();
    const enabled = String(formData.get('enabled') ?? 'true') === 'true';

    if (!Number.isFinite(deposit) || deposit < 0) {
      toast.error('Deposit amount must be 0 or greater.');
      return;
    }
    if (!Number.isFinite(rewardAmount) || rewardAmount < 0) {
      toast.error('Reward amount must be 0 or greater.');
      return;
    }
    if (!label) {
      toast.error('Tier label is required.');
      return;
    }

    const reset = rewardsConfig.reset.map((reward) =>
      reward.id === selectedItem.id
        ? { ...reward, deposit, reward: rewardAmount, label, enabled }
        : reward,
    );
    await persistRewardsConfig({ reset }, 'Reset reward updated.');
  };

  const handleSaveAccumulatedReward = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedItem?.id) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const minDeposit = Number(formData.get('minDeposit'));
    const rawMaxDeposit = String(formData.get('maxDeposit') ?? '').trim();
    const maxDeposit = rawMaxDeposit ? Number(rawMaxDeposit) : null;
    const ratePercent = Number(formData.get('ratePercent'));
    const enabled = String(formData.get('enabled') ?? 'true') === 'true';

    if (!Number.isFinite(minDeposit) || minDeposit < 0) {
      toast.error('Minimum deposit must be 0 or greater.');
      return;
    }
    if (maxDeposit !== null && (!Number.isFinite(maxDeposit) || maxDeposit < minDeposit)) {
      toast.error('Maximum deposit must be greater than or equal to minimum deposit.');
      return;
    }
    if (!Number.isFinite(ratePercent) || ratePercent < 0) {
      toast.error('Reward rate must be 0 or greater.');
      return;
    }

    const accumulated = rewardsConfig.accumulated.map((reward) =>
      reward.id === selectedItem.id
        ? { ...reward, minDeposit, maxDeposit, rate: ratePercent / 100, enabled }
        : reward,
    );
    await persistRewardsConfig({ accumulated }, 'Accumulated reward updated.');
  };

  const handleSaveProductSystemConfig = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const productsPerSet = Number(formData.get('productsPerSet'));
    const maxSetsPerDay = Number(formData.get('maxSetsPerDay'));
    const minTimePerProduct = Number(formData.get('minTimePerProduct'));
    const autoApproveCommission = String(formData.get('commissionApproval') ?? 'auto') === 'auto';
    const requireProductConfirmation = formData.get('requireProductConfirmation') === 'on';
    const premiumEnabled = formData.get('premiumEnabled') === 'on';
    const premiumTriggerTaskNumber = Number(formData.get('premiumTriggerTaskNumber'));
    const premiumBaseValue = Number(formData.get('premiumBaseValue'));
    const premiumValueMode = String(formData.get('premiumValueMode') ?? 'multiplier') === 'range' ? 'range' : 'multiplier';

    const vipPremiumAdjustments = vipConfigurations.map((tier) => {
      const vipLevel = tier.level;
      const existing = rewardsConfig.productSystem.vipPremiumAdjustments?.find((entry) => entry.vipLevel === vipLevel);
      const multiplierValue = Number(formData.get(`premiumMultiplier_${vipLevel}`));
      const minValue = Number(formData.get(`premiumMin_${vipLevel}`));
      const maxValue = Number(formData.get(`premiumMax_${vipLevel}`));

      return {
        vipLevel,
        multiplier: multiplierValue,
        minValue,
        maxValue,
        upholdAmount: Number(existing?.upholdAmount ?? 0),
      };
    });

    if (!Number.isInteger(productsPerSet) || productsPerSet <= 0) {
      toast.error('Products per set must be a whole number greater than 0.');
      return;
    }
    if (!Number.isInteger(maxSetsPerDay) || maxSetsPerDay <= 0) {
      toast.error('Max sets per day must be a whole number greater than 0.');
      return;
    }
    if (!Number.isInteger(minTimePerProduct) || minTimePerProduct <= 0) {
      toast.error('Min time per product must be a whole number greater than 0.');
      return;
    }
    if (!Number.isInteger(premiumTriggerTaskNumber) || premiumTriggerTaskNumber <= 0) {
      toast.error('Premium trigger task number must be a whole number greater than 0.');
      return;
    }
    if (!Number.isFinite(premiumBaseValue) || premiumBaseValue < 0) {
      toast.error('Premium base value must be 0 or greater.');
      return;
    }

    const invalidMultiplier = vipPremiumAdjustments.find((entry) => !Number.isFinite(entry.multiplier) || entry.multiplier <= 0);
    if (invalidMultiplier) {
      toast.error(`VIP ${invalidMultiplier.vipLevel} multiplier must be greater than 0.`);
      return;
    }

    const invalidRange = vipPremiumAdjustments.find((entry) => (
      !Number.isFinite(entry.minValue)
      || !Number.isFinite(entry.maxValue)
      || entry.minValue < 0
      || entry.maxValue < entry.minValue
    ));
    if (invalidRange) {
      toast.error(`VIP ${invalidRange.vipLevel} premium range is invalid.`);
      return;
    }

    await persistRewardsConfig({
      productSystem: {
        productsPerSet,
        maxSetsPerDay,
        minTimePerProduct,
        autoApproveCommission,
        requireProductConfirmation,
        premiumEnabled,
        premiumTriggerTaskNumber,
        premiumBaseValue,
        premiumValueMode,
        vipPremiumAdjustments,
      },
    }, 'Product system configuration updated.');
  };

  const handleStartTaskInlineEdit = (task: TaskConfig) => {
    setEditingTaskId(task.id);
    setTaskDraft({
      product: task.product,
      merchant: task.merchant,
      price: String(task.price),
      commissionPercent: (task.commission * 100).toFixed(2),
      status: task.status,
      image: task.image,
      rating: String(task.rating),
      productUrl: task.productUrl,
    });
  };

  const handleCancelTaskInlineEdit = () => {
    setEditingTaskId(null);
    setTaskDraft(null);
  };

  const loadTaskConfigurations = async (options?: { suppressToast?: boolean }) => {
    setTasksLoading(true);
    try {
      const headers = await buildAdminAuthHeaders(false);
      const response = await fetch(`${serverUrl}/admin/tasks`, { headers });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? `Failed to load tasks (${response.status})`);
      }

      setTaskConfigurations(Array.isArray(payload?.tasks) ? payload.tasks : []);
    } catch (error) {
      setTaskConfigurations([]);
      handleAdminRequestError(error, 'Failed to load tasks', {
        suppressToast: options?.suppressToast ?? isPermissionDeniedError(error),
      });
    } finally {
      setTasksLoading(false);
    }
  };

  const handleSaveTaskInlineEdit = async (taskId: string) => {
    if (!taskDraft) return;

    const product = taskDraft.product.trim();
    const merchant = taskDraft.merchant.trim();
    const price = Number(taskDraft.price);
    const commissionPercent = Number(taskDraft.commissionPercent);
    const rating = Number(taskDraft.rating);
    const imageInput = taskDraft.image.trim();
    const imageUrl = normalizeHttpUrl(imageInput);
    const productUrlInput = taskDraft.productUrl.trim();
    const productUrl = productUrlInput ? normalizeHttpUrl(productUrlInput) : '';

    if (!product || !merchant) {
      toast.error('Product and merchant are required.');
      return;
    }

    if (!imageUrl) {
      toast.error('A valid image URL is required (http/https).');
      return;
    }

    if (productUrlInput && !productUrl) {
      toast.error('Product URL must be a valid absolute http/https URL.');
      return;
    }

    if (!Number.isFinite(price) || price <= 0) {
      toast.error('Price must be greater than 0.');
      return;
    }

    if (!Number.isFinite(commissionPercent) || commissionPercent <= 0) {
      toast.error('Commission rate must be greater than 0.');
      return;
    }

    try {
      const headers = await buildAdminAuthHeaders();
      const response = await fetch(`${serverUrl}/admin/tasks/${encodeURIComponent(taskId)}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          product,
          merchant,
          price,
          commission: commissionPercent / 100,
          status: taskDraft.status,
          image: imageUrl,
          rating: Number.isFinite(rating) && rating > 0 ? rating : 4,
          productUrl,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to update task');
      }

      await loadTaskConfigurations();
      toast.success('Task updated.');
      setEditingTaskId(null);
      setTaskDraft(null);
    } catch (error) {
      handleAdminRequestError(error, 'Failed to update task');
    }
  };

  const handleDeleteTaskInline = async (taskId: string) => {
    const target = taskConfigurations.find((task) => task.id === taskId);
    if (!target) return;

    if (!confirm(`Delete task for ${target.product}?`)) {
      return;
    }

    try {
      const headers = await buildAdminAuthHeaders(false);
      const response = await fetch(`${serverUrl}/admin/tasks/${encodeURIComponent(taskId)}`, {
        method: 'DELETE',
        headers,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to delete task');
      }

      await loadTaskConfigurations();
      if (editingTaskId === taskId) {
        setEditingTaskId(null);
        setTaskDraft(null);
      }
      toast.success('Task deleted.');
    } catch (error) {
      handleAdminRequestError(error, 'Failed to delete task');
    }
  };

  const loadAdminUsers = async () => {
    setAdminUsersLoading(true);
    setAdminUsersError(null);

    try {
      const headers = await buildAdminAuthHeaders(false);
      const response = await fetch(`${serverUrl}/admin/users`, { headers });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error ?? `Failed to load admin users (${response.status})`);
      }

      const users = Array.isArray(payload?.users) ? payload.users : [];
      setAdminUsers(users);
    } catch (error) {
      setAdminUsers([]);
      handleAdminRequestError(error, 'Failed to load admin users', {
        onMessage: (message) => setAdminUsersError(message),
      });
    } finally {
      setAdminUsersLoading(false);
    }
  };

  const loadCurrentAdminInvitationCode = async () => {
    setCurrentAdminCodeLoading(true);

    try {
      const headers = await buildAdminAuthHeaders(false);
      const response = await fetch(`${serverUrl}/admin/invitation-codes/mine`, { headers });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        // It's ok if this fails for some codes, just don't show anything
        setCurrentAdminInvitationCode(null);
        return;
      }

      const code = typeof payload?.code === 'string' ? payload.code : null;
      setCurrentAdminInvitationCode(code);
    } catch (error) {
      handleAdminRequestError(error, 'Failed to load invitation code', { suppressToast: true });
      setCurrentAdminInvitationCode(null);
    } finally {
      setCurrentAdminCodeLoading(false);
    }
  };

  const loadReferralOverview = async () => {
    setReferralsLoading(true);
    setReferralsError(null);

    try {
      const headers = await buildAdminAuthHeaders(false);
      const response = await fetch(`${serverUrl}/admin/referrals/overview`, { headers });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error ?? `Failed to load referral overview (${response.status})`);
      }

      setReferralRows(Array.isArray(payload?.rows) ? payload.rows : []);
      setReferralEvents(Array.isArray(payload?.events) ? payload.events : []);
      setReferralSummary(payload?.summary ?? null);
    } catch (error) {
      setReferralRows([]);
      setReferralEvents([]);
      setReferralSummary(null);
      handleAdminRequestError(error, 'Failed to load referral overview', {
        onMessage: (message) => setReferralsError(message),
      });
    } finally {
      setReferralsLoading(false);
    }
  };

  useEffect(() => {
    const resolveSuperAdmin = async () => {
      try {
        // Use getSession() instead of getUser() — avoids an extra network call
        // to Supabase Auth that races with the SDK's background token refresh
        // on new/cold sessions, causing AbortError on page load.
        const { data: sessionData } = await supabase.auth.getSession();

        const user = sessionData?.session?.user;
        if (!user) {
          setIsSuperAdmin(false);
          return;
        }

        setCurrentAdminId(user.id);

        const roles = new Set<string>();
        const normalize = (val: any): string | undefined => {
          if (typeof val === 'string') {
            const n = val.trim().toLowerCase().replace(/[\s-]+/g, '_');
            return n || undefined;
          }
          return undefined;
        };

        // Check metadata
        const appMeta = (user.app_metadata ?? {}) as any;
        const userMeta = (user.user_metadata ?? {}) as any;
        [appMeta.role, userMeta.role].forEach((r) => {
          const n = normalize(r);
          if (n) roles.add(n);
        });
        [appMeta.roles, userMeta.roles].forEach((arr: any) => {
          if (Array.isArray(arr)) arr.forEach((r: any) => { const n = normalize(r); if (n) roles.add(n); });
        });

        // Only trust roles from Supabase user metadata to avoid stale token claims.

        const hasSuperAdmin = roles.has('super_admin');
        setIsSuperAdmin(hasSuperAdmin);
      } catch (error) {
        console.error('Failed to resolve super-admin:', error);
        setIsSuperAdmin(false);
      }
    };

    void resolveSuperAdmin();
  }, []);

  useEffect(() => {
    if (activeMenu !== 'admin-users' || activeAdminTab !== 'admins') {
      return;
    }

    void loadAdminUsers();
  }, [activeAdminTab, activeMenu, serverUrl]);

  useEffect(() => {
    if (activeMenu !== 'admin-users' || activeAdminTab !== 'referrals') {
      return;
    }

    void loadReferralOverview();
    // Load current admin's invitation code if not super-admin
    if (!isSuperAdmin) {
      void loadCurrentAdminInvitationCode();
    }
  }, [activeAdminTab, activeMenu, serverUrl, isSuperAdmin]);

  useEffect(() => {
    if (activeMenu !== 'admin-users' || activeAdminTab !== 'admins' || isSuperAdmin || !showAdminVisibilityNotice) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShowAdminVisibilityNotice(false);
    }, 3 * 60 * 1000);

    return () => window.clearTimeout(timeoutId);
  }, [activeAdminTab, activeMenu, isSuperAdmin, showAdminVisibilityNotice]);

  const loadPlatformUsers = async (force = false) => {
    // Skip re-fetch if data is still fresh and not forced
    if (!force && platformUsersLoaded && Date.now() - platformUsersFetchedAtRef.current < PLATFORM_USERS_STALE_MS) {
      return;
    }
    setPlatformUsersLoaded(false);
    setPlatformUsersLoading(true);
    try {
      const headers = await buildAdminAuthHeaders(false);
      const res = await fetch(`${serverUrl}/admin/platform-users`, { headers });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error ?? `Failed to load platform users (${res.status})`);
      setPlatformUsers(Array.isArray(payload?.users) ? payload.users : []);
      platformUsersFetchedAtRef.current = Date.now();
      if (payload?.scopeFallbackApplied && !userScopeFallbackNoticeShownRef.current) {
        toast.info('Ownership scope fallback applied to restore legacy users visibility.');
        userScopeFallbackNoticeShownRef.current = true;
      }
    } catch (error) {
      handleAdminRequestError(error, 'Failed to load platform users', { suppressToast: false });
      setPlatformUsers([]);
    } finally {
      setPlatformUsersLoaded(true);
      setPlatformUsersLoading(false);
    }
  };

  const loadFinanceData = async () => {
    setFinanceLoaded(false);
    setFinanceLoading(true);
    try {
      const headers = await buildAdminAuthHeaders(false);
      const [transactionsResponse, withdrawalsResponse] = await Promise.all([
        fetch(`${serverUrl}/admin/transactions`, { headers }),
        fetch(`${serverUrl}/admin/withdrawals`, { headers }),
      ]);

      const [transactionsPayload, withdrawalsPayload] = await Promise.all([
        transactionsResponse.json().catch(() => ({})),
        withdrawalsResponse.json().catch(() => ({})),
      ]);

      if (!transactionsResponse.ok) {
        throw new Error(transactionsPayload?.error ?? `Failed to load transactions (${transactionsResponse.status})`);
      }
      if (!withdrawalsResponse.ok) {
        throw new Error(withdrawalsPayload?.error ?? `Failed to load withdrawals (${withdrawalsResponse.status})`);
      }

      setTransactions(Array.isArray(transactionsPayload?.transactions) ? transactionsPayload.transactions : []);
      setWithdrawalRequests(Array.isArray(withdrawalsPayload?.withdrawals) ? withdrawalsPayload.withdrawals : []);
    } catch (error) {
      setTransactions([]);
      setWithdrawalRequests([]);
      handleAdminRequestError(error, 'Failed to load finance data', {
        suppressToast: isPermissionDeniedError(error),
      });
    } finally {
      setFinanceLoaded(true);
      setFinanceLoading(false);
    }
  };

  useEffect(() => {
    if (activeMenu !== 'user-management' && activeMenu !== 'premium-bundles' && activeMenu !== 'financials' && activeMenu !== 'home') return;
    void loadPlatformUsers();
  }, [activeMenu, serverUrl]);

  useEffect(() => {
    if (!['home', 'financials', 'transactions', 'withdrawals', 'deposits'].includes(activeMenu)) {
      return;
    }

    void loadFinanceData();
  }, [activeMenu, serverUrl]);

  useEffect(() => {
    if (!['home', 'tasks', 'product-management'].includes(activeMenu)) {
      return;
    }

    void loadTaskConfigurations();
  }, [activeMenu, serverUrl]);

  useEffect(() => {
    if (!['home', 'financials', 'vip-config'].includes(activeMenu)) {
      return;
    }

    void loadVipConfigurations();
  }, [activeMenu]);

  useEffect(() => {
    if (!['home', 'financials', 'rewards-system'].includes(activeMenu)) {
      return;
    }

    if (!isSuperAdmin) {
      setRewardsConfig(defaultRewardsConfig);
      setRewardsConfigLoading(false);
      return;
    }

    void loadRewardsConfigurations();
  }, [activeMenu, isSuperAdmin]);

  const handleCreateAdminUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const form = e.currentTarget;
    const formData = new FormData(form);
    const fullName = String(formData.get('fullName') ?? '').trim();
    const username = String(formData.get('username') ?? '').trim();
    const email = String(formData.get('email') ?? '').trim();
    const phone = String(formData.get('phone') ?? '').trim();
    const department = String(formData.get('department') ?? '').trim();
    const roleId = Number(formData.get('roleId'));
    const password = String(formData.get('temporaryPassword') ?? '');
    const twoFactorEnabled = formData.get('twoFactorEnabled') === 'on';

    if (!fullName || !username || !email || !roleId) {
      toast.error('Please complete all required fields.');
      return;
    }

    if (password.length < 8) {
      toast.error('Temporary password must be at least 8 characters.');
      return;
    }

    if (adminUsers.some((admin) => admin.username.toLowerCase() === username.toLowerCase())) {
      toast.error('Username already exists.');
      return;
    }

    if (adminUsers.some((admin) => admin.email.toLowerCase() === email.toLowerCase())) {
      toast.error('Email already exists.');
      return;
    }

    const selectedRole = roleDefinitions.find((role) => role.id === roleId);
    if (!selectedRole) {
      toast.error('Please select a valid role.');
      return;
    }

    try {
      const headers = await buildAdminAuthHeaders();
      const response = await fetch(`${serverUrl}/admin/users`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          fullName,
          username,
          email,
          phone,
          department,
          roleName: selectedRole.name,
          roleColor: selectedRole.color,
          password,
          twoFactorEnabled,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to create admin user');
      }

      await loadAdminUsers();

      // Show invitation code in modal
      const invitationCode = payload?.invitationCode;
      const newAdminName = fullName;
      if (invitationCode) {
        setNewAdminInvitationCode(invitationCode);
        setSelectedItem({ name: newAdminName, invitationCode });
        setModalType('admin-invitation-code');
      } else {
        toast.success('Admin user created successfully!');
      }
      form.reset();
    } catch (error) {
      handleAdminRequestError(error, 'Failed to create admin user');
    }
  };

  // ── Bulk/generate product handlers ──────────────────────────────────────────

  const handleGenerateProducts = async () => {
    if (aiGenerating || aiGenerateVipLevels.length === 0) return;
    setAiGenerating(true);
    const toastId = 'admin-generate-products';
    const total = aiGenerateVipLevels.length * aiGenerateCount;
    try {
      toast.loading(`Previewing up to ${total} products...`, { id: toastId });
      const headers = await buildAdminAuthHeaders();
      const response = await fetch(`${serverUrl}/admin/tasks/generate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          vipLevels: aiGenerateVipLevels,
          countPerLevel: aiGenerateCount,
          categories: aiGenerateCategories.length > 0 ? aiGenerateCategories : undefined,
          preview: true,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to generate products');
      }
      toast.dismiss(toastId);
      setAiPreviewItems(Array.isArray(payload?.tasks) ? payload.tasks : []);
    } catch (error) {
      toast.dismiss(toastId);
      handleAdminRequestError(error, 'Failed to generate products', { suppressToast: false });
    } finally {
      setAiGenerating(false);
    }
  };

  const handleConfirmGenerateProducts = async () => {
    if (!aiPreviewItems || aiPreviewItems.length === 0) return;
    setAiGenerating(true);
    const toastId = 'admin-confirm-products';
    try {
      toast.loading(`Saving ${aiPreviewItems.length} products...`, { id: toastId });
      const headers = await buildAdminAuthHeaders();
      const response = await fetch(`${serverUrl}/admin/tasks/bulk`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ tasks: aiPreviewItems, skipDuplicates: true }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to save products');
      }
      toast.success(`Saved ${payload.created ?? aiPreviewItems.length} products successfully.`, { id: toastId });
      setAiPreviewItems(null);
      setModalType(null);
      void loadTaskConfigurations({ suppressToast: true });
    } catch (error) {
      toast.dismiss(toastId);
      handleAdminRequestError(error, 'Failed to save products', { suppressToast: false });
    } finally {
      setAiGenerating(false);
    }
  };

  const handleBulkDeleteProducts = async (ids: string[]) => {
    if (ids.length === 0) return;
    const toastId = 'admin-bulk-delete-products';
    try {
      toast.loading(`Deleting ${ids.length} product${ids.length !== 1 ? 's' : ''}...`, { id: toastId });
      const headers = await buildAdminAuthHeaders();
      const response = await fetch(`${serverUrl}/admin/tasks/bulk`, {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ taskIds: ids }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to delete products');
      }
      setTaskConfigurations((current) => current.filter((t) => !ids.includes(t.id)));
      toast.success(`Deleted ${payload.deleted} product${payload.deleted !== 1 ? 's' : ''}`, { id: toastId });
    } catch (error) {
      toast.dismiss(toastId);
      handleAdminRequestError(error, 'Failed to delete products', { suppressToast: false });
    }
  };

  const handleBulkStatusProducts = async (ids: string[], status: 'Active' | 'Paused') => {
    if (ids.length === 0) return;
    const toastId = 'admin-bulk-status-products';
    try {
      toast.loading(`Setting ${ids.length} product${ids.length !== 1 ? 's' : ''} to ${status}...`, { id: toastId });
      const headers = await buildAdminAuthHeaders();
      const response = await fetch(`${serverUrl}/admin/tasks/bulk`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ taskIds: ids, updates: { status } }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to update products');
      }
      setTaskConfigurations((current) =>
        current.map((t) => (ids.includes(t.id) ? { ...t, status } : t)),
      );
      toast.success(`Updated ${payload.updated} product${payload.updated !== 1 ? 's' : ''} to ${status}`, {
        id: toastId,
      });
    } catch (error) {
      toast.dismiss(toastId);
      handleAdminRequestError(error, 'Failed to update products', { suppressToast: false });
    }
  };

  const handleBulkImportProducts = async (rawText: string, format: 'csv' | 'json') => {
    const toastId = 'admin-bulk-import-products';
    try {
      let tasks: any[] = [];
      if (format === 'json') {
        const parsed: unknown = JSON.parse(rawText);
        tasks = Array.isArray(parsed)
          ? (parsed as any[])
          : Array.isArray((parsed as any)?.tasks)
            ? (parsed as any).tasks
            : [];
      } else {
        // CSV: first row is headers
        const lines = rawText.trim().split(/\r?\n/);
        if (lines.length < 2) {
          toast.error('CSV file must have a header row and at least one data row');
          return;
        }
        const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
        tasks = lines.slice(1)
          .filter((l) => l.trim())
          .map((line) => {
            const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
            const obj: Record<string, string> = {};
            headers.forEach((h, i) => {
              obj[h] = values[i] ?? '';
            });
            return obj;
          });
      }

      if (tasks.length === 0) {
        toast.error('No valid products found in file');
        return;
      }

      toast.loading(`Importing ${tasks.length} product${tasks.length !== 1 ? 's' : ''}...`, { id: toastId });
      const headers = await buildAdminAuthHeaders();
      const response = await fetch(`${serverUrl}/admin/tasks/bulk`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ tasks, skipDuplicates: true }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to import products');
      }

      toast.success(
        `Imported ${payload.created} products (${payload.skipped} duplicate${payload.skipped !== 1 ? 's' : ''} skipped${payload.errors > 0 ? `, ${payload.errors} error${payload.errors !== 1 ? 's' : ''}` : ''})`,
        { id: toastId },
      );
      setModalType(null);
      void loadTaskConfigurations({ suppressToast: true });
    } catch (error) {
      toast.dismiss(toastId);
      handleAdminRequestError(error, 'Failed to import products', { suppressToast: false });
    }
  };

  // ────────────────────────────────────────────────────────────────────────────

  const handleCreateTask = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formElement = event.currentTarget;
    const formData = new FormData(formElement);
    const product = String(formData.get('product') ?? '').trim();
    const imageInput = String(formData.get('image') ?? '').trim();
    const imageUrl = normalizeHttpUrl(imageInput);
    const productUrlInput = String(formData.get('productUrl') ?? '').trim();
    const productUrl = productUrlInput ? normalizeHttpUrl(productUrlInput) : '';
    const priceRaw = String(formData.get('price') ?? '').trim();
    const price = Number(priceRaw);
    const status = String(formData.get('status') ?? 'Active').trim();

    if (!product) {
      toast.error('Product name is required.');
      return;
    }
    if (!imageUrl) {
      toast.error('A valid image URL is required (http/https).');
      return;
    }
    if (productUrlInput && !productUrl) {
      toast.error('Product URL must be a valid absolute http/https URL.');
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      toast.error('Product value must be greater than 0.');
      return;
    }

    const loadingToastId = 'admin-create-product';
    try {
      toast.loading('Creating product...', { id: loadingToastId });
      const headers = await buildAdminAuthHeaders();
      const response = await fetch(`${serverUrl}/admin/tasks`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          product,
          image: imageUrl,
          productUrl,
          price,
          status,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? `Failed to create task (${response.status})`);
      }

      
      // Reset form and close modal immediately
      formElement.reset();
      toast.success('Product created successfully!', { id: loadingToastId });
      setModalType(null);
      
      // Update the list in background
      setTaskConfigurations((current) => {
        const createdTask = payload?.task;
        if (!createdTask || typeof createdTask !== 'object' || typeof createdTask.id !== 'string') {
          return current;
        }

        const nextTask = {
          assignedUsers: 0,
          completedToday: 0,
          ...createdTask,
        } as TaskConfig;

        return [nextTask, ...current.filter((task) => task.id !== nextTask.id)];
      });
      void loadTaskConfigurations({ suppressToast: true });
    } catch (error) {
      console.error('Error creating task:', error);
      // Don't close the modal on error - let user try again or must close manually
      toast.dismiss(loadingToastId);
      handleAdminRequestError(error, 'Failed to create product', { suppressToast: false });
    }
  };

  const handleDeleteAdminUser = async () => {
    if (!selectedItem?.id) {
      toast.error('Unable to delete admin: missing identifier.');
      return;
    }

    const targetId = String(selectedItem.id);
    if (currentAdminId && targetId === currentAdminId) {
      toast.error('You cannot delete your own admin account.');
      return;
    }

    try {
      const headers = await buildAdminAuthHeaders();
      const response = await fetch(`${serverUrl}/admin/users/${targetId}`, {
        method: 'DELETE',
        headers,
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to delete admin user');
      }

      await loadAdminUsers();
      toast.success('Admin user deleted successfully.');
      setModalType(null);
      setSelectedItem(null);
    } catch (error) {
      handleAdminRequestError(error, 'Failed to delete admin user');
    }
  };

  const handleDeletePlatformUser = async () => {
    const username = typeof selectedItem?.username === 'string' ? selectedItem.username.trim() : '';
    if (!username) {
      toast.error('Unable to delete user: missing username.');
      return;
    }

    const confirmedName = deletePlatformUserConfirmation.trim().toLowerCase();
    if (confirmedName !== username.toLowerCase()) {
      toast.error(`Type ${username} to confirm deletion.`);
      return;
    }

    setDeletingPlatformUser(true);
    try {
      const headers = await buildAdminAuthHeaders();
      const response = await fetch(`${serverUrl}/admin/platform-users/${encodeURIComponent(username)}`, {
        method: 'DELETE',
        headers,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to delete user');
      }

      await loadPlatformUsers(true);
      toast.success(`User ${username} deleted successfully.`);
      setModalType(null);
      setSelectedItem(null);
    } catch (error) {
      handleAdminRequestError(error, `Failed to delete user ${username}`);
    } finally {
      setDeletingPlatformUser(false);
    }
  };

  const handleDeleteSelectedProduct = async () => {
    if (!selectedItem?.id) {
      toast.error('Unable to delete product: missing identifier.');
      return;
    }

    const productId = String(selectedItem.id).trim();
    const loadingToastId = 'admin-delete-product';
    try {
      toast.loading('Deleting product...', { id: loadingToastId });
      const headers = await buildAdminAuthHeaders();
      const response = await fetch(`${serverUrl}/admin/tasks/${encodeURIComponent(productId)}`, {
        method: 'DELETE',
        headers,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? `Failed to delete product (${response.status})`);
      }

      setTaskConfigurations((current) => current.filter((task) => task.id !== productId));
      setModalType(null);
      setSelectedItem(null);
      toast.success('Product deleted successfully.', { id: loadingToastId });
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.dismiss(loadingToastId);
      handleAdminRequestError(error, 'Failed to delete product');
    }
  };

  const handleSaveProductEdit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedItem?.id) {
      toast.error('Unable to update product: missing identifier.');
      return;
    }

    const formData = new FormData(event.currentTarget);
    const product = String(formData.get('product') ?? '').trim();
    const imageInput = String(formData.get('image') ?? '').trim();
    const imageUrl = normalizeHttpUrl(imageInput);
    const productUrlInput = String(formData.get('productUrl') ?? '').trim();
    const productUrl = productUrlInput ? normalizeHttpUrl(productUrlInput) : '';
    const priceRaw = String(formData.get('price') ?? '').trim();
    const price = Number(priceRaw);
    const status = String(formData.get('status') ?? 'Active').trim();

    if (!product) {
      toast.error('Product name is required.');
      return;
    }
    if (!imageUrl) {
      toast.error('A valid image URL is required (http/https).');
      return;
    }
    if (productUrlInput && !productUrl) {
      toast.error('Product URL must be a valid absolute http/https URL.');
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      toast.error('Product value must be greater than 0.');
      return;
    }

    const productId = String(selectedItem.id).trim();
    const loadingToastId = 'admin-update-product';

    try {
      toast.loading('Updating product...', { id: loadingToastId });
      const headers = await buildAdminAuthHeaders();
      const response = await fetch(`${serverUrl}/admin/tasks/${encodeURIComponent(productId)}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          product,
          image: imageUrl,
          productUrl,
          price,
          status,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? `Failed to update product (${response.status})`);
      }

      setTaskConfigurations((current) => 
        current.map((task) => task.id === productId ? payload.task : task)
      );
      setModalType(null);
      setSelectedItem(null);
      toast.success('Product updated successfully.', { id: loadingToastId });
    } catch (error) {
      console.error('Error updating product:', error);
      toast.dismiss(loadingToastId);
      handleAdminRequestError(error, 'Failed to update product');
    }
  };

  const handleUpdateAdminDetails = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedItem?.id) {
      toast.error('Unable to update admin: missing identifier.');
      return;
    }

    const formData = new FormData(event.currentTarget);
    const roleId = Number(formData.get('roleId'));
    const role = roleDefinitions.find((item) => item.id === roleId);

    const nextAdmin = {
      ...selectedItem,
      email: String(formData.get('email') ?? '').trim(),
      phone: String(formData.get('phone') ?? '').trim(),
      department: String(formData.get('department') ?? '').trim(),
      status: String(formData.get('status') ?? 'Active').trim(),
      roleId: Number.isFinite(roleId) ? roleId : selectedItem.roleId,
      roleName: role?.name ?? selectedItem.roleName,
      roleColor: role?.color ?? selectedItem.roleColor,
      twoFactorEnabled: String(formData.get('twoFactorEnabled') ?? 'disabled') === 'enabled',
    };

    setAdminUsers((current) => current.map((admin) => (String(admin.id) === String(selectedItem.id) ? nextAdmin : admin)));
    setSelectedItem(nextAdmin);
    setModalType(null);
    toast.success('Admin updated successfully.');
  };

  const rolePermissionKeys = Object.keys((initialAdminRoles[0]?.permissions ?? {}) as Record<string, boolean>);

  const buildRolePermissionsFromForm = (formData: FormData) => {
    return rolePermissionKeys.reduce<Record<string, boolean>>((acc, key) => {
      acc[key] = formData.get(`perm_${key}`) === 'on';
      return acc;
    }, {});
  };

  const handleCreateRole = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get('name') ?? '').trim();
    if (!name) {
      toast.error('Role name is required.');
      return;
    }

    const nextRole = {
      id: Math.max(0, ...roleDefinitions.map((role) => Number(role.id) || 0)) + 1,
      name,
      description: String(formData.get('description') ?? '').trim() || 'Custom role',
      color: String(formData.get('color') ?? 'blue').trim(),
      permissions: buildRolePermissionsFromForm(formData) as Record<string, boolean>,
      createdDate: new Date().toISOString().slice(0, 10),
      isDefault: false,
    };

    setRoleDefinitions((current) => [...current, nextRole as typeof roleDefinitions[0]]);
    setModalType(null);
    toast.success('Role created successfully.');
  };

  const handleUpdateRole = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedItem?.id) {
      toast.error('Unable to update role: missing identifier.');
      return;
    }

    const formData = new FormData(event.currentTarget);
    const updatedRole = {
      ...selectedItem,
      name: String(formData.get('name') ?? selectedItem.name).trim(),
      description: String(formData.get('description') ?? selectedItem.description).trim(),
      color: String(formData.get('color') ?? selectedItem.color).trim(),
      permissions: buildRolePermissionsFromForm(formData) as Record<string, boolean>,
    };

    setRoleDefinitions((current) => current.map((role) => (role.id === selectedItem.id ? (updatedRole as typeof roleDefinitions[0]) : role)));
    setAdminUsers((current) => current.map((admin) => (
      admin.roleId === selectedItem.id
        ? { ...admin, roleName: updatedRole.name, roleColor: updatedRole.color }
        : admin
    )));
    setSelectedItem(updatedRole);
    setModalType(null);
    toast.success('Role updated successfully.');
  };

  const handleDeleteRole = () => {
    if (!selectedItem?.id) {
      toast.error('Unable to delete role: missing identifier.');
      return;
    }

    if (selectedItem.isDefault) {
      toast.error('Default roles cannot be deleted.');
      return;
    }

    const assignedAdmins = adminUsers.filter((admin) => admin.roleId === selectedItem.id).length;
    if (assignedAdmins > 0) {
      toast.error('Reassign admins before deleting this role.');
      return;
    }

    setRoleDefinitions((current) => current.filter((role) => role.id !== selectedItem.id));
    setModalType(null);
    setSelectedItem(null);
    toast.success('Role deleted successfully.');
  };

  const handleCreateManualProduct = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setModalType(null);
    setActiveMenu('product-management');
    toast.success('Product created successfully.');
  };

  const handleSendNotification = async (data: { title: string; message: string; priority: string; recipientType: string; recipientFilter: string | null }): Promise<boolean> => {
    setNotificationSending(true);
    try {
      const headers = await buildAdminAuthHeaders();
      const response = await fetch(`${serverUrl}/admin/notifications`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error ?? 'Failed to send notification');
      toast.success('Notification sent successfully.');
      return true;
    } catch (error) {
      handleAdminRequestError(error, 'Failed to send notification');
      return false;
    } finally {
      setNotificationSending(false);
    }
  };

  const handleCreatePlatformUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const { username, phone, password, invitationCode } = addUserDraft;
    if (!username.trim() || !phone.trim() || password.length < 6) {
      toast.error('Username, phone and a password of at least 6 characters are required.');
      return;
    }
    setAddUserSaving(true);
    try {
      const headers = await buildAdminAuthHeaders();
      const response = await fetch(`${serverUrl}/admin/platform-users`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          username: username.trim(),
          phone: phone.trim(),
          loginPassword: password,
          invitationCode: invitationCode.trim() || undefined,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? `Failed to create user (${response.status})`);
      }
      toast.success(`User "${username.trim()}" created. Default transaction password: 000000`);
      setAddUserDraft({ username: '', phone: '', password: '', invitationCode: '' });
      setModalType(null);
      await loadPlatformUsers(true);
    } catch (err) {
      handleAdminRequestError(err, 'Failed to create user');
    } finally {
      setAddUserSaving(false);
    }
  };

  const handleCreateAiProduct = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setModalType(null);
    setActiveMenu('product-management');
    toast.success('AI product generated successfully.');
  };

  const pendingWithdrawalCount = withdrawalRequests.filter((withdrawal) => withdrawal.status === 'Pending').length;
  const financeTransactionCount = transactions.length;

  const menuItems: MenuItem[] = [
    { id: 'home', label: 'Dashboard', icon: <Home size={18} /> },
    { id: 'financials', label: 'Financial Overview', icon: <Wallet size={18} /> },
    { id: 'rewards-system', label: 'Rewards & Salary System', icon: <Gift size={18} /> },
    { id: 'product-management', label: 'Product Management', icon: <Package size={18} /> },
    { id: 'premium-bundles', label: 'Premium Bundles', icon: <Lock size={18} /> },
    { id: 'customer-support', label: 'Customer Support', icon: <MessageSquare size={18} /> },
    { id: 'admin-users', label: 'Admin Users & Roles', icon: <UserCog size={18} />, badge: adminUsers.length || undefined },
    { id: 'user-management', label: 'User Management', icon: <Users size={18} />, badge: platformUsersLoaded ? platformUsers.length || undefined : undefined },
    { id: 'transactions', label: 'Transactions', icon: <DollarSign size={18} />, badge: financeLoaded ? financeTransactionCount || undefined : undefined },
    { id: 'tasks', label: 'Task Management', icon: <FileText size={18} /> },
    { id: 'vip-config', label: 'VIP Configuration', icon: <Shield size={18} /> },
    { id: 'withdrawals', label: 'Withdrawal Requests', icon: <Activity size={18} />, badge: financeLoaded ? pendingWithdrawalCount || undefined : undefined },
    { id: 'deposits', label: 'Deposit Records', icon: <Database size={18} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={18} /> },
    { id: 'login-history', label: 'Login History', icon: <ClipboardList size={18} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={18} /> },
  ];

  const handleExport = () => {
    toast.success('Exporting data as CSV…');
  };

  const handleApproveWithdrawal = (id: string) => {
    const withdrawal = withdrawalRequests.find((item) => item.id === id);
    setApproveWithdrawalTxHash('');
    setSelectedItem(withdrawal);
    setModalType('approve-withdrawal');
  };

  const handleRejectWithdrawal = (id: string) => {
    const withdrawal = withdrawalRequests.find((item) => item.id === id);
    setRejectWithdrawalReason('');
    setSelectedItem(withdrawal);
    setModalType('reject-withdrawal');
  };

  const processWithdrawalReview = async (action: 'approve' | 'reject') => {
    if (!selectedItem?.id) {
      return;
    }

    setProcessingWithdrawal(true);
    try {
      const headers = await buildAdminAuthHeaders();
      const response = await fetch(`${serverUrl}/admin/withdrawals/${selectedItem.id}/review`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action,
          txHash: action === 'approve' ? approveWithdrawalTxHash.trim() : '',
          rejectionReason: action === 'reject' ? rejectWithdrawalReason.trim() : '',
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to process withdrawal request');
      }

      await Promise.all([loadFinanceData(), loadPlatformUsers(true)]);
      toast.success(action === 'approve' ? 'Withdrawal approved.' : 'Withdrawal rejected.');
      setModalType(null);
      setSelectedItem(null);
      setApproveWithdrawalTxHash('');
      setRejectWithdrawalReason('');
    } catch (error) {
      handleAdminRequestError(error, 'Failed to process withdrawal request');
    } finally {
      setProcessingWithdrawal(false);
    }
  };

  useEffect(() => {
    setProductPage(1);
    setUserPage(1);
  }, [activeMenu, searchTerm, filterStatus]);


  const premiumBundleUsers = [...platformUsers]
    .sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    })
    .map((user, index) => {
      const totalCommission = transactions
        .filter((t) => t.username === user.username && t.type === 'Commission' && t.status === 'Completed')
        .reduce((sum, t) => sum + t.amount, 0);
      return {
        id: `${user.username}-${user.createdAt ?? index}`,
        username: user.username,
        vipLevel: String(user.vipLevel),
        balance: user.balance,
        totalCommission,
      };
    });

  const totalDeposits = transactions
    .filter((transaction) => transaction.type === 'Deposit' && transaction.status === 'Completed')
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const totalWithdrawals = transactions
    .filter((transaction) => transaction.type === 'Withdrawal' && transaction.status === 'Completed')
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const totalCommissions = transactions
    .filter((transaction) => transaction.type === 'Commission' && transaction.status === 'Completed')
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const pendingWithdrawalAmount = withdrawalRequests
    .filter((withdrawal) => withdrawal.status === 'Pending')
    .reduce((sum, withdrawal) => sum + withdrawal.amount, 0);
  const deposits = transactions.filter((transaction) => transaction.type === 'Deposit');
  const platformRevenue = totalDeposits - totalWithdrawals - totalCommissions;
  const totalUserBalances = platformUsers.reduce((sum, user) => sum + user.balance, 0);
  const totalCompletedTasks = platformUsers.reduce((sum, user) => sum + user.tasksCompleted, 0);
  const activePlatformUsers = platformUsers.filter((user) => !user.isSuspended).length;
  const averageBalance = platformUsers.length > 0 ? totalUserBalances / platformUsers.length : 0;
  const averageCommissionRate = platformUsers.length > 0
    ? (platformUsers.reduce((sum, user) => sum + (vipConfigurations.find((vip) => vip.level === user.vipLevel)?.commission ?? 0), 0) / platformUsers.length) * 100
    : 0;
  const totalFinanceVolume = totalDeposits + totalWithdrawals + totalCommissions;

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
  const formatDateTime = (value: string | null) => {
    if (!value) {
      return 'N/A';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return parsed.toLocaleString();
  };

  const renderContent = () => {
    switch (activeMenu) {
      case 'admin-users':
        return (
          <Suspense fallback={<AdminPanelFallback label="Loading admin users..." />}>
            <AdminUsers
              activeAdminTab={activeAdminTab}
              setActiveAdminTab={setActiveAdminTab}
              adminUsers={adminUsers}
              adminRoles={roleDefinitions}
              adminUsersLoading={adminUsersLoading}
              adminUsersError={adminUsersError}
              showAdminVisibilityNotice={showAdminVisibilityNotice}
              setShowAdminVisibilityNotice={setShowAdminVisibilityNotice}
              isSuperAdmin={isSuperAdmin}
              setSelectedItem={setSelectedItem}
              setModalType={setModalType}
              loadAdminUsers={loadAdminUsers}
              currentAdminId={currentAdminId}
              currentAdminInvitationCode={currentAdminInvitationCode}
              currentAdminCodeLoading={currentAdminCodeLoading}
              referralSummary={referralSummary}
              referralsLoading={referralsLoading}
              referralsError={referralsError}
              referralRows={referralRows}
              referralEvents={referralEvents}
              loadReferralOverview={loadReferralOverview}
              buildAdminAuthHeaders={buildAdminAuthHeaders}
              serverUrl={serverUrl}
            />
          </Suspense>
        );

      case 'rewards-system':
        return (
          <AdminSectionBoundary sectionName="Rewards & Salary" onRetry={() => void loadRewardsConfigurations()}>
            <Suspense fallback={<AdminPanelFallback label="Loading rewards system..." />}>
              <RewardsSystem
              activeRewardTab={activeRewardTab}
              setActiveRewardTab={setActiveRewardTab}
              rewardsConfig={rewardsConfig}
              autoSavedAt={autoSavedAt}
              autoBackupEnabled={autoBackupEnabled}
              autoBackupIntervalMinutes={autoBackupIntervalMinutes}
              backupRetentionDays={backupRetentionDays}
              storageWarning={storageWarning}
              handleAutoBackupEnabledChange={handleAutoBackupEnabledChange}
              handleAutoBackupIntervalChange={handleAutoBackupIntervalChange}
              handleBackupRetentionChange={handleBackupRetentionChange}
              importBackupPoints={importBackupPoints}
              exportBackupPoints={exportBackupPoints}
              createAutoBackupPoint={createAutoBackupPoint}
              restoreLatestSalaryPoint={restoreLatestSalaryPoint}
              undoLastRestore={undoLastRestore}
              salaryRestorePoints={salaryRestorePoints}
              clearAllBackupPoints={clearAllBackupPoints}
              auditSearchTerm={auditSearchTerm}
              setAuditSearchTerm={setAuditSearchTerm}
              auditFilterAction={auditFilterAction}
              setAuditFilterAction={setAuditFilterAction}
              filteredAuditLog={filteredAuditLog}
              getAuditActionTone={getAuditActionTone}
              getAuditActionLabel={getAuditActionLabel}
              exportSalaryAuditLog={exportSalaryAuditLog}
              clearSalaryAuditLog={clearSalaryAuditLog}
              setModalType={setModalType}
              setSelectedItem={setSelectedItem}
              salaryPayments={salaryPayments}
              requestRestoreSalaryPoint={requestRestoreSalaryPoint}
              deleteSalaryPointById={deleteSalaryPointById}
            />
            </Suspense>
          </AdminSectionBoundary>
        );

      case 'product-management':
        return (
          <Suspense fallback={<AdminPanelFallback label="Loading product management..." />}>
            <ProductManagement
              products={taskConfigurations}
              vipConfigurations={vipConfigurations}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              filterStatus={filterStatus}
              setFilterStatus={setFilterStatus}
              productPage={productPage}
              setProductPage={setProductPage}
              productsPerPage={productsPerPage}
              setModalType={setModalType}
              setSelectedItem={setSelectedItem}
              handleExport={handleExport}
              onBulkDelete={(ids) => void handleBulkDeleteProducts(ids)}
              onBulkStatusUpdate={(ids, status) => void handleBulkStatusProducts(ids, status as 'Active' | 'Paused')}
              onOpenImport={() => setModalType('bulk-import-products')}
            />
          </Suspense>
        );

      case 'user-management':
        return (
          <Suspense fallback={<AdminPanelFallback label="Loading user management..." />}>
            <UserManagement
              platformUsers={platformUsers}
              platformUsersLoaded={platformUsersLoaded}
              platformUsersLoading={platformUsersLoading}
              isSuperAdmin={isSuperAdmin}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              filterStatus={filterStatus}
              setFilterStatus={setFilterStatus}
              userPage={userPage}
              setUserPage={setUserPage}
              usersPerPage={usersPerPage}
              setSelectedItem={setSelectedItem}
              setModalType={setModalType}
              handleExport={handleExport}
              onToggleSuspension={handleTogglePlatformUserSuspension}
              onResetTaskSet={handleResetUserTaskSet}
              onRestoreNaturalState={handleRestorePlatformUser}
              onResetCredentials={handleResetUserCredentials}
              onSetCreditScore={handleSetCreditScore}
              onRecalculateFinancialState={handleRecalculateFinancialState}
              onReconcilePremiumUser={(user) => handleReconcilePremiumSettlements({ username: user.username })}
              onReconcilePremiumAll={() => handleReconcilePremiumSettlements({ maxUsers: 500 })}
              reconcilingPremiumUser={premiumReconcileSaving}
              reconcilingPremiumAll={premiumReconcileAllSaving}
            />
          </Suspense>
        );

      case 'transactions':
        return (
          <Suspense fallback={<AdminPanelFallback label="Loading transactions..." />}>
            <Transactions
              transactions={transactions}
              financeLoading={financeLoading}
              handleExport={handleExport}
              formatCurrency={formatCurrency}
              formatDateTime={formatDateTime}
            />
          </Suspense>
        );

      case 'tasks':
        return (
          <AdminSectionBoundary sectionName="Task Management" onRetry={() => void loadTaskConfigurations()}>
            <Suspense fallback={<AdminPanelFallback label="Loading tasks..." />}>
              <Tasks
              taskConfigurations={taskConfigurations}
              tasksLoading={tasksLoading}
              editingTaskId={editingTaskId}
              taskDraft={taskDraft}
              setTaskDraft={setTaskDraft}
              setModalType={setModalType}
              setSelectedItem={setSelectedItem}
              handleStartTaskInlineEdit={handleStartTaskInlineEdit}
              handleCancelTaskInlineEdit={handleCancelTaskInlineEdit}
              handleSaveTaskInlineEdit={handleSaveTaskInlineEdit}
              handleDeleteTaskInline={handleDeleteTaskInline}
            />
            </Suspense>
          </AdminSectionBoundary>
        );

      case 'vip-config':
        return (
          <AdminSectionBoundary sectionName="VIP Configuration" onRetry={() => void loadVipConfigurations()}>
            <>
            <div className="mb-4 flex justify-end">
              <button
                type="button"
                onClick={() => void handleSyncAllUsersVip()}
                disabled={syncingAllUsersVip}
                className="inline-flex items-center gap-2 rounded-lg bg-[#00D9FF] px-4 py-2 text-sm font-semibold text-[#1a1f2e] transition-colors hover:bg-[#00c5e6] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw size={16} className={syncingAllUsersVip ? 'animate-spin' : ''} />
                {syncingAllUsersVip ? 'Syncing Users...' : 'Sync All Users to VIP Tiers'}
              </button>
            </div>
            <Suspense fallback={<AdminPanelFallback label="Loading VIP configuration..." />}>
              <VipConfig
                vipConfigurations={vipConfigurations}
                vipConfigLoading={vipConfigLoading}
                editingVipLevel={editingVipLevel}
                vipDraft={vipDraft}
                savingVipLevel={savingVipLevel}
                setVipDraft={setVipDraft}
                handleStartVipInlineEdit={handleStartVipInlineEdit}
                handleCancelVipInlineEdit={handleCancelVipInlineEdit}
                handleSaveVipInlineEdit={handleSaveVipInlineEdit}
              />
            </Suspense>
            </>
          </AdminSectionBoundary>
        );

      case 'withdrawals':
        return (
          <Suspense fallback={<AdminPanelFallback label="Loading withdrawal requests..." />}>
            <Withdrawals
              withdrawalRequests={withdrawalRequests}
              pendingWithdrawalCount={pendingWithdrawalCount}
              financeLoading={financeLoading}
              handleExport={handleExport}
              handleApproveWithdrawal={handleApproveWithdrawal}
              handleRejectWithdrawal={handleRejectWithdrawal}
              formatCurrency={formatCurrency}
              formatDateTime={formatDateTime}
            />
          </Suspense>
        );

      case 'deposits':
        return (
          <Suspense fallback={<AdminPanelFallback label="Loading deposit records..." />}>
            <Deposits
              deposits={deposits}
              financeLoading={financeLoading}
              handleExport={handleExport}
              formatCurrency={formatCurrency}
              formatDateTime={formatDateTime}
            />
          </Suspense>
        );

      case 'notifications':
        return (
          <Suspense fallback={<AdminPanelFallback label="Loading notifications..." />}>
            <Notifications
              setModalType={setModalType}
              formatRelativeTime={formatRelativeTime}
            />
          </Suspense>
        );

      case 'premium-bundles':
        return (
          <Suspense fallback={<AdminPanelFallback label="Loading premium bundles..." />}>
            <PremiumBundles users={premiumBundleUsers} vipConfigs={vipConfigurations} />
          </Suspense>
        );

      case 'customer-support':
        return (
          <Suspense fallback={<AdminPanelFallback label="Loading customer support..." />}>
            <CustomerSupport />
          </Suspense>
        );

      case 'login-history':
        return (
          <Suspense fallback={<AdminPanelFallback label="Loading login history..." />}>
            <LoginHistory />
          </Suspense>
        );

      case 'settings':
        return (
          <Suspense fallback={<AdminPanelFallback label="Loading settings..." />}>
            <AdminSettings isSuperAdmin={isSuperAdmin} />
          </Suspense>
        );

      case 'financials':
        return (
          <Suspense fallback={<AdminPanelFallback label="Loading financials..." />}>
            <Financials
              platformRevenue={platformRevenue}
              totalDeposits={totalDeposits}
              totalWithdrawals={totalWithdrawals}
              totalCommissions={totalCommissions}
              totalUserBalances={totalUserBalances}
              averageBalance={averageBalance}
              pendingWithdrawalAmount={pendingWithdrawalAmount}
              pendingWithdrawalCount={pendingWithdrawalCount}
              deposits={deposits}
              withdrawalRequests={withdrawalRequests}
              transactions={transactions}
              platformUsers={platformUsers}
              vipConfigurations={vipConfigurations}
              taskConfigurations={taskConfigurations}
              financeLoading={financeLoading}
              activePlatformUsers={activePlatformUsers}
              totalCompletedTasks={totalCompletedTasks}
              averageCommissionRate={averageCommissionRate}
              totalFinanceVolume={totalFinanceVolume}
              handleExport={handleExport}
            />
          </Suspense>
        );

      case 'home':
        return (
          <Suspense fallback={<AdminPanelFallback label="Loading dashboard..." />}>
            <AdminHome
              platformUsersLoaded={platformUsersLoaded}
              platformUsers={platformUsers}
              platformRevenue={platformRevenue}
              formatCurrency={formatCurrency}
              taskConfigurations={taskConfigurations}
              pendingWithdrawalCount={pendingWithdrawalCount}
              financeLoading={financeLoading}
              transactions={transactions}
            />
          </Suspense>
        );

      default:
        return (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <Database className="mx-auto text-gray-600 mb-4" size={64} />
              <h3 className="text-xl font-semibold text-gray-400">Section Under Development</h3>
              <p className="text-gray-500 mt-2">This feature will be available soon.</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="size-full flex bg-[#1a1f2e]">
      {/* Left Sidebar */}
      <aside className="w-64 bg-[#252b3d] border-r border-gray-700 flex flex-col">
        {/* Logo Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <img src={steadfastLogo} alt="Steadfast" width={40} height={40} className="w-10 h-10 object-contain" />
            <div>
              <h1 className="text-white font-bold text-lg">STEADFAST</h1>
              <p className="text-gray-400 text-xs">Admin Panel</p>
            </div>
          </div>
          {showEnvironmentDebug && (
            <div className="mt-3 rounded-lg border border-cyan-400/40 bg-cyan-500/10 p-2 text-[10px] leading-4 text-cyan-100 break-all">
              <p><strong>Project:</strong> {runtimeEnvDebug.projectRef}</p>
              <p><strong>Function:</strong> {runtimeEnvDebug.functionName}</p>
              <p><strong>API:</strong> {runtimeEnvDebug.apiBaseUrl}</p>
            </div>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto p-4" aria-label="Admin navigation" onKeyDown={(e) => {
          if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
          e.preventDefault();
          const idx = menuItems.findIndex(m => m.id === activeMenu);
          const next = e.key === 'ArrowDown'
            ? Math.min(idx + 1, menuItems.length - 1)
            : Math.max(idx - 1, 0);
          if (next !== idx) {
            setActiveMenu(menuItems[next].id);
            const btns = e.currentTarget.querySelectorAll<HTMLElement>('button');
            btns[next]?.focus();
          }
        }}>
          <div className="space-y-1" role="menubar" aria-orientation="vertical">
            {menuItems.map((item) => (
              <button
                key={item.id}
                role="menuitem"
                tabIndex={activeMenu === item.id ? 0 : -1}
                onClick={() => setActiveMenu(item.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  activeMenu === item.id
                    ? 'bg-[#00D9FF] text-[#1a1f2e]'
                    : 'text-gray-300 hover:bg-[#1a1f2e] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    activeMenu === item.id
                      ? 'bg-[#1a1f2e] text-white'
                      : 'bg-red-500 text-white'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </nav>

        {/* Admin Profile */}
        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#00D9FF] flex items-center justify-center">
              <Shield className="text-[#1a1f2e]" size={20} />
            </div>
            <div className="flex-1">
              <p className="text-white text-sm font-semibold">Admin User</p>
              <p className="text-gray-400 text-xs">admin@steadfast.com</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/logout')}
            className="mt-3 w-full flex items-center justify-center gap-2 bg-[#1a1f2e] hover:bg-[#303a53] text-gray-200 hover:text-white py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main ref={mainScrollRef} className="flex-1 overflow-auto admin-scroll">
        <div className="p-8">
          {renderContent()}
        </div>
        <ScrollToTop scrollRef={mainScrollRef} />
      </main>

      {/* Modals — lazy-loaded, only fetched when a modal is triggered */}
      {modalType && (
        <Suspense fallback={null}>
          <AdminModals
        modalType={modalType}
        selectedItem={selectedItem}
        setModalType={setModalType}
        vipConfigurations={vipConfigurations}
        roleDefinitions={roleDefinitions}
        adminUsers={adminUsers}
        adminUsersLoading={adminUsersLoading}
        rewardsConfig={rewardsConfig}
        platformUsers={platformUsers}
        taskConfigurations={taskConfigurations}
        transactions={transactions}
        withdrawalRequests={withdrawalRequests}
        selectedUserAudit={selectedUserAudit}
        selectedUserAuditLoading={selectedUserAuditLoading}
        userTaskControlDraft={userTaskControlDraft}
        userTaskControlSaving={userTaskControlSaving}
        userBalanceAdjustmentDraft={userBalanceAdjustmentDraft}
        userBalanceAdjustmentSaving={userBalanceAdjustmentSaving}
        userVipLevelDraft={userVipLevelDraft}
        userVipLevelSaving={userVipLevelSaving}
        setUserTaskControlDraft={setUserTaskControlDraft}
        setUserBalanceAdjustmentDraft={setUserBalanceAdjustmentDraft}
        setUserVipLevelDraft={setUserVipLevelDraft}
        premiumReconcileSaving={premiumReconcileSaving}
        premiumReconcileAllSaving={premiumReconcileAllSaving}
        deletePlatformUserConfirmation={deletePlatformUserConfirmation}
        deletingPlatformUser={deletingPlatformUser}
        setDeletePlatformUserConfirmation={setDeletePlatformUserConfirmation}
        approveWithdrawalTxHash={approveWithdrawalTxHash}
        rejectWithdrawalReason={rejectWithdrawalReason}
        processingWithdrawal={processingWithdrawal}
        setApproveWithdrawalTxHash={setApproveWithdrawalTxHash}
        setRejectWithdrawalReason={setRejectWithdrawalReason}
        newAdminInvitationCode={newAdminInvitationCode}
        aiGenerateVipLevels={aiGenerateVipLevels}
        aiGenerateCount={aiGenerateCount}
        aiGenerateCategories={aiGenerateCategories}
        aiGenerating={aiGenerating}
        aiPreviewItems={aiPreviewItems}
        setAiGenerateVipLevels={setAiGenerateVipLevels}
        setAiGenerateCount={setAiGenerateCount}
        setAiGenerateCategories={setAiGenerateCategories}
        setAiPreviewItems={setAiPreviewItems}
        salaryPayments={salaryPayments}
        selectedBulkOption={selectedBulkOption}
        setSelectedBulkOption={setSelectedBulkOption}
        processBulkSalaryPayments={processBulkSalaryPayments}
        processSingleSalaryPayment={processSingleSalaryPayment}
        handleCreateManualProduct={handleCreateManualProduct}
        handleCreateTask={handleCreateTask}
        handleCreateAdminUser={handleCreateAdminUser}
        handleSaveUserTaskControls={handleSaveUserTaskControls}
        handleResetUserTaskSet={handleResetUserTaskSet}
        handleRestorePlatformUser={handleRestorePlatformUser}
        handleTogglePlatformUserSuspension={handleTogglePlatformUserSuspension}
        handleRecalculateFinancialState={handleRecalculateFinancialState}
        handleReconcilePremiumSettlements={handleReconcilePremiumSettlements}
        handleAdjustPlatformUserBalance={handleAdjustPlatformUserBalance}
        handleAssignAdmin={handleAssignAdmin}
        handleSaveUserVipLevel={handleSaveUserVipLevel}
        handleDeletePlatformUser={handleDeletePlatformUser}
        handleSaveWorkdayReward={handleSaveWorkdayReward}
        handleSaveResetReward={handleSaveResetReward}
        handleSaveAccumulatedReward={handleSaveAccumulatedReward}
        handleSaveProductSystemConfig={handleSaveProductSystemConfig}
        handleGenerateProducts={handleGenerateProducts}
        handleConfirmGenerateProducts={handleConfirmGenerateProducts}
        handleBulkImportProducts={handleBulkImportProducts}
        handleSaveProductEdit={handleSaveProductEdit}
        handleDeleteSelectedProduct={handleDeleteSelectedProduct}
        handleUpdateAdminDetails={handleUpdateAdminDetails}
        handleDeleteAdminUser={handleDeleteAdminUser}
        handleCreateRole={handleCreateRole}
        handleUpdateRole={handleUpdateRole}
        handleDeleteRole={handleDeleteRole}
        processWithdrawalReview={processWithdrawalReview}
        buildRolePermissionsFromForm={buildRolePermissionsFromForm}
        addUserDraft={addUserDraft}
        setAddUserDraft={setAddUserDraft}
        addUserSaving={addUserSaving}
        handleCreatePlatformUser={handleCreatePlatformUser}
        currentAdminInvitationCode={currentAdminInvitationCode}
        handleSendNotification={handleSendNotification}
        notificationSending={notificationSending}
      />
        </Suspense>
      )}

      {/* Prompt-replacement modals */}
      {credentialResetTarget && (
        <ResetCredentialsModal
          username={credentialResetTarget.username}
          onConfirm={handleConfirmResetCredentials}
          onClose={() => setCredentialResetTarget(null)}
        />
      )}
      {creditScoreTarget && (
        <CreditScoreModal
          username={creditScoreTarget.username}
          currentScore={typeof (creditScoreTarget as any).creditScore === 'number' ? (creditScoreTarget as any).creditScore : 100}
          onConfirm={handleConfirmCreditScore}
          onClose={() => setCreditScoreTarget(null)}
        />
      )}

      {/* Restore Preview Modal */}
      {pendingRestorePoint && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#252b3d] border border-gray-700 rounded-lg max-w-lg w-full p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="text-white text-xl font-bold">Restore Backup Point</h3>
                <p className="text-gray-400 text-sm mt-1">Review this snapshot before applying restore.</p>
              </div>
              <button onClick={cancelRestoreSalaryPoint} className="text-gray-400 hover:text-white" aria-label="Close restore dialog">
                <X size={22} />
              </button>
            </div>

            <div className="bg-[#1a1f2e] border border-gray-700 rounded-lg p-4 space-y-2">
              <p className="text-white text-sm font-semibold">{pendingRestorePoint.label}</p>
              <p className="text-gray-400 text-xs">Created: {new Date(pendingRestorePoint.createdAt).toLocaleString()}</p>
              <p className="text-gray-300 text-sm">Payments in snapshot: <span className="text-white font-semibold">{pendingRestorePoint.payments.length}</span></p>
              <p className="text-gray-300 text-sm">Pending: <span className="text-yellow-300 font-semibold">{pendingRestorePoint.payments.filter((payment) => payment.status === 'Pending').length}</span> | Paid: <span className="text-green-300 font-semibold">{pendingRestorePoint.payments.filter((payment) => payment.status === 'Paid').length}</span></p>
            </div>

            {pendingRestoreDiff && (
              <div className="bg-[#1a1f2e] border border-gray-700 rounded-lg p-4 mt-4 space-y-2">
                <p className="text-white text-sm font-semibold">Restore impact preview</p>
                <p className="text-gray-300 text-sm">Changed rows: <span className="text-[#00D9FF] font-semibold">{pendingRestoreDiff.changedRows}</span> | Added: <span className="text-blue-300 font-semibold">{pendingRestoreDiff.added}</span> | Removed: <span className="text-red-300 font-semibold">{pendingRestoreDiff.removed}</span></p>
                <p className="text-gray-300 text-sm">Status changes: <span className="text-yellow-300 font-semibold">{pendingRestoreDiff.changedStatus}</span> | Amount changes: <span className="text-green-300 font-semibold">{pendingRestoreDiff.changedAmount}</span></p>
                <p className="text-gray-300 text-sm">Mode/Dates changed: <span className="text-purple-300 font-semibold">{pendingRestoreDiff.changedMode + pendingRestoreDiff.changedDueDate + pendingRestoreDiff.changedPaidDate}</span></p>
                <p className="text-gray-300 text-sm">Pending delta: <span className="font-semibold">{pendingRestoreDiff.pendingDelta >= 0 ? `+${pendingRestoreDiff.pendingDelta}` : pendingRestoreDiff.pendingDelta}</span> | Paid delta: <span className="font-semibold">{pendingRestoreDiff.paidDelta >= 0 ? `+${pendingRestoreDiff.paidDelta}` : pendingRestoreDiff.paidDelta}</span> | Total amount delta: <span className="font-semibold">{pendingRestoreDiff.totalDelta >= 0 ? `+$${pendingRestoreDiff.totalDelta.toFixed(2)}` : `-$${Math.abs(pendingRestoreDiff.totalDelta).toFixed(2)}`}</span></p>
                {pendingRestoreDiff.sampleChanges.length > 0 && (
                  <div className="pt-1">
                    {pendingRestoreDiff.sampleChanges.map((line) => (
                      <p key={line} className="text-gray-400 text-xs">{line}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button onClick={cancelRestoreSalaryPoint} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2.5 rounded-lg transition-colors">
                Cancel
              </button>
              <button onClick={confirmRestoreSalaryPoint} className="flex-1 bg-[#00D9FF] hover:bg-[#00c5e6] text-[#1a1f2e] font-bold py-2.5 rounded-lg transition-colors">
                Confirm Restore
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reconciliation Report Modal */}
      {reconcileReport && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1e2536] border border-emerald-500/30 rounded-xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle size={20} className="text-emerald-400" />
                <h3 className="text-lg font-bold text-white">Reconciliation Report</h3>
              </div>
              <button onClick={() => setReconcileReport(null)} className="text-gray-400 hover:text-white" aria-label="Close report">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              Target: <span className="text-white font-medium">{reconcileReport.target}</span>
            </p>
            <div className="space-y-1">
              <div className="flex justify-between items-center py-2 border-b border-white/10">
                <span className="text-sm text-gray-300">Accounts Processed</span>
                <span className="text-sm font-bold text-white">{reconcileReport.processed}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/10">
                <span className="text-sm text-gray-300">Accounts Changed</span>
                <span className="text-sm font-bold text-emerald-400">{reconcileReport.changed}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/10">
                <span className="text-sm text-gray-300">No Change Needed</span>
                <span className="text-sm font-bold text-gray-400">{Math.max(0, reconcileReport.processed - reconcileReport.changed)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/10">
                <span className="text-sm text-gray-300">Settlement Backfills</span>
                <span className="text-sm font-bold text-blue-300">{reconcileReport.settlementFixes}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm font-semibold text-gray-200">Total Amount Released</span>
                <span className="text-base font-extrabold text-emerald-300">${reconcileReport.amount.toFixed(2)}</span>
              </div>
            </div>
            <button
              onClick={() => setReconcileReport(null)}
              className="mt-5 w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 rounded-lg transition-colors text-sm"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}





