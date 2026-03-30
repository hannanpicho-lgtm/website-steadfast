import { useEffect, useMemo, useRef, useState } from 'react';
import { projectId } from '@utils/supabase/info';
import { Lock, Calculator, AlertTriangle, Info, Eye, XCircle } from 'lucide-react';
import type { VipConfig } from '../../services/vipConfig';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { buildAdminAuthHeaders } from '../../services/supabaseAuth';
import { handleAdminAuthError } from '../../services/adminAuthError';

interface User {
  id: number | string;
  username: string;
  vipLevel: string;
  balance: number;
  totalCommission: number;
}

interface PremiumAssignmentRecord {
  id: string;
  username: string;
  vipLevel: number;
  premiumProductValue: number;
  triggerTaskNumber?: number;
  totalBundleValue: number;
  balanceAfterAssignment: number;
  tasksCompleted: number;
  totalTasks: number;
  assignedAt: string;
  status: string;
  queuePosition: number;
  isActive: boolean;
  bundledProducts?: Array<{ id: number; name: string; price: number }>;
  topUpRequired?: number;
}

interface PremiumBundlesProps {
  users: User[];
  vipConfigs: VipConfig[];
}

export default function PremiumBundles({ users, vipConfigs }: PremiumBundlesProps) {
  const navigate = useNavigate();
  const [selectedUsername, setSelectedUsername] = useState('');
  const [premiumValue, setPremiumValue] = useState('');
  const [triggerTaskNumber, setTriggerTaskNumber] = useState('');
  const [upholdAmountOverride, setUpholdAmountOverride] = useState('');
  const [selectedBundledProductIds, setSelectedBundledProductIds] = useState<number[]>([3]);
  const [bundledValueOverrides, setBundledValueOverrides] = useState<Record<number, string>>({ 3: '549.99' });
  const [assigningPremium, setAssigningPremium] = useState(false);
  const [assignments, setAssignments] = useState<PremiumAssignmentRecord[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<PremiumAssignmentRecord | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const adminAuthRedirectedRef = useRef(false);

  const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a1c55d7e`;

  const handleAdminError = (errorValue: unknown, fallbackMessage: string, suppressToast = false) => {
    handleAdminAuthError({
      errorValue,
      fallbackMessage,
      navigate,
      redirectedRef: adminAuthRedirectedRef,
      suppressToast,
    });
  };

  const productCatalog = [
    { id: 1, name: 'Premium Wireless Headphones', price: 299.99 },
    { id: 2, name: 'Smart Watch Pro', price: 399.00 },
    { id: 3, name: '10-inch Tablet', price: 549.99 },
  ];

  // Calculate preview
  const selectedUser = useMemo(() => users.find((u) => u.username === selectedUsername), [users, selectedUsername]);
  const filteredUsers = userSearch
    ? users.filter((u) => u.username.toLowerCase().includes(userSearch.toLowerCase()))
    : users;
  const hasExplicitPremiumValue = premiumValue.trim() !== '';
  const premiumVal = parseFloat(premiumValue) || 0;
  const bundledProducts = useMemo(() => {
    const byId = new Map(productCatalog.map((product) => [product.id, product] as const));
    return selectedBundledProductIds
      .map((id) => {
        const baseProduct = byId.get(id);
        if (!baseProduct) {
          return null;
        }
        const overridePrice = Number(bundledValueOverrides[id]);
        const price = Number.isFinite(overridePrice) && overridePrice > 0
          ? Math.round((overridePrice + Number.EPSILON) * 100) / 100
          : baseProduct.price;
        return {
          ...baseProduct,
          price,
        };
      })
      .filter((product): product is { id: number; name: string; price: number; rating: number; image: string } => Boolean(product));
  }, [bundledValueOverrides, productCatalog, selectedBundledProductIds]);
  const bundledTotal = bundledProducts.reduce((sum, p) => sum + p.price, 0);
  const totalBundleValue = premiumVal + bundledTotal;
  const userBalance = selectedUser?.balance || 0;
  const balanceAfter = userBalance - totalBundleValue;
  const upholdVal = parseFloat(upholdAmountOverride) || 0;
  const triggerTaskNumberValue = parseInt(triggerTaskNumber, 10) || 0;
  const topUpRequired = upholdVal > 0 ? upholdVal : (balanceAfter < 0 ? Math.abs(balanceAfter) : 0);

  // Premium commission calculations
  const vipLevelNum = parseInt(selectedUser?.vipLevel ?? '1', 10) || 1;
  const vipCommissionRate = vipConfigs.find((c) => c.level === vipLevelNum)?.commission ?? 0.005;
  const premiumCommissionRate = vipCommissionRate * 10; // 10× multiplier for premium tasks
  const premiumBundleCommission = Math.round(premiumCommissionRate * totalBundleValue * 100) / 100;
  const totalAccountBalance = Math.round((userBalance + topUpRequired + premiumBundleCommission) * 100) / 100;
  const preBundleCommission = selectedUser?.totalCommission ?? 0;
  const projectedTotalCommission = Math.round((preBundleCommission + premiumBundleCommission) * 100) / 100;

  const activeAssignments = useMemo(
    () => assignments.filter((assignment) => assignment.status === 'active' || assignment.status === 'awaiting_funds' || assignment.status === 'scheduled'),
    [assignments],
  );

  const loadAssignments = async () => {
    try {
      setAssignmentsLoading(true);
      const response = await fetch(`${serverUrl}/admin/premium-assignments`, {
        headers: await buildAdminAuthHeaders(false),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to load premium assignments');
      }

      setAssignments(Array.isArray(payload?.assignments) ? payload.assignments : []);
    } catch (error) {
      console.error('Error loading premium assignments:', error);
      setAssignments([]);
      handleAdminError(error, 'Failed to load premium assignments', true);
    } finally {
      setAssignmentsLoading(false);
    }
  };

  useEffect(() => {
    void loadAssignments();
  }, []);

  const handleCancelAssignment = async (assignment: PremiumAssignmentRecord) => {
    if (!window.confirm(`Cancel premium assignment for ${assignment.username}?`)) {
      return;
    }

    const cancelToastId = `premium-cancel-${assignment.id}`;
    try {
      toast.loading('Cancelling assignment...', { id: cancelToastId });
      const response = await fetch(`${serverUrl}/admin/cancel-premium/${assignment.username}/${assignment.id}`, {
        method: 'DELETE',
        headers: await buildAdminAuthHeaders(),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to cancel premium assignment');
      }
      await loadAssignments();
      toast.success('Premium assignment cancelled successfully.', { id: cancelToastId });
    } catch (error) {
      console.error('Error cancelling premium assignment:', error);
      toast.dismiss(cancelToastId);
      handleAdminError(error, 'Failed to cancel premium assignment');
    }
  };

  const handleAssignPremium = async () => {
    if (!selectedUsername) {
      toast.error('Please select a user.');
      return;
    }

    if (triggerTaskNumber && (!Number.isInteger(triggerTaskNumberValue) || triggerTaskNumberValue <= 0)) {
      toast.error('Position number must be a whole number greater than 0.');
      return;
    }

    const effectiveTrigger = triggerTaskNumberValue > 0 ? triggerTaskNumberValue : 1;
    if (!bundledProducts.length) {
      toast.error('Please select at least one bundled product.');
      return;
    }

    if (!window.confirm(`Assign premium bundle to ${selectedUsername}?\n\nPremium Position: Task #${effectiveTrigger}\nPremium Product Value: ${hasExplicitPremiumValue ? `$${premiumVal.toFixed(2)}` : 'Auto-calculate'}\nBundled Products: ${bundledProducts.length}\nTotal Bundle Value: $${totalBundleValue.toFixed(2)}\nBalance After: $${balanceAfter.toFixed(2)}\nTop-up Required: $${topUpRequired.toFixed(2)}`)) {
      return;
    }

    const assignToastId = 'admin-assign-premium';
    try {
      setAssigningPremium(true);
      toast.loading('Assigning premium bundle...', { id: assignToastId });

      const response = await fetch(`${serverUrl}/admin/assign-premium-bundle`, {
        method: 'POST',
        headers: await buildAdminAuthHeaders(),
        body: JSON.stringify({
          username: selectedUsername,
          premiumProductValue: hasExplicitPremiumValue ? premiumVal : undefined,
          bundledProductCount: bundledProducts.length,
          selectedBundledProducts: bundledProducts.map((product) => ({
            id: product.id,
            name: product.name,
            price: product.price,
          })),
          triggerTaskNumber: triggerTaskNumberValue > 0 ? triggerTaskNumberValue : undefined,
          upholdAmountOverride: upholdVal > 0 ? upholdVal : undefined,
          adminUsername: 'admin',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let error;
        try {
          error = JSON.parse(errorText);
        } catch (e) {
          throw new Error(`Server error: ${response.status} - ${errorText}`);
        }
        throw new Error(error.error || 'Failed to assign premium bundle');
      }

      const result = await response.json();
      const queuePosition = Number.isFinite(Number(result?.queuePosition))
        ? Math.max(1, Math.round(Number(result.queuePosition)))
        : 1;
      const settledBalanceAfter = Number.isFinite(Number(result?.balanceAfter ?? result?.balanceAfterAssignment))
        ? Number(result.balanceAfter ?? result.balanceAfterAssignment)
        : balanceAfter;
      const settledTopUpRequired = Number.isFinite(Number(result?.topUpRequired ?? result?.negativeAmount))
        ? Number(result.topUpRequired ?? result.negativeAmount)
        : topUpRequired;

      toast.success(
        `Premium bundle assigned to queue ${queuePosition}. Balance after: $${settledBalanceAfter.toFixed(2)}, Top-up: $${settledTopUpRequired.toFixed(2)}`,
        { id: assignToastId },
      );

      // Reset form
      setSelectedUsername('');
      setPremiumValue('');
      setTriggerTaskNumber('');
      setUpholdAmountOverride('');
      setSelectedBundledProductIds([3]);
      setBundledValueOverrides({ 3: '549.99' });
      await loadAssignments();
    } catch (error) {
      console.error('Error assigning premium bundle:', error);
      toast.dismiss(assignToastId);
      handleAdminError(error, 'Failed to assign premium bundle');
    } finally {
      setAssigningPremium(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Premium Bundle Management</h2>
        <p className="text-gray-400 text-sm mt-1">Assign premium bundles to users (Admin-only feature)</p>
      </div>

      {/* Assign Premium Bundle Form */}
      <div className="bg-[#252b3d] rounded-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-gradient-to-br from-yellow-500 to-orange-500 p-3 rounded-lg">
            <Lock className="text-white" size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Assign Premium Bundle</h3>
            <p className="text-gray-400 text-sm">Bundle premium product with high-value items</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column - Form */}
          <div className="space-y-4">
            {/* User Selection */}
            <div>
              <label className="block text-gray-300 text-sm font-semibold mb-2">
                Select User <span className="text-red-400">*</span>
              </label>
              <div>
                <input
                  type="text"
                  placeholder="Search by username..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full bg-[#1a1f2e] text-white border border-gray-600 rounded-t px-4 py-2 focus:outline-none focus:border-[#00D9FF] placeholder-gray-500 text-sm border-b-0"
                />
                <select
                  value={selectedUsername}
                  onChange={(e) => setSelectedUsername(e.target.value)}
                  className="w-full bg-[#1a1f2e] text-white border border-gray-600 rounded-b px-4 py-2 focus:outline-none focus:border-[#00D9FF]"
                >
                  <option value="">-- Select User --</option>
                  {filteredUsers.map(user => (
                    <option key={user.id} value={user.username}>
                      {user.username} - VIP{user.vipLevel.slice(-1)} - Balance: ${user.balance.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Premium Product Value */}
            <div>
              <label className="block text-gray-300 text-sm font-semibold mb-2">
                Premium Product Value (USD)
              </label>
              <input
                type="number"
                value={premiumValue}
                onChange={(e) => setPremiumValue(e.target.value)}
                placeholder="Optional: enter premium value"
                min="0"
                step="0.01"
                className="w-full bg-[#1a1f2e] text-white border border-gray-600 rounded px-4 py-2 focus:outline-none focus:border-[#00D9FF]"
              />
              <p className="text-gray-300 text-xs mt-1">This field is optional for testing.</p>
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-semibold mb-2">
                Position Number Premium Appears
              </label>
              <input
                type="number"
                value={triggerTaskNumber}
                onChange={(e) => setTriggerTaskNumber(e.target.value)}
                placeholder="Optional: e.g. 10 or 30"
                min="1"
                step="1"
                className="w-full bg-[#1a1f2e] text-white border border-gray-600 rounded px-4 py-2 focus:outline-none focus:border-[#00D9FF]"
              />
              <p className="text-gray-300 text-xs mt-1">If empty, the premium can activate immediately. If set, it waits until that task number.</p>
            </div>

            {/* Bundled Product Selection */}
            <div>
              <label className="block text-gray-300 text-sm font-semibold mb-2">
                Select Bundled Products <span className="text-red-400">*</span>
              </label>
              <div className="space-y-2">
                {productCatalog.map((product) => {
                  const isSelected = selectedBundledProductIds.includes(product.id);
                  return (
                    <label
                      key={product.id}
                      className={`flex items-center justify-between gap-3 p-3 rounded border transition-all ${
                        isSelected
                          ? 'border-[#00D9FF] bg-[#00D9FF]/10'
                          : 'border-gray-600 bg-[#1a1f2e]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedBundledProductIds((prev) =>
                                [...prev, product.id].sort((a, b) => a - b),
                              );
                              // Pre-populate value input with catalog price so it is immediately adjustable
                              setBundledValueOverrides((prev) => ({
                                ...prev,
                                [product.id]: product.price.toFixed(2),
                              }));
                            } else {
                              setSelectedBundledProductIds((prev) =>
                                prev.filter((id) => id !== product.id),
                              );
                              setBundledValueOverrides((prev) => {
                                const next = { ...prev };
                                delete next[product.id];
                                return next;
                              });
                            }
                          }}
                          className="h-4 w-4 accent-[#00D9FF]"
                        />
                        <div>
                          <p className="text-white text-sm font-semibold">{product.name}</p>
                        </div>
                      </div>
                      <input
                        type="number"
                        value={bundledValueOverrides[product.id] ?? ''}
                        onChange={(e) => {
                          const nextValue = e.target.value;
                          setBundledValueOverrides((prev) => ({
                            ...prev,
                            [product.id]: nextValue,
                          }));
                        }}
                        placeholder="Enter value"
                        min="0"
                        step="0.01"
                        disabled={!isSelected}
                        className={`w-28 border rounded px-3 py-1.5 text-sm focus:outline-none focus:border-[#00D9FF] ${
                          isSelected
                            ? 'bg-[#0f1420] text-white border-gray-500'
                            : 'bg-[#0f1420]/40 text-gray-600 border-gray-700 cursor-not-allowed'
                        }`}
                      />
                    </label>
                  );
                })}
              </div>
              <p className="text-gray-300 text-xs mt-1">Check a product to include it. Edit the value field to set a custom price.</p>
            </div>

            {/* Uphold Amount Override (Deterministic) */}
            <div>
              <label className="block text-gray-300 text-sm font-semibold mb-2">
                Uphold Amount Override (USD)
              </label>
              <input
                type="number"
                value={upholdAmountOverride}
                onChange={(e) => setUpholdAmountOverride(e.target.value)}
                placeholder="Leave blank to auto-calculate"
                min="0"
                step="0.01"
                className="w-full bg-[#1a1f2e] text-white border border-gray-600 rounded px-4 py-2 focus:outline-none focus:border-[#00D9FF]"
              />
              <p className="text-gray-300 text-xs mt-1">Set exact uphold (negative) amount. Leave empty to calculate from balance.</p>
            </div>

            {/* Bundled Products Preview */}
            {bundledProducts.length > 0 && (
              <div className="bg-[#1a1f2e] rounded-lg p-4">
                <p className="text-gray-400 text-sm font-semibold mb-2">Products to be bundled:</p>
                <div className="space-y-2">
                  {bundledProducts.map((product, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="text-white">{product.name}</span>
                      <span className="text-[#00D9FF] font-semibold">${product.price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Assign Button */}
            <button
              onClick={handleAssignPremium}
              disabled={!selectedUsername || assigningPremium || bundledProducts.length === 0}
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold py-3 rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {assigningPremium ? 'Assigning...' : 'Assign Premium Bundle'}
            </button>
          </div>

          {/* Right Column - Preview Calculation */}
          <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 rounded-lg p-6 border border-purple-500/30">
            <h4 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
              <Calculator className="text-purple-400" size={20} />
              Calculation Preview
            </h4>

            {selectedUser ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-gray-600">
                  <span className="text-gray-400">User:</span>
                  <span className="text-white font-semibold">{selectedUser.username}</span>
                </div>
                
                <div className="flex items-center justify-between pb-2 border-b border-gray-600">
                  <span className="text-gray-400">Current Balance:</span>
                  <span className="text-white font-semibold">${userBalance.toFixed(2)}</span>
                </div>

                <div className="bg-yellow-500/10 rounded p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-yellow-300 text-sm">Premium Product:</span>
                    <span className="text-yellow-300 font-bold">
                      {hasExplicitPremiumValue ? `$${premiumVal.toFixed(2)}` : 'Auto-calculate'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-yellow-300 text-sm">Bundled Products ({bundledProducts.length}):</span>
                    <span className="text-yellow-300 font-bold">${bundledTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-yellow-300 text-sm">Appears At:</span>
                    <span className="text-yellow-300 font-bold">{triggerTaskNumberValue > 0 ? `Task #${triggerTaskNumberValue}` : 'Immediate / next eligible task'}</span>
                  </div>
                  <div className="border-t border-yellow-500/30 pt-2 flex items-center justify-between">
                    <span className="text-yellow-300 font-semibold">Total Bundle Value:</span>
                    <span className="text-yellow-300 font-bold text-lg">${totalBundleValue.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pb-2">
                  <span className="text-gray-400">Balance After Assignment:</span>
                  <span className={`font-bold text-lg ${balanceAfter < 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {balanceAfter < 0 ? '-' : ''}${Math.abs(balanceAfter).toFixed(2)}
                  </span>
                </div>

                {topUpRequired > 0 && (
                  <div className="bg-red-500/20 border border-red-500/50 rounded p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="text-red-400" size={18} />
                      <span className="text-red-400 font-semibold">Top-up Required</span>
                    </div>
                    <div className="text-red-400 font-bold text-2xl text-center">
                      ${topUpRequired.toFixed(2)}
                    </div>
                  </div>
                )}

                {/* STATE 1: During Assignment — Frozen State */}
                <div className="bg-red-500/10 border border-red-500/30 rounded p-3 space-y-2">
                  <p className="text-red-300 text-xs font-semibold uppercase tracking-wide mb-1">🔒 During Assignment — Account Frozen</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Original Balance:</span>
                    <span className="text-white">${userBalance.toFixed(2)}</span>
                  </div>
                  {topUpRequired > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Top-up Deposited:</span>
                      <span className="text-yellow-300">+${topUpRequired.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Bundle Held (Frozen):</span>
                    <span className="text-red-400">-${totalBundleValue.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-red-500/30 pt-2 flex items-center justify-between">
                    <span className="text-red-300 font-bold">Available Balance:</span>
                    <span className="text-red-300 font-bold text-lg">$0.00</span>
                  </div>
                  <p className="text-red-300/70 text-xs">Account is locked. User must complete all {1 + bundledProducts.length} bundled tasks.</p>
                </div>

                {/* STATE 2: After Completion — Unfrozen */}
                <div className="bg-green-500/10 border border-green-500/30 rounded p-3 space-y-2">
                  <p className="text-green-300 text-xs font-semibold uppercase tracking-wide mb-1">🔓 After Completion — Account Unfrozen</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Frozen Amount Released:</span>
                    <span className="text-white">+${totalBundleValue.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Premium Commission ({(premiumCommissionRate * 100).toFixed(1)}%):</span>
                    <span className="text-green-400">+${premiumBundleCommission.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-green-500/30 pt-2 flex items-center justify-between">
                    <span className="text-green-300 font-bold">Projected Total Balance:</span>
                    <span className="text-green-300 font-bold text-lg">${totalAccountBalance.toFixed(2)}</span>
                  </div>
                  <p className="text-green-300/70 text-xs">User receives frozen funds back + commission earned on the bundle.</p>
                </div>

                {/* Commission breakdown */}
                <div className="bg-purple-500/10 border border-purple-500/30 rounded p-3 space-y-2">
                  <p className="text-purple-300 text-xs font-semibold uppercase tracking-wide mb-1">Commission Breakdown</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Pre-bundle Commission:</span>
                    <span className="text-white">${preBundleCommission.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">This Bundle ({bundledProducts.length} tasks × {(premiumCommissionRate * 100).toFixed(1)}%):</span>
                    <span className="text-purple-300">+${premiumBundleCommission.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-purple-500/30 pt-2 flex items-center justify-between">
                    <span className="text-purple-300 font-bold">Total Commission:</span>
                    <span className="text-purple-300 font-bold text-lg">${projectedTotalCommission.toFixed(2)}</span>
                  </div>
                </div>

                <div className="bg-blue-500/10 rounded p-3">
                  <p className="text-blue-300 text-xs">
                    💡 User's account will be frozen until all {1 + bundledProducts.length} bundled tasks are completed or top-up is made.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-300 text-sm">Select a user to see calculation</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Active Premium Assignments */}
      <div className="bg-[#252b3d] rounded-lg p-6">
        <h3 className="text-xl font-bold text-white mb-4">Active Premium Assignments</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 text-gray-400 font-semibold">User</th>
                <th className="text-left py-3 px-4 text-gray-400 font-semibold">Premium Value</th>
                <th className="text-left py-3 px-4 text-gray-400 font-semibold">Bundle Value</th>
                <th className="text-left py-3 px-4 text-gray-400 font-semibold">Balance After</th>
                <th className="text-left py-3 px-4 text-gray-400 font-semibold">Progress</th>
                <th className="text-left py-3 px-4 text-gray-400 font-semibold">Position</th>
                <th className="text-left py-3 px-4 text-gray-400 font-semibold">Assigned</th>
                <th className="text-right py-3 px-4 text-gray-400 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {assignmentsLoading ? (
                <tr className="border-b border-gray-800">
                  <td colSpan={8} className="py-8 text-center text-gray-300">
                    Loading premium assignments...
                  </td>
                </tr>
              ) : activeAssignments.length === 0 ? (
                <tr className="border-b border-gray-800">
                  <td colSpan={8} className="py-8 text-center text-gray-300">
                    No active premium assignments. Use the form above to assign a premium bundle.
                  </td>
                </tr>
              ) : (
                activeAssignments.map((assignment) => {
                  const progressPercent = assignment.totalTasks > 0
                    ? Math.min(100, (assignment.tasksCompleted / assignment.totalTasks) * 100)
                    : 0;

                  return (
                    <tr key={`${assignment.username}-${assignment.id}`} className="border-b border-gray-800 hover:bg-[#1a1f2e]">
                      <td className="py-3 px-4">
                        <div className="text-white font-semibold">{assignment.username}</div>
                        <div className="text-gray-400 text-xs">VIP {assignment.vipLevel}</div>
                      </td>
                      <td className="py-3 px-4 text-yellow-400 font-semibold">${assignment.premiumProductValue.toFixed(2)}</td>
                      <td className="py-3 px-4 text-white">${assignment.totalBundleValue.toFixed(2)}</td>
                      <td className="py-3 px-4">
                        <span className={`font-semibold ${assignment.balanceAfterAssignment < 0 ? 'text-red-400' : 'text-green-400'}`}>
                          {assignment.balanceAfterAssignment < 0 ? '-' : ''}${Math.abs(assignment.balanceAfterAssignment).toFixed(2)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-white text-sm">{assignment.tasksCompleted}/{assignment.totalTasks}</span>
                          <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500" style={{ width: `${progressPercent}%` }}></div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1">
                          <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs w-fit">
                            {Number.isFinite(Number(assignment.triggerTaskNumber)) ? `Task #${Number(assignment.triggerTaskNumber)}` : `Queue ${assignment.queuePosition}`}
                          </span>
                          <span className={`px-2 py-1 rounded text-[11px] w-fit ${assignment.status === 'scheduled' ? 'bg-blue-500/20 text-blue-300' : assignment.status === 'awaiting_funds' ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'}`}>
                            {assignment.status}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-400 text-sm">{new Date(assignment.assignedAt).toLocaleString()}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            className="p-2 hover:bg-[#1a1f2e] rounded transition-colors"
                            title="View Details"
                            onClick={() => setSelectedAssignment(assignment)}
                          >
                            <Eye size={16} className="text-blue-400" />
                          </button>
                          <button
                            className="p-2 hover:bg-[#1a1f2e] rounded transition-colors"
                            title="Cancel Assignment"
                            onClick={() => void handleCancelAssignment(assignment)}
                          >
                            <XCircle size={16} className="text-red-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedAssignment ? (
        <div className="bg-[#252b3d] rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">Premium Assignment Details</h3>
            <button
              onClick={() => setSelectedAssignment(null)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <XCircle size={18} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="bg-[#1a1f2e] rounded-lg p-4">
              <p className="text-gray-400 mb-1">User</p>
              <p className="text-white font-semibold">{selectedAssignment.username}</p>
            </div>
            <div className="bg-[#1a1f2e] rounded-lg p-4">
              <p className="text-gray-400 mb-1">Top-up Required</p>
              <p className="text-red-400 font-semibold">${(selectedAssignment.topUpRequired ?? 0).toFixed(2)}</p>
            </div>
            <div className="bg-[#1a1f2e] rounded-lg p-4 md:col-span-2">
              <p className="text-gray-400 mb-2">Bundled Products</p>
              <div className="space-y-2">
                {(selectedAssignment.bundledProducts ?? []).map((product) => (
                  <div key={product.id} className="flex items-center justify-between text-white">
                    <span>{product.name}</span>
                    <span className="text-[#00D9FF] font-semibold">${product.price.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Info Box */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6">
        <h4 className="text-blue-300 font-bold mb-3 flex items-center gap-2">
          <Info size={20} />
          How Premium Bundles Work
        </h4>
        <ul className="space-y-2 text-blue-200 text-sm">
          <li>• <strong>Admin assigns</strong> a premium product value (e.g., $1,200)</li>
          <li>• <strong>System bundles</strong> 1-3 highest value products automatically</li>
          <li>• <strong>Total bundle value</strong> is deducted from user's current balance</li>
          <li>• <strong>Negative balance</strong> = Premium Value - Current Balance (shows as top-up required)</li>
          <li>• <strong>User account freezes</strong> until all bundled tasks are completed or top-up is made</li>
          <li>• <strong>Only commission</strong> is added to balance when tasks are completed (not product value)</li>
          <li>• <strong>Multiple premiums</strong> can be queued for the same user</li>
        </ul>
      </div>
    </div>
  );
}

