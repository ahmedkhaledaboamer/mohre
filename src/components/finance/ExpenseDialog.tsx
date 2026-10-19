import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Field } from '../ui/Field';
import { Checkbox, Input, Select, Textarea } from '../ui/Input';
import { expenseHooks } from '../../hooks/useApi';
import { useI18n } from '../../hooks/useI18n';
import { useFormError } from '../../hooks/useFormError';
import { useLookups } from '../../hooks/useLookups';
import { usePermissions } from '../../hooks/usePermissions';
import { defaultAccountId } from '../../utils/finance';
import { todayIso } from '../../utils/dates';
import { requestKey } from '../../utils/random';
import { errorMessage } from '../../utils/errors';
import type { Expense, ExpenseCategory, PaymentMethod } from '../../types/finance';

const CATS: ExpenseCategory[] = ['rent', 'salaries', 'utilities', 'marketing', 'transport', 'office', 'bank_fees', 'other'];
const METHODS: PaymentMethod[] = ['bank_transfer', 'cash', 'card', 'cheque'];

const schema = z.object({
  category: z.enum(['rent', 'salaries', 'utilities', 'marketing', 'transport', 'office', 'bank_fees', 'other']),
  beneficiary: z.string().trim().min(1, 'required'),
  supplierId: z.string(),
  amount: z.coerce.number({ invalid_type_error: 'required' }).gt(0, 'positive'),
  date: z.string().min(1, 'required'),
  method: z.enum(['cash', 'bank_transfer', 'card', 'cheque']),
  accountId: z.string().min(1, 'account'),
  paid: z.boolean(),
  reference: z.string().optional(),
  notes: z.string().optional()
});
type FormValues = z.infer<typeof schema>;

/** Office operating expense (rent, salaries…) — kept separate from payments made for transactions. */
export function ExpenseDialog({ open, onClose, expense }: {open: boolean;onClose: () => void;expense?: Expense;}) {
  const { t, tr, lang, name } = useI18n();
  const fe = useFormError();
  const lk = useLookups();
  const { user } = usePermissions();
  const create = expenseHooks.useCreate();
  const update = expenseHooks.useUpdate();
  const [requestId, setRequestId] = useState(requestKey);
  const { register, handleSubmit, reset, watch, setValue, formState } = useForm<FormValues>({ resolver: zodResolver(schema) });
  const errors = formState.errors;
  const method = watch('method');

  useEffect(() => {
    if (!open) return;
    setRequestId(requestKey());
    reset(
      expense ?
      { ...expense, beneficiary: expense.beneficiary ?? '', supplierId: expense.supplierId ?? '', reference: expense.reference ?? '', notes: expense.notes ?? '' } :
      { category: 'office', beneficiary: '', supplierId: '', amount: 0, date: todayIso(), method: 'bank_transfer', accountId: defaultAccountId('bank_transfer', lk.accounts, 'out'), paid: true, reference: '', notes: '' }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, expense, reset]);

  useEffect(() => {
    if (method && !expense) setValue('accountId', defaultAccountId(method, lk.accounts, 'out'));
  }, [method, lk.accounts, setValue, expense]);

  const onSubmit = (v: FormValues) => {
    const payload = { ...v, supplierId: v.supplierId || undefined, reference: v.reference?.trim() || undefined, notes: v.notes?.trim() || undefined };
    const done = () => {
      toast.success(expense ? t('common.saved') : t('common.created'));
      onClose();
    };
    const fail = (e: unknown) => toast.error(errorMessage(e, lang));
    if (expense) update.mutate({ id: expense.id, patch: payload }, { onSuccess: done, onError: fail });else
    create.mutate({ ...payload, number: '', createdBy: user?.id ?? '', createdAt: '', branchId: user?.branchId ?? 'deira', requestId }, { onSuccess: done, onError: fail });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={expense ? tr('تعديل مصروف تشغيلي', 'Edit operating expense') : tr('مصروف تشغيلي جديد', 'New operating expense')}
      description={tr('للإيجار والرواتب والمرافق ونحوها. المدفوعات للجهات الحكومية عن المعاملات تُسجَّل في سندات الصرف.', 'For rent, salaries, utilities… Payments to authorities for transactions go to payment vouchers.')}
      footer={
      <>
          <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" form="expense-form" loading={create.isPending || update.isPending}>{t('common.save')}</Button>
        </>
      }>

      <form id="expense-form" onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Field label={t('common.category')} required>
          <Select {...register('category')}>
            {CATS.map((c) => <option key={c} value={c}>{t(`exp.${c}`)}</option>)}
          </Select>
        </Field>
        <Field label={tr('البيان / المستفيد', 'Description / payee')} required error={fe(errors.beneficiary)}>
          <Input {...register('beneficiary')} aria-invalid={Boolean(errors.beneficiary)} />
        </Field>
        <Field label={tr('مورد مسجل', 'Registered supplier')}>
          <Select {...register('supplierId')}>
            <option value="">—</option>
            {lk.suppliers.map((s) => <option key={s.id} value={s.id}>{name(s)}</option>)}
          </Select>
        </Field>
        <Field label={t('common.amount')} required error={fe(errors.amount)}>
          <Input type="number" step="0.01" min="0" dir="ltr" {...register('amount')} aria-invalid={Boolean(errors.amount)} />
        </Field>
        <Field label={t('common.date')} required>
          <Input type="date" {...register('date')} />
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
        <Field label={t('common.reference')}>
          <Input dir="ltr" className="text-start" {...register('reference')} />
        </Field>
        <div className="sm:col-span-2">
          <Checkbox label={tr('تم الدفع فعلياً (إلغاء التحديد = مستحق لم يُدفع بعد ولا يحرّك النقدية)', 'Actually paid (unchecked = accrued, no cash movement yet)')} {...register('paid')} />
        </div>
        <Field label={t('common.notes')} className="sm:col-span-2">
          <Textarea rows={2} {...register('notes')} />
        </Field>
      </form>
    </Dialog>);

}
