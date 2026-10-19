import { beforeEach, describe, expect, it } from 'vitest';
import { mockApi, mockLatency } from './mockApi';
import { getDb, resetDb } from './mockDb';
import { setActor } from './session';
import { feesFromService } from '../utils/cases';
import { summarizeTransaction } from '../utils/finance';
import { buildLedger, employeePerformance } from '../utils/reports';
import type { RegisterTransactionInput } from './contracts';

mockLatency.ms = 0;

function baseInput(over: Partial<RegisterTransactionInput> = {}): RegisterTransactionInput {
  const svc = getDb().catalog.find((s) => s.id === 'svc-offer')!;
  return {
    requestId: `req-${Math.random()}`,
    serviceId: svc.id,
    customerId: 'cus-1',
    companyId: 'cmp-1',
    employeeId: 'emp-1',
    officerId: 'u-pro1',
    transactionDate: '2026-05-10',
    status: 'in_progress',
    priority: 'normal',
    fees: feesFromService(svc, 5),
    ...over
  };
}

beforeEach(() => {
  resetDb();
  setActor('u-pro1');
});

describe('seed data', () => {
  it('has the required, internally consistent volumes', () => {
    const db = getDb();
    expect(db.customers).toHaveLength(20);
    expect(db.companies).toHaveLength(10);
    expect(db.employees).toHaveLength(30);
    expect(db.users).toHaveLength(5);
    expect(db.transactions).toHaveLength(40);
    expect(db.catalog.length).toBeGreaterThanOrEqual(25);
    expect(db.invoices).toHaveLength(20);
    expect(db.receipts.filter((r) => r.kind === 'receipt')).toHaveLength(30);
    expect(db.payments).toHaveLength(25);
    expect(db.expenses).toHaveLength(15);
    expect(db.accounts.length).toBeGreaterThanOrEqual(2);
  });

  it('never over-collects or links to missing records', () => {
    const db = getDb();
    const ids = new Set(db.transactions.map((t) => t.id));
    db.receipts.forEach((r) => r.allocations.forEach((a) => expect(ids.has(a.transactionId)).toBe(true)));
    db.payments.forEach((p) => expect(!p.transactionId || ids.has(p.transactionId)).toBe(true));
    db.transactions.forEach((t) => {
      const s = summarizeTransaction(t, db.receipts, db.payments);
      if (t.status !== 'cancelled') expect(s.customerBalance).toBeGreaterThanOrEqual(-0.005);
    });
    expect(new Set(db.transactions.map((t) => t.ref)).size).toBe(40);
    expect(new Set(db.receipts.map((r) => r.number)).size).toBe(db.receipts.length);
  });

  it('is identical on every build', () => {
    const a = JSON.stringify(getDb().transactions);
    resetDb();
    expect(JSON.stringify(getDb().transactions)).toBe(a);
  });
});

describe('register transaction', () => {
  it('creates no receipt when nothing was collected', async () => {
    const before = getDb().receipts.length;
    const res = await mockApi.transactions.register(baseInput());
    expect(res.receipt).toBeUndefined();
    expect(getDb().receipts.length).toBe(before);
    expect(res.transaction.createdBy).toBe('u-pro1');
  });

  it('records only the actual partial amount collected, linked to the transaction', async () => {
    const res = await mockApi.transactions.register(baseInput({ collection: { amount: 100, method: 'cash', accountId: 'acc-cash' } }));
    expect(res.receipt?.amount).toBe(100);
    expect(res.receipt?.allocations).toEqual([{ transactionId: res.transaction.id, amount: 100 }]);
    expect(res.receipt?.receivedBy).toBe('u-pro1');
  });

  it('is idempotent: re-submitting the same request creates nothing new', async () => {
    const input = baseInput({
      collection: { amount: 100, method: 'cash', accountId: 'acc-cash' },
      costPayment: { amount: 150, method: 'card', accountId: 'acc-govcard', category: 'government_fee', payeeName: 'MOHRE' }
    });
    const counts = () => [getDb().transactions.length, getDb().receipts.length, getDb().payments.length];
    const first = await mockApi.transactions.register(input);
    const after = counts();
    const again = await mockApi.transactions.register(input);
    expect(again.duplicate).toBe(true);
    expect(again.transaction.id).toBe(first.transaction.id);
    expect(counts()).toEqual(after);
  });

  it('rejects collecting more than the amount due', async () => {
    await expect(mockApi.transactions.register(baseInput({ collection: { amount: 99999, method: 'cash', accountId: 'acc-cash' } }))).rejects.toThrow('AMOUNT_EXCEEDS_BALANCE');
  });

  it('requires the company for work services', async () => {
    await expect(mockApi.transactions.register(baseInput({ companyId: undefined, employeeId: undefined }))).rejects.toThrow('COMPANY_REQUIRED');
  });

  it('refuses mutations from the read-only manager', async () => {
    setActor('u-mgr');
    await expect(mockApi.transactions.register(baseInput())).rejects.toThrow('FORBIDDEN');
  });
});

describe('transaction lifecycle', () => {
  it('completing a transaction never creates a receipt', async () => {
    const { transaction } = await mockApi.transactions.register(baseInput());
    const before = getDb().receipts.length;
    const done = await mockApi.transactions.setStatus({ id: transaction.id, status: 'completed' });
    expect(done.status).toBe('completed');
    expect(getDb().receipts.length).toBe(before);
    expect(summarizeTransaction(done, getDb().receipts, getDb().payments).collected).toBe(0);
  });

  it('keeps the original registrar when another staff member edits', async () => {
    const { transaction } = await mockApi.transactions.register(baseInput());
    setActor('u-owner');
    const updated = await mockApi.transactions.update(transaction.id, { priority: 'urgent', officerId: 'u-pro2' });
    expect(updated.createdBy).toBe('u-pro1');
    expect(updated.officerId).toBe('u-pro2');
    expect(updated.updatedBy).toBe('u-owner');
  });

  it('changing fees leaves recorded receipts untouched', async () => {
    const { transaction, receipt } = await mockApi.transactions.register(baseInput({ collection: { amount: 100, method: 'cash', accountId: 'acc-cash' } }));
    await mockApi.transactions.updateFees(transaction.id, { ...transaction.fees, serviceFee: 999 }, 'تصحيح');
    const stored = getDb().receipts.find((r) => r.id === receipt!.id)!;
    expect(stored.amount).toBe(100);
    expect(stored.allocations[0].amount).toBe(100);
  });
});

describe('receipts and payments', () => {
  it('receipt.record is idempotent per request id', async () => {
    const { transaction } = await mockApi.transactions.register(baseInput());
    const input = { requestId: 'r-1', kind: 'receipt' as const, customerId: 'cus-1', transactionId: transaction.id, date: '2026-05-11', amount: 50, method: 'cash' as const, accountId: 'acc-cash' };
    const a = await mockApi.receipts.record(input);
    const b = await mockApi.receipts.record(input);
    expect(b.id).toBe(a.id);
    expect(getDb().receipts.filter((r) => r.requestId === 'r-1')).toHaveLength(1);
  });

  it('refunds cannot exceed what was collected', async () => {
    const { transaction } = await mockApi.transactions.register(baseInput({ collection: { amount: 100, method: 'cash', accountId: 'acc-cash' } }));
    await expect(
      mockApi.receipts.record({ requestId: 'rf', kind: 'refund', customerId: 'cus-1', transactionId: transaction.id, date: '2026-05-11', amount: 150, method: 'cash', accountId: 'acc-cash' })
    ).rejects.toThrow('REFUND_EXCEEDS_COLLECTED');
  });

  it('attributes collections to whoever recorded them, not the transaction officer', async () => {
    const { transaction } = await mockApi.transactions.register(baseInput());
    setActor('u-acc');
    await mockApi.receipts.record({ requestId: 'acc-1', kind: 'receipt', customerId: 'cus-1', transactionId: transaction.id, date: '2026-05-12', amount: 80, method: 'cash', accountId: 'acc-cash' });
    const db = getDb();
    const stats = employeePerformance(buildLedger(db), db.users, { from: '2026-05-12', to: '2026-05-12' });
    expect(stats.find((s) => s.user.id === 'u-acc')!.collected).toBe(80);
    expect(stats.find((s) => s.user.id === 'u-pro1')!.collected).toBe(0);
  });

  it('prevents billing the same transaction on two live invoices', async () => {
    setActor('u-owner');
    const { transaction } = await mockApi.transactions.register(baseInput());
    const inv = { customerId: 'cus-1', transactionIds: [transaction.id], extraLines: [], date: '2026-05-10', dueDate: '2026-05-24', state: 'issued' as const, notes: '' };
    await mockApi.invoices.createFromTransactions({ ...inv, requestId: 'i-1' });
    await expect(mockApi.invoices.createFromTransactions({ ...inv, requestId: 'i-2' })).rejects.toThrow('ALREADY_INVOICED');
  });
});
