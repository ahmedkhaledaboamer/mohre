// @vitest-environment jsdom
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { mockLatency } from './services/mockApi';
import { _unloadDb, getDb, resetDb, STORAGE_KEY } from './services/mockDb';
import { setActor } from './services/session';
import { store } from './store/store';
import { loggedIn } from './store/slices/authSlice';
import { App } from './App';
import { summarizeTransaction } from './utils/finance';

/**
 * UI smoke test: boots the real app (router, Redux, React Query, mock API) in jsdom and renders
 * every route as each role, failing on any runtime error. Not a visual test.
 */

mockLatency.ms = 0;
(globalThis as unknown as {IS_REACT_ACT_ENVIRONMENT: boolean;}).IS_REACT_ACT_ENVIRONMENT = true;

class RO {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const errors: string[] = [];
let root: Root | null = null;
let host: HTMLDivElement;

beforeAll(() => {
  Object.assign(globalThis, { ResizeObserver: RO });
  window.scrollTo = () => undefined;
  window.matchMedia = window.matchMedia ?? ((() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia);
  const orig = console.error;
  console.error = (...args: unknown[]) => {
    const msg = args.map(String).join(' ');
    // Recharts warns about zero-size containers in jsdom; that is layout, not a bug.
    if (!/width\(0\) and height\(0\)|The width\(-?\d+\)|act\(/.test(msg)) errors.push(msg);
    void orig;
  };
  window.addEventListener('error', (e) => errors.push(String(e.error ?? e.message)));
});

afterAll(() => {
  act(() => root?.unmount());
});

const flush = async (n = 6) => {
  for (let i = 0; i < n; i++) await act(async () => new Promise((r) => setTimeout(r, 5)));
};

async function visit(path: string) {
  if (root) act(() => root!.unmount());
  document.body.innerHTML = '';
  host = document.createElement('div');
  document.body.appendChild(host);
  window.history.pushState({}, '', path);
  root = createRoot(host);
  act(() => root!.render(<App />));
  await flush();
  return document.body.textContent ?? '';
}

function loginAs(id: string) {
  const u = getDb().users.find((x) => x.id === id)!;
  setActor(u.id);
  act(() => {
    store.dispatch(loggedIn(u));
  });
}

const ROUTES = [
'/', '/transactions', '/transactions/new', '/transactions/trx-1', '/transactions/trx-9', '/transactions/trx-21', '/transactions/trx-27',
'/residence', '/family', '/customers', '/customers/cus-1', '/customers/cus-16', '/companies', '/companies/cmp-1', '/employees', '/employees/emp-1',
'/invoices', '/invoices/new', '/invoices/inv-2', '/receipts', '/payments', '/expenses', '/cash', '/suppliers',
'/reports/daily', '/reports/monthly', '/reports/employees', '/reports/services', '/reports/receivables', '/reports/profitability',
'/pricing', '/users', '/settings', '/documents', '/tasks', '/tasks?tab=reminders',
'/print/invoice/inv-1', '/print/receipt/rcp-1', '/print/payment/pay-1'];


describe('every route renders for every role', () => {
  for (const role of ['u-owner', 'u-acc', 'u-pro1', 'u-mgr']) {
    it(`renders all routes as ${role}`, async () => {
      resetDb();
      loginAs(role);
      for (const path of ROUTES) {
        errors.length = 0;
        const text = await visit(path);
        expect(errors, `${role} ${path}: ${errors.join('\n')}`).toEqual([]);
        expect(text.length, `${role} ${path} rendered nothing`).toBeGreaterThan(20);
        expect(text).not.toContain('الصفحة غير موجودة');
      }
    }, 120_000);
  }
});

describe('dashboard', () => {
  it('opens the drill-down for every stat card', async () => {
    resetDb();
    loginAs('u-owner');
    await visit('/');
    expect(document.body.textContent).toContain('ماذا حدث اليوم؟');
    const cards = [...document.querySelectorAll('button')].filter((b) => b.className.includes('group block w-full rounded-xl'));
    expect(cards.length).toBe(10);
    for (const c of cards) {
      errors.length = 0;
      act(() => c.click());
      await flush(2);
      expect(errors).toEqual([]);
      expect(document.querySelector('[role="dialog"]')).not.toBeNull();
      const close = document.querySelector<HTMLButtonElement>('[role="dialog"] button[aria-label="close"]')!;
      act(() => close.click());
      await flush(2);
    }
  }, 60_000);
});

function setValue(el: HTMLInputElement | HTMLSelectElement, value: string) {
  const proto = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(el, value);
  el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
}
const selectWith = (value: string) => [...document.querySelectorAll('select')].find((s) => [...s.options].some((o) => o.value === value))!;
const button = (text: string) => [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === text)!;

describe('add transaction form (end to end through the UI)', () => {
  it('registers a transaction with a partial collection and no payment', async () => {
    resetDb();
    loginAs('u-pro1');
    await visit('/transactions/new');
    const before = { tx: getDb().transactions.length, rcp: getDb().receipts.length, pay: getDb().payments.length };

    act(() => setValue(selectWith('svc-offer'), 'svc-offer'));
    await flush(2);
    act(() => setValue(selectWith('cus-1'), 'cus-1'));
    await flush(2);
    act(() => setValue(selectWith('emp-1'), 'emp-1'));
    await flush(2);
    act(() => button('تحصيل جزء من المبلغ').click());
    await flush(2);
    const amount = [...document.querySelectorAll<HTMLInputElement>('input[type="number"]')].find((i) => i.value === '')!;
    act(() => setValue(amount, '120'));
    await flush(2);

    errors.length = 0;
    act(() => button('حفظ المعاملة').click());
    await flush(10);
    expect(errors).toEqual([]);

    const db = getDb();
    expect(db.transactions.length).toBe(before.tx + 1);
    expect(db.receipts.length).toBe(before.rcp + 1);
    expect(db.payments.length).toBe(before.pay);
    const tx = db.transactions[0];
    expect(tx.createdBy).toBe('u-pro1');
    expect(tx.companyId).toBe('cmp-1');
    const s = summarizeTransaction(tx, db.receipts, db.payments);
    expect(s.collected).toBe(120);
    expect(s.customerBalance).toBeCloseTo(s.totals.due - 120, 2);
    expect(window.location.pathname).toBe(`/transactions/${tx.id}`);

    // Survives a reload: drop the in-memory copy and read back from localStorage.
    _unloadDb();
    expect(localStorage.getItem(STORAGE_KEY)).toContain(tx.ref);
    expect(getDb().transactions.some((x) => x.id === tx.id)).toBe(true);
    expect(getDb().receipts.filter((r) => r.allocations.some((a) => a.transactionId === tx.id))).toHaveLength(1);

    // The new transaction is immediately visible in the list.
    loginAs('u-owner');
    const list = await visit('/transactions');
    expect(list).toContain(tx.ref);
  }, 60_000);
});
