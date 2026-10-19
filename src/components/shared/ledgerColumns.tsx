import { Link } from 'react-router-dom';
import type { Column } from '../tables/DataTable';
import { Ltr, Money } from '../ui/Display';
import { StatusBadge } from '../status/StatusBadge';
import { useI18n } from '../../hooks/useI18n';
import { useLookups } from '../../hooks/useLookups';
import type { Expense, Payment, Receipt } from '../../types/finance';
import type { TxSummary } from '../../utils/finance';
import type { Ledger } from '../../utils/reports';

const stop = (e: React.MouseEvent) => e.stopPropagation();

/** Shared column sets so the same record looks identical in every page and drill-down. */
export function useLedgerColumns(ledger?: Ledger) {
  const { t, tr, date, dateTime, name } = useI18n();
  const lk = useLookups();
  const txRef = (id?: string) => id ? ledger?.summaries.get(id)?.tx.ref ?? '' : '';
  const txLink = (id?: string) =>
  id ?
  <Link to={`/transactions/${id}`} onClick={stop} className="num text-xs text-primary hover:underline">
        {txRef(id) || tr('معاملة', 'Transaction')}
      </Link> :

  <span className="text-xs text-muted">{tr('على الحساب', 'On account')}</span>;


  const receipts: Column<Receipt>[] = [
  { key: 'number', header: tr('رقم السند', 'Voucher no.'), cell: (r) => <Ltr className="font-medium">{r.number}</Ltr>, sortValue: (r) => r.number },
  { key: 'kind', header: t('common.type'), cell: (r) => <StatusBadge domain="rkind" value={r.kind} />, sortValue: (r) => r.kind },
  { key: 'date', header: t('common.date'), cell: (r) => date(r.date), sortValue: (r) => r.date + r.createdAt },
  { key: 'customer', header: t('common.customer'), cell: (r) => name(lk.customer.get(r.customerId)), sortValue: (r) => name(lk.customer.get(r.customerId)) },
  { key: 'tx', header: tr('المعاملة', 'Transaction'), cell: (r) => r.allocations.length > 1 ? <span className="text-xs text-ink-2">{r.allocations.map((a) => txRef(a.transactionId)).join('، ')}</span> : txLink(r.allocations[0]?.transactionId), exportValue: (r) => r.allocations.map((a) => txRef(a.transactionId)).join(' ') },
  { key: 'method', header: t('common.method'), cell: (r) => t(`pay.${r.method}`), sortValue: (r) => r.method },
  { key: 'account', header: t('common.account'), cell: (r) => name(lk.account.get(r.accountId)), defaultHidden: true, exportValue: (r) => name(lk.account.get(r.accountId)) },
  { key: 'by', header: t('common.recordedBy'), cell: (r) => name(lk.user.get(r.receivedBy)), sortValue: (r) => name(lk.user.get(r.receivedBy)) },
  { key: 'ref', header: t('common.reference'), cell: (r) => <Ltr className="text-xs text-muted">{r.reference ?? '—'}</Ltr>, defaultHidden: true, exportValue: (r) => r.reference ?? '' },
  { key: 'created', header: tr('وقت التسجيل', 'Recorded at'), cell: (r) => <span className="text-xs text-muted">{dateTime(r.createdAt)}</span>, defaultHidden: true, sortValue: (r) => r.createdAt },
  {
    key: 'amount',
    header: t('common.amount'),
    cell: (r) => <Money value={r.kind === 'refund' ? -r.amount : r.amount} className={r.kind === 'refund' ? 'font-semibold' : 'font-semibold text-success'} />,
    sortValue: (r) => r.kind === 'refund' ? -r.amount : r.amount,
    align: 'end'
  }];


  const payments: Column<Payment>[] = [
  { key: 'number', header: tr('رقم السند', 'Voucher no.'), cell: (p) => <Ltr className="font-medium">{p.number}</Ltr>, sortValue: (p) => p.number },
  { key: 'date', header: t('common.date'), cell: (p) => date(p.date), sortValue: (p) => p.date + p.createdAt },
  { key: 'payee', header: tr('الجهة / المورد', 'Authority / provider'), cell: (p) => <span className="font-medium">{p.payeeName}</span>, sortValue: (p) => p.payeeName },
  { key: 'cat', header: t('common.category'), cell: (p) => <StatusBadge domain="pcat" value={p.category} />, sortValue: (p) => p.category },
  { key: 'tx', header: tr('المعاملة', 'Transaction'), cell: (p) => txLink(p.transactionId), exportValue: (p) => txRef(p.transactionId) },
  { key: 'method', header: t('common.method'), cell: (p) => t(`pay.${p.method}`), sortValue: (p) => p.method },
  { key: 'account', header: t('common.account'), cell: (p) => name(lk.account.get(p.accountId)), defaultHidden: true, exportValue: (p) => name(lk.account.get(p.accountId)) },
  { key: 'by', header: t('common.recordedBy'), cell: (p) => name(lk.user.get(p.paidBy)), sortValue: (p) => name(lk.user.get(p.paidBy)) },
  { key: 'ref', header: t('common.reference'), cell: (p) => <Ltr className="text-xs text-muted">{p.reference ?? '—'}</Ltr>, defaultHidden: true, exportValue: (p) => p.reference ?? '' },
  { key: 'amount', header: t('common.amount'), cell: (p) => <Money value={p.amount} className="font-semibold" />, sortValue: (p) => p.amount, align: 'end' }];


  const expenses: Column<Expense>[] = [
  { key: 'number', header: tr('الرقم', 'No.'), cell: (e) => <Ltr className="font-medium">{e.number}</Ltr>, sortValue: (e) => e.number },
  { key: 'date', header: t('common.date'), cell: (e) => date(e.date), sortValue: (e) => e.date },
  { key: 'cat', header: t('common.category'), cell: (e) => t(`exp.${e.category}`), sortValue: (e) => e.category },
  { key: 'ben', header: tr('البيان / المستفيد', 'Description / payee'), cell: (e) => e.beneficiary ?? '—', sortValue: (e) => e.beneficiary ?? '' },
  { key: 'status', header: t('common.status'), cell: (e) => e.paid ? <span className="text-xs font-medium text-success">{tr('مدفوع', 'Paid')}</span> : <span className="text-xs font-medium text-warning">{tr('مستحق — غير مدفوع', 'Accrued — unpaid')}</span>, sortValue: (e) => e.paid ? 1 : 0, exportValue: (e) => e.paid ? 'paid' : 'unpaid' },
  { key: 'account', header: t('common.account'), cell: (e) => name(lk.account.get(e.accountId)), defaultHidden: true, exportValue: (e) => name(lk.account.get(e.accountId)) },
  { key: 'by', header: t('common.recordedBy'), cell: (e) => name(lk.user.get(e.createdBy)), defaultHidden: true },
  { key: 'amount', header: t('common.amount'), cell: (e) => <Money value={e.amount} className="font-semibold" />, sortValue: (e) => e.amount, align: 'end' }];


  const txBase: Column<TxSummary>[] = [
  { key: 'ref', header: t('common.reference'), cell: (s) => <Ltr className="text-xs font-medium">{s.tx.ref}</Ltr>, sortValue: (s) => s.tx.ref },
  { key: 'title', header: tr('المعاملة', 'Transaction'), cell: (s) => <span className="font-medium">{tr(s.tx.titleAr, s.tx.titleEn)}</span>, sortValue: (s) => s.tx.titleAr },
  { key: 'customer', header: t('common.customer'), cell: (s) => name(lk.customer.get(s.tx.customerId)), sortValue: (s) => name(lk.customer.get(s.tx.customerId)) },
  { key: 'status', header: t('common.status'), cell: (s) => <StatusBadge domain="case" value={s.tx.status} />, sortValue: (s) => s.tx.status },
  { key: 'officer', header: tr('المنفذ', 'Officer'), cell: (s) => name(lk.user.get(s.tx.officerId)), sortValue: (s) => name(lk.user.get(s.tx.officerId)) },
  { key: 'by', header: tr('سجّلها', 'Registered by'), cell: (s) => name(lk.user.get(s.tx.createdBy)), defaultHidden: true },
  { key: 'date', header: t('common.date'), cell: (s) => date(s.tx.transactionDate), sortValue: (s) => s.tx.createdAt }];


  const money = (key: string, header: string, f: (s: TxSummary) => number, cls?: string): Column<TxSummary> => ({
    key,
    header,
    cell: (s) => <Money value={f(s)} className={cls} />,
    sortValue: f,
    align: 'end'
  });

  const tx = {
    base: txBase,
    money,
    due: money('due', t('common.amountDue'), (s) => s.totals.due),
    fees: money('fees', t('common.serviceFee'), (s) => s.totals.netService),
    collected: money('collected', t('common.collected'), (s) => s.collected, 'text-success'),
    balance: money('balance', t('common.customerBalance'), (s) => s.receivable, 'font-semibold text-warning'),
    payable: money('payable', t('common.payable'), (s) => s.payable, 'font-semibold'),
    paidOut: money('paidOut', t('common.paidOut'), (s) => s.paidOut),
    realized: {
      key: 'realized',
      header: t('common.realizedProfit'),
      cell: (s: TxSummary) =>
      s.realizedProfit === null ?
      <span className="text-xs text-muted">{s.realizedUnknownReason === 'costs_pending' ? tr('بانتظار التكاليف', 'Costs pending') : t('common.unknown')}</span> :

      <Money value={s.realizedProfit} className="font-semibold" />,

      sortValue: (s: TxSummary) => s.realizedProfit ?? -Infinity,
      exportValue: (s: TxSummary) => s.realizedProfit ?? '',
      align: 'end'
    } as Column<TxSummary>
  };

  return { receipts, payments, expenses, tx };
}
