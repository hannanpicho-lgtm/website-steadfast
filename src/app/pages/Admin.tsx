import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router';
import PremiumBundles from '../components/admin/PremiumBundles';
import CustomerSupport from '../components/admin/CustomerSupport';
import InvitationCodes from '../components/admin/InvitationCodes';
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
  MessageSquare
} from 'lucide-react';
import steadfastLogo from '../../assets/4b611159e2ff0ca97c6252bef878e480dedd2a43.png';
import { buildAdminAuthHeaders, supabase } from '../services/supabaseAuth';
import { projectId } from '/utils/supabase/info';
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

// Mock transactions data
const mockTransactions = [
  { id: 1, username: 'user001', type: 'Deposit', amount: 500.00, status: 'Completed', date: '2024-03-01 10:30:00', txHash: '0x1a2b3c4d5e6f', method: 'USDT' },
  { id: 2, username: 'user002', type: 'Withdrawal', amount: 250.00, status: 'Pending', date: '2024-03-02 14:15:00', txHash: '0x4d5e6f7g8h9i', method: 'USDT' },
  { id: 3, username: 'user003', type: 'Commission', amount: 125.50, status: 'Completed', date: '2024-03-03 09:45:00', txHash: '0x7g8h9i0j1k2l', method: 'System' },
  { id: 4, username: 'user004', type: 'Deposit', amount: 1000.00, status: 'Failed', date: '2024-03-04 16:20:00', txHash: '0xjk1l2m3n4o5p', method: 'USDT' },
  { id: 5, username: 'user005', type: 'Withdrawal', amount: 750.00, status: 'Completed', date: '2024-03-05 11:00:00', txHash: '0x3n4o5p6q7r8s', method: 'USDT' },
  { id: 6, username: 'user006', type: 'Commission', amount: 89.25, status: 'Completed', date: '2024-03-06 13:30:00', txHash: '0x9t0u1v2w3x4y', method: 'System' },
  { id: 7, username: 'user007', type: 'Deposit', amount: 5000.00, status: 'Completed', date: '2024-03-07 15:45:00', txHash: '0x5z6a7b8c9d0e', method: 'USDT' },
];

// Mock tasks data
const mockTasks = [
  { id: 1, merchant: 'Amazon', product: 'Wireless Headphones', price: 89.99, commission: 0.015, status: 'Active', assignedUsers: 45, completedToday: 23 },
  { id: 2, merchant: 'Walmart', product: 'Smart Watch', price: 199.99, commission: 0.020, status: 'Active', assignedUsers: 67, completedToday: 34 },
  { id: 3, merchant: 'Target', product: 'Laptop Stand', price: 45.50, commission: 0.012, status: 'Active', assignedUsers: 32, completedToday: 18 },
  { id: 4, merchant: 'Amazon', product: 'USB-C Cable', price: 12.99, commission: 0.010, status: 'Paused', assignedUsers: 0, completedToday: 0 },
  { id: 5, merchant: 'Best Buy', product: 'Gaming Mouse', price: 79.99, commission: 0.018, status: 'Active', assignedUsers: 54, completedToday: 29 },
];

// Mock withdrawal requests
const mockWithdrawals = [
  { id: 1, username: 'user002', amount: 250.00, walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb', status: 'Pending', requestedDate: '2024-03-02 14:15:00', method: 'USDT' },
  { id: 2, username: 'user008', amount: 150.00, walletAddress: '0x8ba1f109551bD432803012645Ac136ddd64DBA72', status: 'Pending', requestedDate: '2024-03-08 09:30:00', method: 'USDT' },
  { id: 3, username: 'user005', amount: 750.00, walletAddress: '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed', status: 'Approved', requestedDate: '2024-03-05 11:00:00', method: 'USDT' },
  { id: 4, username: 'user003', amount: 450.00, walletAddress: '0xfB6916095ca1df60bB79Ce92cE3Ea74c37c5d359', status: 'Approved', requestedDate: '2024-03-07 16:45:00', method: 'USDT' },
];

// VIP Configuration
const vipLevels = [
  { level: 1, name: 'VIP 1', investment: 100, dailyTasks: 10, commission: 0.005, color: 'bronze' },
  { level: 2, name: 'VIP 2', investment: 500, dailyTasks: 15, commission: 0.010, color: 'silver' },
  { level: 3, name: 'VIP 3', investment: 2000, dailyTasks: 20, commission: 0.015, color: 'gold' },
  { level: 4, name: 'VIP 4', investment: 5000, dailyTasks: 25, commission: 0.020, color: 'platinum' },
  { level: 5, name: 'VIP 5', investment: 10000, dailyTasks: 30, commission: 0.025, color: 'diamond' },
];

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

// Workday Rewards Data (from Activity page)
const workdayRewardsData = [
  { id: 1, days: 1, salary: 204, enabled: true },
  { id: 2, days: 7, salary: 1428, enabled: true },
  { id: 3, days: 15, salary: 3060, enabled: true },
  { id: 4, days: 22, salary: 4488, enabled: true },
  { id: 5, days: 30, salary: 6120, enabled: true }
];

// Reset Rewards Data (Anniversary bonuses)
const resetRewardsData = [
  { id: 1, deposit: 100, reward: 28, label: 'Bronze', color: 'bg-orange-300', labelColor: 'bg-orange-600', enabled: true },
  { id: 2, deposit: 500, reward: 158, label: 'Silver', color: 'bg-gray-300', labelColor: 'bg-gray-600', enabled: true },
  { id: 3, deposit: 2000, reward: 688, label: 'Gold', color: 'bg-yellow-300', labelColor: 'bg-yellow-600', enabled: true },
  { id: 4, deposit: 5000, reward: 1788, label: 'Platinum', color: 'bg-blue-300', labelColor: 'bg-blue-600', enabled: true },
  { id: 5, deposit: 10000, reward: 3888, label: 'Diamond', color: 'bg-purple-300', labelColor: 'bg-purple-600', enabled: true },
  { id: 6, deposit: 30000, reward: 12888, label: 'Crown', color: 'bg-red-300', labelColor: 'bg-red-600', enabled: true }
];

// Accumulated Deposit Rewards Data
const accumulatedRewardsData = [
  { id: 1, minDeposit: 1000, maxDeposit: 4999, rate: 0.003, enabled: true },
  { id: 2, minDeposit: 5000, maxDeposit: 19999, rate: 0.005, enabled: true },
  { id: 3, minDeposit: 20000, maxDeposit: 49999, rate: 0.008, enabled: true },
  { id: 4, minDeposit: 50000, maxDeposit: null, rate: 0.010, enabled: true }
];

// Product System Configuration
const productSystemConfig = {
  productsPerSet: 10,
  maxSetsPerDay: 5,
  minTimePerProduct: 30, // seconds
  autoApproveCommission: true,
  requireProductConfirmation: true
};

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
type ModalType = 'add-user' | 'edit-user' | 'view-user' | 'delete-user' | 'view-transaction' | 'approve-withdrawal' | 'reject-withdrawal' | 'add-task' | 'edit-vip' | 'notification' | 'add-product-manual' | 'add-product-ai' | 'edit-product' | 'view-product' | 'delete-product' | 'edit-workday-reward' | 'edit-reset-reward' | 'edit-accumulated-reward' | 'edit-product-system' | 'pay-salary' | 'pay-salary-bulk' | 'add-admin' | 'edit-admin' | 'view-admin' | 'delete-admin' | 'add-role' | 'edit-role' | 'view-role-permissions' | 'delete-role' | null;

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
  const salaryPaymentsRef = useRef<SalaryPayment[]>(initialSalaryPayments);
  const lastAutoBackupSignatureRef = useRef<string>('');
  const lastStorageErrorRef = useRef<string | null>(null);
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
      const message = error instanceof Error ? error.message : 'Failed to load admin users';
      setAdminUsers([]);
      setAdminUsersError(message);
      toast.error(message);
    } finally {
      setAdminUsersLoading(false);
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
      const message = error instanceof Error ? error.message : 'Failed to load referral overview';
      setReferralRows([]);
      setReferralEvents([]);
      setReferralSummary(null);
      setReferralsError(message);
      toast.error(message);
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
  }, [activeAdminTab, activeMenu, serverUrl]);

  const loadPlatformUsers = async () => {
    setPlatformUsersLoaded(false);
    setPlatformUsersLoading(true);
    try {
      const headers = await buildAdminAuthHeaders(false);
      const res = await fetch(`${serverUrl}/admin/platform-users`, { headers });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error ?? `Failed to load platform users (${res.status})`);
      setPlatformUsers(Array.isArray(payload?.users) ? payload.users : []);
    } catch {
      setPlatformUsers([]);
    } finally {
      setPlatformUsersLoaded(true);
      setPlatformUsersLoading(false);
    }
  };

  useEffect(() => {
    if (activeMenu !== 'user-management') return;
    void loadPlatformUsers();
  }, [activeMenu, serverUrl]);

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

      toast.success('Admin user created successfully!');
      setModalType(null);
      form.reset();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create admin user';
      toast.error(message);
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
      const message = error instanceof Error ? error.message : 'Failed to delete admin user';
      toast.error(message);
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

  const menuItems: MenuItem[] = [
    { id: 'home', label: 'Dashboard', icon: <Home size={18} /> },
    { id: 'financials', label: 'Financial Overview', icon: <Wallet size={18} /> },
    { id: 'rewards-system', label: 'Rewards & Salary System', icon: <Gift size={18} /> },
    { id: 'product-management', label: 'Product Management', icon: <Package size={18} /> },
    { id: 'premium-bundles', label: 'Premium Bundles', icon: <Lock size={18} /> },
    { id: 'customer-support', label: 'Customer Support', icon: <MessageSquare size={18} /> },
    { id: 'admin-users', label: 'Admin Users & Roles', icon: <UserCog size={18} />, badge: 6 },
    { id: 'user-management', label: 'User Management', icon: <Users size={18} />, badge: 8 },
    { id: 'transactions', label: 'Transactions', icon: <DollarSign size={18} />, badge: 7 },
    { id: 'tasks', label: 'Task Management', icon: <FileText size={18} /> },
    { id: 'vip-config', label: 'VIP Configuration', icon: <Shield size={18} /> },
    { id: 'withdrawals', label: 'Withdrawal Requests', icon: <Activity size={18} />, badge: 2 },
    { id: 'deposits', label: 'Deposit Records', icon: <Database size={18} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={18} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={18} /> },
  ];

  const handleExport = () => {
    toast.success('Exporting data as CSV…');
  };

  const handleApproveWithdrawal = (id: number) => {
    const withdrawal = mockWithdrawals.find(w => w.id === id);
    setSelectedItem(withdrawal);
    setModalType('approve-withdrawal');
  };

  const handleRejectWithdrawal = (id: number) => {
    const withdrawal = mockWithdrawals.find(w => w.id === id);
    setSelectedItem(withdrawal);
    setModalType('reject-withdrawal');
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
                  <input type="text" className="w-full px-4 py-2 bg-[#252b3d] border border-gray-600 rounded-lg text-white mt-2 focus:border-[#00D9FF] focus:outline-none" placeholder="Enter blockchain TX hash" />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setModalType(null)} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded-lg transition-colors">
                  Cancel
                </button>
                <button onClick={() => { toast.success('Withdrawal approved'); setModalType(null); }} className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-lg transition-colors">
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
                  <textarea className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" rows={4} placeholder="Enter reason..."></textarea>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setModalType(null)} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded-lg transition-colors">
                  Cancel
                </button>
                <button onClick={() => { toast.error('Withdrawal rejected'); setModalType(null); }} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-lg transition-colors">
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
              <form className="space-y-4" onSubmit={handleCreateAiProduct}>
                <div className="grid grid-cols-2 gap-4">
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
                    <label className="block text-sm font-medium text-gray-300 mb-2">Product Name</label>
                    <input type="text" className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" placeholder="Enter product name" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Product Price ($)</label>
                    <input type="number" step="0.01" className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" placeholder="0.00" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Commission Rate (%)</label>
                    <input type="number" step="0.001" className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" placeholder="0.000" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Product URL</label>
                  <input type="url" className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" placeholder="https://..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                  <select className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none">
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
              <form className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Days Worked</label>
                    <input type="number" defaultValue={selectedItem.days} className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Salary Amount ($)</label>
                    <input type="number" step="0.01" defaultValue={selectedItem.salary} className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" />
                  </div>
                  <div className="col-span-2">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked={selectedItem.enabled} className="w-5 h-5 rounded bg-[#1a1f2e] border-gray-600 text-[#00D9FF] focus:ring-[#00D9FF]" />
                      <span className="text-white font-medium">Enable this reward tier</span>
                    </label>
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
              <form className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Deposit Amount ($)</label>
                    <input type="number" defaultValue={selectedItem.deposit} className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Reward Amount ($)</label>
                    <input type="number" step="0.01" defaultValue={selectedItem.reward} className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Tier Label</label>
                    <input type="text" defaultValue={selectedItem.label} className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                    <select defaultValue={selectedItem.enabled ? 'true' : 'false'} className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none">
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button type="submit" className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-3 rounded-lg transition-colors">
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
              <form className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Minimum Deposit ($)</label>
                    <input type="number" defaultValue={selectedItem.minDeposit} className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Maximum Deposit ($)</label>
                    <input type="number" defaultValue={selectedItem.maxDeposit || ''} placeholder="Leave empty for unlimited" className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Reward Rate (%)</label>
                    <input type="number" step="0.001" defaultValue={(selectedItem.rate * 100).toFixed(3)} className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                    <select defaultValue={selectedItem.enabled ? 'true' : 'false'} className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none">
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
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
              <form className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Products Per Set</label>
                    <input type="number" defaultValue={productSystemConfig.productsPerSet} className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" />
                    <p className="text-gray-500 text-xs mt-1">How many products in each task set</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Max Sets Per Day</label>
                    <input type="number" defaultValue={productSystemConfig.maxSetsPerDay} className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" />
                    <p className="text-gray-500 text-xs mt-1">Maximum sets users can complete daily</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Min Time Per Product (seconds)</label>
                    <input type="number" defaultValue={productSystemConfig.minTimePerProduct} className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" />
                    <p className="text-gray-500 text-xs mt-1">Minimum time required per product</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Commission Approval</label>
                    <select defaultValue={productSystemConfig.autoApproveCommission ? 'auto' : 'manual'} className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none">
                      <option value="auto">Automatic</option>
                      <option value="manual">Manual Approval</option>
                    </select>
                    <p className="text-gray-500 text-xs mt-1">How commissions are approved</p>
                  </div>
                  <div className="col-span-2">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked={productSystemConfig.requireProductConfirmation} className="w-5 h-5 rounded bg-[#1a1f2e] border-gray-600 text-[#00D9FF] focus:ring-[#00D9FF]" />
                      <span className="text-white font-medium">Require product submission confirmation</span>
                    </label>
                    <p className="text-gray-500 text-xs mt-1 ml-7">Users must confirm each product submission</p>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button type="submit" className="flex-1 bg-[#00D9FF] hover:bg-[#00c5e6] text-[#1a1f2e] font-bold py-3 rounded-lg transition-colors">
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

  const renderContent = () => {
    switch (activeMenu) {
      case 'admin-users':
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
                            {referralRows.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-gray-400">No referral data found.</td>
                              </tr>
                            ) : referralRows.map((row) => (
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
                      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Key size={18} />
                        Sub-Admin Invitation Codes
                      </h3>
                      <InvitationCodes currentAdminId={currentAdminId ?? ''} />
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

      case 'rewards-system':
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
                  onChange={(event) => setAuditFilterAction(event.target.value as 'all' | SalaryAuditEvent['action'])}
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
                    {workdayRewardsData.map((reward) => (
                      <div key={reward.id} className="bg-[#1a1f2e] rounded-lg p-4 flex items-center justify-between hover:ring-2 hover:ring-[#00D9FF] transition-all">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="bg-blue-500/20 p-3 rounded-lg">
                            <Calendar className="text-blue-400" size={24} />
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
                            <p className="text-[#00D9FF] font-bold text-2xl">${reward.salary.toLocaleString()}</p>
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
                    {resetRewardsData.map((reward) => (
                      <div key={reward.id} className={`${reward.color} rounded-xl p-5 relative overflow-hidden hover:ring-4 hover:ring-[#00D9FF] transition-all`}>
                        <div className={`absolute top-2 right-2 px-2 py-1 ${reward.labelColor} text-white rounded-full text-xs font-bold`}>
                          {reward.label}
                        </div>
                        <div className={`absolute top-2 left-2 px-2 py-1 rounded text-xs font-semibold ${reward.enabled ? 'bg-green-600 text-white' : 'bg-gray-600 text-white'}`}>
                          {reward.enabled ? 'Active' : 'Inactive'}
                        </div>
                        <div className="mt-6 mb-3 text-center">
                          <p className="text-black text-xs mb-1">Deposit Amount</p>
                          <p className="text-black font-bold text-2xl">${reward.deposit.toLocaleString()}</p>
                        </div>
                        <div className="mb-4 text-center">
                          <p className="text-black text-xs mb-1">Extra Reward</p>
                          <p className="text-black font-bold text-3xl">${reward.reward.toLocaleString()}</p>
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
                    {accumulatedRewardsData.map((reward) => (
                      <div key={reward.id} className="bg-[#1a1f2e] rounded-lg p-5 hover:ring-2 hover:ring-[#00D9FF] transition-all">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 flex-1">
                            <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-4 rounded-lg">
                              <TrendingUp className="text-white" size={28} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-1">
                                <h4 className="text-white font-bold text-lg">
                                  ${reward.minDeposit.toLocaleString()} {reward.maxDeposit ? `- $${reward.maxDeposit.toLocaleString()}` : '& Above'}
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
                              <p className="text-[#00D9FF] font-bold text-3xl">{(reward.rate * 100).toFixed(1)}%</p>
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
                      <p className="text-[#00D9FF] font-bold text-3xl">{productSystemConfig.productsPerSet}</p>
                      <p className="text-gray-400 text-sm mt-1">Number of products in each task set</p>
                    </div>
                    <div className="bg-[#1a1f2e] rounded-lg p-5 border-l-4 border-green-500">
                      <div className="flex items-center gap-3 mb-2">
                        <Zap className="text-green-400" size={24} />
                        <h4 className="text-white font-bold">Max Sets Per Day</h4>
                      </div>
                      <p className="text-green-400 font-bold text-3xl">{productSystemConfig.maxSetsPerDay}</p>
                      <p className="text-gray-400 text-sm mt-1">Maximum task sets users can complete daily</p>
                    </div>
                    <div className="bg-[#1a1f2e] rounded-lg p-5 border-l-4 border-yellow-500">
                      <div className="flex items-center gap-3 mb-2">
                        <Clock className="text-yellow-400" size={24} />
                        <h4 className="text-white font-bold">Min Time Per Product</h4>
                      </div>
                      <p className="text-yellow-400 font-bold text-3xl">{productSystemConfig.minTimePerProduct}s</p>
                      <p className="text-gray-400 text-sm mt-1">Minimum time required per product task</p>
                    </div>
                    <div className="bg-[#1a1f2e] rounded-lg p-5 border-l-4 border-purple-500">
                      <div className="flex items-center gap-3 mb-2">
                        <Check className="text-purple-400" size={24} />
                        <h4 className="text-white font-bold">Auto-Approve Commission</h4>
                      </div>
                      <p className={`font-bold text-3xl ${productSystemConfig.autoApproveCommission ? 'text-green-400' : 'text-red-400'}`}>
                        {productSystemConfig.autoApproveCommission ? 'ON' : 'OFF'}
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
                    <p className="text-gray-400 text-xs mt-1">${salaryPayments.filter(p => p.status === 'Pending').reduce((sum, p) => sum + p.salaryDue, 0).toLocaleString()} total</p>
                  </div>
                  <div className="bg-[#252b3d] border border-gray-700 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Check className="text-green-400" size={18} />
                      <p className="text-gray-400 text-xs">Paid This Month</p>
                    </div>
                    <p className="text-2xl font-bold text-white">{salaryPayments.filter(p => p.status === 'Paid').length}</p>
                    <p className="text-gray-400 text-xs mt-1">${salaryPayments.filter(p => p.status === 'Paid').reduce((sum, p) => sum + p.salaryDue, 0).toLocaleString()} total</p>
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
                      <Send className="text-purple-400" size={18} />
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
                                  {payment.username.charAt(4)}
                                </div>
                                <span className="text-white font-semibold">{payment.username}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-white font-bold">{payment.daysWorked} days</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-[#00D9FF] font-bold text-lg">${payment.salaryDue.toLocaleString()}</span>
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
                                  <Send size={14} />
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

      case 'product-management':
        const filteredProducts = mockProducts.filter(product => {
          const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                               product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                               product.merchant.toLowerCase().includes(searchTerm.toLowerCase()) ||
                               product.sku.toLowerCase().includes(searchTerm.toLowerCase());
          const matchesFilter = filterStatus === 'all' || product.status.toLowerCase() === filterStatus;
          return matchesSearch && matchesFilter;
        });
        const totalProductPages = Math.max(1, Math.ceil(filteredProducts.length / productsPerPage));
        const safeProductPage = Math.min(productPage, totalProductPages);
        const productStartIndex = (safeProductPage - 1) * productsPerPage;
        const paginatedProducts = filteredProducts.slice(productStartIndex, productStartIndex + productsPerPage);

        return (
          <div className="space-y-6">
            {/* Header Actions */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Product Management</h2>
                <p className="text-gray-400 text-sm mt-1">Manage product catalog with manual upload or AI generation</p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setModalType('add-product-manual')} className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors">
                  <Upload size={18} />
                  Add Manually
                </button>
                <button onClick={() => setModalType('add-product-ai')} className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors">
                  <Sparkles size={18} />
                  AI Generate
                </button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-[#252b3d] border border-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="text-blue-400" size={18} />
                  <p className="text-gray-400 text-xs">Total Products</p>
                </div>
                <p className="text-2xl font-bold text-white">{mockProducts.length}</p>
                <p className="text-gray-400 text-xs mt-1">{mockProducts.filter(p => p.status === 'Active').length} active</p>
              </div>
              <div className="bg-[#252b3d] border border-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="text-green-400" size={18} />
                  <p className="text-gray-400 text-xs">Total Value</p>
                </div>
                <p className="text-2xl font-bold text-white">${mockProducts.reduce((sum, p) => sum + (p.price * p.stock), 0).toLocaleString()}</p>
                <p className="text-gray-400 text-xs mt-1">Inventory value</p>
              </div>
              <div className="bg-[#252b3d] border border-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="text-purple-400" size={18} />
                  <p className="text-gray-400 text-xs">AI Generated</p>
                </div>
                <p className="text-2xl font-bold text-white">{mockProducts.filter(p => p.source === 'AI Generated').length}</p>
                <p className="text-gray-400 text-xs mt-1">{((mockProducts.filter(p => p.source === 'AI Generated').length / mockProducts.length) * 100).toFixed(0)}% of total</p>
              </div>
              <div className="bg-[#252b3d] border border-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Upload className="text-blue-400" size={18} />
                  <p className="text-gray-400 text-xs">Manual Upload</p>
                </div>
                <p className="text-2xl font-bold text-white">{mockProducts.filter(p => p.source === 'Manual').length}</p>
                <p className="text-gray-400 text-xs mt-1">{((mockProducts.filter(p => p.source === 'Manual').length / mockProducts.length) * 100).toFixed(0)}% of total</p>
              </div>
            </div>

            {/* Search and Filter Bar */}
            <div className="flex items-center gap-4 bg-[#252b3d] p-4 rounded-lg">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search by name, category, merchant, or SKU..."
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
                <option value="inactive">Inactive</option>
              </select>
              <button onClick={handleExport} className="flex items-center gap-2 bg-[#1a1f2e] hover:bg-[#2c3e50] border border-gray-600 text-white px-4 py-2 rounded-lg transition-colors">
                <Download size={18} />
                Export
              </button>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {paginatedProducts.map((product) => (
                <div key={product.id} className="bg-[#252b3d] rounded-lg overflow-hidden hover:ring-2 hover:ring-[#00D9FF] transition-all group">
                  <div className="relative">
                    <img src={product.imageUrl} alt={product.name} className="w-full h-48 object-cover" />
                    <div className="absolute top-2 right-2 flex gap-2">
                      {product.source === 'AI Generated' && (
                        <span className="px-2 py-1 bg-purple-500/90 backdrop-blur-sm text-white rounded text-xs font-semibold flex items-center gap-1">
                          <Sparkles size={12} />
                          AI
                        </span>
                      )}
                      <span className={`px-2 py-1 backdrop-blur-sm text-white rounded text-xs font-semibold ${
                        product.status === 'Active' ? 'bg-green-500/90' : 'bg-gray-500/90'
                      }`}>
                        {product.status}
                      </span>
                    </div>
                    {product.stock === 0 && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="text-red-400 font-bold text-lg">OUT OF STOCK</span>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="mb-3">
                      <h3 className="text-white font-semibold text-sm mb-1 line-clamp-2">{product.name}</h3>
                      <p className="text-gray-400 text-xs line-clamp-2">{product.description}</p>
                    </div>
                    <div className="flex items-center justify-between text-xs mb-3">
                      <span className="text-gray-400">{product.category}</span>
                      <span className="text-gray-500">SKU: {product.sku}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-3 text-xs">
                      <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded">{product.merchant}</span>
                      <span className="px-2 py-1 bg-gray-700 text-gray-300 rounded">{product.stock} in stock</span>
                    </div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-gray-400 text-xs">Price</p>
                        <p className="text-[#00D9FF] font-bold text-lg">${product.price}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-400 text-xs">Commission</p>
                        <p className="text-green-400 font-bold text-lg">{(product.commission * 100).toFixed(1)}%</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => { setSelectedItem(product); setModalType('view-product'); }}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-[#1a1f2e] hover:bg-[#00D9FF] hover:text-[#1a1f2e] text-gray-300 rounded transition-colors text-xs"
                      >
                        <Eye size={14} />
                        View
                      </button>
                      <button 
                        onClick={() => { setSelectedItem(product); setModalType('edit-product'); }}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-[#1a1f2e] hover:bg-blue-500 hover:text-white text-gray-300 rounded transition-colors text-xs"
                      >
                        <Edit size={14} />
                        Edit
                      </button>
                      <button 
                        onClick={() => { setSelectedItem(product); setModalType('delete-product'); }}
                        className="px-3 py-2 bg-[#1a1f2e] hover:bg-red-500 hover:text-white text-gray-300 rounded transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between bg-[#252b3d] px-6 py-4 rounded-lg">
              <p className="text-sm text-gray-400">
                Showing {filteredProducts.length === 0 ? 0 : productStartIndex + 1}
                -{Math.min(productStartIndex + paginatedProducts.length, filteredProducts.length)} of {filteredProducts.length} products
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setProductPage((current) => Math.max(1, current - 1))}
                  disabled={safeProductPage <= 1}
                  className="px-3 py-1 bg-[#1a1f2e] border border-gray-600 text-gray-400 rounded hover:bg-[#2c3e50] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button className="px-3 py-1 bg-[#00D9FF] text-[#1a1f2e] font-semibold rounded">
                  {safeProductPage} / {totalProductPages}
                </button>
                <button
                  onClick={() => setProductPage((current) => Math.min(totalProductPages, current + 1))}
                  disabled={safeProductPage >= totalProductPages}
                  className="px-3 py-1 bg-[#1a1f2e] border border-gray-600 text-gray-400 rounded hover:bg-[#2c3e50] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        );

      case 'user-management': {
        type DisplayUser = { id: number; username: string; email: string; phone: string; vipLevel: number; balance: number; status: string; registered: string; tasksCompleted: number; referredByAdminName: string; };
        const isRealData = platformUsersLoaded;
        const normalizedUsers: DisplayUser[] = platformUsersLoaded
          ? platformUsers.map((u, i) => ({ id: i + 1, username: u.username, email: '—', phone: '—', vipLevel: u.vipLevel, balance: u.balance, status: u.isFrozen ? 'Suspended' : 'Active', registered: u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—', tasksCompleted: u.tasksCompleted, referredByAdminName: u.referredByAdminName || '—' }))
          : mockUsers.map((u) => ({ ...u, referredByAdminName: '—' }));
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
                              onClick={() => { 
                                if (confirm(`Reset password for ${user.username}?`)) {
                                  toast.success('Password reset link sent to user email');
                                }
                              }}
                              className="p-1 hover:bg-[#1a1f2e] rounded transition-colors" 
                              title="Reset Password"
                            >
                              <Key size={16} className="text-gray-400 hover:text-yellow-400" />
                            </button>
                            {user.status === 'Suspended' ? (
                              <button 
                                onClick={() => { 
                                  if (confirm(`Enable account for ${user.username}?`)) {
                                    toast.success(`Account enabled for ${user.username}`);
                                  }
                                }}
                                className="p-1 hover:bg-[#1a1f2e] rounded transition-colors" 
                                title="Enable Account"
                              >
                                <Check size={16} className="text-gray-400 hover:text-green-400" />
                              </button>
                            ) : (
                              <button 
                                onClick={() => { 
                                  if (confirm(`Disable account for ${user.username}?`)) {
                                    toast.warning(`Account disabled for ${user.username}`);
                                  }
                                }}
                                className="p-1 hover:bg-[#1a1f2e] rounded transition-colors" 
                                title="Disable Account"
                              >
                                <X size={16} className="text-gray-400 hover:text-orange-400" />
                              </button>
                            )}
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

      case 'transactions':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Transaction History</h2>
                <p className="text-gray-400 text-sm mt-1">Monitor all platform transactions</p>
              </div>
              <button onClick={handleExport} className="flex items-center gap-2 bg-[#00D9FF] hover:bg-[#00c5e6] text-[#1a1f2e] px-4 py-2 rounded-lg font-semibold transition-colors">
                <Download size={18} />
                Export Report
              </button>
            </div>

            {/* Transactions Table */}
            <div className="bg-[#252b3d] rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#1a1f2e] border-b border-gray-700">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">TX ID</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Username</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Method</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Date & Time</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">TX Hash</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {mockTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-[#2c3e50] transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-300">#{tx.id}</td>
                        <td className="px-6 py-4 text-sm font-medium text-white">{tx.username}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            tx.type === 'Deposit' ? 'bg-blue-500/20 text-blue-300' :
                            tx.type === 'Withdrawal' ? 'bg-orange-500/20 text-orange-300' :
                            'bg-green-500/20 text-green-300'
                          }`}>
                            {tx.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-[#00D9FF]">${tx.amount.toFixed(2)}</td>
                        <td className="px-6 py-4 text-sm text-gray-300">{tx.method}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            tx.status === 'Completed' ? 'bg-green-500/20 text-green-300' :
                            tx.status === 'Pending' ? 'bg-yellow-500/20 text-yellow-300' :
                            'bg-red-500/20 text-red-300'
                          }`}>
                            {tx.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400">{tx.date}</td>
                        <td className="px-6 py-4 text-sm text-gray-500 font-mono">{tx.txHash}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case 'tasks':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Task Management</h2>
                <p className="text-gray-400 text-sm mt-1">Manage product submission tasks for all merchants</p>
              </div>
              <button onClick={() => setModalType('add-task')} className="flex items-center gap-2 bg-[#00D9FF] hover:bg-[#00c5e6] text-[#1a1f2e] px-4 py-2 rounded-lg font-semibold transition-colors">
                <Plus size={18} />
                Add Task
              </button>
            </div>

            {/* Tasks Grid */}
            <div className="grid grid-cols-1 gap-4">
              {mockTasks.map((task) => (
                <div key={task.id} className="bg-[#252b3d] rounded-lg p-6 hover:bg-[#2c3e50] transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-white">{task.product}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          task.status === 'Active' ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-300'
                        }`}>
                          {task.status}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm mb-4">Merchant: <span className="text-white font-semibold">{task.merchant}</span></p>
                      <div className="grid grid-cols-4 gap-4">
                        <div className="bg-[#1a1f2e] p-3 rounded-lg">
                          <p className="text-gray-400 text-xs">Product Price</p>
                          <p className="text-white font-bold text-lg">${task.price}</p>
                        </div>
                        <div className="bg-[#1a1f2e] p-3 rounded-lg">
                          <p className="text-gray-400 text-xs">Commission</p>
                          <p className="text-[#00D9FF] font-bold text-lg">{(task.commission * 100).toFixed(1)}%</p>
                        </div>
                        <div className="bg-[#1a1f2e] p-3 rounded-lg">
                          <p className="text-gray-400 text-xs">Assigned Users</p>
                          <p className="text-purple-300 font-bold text-lg">{task.assignedUsers}</p>
                        </div>
                        <div className="bg-[#1a1f2e] p-3 rounded-lg">
                          <p className="text-gray-400 text-xs">Completed Today</p>
                          <p className="text-green-300 font-bold text-lg">{task.completedToday}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 ml-4">
                      <button className="p-2 bg-[#1a1f2e] hover:bg-blue-500/20 rounded-lg transition-colors">
                        <Edit size={18} className="text-blue-400" />
                      </button>
                      <button className="p-2 bg-[#1a1f2e] hover:bg-red-500/20 rounded-lg transition-colors">
                        <Trash2 size={18} className="text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'vip-config':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">VIP Level Configuration</h2>
                <p className="text-gray-400 text-sm mt-1">Configure VIP tiers, benefits, and commission rates</p>
              </div>
            </div>

            {/* VIP Levels Grid */}
            <div className="grid grid-cols-1 gap-4">
              {vipLevels.map((vip) => (
                <div key={vip.level} className="bg-[#252b3d] rounded-lg p-6 border-l-4 border-purple-500">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-4">
                        <Shield className="text-purple-400" size={24} />
                        <h3 className="text-xl font-bold text-white">{vip.name}</h3>
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300">
                          Level {vip.level}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-4">
                        <div className="bg-[#1a1f2e] p-4 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <DollarSign size={16} className="text-gray-400" />
                            <p className="text-gray-400 text-xs">Investment Required</p>
                          </div>
                          <p className="text-white font-bold text-xl">${vip.investment.toLocaleString()}</p>
                        </div>
                        <div className="bg-[#1a1f2e] p-4 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Target size={16} className="text-gray-400" />
                            <p className="text-gray-400 text-xs">Daily Tasks</p>
                          </div>
                          <p className="text-[#00D9FF] font-bold text-xl">{vip.dailyTasks}</p>
                        </div>
                        <div className="bg-[#1a1f2e] p-4 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Percent size={16} className="text-gray-400" />
                            <p className="text-gray-400 text-xs">Commission Rate</p>
                          </div>
                          <p className="text-green-400 font-bold text-xl">{(vip.commission * 100).toFixed(1)}%</p>
                        </div>
                        <div className="bg-[#1a1f2e] p-4 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <TrendingUp size={16} className="text-gray-400" />
                            <p className="text-gray-400 text-xs">Max Daily Earnings</p>
                          </div>
                          <p className="text-purple-300 font-bold text-xl">${(vip.dailyTasks * 100 * vip.commission).toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                    <button className="ml-4 p-2 bg-[#1a1f2e] hover:bg-blue-500/20 rounded-lg transition-colors">
                      <Edit size={18} className="text-blue-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'withdrawals':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Withdrawal Requests</h2>
                <p className="text-gray-400 text-sm mt-1">Review and approve user withdrawal requests</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-2 bg-yellow-500/20 text-yellow-300 rounded-lg text-sm font-semibold">
                  {mockWithdrawals.filter(w => w.status === 'Pending').length} Pending
                </span>
              </div>
            </div>

            {/* Withdrawals Table */}
            <div className="bg-[#252b3d] rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#1a1f2e] border-b border-gray-700">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">ID</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Username</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Method</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Wallet Address</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Requested</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {mockWithdrawals.map((withdrawal) => (
                      <tr key={withdrawal.id} className="hover:bg-[#2c3e50] transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-300">#{withdrawal.id}</td>
                        <td className="px-6 py-4 text-sm font-medium text-white">{withdrawal.username}</td>
                        <td className="px-6 py-4 text-sm font-bold text-[#00D9FF]">${withdrawal.amount.toFixed(2)}</td>
                        <td className="px-6 py-4 text-sm text-gray-300">{withdrawal.method}</td>
                        <td className="px-6 py-4 text-sm text-gray-400 font-mono text-xs">{withdrawal.walletAddress.slice(0, 10)}...{withdrawal.walletAddress.slice(-8)}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            withdrawal.status === 'Pending' ? 'bg-yellow-500/20 text-yellow-300' :
                            withdrawal.status === 'Approved' ? 'bg-green-500/20 text-green-300' :
                            'bg-red-500/20 text-red-300'
                          }`}>
                            {withdrawal.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400">{withdrawal.requestedDate}</td>
                        <td className="px-6 py-4 text-sm">
                          {withdrawal.status === 'Pending' ? (
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => handleApproveWithdrawal(withdrawal.id)}
                                className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                              >
                                <Check size={14} />
                                Approve
                              </button>
                              <button 
                                onClick={() => handleRejectWithdrawal(withdrawal.id)}
                                className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                              >
                                <X size={14} />
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-gray-500 text-xs">Processed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case 'deposits':
        const deposits = mockTransactions.filter(tx => tx.type === 'Deposit');
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Deposit Records</h2>
                <p className="text-gray-400 text-sm mt-1">Track all user deposits and funding transactions</p>
              </div>
              <button onClick={handleExport} className="flex items-center gap-2 bg-[#00D9FF] hover:bg-[#00c5e6] text-[#1a1f2e] px-4 py-2 rounded-lg font-semibold transition-colors">
                <Download size={18} />
                Export
              </button>
            </div>

            {/* Deposits Table */}
            <div className="bg-[#252b3d] rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#1a1f2e] border-b border-gray-700">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">TX ID</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Username</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Method</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Date & Time</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">TX Hash</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {deposits.map((tx) => (
                      <tr key={tx.id} className="hover:bg-[#2c3e50] transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-300">#{tx.id}</td>
                        <td className="px-6 py-4 text-sm font-medium text-white">{tx.username}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-green-400">${tx.amount.toFixed(2)}</td>
                        <td className="px-6 py-4 text-sm text-gray-300">{tx.method}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            tx.status === 'Completed' ? 'bg-green-500/20 text-green-300' :
                            tx.status === 'Pending' ? 'bg-yellow-500/20 text-yellow-300' :
                            'bg-red-500/20 text-red-300'
                          }`}>
                            {tx.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400">{tx.date}</td>
                        <td className="px-6 py-4 text-sm text-gray-500 font-mono">{tx.txHash}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case 'notifications':
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

      case 'premium-bundles':
        return <PremiumBundles mockUsers={mockUsers} />;

      case 'customer-support':
        return <CustomerSupport />;

      case 'settings':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Platform Settings</h2>
              <p className="text-gray-400 text-sm mt-1">Configure global platform settings and parameters</p>
            </div>

            {/* Settings Sections */}
            <div className="space-y-4">
              <div className="bg-[#252b3d] rounded-lg p-6">
                <h3 className="text-white font-semibold text-lg mb-4">General Settings</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white">Platform Maintenance Mode</p>
                      <p className="text-gray-400 text-sm">Temporarily disable user access</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00D9FF]"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white">Allow New User Registration</p>
                      <p className="text-gray-400 text-sm">Enable or disable new sign-ups</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00D9FF]"></div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="bg-[#252b3d] rounded-lg p-6">
                <h3 className="text-white font-semibold text-lg mb-4">Transaction Settings</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Minimum Withdrawal Amount ($)</label>
                    <input type="number" defaultValue="50" className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Maximum Withdrawal Amount ($)</label>
                    <input type="number" defaultValue="10000" className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Withdrawal Fee (%)</label>
                    <input type="number" step="0.1" defaultValue="2.0" className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Minimum Deposit Amount ($)</label>
                    <input type="number" defaultValue="10" className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" />
                  </div>
                </div>
              </div>

              <div className="bg-[#252b3d] rounded-lg p-6">
                <h3 className="text-white font-semibold text-lg mb-4">Task Settings</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Task Refresh Time (hours)</label>
                    <input type="number" defaultValue="24" className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Auto-Assign Tasks</label>
                    <select className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none">
                      <option>Enabled</option>
                      <option>Disabled</option>
                    </select>
                  </div>
                </div>
              </div>

              <button className="w-full bg-[#00D9FF] hover:bg-[#00c5e6] text-[#1a1f2e] font-bold py-3 rounded-lg transition-colors">
                Save All Settings
              </button>
            </div>
          </div>
        );

      case 'financials':
        // Calculate financial metrics
        const totalDeposits = mockTransactions
          .filter(tx => tx.type === 'Deposit' && tx.status === 'Completed')
          .reduce((sum, tx) => sum + tx.amount, 0);
        
        const totalWithdrawals = mockTransactions
          .filter(tx => tx.type === 'Withdrawal' && tx.status === 'Completed')
          .reduce((sum, tx) => sum + tx.amount, 0);
        
        const totalCommissions = mockTransactions
          .filter(tx => tx.type === 'Commission' && tx.status === 'Completed')
          .reduce((sum, tx) => sum + tx.amount, 0);
        
        const totalUserBalances = mockUsers.reduce((sum, user) => sum + user.balance, 0);
        const totalEarnings = mockUsers.reduce((sum, user) => sum + user.totalEarnings, 0);
        const platformRevenue = totalDeposits - totalWithdrawals - totalCommissions;
        const pendingWithdrawalAmount = mockWithdrawals
          .filter(w => w.status === 'Pending')
          .reduce((sum, w) => sum + w.amount, 0);

        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Financial Overview</h2>
                <p className="text-gray-400 text-sm mt-1">Comprehensive financial analytics and metrics</p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={handleExport} className="flex items-center gap-2 bg-[#00D9FF] hover:bg-[#00c5e6] text-[#1a1f2e] px-4 py-2 rounded-lg font-semibold transition-colors">
                  <Download size={18} />
                  Export Report
                </button>
              </div>
            </div>

            {/* Primary Financial Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Total Revenue */}
              <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30 rounded-lg p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-3 bg-green-500/20 rounded-lg">
                    <TrendingUp className="text-green-400" size={24} />
                  </div>
                  <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded text-xs font-semibold">+12.5%</span>
                </div>
                <p className="text-gray-400 text-sm mb-1">Total Revenue</p>
                <p className="text-3xl font-bold text-white mb-2">${platformRevenue.toFixed(2)}</p>
                <div className="flex items-center gap-1 text-green-400 text-xs">
                  <ArrowUpRight size={14} />
                  <span>$8,432 from last month</span>
                </div>
              </div>

              {/* Total Deposits */}
              <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-lg p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-3 bg-blue-500/20 rounded-lg">
                    <ArrowDownRight className="text-blue-400" size={24} />
                  </div>
                  <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs font-semibold">Income</span>
                </div>
                <p className="text-gray-400 text-sm mb-1">Total Deposits</p>
                <p className="text-3xl font-bold text-white mb-2">${totalDeposits.toFixed(2)}</p>
                <p className="text-gray-400 text-xs">{mockTransactions.filter(tx => tx.type === 'Deposit').length} transactions</p>
              </div>

              {/* Total Withdrawals */}
              <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 border border-orange-500/30 rounded-lg p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-3 bg-orange-500/20 rounded-lg">
                    <ArrowUpRight className="text-orange-400" size={24} />
                  </div>
                  <span className="px-2 py-1 bg-orange-500/20 text-orange-300 rounded text-xs font-semibold">Outflow</span>
                </div>
                <p className="text-gray-400 text-sm mb-1">Total Withdrawals</p>
                <p className="text-3xl font-bold text-white mb-2">${totalWithdrawals.toFixed(2)}</p>
                <p className="text-gray-400 text-xs">{mockTransactions.filter(tx => tx.type === 'Withdrawal').length} transactions</p>
              </div>

              {/* Total Commissions Paid */}
              <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-lg p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-3 bg-purple-500/20 rounded-lg">
                    <Percent className="text-purple-400" size={24} />
                  </div>
                  <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs font-semibold">Paid</span>
                </div>
                <p className="text-gray-400 text-sm mb-1">Commissions Paid</p>
                <p className="text-3xl font-bold text-white mb-2">${totalCommissions.toFixed(2)}</p>
                <p className="text-gray-400 text-xs">To {mockUsers.length} active users</p>
              </div>
            </div>

            {/* Secondary Financial Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* User Balances */}
              <div className="bg-[#252b3d] border border-gray-700 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-[#00D9FF]/20 rounded-lg">
                    <Wallet className="text-[#00D9FF]" size={20} />
                  </div>
                  <h3 className="text-white font-semibold">Total User Balances</h3>
                </div>
                <p className="text-3xl font-bold text-[#00D9FF] mb-2">${totalUserBalances.toFixed(2)}</p>
                <p className="text-gray-400 text-sm">Across {mockUsers.length} users</p>
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <p className="text-gray-400 text-xs mb-1">Average Balance</p>
                  <p className="text-white font-semibold">${(totalUserBalances / mockUsers.length).toFixed(2)}</p>
                </div>
              </div>

              {/* Platform Earnings */}
              <div className="bg-[#252b3d] border border-gray-700 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <BarChart3 className="text-green-400" size={20} />
                  </div>
                  <h3 className="text-white font-semibold">Platform Net Profit</h3>
                </div>
                <p className="text-3xl font-bold text-green-400 mb-2">${platformRevenue.toFixed(2)}</p>
                <p className="text-gray-400 text-sm">After all expenses</p>
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Profit Margin</span>
                    <span className="text-green-400 font-semibold">{((platformRevenue / totalDeposits) * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              {/* Pending Withdrawals */}
              <div className="bg-[#252b3d] border border-gray-700 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-yellow-500/20 rounded-lg">
                    <Clock className="text-yellow-400" size={20} />
                  </div>
                  <h3 className="text-white font-semibold">Pending Withdrawals</h3>
                </div>
                <p className="text-3xl font-bold text-yellow-400 mb-2">${pendingWithdrawalAmount.toFixed(2)}</p>
                <p className="text-gray-400 text-sm">{mockWithdrawals.filter(w => w.status === 'Pending').length} requests</p>
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <p className="text-red-400 text-xs">⚠️ Requires immediate action</p>
                </div>
              </div>
            </div>

            {/* Transaction Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Transaction Type Breakdown */}
              <div className="bg-[#252b3d] rounded-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-white font-semibold text-lg">Transaction Breakdown</h3>
                  <PieChart className="text-gray-400" size={20} />
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-400 text-sm">Deposits</span>
                      <span className="text-white font-semibold">${totalDeposits.toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-[#1a1f2e] rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${(totalDeposits / (totalDeposits + totalWithdrawals + totalCommissions)) * 100}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-400 text-sm">Withdrawals</span>
                      <span className="text-white font-semibold">${totalWithdrawals.toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-[#1a1f2e] rounded-full h-2">
                      <div className="bg-orange-500 h-2 rounded-full" style={{ width: `${(totalWithdrawals / (totalDeposits + totalWithdrawals + totalCommissions)) * 100}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-400 text-sm">Commissions</span>
                      <span className="text-white font-semibold">${totalCommissions.toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-[#1a1f2e] rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: `${(totalCommissions / (totalDeposits + totalWithdrawals + totalCommissions)) * 100}%` }}></div>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-gray-700">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 font-semibold">Total Volume</span>
                      <span className="text-[#00D9FF] font-bold text-lg">${(totalDeposits + totalWithdrawals + totalCommissions).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* VIP Revenue Breakdown */}
              <div className="bg-[#252b3d] rounded-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-white font-semibold text-lg">Revenue by VIP Level</h3>
                  <Shield className="text-gray-400" size={20} />
                </div>
                <div className="space-y-3">
                  {vipLevels.map((vip) => {
                    const vipUsers = mockUsers.filter(u => u.vipLevel === vip.name);
                    const vipRevenue = vipUsers.reduce((sum, u) => sum + u.totalEarnings, 0);
                    const maxRevenue = Math.max(...vipLevels.map(v => 
                      mockUsers.filter(u => u.vipLevel === v.name).reduce((s, u) => s + u.totalEarnings, 0)
                    ));
                    
                    return (
                      <div key={vip.level} className="bg-[#1a1f2e] p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Shield className="text-purple-400" size={16} />
                            <span className="text-white font-semibold text-sm">{vip.name}</span>
                            <span className="text-gray-500 text-xs">({vipUsers.length} users)</span>
                          </div>
                          <span className="text-[#00D9FF] font-bold">${vipRevenue.toFixed(2)}</span>
                        </div>
                        <div className="w-full bg-[#252b3d] rounded-full h-1.5">
                          <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${(vipRevenue / maxRevenue) * 100}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                  <div className="pt-3 border-t border-gray-700">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 font-semibold">Total User Earnings</span>
                      <span className="text-green-400 font-bold text-lg">${totalEarnings.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-[#252b3d] border border-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="text-gray-400" size={16} />
                  <p className="text-gray-400 text-xs">Active Users</p>
                </div>
                <p className="text-2xl font-bold text-white">{mockUsers.filter(u => u.status === 'Active').length}</p>
                <p className="text-green-400 text-xs mt-1">
                  {((mockUsers.filter(u => u.status === 'Active').length / mockUsers.length) * 100).toFixed(1)}% of total
                </p>
              </div>

              <div className="bg-[#252b3d] border border-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="text-gray-400" size={16} />
                  <p className="text-gray-400 text-xs">Tasks Completed</p>
                </div>
                <p className="text-2xl font-bold text-white">{mockUsers.reduce((sum, u) => sum + u.tasksCompleted, 0)}</p>
                <p className="text-blue-400 text-xs mt-1">
                  {mockTasks.reduce((sum, t) => sum + t.completedToday, 0)} today
                </p>
              </div>

              <div className="bg-[#252b3d] border border-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="text-gray-400" size={16} />
                  <p className="text-gray-400 text-xs">Avg Commission Rate</p>
                </div>
                <p className="text-2xl font-bold text-white">
                  {((mockUsers.reduce((sum, u) => sum + vipLevels.find(v => v.name === u.vipLevel)!.commission, 0) / mockUsers.length) * 100).toFixed(2)}%
                </p>
                <p className="text-purple-400 text-xs mt-1">Across all VIP levels</p>
              </div>

              <div className="bg-[#252b3d] border border-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="text-gray-400" size={16} />
                  <p className="text-gray-400 text-xs">Monthly Growth</p>
                </div>
                <p className="text-2xl font-bold text-white">+12.5%</p>
                <p className="text-green-400 text-xs mt-1 flex items-center gap-1">
                  <ArrowUpRight size={12} />
                  Trending upward
                </p>
              </div>
            </div>
          </div>
        );

      case 'home':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Dashboard Overview</h2>
            
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Total Users</p>
                    <p className="text-3xl font-bold text-white mt-2">{mockUsers.length}</p>
                    <p className="text-green-400 text-xs mt-2">+12.5% from last month</p>
                  </div>
                  <Users className="text-blue-400" size={40} />
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Total Revenue</p>
                    <p className="text-3xl font-bold text-white mt-2">$89,432</p>
                    <p className="text-green-400 text-xs mt-2">+8.3% from last month</p>
                  </div>
                  <DollarSign className="text-green-400" size={40} />
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Active Tasks</p>
                    <p className="text-3xl font-bold text-white mt-2">{mockTasks.filter(t => t.status === 'Active').length}</p>
                    <p className="text-yellow-400 text-xs mt-2">{mockTasks.reduce((sum, t) => sum + t.completedToday, 0)} completed today</p>
                  </div>
                  <Activity className="text-purple-400" size={40} />
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 border border-orange-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Pending Withdrawals</p>
                    <p className="text-3xl font-bold text-white mt-2">{mockWithdrawals.filter(w => w.status === 'Pending').length}</p>
                    <p className="text-red-400 text-xs mt-2">Requires attention</p>
                  </div>
                  <Bell className="text-orange-400" size={40} />
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-[#252b3d] rounded-lg p-6">
                <h3 className="text-white font-semibold text-lg mb-4">Recent Transactions</h3>
                <div className="space-y-3">
                  {mockTransactions.slice(0, 5).map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-3 bg-[#1a1f2e] rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          tx.type === 'Deposit' ? 'bg-blue-500/20' :
                          tx.type === 'Withdrawal' ? 'bg-orange-500/20' :
                          'bg-green-500/20'
                        }`}>
                          <DollarSign size={16} className={
                            tx.type === 'Deposit' ? 'text-blue-400' :
                            tx.type === 'Withdrawal' ? 'text-orange-400' :
                            'text-green-400'
                          } />
                        </div>
                        <div>
                          <p className="text-white text-sm font-semibold">{tx.username}</p>
                          <p className="text-gray-400 text-xs">{tx.type}</p>
                        </div>
                      </div>
                      <p className="text-[#00D9FF] font-bold">${tx.amount.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#252b3d] rounded-lg p-6">
                <h3 className="text-white font-semibold text-lg mb-4">Top Performers</h3>
                <div className="space-y-3">
                  {mockUsers.sort((a, b) => b.tasksCompleted - a.tasksCompleted).slice(0, 5).map((user, index) => (
                    <div key={user.id} className="flex items-center justify-between p-3 bg-[#1a1f2e] rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                          <span className="text-purple-300 font-bold text-sm">#{index + 1}</span>
                        </div>
                        <div>
                          <p className="text-white text-sm font-semibold">{user.username}</p>
                          <p className="text-gray-400 text-xs">{user.vipLevel}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[#00D9FF] font-bold text-sm">{user.tasksCompleted} tasks</p>
                        <p className="text-green-400 text-xs">${user.totalEarnings.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
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

