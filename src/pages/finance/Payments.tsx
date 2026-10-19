import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusIcon, PrinterIcon, Trash2Icon } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input, Textarea } from '../../components/ui/Input';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Money } from '../../components/ui/Display';
import { DataTable, FilterSelect, RowActions, type Column } from '../../components/tables/DataTable';
import { useLedgerColumns } from '../../components/shared/ledgerColumns';
import { PaymentDialog } from '../../components/finance/PaymentDialog';
import { useRemovePayment } from '../../hooks/useApi';
import { useLedger } from '../../hooks/useLedger';
import { useI18n } from '../../hooks/useI18n';
import { useLookups } from '../../hooks/useLookups';
import { usePermissions } from '../../hooks/usePermissions';
import { errorMessage } from '../../utils/errors';
import { round2 } from '../../utils/finance';
import { inRange } from '../../utils/dates';
import type { Payment } from '../../types/finance';

export function Payments() {
  const { t, tr, lang, name } = useI18n();
  const { can } = usePermissions();
  const navigate = useNavigate();
  const lk = useLookups();
  const { ledger, isLoading, isError, refetch } = useLedger();
  const cols = useLedgerColumns(ledger);
  const remove = useRemovePayment();
  const [open, setOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Payment | null>(null);
  const [reason, setReason] = useState('');
  const [f, setF] = useState({ cat: 'all', by: 'all', payee: 'all', from: '', to: '' });

  const rows = useMemo(
    () =>
    ledger.payments.filter(
      (p) =>
      (f.cat === 'all' || p.category === f.cat) && (
      f.by === 'all' || p.paidBy === f.by) && (
      f.payee === 'all' || p.supplierId === f.payee) && (
      !f.from && !f.to || inRange(p.date, f.from || '0000-01-01', f.to || '9999-12-31'))
    ),
    [ledger.payments, f]
  );
  const total = round2(rows.reduce((a, p) => a + p.amount, 0));
  const payable = round2(ledger.list.reduce((a, s) => a + s.payable, 0));

  const columns: Column<Payment>[] = [
  ...cols.payments,
  {
    key: 'actions',
    header: '',
    alwaysVisible: true,
    cell: (p) =>
    <RowActions>
          <Button variant="ghost" size="icon-sm" onClick={() => navigate(`/print/payment/${p.id}`)} aria-label={t('common.print')}><PrinterIcon /></Button>
          {can('vouchers.delete') && <Button variant="ghost" size="icon-sm" className="text-danger" onClick={() => setToDelete(p)} aria-label={t('common.delete')}><Trash2Icon /></Button>}
        </RowActions>

  }];

  return (
    <div>
      <PageHeader
        title={t('nav.payments')}
        description={tr('ما دفعه المكتب فعلياً للجهات الحكومية والمزودين عن المعاملات. المصروفات التشغيلية مسجلة بشكل منفصل.', 'What the office actually paid to authorities and providers for transactions. Operating expenses are separate.')}
        crumbs={[{ label: t('nav.payments') }]}
        meta={<span className="text-xs text-muted">{tr('ما زال مستحقاً للجهات على المعاملات', 'Still owed on transactions')}: <Money value={payable} className="font-semibold text-ink" /></span>}
        actions={can('payments.record') && <Button onClick={() => setOpen(true)}><PlusIcon />{t('quick.payment')}</Button>} />

      <DataTable
        tableId="payments"
        rows={rows}
        columns={columns}
        getRowId={(p) => p.id}
        searchText={(p) => `${p.number} ${p.payeeName} ${p.reference ?? ''} ${p.transactionId ? ledger.summaries.get(p.transactionId)?.tx.ref ?? '' : ''}`}
        isLoading={isLoading}
        isError={isError}
        onRetry={refetch}
        exportName="payment-vouchers"
        initialSort={{ key: 'date', dir: 'desc' }}
        toolbar={
        <>
            <FilterSelect label={t('common.category')} value={f.cat} onChange={(v) => setF((x) => ({ ...x, cat: v }))} className="sm:w-44" options={[{ value: 'all', label: tr('كل الفئات', 'All categories') }, ...['government_fee', 'provider_cost', 'other_direct_cost'].map((c) => ({ value: c, label: t(`pcat.${c}`) }))]} />
            <FilterSelect label={tr('الجهة', 'Payee')} value={f.payee} onChange={(v) => setF((x) => ({ ...x, payee: v }))} className="sm:w-48" options={[{ value: 'all', label: tr('كل الجهات', 'All payees') }, ...lk.suppliers.map((s) => ({ value: s.id, label: name(s) }))]} />
            <FilterSelect label={t('common.recordedBy')} value={f.by} onChange={(v) => setF((x) => ({ ...x, by: v }))} className="sm:w-40" options={[{ value: 'all', label: tr('كل الموظفين', 'All staff') }, ...lk.users.map((u) => ({ value: u.id, label: name(u) }))]} />
            <Input type="date" className="h-8 w-36 text-xs" value={f.from} onChange={(e) => setF((x) => ({ ...x, from: e.target.value }))} aria-label={tr('من', 'From')} />
            <Input type="date" className="h-8 w-36 text-xs" value={f.to} onChange={(e) => setF((x) => ({ ...x, to: e.target.value }))} aria-label={tr('إلى', 'To')} />
          </>
        }
        footer={rows.length > 0 && <div className="flex justify-end gap-2 border-t border-line bg-subtle/40 px-4 py-2.5 text-xs"><span className="text-muted">{t('common.total')}:</span><Money value={total} className="font-semibold" /></div>}
        empty={{ title: tr('لا توجد سندات صرف', 'No payment vouchers') }} />

      <PaymentDialog open={open} onClose={() => setOpen(false)} />
      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => {setToDelete(null);setReason('');}}
        title={tr('حذف سند صرف', 'Delete payment voucher')}
        description={tr('الحذف يُسجَّل في سجل التدقيق مع السبب.', 'Deletion is audited with the reason.')}
        confirmDisabled={!reason.trim()}
        loading={remove.isPending}
        onConfirm={() => toDelete && remove.mutate({ id: toDelete.id, reason }, { onSuccess: () => {toast.success(t('common.deleted'));setToDelete(null);setReason('');}, onError: (e) => toast.error(errorMessage(e, lang)) })}>

        <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={tr('سبب الحذف (مطلوب)', 'Reason (required)')} />
      </ConfirmDialog>
    </div>);

}
