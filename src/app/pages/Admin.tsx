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
  Copy
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
  loadSalaryAuditLog,
  loadSalaryProjectAutosave,
  parseBackupImport,
  pruneExpiredRestorePoints,
  saveSalaryAuditLog,
  saveSalaryProjectAutosave,
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

// Mock data for users
const mockUsers = [
  { id: 1, username: 'user001', phone: '+1 234-567-8900', email: 'user001@example.com', vipLevel: 'VIP 1', balance: 1250.50, status: 'Active', registered: '2024-01-15', tasksCompleted: 45, totalEarnings: 562.50 },
  { id: 2, username: 'user002', phone: '+1 234-567-8901', email: 'user002@example.com', vipLevel: 'VIP 2', balance: 3500.75, status: 'Active', registered: '2024-01-18', tasksCompleted: 89, totalEarnings: 1780.00 },
  { id: 3, username: 'user003', phone: '+1 234-567-8902', email: 'user003@example.com', vipLevel: 'VIP 3', balance: 8900.00, status: 'Active', registered: '2024-01-20', tasksCompleted: 156, totalEarnings: 4680.00 },
  { id: 4, username: 'user004', phone: '+1 234-567-8903', email: 'user004@example.com', vipLevel: 'VIP 1', balance: 450.25, status: 'Suspended', registered: '2024-01-22', tasksCompleted: 23, totalEarnings: 287.50 },
  { id: 5, username: 'user005', phone: '+1 234-567-8904', email: 'user005@example.com', vipLevel: 'VIP 4', balance: 15600.00, status: 'Active', registered: '2024-01-25', tasksCompleted: 234, totalEarnings: 9360.00 },
  { id: 6, username: 'user006', phone: '+1 234-567-8905', email: 'user006@example.com', vipLevel: 'VIP 2', balance: 2100.50, status: 'Active', registered: '2024-02-01', tasksCompleted: 67, totalEarnings: 1340.00 },
  { id: 7, username: 'user007', phone: '+1 234-567-8906', email: 'user007@example.com', vipLevel: 'VIP 5', balance: 25000.00, status: 'Active', registered: '2024-02-03', tasksCompleted: 312, totalEarnings: 15600.00 },
  { id: 8, username: 'user008', phone: '+1 234-567-8907', email: 'user008@example.com', vipLevel: 'VIP 1', balance: 890.75, status: 'Pending', registered: '2024-02-05', tasksCompleted: 12, totalEarnings: 150.00 },
];


// VIP Configuration
const defaultVipConfigurations: VipConfig[] = [
  { level: 1, name: 'VIP 1', investment: 100, dailyTasks: 10, commission: 0.005, color: 'bronze' },
  { level: 2, name: 'VIP 2', investment: 500, dailyTasks: 15, commission: 0.010, color: 'silver' },
  { level: 3, name: 'VIP 3', investment: 2000, dailyTasks: 20, commission: 0.015, color: 'gold' },
  { level: 4, name: 'VIP 4', investment: 5000, dailyTasks: 25, commission: 0.020, color: 'platinum' },
  { level: 5, name: 'VIP 5', investment: 10000, dailyTasks: 30, commission: 0.025, color: 'diamond' },
];

type VipLevelConfig = VipConfig;
type VipDraftState = {
  investment: string;
  dailyTasks: string;
  commissionPercent: string;
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

// Mock products data
const mockProducts = [
  { id: 1, name: 'Wireless Bluetooth Headphones', description: 'Premium noise-canceling headphones with 30-hour battery life', category: 'Electronics', merchant: 'Amazon', price: 89.99, commission: 0.015, imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400', status: 'Active', sku: 'WBH-001', stock: 250, createdDate: '2024-02-15', source: 'Manual' },
  { id: 2, name: 'Smart Fitness Watch', description: 'Advanced fitness tracker with heart rate monitor and GPS', category: 'Wearables', merchant: 'Walmart', price: 199.99, commission: 0.020, imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400', status: 'Active', sku: 'SFW-002', stock: 180, createdDate: '2024-02-18', source: 'AI Generated' },
  { id: 3, name: 'Ergonomic Laptop Stand', description: 'Adjustable aluminum laptop stand for better posture', category: 'Office', merchant: 'Target', price: 45.50, commission: 0.012, imageUrl: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400', status: 'Active', sku: 'ELS-003', stock: 320, createdDate: '2024-02-20', source: 'Manual' },
  { id: 4, name: 'USB-C Fast Charging Cable 6ft', description: 'Durable braided USB-C cable with fast charging support', category: 'Accessories', merchant: 'Amazon', price: 12.99, commission: 0.010, imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400', status: 'Inactive', sku: 'USC-004', stock: 0, createdDate: '2024-02-22', source: 'Manual' },
  { id: 5, name: 'RGB Gaming Mouse', description: 'High-precision gaming mouse with customizable RGB lighting', category: 'Gaming', merchant: 'Best Buy', price: 79.99, commission: 0.018, imageUrl: 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=400', status: 'Active', sku: 'RGM-005', stock: 156, createdDate: '2024-02-25', source: 'AI Generated' },
  { id: 6, name: 'Portable Power Bank 20000mAh', description: 'High-capacity power bank with dual USB ports', category: 'Electronics', merchant: 'Amazon', price: 34.99, commission: 0.015, imageUrl: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=400', status: 'Active', sku: 'PPB-006', stock: 290, createdDate: '2024-03-01', source: 'Manual' },
  { id: 7, name: '4K Webcam with Microphone', description: 'Professional 4K webcam with built-in noise-canceling mic', category: 'Electronics', merchant: 'Best Buy', price: 129.99, commission: 0.020, imageUrl: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400', status: 'Active', sku: 'WEB-007', stock: 95, createdDate: '2024-03-03', source: 'AI Generated' },
  { id: 8, name: 'Mechanical Keyboard RGB', description: 'Premium mechanical keyboard with RGB backlighting', category: 'Gaming', merchant: 'Walmart', price: 159.99, commission: 0.018, imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400', status: 'Active', sku: 'MKB-008', stock: 145, createdDate: '2024-03-05', source: 'AI Generated' },
];

// Salary Payment System
const initialSalaryPayments: SalaryPayment[] = [
  { id: 1, username: 'user001', daysWorked: 15, salaryDue: 3060, status: 'Pending', dueDate: '2024-03-10', paymentMode: 'Automatic' },
  { id: 2, username: 'user002', daysWorked: 22, salaryDue: 4488, status: 'Paid', dueDate: '2024-03-09', paidDate: '2024-03-09', paymentMode: 'Automatic' },
  { id: 3, username: 'user003', daysWorked: 30, salaryDue: 6120, status: 'Pending', dueDate: '2024-03-10', paymentMode: 'Manual' },
  { id: 4, username: 'user004', daysWorked: 7, salaryDue: 1428, status: 'Pending', dueDate: '2024-03-11', paymentMode: 'Automatic' },
  { id: 5, username: 'user005', daysWorked: 1, salaryDue: 204, status: 'Paid', dueDate: '2024-03-08', paidDate: '2024-03-08', paymentMode: 'Automatic' },
];

// Admin Roles with Permissions
const adminRoles = [
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
  balance: number;
  tasksCompleted: number;
  isFrozen: boolean;
  referredByAdminId: string | null;
  referredByAdminName: string;
  createdAt: string | null;
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
type ModalType = 'add-user' | 'edit-user' | 'view-user' | 'delete-user' | 'view-transaction' | 'approve-withdrawal' | 'reject-withdrawal' | 'add-task' | 'edit-vip' | 'notification' | 'add-product-manual' | 'add-product-ai' | 'edit-product' | 'view-product' | 'delete-product' | 'edit-workday-reward' | 'edit-reset-reward' | 'edit-accumulated-reward' | 'edit-product-system' | 'pay-salary' | 'pay-salary-bulk' | 'add-admin' | 'edit-admin' | 'view-admin' | 'delete-admin' | 'admin-invitation-code' | 'add-role' | 'edit-role' | 'view-role-permissions' | 'delete-role' | null;

export default function Admin() {
  const navigate = useNavigate();
  const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a1c55d7e`;
  const productsPerPage = 8;
  const usersPerPage = 5;
  const [activeMenu, setActiveMenu] = useState('home');
  const [searchTerm, setSearchTerm] = useState('');
  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [activeAdminTab, setActiveAdminTab] = useState('admins');
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
  const salaryPaymentsRef = useRef<SalaryPayment[]>(initialSalaryPayments);
  const lastAutoBackupSignatureRef = useRef<string>('');
  const lastStorageErrorRef = useRef<string | null>(null);
  const adminAuthRedirectedRef = useRef(false);
  const importBackupInputRef = useRef<HTMLInputElement | null>(null);



  const handleStorageSaveResult = (result: StorageSaveResult) => {
    if (result.ok) {
      setStorageWarning(null);
      lastStorageErrorRef.current = null;
      return;
    }

    const message = result.message ?? 'Unable to save backup data to browser storage.';
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
  ) => handleAdminAuthError({
    errorValue: error,
    fallbackMessage,
    navigate,
    redirectedRef: adminAuthRedirectedRef,
    suppressToast: options?.suppressToast,
    onMessage: options?.onMessage,
  });

  const isNotFoundError = (error: unknown): boolean => {
    if (!(error instanceof Error)) {
      return false;
    }

    const message = error.message.trim().toLowerCase();
    return message.includes('(404)') || message.startsWith('404 ');
  };

  const handleStartVipInlineEdit = (vip: VipLevelConfig) => {
    setEditingVipLevel(vip.level);
    setVipDraft({
      investment: String(vip.investment),
      dailyTasks: String(vip.dailyTasks),
      commissionPercent: (vip.commission * 100).toFixed(2),
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
        suppressToast: isNotFoundError(error),
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

  const loadRewardsConfigurations = async () => {
    setRewardsConfigLoading(true);
    try {
      const config = await fetchAdminRewardsConfig();
      setRewardsConfig(config);
    } catch (error) {
      setRewardsConfig(defaultRewardsConfig);
      handleAdminRequestError(error, 'Failed to load rewards configuration', {
        suppressToast: isNotFoundError(error),
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
      const multiplierValue = Number(formData.get(`premiumMultiplier_${vipLevel}`));
      const minValue = Number(formData.get(`premiumMin_${vipLevel}`));
      const maxValue = Number(formData.get(`premiumMax_${vipLevel}`));

      return {
        vipLevel,
        multiplier: multiplierValue,
        minValue,
        maxValue,
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

  const loadTaskConfigurations = async () => {
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
      handleAdminRequestError(error, 'Failed to load tasks');
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
      const response = await fetch(`${serverUrl}/admin/tasks/${taskId}`, {
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
      const response = await fetch(`${serverUrl}/admin/tasks/${taskId}`, {
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
        const [{ data: userData }, { data: sessionData }] = await Promise.all([
          supabase.auth.getUser(),
          supabase.auth.getSession(),
        ]);

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

        // Decode JWT access token
        const accessToken = sessionData?.session?.access_token;
        if (accessToken) {
          try {
            const parts = accessToken.split('.');
            if (parts[1]) {
              const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
              const jwtPayload = JSON.parse(atob(base64)) as any;
              // Check JWT claims for role
              [jwtPayload.role, jwtPayload.user_role].forEach((r) => {
                const n = normalize(r);
                if (n) roles.add(n);
              });
              // Check JWT app_metadata
              if (jwtPayload.app_metadata?.role) {
                const n = normalize(jwtPayload.app_metadata.role);
                if (n) roles.add(n);
              }
              if (Array.isArray(jwtPayload.app_metadata?.roles)) {
                jwtPayload.app_metadata.roles.forEach((r: any) => {
                  const n = normalize(r);
                  if (n) roles.add(n);
                });
              }
            }
          } catch (err) {
            console.debug('JWT decode skipped');
          }
        }

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
      handleAdminRequestError(error, 'Failed to load finance data');
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
    if (!['home', 'tasks'].includes(activeMenu)) {
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

    void loadRewardsConfigurations();
  }, [activeMenu]);

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

    const selectedRole = adminRoles.find((role) => role.id === roleId);
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

  const handleCreateTask = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const merchant = String(formData.get('merchant') ?? '').trim();
    const product = String(formData.get('product') ?? '').trim();
    const price = Number(formData.get('price'));
    const commissionPercent = Number(formData.get('commissionPercent'));
    const productUrl = String(formData.get('productUrl') ?? '').trim();
    const status = String(formData.get('status') ?? 'Active').trim();

    if (!merchant || !product) {
      toast.error('Merchant and product are required.');
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
      const response = await fetch(`${serverUrl}/admin/tasks`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          merchant,
          product,
          price,
          commission: commissionPercent / 100,
          productUrl,
          status,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to create task');
      }

      await loadTaskConfigurations();
      toast.success('Task created.');
      setModalType(null);
    } catch (error) {
      handleAdminRequestError(error, 'Failed to create task');
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
    const restored = loadSalaryProjectAutosave(initialSalaryPayments);

    setSalaryPayments(restored.payments);
    setSalaryRestorePoints(restored.points);
    setActiveRewardTab(restored.activeRewardTab);
    setSelectedBulkOption(restored.selectedBulkOption);
    setAutoBackupEnabled(restored.autoBackupEnabled);
    setAutoBackupIntervalMinutes(restored.autoBackupIntervalMinutes);
    setBackupRetentionDays(restored.backupRetentionDays);
    setSalaryAuditLog(loadSalaryAuditLog());
    salaryPaymentsRef.current = restored.payments;
    lastAutoBackupSignatureRef.current = JSON.stringify(restored.payments);
    setIsSalaryStateHydrated(true);
  }, []);

  useEffect(() => {
    salaryPaymentsRef.current = salaryPayments;
  }, [salaryPayments]);

  useEffect(() => {
    if (!isSalaryStateHydrated) {
      return;
    }

    const saveResult = saveSalaryProjectAutosave({
      activeRewardTab,
      selectedBulkOption,
      autoBackupEnabled,
      autoBackupIntervalMinutes,
      backupRetentionDays,
      payments: salaryPayments,
      points: pruneExpiredRestorePoints(salaryRestorePoints, backupRetentionDays),
    });
    handleStorageSaveResult(saveResult);
    setAutoSavedAt(new Date().toISOString());
  }, [
    isSalaryStateHydrated,
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
    if (!isSalaryStateHydrated) {
      return;
    }

    const saveResult = saveSalaryAuditLog(salaryAuditLog);
    handleStorageSaveResult(saveResult);
  }, [isSalaryStateHydrated, salaryAuditLog]);

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
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white">User Details</h3>
                <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#1a1f2e] p-4 rounded-lg">
                    <p className="text-gray-400 text-sm">Username</p>
                    <p className="text-white font-semibold mt-1">{selectedItem.username}</p>
                  </div>
                  <div className="bg-[#1a1f2e] p-4 rounded-lg">
                    <p className="text-gray-400 text-sm">Email</p>
                    <p className="text-white font-semibold mt-1">{selectedItem.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#1a1f2e] p-4 rounded-lg">
                    <p className="text-gray-400 text-sm">Phone</p>
                    <p className="text-white font-semibold mt-1">{selectedItem.phone}</p>
                  </div>
                  <div className="bg-[#1a1f2e] p-4 rounded-lg">
                    <p className="text-gray-400 text-sm">VIP Level</p>
                    <p className="text-purple-300 font-semibold mt-1">{selectedItem.vipLevel}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#1a1f2e] p-4 rounded-lg">
                    <p className="text-gray-400 text-sm">Balance</p>
                    <p className="text-[#00D9FF] font-bold text-xl mt-1">${selectedItem.balance.toFixed(2)}</p>
                  </div>
                  <div className="bg-[#1a1f2e] p-4 rounded-lg">
                    <p className="text-gray-400 text-sm">Status</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mt-1 ${
                      selectedItem.status === 'Active' ? 'bg-green-500/20 text-green-300' :
                      selectedItem.status === 'Suspended' ? 'bg-red-500/20 text-red-300' :
                      'bg-yellow-500/20 text-yellow-300'
                    }`}>
                      {selectedItem.status}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#1a1f2e] p-4 rounded-lg">
                    <p className="text-gray-400 text-sm">Tasks Completed</p>
                    <p className="text-white font-bold text-xl mt-1">{selectedItem.tasksCompleted}</p>
                  </div>
                  <div className="bg-[#1a1f2e] p-4 rounded-lg">
                    <p className="text-gray-400 text-sm">Total Earnings</p>
                    <p className="text-green-400 font-bold text-xl mt-1">${(typeof selectedItem.totalEarnings === 'number' ? selectedItem.totalEarnings : selectedItem.balance ?? 0).toFixed(2)}</p>
                  </div>
                </div>
                <div className="bg-[#1a1f2e] p-4 rounded-lg">
                  <p className="text-gray-400 text-sm">Registered Date</p>
                  <p className="text-white font-semibold mt-1">{selectedItem.registered}</p>
                </div>
              </div>
              <button onClick={() => setModalType(null)} className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded-lg mt-6 transition-colors">
                Close
              </button>
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
              </div>
              <div className="flex gap-3">
                <button onClick={() => setModalType(null)} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded-lg transition-colors">
                  Cancel
                </button>
                <button onClick={() => { toast.error('User deleted'); setModalType(null); }} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-lg transition-colors">
                  Delete User
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
              <form className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Product Name</label>
                    <input type="text" className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" placeholder="Enter product name" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                    <textarea className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" rows={3} placeholder="Enter product description"></textarea>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
                    <select className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none">
                      <option>Electronics</option>
                      <option>Wearables</option>
                      <option>Gaming</option>
                      <option>Office</option>
                      <option>Accessories</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Merchant</label>
                    <select className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none">
                      <option>Amazon</option>
                      <option>Walmart</option>
                      <option>Target</option>
                      <option>Best Buy</option>
                      <option>eBay</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Price ($)</label>
                    <input type="number" step="0.01" className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" placeholder="0.00" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Commission Rate (%)</label>
                    <input type="number" step="0.001" className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" placeholder="0.000" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">SKU</label>
                    <input type="text" className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" placeholder="XXX-000" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Stock Quantity</label>
                    <input type="number" className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" placeholder="0" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Product Image</label>
                    <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-[#00D9FF] transition-colors cursor-pointer">
                      <Upload className="mx-auto text-gray-400 mb-2" size={32} />
                      <p className="text-gray-400 text-sm">Click to upload or drag and drop</p>
                      <p className="text-gray-500 text-xs mt-1">PNG, JPG or WebP (max. 5MB)</p>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Product URL (Optional)</label>
                    <input type="url" className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" placeholder="https://..." />
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

          {/* Add Product AI Generated Modal */}
          {modalType === 'add-product-ai' && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Sparkles className="text-purple-400" size={24} />
                  </div>
                  <h3 className="text-2xl font-bold text-white">AI Generate Product</h3>
                </div>
                <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>
              <div className="mb-6 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <Sparkles className="text-purple-400 mt-1" size={20} />
                  <div>
                    <p className="text-purple-300 font-semibold text-sm">AI-Powered Product Generation</p>
                    <p className="text-gray-400 text-xs mt-1">Describe the product you want to create and our AI will generate product details, descriptions, and even suggest images.</p>
                  </div>
                </div>
              </div>
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Product Prompt</label>
                  <textarea 
                    className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" 
                    rows={4} 
                    placeholder="Describe the product... (e.g., 'A premium wireless gaming mouse with RGB lighting and ergonomic design')"
                  ></textarea>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Target Category</label>
                    <select className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none">
                      <option value="">Auto-detect</option>
                      <option>Electronics</option>
                      <option>Wearables</option>
                      <option>Gaming</option>
                      <option>Office</option>
                      <option>Accessories</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Merchant</label>
                    <select className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none">
                      <option>Amazon</option>
                      <option>Walmart</option>
                      <option>Target</option>
                      <option>Best Buy</option>
                      <option>eBay</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Price Range ($)</label>
                    <select className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none">
                      <option>$0 - $50</option>
                      <option>$50 - $100</option>
                      <option>$100 - $200</option>
                      <option>$200 - $500</option>
                      <option>$500+</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Generate Image</label>
                    <select className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none">
                      <option>Yes - AI Generated</option>
                      <option>No - I'll upload later</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button 
                    type="submit" 
                    className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Sparkles size={18} />
                    Generate with AI
                  </button>
                  <button type="button" onClick={() => setModalType(null)} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded-lg transition-colors">
                    Cancel
                  </button>
                </div>
              </form>
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
                  <img src={selectedItem.imageUrl} alt={selectedItem.name} className="w-full h-64 object-cover rounded-lg mb-4" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#1a1f2e] p-4 rounded-lg col-span-2">
                    <p className="text-gray-400 text-sm">Product Name</p>
                    <p className="text-white font-semibold mt-1">{selectedItem.name}</p>
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
                <p className="text-gray-400 mb-4">Product: <span className="text-white font-semibold">{selectedItem.name}</span></p>
                <p className="text-red-400 text-sm">This action cannot be undone!</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setModalType(null)} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded-lg transition-colors">
                  Cancel
                </button>
                <button onClick={() => { toast.error('Product deleted'); setModalType(null); }} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-lg transition-colors">
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
                      {adminRoles.map(role => (
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
              <form className="space-y-4">
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
                    <select defaultValue={selectedItem.roleId} className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none">
                      {adminRoles.map(role => (
                        <option key={role.id} value={role.id}>{role.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                    <select defaultValue={selectedItem.status} className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none">
                      <option value="Active">Active</option>
                      <option value="Suspended">Suspended</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Two-Factor Auth</label>
                    <select defaultValue={selectedItem.twoFactorEnabled ? 'enabled' : 'disabled'} className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none">
                      <option value="enabled">Enabled</option>
                      <option value="disabled">Disabled</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button type="submit" onClick={(e) => { e.preventDefault(); toast.success('Admin updated!'); setModalType(null); }} className="flex-1 bg-[#00D9FF] hover:bg-[#00c5e6] text-[#1a1f2e] font-bold py-3 rounded-lg transition-colors">
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
              <form className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Role Name *</label>
                    <input type="text" placeholder="e.g. Marketing Manager" className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Color Theme</label>
                    <select className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none">
                      <option value="blue">Blue</option>
                      <option value="green">Green</option>
                      <option value="purple">Purple</option>
                      <option value="red">Red</option>
                      <option value="yellow">Yellow</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                    <textarea className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" rows={2} placeholder="Brief description of this role..."></textarea>
                  </div>
                </div>
                <div>
                  <h4 className="text-white font-bold mb-3">Permissions</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center gap-2 bg-[#1a1f2e] p-3 rounded-lg cursor-pointer hover:bg-[#252b3d]">
                      <input type="checkbox" className="w-4 h-4 rounded bg-[#1a1f2e] border-gray-600 text-[#00D9FF] focus:ring-[#00D9FF]" />
                      <span className="text-white text-sm">Dashboard</span>
                    </label>
                    <label className="flex items-center gap-2 bg-[#1a1f2e] p-3 rounded-lg cursor-pointer hover:bg-[#252b3d]">
                      <input type="checkbox" className="w-4 h-4 rounded bg-[#1a1f2e] border-gray-600 text-[#00D9FF] focus:ring-[#00D9FF]" />
                      <span className="text-white text-sm">Financials</span>
                    </label>
                    <label className="flex items-center gap-2 bg-[#1a1f2e] p-3 rounded-lg cursor-pointer hover:bg-[#252b3d]">
                      <input type="checkbox" className="w-4 h-4 rounded bg-[#1a1f2e] border-gray-600 text-[#00D9FF] focus:ring-[#00D9FF]" />
                      <span className="text-white text-sm">Rewards System</span>
                    </label>
                    <label className="flex items-center gap-2 bg-[#1a1f2e] p-3 rounded-lg cursor-pointer hover:bg-[#252b3d]">
                      <input type="checkbox" className="w-4 h-4 rounded bg-[#1a1f2e] border-gray-600 text-[#00D9FF] focus:ring-[#00D9FF]" />
                      <span className="text-white text-sm">Product Management</span>
                    </label>
                    <label className="flex items-center gap-2 bg-[#1a1f2e] p-3 rounded-lg cursor-pointer hover:bg-[#252b3d]">
                      <input type="checkbox" className="w-4 h-4 rounded bg-[#1a1f2e] border-gray-600 text-[#00D9FF] focus:ring-[#00D9FF]" />
                      <span className="text-white text-sm">User Management</span>
                    </label>
                    <label className="flex items-center gap-2 bg-[#1a1f2e] p-3 rounded-lg cursor-pointer hover:bg-[#252b3d]">
                      <input type="checkbox" className="w-4 h-4 rounded bg-[#1a1f2e] border-gray-600 text-[#00D9FF] focus:ring-[#00D9FF]" />
                      <span className="text-white text-sm">Transactions</span>
                    </label>
                    <label className="flex items-center gap-2 bg-[#1a1f2e] p-3 rounded-lg cursor-pointer hover:bg-[#252b3d]">
                      <input type="checkbox" className="w-4 h-4 rounded bg-[#1a1f2e] border-gray-600 text-[#00D9FF] focus:ring-[#00D9FF]" />
                      <span className="text-white text-sm">Task Management</span>
                    </label>
                    <label className="flex items-center gap-2 bg-[#1a1f2e] p-3 rounded-lg cursor-pointer hover:bg-[#252b3d]">
                      <input type="checkbox" className="w-4 h-4 rounded bg-[#1a1f2e] border-gray-600 text-[#00D9FF] focus:ring-[#00D9FF]" />
                      <span className="text-white text-sm">VIP Config</span>
                    </label>
                    <label className="flex items-center gap-2 bg-[#1a1f2e] p-3 rounded-lg cursor-pointer hover:bg-[#252b3d]">
                      <input type="checkbox" className="w-4 h-4 rounded bg-[#1a1f2e] border-gray-600 text-[#00D9FF] focus:ring-[#00D9FF]" />
                      <span className="text-white text-sm">Withdrawals</span>
                    </label>
                    <label className="flex items-center gap-2 bg-[#1a1f2e] p-3 rounded-lg cursor-pointer hover:bg-[#252b3d]">
                      <input type="checkbox" className="w-4 h-4 rounded bg-[#1a1f2e] border-gray-600 text-[#00D9FF] focus:ring-[#00D9FF]" />
                      <span className="text-white text-sm">Deposits</span>
                    </label>
                    <label className="flex items-center gap-2 bg-[#1a1f2e] p-3 rounded-lg cursor-pointer hover:bg-[#252b3d]">
                      <input type="checkbox" className="w-4 h-4 rounded bg-[#1a1f2e] border-gray-600 text-[#00D9FF] focus:ring-[#00D9FF]" />
                      <span className="text-white text-sm">Notifications</span>
                    </label>
                    <label className="flex items-center gap-2 bg-[#1a1f2e] p-3 rounded-lg cursor-pointer hover:bg-[#252b3d]">
                      <input type="checkbox" className="w-4 h-4 rounded bg-[#1a1f2e] border-gray-600 text-[#00D9FF] focus:ring-[#00D9FF]" />
                      <span className="text-white text-sm">Settings</span>
                    </label>
                    <label className="flex items-center gap-2 bg-[#1a1f2e] p-3 rounded-lg cursor-pointer hover:bg-[#252b3d]">
                      <input type="checkbox" className="w-4 h-4 rounded bg-[#1a1f2e] border-gray-600 text-[#00D9FF] focus:ring-[#00D9FF]" />
                      <span className="text-white text-sm">Admin Users</span>
                    </label>
                    <label className="flex items-center gap-2 bg-[#1a1f2e] p-3 rounded-lg cursor-pointer hover:bg-[#252b3d]">
                      <input type="checkbox" className="w-4 h-4 rounded bg-[#1a1f2e] border-gray-600 text-[#00D9FF] focus:ring-[#00D9FF]" />
                      <span className="text-white text-sm">Delete Users</span>
                    </label>
                    <label className="flex items-center gap-2 bg-[#1a1f2e] p-3 rounded-lg cursor-pointer hover:bg-[#252b3d]">
                      <input type="checkbox" className="w-4 h-4 rounded bg-[#1a1f2e] border-gray-600 text-[#00D9FF] focus:ring-[#00D9FF]" />
                      <span className="text-white text-sm">Edit Roles</span>
                    </label>
                    <label className="flex items-center gap-2 bg-[#1a1f2e] p-3 rounded-lg cursor-pointer hover:bg-[#252b3d]">
                      <input type="checkbox" className="w-4 h-4 rounded bg-[#1a1f2e] border-gray-600 text-[#00D9FF] focus:ring-[#00D9FF]" />
                      <span className="text-white text-sm">Process Payments</span>
                    </label>
                    <label className="flex items-center gap-2 bg-[#1a1f2e] p-3 rounded-lg cursor-pointer hover:bg-[#252b3d]">
                      <input type="checkbox" className="w-4 h-4 rounded bg-[#1a1f2e] border-gray-600 text-[#00D9FF] focus:ring-[#00D9FF]" />
                      <span className="text-white text-sm">View Reports</span>
                    </label>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button type="submit" onClick={(e) => { e.preventDefault(); toast.success('Role created!'); setModalType(null); }} className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-3 rounded-lg transition-colors">
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
              <form className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Role Name</label>
                    <input type="text" defaultValue={selectedItem.name} className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Color Theme</label>
                    <select defaultValue={selectedItem.color} className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none">
                      <option value="blue">Blue</option>
                      <option value="green">Green</option>
                      <option value="purple">Purple</option>
                      <option value="red">Red</option>
                      <option value="yellow">Yellow</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                    <textarea defaultValue={selectedItem.description} className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" rows={2}></textarea>
                  </div>
                </div>
                <div>
                  <h4 className="text-white font-bold mb-3">Permissions</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(selectedItem.permissions).map(([key, value]) => (
                      <label key={key} className="flex items-center gap-2 bg-[#1a1f2e] p-3 rounded-lg cursor-pointer hover:bg-[#252b3d]">
                        <input type="checkbox" defaultChecked={value as boolean} className="w-4 h-4 rounded bg-[#1a1f2e] border-gray-600 text-[#00D9FF] focus:ring-[#00D9FF]" />
                        <span className="text-white text-sm capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button type="submit" onClick={(e) => { e.preventDefault(); toast.success('Role updated!'); setModalType(null); }} className="flex-1 bg-[#00D9FF] hover:bg-[#00c5e6] text-[#1a1f2e] font-bold py-3 rounded-lg transition-colors">
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
                <button onClick={() => { toast.error('Role deleted!'); setModalType(null); }} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-lg transition-colors">
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
    .map((user, index) => ({
      id: `${user.username}-${user.createdAt ?? index}`,
      username: user.username,
      vipLevel: String(user.vipLevel),
      balance: user.balance,
    }));

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
  const activePlatformUsers = platformUsers.filter((user) => !user.isFrozen).length;
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
              adminRoles={adminRoles}
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
              mockProducts={mockProducts}
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
              mockUsers={mockUsers}
              setSelectedItem={setSelectedItem}
              setModalType={setModalType}
              handleExport={handleExport}
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
            <PremiumBundles users={premiumBundleUsers} />
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
              mockUsers={mockUsers}
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
    </div>
  );
}

