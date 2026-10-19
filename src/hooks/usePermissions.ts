import { useCallback } from 'react';
import { useAppSelector } from '../store/hooks';
import { canEditStage, canEditTransaction, hasPermission, type Permission } from '../data/roles';
import type { Transaction, WorkflowStage } from '../types/cases';

/** Frontend permission checks are a UI convenience only; the backend must enforce authorization. */
export function usePermissions() {
  const user = useAppSelector((s) => s.auth.user);
  const can = useCallback((p: Permission) => hasPermission(user?.role, p), [user?.role]);
  const canEditTx = useCallback((tx: Transaction) => canEditTransaction(user, tx), [user]);
  const canEditStep = useCallback((tx: Transaction, s: WorkflowStage) => canEditStage(user, tx, s), [user]);
  return { user, can, canEditTx, canEditStep };
}
