import type { SalaryPayment } from '../services/adminSalaryBackup';
import type { VipConfig } from '../services/vipConfig';

export type VipLevelConfig = VipConfig;

export type WalletProfile = {
  type: 'banking' | 'crypto';
  walletType?: string;
  network?: string;
  walletAddress?: string;
  accountNumber?: string;
};

export type ActivePremium = {
  id: string;
  premiumProductName: string;
  premiumProductValue: number;
  totalBundleValue: number;
  bundledProducts: Array<{
    id: string;
    name: string;
    price: number;
    image: string;
  }>;
  commissionEarned: number;
  topUpRequired: number;
  negativeAmount: number;
  balanceBeforeAssignment: number;
  triggerTaskNumber: number;
  image: string;
  status: string;
};

export type AuditDepositRecord = {
  id: string;
  amount: number;
  method: string;
  date: string;
};

export type AuditWithdrawalRecord = {
  id: string;
  amount: number;
  status: string;
  requestedDate: string;
};

export type VipDraftState = {
  investment: string;
  dailyTasks: string;
  commissionPercent: string;
  taskPriceMin: string;
  taskPriceMax: string;
};

export type TaskConfig = {
  id: string;
  merchant: string;
  product: string;
  price: number;
  commission: number;
  status: 'Active' | 'Paused';
  assignedUsers: number;
  completedToday: number;
  image: string;
  imageProxyUrl?: string;
  rating: number;
  productUrl: string;
  category?: string;
  vipTier?: number;
  source?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type TaskDraftState = {
  product: string;
  merchant: string;
  price: string;
  commissionPercent: string;
  status: string;
  image: string;
  rating: string;
  productUrl: string;
};

export type AdminUserRecord = {
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

export type ReferralOverviewRow = {
  username: string;
  invitationCode: string | null;
  invitedByCode: string | null;
  parentUsername: string | null;
  referralEarnings: number;
  childrenCount: number;
  children: string[];
  balance: number;
};

export type ReferralOverviewEvent = {
  parentUsername: string | null;
  childUsername: string | null;
  type: string;
  childCommission: number;
  parentReward: number;
  rate: number;
  createdAt: string;
};

export type ReferralOverviewSummary = {
  totalReferralUsers: number;
  totalReferralEarnings: number;
  totalParentRewards: number;
  referralRate: number;
};

export type PlatformUser = {
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
  walletProfile?: WalletProfile | null;
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

export type PlatformUserAudit = {
  username: string;
  phone: string;
  gender: string;
  invitationCode: string | null;
  invitedByCode: string | null;
  referredByAdminId: string | null;
  walletProfile: WalletProfile | null;
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
  activePremium: ActivePremium | null;
  premiumQueue: ActivePremium[];
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
  deposits: AuditDepositRecord[];
  withdrawals: AuditWithdrawalRecord[];
  transactions: TransactionRecord[];
};

export type UserTaskControlDraft = {
  taskSetCount: string;
};

export type UserBalanceAdjustmentDraft = {
  mode: 'credit' | 'debit';
  amount: string;
  reason: string;
  isBonus: boolean;
  bonusLabel: string;
  bonusAssignmentMode: 'automatic' | 'semi-automatic' | 'manual';
};

export type UserVipLevelDraft = {
  vipLevel: string;
  reason: string;
};

export type TransactionRecord = {
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

export type WithdrawalRequestRecord = {
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

export type MenuItem = {
  id: string;
  label: string;
  icon: import('react').ReactNode;
  badge?: number;
};

export type ModalType = 'add-user' | 'edit-user' | 'view-user' | 'delete-user' | 'adjust-user-balance' | 'view-transaction' | 'approve-withdrawal' | 'reject-withdrawal' | 'add-task' | 'edit-vip' | 'notification' | 'add-product-manual' | 'add-product-ai' | 'edit-product' | 'view-product' | 'delete-product' | 'bulk-generate-products' | 'bulk-import-products' | 'edit-workday-reward' | 'edit-reset-reward' | 'edit-accumulated-reward' | 'edit-product-system' | 'pay-salary' | 'pay-salary-bulk' | 'add-admin' | 'edit-admin' | 'view-admin' | 'delete-admin' | 'admin-invitation-code' | 'add-role' | 'edit-role' | 'view-role-permissions' | 'delete-role' | null;

export type AdminRolePermissions = {
  dashboard: boolean;
  financials: boolean;
  rewardsSystem: boolean;
  productManagement: boolean;
  userManagement: boolean;
  transactions: boolean;
  taskManagement: boolean;
  vipConfig: boolean;
  withdrawals: boolean;
  deposits: boolean;
  notifications: boolean;
  settings: boolean;
  adminUsers: boolean;
  deleteUsers: boolean;
  editRoles: boolean;
  processPayments: boolean;
  viewReports: boolean;
};

export type AdminRole = {
  id: number;
  name: string;
  description: string;
  color: string;
  permissions: AdminRolePermissions;
  createdDate: string;
  isDefault: boolean;
};

export function formatRelativeTime(timestamp: string): string {
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
