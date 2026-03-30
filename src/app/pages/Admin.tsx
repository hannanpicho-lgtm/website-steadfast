import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router';
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
  Search,
  Filter,
  Download,
  Plus,
  Edit,
  Trash2,
  Eye,
  MoreVertical,
  X,
  Check,
  XCircle,
  Calendar,
  TrendingUp,
  Percent,
  Target,
  Clock,
  TrendingDown,
  Wallet,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  BarChart3,
  Image,
  Sparkles,
  Upload,
  Package,
  Tag,
  Link as LinkIcon,
  Gift,
  Award,
  Zap,
  Send,
  RefreshCw,
  Settings2,
  Coins,
  UserCog,
  Lock,
  Key,
  ShieldCheck,
  LogOut,
  Calculator,
  AlertTriangle,
  Info,
  MessageSquare,
  Copy,
  CheckCircle
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
import { projectId } from '@utils/supabase/info';
import {
  AUTO_BACKUP_INTERVAL_MS,
  MAX_AUDIT_EVENTS,
  MAX_RESTORE_POINTS,
  buildBackupExport,
  createAuditEvent,
  createAutoBackupPoint as buildAutoBackupPoint,
  createRecoveryPoint,
  createSalaryRestorePoint as createSalaryRestorePointRecord,
  fetchAdminSalaryAuditLogFromServer,
  fetchAdminSalaryProjectState,
  parseBackupImport,
  pruneExpiredRestorePoints,
  saveAdminSalaryAuditLogToServer,
  saveAdminSalaryProjectState,
  type StorageSaveResult,
  type RewardTab,
  type SalaryAuditEvent,
  type SalaryPayment,
  type SalaryRestorePoint,
} from '../services/adminSalaryBackup';

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

function AdminPanelFallback({ label }: { label: string }) {
  return (
    <div className="bg-[#252b3d] border border-gray-700 rounded-lg p-8 text-center text-gray-400">
      {label}
    </div>
  );
}

// VIP Configuration
const defaultVipConfigurations: VipConfig[] = [
  { level: 1, name: 'VIP 1', investment: 100, dailyTasks: 40, commission: 0.005, color: 'bronze' },
  { level: 2, name: 'VIP 2', investment: 500, dailyTasks: 45, commission: 0.010, color: 'silver' },
  { level: 3, name: 'VIP 3', investment: 1600, dailyTasks: 50, commission: 0.015, color: 'gold' },
  { level: 4, name: 'VIP 4', investment: 5500, dailyTasks: 55, commission: 0.020, color: 'platinum' },
  { level: 5, name: 'VIP 5', investment: 10000, dailyTasks: 60, commission: 0.025, color: 'diamond' },
];

type VipLevelConfig = VipConfig;
type VipDraftState = {
  investment: string;
  dailyTasks: string;
  commissionPercent: string;
  taskPriceMin: string;
  taskPriceMax: string;
};

type TaskConfig = {
  id: string;
  merchant: string;
  product: string;
  price: number;
  commission: number;
  status: 'Active' | 'Paused';
  assignedUsers: number;
  completedToday: number;
  image: string;
  rating: number;
  productUrl: string;
  category?: string;
  vipTier?: number;
  source?: string;
  createdAt?: string;
  updatedAt?: string;
};

type TaskDraftState = {
  product: string;
  merchant: string;
  price: string;
  commissionPercent: string;
  status: string;
  image: string;
  rating: string;
  productUrl: string;
};

const initialProductCatalog: any[] = [];

// Salary Payment System
const initialSalaryPayments: SalaryPayment[] = [
  { id: 1, username: 'user001', daysWorked: 15, salaryDue: 3060, status: 'Pending', dueDate: '2024-03-10', paymentMode: 'Automatic' },
  { id: 2, username: 'user002', daysWorked: 22, salaryDue: 4488, status: 'Paid', dueDate: '2024-03-09', paidDate: '2024-03-09', paymentMode: 'Automatic' },
  { id: 3, username: 'user003', daysWorked: 30, salaryDue: 6120, status: 'Pending', dueDate: '2024-03-10', paymentMode: 'Manual' },
  { id: 4, username: 'user004', daysWorked: 7, salaryDue: 1428, status: 'Pending', dueDate: '2024-03-11', paymentMode: 'Automatic' },
  { id: 5, username: 'user005', daysWorked: 1, salaryDue: 204, status: 'Paid', dueDate: '2024-03-08', paidDate: '2024-03-08', paymentMode: 'Automatic' },
];

// Admin Roles with Permissions
const initialAdminRoles = [
  { id: 1, name: 'Super Admin', description: 'Full system access with all permissions', color: 'red', permissions: { dashboard: true, financials: true, rewardsSystem: true, productManagement: true, userManagement: true, transactions: true, taskManagement: true, vipConfig: true, withdrawals: true, deposits: true, notifications: true, settings: true, adminUsers: true, deleteUsers: true, editRoles: true, processPayments: true, viewReports: true }, createdDate: '2024-01-01', isDefault: true },
  { id: 2, name: 'Finance Manager', description: 'Manage financial operations, withdrawals, and deposits', color: 'green', permissions: { dashboard: true, financials: true, rewardsSystem: true, productManagement: false, userManagement: true, transactions: true, taskManagement: false, vipConfig: false, withdrawals: true, deposits: true, notifications: true, settings: false, adminUsers: false, deleteUsers: false, editRoles: false, processPayments: true, viewReports: true }, createdDate: '2024-01-15', isDefault: false },
  { id: 3, name: 'Product Manager', description: 'Manage products, tasks, and user submissions', color: 'blue', permissions: { dashboard: true, financials: false, rewardsSystem: false, productManagement: true, userManagement: true, transactions: false, taskManagement: true, vipConfig: false, withdrawals: false, deposits: false, notifications: true, settings: false, adminUsers: false, deleteUsers: false, editRoles: false, processPayments: false, viewReports: true }, createdDate: '2024-02-01', isDefault: false },
  { id: 4, name: 'Support Agent', description: 'Handle user support and basic operations', color: 'purple', permissions: { dashboard: true, financials: false, rewardsSystem: false, productManagement: false, userManagement: true, transactions: true, taskManagement: false, vipConfig: false, withdrawals: false, deposits: false, notifications: true, settings: false, adminUsers: false, deleteUsers: false, editRoles: false, processPayments: false, viewReports: false }, createdDate: '2024-02-10', isDefault: false },
  { id: 5, name: 'Content Moderator', description: 'Monitor and moderate platform content', color: 'yellow', permissions: { dashboard: true, financials: false, rewardsSystem: false, productManagement: true, userManagement: true, transactions: false, taskManagement: true, vipConfig: false, withdrawals: false, deposits: false, notifications: true, settings: false, adminUsers: false, deleteUsers: false, editRoles: false, processPayments: false, viewReports: false }, createdDate: '2024-02-20', isDefault: false },
  { id: 6, name: 'Admin', description: 'General admin access for user and operations management', color: 'cyan', permissions: { dashboard: true, financials: true, rewardsSystem: true, productManagement: true, userManagement: true, transactions: true, taskManagement: true, vipConfig: false, withdrawals: true, deposits: true, notifications: true, settings: false, adminUsers: true, deleteUsers: false, editRoles: false, processPayments: true, viewReports: true }, createdDate: '2024-03-17', isDefault: false }
];

type AdminUserRecord = {
  id: string | number;
  username: string;
  email: string;
  fullName: string;
  roleId: number;
  roleName: string;
  roleColor: string;
  status: string;
  lastLogin: string;
  createdDate: string;
  phone: string;
  department: string;
  avatar: string;
  twoFactorEnabled: boolean;
  loginAttempts: number;
};

type ReferralOverviewRow = {
  username: string;
  invitationCode: string | null;
  invitedByCode: string | null;
  parentUsername: string | null;
  referralEarnings: number;
  childrenCount: number;
  children: string[];
  balance: number;
};

type ReferralOverviewEvent = {
  parentUsername: string | null;
  childUsername: string | null;
  type: string;
  childCommission: number;
  parentReward: number;
  rate: number;
  createdAt: string;
};

type ReferralOverviewSummary = {
  totalReferralUsers: number;
  totalReferralEarnings: number;
  totalParentRewards: number;
  referralRate: number;
};

type PlatformUser = {
  username: string;
  vipLevel: number;
  manualVipLevel?: number | null;
  balance: number;
  phone?: string;
  tasksCompleted: number;
  tasksLimit: number;
  taskSetCount: number;
  tasksPerSet: number;
  tasksCompletedInSet: number;
  completedTaskSets: number;
  pendingTaskReset: boolean;
  holdAmount: number;
  availableAmount?: number;
  isFrozen: boolean;
  isSuspended?: boolean;
  walletProfile?: any;
  invitationCode?: string | null;
  lastLoginAt?: string | null;
  lastLoginIp?: string | null;
  lastLoginLocation?: string | null;
  lastActivityAt?: string | null;
  lastActivityIp?: string | null;
  lastActivityLocation?: string | null;
  referredByAdminId: string | null;
  referredByAdminName: string;
  createdAt: string | null;
};


type PlatformUserAudit = {
  username: string;
  phone: string;
  gender: string;
  invitationCode: string | null;
  invitedByCode: string | null;
  referredByAdminId: string | null;
  walletProfile: any;
  accountStatus: {
    isFrozen: boolean;
    isSuspended?: boolean;
    pendingTaskReset: boolean;
    activePremiumStatus: string | null;
  };
  financialCard: {
    vipLevel: number;
    balance: number;
    holdAmount: number;
    availableAmount: number;
    totalBalance: number;
    todayCommission: number;
    luckyBonus: number;
    creditScore: number;
  };
  taskProgress: {
    tasksCompleted?: number;
    tasksLimit?: number;
    taskSetCount?: number;
    tasksPerSet?: number;
    tasksCompletedInSet?: number;
    completedTaskSets?: number;
  };
  activePremium: any;
  premiumQueue: any[];
  audit: {
    registeredAt: string | null;
    lastLoginAt: string | null;
    lastLoginIp: string | null;
    lastLoginLocation: string | null;
    lastActivityAt: string | null;
    lastActivityIp: string | null;
    lastActivityLocation: string | null;
    lastDepositAt: string | null;
    lastWithdrawalAt: string | null;
  };
  deposits: any[];
  withdrawals: any[];
  transactions: any[];
};
type UserTaskControlDraft = {
  taskSetCount: string;
};

type UserBalanceAdjustmentDraft = {
  mode: 'credit' | 'debit';
  amount: string;
  reason: string;
  isBonus: boolean;
  bonusLabel: string;
  bonusAssignmentMode: 'automatic' | 'semi-automatic' | 'manual';
};

type UserVipLevelDraft = {
  vipLevel: string;
  reason: string;
};

type TransactionRecord = {
  id: string;
  username: string;
  type: 'Deposit' | 'Withdrawal' | 'Commission';
  amount: number;
  status: 'Pending' | 'Completed' | 'Rejected' | 'Failed';
  date: string;
  txHash: string;
  method: string;
  source: string;
  description: string;
  referenceId: string;
};

type WithdrawalRequestRecord = {
  id: string;
  username: string;
  amount: number;
  walletAddress: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  requestedDate: string;
  method: string;
  transactionId: string;
  reviewedAt: string | null;
  txHash: string;
  rejectionReason: string;
  reviewerId: string | null;
  reviewerEmail: string | null;
};

type MenuItem = {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
};

function formatRelativeTime(timestamp: string): string {
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) {
    return 'just now';
  }

  const diffInSeconds = Math.round((parsed.getTime() - Date.now()) / 1000);
  const absSeconds = Math.abs(diffInSeconds);
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  const units: Array<{ unit: Intl.RelativeTimeFormatUnit; seconds: number }> = [
    { unit: 'year', seconds: 31_536_000 },
    { unit: 'month', seconds: 2_592_000 },
    { unit: 'week', seconds: 604_800 },
    { unit: 'day', seconds: 86_400 },
    { unit: 'hour', seconds: 3_600 },
    { unit: 'minute', seconds: 60 },
  ];

  for (const { unit, seconds } of units) {
    if (absSeconds >= seconds) {
      return formatter.format(Math.round(diffInSeconds / seconds), unit);
    }
  }

  return formatter.format(diffInSeconds, 'second');
}
type ModalType = 'add-user' | 'edit-user' | 'view-user' | 'delete-user' | 'adjust-user-balance' | 'view-transaction' | 'approve-withdrawal' | 'reject-withdrawal' | 'add-task' | 'edit-vip' | 'notification' | 'add-product-manual' | 'add-product-ai' | 'edit-product' | 'view-product' | 'delete-product' | 'bulk-generate-products' | 'bulk-import-products' | 'edit-workday-reward' | 'edit-reset-reward' | 'edit-accumulated-reward' | 'edit-product-system' | 'pay-salary' | 'pay-salary-bulk' | 'add-admin' | 'edit-admin' | 'view-admin' | 'delete-admin' | 'admin-invitation-code' | 'add-role' | 'edit-role' | 'view-role-permissions' | 'delete-role' | null;

export default function Admin() {
  const navigate = useNavigate();
  const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a1c55d7e`;
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
  const [activeRewardTab, setActiveRewardTab] = useState<RewardTab>('workday');
  const [salaryPayments, setSalaryPayments] = useState<SalaryPayment[]>(initialSalaryPayments);
  const [salaryRestorePoints, setSalaryRestorePoints] = useState<SalaryRestorePoint[]>([]);
  const [selectedBulkOption, setSelectedBulkOption] = useState<'all' | 'auto' | 'manual'>('all');
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(true);
  const [autoBackupIntervalMinutes, setAutoBackupIntervalMinutes] = useState(1);
  const [backupRetentionDays, setBackupRetentionDays] = useState(30);
  const [autoSavedAt, setAutoSavedAt] = useState<string | null>(null);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const [isSalaryStateHydrated, setIsSalaryStateHydrated] = useState(false);
  const [pendingRestorePointId, setPendingRestorePointId] = useState<number | null>(null);
  const [salaryAuditLog, setSalaryAuditLog] = useState<SalaryAuditEvent[]>([]);
  const [auditSearchTerm, setAuditSearchTerm] = useState('');
  const [auditFilterAction, setAuditFilterAction] = useState<'all' | SalaryAuditEvent['action']>('all');
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
  const salaryPaymentsRef = useRef<SalaryPayment[]>(initialSalaryPayments);
  const [syncingAllUsersVip, setSyncingAllUsersVip] = useState(false);
  const lastAutoBackupSignatureRef = useRef<string>('');
  const lastStorageErrorRef = useRef<string | null>(null);
  const adminAuthRedirectedRef = useRef(false);
  const userScopeFallbackNoticeShownRef = useRef(false);
  const importBackupInputRef = useRef<HTMLInputElement | null>(null);

  // Bulk product generation state
  const [aiGenerateVipLevels, setAiGenerateVipLevels] = useState<number[]>([1, 2, 3, 4, 5]);
  const [aiGenerateCount, setAiGenerateCount] = useState(5);
  const [aiGenerateCategories, setAiGenerateCategories] = useState<string[]>([]);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiPreviewItems, setAiPreviewItems] = useState<Array<{ id: string; product: string; merchant: string; price: number; commission: number; vipTier: number; category: string }> | null>(null);

  // CSV/JSON import file ref
  const productImportInputRef = useRef<HTMLInputElement | null>(null);



  const handleStorageSaveResult = (result: StorageSaveResult) => {
    if (result.ok) {
      setStorageWarning(null);
      lastStorageErrorRef.current = null;
      return;
    }

    const message = result.message ?? 'Unable to save backup data to browser storage.';
    const normalized = message.trim().toLowerCase();
    const isSuperAdminScopeMessage = normalized.includes('super-admin access required')
      || normalized.includes('forbidden');

    // Limited admins should not see global toast noise from super-admin-only salary sync endpoints.
    if (!isSuperAdmin && isSuperAdminScopeMessage) {
      setStorageWarning(null);
      lastStorageErrorRef.current = null;
      return;
    }

    setStorageWarning(message);
    if (lastStorageErrorRef.current !== message) {
      toast.error(message);
      lastStorageErrorRef.current = message;
    }
  };

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
      taskSetCount: String(selectedItem.taskSetCount ?? 1),
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
        await loadPlatformUsers();
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

    const taskSetCount = Math.max(1, Number.parseInt(userTaskControlDraft.taskSetCount, 10) || 1);
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
    try {
      const nextLoginPassword = window.prompt(`Set NEW login password for ${user.username} (min 6 chars):`, '');
      if (!nextLoginPassword) {
        return;
      }

      const nextTransactionPassword = window.prompt(`Set NEW transaction password for ${user.username} (min 6 chars):`, '');
      if (!nextTransactionPassword) {
        return;
      }

      if (nextLoginPassword.length < 6 || nextTransactionPassword.length < 6) {
        toast.error('Both passwords must be at least 6 characters.');
        return;
      }

      const headers = await buildAdminAuthHeaders();
      const response = await fetch(`${serverUrl}/admin/platform-users/${encodeURIComponent(user.username)}/reset-credentials`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          loginPassword: nextLoginPassword,
          transactionPassword: nextTransactionPassword,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? `Failed to reset credentials (${response.status})`);
      }

      toast.success(`Credentials set by admin for ${user.username}. User must change password at next login.`);
    } catch (error) {
      handleAdminRequestError(error, `Failed to reset credentials for ${user.username}`);
    }
  };

  const handleSetCreditScore = async (user: PlatformUser) => {
    const rawInput = window.prompt(
      `Set credit score for ${user.username} (0–100, current: ${typeof (user as any).creditScore === 'number' ? (user as any).creditScore : 100}):`,
      String(typeof (user as any).creditScore === 'number' ? (user as any).creditScore : 100),
    );
    if (rawInput === null) return;
    const newScore = Number(rawInput);
    if (!Number.isFinite(newScore) || newScore < 0 || newScore > 100) {
      toast.error('Credit score must be a number between 0 and 100.');
      return;
    }
    try {
      const headers = await buildAdminAuthHeaders();
      const response = await fetch(`${serverUrl}/admin/platform-users/${encodeURIComponent(user.username)}/credit-score`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ creditScore: Math.round(newScore) }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? `Failed to set credit score (${response.status})`);
      }
      toast.success(`Credit score set to ${Math.round(newScore)} for ${user.username}.`);
      if (payload?.user) {
        mergePlatformUser(payload.user as PlatformUser);
      } else {
        void loadPlatformUsers();
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
        void loadPlatformUsers();
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
      const response = await fetch(`${serverUrl}/admin/platform-users/reconcile-premium-settlements`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          username: params?.username,
          dryRun: params?.dryRun ?? false,
          reconcileTodayCommission: false,
          maxUsers: params?.maxUsers,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? `Failed to reconcile premium settlements (${response.status})`);
      }

      await loadPlatformUsers();

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
        await loadPlatformUsers();
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
        await loadPlatformUsers();
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
      await loadPlatformUsers();
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

    if (!product || !merchant) {
      toast.error('Product and merchant are required.');
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
          image: taskDraft.image.trim(),
          rating: Number.isFinite(rating) && rating > 0 ? rating : 4,
          productUrl: taskDraft.productUrl.trim(),
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
        const { data: userData } = await supabase.auth.getUser();

        const user = userData?.user;
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
        console.log('🔐 Admin roles detected:', { hasSuperAdmin, roles: Array.from(roles) });
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

  const loadPlatformUsers = async () => {
    setPlatformUsersLoaded(false);
    setPlatformUsersLoading(true);
    try {
      const headers = await buildAdminAuthHeaders(false);
      const res = await fetch(`${serverUrl}/admin/platform-users`, { headers });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error ?? `Failed to load platform users (${res.status})`);
      setPlatformUsers(Array.isArray(payload?.users) ? payload.users : []);
      if (payload?.scopeFallbackApplied && !userScopeFallbackNoticeShownRef.current) {
        toast.info('Ownership scope fallback applied to restore legacy users visibility.');
        userScopeFallbackNoticeShownRef.current = true;
      }
    } catch (error) {
      handleAdminRequestError(error, 'Failed to load platform users', { suppressToast: true });
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
    const imageUrl = String(formData.get('image') ?? '').trim();
    const priceRaw = String(formData.get('price') ?? '').trim();
    const price = Number(priceRaw);
    const status = String(formData.get('status') ?? 'Active').trim();

    console.log('[DEBUG] Form submission:', { product, imageUrl, price, status });

    if (!product) {
      toast.error('Product name is required.');
      return;
    }
    if (!imageUrl) {
      toast.error('Image URL is required.');
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
          price,
          status,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? `Failed to create task (${response.status})`);
      }

      console.log('[DEBUG] Product created successfully:', payload);
      
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
      console.error('[DEBUG] Error creating task:', error);
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

      await loadPlatformUsers();
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
      console.error('[DEBUG] Error deleting product:', error);
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
    const imageUrl = String(formData.get('image') ?? '').trim();
    const priceRaw = String(formData.get('price') ?? '').trim();
    const price = Number(priceRaw);
    const status = String(formData.get('status') ?? 'Active').trim();

    if (!product) {
      toast.error('Product name is required.');
      return;
    }
    if (!imageUrl) {
      toast.error('Image URL is required.');
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
      console.error('[DEBUG] Error updating product:', error);
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

      await Promise.all([loadFinanceData(), loadPlatformUsers()]);
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
    salaryPaymentsRef.current = initialSalaryPayments;
    lastAutoBackupSignatureRef.current = JSON.stringify(initialSalaryPayments);
    setIsSalaryStateHydrated(true);

    if (!isSuperAdmin) {
      return;
    }

    void (async () => {
      try {
        const headers = await buildAdminAuthHeaders();
        const remoteProject = await fetchAdminSalaryProjectState({
          serverUrl,
          headers,
          defaultPayments: initialSalaryPayments,
        });

        if (remoteProject) {
          setSalaryPayments(remoteProject.payments);
          setSalaryRestorePoints(remoteProject.points);
          setActiveRewardTab(remoteProject.activeRewardTab);
          setSelectedBulkOption(remoteProject.selectedBulkOption);
          setAutoBackupEnabled(remoteProject.autoBackupEnabled);
          setAutoBackupIntervalMinutes(remoteProject.autoBackupIntervalMinutes);
          setBackupRetentionDays(remoteProject.backupRetentionDays);
          salaryPaymentsRef.current = remoteProject.payments;
          lastAutoBackupSignatureRef.current = JSON.stringify(remoteProject.payments);
        }

        const remoteAuditLog = await fetchAdminSalaryAuditLogFromServer({ serverUrl, headers });
        if (remoteAuditLog) {
          setSalaryAuditLog(remoteAuditLog);
        }
      } catch (error) {
        handleAdminRequestError(error, 'Failed to sync salary state from server', {
          suppressToast: true,
          onMessage: setStorageWarning,
        });
      }
    })();
  }, [isSuperAdmin]);

  useEffect(() => {
    salaryPaymentsRef.current = salaryPayments;
  }, [salaryPayments]);

  useEffect(() => {
    if (!isSalaryStateHydrated || !isSuperAdmin) {
      return;
    }

    void (async () => {
      try {
        const headers = await buildAdminAuthHeaders();
        const saveResult = await saveAdminSalaryProjectState({
          serverUrl,
          headers,
          payload: {
            activeRewardTab,
            selectedBulkOption,
            autoBackupEnabled,
            autoBackupIntervalMinutes,
            backupRetentionDays,
            payments: salaryPayments,
            points: pruneExpiredRestorePoints(salaryRestorePoints, backupRetentionDays),
          },
        });
        handleStorageSaveResult(saveResult);
      } catch (error) {
        handleAdminRequestError(error, 'Failed to sync salary project state', {
          suppressToast: true,
          onMessage: setStorageWarning,
        });
      }
    })();

    setAutoSavedAt(new Date().toISOString());
  }, [
    isSalaryStateHydrated,
    isSuperAdmin,
    activeRewardTab,
    selectedBulkOption,
    autoBackupEnabled,
    autoBackupIntervalMinutes,
    backupRetentionDays,
    salaryPayments,
    salaryRestorePoints,
  ]);

  useEffect(() => {
    setSalaryRestorePoints((prev) => pruneExpiredRestorePoints(prev, backupRetentionDays).slice(0, MAX_RESTORE_POINTS));
  }, [backupRetentionDays]);

  useEffect(() => {
    setProductPage(1);
    setUserPage(1);
  }, [activeMenu, searchTerm, filterStatus]);

  useEffect(() => {
    if (!isSalaryStateHydrated || !isSuperAdmin) {
      return;
    }

    void (async () => {
      try {
        const headers = await buildAdminAuthHeaders();
        const saveResult = await saveAdminSalaryAuditLogToServer({
          serverUrl,
          headers,
          events: salaryAuditLog,
        });
        handleStorageSaveResult(saveResult);
      } catch (error) {
        handleAdminRequestError(error, 'Failed to sync salary audit log', {
          suppressToast: true,
          onMessage: setStorageWarning,
        });
      }
    })();
  }, [isSalaryStateHydrated, isSuperAdmin, salaryAuditLog]);

  const appendSalaryAudit = (event: SalaryAuditEvent) => {
    setSalaryAuditLog((prev) => [event, ...prev].slice(0, MAX_AUDIT_EVENTS));
  };

  const createAutoBackupPoint = (action: 'auto-backup' | 'manual-backup' = 'auto-backup') => {
    const result = buildAutoBackupPoint(salaryPaymentsRef.current, lastAutoBackupSignatureRef.current);
    if (!result.point) {
      return;
    }

    setSalaryRestorePoints((prev) => [result.point as SalaryRestorePoint, ...prev].slice(0, MAX_RESTORE_POINTS));
    lastAutoBackupSignatureRef.current = result.signature;
    appendSalaryAudit(createAuditEvent(action, `${result.point.label}`));
  };

  const handleAutoBackupEnabledChange = (enabled: boolean) => {
    setAutoBackupEnabled(enabled);
    appendSalaryAudit(createAuditEvent('settings-change', `Auto backup ${enabled ? 'enabled' : 'disabled'}`));
  };

  const handleAutoBackupIntervalChange = (minutes: number) => {
    setAutoBackupIntervalMinutes(minutes);
    appendSalaryAudit(createAuditEvent('settings-change', `Auto backup interval ${minutes} min`));
  };

  const handleBackupRetentionChange = (days: number) => {
    setBackupRetentionDays(days);
    appendSalaryAudit(createAuditEvent('settings-change', `Backup retention ${days} days`));
  };

  useEffect(() => {
    if (!isSalaryStateHydrated || !autoBackupEnabled) {
      return;
    }

    const intervalId = window.setInterval(() => {
      createAutoBackupPoint('auto-backup');
    }, autoBackupIntervalMinutes * AUTO_BACKUP_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [isSalaryStateHydrated, autoBackupEnabled, autoBackupIntervalMinutes]);

  const createSalaryRestorePoint = (label: string, paymentsSnapshot: SalaryPayment[] = salaryPayments) => {
    const point = createRecoveryPoint(label, paymentsSnapshot);

    setSalaryRestorePoints((prev) => [point, ...prev].slice(0, MAX_RESTORE_POINTS));
    lastAutoBackupSignatureRef.current = JSON.stringify(paymentsSnapshot);
  };

  const processSingleSalaryPayment = (paymentId: number) => {
    const target = salaryPayments.find((payment) => payment.id === paymentId);
    if (!target || target.status !== 'Pending') {
      toast.info('Selected salary is already processed.');
      setModalType(null);
      return;
    }

    createSalaryRestorePoint(`Single payment: ${target.username}`);

    const paidDate = new Date().toISOString().slice(0, 10);
    setSalaryPayments((prev) =>
      prev.map((payment) =>
        payment.id === paymentId
          ? { ...payment, status: 'Paid', paidDate }
          : payment
      )
    );

    toast.success(`Salary paid successfully for ${target.username}.`);
    appendSalaryAudit(createAuditEvent('single-payment', `${target.username} $${target.salaryDue}`));
    setModalType(null);
  };

  const processBulkSalaryPayments = (option: 'all' | 'auto' | 'manual') => {
    const pendingPayments = salaryPayments.filter((payment) => payment.status === 'Pending');
    let targetIds: number[] = [];

    if (option === 'all') {
      targetIds = pendingPayments.map((payment) => payment.id);
    }

    if (option === 'auto') {
      targetIds = pendingPayments
        .filter((payment) => payment.paymentMode === 'Automatic')
        .map((payment) => payment.id);
    }

    if (option === 'manual') {
      targetIds = pendingPayments
        .filter((payment) => payment.paymentMode === 'Manual')
        .map((payment) => payment.id);
    }

    if (targetIds.length === 0) {
      toast.info('No matching pending salaries for selected mode.');
      return;
    }

    createSalaryRestorePoint(`Bulk payment (${option})`);

    const paidDate = new Date().toISOString().slice(0, 10);
    setSalaryPayments((prev) =>
      prev.map((payment) =>
        targetIds.includes(payment.id)
          ? { ...payment, status: 'Paid', paidDate }
          : payment
      )
    );

    toast.success(`Processed ${targetIds.length} salary payment(s).`);
    appendSalaryAudit(createAuditEvent('bulk-payment', `${option} mode, ${targetIds.length} payments`));
    setSelectedBulkOption('all');
    setModalType(null);
  };

  const restoreLatestSalaryPoint = () => {
    if (salaryRestorePoints.length === 0) {
      toast.info('No restore points available.');
      return;
    }

    const latest = salaryRestorePoints[0];
    setPendingRestorePointId(latest.id);
  };

  const undoLastRestore = () => {
    const preRestorePoint = salaryRestorePoints.find((point) => point.label.startsWith('Pre-restore snapshot'));
    if (!preRestorePoint) {
      toast.info('No restore undo snapshot available.');
      return;
    }

    appendSalaryAudit(createAuditEvent('undo-restore', preRestorePoint.label));
    setPendingRestorePointId(preRestorePoint.id);
  };

  const requestRestoreSalaryPoint = (pointId: number) => {
    const point = salaryRestorePoints.find((item) => item.id === pointId);
    if (!point) {
      toast.info('Restore point not found.');
      return;
    }

    setPendingRestorePointId(pointId);
  };

  const confirmRestoreSalaryPoint = () => {
    if (!pendingRestorePointId) {
      return;
    }

    restoreSalaryPointById(pendingRestorePointId);
    setPendingRestorePointId(null);
  };

  const cancelRestoreSalaryPoint = () => {
    if (pendingRestorePointId) {
      const point = salaryRestorePoints.find((item) => item.id === pendingRestorePointId);
      appendSalaryAudit(createAuditEvent('restore-cancel', point ? point.label : 'Restore modal closed'));
    }
    setPendingRestorePointId(null);
  };

  const restoreSalaryPointById = (pointId: number) => {
    const point = salaryRestorePoints.find((item) => item.id === pointId);
    if (!point) {
      toast.info('Restore point not found.');
      return;
    }

    const preRestoreSnapshot = createRecoveryPoint(`Pre-restore snapshot (${point.label})`, salaryPayments);
    setSalaryPayments(point.payments.map((payment) => ({ ...payment })));
    setSalaryRestorePoints((prev) => [preRestoreSnapshot, ...prev.filter((item) => item.id !== pointId)].slice(0, MAX_RESTORE_POINTS));
    lastAutoBackupSignatureRef.current = JSON.stringify(point.payments);
    appendSalaryAudit(createAuditEvent('pre-restore-snapshot', preRestoreSnapshot.label));
    appendSalaryAudit(createAuditEvent('restore', point.label));
    toast.success(`Restored: ${point.label}`);
  };

  const deleteSalaryPointById = (pointId: number) => {
    const point = salaryRestorePoints.find((item) => item.id === pointId);
    setSalaryRestorePoints((prev) => prev.filter((item) => item.id !== pointId));
    appendSalaryAudit(createAuditEvent('delete-backup', point ? point.label : `${pointId}`));
    toast.success('Backup point removed.');
  };

  const clearAllBackupPoints = () => {
    if (salaryRestorePoints.length === 0) {
      toast.info('No backup points to clear.');
      return;
    }

    appendSalaryAudit(createAuditEvent('clear-backups', `${salaryRestorePoints.length} points`));
    setSalaryRestorePoints([]);
    toast.success('All backup points cleared.');
  };

  const exportBackupPoints = () => {
    const payload = buildBackupExport({
      activeRewardTab,
      selectedBulkOption,
      autoBackupEnabled,
      autoBackupIntervalMinutes,
      backupRetentionDays,
      points: pruneExpiredRestorePoints(salaryRestorePoints, backupRetentionDays),
    });

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `salary-backups-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
    anchor.click();
    URL.revokeObjectURL(url);

    appendSalaryAudit(createAuditEvent('export-backups', `${salaryRestorePoints.length} points`));
    toast.success('Backup points exported.');
  };

  const importBackupPoints = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result ?? '');
        const parsed = parseBackupImport(text);

        setSalaryRestorePoints((prev) => [...parsed.points, ...prev].slice(0, MAX_RESTORE_POINTS));
        if (parsed.activeRewardTab) {
          setActiveRewardTab(parsed.activeRewardTab);
        }
        if (parsed.selectedBulkOption) {
          setSelectedBulkOption(parsed.selectedBulkOption);
        }
        if (typeof parsed.autoBackupEnabled === 'boolean') {
          setAutoBackupEnabled(parsed.autoBackupEnabled);
        }
        if (typeof parsed.autoBackupIntervalMinutes === 'number') {
          setAutoBackupIntervalMinutes(parsed.autoBackupIntervalMinutes);
        }
        if (typeof parsed.backupRetentionDays === 'number') {
          setBackupRetentionDays(parsed.backupRetentionDays);
        }
        appendSalaryAudit(createAuditEvent('import-backups', `${parsed.points.length} points`));
        toast.success(`Imported ${parsed.points.length} backup point(s).`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Could not read backup file.');
      }
    };

    reader.readAsText(file);
    event.target.value = '';
  };

  const clearSalaryAuditLog = () => {
    if (salaryAuditLog.length === 0) {
      toast.info('No audit events to clear.');
      return;
    }

    setSalaryAuditLog([]);
    toast.success('Audit log cleared.');
  };

  const exportSalaryAuditLog = () => {
    if (salaryAuditLog.length === 0) {
      toast.info('No audit events to export.');
      return;
    }

    const payload = {
      exportedAt: new Date().toISOString(),
      total: salaryAuditLog.length,
      events: salaryAuditLog,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `salary-audit-log-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success('Audit log exported.');
  };

  const getAuditActionLabel = (action: SalaryAuditEvent['action']) => {
    return action.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const getAuditActionTone = (action: SalaryAuditEvent['action']) => {
    if (action === 'restore' || action === 'manual-backup' || action === 'auto-backup' || action === 'pre-restore-snapshot' || action === 'undo-restore' || action === 'import-backups' || action === 'single-payment' || action === 'bulk-payment') {
      return 'bg-green-500/20 text-green-300';
    }
    if (action === 'restore-cancel' || action === 'delete-backup' || action === 'clear-backups') {
      return 'bg-yellow-500/20 text-yellow-300';
    }
    return 'bg-blue-500/20 text-blue-300';
  };

  const filteredAuditLog = salaryAuditLog.filter((event) => {
    const matchesAction = auditFilterAction === 'all' || event.action === auditFilterAction;
    const query = auditSearchTerm.trim().toLowerCase();
    const matchesSearch = !query || event.detail.toLowerCase().includes(query) || event.action.toLowerCase().includes(query);
    return matchesAction && matchesSearch;
  });

  const renderModal = () => {
    if (!modalType) return null;

    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-[#252b3d] rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Add User Modal */}
          {modalType === 'add-user' && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white">Add New User</h3>
                <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>
              <form className="space-y-4" onSubmit={handleCreateManualProduct}>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Username</label>
                    <input type="text" className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" placeholder="Enter username" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                    <input type="email" className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" placeholder="Enter email" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Phone</label>
                    <input type="tel" className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" placeholder="Enter phone" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">VIP Level</label>
                    <select className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none">
                      <option>VIP 1</option>
                      <option>VIP 2</option>
                      <option>VIP 3</option>
                      <option>VIP 4</option>
                      <option>VIP 5</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Initial Balance</label>
                    <input type="number" className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" placeholder="0.00" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                    <select className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none">
                      <option>Active</option>
                      <option>Pending</option>
                      <option>Suspended</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button type="submit" className="flex-1 bg-[#00D9FF] hover:bg-[#00c5e6] text-[#1a1f2e] font-bold py-3 rounded-lg transition-colors">
                    Create User
                  </button>
                  <button type="button" onClick={() => setModalType(null)} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded-lg transition-colors">
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
                <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white">
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
                <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white">
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

          {modalType === 'edit-user' && selectedItem && userTaskControlDraft && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white">Edit User Task Controls</h3>
                <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white">
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
                <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white">
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
                <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white">
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
                <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white">
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
                <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white">
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
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white">Send Notification</h3>
                <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Recipient Type</label>
                  <select className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none">
                    <option>All Users</option>
                    <option>Specific VIP Level</option>
                    <option>Active Users Only</option>
                    <option>Specific User</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Notification Title</label>
                  <input type="text" className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" placeholder="Enter title" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Message</label>
                  <textarea className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" rows={5} placeholder="Enter notification message..."></textarea>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Priority</label>
                  <select className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none">
                    <option>Normal</option>
                    <option>High</option>
                    <option>Urgent</option>
                  </select>
                </div>
                <div className="flex gap-3 mt-6">
                  <button type="submit" className="flex-1 bg-[#00D9FF] hover:bg-[#00c5e6] text-[#1a1f2e] font-bold py-3 rounded-lg transition-colors">
                    Send Notification
                  </button>
                  <button type="button" onClick={() => setModalType(null)} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded-lg transition-colors">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
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
                <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white">
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
                    <input type="url" name="image" required className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" placeholder="https://image.example/product.jpg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Product Value (USD)</label>
                    <input type="number" name="price" required min="0.01" step="0.01" className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" placeholder="Enter product value" />
                  </div>
                  <div className="col-span-2 rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-xs text-cyan-200">
                    Merchant and catalog commission can be auto-detected from the image/product URL. Product value is now set manually so each added product can keep its own price.
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button type="submit" className="flex-1 bg-[#00D9FF] hover:bg-[#00c5e6] text-[#1a1f2e] font-bold py-3 rounded-lg transition-colors">
                    Create Product
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
                <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white">
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
                <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white">
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
                <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>
              <div className="space-y-4">
                <div className="bg-[#1a1f2e] p-4 rounded-lg">
                  <img src={selectedItem.image || selectedItem.imageUrl || 'https://via.placeholder.com/400x300?text=Product'} alt={selectedItem.product || selectedItem.name || 'Product'} className="w-full h-64 object-cover rounded-lg mb-4" />
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
                  <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white">
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
                      <input type="url" name="image" required defaultValue={selectedItem.image || selectedItem.imageUrl || ''} className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" placeholder="https://image.example/product.jpg" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Product Value (USD)</label>
                      <input type="number" name="price" required min="0.01" step="0.01" defaultValue={selectedItem.price ?? ''} className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" placeholder="Enter product value" />
                    </div>
                    <div className="col-span-2 rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-xs text-cyan-200">
                      Product value is editable. Merchant and commission can still be inferred by system logic when needed.
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

            {/* Delete Product Modal */}
          {modalType === 'delete-product' && selectedItem && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white">Delete Product</h3>
                <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white">
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
                <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white">
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
                <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white">
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
                <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white">
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
                <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white">
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
                <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white">
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
                <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white">
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
                <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white">
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
                <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white">
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
                <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white">
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
                <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white">
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
                <button onClick={() => setModalType(null)} className="absolute right-6 text-gray-400 hover:text-white">
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
                <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white">
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
                <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white">
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
                <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white">
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
                <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white">
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
      </div>
    );
  };

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
        );

      case 'vip-config':
        return (
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

  const pendingRestorePoint = pendingRestorePointId
    ? salaryRestorePoints.find((point) => point.id === pendingRestorePointId) ?? null
    : null;

  const pendingRestoreDiff = useMemo(() => {
    if (!pendingRestorePoint) {
      return null;
    }

    const currentById = new Map(salaryPayments.map((payment) => [payment.id, payment]));
    const snapshotById = new Map(pendingRestorePoint.payments.map((payment) => [payment.id, payment]));
    const allIds = new Set<number>([...currentById.keys(), ...snapshotById.keys()]);

    let added = 0;
    let removed = 0;
    let changedStatus = 0;
    let changedAmount = 0;
    let changedMode = 0;
    let changedDueDate = 0;
    let changedPaidDate = 0;
    let changedRows = 0;
    const sampleChanges: string[] = [];

    allIds.forEach((id) => {
      const current = currentById.get(id);
      const snapshot = snapshotById.get(id);

      if (!current && snapshot) {
        added += 1;
        if (sampleChanges.length < 4) {
          sampleChanges.push(`${snapshot.username}: added by snapshot`);
        }
        return;
      }

      if (current && !snapshot) {
        removed += 1;
        if (sampleChanges.length < 4) {
          sampleChanges.push(`${current.username}: removed by snapshot`);
        }
        return;
      }

      if (!current || !snapshot) {
        return;
      }

      let rowChanged = false;
      const notes: string[] = [];

      if (current.status !== snapshot.status) {
        changedStatus += 1;
        rowChanged = true;
        notes.push(`status ${current.status}→${snapshot.status}`);
      }
      if (current.salaryDue !== snapshot.salaryDue) {
        changedAmount += 1;
        rowChanged = true;
        notes.push(`amount $${current.salaryDue}→$${snapshot.salaryDue}`);
      }
      if (current.paymentMode !== snapshot.paymentMode) {
        changedMode += 1;
        rowChanged = true;
        notes.push(`mode ${current.paymentMode}→${snapshot.paymentMode}`);
      }
      if (current.dueDate !== snapshot.dueDate) {
        changedDueDate += 1;
        rowChanged = true;
        notes.push(`due ${current.dueDate}→${snapshot.dueDate}`);
      }
      const currentPaidDate = current.paidDate ?? '';
      const snapshotPaidDate = snapshot.paidDate ?? '';
      if (currentPaidDate !== snapshotPaidDate) {
        changedPaidDate += 1;
        rowChanged = true;
        notes.push(`paid ${currentPaidDate || 'none'}→${snapshotPaidDate || 'none'}`);
      }

      if (rowChanged) {
        changedRows += 1;
        if (sampleChanges.length < 4) {
          sampleChanges.push(`${snapshot.username}: ${notes.join(', ')}`);
        }
      }
    });

    const currentPending = salaryPayments.filter((payment) => payment.status === 'Pending').length;
    const snapshotPending = pendingRestorePoint.payments.filter((payment) => payment.status === 'Pending').length;
    const currentPaid = salaryPayments.filter((payment) => payment.status === 'Paid').length;
    const snapshotPaid = pendingRestorePoint.payments.filter((payment) => payment.status === 'Paid').length;
    const currentTotal = salaryPayments.reduce((sum, payment) => sum + payment.salaryDue, 0);
    const snapshotTotal = pendingRestorePoint.payments.reduce((sum, payment) => sum + payment.salaryDue, 0);

    return {
      added,
      removed,
      changedRows,
      changedStatus,
      changedAmount,
      changedMode,
      changedDueDate,
      changedPaidDate,
      pendingDelta: snapshotPending - currentPending,
      paidDelta: snapshotPaid - currentPaid,
      totalDelta: snapshotTotal - currentTotal,
      sampleChanges,
    };
  }, [pendingRestorePoint, salaryPayments]);

  return (
    <div className="size-full flex bg-[#1a1f2e]">
      {/* Left Sidebar */}
      <aside className="w-64 bg-[#252b3d] border-r border-gray-700 flex flex-col">
        {/* Logo Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <img src={steadfastLogo} alt="Steadfast" className="w-10 h-10 object-contain" />
            <div>
              <h1 className="text-white font-bold text-lg">STEADFAST</h1>
              <p className="text-gray-400 text-xs">Admin Panel</p>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto p-4">
          <div className="space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
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
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {renderContent()}
        </div>
      </main>

      {/* Modals */}
      {renderModal()}

      {/* Restore Preview Modal */}
      {pendingRestorePoint && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#252b3d] border border-gray-700 rounded-lg max-w-lg w-full p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="text-white text-xl font-bold">Restore Backup Point</h3>
                <p className="text-gray-400 text-sm mt-1">Review this snapshot before applying restore.</p>
              </div>
              <button onClick={cancelRestoreSalaryPoint} className="text-gray-400 hover:text-white">
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
              <button onClick={() => setReconcileReport(null)} className="text-gray-400 hover:text-white">
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






