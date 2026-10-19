import type { Transaction, TransactionFees } from '../types/cases';
import type { Allocation, Expense, Invoice, InvoiceStatus, LineItem, Payment, Receipt, Transfer, Account } from '../types/finance';
import { daysUntil } from './dates';

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const sum = <T,>(arr: T[], f: (x: T) => number) => round2(arr.reduce((a, x) => a + f(x), 0));

/* ─────────────────────────── Fee arithmetic ─────────────────────────── */

export interface FeeTotals {
  government: number;
  provider: number;
  other: number;
  /** government + provider + other: pass-through amounts recharged to the customer. */
  directCosts: number;
  service: number;
  discount: number;
  /** Office service fee after discount — the only office revenue on a transaction. */
  netService: number;
  taxable: number;
  /** Output VAT — a liability collected for the tax authority, never profit. */
  vat: number;
  /** Customer Amount Due = Gov + Provider + Other + Service − Discount + VAT. */
  due: number;
}

type FeeInput = Pick<TransactionFees, 'governmentFee' | 'providerCost' | 'otherCosts' | 'serviceFee' | 'discount' | 'vatTreatment'>;

/** VAT applies only to the office's net service fee when the treatment is "standard". */
export function feeTotals(f: FeeInput, vatRate: number, quantity = 1): FeeTotals {
  const q = Number(quantity) || 0;
  const government = round2((Number(f.governmentFee) || 0) * q);
  const provider = round2((Number(f.providerCost) || 0) * q);
  const other = round2((Number(f.otherCosts) || 0) * q);
  const service = round2((Number(f.serviceFee) || 0) * q);
  // A discount can never exceed the office fee: government fees are not discountable.
  const discount = round2(Math.min(Math.max(Number(f.discount) || 0, 0), service));
  const netService = round2(service - discount);
  const taxable = f.vatTreatment === 'standard' ? netService : 0;
  const vat = round2(taxable * (Number(vatRate) || 0) / 100);
  const directCosts = round2(government + provider + other);
  return { government, provider, other, directCosts, service, discount, netService, taxable, vat, due: round2(directCosts + netService + vat) };
}

export const txTotals = (t: Transaction) => feeTotals(t.fees, t.fees.vatRate);

const ZERO: FeeTotals = { government: 0, provider: 0, other: 0, directCosts: 0, service: 0, discount: 0, netService: 0, taxable: 0, vat: 0, due: 0 };

export function addTotals(a: FeeTotals, b: FeeTotals): FeeTotals {
  const out = { ...a };
  (Object.keys(out) as (keyof FeeTotals)[]).forEach((k) => {
    out[k] = round2(a[k] + b[k]);
  });
  return out;
}

export const lineTotals = (l: LineItem, vatRate: number) => feeTotals(l, vatRate, l.quantity);
export const sumTotals = (lines: LineItem[], vatRate: number) => lines.reduce((acc, l) => addTotals(acc, lineTotals(l, vatRate)), { ...ZERO });

/* ─────────────────────────── Receipts ─────────────────────────── */

/** Signed effect of a receipt on what the customer has paid: receipts add, refunds subtract. */
export const receiptSign = (r: Receipt) => r.kind === 'refund' ? -1 : 1;

/** Net amount a receipt applies to one transaction (signed). */
export function allocatedTo(r: Receipt, transactionId: string, stageId?: string) {
  const s = receiptSign(r);
  return r.allocations.filter((a) => a.transactionId === transactionId && (!stageId || a.stageId === stageId)).reduce((acc, a) => acc + s * a.amount, 0);
}

/**
 * Splits an amount across open transaction balances, oldest first. Anything left over
 * stays unallocated (credit on the customer's account) instead of inflating a transaction.
 */
export function allocateAmount(amount: number, balances: {transactionId: string;balance: number;}[]): Allocation[] {
  let left = round2(amount);
  const out: Allocation[] = [];
  for (const b of balances) {
    if (left <= 0) break;
    const take = round2(Math.min(left, Math.max(b.balance, 0)));
    if (take > 0) {
      out.push({ transactionId: b.transactionId, amount: take });
      left = round2(left - take);
    }
  }
  return out;
}

/* ─────────────────────────── Invoices ─────────────────────────── */

export interface InvoiceView {
  invoice: Invoice;
  totals: FeeTotals;
  paid: number;
  balance: number;
  status: InvoiceStatus;
  daysOverdue: number;
}

export function invoiceStatus(inv: Invoice, paid: number, total: number): InvoiceStatus {
  if (inv.state === 'draft') return 'draft';
  if (inv.state === 'cancelled') return 'cancelled';
  if (paid >= total - 0.005) return 'paid';
  const d = daysUntil(inv.dueDate);
  if (d !== null && d < 0) return 'overdue';
  if (paid > 0) return 'partially_paid';
  return 'issued';
}

/**
 * Paid on an invoice = money allocated to the transactions it bills + the unallocated part of
 * receipts recorded directly against it (ad-hoc lines). Derived, so receipts recorded before the
 * invoice was issued count too and no receipt is ever counted twice.
 */
export function invoicePaid(invoice: Invoice, receipts: Receipt[]) {
  const txIds = new Set(invoice.lines.map((l) => l.transactionId).filter(Boolean) as string[]);
  let paid = 0;
  receipts.forEach((r) => {
    const s = receiptSign(r);
    const allocated = r.allocations.reduce((a, x) => a + x.amount, 0);
    paid += r.allocations.filter((a) => txIds.has(a.transactionId)).reduce((a, x) => a + s * x.amount, 0);
    if (r.invoiceId === invoice.id) paid += s * Math.max(r.amount - allocated, 0);
  });
  return round2(paid);
}

export function buildInvoiceViews(invoices: Invoice[], receipts: Receipt[]): InvoiceView[] {
  return invoices.map((invoice) => {
    const totals = sumTotals(invoice.lines, invoice.vatRate);
    const paid = Math.min(invoicePaid(invoice, receipts), totals.due);
    const status = invoiceStatus(invoice, paid, totals.due);
    const live = status !== 'draft' && status !== 'cancelled';
    const d = daysUntil(invoice.dueDate) ?? 0;
    return { invoice, totals, paid, balance: live ? round2(Math.max(totals.due - paid, 0)) : 0, status, daysOverdue: live && d < 0 ? -d : 0 };
  });
}

/* ─────────────────────────── Transaction ledger ─────────────────────────── */

export type ProfitUnknownReason = 'not_completed' | 'costs_pending' | 'cancelled';

export interface TxSummary {
  tx: Transaction;
  totals: FeeTotals;
  /** Gross receipts allocated to the transaction. */
  received: number;
  refunded: number;
  /** Customer Amount Collected (net of refunds). */
  collected: number;
  /** Government/Provider Amount Paid — from payment vouchers. */
  paidOut: number;
  paidGovernment: number;
  paidProvider: number;
  paidOther: number;
  /** Remaining Customer Balance = Due − Collected (negative = customer credit). Cancelled: −collected. */
  customerBalance: number;
  /** Positive part of the customer balance; zero for cancelled transactions. */
  receivable: number;
  /** Remaining Supplier/Government Payable. */
  payable: number;
  /** Actual direct payments above what is recharged to the customer (borne by the office). */
  costOverrun: number;
  /** Estimated Profit = Service − Discount + 0 (VAT is not revenue) − expected office-borne costs. */
  estimatedProfit: number | null;
  /** Realized Profit = Recognized office revenue − Actual office-borne costs, when determinable. */
  realizedProfit: number | null;
  realizedUnknownReason?: ProfitUnknownReason;
}

export function summarizeTransaction(tx: Transaction, receipts: Receipt[], payments: Payment[]): TxSummary {
  const totals = txTotals(tx);
  let received = 0;
  let refunded = 0;
  receipts.forEach((r) => {
    const amt = r.allocations.filter((a) => a.transactionId === tx.id).reduce((a, x) => a + x.amount, 0);
    if (!amt) return;
    if (r.kind === 'refund') refunded += amt;else
    received += amt;
  });
  received = round2(received);
  refunded = round2(refunded);
  const collected = round2(received - refunded);
  const mine = payments.filter((p) => p.transactionId === tx.id);
  const paidGovernment = sum(mine.filter((p) => p.category === 'government_fee'), (p) => p.amount);
  const paidProvider = sum(mine.filter((p) => p.category === 'provider_cost'), (p) => p.amount);
  const paidOther = sum(mine.filter((p) => p.category === 'other_direct_cost'), (p) => p.amount);
  const paidOut = round2(paidGovernment + paidProvider + paidOther);
  const cancelled = tx.status === 'cancelled';

  const customerBalance = cancelled ? round2(-collected) : round2(totals.due - collected);
  const payable = cancelled || tx.costsFinalized ? 0 : round2(Math.max(totals.directCosts - paidOut, 0));
  const costOverrun = round2(Math.max(paidOut - totals.directCosts, 0));

  // Tax revenue component is deliberately 0: output VAT is owed to the tax authority, not earned.
  const TAX_REVENUE_COMPONENT = 0;
  const estimatedProfit = cancelled ? null : round2(totals.netService + TAX_REVENUE_COMPONENT - costOverrun);

  let realizedProfit: number | null = null;
  let realizedUnknownReason: ProfitUnknownReason | undefined;
  if (cancelled) realizedUnknownReason = 'cancelled';else
  if (tx.status !== 'completed') realizedUnknownReason = 'not_completed';else
  if (payable > 0) realizedUnknownReason = 'costs_pending';else
  {
    // Recognized office revenue = net service fee; actual office-borne costs = direct payments not recharged.
    const officeBorne = round2(paidOut - totals.directCosts);
    realizedProfit = round2(totals.netService - officeBorne);
  }

  return {
    tx,
    totals,
    received,
    refunded,
    collected,
    paidOut,
    paidGovernment,
    paidProvider,
    paidOther,
    customerBalance,
    receivable: cancelled ? 0 : round2(Math.max(customerBalance, 0)),
    payable,
    costOverrun,
    estimatedProfit,
    realizedProfit,
    realizedUnknownReason
  };
}

export function summarizeTransactions(txs: Transaction[], receipts: Receipt[], payments: Payment[]) {
  return new Map(txs.map((t) => [t.id, summarizeTransaction(t, receipts, payments)]));
}

/* ─────────────────────────── Customer balances ─────────────────────────── */

export interface CustomerBalance {
  customerId: string;
  /** Charges from non-cancelled transactions plus ad-hoc invoice lines not tied to a transaction. */
  charged: number;
  /** All net money received from the customer, allocated or not. */
  collected: number;
  balance: number;
}

export function customerBalance(customerId: string, summaries: TxSummary[], receipts: Receipt[], invoices: Invoice[]): CustomerBalance {
  const txCharges = sum(summaries.filter((s) => s.tx.customerId === customerId && s.tx.status !== 'cancelled'), (s) => s.totals.due);
  const adHoc = invoices.
  filter((i) => i.customerId === customerId && i.state === 'issued').
  reduce((a, i) => a + sumTotals(i.lines.filter((l) => !l.transactionId), i.vatRate).due, 0);
  const collected = sum(receipts.filter((r) => r.customerId === customerId), (r) => receiptSign(r) * r.amount);
  const charged = round2(txCharges + adHoc);
  return { customerId, charged, collected, balance: round2(charged - collected) };
}

/** Running customer balance immediately after each of the customer's receipts (chronological). */
export function runningBalances(customerId: string, summaries: TxSummary[], receipts: Receipt[], invoices: Invoice[]) {
  const total = customerBalance(customerId, summaries, receipts, invoices);
  const mine = receipts.filter((r) => r.customerId === customerId).sort((a, b) => (a.date + a.createdAt).localeCompare(b.date + b.createdAt));
  let paid = 0;
  const out = new Map<string, number>();
  mine.forEach((r) => {
    paid = round2(paid + receiptSign(r) * r.amount);
    out.set(r.id, round2(total.charged - paid));
  });
  return out;
}

/* ─────────────────────────── Cash movements ─────────────────────────── */

export type MovementSource = 'receipt' | 'refund' | 'payment' | 'expense' | 'transfer';

export interface CashMovement {
  id: string;
  date: string;
  createdAt: string;
  accountId: string;
  direction: 'in' | 'out';
  amount: number;
  source: MovementSource;
  sourceId: string;
  number: string;
  userId: string;
  transactionId?: string;
  customerId?: string;
  counterparty?: string;
}

/** Every cash movement originates from exactly one voucher or transfer — nothing is synthesized. */
export function buildCashMovements(receipts: Receipt[], payments: Payment[], expenses: Expense[], transfers: Transfer[]): CashMovement[] {
  const out: CashMovement[] = [];
  receipts.forEach((r) =>
  out.push({
    id: `mv-${r.id}`,
    date: r.date,
    createdAt: r.createdAt,
    accountId: r.accountId,
    direction: r.kind === 'refund' ? 'out' : 'in',
    amount: r.amount,
    source: r.kind === 'refund' ? 'refund' : 'receipt',
    sourceId: r.id,
    number: r.number,
    userId: r.receivedBy,
    transactionId: r.allocations[0]?.transactionId,
    customerId: r.customerId
  })
  );
  payments.forEach((p) =>
  out.push({ id: `mv-${p.id}`, date: p.date, createdAt: p.createdAt, accountId: p.accountId, direction: 'out', amount: p.amount, source: 'payment', sourceId: p.id, number: p.number, userId: p.paidBy, transactionId: p.transactionId, customerId: p.customerId, counterparty: p.payeeName })
  );
  expenses.
  filter((e) => e.paid).
  forEach((e) =>
  out.push({ id: `mv-${e.id}`, date: e.date, createdAt: e.createdAt, accountId: e.accountId, direction: 'out', amount: e.amount, source: 'expense', sourceId: e.id, number: e.number, userId: e.createdBy, counterparty: e.beneficiary })
  );
  transfers.forEach((t) => {
    out.push({ id: `mv-${t.id}-out`, date: t.date, createdAt: t.createdAt, accountId: t.fromAccountId, direction: 'out', amount: t.amount, source: 'transfer', sourceId: t.id, number: t.number, userId: t.createdBy });
    out.push({ id: `mv-${t.id}-in`, date: t.date, createdAt: t.createdAt, accountId: t.toAccountId, direction: 'in', amount: t.amount, source: 'transfer', sourceId: t.id, number: t.number, userId: t.createdBy });
  });
  return out.sort((a, b) => (a.date + a.createdAt).localeCompare(b.date + b.createdAt));
}

export interface AccountBalance {
  account: Account;
  opening: number;
  inflow: number;
  outflow: number;
  transfersIn: number;
  transfersOut: number;
  balance: number;
}

export function accountBalances(accounts: Account[], movements: CashMovement[]): AccountBalance[] {
  return accounts.map((account) => {
    const mine = movements.filter((m) => m.accountId === account.id);
    const tIn = sum(mine.filter((m) => m.source === 'transfer' && m.direction === 'in'), (m) => m.amount);
    const tOut = sum(mine.filter((m) => m.source === 'transfer' && m.direction === 'out'), (m) => m.amount);
    const inflow = sum(mine.filter((m) => m.source !== 'transfer' && m.direction === 'in'), (m) => m.amount);
    const outflow = sum(mine.filter((m) => m.source !== 'transfer' && m.direction === 'out'), (m) => m.amount);
    return { account, opening: account.openingBalance, inflow, outflow, transfersIn: tIn, transfersOut: tOut, balance: round2(account.openingBalance + inflow - outflow + tIn - tOut) };
  });
}

/* ─────────────────────────── Aging ─────────────────────────── */

export interface AgingBucket {
  key: string;
  labelAr: string;
  labelEn: string;
  amount: number;
  count: number;
}

export function agingBuckets(views: InvoiceView[]): AgingBucket[] {
  const buckets: AgingBucket[] = [
  { key: 'current', labelAr: 'غير مستحق', labelEn: 'Current', amount: 0, count: 0 },
  { key: '1-30', labelAr: '1–30 يوم', labelEn: '1–30 days', amount: 0, count: 0 },
  { key: '31-60', labelAr: '31–60 يوم', labelEn: '31–60 days', amount: 0, count: 0 },
  { key: '61-90', labelAr: '61–90 يوم', labelEn: '61–90 days', amount: 0, count: 0 },
  { key: '90+', labelAr: '+90 يوم', labelEn: '90+ days', amount: 0, count: 0 }];

  views.
  filter((v) => v.balance > 0).
  forEach((v) => {
    const d = v.daysOverdue;
    const idx = d === 0 ? 0 : d <= 30 ? 1 : d <= 60 ? 2 : d <= 90 ? 3 : 4;
    buckets[idx].amount = round2(buckets[idx].amount + v.balance);
    buckets[idx].count += 1;
  });
  return buckets;
}

/** Suggested account for a payment method: cash → cash box, government card fees → payment card, others → bank. */
export function defaultAccountId(method: string, accounts: Account[], purpose: 'in' | 'gov' | 'out' = 'in') {
  const active = accounts.filter((a) => a.active);
  if (method === 'cash') return active.find((a) => a.kind === 'cash')?.id ?? active[0]?.id ?? '';
  if (purpose === 'gov' && method === 'card') return active.find((a) => a.kind === 'other')?.id ?? active.find((a) => a.kind === 'bank')?.id ?? '';
  return active.find((a) => a.kind === 'bank')?.id ?? active[0]?.id ?? '';
}
