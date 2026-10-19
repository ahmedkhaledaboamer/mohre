import { useNavigate } from 'react-router-dom';
import { DataTable, type Column } from '../tables/DataTable';
import { StatusBadge } from '../status/StatusBadge';
import { Money, ProgressBar, Ltr } from '../ui/Display';
import { useI18n } from '../../hooks/useI18n';
import { useLookups } from '../../hooks/useLookups';
import { useLedgerColumns } from './ledgerColumns';
import type { Transaction } from '../../types/cases';
import type { Receipt } from '../../types/finance';
import type { InvoiceView, TxSummary } from '../../utils/finance';
import type { Ledger } from '../../utils/reports';
import { caseProgress } from '../../utils/cases';

/** Transactions with their live financial position (used on customer / company / employee files). */
export function CasesTable({ tableId, cases, ledger, isLoading }: {tableId: string;cases: Transaction[];ledger: Ledger;isLoading?: boolean;}) {
  const { t, tr, date, name } = useI18n();
  const lk = useLookups();
  const navigate = useNavigate();
  const rows = cases.map((c) => ledger.summaries.get(c.id)).filter(Boolean) as TxSummary[];
  const columns: Column<TxSummary>[] = [
  { key: 'ref', header: t('common.reference'), cell: (s) => <Ltr className="text-xs font-medium">{s.tx.ref}</Ltr>, sortValue: (s) => s.tx.ref },
  { key: 'title', header: tr('المعاملة', 'Transaction'), cell: (s) => <span className="font-medium">{tr(s.tx.titleAr, s.tx.titleEn)}</span>, sortValue: (s) => s.tx.titleAr },
  {
    key: 'progress',
    header: t('common.progress'),
    cell: (s) => {
      const p = caseProgress(s.tx);
      return (
        <div className="flex w-24 items-center gap-2">
            <ProgressBar value={p.pct} tone={s.tx.status === 'completed' ? 'success' : 'primary'} />
            <span className="num text-[11px] text-muted">{p.pct}%</span>
          </div>);

    },
    sortValue: (s) => caseProgress(s.tx).pct
  },
  { key: 'status', header: t('common.status'), cell: (s) => <StatusBadge domain="case" value={s.tx.status} />, sortValue: (s) => s.tx.status },
  { key: 'officer', header: tr('المنفذ', 'Officer'), cell: (s) => name(lk.user.get(s.tx.officerId)), defaultHidden: true },
  { key: 'date', header: t('common.date'), cell: (s) => date(s.tx.transactionDate), sortValue: (s) => s.tx.createdAt },
  { key: 'due', header: t('common.amountDue'), cell: (s) => <Money value={s.tx.status === 'cancelled' ? 0 : s.totals.due} />, sortValue: (s) => s.totals.due, align: 'end' },
  { key: 'collected', header: t('common.collected'), cell: (s) => <Money value={s.collected} className="text-success" />, sortValue: (s) => s.collected, align: 'end' },
  { key: 'balance', header: t('common.customerBalance'), cell: (s) => <Money value={s.receivable} className={s.receivable > 0 ? 'font-semibold text-warning' : 'text-muted'} />, sortValue: (s) => s.receivable, align: 'end' }];

  return (
    <DataTable
      tableId={tableId}
      rows={rows}
      columns={columns}
      getRowId={(s) => s.tx.id}
      searchText={(s) => `${s.tx.ref} ${s.tx.titleAr} ${s.tx.titleEn}`}
      onRowClick={(s) => navigate(`/transactions/${s.tx.id}`)}
      isLoading={isLoading}
      pageSize={5}
      initialSort={{ key: 'date', dir: 'desc' }}
      empty={{ title: tr('لا توجد معاملات', 'No transactions') }} />);


}

export function InvoicesTable({ tableId, views, isLoading }: {tableId: string;views: InvoiceView[];isLoading?: boolean;}) {
  const { t, tr, date } = useI18n();
  const navigate = useNavigate();
  const columns: Column<InvoiceView>[] = [
  { key: 'number', header: tr('رقم الفاتورة', 'Invoice no.'), cell: (v) => <Ltr className="font-medium">{v.invoice.number}</Ltr>, sortValue: (v) => v.invoice.number },
  { key: 'date', header: t('common.date'), cell: (v) => date(v.invoice.date), sortValue: (v) => v.invoice.date },
  { key: 'due', header: t('common.dueDate'), cell: (v) => date(v.invoice.dueDate), sortValue: (v) => v.invoice.dueDate },
  { key: 'total', header: t('common.total'), cell: (v) => <Money value={v.totals.due} />, sortValue: (v) => v.totals.due, align: 'end' },
  { key: 'paid', header: t('common.paid'), cell: (v) => <Money value={v.paid} className="text-success" />, sortValue: (v) => v.paid, align: 'end' },
  { key: 'balance', header: t('common.balance'), cell: (v) => <Money value={v.balance} className={v.balance > 0 ? 'font-semibold' : 'text-muted'} />, sortValue: (v) => v.balance, align: 'end' },
  { key: 'status', header: t('common.status'), cell: (v) => <StatusBadge domain="inv" value={v.status} />, sortValue: (v) => v.status }];

  return (
    <DataTable
      tableId={tableId}
      rows={views}
      columns={columns}
      getRowId={(v) => v.invoice.id}
      searchText={(v) => v.invoice.number}
      onRowClick={(v) => navigate(`/invoices/${v.invoice.id}`)}
      isLoading={isLoading}
      pageSize={5}
      empty={{ title: tr('لا توجد فواتير', 'No invoices') }} />);


}

export function ReceiptsTable({ tableId, receipts, ledger, isLoading, balances }: {tableId: string;receipts: Receipt[];ledger?: Ledger;isLoading?: boolean;balances?: Map<string, number>;}) {
  const { tr } = useI18n();
  const navigate = useNavigate();
  const cols = useLedgerColumns(ledger);
  const columns: Column<Receipt>[] = [
  ...cols.receipts.filter((c) => c.key !== 'customer'),
  ...(balances ?
  [{ key: 'after', header: tr('رصيد العميل بعد السند', 'Balance after'), cell: (r: Receipt) => <Money value={balances.get(r.id) ?? 0} className="text-ink-2" />, sortValue: (r: Receipt) => balances.get(r.id) ?? 0, align: 'end' } as Column<Receipt>] :
  [])];

  return <DataTable tableId={tableId} rows={receipts} columns={columns} getRowId={(r) => r.id} isLoading={isLoading} pageSize={5} onRowClick={(r) => navigate(`/print/receipt/${r.id}`)} initialSort={{ key: 'date', dir: 'desc' }} empty={{ title: tr('لا توجد مقبوضات', 'No receipts') }} />;
}
