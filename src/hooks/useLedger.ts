import { useMemo } from 'react';
import { accountHooks, expenseHooks, invoiceHooks, paymentHooks, receiptHooks, transactionHooks, transferHooks } from './useApi';
import { useAppSelector } from '../store/hooks';
import { buildLedger, type Ledger } from '../utils/reports';
import { buildInvoiceViews, type InvoiceView } from '../utils/finance';
import { periodRange } from '../utils/dates';

/**
 * One derived, memoized view over every transaction and money record.
 * Built on React Query caches (no second copy in Redux), so each page shows the same numbers.
 */
export function useLedger(opts: {ignoreBranch?: boolean;} = {}) {
  const tx = transactionHooks.useList();
  const receipts = receiptHooks.useList();
  const payments = paymentHooks.useList();
  const expenses = expenseHooks.useList();
  const invoices = invoiceHooks.useList();
  const transfers = transferHooks.useList();
  const accounts = accountHooks.useList();
  const branch = useAppSelector((s) => s.ui.branch);
  const queries = [tx, receipts, payments, expenses, invoices, transfers, accounts];

  const ledger = useMemo<Ledger>(
    () =>
    buildLedger(
      {
        transactions: tx.data ?? [],
        receipts: receipts.data ?? [],
        payments: payments.data ?? [],
        expenses: expenses.data ?? [],
        invoices: invoices.data ?? [],
        transfers: transfers.data ?? [],
        accounts: accounts.data ?? []
      },
      opts.ignoreBranch ? 'all' : branch
    ),
    [tx.data, receipts.data, payments.data, expenses.data, invoices.data, transfers.data, accounts.data, branch, opts.ignoreBranch]
  );

  const invoiceViews = useMemo<InvoiceView[]>(() => buildInvoiceViews(ledger.invoices, receipts.data ?? []), [ledger.invoices, receipts.data]);

  return {
    ledger,
    invoiceViews,
    isLoading: queries.some((q) => q.isLoading),
    isError: queries.some((q) => q.isError),
    refetch: () => queries.forEach((q) => q.refetch())
  };
}

/** Period shared by the dashboard and reports (kept in Redux as UI state). */
export function usePeriod() {
  const p = useAppSelector((s) => s.ui.period);
  return useMemo(() => ({ key: p.key, ...periodRange(p.key, { from: p.from, to: p.to }) }), [p.key, p.from, p.to]);
}
