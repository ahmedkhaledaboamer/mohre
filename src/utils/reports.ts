import type { Transaction } from '../types/cases';
import type { ServiceCatalogItem } from '../types/catalog';
import type { Account, Expense, Invoice, Payment, Receipt, Transfer } from '../types/finance';
import type { User } from '../types/system';
import type { BranchId } from '../types/common';
import { buildCashMovements, round2, summarizeTransactions, type CashMovement, type TxSummary } from './finance';
import { eachDay, inRange, localDay } from './dates';
import { caseFlags, isOpen } from './cases';

export interface LedgerData {
  transactions: Transaction[];
  receipts: Receipt[];
  payments: Payment[];
  expenses: Expense[];
  invoices: Invoice[];
  transfers: Transfer[];
  accounts: Account[];
}

export interface Ledger extends LedgerData {
  summaries: Map<string, TxSummary>;
  list: TxSummary[];
  movements: CashMovement[];
}

/** The single derived view of all money and work. Built from React Query data; never stored. */
export function buildLedger(d: LedgerData, branch: BranchId | 'all' = 'all'): Ledger {
  const keep = <T extends {branchId: BranchId;},>(arr: T[]) => branch === 'all' ? arr : arr.filter((x) => x.branchId === branch);
  const transactions = keep(d.transactions);
  const receipts = keep(d.receipts);
  const payments = keep(d.payments);
  const expenses = keep(d.expenses);
  const invoices = keep(d.invoices);
  // Summaries always use every voucher for a transaction, even one recorded under another branch.
  const summaries = summarizeTransactions(transactions, d.receipts, d.payments);
  return {
    transactions,
    receipts,
    payments,
    expenses,
    invoices,
    transfers: d.transfers,
    accounts: d.accounts,
    summaries,
    list: [...summaries.values()],
    movements: buildCashMovements(receipts, payments, expenses, d.transfers)
  };
}

export interface Range {
  from: string;
  to: string;
}

const sum = <T,>(arr: T[], f: (x: T) => number) => round2(arr.reduce((a, x) => a + f(x), 0));

export interface DashboardMetrics {
  registered: TxSummary[];
  completed: TxSummary[];
  receipts: Receipt[];
  refunds: Receipt[];
  collected: number;
  payments: Payment[];
  paidOut: number;
  expensesPaid: Expense[];
  opex: number;
  serviceFees: number;
  receivables: TxSummary[];
  receivablesTotal: number;
  payables: TxSummary[];
  unpaidExpenses: Expense[];
  payablesTotal: number;
  netCash: number;
  realized: TxSummary[];
  realizedTotal: number;
  realizedUnknown: TxSummary[];
}

/**
 * Cash figures use the date of each individual receipt / payment / expense — never the
 * transaction's creation date — and are real collections, not invoiced totals.
 */
export function dashboardMetrics(l: Ledger, r: Range): DashboardMetrics {
  const registered = l.list.filter((s) => inRange(s.tx.createdAt, r.from, r.to));
  const completed = l.list.filter((s) => s.tx.status === 'completed' && inRange(s.tx.completedAt, r.from, r.to));
  const inPeriod = l.receipts.filter((x) => inRange(x.date, r.from, r.to));
  const receipts = inPeriod.filter((x) => x.kind === 'receipt');
  const refunds = inPeriod.filter((x) => x.kind === 'refund');
  const collected = round2(sum(receipts, (x) => x.amount) - sum(refunds, (x) => x.amount));
  const payments = l.payments.filter((x) => inRange(x.date, r.from, r.to));
  const paidOut = sum(payments, (x) => x.amount);
  const expensesPaid = l.expenses.filter((x) => x.paid && inRange(x.date, r.from, r.to));
  const opex = sum(expensesPaid, (x) => x.amount);
  const receivables = l.list.filter((s) => s.receivable > 0);
  const payables = l.list.filter((s) => s.payable > 0);
  const unpaidExpenses = l.expenses.filter((x) => !x.paid);
  const realized = completed.filter((s) => s.realizedProfit !== null);
  return {
    registered,
    completed,
    receipts,
    refunds,
    collected,
    payments,
    paidOut,
    expensesPaid,
    opex,
    serviceFees: sum(registered.filter((s) => s.tx.status !== 'cancelled'), (s) => s.totals.netService),
    receivables,
    receivablesTotal: sum(receivables, (s) => s.receivable),
    payables,
    unpaidExpenses,
    payablesTotal: round2(sum(payables, (s) => s.payable) + sum(unpaidExpenses, (x) => x.amount)),
    // Refunds are included through `collected` (net of refunds).
    netCash: round2(collected - paidOut - opex),
    realized,
    realizedTotal: sum(realized, (s) => s.realizedProfit ?? 0),
    realizedUnknown: completed.filter((s) => s.realizedProfit === null)
  };
}

export interface DayPoint {
  date: string;
  collected: number;
  paid: number;
  expenses: number;
  registered: number;
}

export function dailySeries(l: Ledger, from: string, to: string): DayPoint[] {
  return eachDay(from, to).map((date) => ({
    date,
    collected: round2(sum(l.receipts.filter((x) => x.date === date && x.kind === 'receipt'), (x) => x.amount) - sum(l.receipts.filter((x) => x.date === date && x.kind === 'refund'), (x) => x.amount)),
    paid: sum(l.payments.filter((x) => x.date === date), (x) => x.amount),
    expenses: sum(l.expenses.filter((x) => x.paid && x.date === date), (x) => x.amount),
    registered: l.transactions.filter((t) => localDay(t.createdAt) === date).length
  }));
}

export interface ServiceStat {
  serviceId: string;
  count: number;
  completed: number;
  due: number;
  netService: number;
  estimatedProfit: number;
  realizedProfit: number;
  realizedKnown: number;
  realizedUnknown: number;
  collected: number;
}

/** Per-service totals over transactions registered in the range (cancelled excluded from money). */
export function serviceStats(l: Ledger, r: Range, filter?: (s: TxSummary) => boolean): ServiceStat[] {
  const map = new Map<string, ServiceStat>();
  l.list.
  filter((s) => inRange(s.tx.createdAt, r.from, r.to) && (!filter || filter(s))).
  forEach((s) => {
    const st = map.get(s.tx.serviceId) ?? { serviceId: s.tx.serviceId, count: 0, completed: 0, due: 0, netService: 0, estimatedProfit: 0, realizedProfit: 0, realizedKnown: 0, realizedUnknown: 0, collected: 0 };
    st.count += 1;
    if (s.tx.status === 'completed') st.completed += 1;
    if (s.tx.status !== 'cancelled') {
      st.due = round2(st.due + s.totals.due);
      st.netService = round2(st.netService + s.totals.netService);
      st.estimatedProfit = round2(st.estimatedProfit + (s.estimatedProfit ?? 0));
    }
    st.collected = round2(st.collected + s.collected);
    if (s.realizedProfit !== null) {
      st.realizedProfit = round2(st.realizedProfit + s.realizedProfit);
      st.realizedKnown += 1;
    } else if (s.tx.status === 'completed') st.realizedUnknown += 1;
    map.set(s.tx.serviceId, st);
  });
  return [...map.values()].sort((a, b) => b.count - a.count);
}

export interface EmployeeStat {
  user: User;
  /** Transactions this person registered (createdBy) — edits never count as new transactions. */
  registered: TxSummary[];
  /** Transactions this person marked as completed in the range. */
  completed: TxSummary[];
  /** Transactions this person executes (officer), registered in the range. */
  executed: TxSummary[];
  services: string[];
  registeredValue: number;
  /** Receipts this person physically recorded — not receipts on "their" transactions. */
  collected: number;
  receipts: Receipt[];
  /** Payment vouchers this person recorded. */
  paidOut: number;
  payments: Payment[];
  officeFees: number;
  overdue: TxSummary[];
  needsReview: TxSummary[];
}

/** A transaction needs review when it is rejected, or closed with money still open. */
export const needsReview = (s: TxSummary) => s.tx.status === 'rejected' || s.tx.status === 'completed' && (s.receivable > 0 || s.payable > 0);

export function employeePerformance(l: Ledger, users: User[], r: Range, opts: {serviceId?: string;} = {}): EmployeeStat[] {
  const svcOk = (s: TxSummary) => !opts.serviceId || s.tx.serviceId === opts.serviceId;
  return users.map((user) => {
    const registered = l.list.filter((s) => s.tx.createdBy === user.id && inRange(s.tx.createdAt, r.from, r.to) && svcOk(s));
    const completed = l.list.filter((s) => s.tx.completedBy === user.id && s.tx.status === 'completed' && inRange(s.tx.completedAt, r.from, r.to) && svcOk(s));
    const executed = l.list.filter((s) => s.tx.officerId === user.id && inRange(s.tx.createdAt, r.from, r.to) && svcOk(s));
    const txOk = (id?: string) => !opts.serviceId || Boolean(id && l.summaries.get(id)?.tx.serviceId === opts.serviceId);
    const receipts = l.receipts.filter((x) => x.receivedBy === user.id && inRange(x.date, r.from, r.to) && txOk(x.allocations[0]?.transactionId));
    const payments = l.payments.filter((x) => x.paidBy === user.id && inRange(x.date, r.from, r.to) && txOk(x.transactionId));
    const mineOpen = l.list.filter((s) => s.tx.officerId === user.id && svcOk(s));
    return {
      user,
      registered,
      completed,
      executed,
      services: [...new Set([...registered, ...executed].map((s) => s.tx.serviceId))],
      registeredValue: sum(registered.filter((s) => s.tx.status !== 'cancelled'), (s) => s.totals.due),
      collected: round2(sum(receipts.filter((x) => x.kind === 'receipt'), (x) => x.amount) - sum(receipts.filter((x) => x.kind === 'refund'), (x) => x.amount)),
      receipts,
      paidOut: sum(payments, (x) => x.amount),
      payments,
      officeFees: sum(executed.filter((s) => s.tx.status !== 'cancelled'), (s) => s.totals.netService),
      overdue: mineOpen.filter((s) => isOpen(s.tx) && caseFlags(s.tx).overdue),
      needsReview: mineOpen.filter(needsReview)
    };
  });
}

export function topBy<T>(arr: T[], key: (x: T) => string, value: (x: T) => number, n = 5) {
  const m = new Map<string, number>();
  arr.forEach((x) => m.set(key(x), round2((m.get(key(x)) ?? 0) + value(x))));
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => ({ key: k, value: v }));
}

export const serviceName = (catalog: ServiceCatalogItem[], id: string, lang: 'ar' | 'en') => {
  const s = catalog.find((x) => x.id === id);
  return s ? lang === 'ar' ? s.nameAr : s.nameEn || s.nameAr : id;
};
