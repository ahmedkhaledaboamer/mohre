import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Field } from '../ui/Field';
import { Input, Select, Textarea } from '../ui/Input';
import { Money } from '../ui/Display';
import { useRecordPayment } from '../../hooks/useApi';
import { useI18n } from '../../hooks/useI18n';
import { useFormError } from '../../hooks/useFormError';
import { useLookups } from '../../hooks/useLookups';
import { useLedger } from '../../hooks/useLedger';
import { defaultAccountId, round2 } from '../../utils/finance';
import { todayIso } from '../../utils/dates';
import { requestKey } from '../../utils/random';
import { errorMessage } from '../../utils/errors';
import type { Payment, PaymentCategory, PaymentMethod } from '../../types/finance';

const METHODS: PaymentMethod[] = ['card', 'bank_transfer', 'cash', 'cheque'];
const CATS: PaymentCategory[] = ['government_fee', 'provider_cost', 'other_direct_cost'];

const schema = z.object({
  category: z.enum(['government_fee', 'provider_cost', 'other_direct_cost']),
  transactionId: z.string(),
  stageId: z.string(),
  supplierId: z.string(),
  payeeName: z.string().trim().min(1, 'required'),
  amount: z.coerce.number({ invalid_type_error: 'required' }).gt(0, 'positive'),
  date: z.string().min(1, 'required'),
  method: z.enum(['cash', 'bank_transfer', 'card', 'cheque']),
  accountId: z.string().min(1, 'account'),
  reference: z.string().optional(),
  notes: z.string().optional()
});
type FormValues = z.infer<typeof schema>;

export interface PaymentDialogProps {
  open: boolean;
  onClose: () => void;
  transactionId?: string;
  stageId?: string;
  category?: PaymentCategory;
  onSaved?: (p: Payment) => void;
}

/** Payment voucher: money the office actually paid to a government body or provider. */
export function PaymentDialog({ open, onClose, transactionId, stageId, category, onSaved }: PaymentDialogProps) {
  const { t, tr, lang, name } = useI18n();
  const fe = useFormError();
  const lk = useLookups();
  const { ledger } = useLedger({ ignoreBranch: true });
  const record = useRecordPayment();
  const [requestId, setRequestId] = useState(requestKey);
  const { register, handleSubmit, reset, watch, setValue, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { category: 'government_fee', transactionId: '', stageId: '', supplierId: '', payeeName: '', amount: 0, date: todayIso(), method: 'card', accountId: '', reference: '', notes: '' }
  });
  const errors = formState.errors;
  const txId = watch('transactionId');
  const cat = watch('category');
  const method = watch('method');
  const supplierId = watch('supplierId');
  const amount = Number(watch('amount')) || 0;
  const summary = txId ? ledger.summaries.get(txId) : undefined;

  const openTxs = useMemo(() => ledger.list.filter((s) => s.tx.status !== 'cancelled' || s.tx.id === transactionId).sort((a, b) => b.tx.createdAt.localeCompare(a.tx.createdAt)), [ledger.list, transactionId]);

  useEffect(() => {
    if (!open) return;
    setRequestId(requestKey());
    reset({
      category: category ?? 'government_fee',
      transactionId: transactionId ?? '',
      stageId: stageId ?? '',
      supplierId: '',
      payeeName: '',
      amount: 0,
      date: todayIso(),
      method: 'card',
      accountId: defaultAccountId('card', lk.accounts, 'gov'),
      reference: '',
      notes: ''
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, transactionId, stageId, category, reset]);

  useEffect(() => {
    if (!open || formState.dirtyFields.amount) return;
    const stage = summary?.tx.stages.find((s) => s.id === watch('stageId'));
    const suggested = cat === 'other_direct_cost' ? 0 : stage ? stage.expectedCost : summary?.payable ?? 0;
    setValue('amount', round2(Math.max(suggested, 0)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, summary, cat, setValue]);

  useEffect(() => {
    if (method) setValue('accountId', defaultAccountId(method, lk.accounts, cat === 'government_fee' ? 'gov' : 'out'));
  }, [method, cat, lk.accounts, setValue]);

  useEffect(() => {
    const s = lk.supplier.get(supplierId);
    if (s) setValue('payeeName', s.nameAr, { shouldValidate: formState.isSubmitted });
  }, [supplierId, lk.supplier, setValue, formState.isSubmitted]);

  const onSubmit = (v: FormValues) =>
  record.mutate(
    {
      requestId,
      category: v.category,
      supplierId: v.supplierId || undefined,
      payeeName: v.payeeName.trim(),
      transactionId: v.transactionId || undefined,
      stageId: v.stageId || undefined,
      date: v.date,
      amount: v.amount,
      method: v.method,
      accountId: v.accountId,
      reference: v.reference?.trim() || undefined,
      notes: v.notes?.trim() || undefined
    },
    {
      onSuccess: (p) => {
        toast.success(tr(`تم تسجيل سند الصرف ${p.number}`, `Payment voucher ${p.number} recorded`));
        onSaved?.(p);
        onClose();
      },
      onError: (e) => toast.error(errorMessage(e, lang))
    }
  );

  const overPay = summary && cat !== 'other_direct_cost' && amount > summary.payable + 0.005;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={tr('سند صرف — دفع لجهة حكومية أو مورد', 'Payment voucher — paid to authority / provider')}
      description={tr('سجّل ما دفعه المكتب فعلياً. لا يُفترض أنه يساوي ما حُصّل من العميل.', 'Record what the office actually paid. It is not assumed to equal what the customer paid.')}
      footer={
      <>
          <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" form="payment-form" loading={record.isPending}>{tr('حفظ سند الصرف', 'Save voucher')}</Button>
        </>
      }>

      <form id="payment-form" onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Field label={t('common.category')} required>
          <Select {...register('category')}>
            {CATS.map((c) => <option key={c} value={c}>{t(`pcat.${c}`)}</option>)}
          </Select>
        </Field>
        <Field label={tr('المعاملة', 'Transaction')} hint={!txId ? tr('اختياري — بدون معاملة يُسجَّل كدفعة عامة', 'Optional') : undefined}>
          <Select {...register('transactionId')} disabled={Boolean(transactionId)} onChange={(e) => {setValue('transactionId', e.target.value);setValue('stageId', '');}}>
            <option value="">{tr('بدون معاملة', 'No transaction')}</option>
            {openTxs.map((s) =>
            <option key={s.tx.id} value={s.tx.id}>
                {s.tx.ref} — {tr(s.tx.titleAr, s.tx.titleEn).slice(0, 48)}
              </option>
            )}
          </Select>
        </Field>
        {summary && summary.tx.stages.length > 1 &&
        <Field label={tr('الخطوة', 'Step')} className="sm:col-span-2">
            <Select {...register('stageId')}>
              <option value="">{tr('غير مرتبط بخطوة محددة', 'Not tied to a step')}</option>
              {summary.tx.stages.filter((s) => s.applicable).map((s) =>
            <option key={s.id} value={s.id}>
                  {tr(s.nameAr, s.nameEn)} — {tr('متوقع', 'expected')} {s.expectedCost}
                </option>
            )}
            </Select>
          </Field>
        }
        {summary &&
        <div className="grid grid-cols-3 gap-3 rounded-lg bg-subtle/70 p-3 text-xs sm:col-span-2">
            <div>
              <p className="text-muted">{tr('التكاليف المباشرة المفوترة', 'Direct costs billed')}</p>
              <Money value={summary.totals.directCosts} className="mt-0.5 block text-sm font-semibold" />
            </div>
            <div>
              <p className="text-muted">{tr('مدفوع سابقاً', 'Already paid')}</p>
              <Money value={summary.paidOut} className="mt-0.5 block text-sm font-semibold" />
            </div>
            <div>
              <p className="text-muted">{tr('المتبقي للجهات', 'Still owed')}</p>
              <Money value={summary.payable} className="mt-0.5 block text-sm font-semibold" />
            </div>
          </div>
        }
        <Field label={tr('الجهة / المورد المسجل', 'Registered payee')}>
          <Select {...register('supplierId')}>
            <option value="">{tr('— إدخال يدوي —', '— manual entry —')}</option>
            {lk.suppliers.filter((s) => s.active).map((s) => <option key={s.id} value={s.id}>{name(s)}</option>)}
          </Select>
        </Field>
        <Field label={tr('اسم الجهة المستفيدة', 'Payee name')} required error={fe(errors.payeeName)}>
          <Input {...register('payeeName')} aria-invalid={Boolean(errors.payeeName)} />
        </Field>
        <Field
          label={t('common.amount')}
          required
          error={fe(errors.amount)}
          hint={overPay ? tr('أعلى من المتبقي المتوقع — سيُحتسب الفرق تكلفة يتحملها المكتب.', 'Above the expected remainder — the excess is treated as an office-borne cost.') : cat === 'other_direct_cost' ? tr('مصروف إضافي على المعاملة يقلل ربحها ما لم يُعدَّل المستحق على العميل.', 'Extra cost reduces profit unless the customer charge is updated.') : undefined}>

          <Input type="number" step="0.01" min="0" dir="ltr" {...register('amount')} aria-invalid={Boolean(errors.amount)} />
        </Field>
        <Field label={t('common.date')} required>
          <Input type="date" {...register('date')} max={todayIso()} />
        </Field>
        <Field label={t('common.method')} required>
          <Select {...register('method')}>
            {METHODS.map((m) => <option key={m} value={m}>{t(`pay.${m}`)}</option>)}
          </Select>
        </Field>
        <Field label={tr('من حساب', 'From account')} required error={fe(errors.accountId)}>
          <Select {...register('accountId')}>
            {lk.accounts.filter((a) => a.active).map((a) => <option key={a.id} value={a.id}>{name(a)}</option>)}
          </Select>
        </Field>
        <Field label={tr('المرجع / رقم الإيصال الحكومي', 'Reference / receipt no.')}>
          <Input dir="ltr" className="text-start" {...register('reference')} />
        </Field>
        <Field label={t('common.notes')}>
          <Textarea rows={1} {...register('notes')} />
        </Field>
      </form>
    </Dialog>);

}
