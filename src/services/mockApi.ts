import type { ApiContract, EntityService, RecordPaymentInput, RecordReceiptInput } from './contracts';
import type { CollectionKey, CollectionMap } from '../types/db';
import type { ActivityEntity } from '../types/system';
import type { Bilingual } from '../types/common';
import type { PriceChangeField, ServiceCatalogItem } from '../types/catalog';
import type { CaseStatus, StageStatus, Transaction, TransactionFees, WorkflowStage } from '../types/cases';
import type { Allocation, Invoice, LineItem, Payment, Receipt } from '../types/finance';
import { getDb, persistDb, resetDb } from './mockDb';
import { getActor } from './session';
import { uid } from '../utils/random';
import { nowIso, todayIso, addDaysIso } from '../utils/dates';
import { blockingStages, buildStages, singleStage } from '../utils/cases';
import { allocateAmount, buildInvoiceViews, feeTotals, round2, summarizeTransaction } from '../utils/finance';
import { canEditStage, canEditTransaction, hasPermission, type Permission } from '../data/roles';
import { templateById } from '../data/workflowTemplates';

/** Simulated network latency. Tests set this to 0. */
export const mockLatency = { ms: 150 };
const wait = (ms?: number) => new Promise<void>((r) => setTimeout(r, mockLatency.ms === 0 ? 0 : ms ?? mockLatency.ms));
const clone = <T,>(v: T): T => v === undefined ? v : JSON.parse(JSON.stringify(v)) as T;
const EPS = 0.005;

class ApiFailure extends Error {}
const fail = (code: string): never => {
  throw new ApiFailure(code);
};

function actor() {
  const db = getDb();
  return db.users.find((u) => u.id === getActor()) ?? null;
}

/** Mirrors the UI permission checks so a hidden button can't be bypassed from the console. */
function requirePerm(p: Permission) {
  const u = actor();
  if (!u || !u.active || !hasPermission(u.role, p)) fail('FORBIDDEN');
  return u!;
}

export function logActivity(entityType: ActivityEntity, entityId: string, action: string, message: Bilingual, override?: boolean) {
  getDb().activity.unshift({ id: uid('act'), entityType, entityId, action, message, userId: getActor(), at: nowIso(), override });
}

function nextNumber(items: unknown[], field: string, prefix: string, yearly: boolean) {
  let max = 0;
  const year = new Date().getFullYear();
  items.forEach((it) => {
    const v = String((it as Record<string, unknown>)[field] ?? '');
    if (!v.startsWith(prefix)) return;
    if (yearly && !v.startsWith(`${prefix}-${year}-`)) return;
    const m = v.match(/(\d+)$/);
    if (m) max = Math.max(max, Number(m[1]));
  });
  const n = max + 1;
  return yearly ? `${prefix}-${year}-${String(n).padStart(4, '0')}` : `${prefix}-${n}`;
}

/** Idempotency: a request id that was already processed returns the stored record. */
function byRequest<T extends {requestId?: string;}>(items: T[], requestId?: string) {
  return requestId ? items.find((x) => x.requestId === requestId) : undefined;
}

function displayOf(item: unknown) {
  const r = item as Record<string, unknown>;
  return String(r.number ?? r.ref ?? r.code ?? r.title ?? r.nameAr ?? '');
}

interface EntityOpts {
  activity?: ActivityEntity;
  label: Bilingual;
  numberField?: string;
  prefix?: string;
  yearly?: boolean;
  /** Permission required to create / update / delete. */
  edit?: Permission;
}

function mockEntity<K extends CollectionKey>(key: K, opts: EntityOpts): EntityService<CollectionMap[K]> {
  type T = CollectionMap[K];
  const coll = () => getDb()[key] as T[];
  const guard = () => opts.edit && requirePerm(opts.edit);
  const log = (item: T, action: string, ar: string, en: string) => {
    if (opts.activity) logActivity(opts.activity, item.id, action, { ar: `${ar} ${opts.label.ar}: ${displayOf(item)}`, en: `${en} ${opts.label.en}: ${displayOf(item)}` });
  };
  return {
    async list() {
      await wait();
      return clone(coll());
    },
    async get(id) {
      await wait();
      const found = coll().find((x) => x.id === id);
      if (!found) fail('NOT_FOUND');
      return clone(found!);
    },
    async create(input) {
      await wait();
      guard();
      const dup = byRequest(coll() as {requestId?: string;}[], (input as {requestId?: string;}).requestId);
      if (dup) return clone(dup as T);
      const item = { ...clone(input), id: uid(String(key).slice(0, 3)) } as T;
      if (opts.numberField && opts.prefix) {
        const rec = item as unknown as Record<string, unknown>;
        if (!rec[opts.numberField]) rec[opts.numberField] = nextNumber(coll(), opts.numberField, opts.prefix, Boolean(opts.yearly));
      }
      coll().unshift(item);
      log(item, 'created', 'إنشاء', 'Created');
      persistDb();
      return clone(item);
    },
    async update(id, patch) {
      await wait();
      guard();
      const found = coll().find((x) => x.id === id);
      if (!found) fail('NOT_FOUND');
      const { id: _ignored, ...rest } = clone(patch) as T & {id?: string;};
      Object.assign(found!, rest);
      log(found!, 'updated', 'تحديث', 'Updated');
      persistDb();
      return clone(found!);
    },
    async remove(id) {
      await wait();
      guard();
      const list = coll();
      const idx = list.findIndex((x) => x.id === id);
      if (idx < 0) fail('NOT_FOUND');
      const [item] = list.splice(idx, 1);
      log(item, 'deleted', 'حذف', 'Deleted');
      persistDb();
    }
  };
}

/* ───────────────────────── Catalog with price history ───────────────────────── */

const PRICE_FIELDS: (keyof ServiceCatalogItem)[] = ['governmentFee', 'providerCost', 'otherCosts', 'serviceFee', 'vatTreatment', 'active', 'isDemoPrice'];
const catalogBase = mockEntity('catalog', { activity: 'pricing', label: { ar: 'خدمة', en: 'service' }, numberField: 'code', prefix: 'SRV', edit: 'pricing.edit' });

async function updateCatalog(id: string, patch: Partial<ServiceCatalogItem>) {
  const before = getDb().catalog.find((c) => c.id === id);
  if (!before) fail('NOT_FOUND');
  const changes: PriceChangeField[] = PRICE_FIELDS.filter((f) => patch[f] !== undefined && patch[f] !== before![f]).map((f) => ({
    field: f,
    from: (before![f] ?? '') as string | number | boolean,
    to: (patch[f] ?? '') as string | number | boolean
  }));
  const res = await catalogBase.update(id, patch);
  if (changes.length) {
    getDb().priceHistory.unshift({ id: uid('ph'), serviceId: id, serviceName: res.nameAr, changedAt: nowIso(), userId: getActor(), changes });
    persistDb();
  }
  return res;
}

/* ───────────────────────── Transactions ───────────────────────── */

const STAGE_FOR_STATUS: Partial<Record<CaseStatus, StageStatus>> = {
  in_progress: 'in_progress',
  waiting_documents: 'waiting_customer',
  waiting_payment: 'waiting_payment',
  submitted: 'submitted',
  rejected: 'rejected'
};

function findTx(id: string) {
  const t = getDb().transactions.find((x) => x.id === id);
  if (!t) fail('NOT_FOUND');
  return t!;
}

function txSummary(t: Transaction) {
  const db = getDb();
  return summarizeTransaction(t, db.receipts, db.payments);
}

function validateFees(f: TransactionFees) {
  const nums = [f.governmentFee, f.providerCost, f.otherCosts, f.serviceFee, f.discount];
  if (nums.some((n) => typeof n !== 'number' || !Number.isFinite(n) || n < 0)) fail('INVALID_AMOUNT');
  if (f.discount > f.serviceFee + EPS) fail('DISCOUNT_EXCEEDS_FEE');
}

/** Moves the first open step to match a transaction-level status, so the timeline tells the same story. */
function syncStagesToStatus(t: Transaction, status: CaseStatus) {
  const today = todayIso();
  const app = t.stages.filter((s) => s.applicable);
  if (status === 'completed') {
    app.forEach((s) => {
      if (s.status !== 'completed' && s.status !== 'cancelled') {
        s.status = 'completed';
        s.startDate = s.startDate ?? today;
        s.completedDate = today;
      }
    });
    return;
  }
  if (status === 'cancelled') {
    app.forEach((s) => {
      if (s.status !== 'completed' && s.status !== 'not_started') s.status = 'cancelled';
    });
    return;
  }
  const target = STAGE_FOR_STATUS[status];
  if (!target) return;
  const current = app.find((s) => s.status !== 'completed' && s.status !== 'cancelled');
  if (current) {
    current.status = target;
    current.startDate = current.startDate ?? today;
  }
}

function stageForPayment(t: Transaction): WorkflowStage | undefined {
  return t.stages.find((s) => s.applicable && s.expectedCost > 0 && s.status !== 'completed') ?? t.stages.find((s) => s.applicable && s.expectedCost > 0);
}

function makeReceipt(input: RecordReceiptInput, allocations: Allocation[]): Receipt {
  const db = getDb();
  const prefix = input.kind === 'refund' ? 'RFD' : 'RCV';
  const customer = db.customers.find((c) => c.id === input.customerId);
  return {
    id: uid('rcp'),
    number: nextNumber(db.receipts, 'number', prefix, true),
    kind: input.kind,
    customerId: input.customerId,
    invoiceId: input.invoiceId,
    allocations,
    date: input.date,
    amount: round2(input.amount),
    method: input.method,
    accountId: input.accountId,
    reference: input.reference || undefined,
    receivedBy: getActor(),
    createdAt: nowIso(),
    notes: input.notes || undefined,
    branchId: customer?.branchId ?? 'deira',
    requestId: input.requestId
  };
}

function makePayment(input: RecordPaymentInput, t?: Transaction): Payment {
  const db = getDb();
  return {
    id: uid('pay'),
    number: nextNumber(db.payments, 'number', 'PAY', true),
    category: input.category,
    supplierId: input.supplierId || undefined,
    payeeName: input.payeeName,
    transactionId: t?.id,
    stageId: input.stageId,
    customerId: t?.customerId,
    date: input.date,
    amount: round2(input.amount),
    method: input.method,
    accountId: input.accountId,
    reference: input.reference || undefined,
    paidBy: getActor(),
    createdAt: nowIso(),
    notes: input.notes || undefined,
    branchId: t?.branchId ?? actor()?.branchId ?? 'deira',
    requestId: input.requestId
  };
}

function assertAccount(id: string) {
  const a = getDb().accounts.find((x) => x.id === id);
  if (!a || !a.active) fail('ACCOUNT_REQUIRED');
}

const money = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ───────────────────────── Receipts / payments core ───────────────────────── */

function recordReceiptSync(input: RecordReceiptInput): Receipt {
  const db = getDb();
  const dup = byRequest(db.receipts, input.requestId);
  if (dup) return dup;
  if (!(input.amount > 0)) fail('INVALID_AMOUNT');
  if (!db.customers.some((c) => c.id === input.customerId)) fail('NOT_FOUND');
  assertAccount(input.accountId);

  let allocations: Allocation[] = [];
  if (input.transactionId) {
    const t = findTx(input.transactionId);
    if (t.customerId !== input.customerId) fail('CUSTOMER_MISMATCH');
    const s = txSummary(t);
    if (input.kind === 'receipt') {
      if (t.status === 'cancelled') fail('TRANSACTION_CANCELLED');
      if (input.amount > s.customerBalance + EPS) fail('AMOUNT_EXCEEDS_BALANCE');
    } else if (input.amount > s.collected + EPS) fail('REFUND_EXCEEDS_COLLECTED');
    allocations = [{ transactionId: t.id, stageId: input.stageId || undefined, amount: round2(input.amount) }];
  } else if (input.invoiceId) {
    const inv = db.invoices.find((i) => i.id === input.invoiceId);
    if (!inv) fail('NOT_FOUND');
    if (inv!.customerId !== input.customerId) fail('CUSTOMER_MISMATCH');
    const view = buildInvoiceViews([inv!], db.receipts)[0];
    if (input.kind === 'receipt') {
      if (view.status === 'draft' || view.status === 'cancelled') fail('INVOICE_NOT_PAYABLE');
      if (input.amount > view.balance + EPS) fail('AMOUNT_EXCEEDS_BALANCE');
      const txIds = [...new Set(inv!.lines.map((l) => l.transactionId).filter(Boolean) as string[])];
      const balances = txIds.
      map((id) => db.transactions.find((x) => x.id === id)).
      filter((x): x is Transaction => Boolean(x) && x!.status !== 'cancelled').
      sort((a, b) => a.transactionDate.localeCompare(b.transactionDate)).
      map((t) => ({ transactionId: t.id, balance: txSummary(t).customerBalance }));
      allocations = allocateAmount(input.amount, balances);
    } else if (input.amount > view.paid + EPS) fail('REFUND_EXCEEDS_COLLECTED');
  } else if (input.kind === 'refund') {
    const net = db.receipts.filter((r) => r.customerId === input.customerId).reduce((a, r) => a + (r.kind === 'refund' ? -r.amount : r.amount), 0);
    if (input.amount > net + EPS) fail('REFUND_EXCEEDS_COLLECTED');
  }

  const receipt = makeReceipt(input, allocations);
  db.receipts.unshift(receipt);
  logActivity(
    'receipt',
    receipt.id,
    input.kind,
    input.kind === 'refund' ?
    { ar: `رد مبلغ ${money(receipt.amount)} للعميل — ${receipt.number}`, en: `Refunded ${money(receipt.amount)} — ${receipt.number}` } :
    { ar: `سند قبض ${receipt.number} بمبلغ ${money(receipt.amount)}`, en: `Receipt ${receipt.number} for ${money(receipt.amount)}` }
  );
  allocations.forEach((a) => logActivity('case', a.transactionId, input.kind, { ar: `${input.kind === 'refund' ? 'رد مبلغ' : 'تحصيل'} ${money(a.amount)} — ${receipt.number}`, en: `${input.kind === 'refund' ? 'Refund' : 'Collection'} ${money(a.amount)} — ${receipt.number}` }));
  return receipt;
}

function recordPaymentSync(input: RecordPaymentInput): Payment {
  const db = getDb();
  const dup = byRequest(db.payments, input.requestId);
  if (dup) return dup;
  if (!(input.amount > 0)) fail('INVALID_AMOUNT');
  if (!input.payeeName?.trim()) fail('PAYEE_REQUIRED');
  assertAccount(input.accountId);
  const t = input.transactionId ? findTx(input.transactionId) : undefined;
  if (input.stageId && !t?.stages.some((s) => s.id === input.stageId)) fail('NOT_FOUND');
  const payment = makePayment(input, t);
  db.payments.unshift(payment);
  logActivity('payment', payment.id, 'created', { ar: `سند صرف ${payment.number} إلى ${payment.payeeName} بمبلغ ${money(payment.amount)}`, en: `Payment ${payment.number} to ${payment.payeeName}: ${money(payment.amount)}` });
  if (t) logActivity('case', t.id, 'payment', { ar: `دفع ${money(payment.amount)} إلى ${payment.payeeName} — ${payment.number}`, en: `Paid ${money(payment.amount)} to ${payment.payeeName} — ${payment.number}` });
  return payment;
}

/* ───────────────────────── API ───────────────────────── */

export const mockApi: ApiContract = {
  auth: {
    async login(email, password) {
      await wait(300);
      const user = getDb().users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
      if (!user || password !== 'demo1234') fail('INVALID_CREDENTIALS');
      if (!user!.active) fail('USER_INACTIVE');
      user!.lastLoginAt = nowIso();
      persistDb();
      return clone(user!);
    }
  },
  customers: mockEntity('customers', { activity: 'customer', label: { ar: 'عميل', en: 'customer' }, numberField: 'code', prefix: 'CUS', edit: 'crm.edit' }),
  companies: mockEntity('companies', { activity: 'company', label: { ar: 'شركة', en: 'company' }, numberField: 'code', prefix: 'CMP', edit: 'crm.edit' }),
  employees: mockEntity('employees', { activity: 'employee', label: { ar: 'موظف مستفيد', en: 'employee' }, numberField: 'code', prefix: 'EMP', edit: 'crm.edit' }),

  transactions: {
    async list() {
      await wait();
      return clone(getDb().transactions);
    },
    async get(id) {
      await wait();
      return clone(findTx(id));
    },

    async register(input) {
      await wait(250);
      const db = getDb();
      const me = requirePerm('cases.edit');
      const existing = byRequest(db.transactions, input.requestId);
      if (existing) {
        return {
          transaction: clone(existing),
          receipt: clone(byRequest(db.receipts, `${input.requestId}:rcv`)),
          payment: clone(byRequest(db.payments, `${input.requestId}:pay`)),
          duplicate: true
        };
      }

      const svc = db.catalog.find((s) => s.id === input.serviceId);
      if (!svc || !svc.active) fail('SERVICE_REQUIRED');
      if (!db.customers.some((c) => c.id === input.customerId)) fail('CUSTOMER_REQUIRED');
      if (svc!.requiresCompany === 'required' && !input.companyId) fail('COMPANY_REQUIRED');
      if (input.companyId && !db.companies.some((c) => c.id === input.companyId)) fail('NOT_FOUND');
      if (svc!.requiresBeneficiary === 'required' && !input.employeeId && !input.beneficiaryName?.trim()) fail('BENEFICIARY_REQUIRED');
      const emp = input.employeeId ? db.employees.find((e) => e.id === input.employeeId) : undefined;
      if (input.employeeId && !emp) fail('NOT_FOUND');
      if (emp && input.companyId && emp.companyId !== input.companyId) fail('EMPLOYEE_COMPANY_MISMATCH');
      if (!db.users.some((u) => u.id === input.officerId && u.active)) fail('OFFICER_REQUIRED');
      if (input.officerId !== me.id && !hasPermission(me.role, 'cases.reassign') && !hasPermission(me.role, 'cases.editAny')) fail('FORBIDDEN');
      validateFees(input.fees);
      const totals = feeTotals(input.fees, input.fees.vatRate);
      if (input.collection) {
        requirePerm('collections.record');
        if (!(input.collection.amount > 0)) fail('INVALID_AMOUNT');
        if (input.collection.amount > totals.due + EPS) fail('AMOUNT_EXCEEDS_BALANCE');
        assertAccount(input.collection.accountId);
      }
      if (input.costPayment) {
        requirePerm('payments.record');
        if (!(input.costPayment.amount > 0)) fail('INVALID_AMOUNT');
        assertAccount(input.costPayment.accountId);
      }

      const template = templateById(svc!.templateId);
      const startDate = input.transactionDate;
      const stages = template ?
      buildStages(template, db.catalog, { insideUae: false, medicalRequired: true, startDate, assigneeId: input.officerId }) :
      singleStage(svc!, { startDate, assigneeId: input.officerId });
      const sla = template ? template.stages.reduce((a, s) => a + s.slaDays, 0) : svc!.slaDays;
      const now = nowIso();
      const benName = emp ? emp.nameAr : input.beneficiaryName?.trim();
      const customer = db.customers.find((c) => c.id === input.customerId)!;
      const company = input.companyId ? db.companies.find((c) => c.id === input.companyId) : undefined;
      const label = benName || company?.nameAr || customer.nameAr;

      const tx: Transaction = {
        id: uid('trx'),
        ref: nextNumber(db.transactions, 'ref', 'TRX', true),
        serviceId: svc!.id,
        type: svc!.category,
        templateId: template?.id,
        pathway: template?.pathway ?? 'standard',
        titleAr: `${svc!.nameAr} — ${label}`,
        titleEn: `${svc!.nameEn || svc!.nameAr} — ${emp?.nameEn ?? benName ?? company?.nameEn ?? customer.nameEn}`,
        customerId: input.customerId,
        companyId: input.companyId || undefined,
        employeeId: input.employeeId || undefined,
        beneficiaryName: emp ? undefined : input.beneficiaryName?.trim() || undefined,
        status: 'new',
        priority: input.priority,
        branchId: company?.branchId ?? customer.branchId,
        officerId: input.officerId,
        createdBy: me.id,
        createdAt: now,
        transactionDate: input.transactionDate,
        externalRef: input.externalRef?.trim() || undefined,
        dueDate: input.dueDate || addDaysIso(startDate, sla),
        fees: clone(input.fees),
        stages,
        notes: input.note?.trim() ? [{ id: uid('note'), body: input.note.trim(), authorId: me.id, createdAt: now, channel: 'note' }] : [],
        requestId: input.requestId
      };
      if (input.status !== 'new') {
        tx.status = input.status;
        tx.startedAt = input.transactionDate;
        syncStagesToStatus(tx, input.status);
        if (input.status === 'completed') {
          tx.completedAt = todayIso();
          tx.completedBy = me.id;
        }
      }
      db.transactions.unshift(tx);
      logActivity('case', tx.id, 'created', { ar: `تسجيل المعاملة ${tx.ref} — ${svc!.nameAr}`, en: `Registered transaction ${tx.ref}` });

      // Collection and cost payment are separate, independently numbered records — only when money actually moved.
      const receipt = input.collection ?
      recordReceiptSync({ requestId: `${input.requestId}:rcv`, kind: 'receipt', customerId: tx.customerId, transactionId: tx.id, date: input.transactionDate, ...input.collection }) :
      undefined;
      const payment = input.costPayment ?
      recordPaymentSync({ requestId: `${input.requestId}:pay`, transactionId: tx.id, stageId: stageForPayment(tx)?.id, date: input.transactionDate, ...input.costPayment }) :
      undefined;

      (input.attachments ?? []).forEach((a) =>
      db.documents.unshift({ id: uid('doc'), type: a.type, title: `${a.fileName} — ${tx.ref}`, fileName: a.fileName, entityType: 'case', entityId: tx.id, uploadedAt: todayIso(), verification: 'pending', sizeKb: a.sizeKb, uploadedBy: me.id })
      );
      persistDb();
      return { transaction: clone(tx), receipt: clone(receipt), payment: clone(payment), duplicate: false };
    },

    async update(id, patch) {
      await wait();
      const t = findTx(id);
      const me = actor();
      if (!canEditTransaction(me, t)) fail('FORBIDDEN');
      if (patch.officerId && patch.officerId !== t.officerId) {
        if (!hasPermission(me!.role, 'cases.reassign')) fail('FORBIDDEN');
        if (!getDb().users.some((u) => u.id === patch.officerId && u.active)) fail('OFFICER_REQUIRED');
      }
      if (patch.costsFinalized !== undefined && !hasPermission(me!.role, 'cases.fees') && !hasPermission(me!.role, 'cases.editAny')) fail('FORBIDDEN');
      const allowed: (keyof typeof patch)[] = ['officerId', 'priority', 'externalRef', 'dueDate', 'transactionDate', 'beneficiaryName', 'companyId', 'employeeId', 'notes', 'costsFinalized'];
      const changed: string[] = [];
      allowed.forEach((k) => {
        if (patch[k] === undefined) return;
        const before = JSON.stringify(t[k]);
        const after = JSON.stringify(patch[k]);
        if (before === after) return;
        (t as unknown as Record<string, unknown>)[k] = clone(patch[k]);
        if (k !== 'notes') changed.push(k);
      });
      t.updatedAt = nowIso();
      t.updatedBy = me!.id;
      if (changed.length) {
        const officer = changed.includes('officerId') ? getDb().users.find((u) => u.id === t.officerId) : undefined;
        logActivity('case', t.id, 'updated', {
          ar: `تعديل بيانات المعاملة (${changed.join('، ')})${officer ? ` — المنفذ الجديد: ${officer.nameAr}` : ''}`,
          en: `Transaction details updated (${changed.join(', ')})${officer ? ` — new officer: ${officer.nameEn}` : ''}`
        });
      }
      persistDb();
      return clone(t);
    },

    async updateFees(id, fees, reason) {
      await wait();
      const t = findTx(id);
      const me = actor();
      if (!canEditTransaction(me, t) && !hasPermission(me?.role, 'cases.fees')) fail('FORBIDDEN');
      if (!reason?.trim()) fail('REASON_REQUIRED');
      validateFees(fees);
      const before = feeTotals(t.fees, t.fees.vatRate);
      const after = feeTotals(fees, fees.vatRate);
      // Fees change what is owed going forward; recorded receipts and payment vouchers are never touched.
      t.fees = clone(fees);
      t.updatedAt = nowIso();
      t.updatedBy = me!.id;
      logActivity('case', t.id, 'fees', {
        ar: `تعديل رسوم المعاملة: المستحق ${money(before.due)} ← ${money(after.due)} — السبب: ${reason}`,
        en: `Fees changed: due ${money(before.due)} → ${money(after.due)} — reason: ${reason}`
      });
      persistDb();
      return clone(t);
    },

    async setStatus({ id, status, reason, override }) {
      await wait();
      const t = findTx(id);
      const me = actor();
      if (!canEditTransaction(me, t)) fail('FORBIDDEN');
      if (t.status === status) return clone(t);
      if (t.status === 'cancelled') fail('INVALID_STATE');
      if ((status === 'cancelled' || status === 'rejected') && !reason?.trim()) fail('REASON_REQUIRED');
      const prev = t.status;
      if (status === 'completed') {
        const blocking = blockingStages(t).filter((s) => s.status !== 'completed');
        // Steps that will be auto-closed are fine; only rejected / waiting mandatory steps block completion.
        const hard = blocking.filter((s) => s.status === 'rejected' || s.status === 'waiting_customer');
        if (hard.length) {
          if (!override) fail('MANDATORY_INCOMPLETE');
          if (!hasPermission(me!.role, 'cases.override')) fail('FORBIDDEN');
          if (!reason?.trim()) fail('REASON_REQUIRED');
          t.overrideReason = reason;
        }
        t.completedAt = todayIso();
        t.completedBy = me!.id;
      } else if (prev === 'completed') {
        t.completedAt = undefined;
        t.completedBy = undefined;
      }
      if (!t.startedAt && status !== 'new' && status !== 'cancelled') t.startedAt = todayIso();
      t.status = status;
      syncStagesToStatus(t, status);
      t.updatedAt = nowIso();
      t.updatedBy = me!.id;
      // Completing a service never creates a receipt: payment must be recorded separately.
      logActivity(
        'case',
        t.id,
        'status',
        { ar: `تغيير الحالة إلى «${STATUS_AR[status]}»${reason ? ` — ${reason}` : ''}`, en: `Status changed to ${status}${reason ? ` — ${reason}` : ''}` },
        Boolean(override && t.overrideReason)
      );
      persistDb();
      return clone(t);
    },

    async updateStage({ caseId, stageId, patch }) {
      await wait();
      const t = findTx(caseId);
      const s = t.stages.find((x) => x.id === stageId);
      if (!s) fail('NOT_FOUND');
      if (!canEditStage(actor(), t, s!)) fail('FORBIDDEN');
      if (t.status === 'completed' || t.status === 'cancelled') fail('INVALID_STATE');
      const prevStatus = s!.status;
      const allowed: (keyof WorkflowStage)[] = ['status', 'startDate', 'dueDate', 'completedDate', 'assigneeId', 'referenceNo', 'expectedCost', 'nextAction', 'rejectionReason', 'notes', 'applicable'];
      allowed.forEach((k) => {
        if (k in patch) (s as unknown as Record<string, unknown>)[k] = clone(patch[k]);
      });
      if (s!.status !== prevStatus) {
        if (prevStatus === 'not_started' && !s!.startDate) s!.startDate = todayIso();
        if (s!.status === 'completed' && !s!.completedDate) s!.completedDate = todayIso();
        if (s!.status !== 'completed') s!.completedDate = undefined;
        if (t.status === 'new' && s!.status !== 'not_started') {
          t.status = 'in_progress';
          t.startedAt = t.startedAt ?? todayIso();
        }
      }
      t.updatedAt = nowIso();
      t.updatedBy = getActor();
      const statusChanged = s!.status !== prevStatus;
      logActivity('case', t.id, 'stage', {
        ar: statusChanged ? `خطوة «${s!.nameAr}»: ${STAGE_AR[prevStatus]} ← ${STAGE_AR[s!.status]}` : `تحديث بيانات خطوة «${s!.nameAr}»`,
        en: statusChanged ? `Step "${s!.nameEn}": ${prevStatus} → ${s!.status}` : `Step "${s!.nameEn}" details updated`
      });
      persistDb();
      return clone(t);
    },

    async addNote(id, body, channel) {
      await wait();
      const t = findTx(id);
      const me = actor();
      if (!me || me.role === 'manager') fail('FORBIDDEN');
      t.notes.push({ id: uid('note'), body, channel, authorId: me!.id, createdAt: nowIso() });
      persistDb();
      return clone(t);
    },

    async remove(id) {
      await wait();
      requirePerm('cases.delete');
      const db = getDb();
      const t = findTx(id);
      const linked =
      db.receipts.some((r) => r.allocations.some((a) => a.transactionId === id)) ||
      db.payments.some((p) => p.transactionId === id) ||
      db.invoices.some((i) => i.state !== 'cancelled' && i.lines.some((l) => l.transactionId === id));
      if (linked) fail('HAS_FINANCIAL_RECORDS');
      db.transactions = db.transactions.filter((x) => x.id !== id);
      logActivity('case', id, 'deleted', { ar: `حذف المعاملة ${t.ref}`, en: `Deleted transaction ${t.ref}` });
      persistDb();
    }
  },

  catalog: { ...catalogBase, update: updateCatalog },

  invoices: {
    async list() {
      await wait();
      return clone(getDb().invoices);
    },
    async get(id) {
      await wait();
      const inv = getDb().invoices.find((i) => i.id === id);
      if (!inv) fail('NOT_FOUND');
      return clone(inv!);
    },
    async createFromTransactions(input) {
      await wait(250);
      requirePerm('finance.edit');
      const db = getDb();
      const dup = byRequest(db.invoices, input.requestId);
      if (dup) return clone(dup);
      if (!db.customers.some((c) => c.id === input.customerId)) fail('CUSTOMER_REQUIRED');
      const txs = input.transactionIds.map(findTx);
      txs.forEach((t) => {
        if (t.customerId !== input.customerId) fail('CUSTOMER_MISMATCH');
        if (t.status === 'cancelled') fail('TRANSACTION_CANCELLED');
        if (db.invoices.some((i) => i.state !== 'cancelled' && i.lines.some((l) => l.transactionId === t.id))) fail('ALREADY_INVOICED');
      });
      const svcName = (id: string) => db.catalog.find((s) => s.id === id);
      const lines: LineItem[] = [
      ...txs.map((t) => ({
        id: uid('li'),
        serviceId: t.serviceId,
        transactionId: t.id,
        descriptionAr: svcName(t.serviceId)?.nameAr ?? t.titleAr,
        descriptionEn: svcName(t.serviceId)?.nameEn ?? t.titleEn,
        beneficiary: t.titleAr.split('—')[1]?.trim(),
        quantity: 1,
        governmentFee: t.fees.governmentFee,
        providerCost: t.fees.providerCost,
        otherCosts: t.fees.otherCosts,
        serviceFee: t.fees.serviceFee,
        discount: t.fees.discount,
        vatTreatment: t.fees.vatTreatment
      })),
      ...input.extraLines.map((l) => ({ ...clone(l), id: uid('li') }))];

      if (!lines.length) fail('LINES_REQUIRED');
      const customer = db.customers.find((c) => c.id === input.customerId)!;
      const inv: Invoice = {
        id: uid('inv'),
        number: nextNumber(db.invoices, 'number', 'INV', true),
        customerId: input.customerId,
        companyId: input.companyId || txs.find((t) => t.companyId)?.companyId,
        date: input.date,
        dueDate: input.dueDate,
        lines,
        vatRate: db.settings.vatRate,
        state: input.state,
        notes: input.notes,
        terms: db.settings.invoiceTerms,
        createdBy: getActor(),
        createdAt: nowIso(),
        branchId: txs[0]?.branchId ?? customer.branchId,
        requestId: input.requestId
      };
      db.invoices.unshift(inv);
      logActivity('invoice', inv.id, 'created', { ar: `إصدار الفاتورة ${inv.number}`, en: `Invoice ${inv.number} created` });
      txs.forEach((t) => logActivity('case', t.id, 'invoiced', { ar: `إضافة المعاملة إلى الفاتورة ${inv.number}`, en: `Added to invoice ${inv.number}` }));
      persistDb();
      return clone(inv);
    },
    async setState(id, state) {
      await wait();
      requirePerm('finance.edit');
      const inv = getDb().invoices.find((i) => i.id === id);
      if (!inv) fail('NOT_FOUND');
      if (inv!.state === 'cancelled') fail('INVALID_STATE');
      if (state === 'draft' && inv!.state !== 'draft') fail('INVALID_STATE');
      inv!.state = state;
      logActivity('invoice', inv!.id, state, { ar: `${state === 'cancelled' ? 'إلغاء' : 'إصدار'} الفاتورة ${inv!.number}`, en: `Invoice ${inv!.number} ${state}` });
      persistDb();
      return clone(inv!);
    }
  },

  receipts: {
    async list() {
      await wait();
      return clone(getDb().receipts);
    },
    async get(id) {
      await wait();
      const r = getDb().receipts.find((x) => x.id === id);
      if (!r) fail('NOT_FOUND');
      return clone(r!);
    },
    async record(input) {
      await wait(200);
      requirePerm('collections.record');
      const r = recordReceiptSync(input);
      persistDb();
      return clone(r);
    },
    async remove(id, reason) {
      await wait();
      requirePerm('vouchers.delete');
      if (!reason?.trim()) fail('REASON_REQUIRED');
      const db = getDb();
      const r = db.receipts.find((x) => x.id === id);
      if (!r) fail('NOT_FOUND');
      db.receipts = db.receipts.filter((x) => x.id !== id);
      logActivity('receipt', id, 'deleted', { ar: `حذف ${r!.number} بمبلغ ${money(r!.amount)} — السبب: ${reason}`, en: `Deleted ${r!.number} (${money(r!.amount)}) — reason: ${reason}` }, true);
      persistDb();
    }
  },

  payments: {
    async list() {
      await wait();
      return clone(getDb().payments);
    },
    async get(id) {
      await wait();
      const p = getDb().payments.find((x) => x.id === id);
      if (!p) fail('NOT_FOUND');
      return clone(p!);
    },
    async record(input) {
      await wait(200);
      requirePerm('payments.record');
      const p = recordPaymentSync(input);
      persistDb();
      return clone(p);
    },
    async remove(id, reason) {
      await wait();
      requirePerm('vouchers.delete');
      if (!reason?.trim()) fail('REASON_REQUIRED');
      const db = getDb();
      const p = db.payments.find((x) => x.id === id);
      if (!p) fail('NOT_FOUND');
      db.payments = db.payments.filter((x) => x.id !== id);
      logActivity('payment', id, 'deleted', { ar: `حذف ${p!.number} بمبلغ ${money(p!.amount)} — السبب: ${reason}`, en: `Deleted ${p!.number} (${money(p!.amount)}) — reason: ${reason}` }, true);
      persistDb();
    }
  },

  expenses: (() => {
    const base = mockEntity('expenses', { activity: 'expense', label: { ar: 'مصروف تشغيلي', en: 'operating expense' }, numberField: 'number', prefix: 'EXP', yearly: true, edit: 'finance.edit' });
    return {
      ...base,
      async create(input) {
        if (!(input.amount > 0)) fail('INVALID_AMOUNT');
        assertAccount(input.accountId);
        return base.create({ ...input, number: '', createdBy: getActor(), createdAt: nowIso() });
      }
    };
  })(),

  transfers: {
    async list() {
      await wait();
      return clone(getDb().transfers);
    },
    async get(id) {
      await wait();
      const t = getDb().transfers.find((x) => x.id === id);
      if (!t) fail('NOT_FOUND');
      return clone(t!);
    },
    async record(input) {
      await wait();
      requirePerm('finance.edit');
      const db = getDb();
      const dup = byRequest(db.transfers, input.requestId);
      if (dup) return clone(dup);
      if (!(input.amount > 0)) fail('INVALID_AMOUNT');
      if (input.fromAccountId === input.toAccountId) fail('SAME_ACCOUNT');
      assertAccount(input.fromAccountId);
      assertAccount(input.toAccountId);
      const tr = { ...clone(input), id: uid('trf'), number: nextNumber(db.transfers, 'number', 'TRF', true), createdBy: getActor(), createdAt: nowIso() };
      db.transfers.unshift(tr);
      logActivity('transfer', tr.id, 'created', { ar: `تحويل ${money(tr.amount)} بين الحسابات — ${tr.number}`, en: `Transfer ${money(tr.amount)} — ${tr.number}` });
      persistDb();
      return clone(tr);
    }
  },

  accounts: mockEntity('accounts', { activity: 'account', label: { ar: 'حساب', en: 'account' }, numberField: 'code', prefix: 'ACC', edit: 'settings.manage' }),
  suppliers: mockEntity('suppliers', { activity: 'supplier', label: { ar: 'مورد / جهة', en: 'supplier' }, numberField: 'code', prefix: 'SUP', edit: 'finance.edit' }),
  documents: mockEntity('documents', { activity: 'document', label: { ar: 'مستند', en: 'document' }, edit: 'documents.edit' }),
  tasks: mockEntity('tasks', { label: { ar: 'مهمة', en: 'task' }, edit: 'tasks.edit' }),
  users: (() => {
    const base = mockEntity('users', { activity: 'user', label: { ar: 'مستخدم', en: 'user' }, edit: 'users.manage' });
    return {
      ...base,
      async create(input) {
        const users = getDb().users;
        if (users.some((u) => u.email.toLowerCase() === input.email.trim().toLowerCase())) fail('EMAIL_TAKEN');
        return base.create(input);
      },
      async update(id, patch) {
        if (id === getActor() && (patch.active === false || patch.role && patch.role !== actor()?.role)) fail('CANNOT_CHANGE_SELF');
        if (patch.email && getDb().users.some((u) => u.id !== id && u.email.toLowerCase() === patch.email!.trim().toLowerCase())) fail('EMAIL_TAKEN');
        return base.update(id, patch);
      },
      async remove() {
        // Users are deactivated, never deleted, so authorship of past records stays intact.
        fail('USE_DEACTIVATE');
      }
    };
  })(),
  activity: {
    async list() {
      await wait();
      return clone(getDb().activity);
    }
  },
  priceHistory: {
    async list() {
      await wait();
      return clone(getDb().priceHistory);
    }
  },
  settings: {
    async get() {
      await wait();
      return clone(getDb().settings);
    },
    async update(patch) {
      await wait();
      requirePerm('settings.manage');
      const db = getDb();
      db.settings = { ...db.settings, ...clone(patch) };
      logActivity('settings', 'settings', 'updated', { ar: 'تحديث إعدادات النظام', en: 'System settings updated' });
      persistDb();
      return clone(db.settings);
    }
  },
  demo: {
    async reset() {
      await wait(300);
      requirePerm('settings.manage');
      resetDb();
    }
  }
};

const STATUS_AR: Record<CaseStatus, string> = {
  new: 'جديدة',
  in_progress: 'قيد التنفيذ',
  waiting_documents: 'بانتظار مستندات',
  waiting_payment: 'بانتظار تحصيل المبلغ',
  submitted: 'تم تقديم الطلب',
  completed: 'مكتملة',
  rejected: 'مرفوضة',
  cancelled: 'ملغاة'
};

const STAGE_AR: Record<StageStatus, string> = {
  not_started: 'لم تبدأ',
  in_progress: 'قيد التنفيذ',
  waiting_customer: 'بانتظار العميل',
  waiting_payment: 'بانتظار الدفع',
  submitted: 'تم التقديم',
  completed: 'مكتملة',
  rejected: 'مرفوضة',
  cancelled: 'ملغاة'
};
