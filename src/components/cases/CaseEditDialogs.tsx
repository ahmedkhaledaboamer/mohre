import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Field } from '../ui/Field';
import { Checkbox, Input, Select, Textarea } from '../ui/Input';
import { Money } from '../ui/Display';
import { useUpdateFees, useUpdateTransaction } from '../../hooks/useApi';
import { useI18n } from '../../hooks/useI18n';
import { useLookups } from '../../hooks/useLookups';
import { usePermissions } from '../../hooks/usePermissions';
import { feeTotals } from '../../utils/finance';
import { errorMessage } from '../../utils/errors';
import type { Transaction, TransactionFees } from '../../types/cases';

const FEE_KEYS: (keyof Pick<TransactionFees, 'governmentFee' | 'providerCost' | 'otherCosts' | 'serviceFee' | 'discount'>)[] = ['governmentFee', 'providerCost', 'otherCosts', 'serviceFee', 'discount'];
const FEE_LABEL: Record<(typeof FEE_KEYS)[number], string> = {
  governmentFee: 'common.governmentFee',
  providerCost: 'common.providerCost',
  otherCosts: 'common.otherCosts',
  serviceFee: 'common.serviceFee',
  discount: 'common.discount'
};

/** Correct the charge. Recorded receipts and payment vouchers are never modified. */
export function CaseFeesDialog({ tx, open, onClose }: {tx: Transaction;open: boolean;onClose: () => void;}) {
  const { t, tr, lang } = useI18n();
  const mutation = useUpdateFees();
  const [fees, setFees] = useState<TransactionFees>(tx.fees);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) {
      setFees(tx.fees);
      setReason('');
    }
  }, [open, tx.fees]);

  const before = feeTotals(tx.fees, tx.fees.vatRate);
  const after = feeTotals(fees, fees.vatRate);
  const invalid = FEE_KEYS.some((k) => !Number.isFinite(fees[k]) || fees[k] < 0) || fees.discount > fees.serviceFee;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={tr('تعديل رسوم المعاملة', 'Edit transaction fees')}
      description={tr('يغيّر المستحق على العميل من الآن؛ السندات المسجلة سابقاً لا تتغير، ويُسجَّل التعديل في سجل النشاط.', 'Changes what is owed going forward; recorded vouchers are untouched and the change is logged.')}
      footer={
      <>
          <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
          <Button
          loading={mutation.isPending}
          disabled={invalid || !reason.trim()}
          onClick={() =>
          mutation.mutate(
            { id: tx.id, fees, reason: reason.trim() },
            {
              onSuccess: () => {
                toast.success(t('common.saved'));
                onClose();
              },
              onError: (e) => toast.error(errorMessage(e, lang))
            }
          )
          }>

            {t('common.save')}
          </Button>
        </>
      }>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {FEE_KEYS.map((k) =>
        <Field key={k} label={t(FEE_LABEL[k])}>
            <Input type="number" step="0.01" min="0" dir="ltr" value={fees[k]} onChange={(e) => setFees((f) => ({ ...f, [k]: e.target.value === '' ? 0 : Number(e.target.value) }))} />
          </Field>
        )}
        <Field label={t('common.vat')}>
          <Select value={fees.vatTreatment} onChange={(e) => setFees((f) => ({ ...f, vatTreatment: e.target.value as TransactionFees['vatTreatment'] }))}>
            {(['standard', 'zero', 'exempt', 'out_of_scope'] as const).map((v) => <option key={v} value={v}>{t(`vat.${v}`)}</option>)}
          </Select>
        </Field>
        <div className="col-span-2 flex items-center justify-between rounded-lg bg-subtle/70 px-4 py-3 text-sm sm:col-span-3">
          <span className="text-muted">{t('common.amountDue')}</span>
          <span className="flex items-center gap-2">
            <Money value={before.due} className="text-muted line-through" />
            <Money value={after.due} className="font-semibold" />
          </span>
        </div>
        {fees.discount > fees.serviceFee && <p className="col-span-2 text-xs text-danger sm:col-span-3">{tr('الخصم لا يتجاوز أتعاب المكتب', 'Discount cannot exceed the office fee')}</p>}
        <Field label={tr('سبب التعديل', 'Reason')} required className="col-span-2 sm:col-span-3">
          <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
      </div>
    </Dialog>);

}

/** Edit non-financial details. The original registrar is immutable; reassigning the officer needs permission. */
export function CaseDetailsDialog({ tx, open, onClose }: {tx: Transaction;open: boolean;onClose: () => void;}) {
  const { t, tr, lang, name } = useI18n();
  const { can } = usePermissions();
  const lk = useLookups();
  const mutation = useUpdateTransaction();
  const [form, setForm] = useState({ officerId: tx.officerId, priority: tx.priority, externalRef: tx.externalRef ?? '', dueDate: tx.dueDate, beneficiaryName: tx.beneficiaryName ?? '', costsFinalized: Boolean(tx.costsFinalized) });

  useEffect(() => {
    if (open) setForm({ officerId: tx.officerId, priority: tx.priority, externalRef: tx.externalRef ?? '', dueDate: tx.dueDate, beneficiaryName: tx.beneficiaryName ?? '', costsFinalized: Boolean(tx.costsFinalized) });
  }, [open, tx]);

  const canReassign = can('cases.reassign');
  const canFinalize = can('cases.fees') || can('cases.editAny');

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={tr('تعديل بيانات المعاملة', 'Edit transaction details')}
      description={tr(`سجّلها: ${name(lk.user.get(tx.createdBy))} — لا يتغير مسجّل المعاملة عند التعديل.`, `Registered by ${name(lk.user.get(tx.createdBy))} — this never changes on edit.`)}
      footer={
      <>
          <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
          <Button
          loading={mutation.isPending}
          onClick={() =>
          mutation.mutate(
            {
              id: tx.id,
              patch: {
                ...(canReassign ? { officerId: form.officerId } : {}),
                priority: form.priority,
                externalRef: form.externalRef.trim() || undefined,
                dueDate: form.dueDate,
                ...(tx.employeeId ? {} : { beneficiaryName: form.beneficiaryName.trim() || undefined }),
                ...(canFinalize ? { costsFinalized: form.costsFinalized } : {})
              }
            },
            {
              onSuccess: () => {
                toast.success(t('common.saved'));
                onClose();
              },
              onError: (e) => toast.error(errorMessage(e, lang))
            }
          )
          }>

            {t('common.save')}
          </Button>
        </>
      }>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={tr('الموظف المنفذ', 'Executing officer')} hint={!canReassign ? tr('إعادة الإسناد تتطلب صلاحية المدير', 'Reassignment needs admin permission') : undefined}>
          <Select value={form.officerId} disabled={!canReassign} onChange={(e) => setForm((f) => ({ ...f, officerId: e.target.value }))}>
            {lk.users.filter((u) => u.active || u.id === tx.officerId).map((u) => <option key={u.id} value={u.id}>{name(u)}</option>)}
          </Select>
        </Field>
        <Field label={t('common.priority')}>
          <Select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as Transaction['priority'] }))}>
            <option value="normal">{t('prio.normal')}</option>
            <option value="urgent">{t('prio.urgent')}</option>
          </Select>
        </Field>
        <Field label={tr('الرقم المرجعي لدى الجهة', 'Authority reference')}>
          <Input dir="ltr" className="text-start" value={form.externalRef} onChange={(e) => setForm((f) => ({ ...f, externalRef: e.target.value }))} />
        </Field>
        <Field label={t('common.dueDate')}>
          <Input type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
        </Field>
        {!tx.employeeId &&
        <Field label={tr('اسم المستفيد', 'Beneficiary name')} className="sm:col-span-2">
            <Input value={form.beneficiaryName} onChange={(e) => setForm((f) => ({ ...f, beneficiaryName: e.target.value }))} />
          </Field>
        }
        {canFinalize &&
        <div className="sm:col-span-2">
            <Checkbox
            checked={form.costsFinalized}
            onChange={(e) => setForm((f) => ({ ...f, costsFinalized: e.target.checked }))}
            label={tr('اعتماد التكاليف النهائية — المتبقي غير المدفوع للجهات لم يعد مستحقاً (مثلاً طبّق المورد خصماً)', 'Finalize costs — any unpaid expected cost is no longer owed (e.g. supplier charged less)')} />

          </div>
        }
      </div>
    </Dialog>);

}
