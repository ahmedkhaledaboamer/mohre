import type { Role } from '../types/system';
import type { Transaction, WorkflowStage } from '../types/cases';

export type Permission =
'dashboard.view' |
'reports.view' |
'crm.view' |
'crm.edit' |
'cases.view' |
/** Register transactions and update the ones you registered / execute. */
'cases.edit' |
/** Update any transaction, regardless of who registered or executes it. */
'cases.editAny' |
/** Change the executing officer of a transaction. */
'cases.reassign' |
'cases.override' |
'cases.delete' |
/** Correct transaction fees after registration. */
'cases.fees' |
'pricing.view' |
'pricing.edit' |
/** Invoices, receipts, payment vouchers and expenses pages. */
'finance.view' |
'finance.edit' |
/** Record money actually received from a customer. */
'collections.record' |
/** Record money actually paid to a government body / provider. */
'payments.record' |
'vouchers.delete' |
'cash.view' |
'documents.view' |
'documents.edit' |
'tasks.view' |
'tasks.edit' |
'users.manage' |
'settings.manage';

export const ALL_PERMISSIONS: Permission[] = [
'dashboard.view', 'reports.view', 'crm.view', 'crm.edit', 'cases.view', 'cases.edit', 'cases.editAny', 'cases.reassign', 'cases.override', 'cases.delete', 'cases.fees',
'pricing.view', 'pricing.edit', 'finance.view', 'finance.edit', 'collections.record', 'payments.record', 'vouchers.delete', 'cash.view',
'documents.view', 'documents.edit', 'tasks.view', 'tasks.edit', 'users.manage', 'settings.manage'];


/**
 * Frontend permission simulation only. It hides menus and buttons and the mock API refuses
 * the same actions, but it is NOT security — a real backend must enforce authorization.
 */
export const rolePermissions: Record<Role, Permission[]> = {
  owner: ALL_PERMISSIONS,
  accountant: [
  'dashboard.view', 'reports.view', 'crm.view', 'cases.view', 'cases.fees', 'pricing.view', 'finance.view', 'finance.edit',
  'collections.record', 'payments.record', 'cash.view', 'documents.view', 'tasks.view', 'tasks.edit'],

  pro: ['crm.view', 'crm.edit', 'cases.view', 'cases.edit', 'pricing.view', 'collections.record', 'payments.record', 'documents.view', 'documents.edit', 'tasks.view', 'tasks.edit'],
  manager: ['dashboard.view', 'reports.view', 'crm.view', 'cases.view', 'pricing.view', 'finance.view', 'cash.view', 'documents.view', 'tasks.view']
};

export const ROLES: Role[] = ['owner', 'accountant', 'pro', 'manager'];

export function hasPermission(role: Role | undefined | null, permission: Permission): boolean {
  return role ? rolePermissions[role]?.includes(permission) ?? false : false;
}

/** Staff may update transactions they registered or execute; editAny covers everything else. */
export function canEditTransaction(user: {id: string;role: Role;} | null | undefined, tx: Transaction) {
  if (!user || !hasPermission(user.role, 'cases.edit') && !hasPermission(user.role, 'cases.editAny')) return false;
  if (hasPermission(user.role, 'cases.editAny')) return true;
  return tx.createdBy === user.id || tx.officerId === user.id || tx.stages.some((s) => s.assigneeId === user.id);
}

/** A staff member updates the steps assigned to them (or on transactions they own); managers see all. */
export function canEditStage(user: {id: string;role: Role;} | null | undefined, tx: Transaction, stage: WorkflowStage) {
  if (!user) return false;
  if (hasPermission(user.role, 'cases.editAny')) return true;
  if (!hasPermission(user.role, 'cases.edit')) return false;
  return stage.assigneeId === user.id || tx.officerId === user.id || tx.createdBy === user.id;
}
