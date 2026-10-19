import { describe, expect, it } from 'vitest';
import type { Transaction } from '../types/cases';
import type { Account, Expense, Invoice, Payment, Receipt, Transfer } from '../types/finance';
import { accountBalances, allocateAmount, buildCashMovements, buildInvoiceViews, feeTotals, summarizeTransaction } from './finance';
import { buildLedger, dashboardMetrics } from './reports';

const fees = { governmentFee: 500, providerCost: 300, otherCosts: 50, serviceFee: 200, discount: 20, vatTreatment: 'standard' as const, vatRate: 5 };

function tx(over: Partial<Transaction> = {}): Transaction {
  return {
    id: 't1',
    ref: 'TRX-T-1',
    serviceId: 'svc',
    type: 'residence',
    pathway: 'standard',
    titleAr: 'x',
    titleEn: 'x',
    customerId: 'c1',
    status: 'in_progress',
    priority: 'normal',
    branchId: 'deira',
    officerId: 'u1',
    createdBy: 'u1',
    createdAt: '2026-05-10T09:00:00',
    transactionDate: '2026-05-10',
    dueDate: '2026-05-20',
    fees,
    stages: [],
    notes: [],
    ...over
  };
}

const rcp = (amount: number, over: Partial<Receipt> = {}): Receipt => ({
  id: `r${amount}${over.kind ?? ''}${over.date ?? ''}`,
  number: 'RCV',
  kind: 'receipt',
  customerId: 'c1',
  allocations: [{ transactionId: 't1', amount }],
  date: '2026-05-10',
  amount,
  method: 'cash',
  accountId: 'cash',
  receivedBy: 'u1',
  createdAt: '2026-05-10T10:00:00Z',
  branchId: 'deira',
  ...over
});

const pay = (amount: number, over: Partial<Payment> = {}): Payment => ({
  id: `p${amount}`,
  number: 'PAY',
  category: 'government_fee',
  payeeName: 'gov',
  transactionId: 't1',
  date: '2026-05-10',
  amount,
  method: 'card',
  accountId: 'card',
  paidBy: 'u1',
  createdAt: '2026-05-10T10:00:00Z',
  branchId: 'deira',
  ...over
});

describe('feeTotals', () => {
  it('computes the customer amount due with VAT only on the net office fee', () => {
    const t = feeTotals(fees, 5);
    expect(t.directCosts).toBe(850);
    expect(t.netService).toBe(180);
    expect(t.vat).toBe(9); // 5% of 180 — never on government fees
    expect(t.due).toBe(1039); // 500 + 300 + 50 + 200 − 20 + 9
  });

  it('caps the discount at the office fee and ignores VAT when not standard-rated', () => {
    const t = feeTotals({ ...fees, discount: 999, vatTreatment: 'exempt' }, 5);
    expect(t.discount).toBe(200);
    expect(t.netService).toBe(0);
    expect(t.vat).toBe(0);
    expect(t.due).toBe(850);
  });
});

describe('summarizeTransaction', () => {
  it('handles a customer paying nothing yet', () => {
    const s = summarizeTransaction(tx(), [], []);
    expect(s.collected).toBe(0);
    expect(s.customerBalance).toBe(1039);
    expect(s.payable).toBe(850);
    expect(s.estimatedProfit).toBe(180);
    expect(s.realizedProfit).toBeNull();
    expect(s.realizedUnknownReason).toBe('not_completed');
  });

  it('handles partial collection and partial cost payment independently', () => {
    const s = summarizeTransaction(tx(), [rcp(400)], [pay(500)]);
    expect(s.collected).toBe(400);
    expect(s.customerBalance).toBe(639);
    expect(s.paidOut).toBe(500);
    expect(s.payable).toBe(350);
  });

  it('nets refunds out of the collected amount', () => {
    const s = summarizeTransaction(tx(), [rcp(1039), rcp(100, { kind: 'refund' })], []);
    expect(s.received).toBe(1039);
    expect(s.refunded).toBe(100);
    expect(s.collected).toBe(939);
    expect(s.customerBalance).toBe(100);
  });

  it('realized profit = net office fee when costs match what was recharged; VAT is never profit', () => {
    const s = summarizeTransaction(tx({ status: 'completed', completedAt: '2026-05-12' }), [rcp(1039)], [pay(500), pay(300, { id: 'p300', category: 'provider_cost' }), pay(50, { id: 'p50', category: 'other_direct_cost' })]);
    expect(s.payable).toBe(0);
    expect(s.realizedProfit).toBe(180);
  });

  it('an extra unrecharged expense reduces both estimated and realized profit', () => {
    const payments = [pay(500), pay(300, { id: 'a', category: 'provider_cost' }), pay(50, { id: 'b', category: 'other_direct_cost' }), pay(40, { id: 'c', category: 'other_direct_cost' })];
    const s = summarizeTransaction(tx({ status: 'completed', completedAt: '2026-05-12' }), [], payments);
    expect(s.costOverrun).toBe(40);
    expect(s.estimatedProfit).toBe(140);
    expect(s.realizedProfit).toBe(140);
    expect(s.customerBalance).toBe(1039); // completing does not mean the customer paid
  });

  it('keeps realized profit unknown while expected costs are still unpaid', () => {
    const s = summarizeTransaction(tx({ status: 'completed', completedAt: '2026-05-12' }), [rcp(1039)], [pay(500)]);
    expect(s.realizedProfit).toBeNull();
    expect(s.realizedUnknownReason).toBe('costs_pending');
  });

  it('finalized costs clear the payable and count savings', () => {
    const s = summarizeTransaction(tx({ status: 'completed', completedAt: '2026-05-12', costsFinalized: true }), [], [pay(800)]);
    expect(s.payable).toBe(0);
    expect(s.realizedProfit).toBe(230); // 180 + 50 saved
  });

  it('cancelled transactions are not receivables; money held becomes a customer credit', () => {
    const s = summarizeTransaction(tx({ status: 'cancelled' }), [rcp(300)], []);
    expect(s.receivable).toBe(0);
    expect(s.customerBalance).toBe(-300);
    expect(s.payable).toBe(0);
    expect(s.estimatedProfit).toBeNull();
  });
});

describe('allocateAmount', () => {
  it('fills oldest balances first and leaves the excess unallocated', () => {
    const a = allocateAmount(700, [
    { transactionId: 'a', balance: 300 },
    { transactionId: 'b', balance: 0 },
    { transactionId: 'c', balance: 250 }]
    );
    expect(a).toEqual([
    { transactionId: 'a', amount: 300 },
    { transactionId: 'c', amount: 250 }]
    );
  });
});

describe('invoices', () => {
  const inv: Invoice = {
    id: 'i1',
    number: 'INV-1',
    customerId: 'c1',
    date: '2026-05-10',
    dueDate: '2099-01-01',
    lines: [{ id: 'l1', transactionId: 't1', descriptionAr: 'x', descriptionEn: 'x', quantity: 1, governmentFee: 500, providerCost: 300, otherCosts: 50, serviceFee: 200, discount: 20, vatTreatment: 'standard' }],
    vatRate: 5,
    state: 'issued',
    notes: '',
    terms: '',
    createdBy: 'u1',
    createdAt: '2026-05-10T10:00:00Z',
    branchId: 'deira'
  };

  it('counts a receipt linked to both the invoice and its transaction only once', () => {
    const v = buildInvoiceViews([inv], [rcp(400, { invoiceId: 'i1' })])[0];
    expect(v.paid).toBe(400);
    expect(v.balance).toBe(639);
    expect(v.status).toBe('partially_paid');
  });

  it('counts collections recorded before the invoice existed', () => {
    const v = buildInvoiceViews([inv], [rcp(1039)])[0];
    expect(v.status).toBe('paid');
    expect(v.balance).toBe(0);
  });
});

describe('cash movements', () => {
  const accounts: Account[] = [
  { id: 'cash', code: 'A1', nameAr: 'نقد', nameEn: 'Cash', kind: 'cash', openingBalance: 1000, openingDate: '2026-01-01', active: true },
  { id: 'card', code: 'A2', nameAr: 'بطاقة', nameEn: 'Card', kind: 'other', openingBalance: 2000, openingDate: '2026-01-01', active: true }];

  const transfers: Transfer[] = [{ id: 'tr', number: 'TRF', fromAccountId: 'cash', toAccountId: 'card', amount: 100, date: '2026-05-11', createdBy: 'u1', createdAt: '2026-05-11T09:00:00Z' }];
  const expenses: Expense[] = [
  { id: 'e1', number: 'EXP', category: 'rent', date: '2026-05-10', amount: 50, method: 'cash', accountId: 'cash', paid: true, createdBy: 'u1', createdAt: '2026-05-10T09:00:00Z', branchId: 'deira' },
  { id: 'e2', number: 'EXP2', category: 'rent', date: '2026-05-10', amount: 70, method: 'cash', accountId: 'cash', paid: false, createdBy: 'u1', createdAt: '2026-05-10T09:00:00Z', branchId: 'deira' }];


  it('derives balances only from vouchers and transfers; unpaid expenses move no cash', () => {
    const mv = buildCashMovements([rcp(400), rcp(30, { kind: 'refund' })], [pay(500)], expenses, transfers);
    expect(mv).toHaveLength(6);
    const [cash, card] = accountBalances(accounts, mv);
    expect(cash.balance).toBe(1000 + 400 - 30 - 50 - 100);
    expect(card.balance).toBe(2000 - 500 + 100);
    expect(cash.transfersOut).toBe(100);
  });
});

describe('dashboardMetrics', () => {
  it('uses each receipt/payment date, not the transaction creation date', () => {
    const t = tx({ createdAt: '2026-05-01T09:00:00', transactionDate: '2026-05-01' });
    const ledger = buildLedger({
      transactions: [t],
      receipts: [rcp(300, { date: '2026-05-01' }), rcp(200, { date: '2026-05-03', id: 'late' })],
      payments: [pay(500, { date: '2026-05-03' })],
      expenses: [],
      invoices: [],
      transfers: [],
      accounts: []
    });
    const m = dashboardMetrics(ledger, { from: '2026-05-03', to: '2026-05-03' });
    expect(m.registered).toHaveLength(0);
    expect(m.collected).toBe(200);
    expect(m.paidOut).toBe(500);
    expect(m.netCash).toBe(-300);
  });
});

describe('office price sheet', () => {
  it('customer amount due equals the customer price on the sheet', async () => {
    const { serviceCatalogSeed } = await import('../data/pricing');
    const due = (id: string) => {
      const s = serviceCatalogSeed.find((x) => x.id === id)!;
      return feeTotals({ ...s, discount: 0 }, 5).due;
    };
    expect(due('svc-offer')).toBe(276);
    expect(due('svc-wp-fee')).toBe(3550);
    expect(due('svc-wp-fee-2')).toBe(1286);
    expect(due('svc-entry-2')).toBe(1125);
    expect(due('svc-medical')).toBe(330);
    expect(due('svc-imm-cancel-in')).toBe(325.65);
    expect(due('svc-est-update-work')).toBe(523.3);
    expect(due('svc-visit-3m')).toBe(1752);
    expect(serviceCatalogSeed.find((x) => x.id === 'svc-tawjeeh')!.templateId).toBe('tawjeeh');
  });
});
