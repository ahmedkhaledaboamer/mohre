import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PlusIcon, PrinterIcon, Trash2Icon, Undo2Icon } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input, Textarea } from '../../components/ui/Input';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Money } from '../../components/ui/Display';
import { DataTable, FilterSelect, RowActions, type Column } from '../../components/tables/DataTable';
import { useLedgerColumns } from '../../components/shared/ledgerColumns';
import { ReceiptDialog } from '../../components/finance/ReceiptDialog';
import { useRemoveReceipt } from '../../hooks/useApi';
import { useLedger } from '../../hooks/useLedger';
import { useI18n } from '../../hooks/useI18n';
import { useLookups } from '../../hooks/useLookups';
import { usePermissions } from '../../hooks/usePermissions';
import { errorMessage } from '../../utils/errors';
import { round2 } from '../../utils/finance';
import { inRange } from '../../utils/dates';
import type { Receipt } from '../../types/finance';

export function Receipts() {
  const { t, tr, lang, name } = useI18n();
  const { can } = usePermissions();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const lk = useLookups();
  const { ledger, isLoading, isError, refetch } = useLedger();
  const cols = useLedgerColumns(ledger);
  const remove = useRemoveReceipt();
  const [dlg, setDlg] = useState<null | 'receipt' | 'refund'>(null);
  const [toDelete, setToDelete] = useState<Receipt | null>(null);
  const [reason, setReason] = useState('');
  const [f, setF] = useState({ kind: 'all', by: 'all', method: 'all', from: '', to: '' });

  useEffect(() => {
    if (params.get('new') === '1') {
      setDlg('receipt');
      params.delete('new');
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  const rows = useMemo(
    () =>
    ledger.receipts.filter(
      (r) =>
      (f.kind === 'all' || r.kind === f.kind) && (
      f.by === 'all' || r.receivedBy === f.by) && (
      f.method === 'all' || r.method === f.method) && (
      !f.from && !f.to || inRange(r.date, f.from || '0000-01-01', f.to || '9999-12-31'))
    ),
    [ledger.receipts, f]
  );
  const net = round2(rows.reduce((a, r) => a + (r.kind === 'refund' ? -r.amount : r.amount), 0));

  const columns: Column<Receipt>[] = [
  ...cols.receipts,
  {
    key: 'actions',
    header: '',
    alwaysVisible: true,
    cell: (r) =>
    <RowActions>
          <Button variant="ghost" size="icon-sm" onClick={() => navigate(`/print/receipt/${r.id}`)} aria-label={t('common.print')}><PrinterIcon /></Button>
          {can('vouchers.delete') && <Button variant="ghost" size="icon-sm" className="text-danger" onClick={() => setToDelete(r)} aria-label={t('common.delete')}><Trash2Icon /></Button>}
        </RowActions>

  }];

  return (
    <div>
      <PageHeader
        title={t('nav.receipts')}
        description={tr('كل مبلغ استُلم فعلياً من عميل أو رُدّ إليه — سند مستقل لكل عملية، مع الموظف الذي سجّلها.', 'Every amount actually received from or returned to a customer — one voucher per operation, with who recorded it.')}
        crumbs={[{ label: t('nav.receipts') }]}
        actions={
        can('collections.record') &&
        <>
              <Button variant="outline" onClick={() => setDlg('refund')}><Undo2Icon />{tr('رد مبلغ', 'Refund')}</Button>
              <Button onClick={() => setDlg('receipt')}><PlusIcon />{t('quick.receipt')}</Button>
            </>

        } />

      <DataTable
        tableId="receipts"
        rows={rows}
        columns={columns}
        getRowId={(r) => r.id}
        searchText={(r) => `${r.number} ${name(lk.customer.get(r.customerId))} ${r.reference ?? ''}`}
        isLoading={isLoading}
        isError={isError}
        onRetry={refetch}
        exportName="receipts"
        initialSort={{ key: 'date', dir: 'desc' }}
        toolbar={
        <>
            <FilterSelect label={t('common.type')} value={f.kind} onChange={(v) => setF((x) => ({ ...x, kind: v }))} className="sm:w-36" options={[{ value: 'all', label: tr('قبض ورد', 'All') }, { value: 'receipt', label: t('rkind.receipt') }, { value: 'refund', label: t('rkind.refund') }]} />
            <FilterSelect label={t('common.recordedBy')} value={f.by} onChange={(v) => setF((x) => ({ ...x, by: v }))} className="sm:w-40" options={[{ value: 'all', label: tr('كل الموظفين', 'All staff') }, ...lk.users.map((u) => ({ value: u.id, label: name(u) }))]} />
            <FilterSelect label={t('common.method')} value={f.method} onChange={(v) => setF((x) => ({ ...x, method: v }))} className="sm:w-36" options={[{ value: 'all', label: tr('كل الطرق', 'All methods') }, ...['cash', 'bank_transfer', 'card', 'cheque'].map((m) => ({ value: m, label: t(`pay.${m}`) }))]} />
            <Input type="date" className="h-8 w-36 text-xs" value={f.from} onChange={(e) => setF((x) => ({ ...x, from: e.target.value }))} aria-label={tr('من', 'From')} />
            <Input type="date" className="h-8 w-36 text-xs" value={f.to} onChange={(e) => setF((x) => ({ ...x, to: e.target.value }))} aria-label={tr('إلى', 'To')} />
          </>
        }
        footer={rows.length > 0 && <div className="flex justify-end gap-2 border-t border-line bg-subtle/40 px-4 py-2.5 text-xs"><span className="text-muted">{tr('صافي المحصّل', 'Net collected')}:</span><Money value={net} className="font-semibold" /></div>}
        empty={{ title: tr('لا توجد سندات قبض', 'No receipts') }} />

      <ReceiptDialog open={dlg === 'receipt'} onClose={() => setDlg(null)} />
      <ReceiptDialog open={dlg === 'refund'} kind="refund" onClose={() => setDlg(null)} />
      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => {setToDelete(null);setReason('');}}
        title={tr('حذف سند', 'Delete voucher')}
        description={tr('الحذف يُسجَّل في سجل التدقيق مع السبب. يُفضّل تسجيل رد مبلغ بدلاً من الحذف.', 'Deletion is audited with the reason. Prefer recording a refund instead.')}
        confirmDisabled={!reason.trim()}
        loading={remove.isPending}
        onConfirm={() => toDelete && remove.mutate({ id: toDelete.id, reason }, { onSuccess: () => {toast.success(t('common.deleted'));setToDelete(null);setReason('');}, onError: (e) => toast.error(errorMessage(e, lang)) })}>

        <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={tr('سبب الحذف (مطلوب)', 'Reason (required)')} />
      </ConfirmDialog>
    </div>);

}
