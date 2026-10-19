import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Field } from '../ui/Field';
import { Input, Select, Textarea } from '../ui/Input';
import { useRecordTransfer } from '../../hooks/useApi';
import { useI18n } from '../../hooks/useI18n';
import { useFormError } from '../../hooks/useFormError';
import { useLookups } from '../../hooks/useLookups';
import { todayIso } from '../../utils/dates';
import { requestKey } from '../../utils/random';
import { errorMessage } from '../../utils/errors';

const schema = z.
object({
  fromAccountId: z.string().min(1, 'account'),
  toAccountId: z.string().min(1, 'account'),
  amount: z.coerce.number({ invalid_type_error: 'required' }).gt(0, 'positive'),
  date: z.string().min(1, 'required'),
  reference: z.string().optional(),
  notes: z.string().optional()
}).
refine((v) => v.fromAccountId !== v.toAccountId, { path: ['toAccountId'], message: 'same' });
type FormValues = z.infer<typeof schema>;

/** Moves money between the office's own accounts. Net effect on total cash: zero. */
export function TransferDialog({ open, onClose }: {open: boolean;onClose: () => void;}) {
  const { t, tr, lang, name } = useI18n();
  const fe = useFormError();
  const lk = useLookups();
  const record = useRecordTransfer();
  const [requestId, setRequestId] = useState(requestKey);
  const { register, handleSubmit, reset, formState } = useForm<FormValues>({ resolver: zodResolver(schema) });
  const errors = formState.errors;
  const active = lk.accounts.filter((a) => a.active);

  useEffect(() => {
    if (!open) return;
    setRequestId(requestKey());
    reset({ fromAccountId: active[0]?.id ?? '', toAccountId: active[1]?.id ?? '', amount: 0, date: todayIso(), reference: '', notes: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reset]);

  const onSubmit = (v: FormValues) =>
  record.mutate(
    { ...v, requestId, reference: v.reference?.trim() || undefined, notes: v.notes?.trim() || undefined },
    {
      onSuccess: (tr2) => {
        toast.success(tr(`تم تسجيل التحويل ${tr2.number}`, `Transfer ${tr2.number} recorded`));
        onClose();
      },
      onError: (e) => toast.error(errorMessage(e, lang))
    }
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={tr('تحويل بين الحسابات', 'Transfer between accounts')}
      footer={
      <>
          <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" form="transfer-form" loading={record.isPending}>{t('common.save')}</Button>
        </>
      }>

      <form id="transfer-form" onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Field label={tr('من حساب', 'From')} required>
          <Select {...register('fromAccountId')}>
            {active.map((a) => <option key={a.id} value={a.id}>{name(a)}</option>)}
          </Select>
        </Field>
        <Field label={tr('إلى حساب', 'To')} required error={errors.toAccountId?.message === 'same' ? tr('اختر حساباً مختلفاً', 'Choose a different account') : fe(errors.toAccountId)}>
          <Select {...register('toAccountId')}>
            {active.map((a) => <option key={a.id} value={a.id}>{name(a)}</option>)}
          </Select>
        </Field>
        <Field label={t('common.amount')} required error={fe(errors.amount)}>
          <Input type="number" step="0.01" min="0" dir="ltr" {...register('amount')} />
        </Field>
        <Field label={t('common.date')} required>
          <Input type="date" {...register('date')} />
        </Field>
        <Field label={t('common.reference')}>
          <Input dir="ltr" className="text-start" {...register('reference')} />
        </Field>
        <Field label={t('common.notes')}>
          <Textarea rows={1} {...register('notes')} />
        </Field>
      </form>
    </Dialog>);

}
