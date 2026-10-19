import { useEffect, useMemo, useState } from 'react';
import { PencilIcon, PlusIcon } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { Field } from '../../components/ui/Field';
import { Checkbox, Input, Select } from '../../components/ui/Input';
import { Ltr, Money } from '../../components/ui/Display';
import { DataTable, RowActions, type Column } from '../../components/tables/DataTable';
import { supplierHooks } from '../../hooks/useApi';
import { useLedger } from '../../hooks/useLedger';
import { useI18n } from '../../hooks/useI18n';
import { usePermissions } from '../../hooks/usePermissions';
import { errorMessage } from '../../utils/errors';
import { round2 } from '../../utils/finance';
import type { Supplier, SupplierKind } from '../../types/finance';

const KINDS: SupplierKind[] = ['government', 'medical', 'insurance', 'typing', 'courier', 'landlord', 'other'];
const blank = (): Omit<Supplier, 'id'> => ({ code: '', nameAr: '', nameEn: '', kind: 'government', mobile: '', email: '', active: true });

function SupplierDialog({ open, onClose, supplier }: {open: boolean;onClose: () => void;supplier?: Supplier;}) {
  const { t, tr, lang } = useI18n();
  const create = supplierHooks.useCreate();
  const update = supplierHooks.useUpdate();
  const [f, setF] = useState(blank());
  useEffect(() => {
    if (open) setF(supplier ? { ...supplier } : blank());
  }, [open, supplier]);
  const save = () => {
    if (!f.nameAr.trim()) return toast.error(tr('الاسم مطلوب', 'Name is required'));
    const opts = { onSuccess: () => {toast.success(t('common.saved'));onClose();}, onError: (e: unknown) => toast.error(errorMessage(e, lang)) };
    if (supplier) update.mutate({ id: supplier.id, patch: f }, opts);else create.mutate({ ...f, nameEn: f.nameEn || f.nameAr }, opts);
  };
  return (
    <Dialog open={open} onClose={onClose} title={supplier ? tr('تعديل جهة / مورد', 'Edit payee') : tr('جهة / مورد جديد', 'New payee')} footer={<><Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button><Button onClick={save} loading={create.isPending || update.isPending}>{t('common.save')}</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('common.nameAr')} required><Input value={f.nameAr} onChange={(e) => setF({ ...f, nameAr: e.target.value })} /></Field>
        <Field label={t('common.nameEn')}><Input dir="ltr" value={f.nameEn} onChange={(e) => setF({ ...f, nameEn: e.target.value })} /></Field>
        <Field label={t('common.type')}><Select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as SupplierKind })}>{KINDS.map((k) => <option key={k} value={k}>{t(`sup.${k}`)}</option>)}</Select></Field>
        <Field label={t('common.mobile')}><Input dir="ltr" value={f.mobile} onChange={(e) => setF({ ...f, mobile: e.target.value })} /></Field>
        <Field label={t('common.email')}><Input dir="ltr" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label={tr('الرقم الضريبي', 'TRN')}><Input dir="ltr" value={f.trn ?? ''} onChange={(e) => setF({ ...f, trn: e.target.value || undefined })} /></Field>
        <Checkbox label={tr('فعّال', 'Active')} checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} />
      </div>
    </Dialog>);

}

export function Suppliers() {
  const { t, tr, name } = useI18n();
  const { can } = usePermissions();
  const list = supplierHooks.useList();
  const { ledger } = useLedger({ ignoreBranch: true });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | undefined>();
  const paid = useMemo(() => {
    const m = new Map<string, number>();
    ledger.payments.forEach((p) => p.supplierId && m.set(p.supplierId, round2((m.get(p.supplierId) ?? 0) + p.amount)));
    ledger.expenses.filter((e) => e.paid && e.supplierId).forEach((e) => m.set(e.supplierId!, round2((m.get(e.supplierId!) ?? 0) + e.amount)));
    return m;
  }, [ledger.payments, ledger.expenses]);

  const columns: Column<Supplier>[] = [
  { key: 'code', header: tr('الرمز', 'Code'), cell: (s) => <Ltr className="text-xs">{s.code}</Ltr>, sortValue: (s) => s.code },
  { key: 'name', header: t('common.name'), cell: (s) => <span className="font-medium">{name(s)}</span>, sortValue: (s) => s.nameAr },
  { key: 'kind', header: t('common.type'), cell: (s) => t(`sup.${s.kind}`), sortValue: (s) => s.kind },
  { key: 'mobile', header: t('common.mobile'), cell: (s) => <Ltr className="text-xs">{s.mobile}</Ltr> },
  { key: 'paid', header: tr('إجمالي المدفوع له', 'Total paid'), cell: (s) => <Money value={paid.get(s.id) ?? 0} />, sortValue: (s) => paid.get(s.id) ?? 0, align: 'end' },
  { key: 'active', header: t('common.status'), cell: (s) => s.active ? <span className="text-xs text-success">{tr('فعّال', 'Active')}</span> : <span className="text-xs text-muted">{tr('معطّل', 'Inactive')}</span> },
  { key: 'actions', header: '', alwaysVisible: true, cell: (s) => can('finance.edit') && <RowActions><Button variant="ghost" size="icon-sm" onClick={() => {setEditing(s);setOpen(true);}} aria-label={t('common.edit')}><PencilIcon /></Button></RowActions> }];

  return (
    <div>
      <PageHeader title={t('nav.suppliers')} description={tr('الجهات الحكومية والمزودون الذين يدفع لهم المكتب.', 'Authorities and providers the office pays.')} crumbs={[{ label: t('nav.suppliers') }]} actions={can('finance.edit') && <Button onClick={() => {setEditing(undefined);setOpen(true);}}><PlusIcon />{tr('جهة / مورد جديد', 'New payee')}</Button>} />
      <DataTable tableId="suppliers" rows={list.data ?? []} columns={columns} getRowId={(s) => s.id} searchText={(s) => `${s.nameAr} ${s.nameEn} ${s.code}`} isLoading={list.isLoading} isError={list.isError} onRetry={() => list.refetch()} exportName="suppliers" />
      <SupplierDialog open={open} onClose={() => setOpen(false)} supplier={editing} />
    </div>);

}
