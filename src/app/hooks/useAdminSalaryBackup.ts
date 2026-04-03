import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { initialSalaryPayments } from '../admin/adminData';
import type { SalaryAuditEvent, SalaryPayment, SalaryRestorePoint, RewardTab, StorageSaveResult } from '../services/adminSalaryBackup';
import {
  AUTO_BACKUP_INTERVAL_MS,
  MAX_AUDIT_EVENTS,
  MAX_RESTORE_POINTS,
  buildBackupExport,
  createAuditEvent,
  createAutoBackupPoint as buildAutoBackupPoint,
  createRecoveryPoint,
  fetchAdminSalaryAuditLogFromServer,
  fetchAdminSalaryProjectState,
  parseBackupImport,
  pruneExpiredRestorePoints,
  saveAdminSalaryAuditLogToServer,
  saveAdminSalaryProjectState,
} from '../services/adminSalaryBackup';
import { buildAdminAuthHeaders } from '../services/supabaseAuth';

interface UseAdminSalaryBackupOpts {
  isSuperAdmin: boolean;
  serverUrl: string;
  handleAdminRequestError: (error: unknown, fallback: string, opts?: { suppressToast?: boolean; onMessage?: (msg: string) => void }) => void;
}

export function useAdminSalaryBackup({ isSuperAdmin, serverUrl, handleAdminRequestError }: UseAdminSalaryBackupOpts) {
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
  const [activeRewardTab, setActiveRewardTab] = useState<RewardTab>('workday');

  const salaryPaymentsRef = useRef<SalaryPayment[]>(initialSalaryPayments);
  const lastAutoBackupSignatureRef = useRef<string>('');
  const lastStorageErrorRef = useRef<string | null>(null);

  // ── Storage result handler ──────────────────────────────────
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

  // ── Hydrate from server ─────────────────────────────────────
  useEffect(() => {
    salaryPaymentsRef.current = initialSalaryPayments;
    lastAutoBackupSignatureRef.current = JSON.stringify(initialSalaryPayments);
    setIsSalaryStateHydrated(true);

    if (!isSuperAdmin) return;

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

  // ── Keep ref in sync ────────────────────────────────────────
  useEffect(() => {
    salaryPaymentsRef.current = salaryPayments;
  }, [salaryPayments]);

  // ── Persist project state to server ─────────────────────────
  useEffect(() => {
    if (!isSalaryStateHydrated || !isSuperAdmin) return;

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

  // ── Prune expired restore points ───────────────────────────
  useEffect(() => {
    setSalaryRestorePoints((prev) => pruneExpiredRestorePoints(prev, backupRetentionDays).slice(0, MAX_RESTORE_POINTS));
  }, [backupRetentionDays]);

  // ── Persist audit log to server ─────────────────────────────
  useEffect(() => {
    if (!isSalaryStateHydrated || !isSuperAdmin) return;

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

  // ── Auto-backup interval ───────────────────────────────────
  useEffect(() => {
    if (!isSalaryStateHydrated || !autoBackupEnabled) return;

    const intervalId = window.setInterval(() => {
      createAutoBackupPoint('auto-backup');
    }, autoBackupIntervalMinutes * AUTO_BACKUP_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [isSalaryStateHydrated, autoBackupEnabled, autoBackupIntervalMinutes]);

  // ── Audit helpers ──────────────────────────────────────────
  const appendSalaryAudit = (event: SalaryAuditEvent) => {
    setSalaryAuditLog((prev) => [event, ...prev].slice(0, MAX_AUDIT_EVENTS));
  };

  const createAutoBackupPoint = (action: 'auto-backup' | 'manual-backup' = 'auto-backup') => {
    const result = buildAutoBackupPoint(salaryPaymentsRef.current, lastAutoBackupSignatureRef.current);
    if (!result.point) return;

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

  // ── Restore point management ───────────────────────────────
  const createSalaryRestorePoint = (label: string, paymentsSnapshot: SalaryPayment[] = salaryPayments) => {
    const point = createRecoveryPoint(label, paymentsSnapshot);
    setSalaryRestorePoints((prev) => [point, ...prev].slice(0, MAX_RESTORE_POINTS));
    lastAutoBackupSignatureRef.current = JSON.stringify(paymentsSnapshot);
  };

  const restoreLatestSalaryPoint = () => {
    if (salaryRestorePoints.length === 0) {
      toast.info('No restore points available.');
      return;
    }
    setPendingRestorePointId(salaryRestorePoints[0].id);
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
    if (!pendingRestorePointId) return;
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

  // ── Payment processing ─────────────────────────────────────
  const processSingleSalaryPayment = (paymentId: number) => {
    const target = salaryPayments.find((payment) => payment.id === paymentId);
    if (!target || target.status !== 'Pending') {
      toast.info('Selected salary is already processed.');
      return;
    }

    createSalaryRestorePoint(`Single payment: ${target.username}`);
    const paidDate = new Date().toISOString().slice(0, 10);
    setSalaryPayments((prev) =>
      prev.map((payment) =>
        payment.id === paymentId ? { ...payment, status: 'Paid', paidDate } : payment
      )
    );
    toast.success(`Salary paid successfully for ${target.username}.`);
    appendSalaryAudit(createAuditEvent('single-payment', `${target.username} $${target.salaryDue}`));
  };

  const processBulkSalaryPayments = (option: 'all' | 'auto' | 'manual') => {
    const pendingPayments = salaryPayments.filter((payment) => payment.status === 'Pending');
    let targetIds: number[] = [];

    if (option === 'all') targetIds = pendingPayments.map((payment) => payment.id);
    if (option === 'auto') targetIds = pendingPayments.filter((payment) => payment.paymentMode === 'Automatic').map((payment) => payment.id);
    if (option === 'manual') targetIds = pendingPayments.filter((payment) => payment.paymentMode === 'Manual').map((payment) => payment.id);

    if (targetIds.length === 0) {
      toast.info('No matching pending salaries for selected mode.');
      return;
    }

    createSalaryRestorePoint(`Bulk payment (${option})`);
    const paidDate = new Date().toISOString().slice(0, 10);
    setSalaryPayments((prev) =>
      prev.map((payment) =>
        targetIds.includes(payment.id) ? { ...payment, status: 'Paid', paidDate } : payment
      )
    );
    toast.success(`Processed ${targetIds.length} salary payment(s).`);
    appendSalaryAudit(createAuditEvent('bulk-payment', `${option} mode, ${targetIds.length} payments`));
    setSelectedBulkOption('all');
  };

  // ── Export / Import ────────────────────────────────────────
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
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result ?? '');
        const parsed = parseBackupImport(text);

        setSalaryRestorePoints((prev) => [...parsed.points, ...prev].slice(0, MAX_RESTORE_POINTS));
        if (parsed.activeRewardTab) setActiveRewardTab(parsed.activeRewardTab);
        if (parsed.selectedBulkOption) setSelectedBulkOption(parsed.selectedBulkOption);
        if (typeof parsed.autoBackupEnabled === 'boolean') setAutoBackupEnabled(parsed.autoBackupEnabled);
        if (typeof parsed.autoBackupIntervalMinutes === 'number') setAutoBackupIntervalMinutes(parsed.autoBackupIntervalMinutes);
        if (typeof parsed.backupRetentionDays === 'number') setBackupRetentionDays(parsed.backupRetentionDays);
        appendSalaryAudit(createAuditEvent('import-backups', `${parsed.points.length} points`));
        toast.success(`Imported ${parsed.points.length} backup point(s).`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Could not read backup file.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  // ── Audit log ──────────────────────────────────────────────
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

  // ── Restore preview ────────────────────────────────────────
  const pendingRestorePoint = pendingRestorePointId
    ? salaryRestorePoints.find((point) => point.id === pendingRestorePointId) ?? null
    : null;

  const pendingRestoreDiff = useMemo(() => {
    if (!pendingRestorePoint) return null;

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
        if (sampleChanges.length < 4) sampleChanges.push(`${snapshot.username}: added by snapshot`);
        return;
      }

      if (current && !snapshot) {
        removed += 1;
        if (sampleChanges.length < 4) sampleChanges.push(`${current.username}: removed by snapshot`);
        return;
      }

      if (!current || !snapshot) return;

      let rowChanged = false;
      const notes: string[] = [];

      if (current.status !== snapshot.status) { changedStatus += 1; rowChanged = true; notes.push(`status ${current.status}→${snapshot.status}`); }
      if (current.salaryDue !== snapshot.salaryDue) { changedAmount += 1; rowChanged = true; notes.push(`amount $${current.salaryDue}→$${snapshot.salaryDue}`); }
      if (current.paymentMode !== snapshot.paymentMode) { changedMode += 1; rowChanged = true; notes.push(`mode ${current.paymentMode}→${snapshot.paymentMode}`); }
      if (current.dueDate !== snapshot.dueDate) { changedDueDate += 1; rowChanged = true; notes.push(`due ${current.dueDate}→${snapshot.dueDate}`); }
      const currentPaidDate = current.paidDate ?? '';
      const snapshotPaidDate = snapshot.paidDate ?? '';
      if (currentPaidDate !== snapshotPaidDate) { changedPaidDate += 1; rowChanged = true; notes.push(`paid ${currentPaidDate || 'none'}→${snapshotPaidDate || 'none'}`); }

      if (rowChanged) {
        changedRows += 1;
        if (sampleChanges.length < 4) sampleChanges.push(`${snapshot.username}: ${notes.join(', ')}`);
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

  return {
    // State
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

    // Handlers
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
  };
}
