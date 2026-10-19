import type { CaseStatus, StageCondition, Transaction, TransactionFees, WorkflowStage, WorkflowTemplate } from '../types/cases';
import type { ServiceCatalogItem } from '../types/catalog';
import type { Payment, Receipt } from '../types/finance';
import { addDaysIso, daysUntil } from './dates';
import { allocatedTo, round2 } from './finance';
import { uid } from './random';

export const CASE_STATUSES: CaseStatus[] = ['new', 'in_progress', 'waiting_documents', 'waiting_payment', 'submitted', 'completed', 'rejected', 'cancelled'];
/** Statuses that still require work. */
export const OPEN_STATUSES: CaseStatus[] = ['new', 'in_progress', 'waiting_documents', 'waiting_payment', 'submitted', 'rejected'];
export const isOpen = (t: Transaction) => OPEN_STATUSES.includes(t.status);
export const isClosed = (t: Transaction) => t.status === 'completed' || t.status === 'cancelled';

export const OPEN_STAGE: WorkflowStage['status'][] = ['in_progress', 'waiting_customer', 'waiting_payment', 'submitted', 'rejected'];

export const isStageDone = (s: WorkflowStage) => s.status === 'completed' || !s.applicable;

export function applicable(t: Transaction) {
  return t.stages.filter((s) => s.applicable);
}

export function caseProgress(t: Transaction) {
  const st = applicable(t);
  const done = st.filter((s) => s.status === 'completed').length;
  return { done, total: st.length, pct: st.length ? Math.round(done / st.length * 100) : t.status === 'completed' ? 100 : 0 };
}

export function currentStage(t: Transaction): WorkflowStage | undefined {
  const st = applicable(t);
  return st.find((s) => OPEN_STAGE.includes(s.status)) ?? st.find((s) => s.status === 'not_started');
}

export function caseFlags(t: Transaction) {
  const open = isOpen(t);
  const st = applicable(t);
  const d = daysUntil(t.dueDate);
  return {
    awaitingCustomer: open && (t.status === 'waiting_documents' || st.some((s) => s.status === 'waiting_customer')),
    awaitingPayment: open && (t.status === 'waiting_payment' || st.some((s) => s.status === 'waiting_payment')),
    rejected: open && (t.status === 'rejected' || st.some((s) => s.status === 'rejected')),
    overdue: open && d !== null && d < 0,
    stageOverdue: open && st.some((s) => OPEN_STAGE.includes(s.status) && (daysUntil(s.dueDate) ?? 1) < 0)
  };
}

/** Mandatory applicable stages that are not completed. */
export function blockingStages(t: Transaction) {
  return applicable(t).filter((s) => s.mandatory && s.status !== 'completed');
}

/** Dependencies of a stage (within the same dependent) that are applicable but not completed. */
export function unmetDependencies(t: Transaction, stage: WorkflowStage) {
  return t.stages.filter(
    (s) =>
    stage.dependsOn.includes(s.key) &&
    s.dependentId === stage.dependentId &&
    s.applicable &&
    s.status !== 'completed'
  );
}

export function conditionMet(c: StageCondition, ctx: {insideUae: boolean;medicalRequired: boolean;}) {
  if (c === 'insideUae') return ctx.insideUae;
  if (c === 'outsideUae') return !ctx.insideUae;
  if (c === 'medicalRequired') return ctx.medicalRequired;
  return true;
}

export interface BuildStagesCtx {
  insideUae: boolean;
  medicalRequired: boolean;
  dependentId?: string;
  startDate: string;
  assigneeId: string;
  excludedKeys?: string[];
}

const stageCost = (svc?: ServiceCatalogItem) => svc ? round2(svc.governmentFee + svc.providerCost + svc.otherCosts) : 0;

/** Instantiates stages from a template; each stage's expected cost comes from its catalog service. */
export function buildStages(template: WorkflowTemplate, catalog: ServiceCatalogItem[], ctx: BuildStagesCtx): WorkflowStage[] {
  let cursor = ctx.startDate;
  return template.stages.map((st) => {
    const svc = st.serviceId ? catalog.find((c) => c.id === st.serviceId) : undefined;
    const excluded = !st.mandatory && (ctx.excludedKeys ?? []).includes(st.key);
    const optionalOn = ctx.excludedKeys ? !excluded : st.defaultOn ?? true;
    const isApplicable = conditionMet(st.condition, ctx) && optionalOn;
    const due = addDaysIso(cursor, st.slaDays);
    if (isApplicable) cursor = due;
    return {
      id: uid('stg'),
      key: st.key,
      nameAr: st.nameAr,
      nameEn: st.nameEn,
      serviceId: st.serviceId,
      mandatory: st.mandatory,
      applicable: isApplicable,
      dependsOn: st.dependsOn,
      dependentId: ctx.dependentId,
      status: 'not_started',
      dueDate: isApplicable ? due : undefined,
      assigneeId: ctx.assigneeId,
      expectedCost: stageCost(svc),
      attachments: []
    };
  });
}

/** A single-step transaction has one stage representing the service itself. */
export function singleStage(svc: ServiceCatalogItem, ctx: {startDate: string;assigneeId: string;}): WorkflowStage[] {
  return [
  {
    id: uid('stg'),
    key: 'service',
    nameAr: svc.nameAr,
    nameEn: svc.nameEn || svc.nameAr,
    serviceId: svc.id,
    mandatory: true,
    applicable: true,
    dependsOn: [],
    status: 'not_started',
    dueDate: addDaysIso(ctx.startDate, svc.slaDays),
    assigneeId: ctx.assigneeId,
    expectedCost: stageCost(svc),
    attachments: []
  }];

}

export function feesFromService(svc: ServiceCatalogItem, vatRate: number): TransactionFees {
  return {
    governmentFee: svc.governmentFee,
    providerCost: svc.providerCost,
    otherCosts: svc.otherCosts,
    serviceFee: svc.serviceFee,
    discount: 0,
    vatTreatment: svc.vatTreatment,
    vatRate
  };
}

/** Actual cost paid for a step and amount collected against it — always derived from vouchers. */
export function stageActuals(t: Transaction, stage: WorkflowStage, receipts: Receipt[], payments: Payment[]) {
  const actual = round2(payments.filter((p) => p.transactionId === t.id && p.stageId === stage.id).reduce((a, p) => a + p.amount, 0));
  const collected = round2(receipts.reduce((a, r) => a + allocatedTo(r, t.id, stage.id), 0));
  return { actual, collected };
}

export function caseBeneficiary(t: Transaction, lang: 'ar' | 'en', employeeName?: string) {
  if (employeeName) return employeeName;
  if (t.beneficiaryName) return t.beneficiaryName;
  if (t.type === 'visit' && t.visit) return lang === 'ar' ? t.visit.applicantNameAr : t.visit.applicantNameEn;
  if (t.type === 'formation' && t.formation) return lang === 'ar' ? t.formation.tradeNameAr : t.formation.tradeNameEn;
  if (t.type === 'family' && t.family) return t.family.sponsorName;
  return '';
}
