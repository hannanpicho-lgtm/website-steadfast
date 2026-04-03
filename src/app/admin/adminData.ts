import type { SalaryPayment } from '../services/adminSalaryBackup';
import type { VipConfig } from '../services/vipConfig';
import type { AdminRole } from './adminTypes';

export const defaultVipConfigurations: VipConfig[] = [
  { level: 1, name: 'VIP 1', investment: 100, dailyTasks: 40, commission: 0.005, color: 'bronze' },
  { level: 2, name: 'VIP 2', investment: 500, dailyTasks: 45, commission: 0.010, color: 'silver' },
  { level: 3, name: 'VIP 3', investment: 1600, dailyTasks: 50, commission: 0.015, color: 'gold' },
  { level: 4, name: 'VIP 4', investment: 5500, dailyTasks: 55, commission: 0.020, color: 'platinum' },
  { level: 5, name: 'VIP 5', investment: 10000, dailyTasks: 60, commission: 0.025, color: 'diamond' },
];

export const initialProductCatalog: any[] = [];

export const initialSalaryPayments: SalaryPayment[] = [
  { id: 1, username: 'user001', daysWorked: 15, salaryDue: 3060, status: 'Pending', dueDate: '2024-03-10', paymentMode: 'Automatic' },
  { id: 2, username: 'user002', daysWorked: 22, salaryDue: 4488, status: 'Paid', dueDate: '2024-03-09', paidDate: '2024-03-09', paymentMode: 'Automatic' },
  { id: 3, username: 'user003', daysWorked: 30, salaryDue: 6120, status: 'Pending', dueDate: '2024-03-10', paymentMode: 'Manual' },
  { id: 4, username: 'user004', daysWorked: 7, salaryDue: 1428, status: 'Pending', dueDate: '2024-03-11', paymentMode: 'Automatic' },
  { id: 5, username: 'user005', daysWorked: 1, salaryDue: 204, status: 'Paid', dueDate: '2024-03-08', paidDate: '2024-03-08', paymentMode: 'Automatic' },
];

export const initialAdminRoles: AdminRole[] = [
  { id: 1, name: 'Super Admin', description: 'Full system access with all permissions', color: 'red', permissions: { dashboard: true, financials: true, rewardsSystem: true, productManagement: true, userManagement: true, transactions: true, taskManagement: true, vipConfig: true, withdrawals: true, deposits: true, notifications: true, settings: true, adminUsers: true, deleteUsers: true, editRoles: true, processPayments: true, viewReports: true }, createdDate: '2024-01-01', isDefault: true },
  { id: 2, name: 'Finance Manager', description: 'Manage financial operations, withdrawals, and deposits', color: 'green', permissions: { dashboard: true, financials: true, rewardsSystem: true, productManagement: false, userManagement: true, transactions: true, taskManagement: false, vipConfig: false, withdrawals: true, deposits: true, notifications: true, settings: false, adminUsers: false, deleteUsers: false, editRoles: false, processPayments: true, viewReports: true }, createdDate: '2024-01-15', isDefault: false },
  { id: 3, name: 'Product Manager', description: 'Manage products, tasks, and user submissions', color: 'blue', permissions: { dashboard: true, financials: false, rewardsSystem: false, productManagement: true, userManagement: true, transactions: false, taskManagement: true, vipConfig: false, withdrawals: false, deposits: false, notifications: true, settings: false, adminUsers: false, deleteUsers: false, editRoles: false, processPayments: false, viewReports: true }, createdDate: '2024-02-01', isDefault: false },
  { id: 4, name: 'Support Agent', description: 'Handle user support and basic operations', color: 'purple', permissions: { dashboard: true, financials: false, rewardsSystem: false, productManagement: false, userManagement: true, transactions: true, taskManagement: false, vipConfig: false, withdrawals: false, deposits: false, notifications: true, settings: false, adminUsers: false, deleteUsers: false, editRoles: false, processPayments: false, viewReports: false }, createdDate: '2024-02-10', isDefault: false },
  { id: 5, name: 'Content Moderator', description: 'Monitor and moderate platform content', color: 'yellow', permissions: { dashboard: true, financials: false, rewardsSystem: false, productManagement: true, userManagement: true, transactions: false, taskManagement: true, vipConfig: false, withdrawals: false, deposits: false, notifications: true, settings: false, adminUsers: false, deleteUsers: false, editRoles: false, processPayments: false, viewReports: false }, createdDate: '2024-02-20', isDefault: false },
  { id: 6, name: 'Admin', description: 'General admin access for user and operations management', color: 'cyan', permissions: { dashboard: true, financials: true, rewardsSystem: true, productManagement: true, userManagement: true, transactions: true, taskManagement: true, vipConfig: false, withdrawals: true, deposits: true, notifications: true, settings: false, adminUsers: true, deleteUsers: false, editRoles: false, processPayments: true, viewReports: true }, createdDate: '2024-03-17', isDefault: false },
];
