import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftRightIcon, BanknoteIcon, CreditCardIcon, LandmarkIcon } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Panel } from '../../components/ui/Panel';
import { Ltr, Money } from '../../components/ui/Display';
import { DataTable, FilterSelect, type Column } from '../../components/tables/DataTable';
import { PeriodPicker } from '../../components/shared/PeriodPicker';
import { TransferDialog } from '../../components/finance/TransferDialog';
import { useLedger, usePeriod } from '../../hooks/useLedger';
import { useI18n } from '../../hooks/useI18n';
import { useLookups } from '../../hooks/useLookups';
import { usePermissions } from '../../hooks/usePermissions';
import { accountBalances, round2, type CashMovement as Movement } from '../../utils/finance';
import { cn } from '../../utils/cn';

const icon = { cash: BanknoteIcon, bank: LandmarkIcon, other: CreditCardIcon };

/**
 * Cash movement register. This is NOT a double-entry general ledger: it lists the money movements
 * recorded through vouchers and transfers, and derives balances from the demo opening balances.
 */
export function CashMovement() {
  const { t, tr, date, name } = useI18n();
  const { can } = usePermissions();
  const lk = useLookups();
  const period = usePeriod();
  const { ledger, isLoading, isError, refetch } = useLedger({ ignoreBranch: true });
  const [account, setAccount] = useState('all');
  const [source, setSource] = useState('all');
  const [open, setOpen] = useState(false);

  const balances = useMemo(() => accountBalances(ledger.accounts, ledger.movements), [ledger.accounts, ledger.movements]);

  // Running balance per account, in chronological order, then filtered to the period.
  const rows = useMemo(() => {
    const running = new Map<string, number>(ledger.accounts.map((a) => [a.id, a.openingBalance]));
    const withBal = ledger.movements.map((m) => {
      const b = round2((running.get(m.accountId) ?? 0) + (m.direction === 'in' ? m.amount : -m.amount));
      running.set(m.accountId, b);
      return { ...m, balance: b };
    });
    return withBal.filter((m) => m.date >= period.from && m.date <= period.to && (account === 'all' || m.accountId === account) && (source === 'all' || m.source === source)).reverse();
  }, [ledger.movements, ledger.accounts, period, account, source]);

  const inflow = round2(rows.filter((m) => m.direction === 'in' && m.source !== 'transfer').reduce((a, m) => a + m.amount, 0));
  const outflow = round2(rows.filter((m) => m.direction === 'out' && m.source !== 'transfer').reduce((a, m) => a + m.amount, 0));

  const link = (m: Movement) =>
  m.source === 'receipt' || m.source === 'refund' ? `/print/receipt/${m.sourceId}` : m.source === 'payment' ? `/print/payment/${m.sourceId}` : m.source === 'expense' ? '/expenses' : undefined;

  const columns: Column<Movement & {balance: number;}>[] = [
  { key: 'date', header: t('common.date'), cell: (m) => date(m.date), sortValue: (m) => m.date + m.createdAt },
  { key: 'number', header: tr('المصدر', 'Source document'), cell: (m) => link(m) ? <Link to={link(m)!} className="text-primary hover:underline"><Ltr className="text-xs font-medium">{m.number}</Ltr></Link> : <Ltr className="text-xs font-medium">{m.number}</Ltr>, sortValue: (m) => m.number },
  { key: 'type', header: t('common.type'), cell: (m) => t(`mv.${m.source}`), sortValue: (m) => m.source },
  { key: 'party', header: tr('الطرف', 'Party'), cell: (m) => m.customerId ? name(lk.customer.get(m.customerId)) : m.counterparty ?? '—' },
  { key: 'tx', header: tr('المعاملة', 'Transaction'), cell: (m) => m.transactionId ? <Link to={`/transactions/${m.transactionId}`} className="num text-xs text-primary hover:underline">{ledger.summaries.get(m.transactionId)?.tx.ref ?? '—'}</Link> : '—', defaultHidden: true },
  { key: 'account', header: t('common.account'), cell: (m) => name(lk.account.get(m.accountId)), sortValue: (m) => m.accountId },
  { key: 'by', header: t('common.recordedBy'), cell: (m) => name(lk.user.get(m.userId)), defaultHidden: true },
  { key: 'in', header: tr('وارد', 'In'), cell: (m) => m.direction === 'in' ? <Money value={m.amount} className="text-success" /> : '', sortValue: (m) => m.direction === 'in' ? m.amount : 0, align: 'end' },
  { key: 'out', header: tr('صادر', 'Out'), cell: (m) => m.direction === 'out' ? <Money value={m.amount} /> : '', sortValue: (m) => m.direction === 'out' ? m.amount : 0, align: 'end' },
  { key: 'balance', header: tr('رصيد الحساب بعد الحركة', 'Account balance after'), cell: (m) => <Money value={m.balance} className="text-ink-2" />, sortValue: (m) => m.balance, align: 'end' }];

  return (
    <div>
      <PageHeader
        title={t('nav.cash')}
        description={tr('سجل الحركات النقدية الفعلية على الصندوق والحسابات البنكية وحسابات الدفع. كل حركة مرتبطة بسند قبض أو صرف أو تحويل. هذا ليس دفتر أستاذ محاسبي، والإيراد المحاسبي لا يساوي التدفق النقدي.', 'Actual cash movements on cash, bank and payment accounts — each tied to a voucher or transfer. Not a general ledger; accounting revenue ≠ cash flow.')}
        crumbs={[{ label: t('nav.cash') }]}
        actions={
        <>
            <PeriodPicker />
            {can('finance.edit') && <Button onClick={() => setOpen(true)}><ArrowLeftRightIcon />{tr('تحويل بين الحسابات', 'Transfer')}</Button>}
          </>
        } />


      <div className="mb-5 grid gap-4 md:grid-cols-3">
        {balances.map((b) => {
          const I = icon[b.account.kind];
          return (
            <Panel key={b.account.id}>
              <p className="flex items-center gap-1.5 text-xs text-muted">
                <I className="h-3.5 w-3.5" />
                {name(b.account)} · {t(`acck.${b.account.kind}`)}
              </p>
              <Money value={b.balance} className={cn('mt-1 block text-2xl font-semibold', b.balance < 0 && 'text-danger')} />
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 border-t border-line pt-3 text-xs">
                <dt className="text-muted">{tr('رصيد افتتاحي تجريبي', 'Demo opening')}</dt><dd className="text-end"><Money value={b.opening} /></dd>
                <dt className="text-muted">{tr('إجمالي المقبوضات', 'Total receipts')}</dt><dd className="text-end"><Money value={b.inflow} className="text-success" /></dd>
                <dt className="text-muted">{tr('إجمالي المدفوعات', 'Total payments')}</dt><dd className="text-end"><Money value={-b.outflow} /></dd>
                <dt className="text-muted">{tr('تحويلات واردة / صادرة', 'Transfers in / out')}</dt><dd className="text-end"><Money value={round2(b.transfersIn - b.transfersOut)} /></dd>
              </dl>
              <p className="mt-2 text-[10px] text-muted">{tr('منذ', 'Since')} {date(b.account.openingDate)}</p>
            </Panel>);

        })}
      </div>

      <DataTable
        tableId="cash-movements"
        rows={rows}
        columns={columns}
        getRowId={(m) => m.id}
        searchText={(m) => `${m.number} ${m.counterparty ?? ''} ${name(lk.customer.get(m.customerId ?? ''))}`}
        isLoading={isLoading}
        isError={isError}
        onRetry={refetch}
        exportName="cash-movements"
        pageSize={25}
        toolbar={
        <>
            <FilterSelect label={t('common.account')} value={account} onChange={setAccount} className="sm:w-52" options={[{ value: 'all', label: tr('كل الحسابات', 'All accounts') }, ...ledger.accounts.map((a) => ({ value: a.id, label: name(a) }))]} />
            <FilterSelect label={t('common.type')} value={source} onChange={setSource} className="sm:w-44" options={[{ value: 'all', label: tr('كل الحركات', 'All movements') }, ...['receipt', 'refund', 'payment', 'expense', 'transfer'].map((s) => ({ value: s, label: t(`mv.${s}`) }))]} />
          </>
        }
        footer={
        <div className="flex flex-wrap justify-end gap-x-6 gap-y-1 border-t border-line bg-subtle/40 px-4 py-2.5 text-xs">
            <span>{tr('مقبوضات الفترة', 'Period in')}: <Money value={inflow} className="font-semibold text-success" /></span>
            <span>{tr('مدفوعات الفترة', 'Period out')}: <Money value={-outflow} className="font-semibold" /></span>
            <span>{tr('الصافي (بدون التحويلات)', 'Net (excl. transfers)')}: <Money value={round2(inflow - outflow)} className="font-semibold" /></span>
          </div>
        }
        empty={{ title: tr('لا توجد حركات في هذه الفترة', 'No movements in this period') }} />

      <TransferDialog open={open} onClose={() => setOpen(false)} />
    </div>);

}
