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
import { useRecordReceipt } from '../../hooks/useApi';
import { useI18n } from '../../hooks/useI18n';
import { useFormError } from '../../hooks/useFormError';
import { useLookups } from '../../hooks/useLookups';
import { useLedger } from '../../hooks/useLedger';
import { customerBalance, defaultAccountId, round2 } from '../../utils/finance';
import { todayIso } from '../../utils/dates';
import { requestKey } from '../../utils/random';
import { errorMessage } from '../../utils/errors';
import type { PaymentMethod, Receipt } from '../../types/finance';

const METHODS: PaymentMethod[] = ['cash', 'bank_transfer', 'card', 'cheque'];

const schema = z.
object({
  customerId: z.string().min(1, 'required'),
  target: z.string(),
  amount: z.coerce.number({ invalid_type_error: 'required' }).gt(0, 'positive'),
  date: z.string().min(1, 'required'),
  method: z.enum(['cash', 'bank_transfer', 'card', 'cheque']),
  accountId: z.string().min(1, 'account'),
  reference: z.string().optional(),
  notes: z.string().optional()
}).
refine((v) => v.method === 'cash' || v.method === 'card' || Boolean(v.reference?.trim()), { path: ['reference'], message: 'reference' });
type FormValues = z.infer<typeof schema>;

export interface ReceiptDialogProps {
  open: boolean;
  onClose: () => void;
  kind?: Receipt['kind'];
  customerId?: string;
  transactionId?: string;
  invoiceId?: string;
  stageId?: string;
  onSaved?: (r: Receipt) => void;
}

/** Records money actually received from (or returned to) a customer — one immutable voucher per save. */
export function ReceiptDialog({ open, onClose, kind = 'receipt', customerId, transactionId, invoiceId, stageId, onSaved }: ReceiptDialogProps) {
  const { t, tr, lang, name } = useI18n();
  const fe = useFormError();
  const lk = useLookups();
  const { ledger, invoiceViews } = useLedger({ ignoreBranch: true });
  const record = useRecordReceipt();
  const [requestId, setRequestId] = useState(requestKey);
  const refund = kind === 'refund';
  const { register, handleSubmit, reset, watch, setValue, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { customerId: '', target: 'account', amount: 0, date: todayIso(), method: 'cash', accountId: '', reference: '', notes: '' }
  });
  const errors = formState.errors;
  const cust = watch('customerId');
  const target = watch('target') ?? 'account';
  const method = watch('method');
  const amount = Number(watch('amount')) || 0;

  const targets = useMemo(() => {
    const txs = ledger.list.
    filter((s) => s.tx.customerId === cust && (refund ? s.collected > 0 : s.receivable > 0 || s.tx.id === transactionId)).
    sort((a, b) => a.tx.transactionDate.localeCompare(b.tx.transactionDate));
    const invs = invoiceViews.filter((v) => v.invoice.customerId === cust && (refund ? v.paid > 0 : v.balance > 0));
    return { txs, invs };
  }, [ledger.list, invoiceViews, cust, refund, transactionId]);

  const limit = useMemo(() => {
    if (target.startsWith('tx:')) {
      const s = ledger.summaries.get(target.slice(3));
      return s ? refund ? s.collected : Math.max(s.customerBalance, 0) : 0;
    }
    if (target.startsWith('inv:')) {
      const v = invoiceViews.find((x) => x.invoice.id === target.slice(4));
      return v ? refund ? v.paid : v.balance : 0;
    }
    if (!cust) return 0;
    const cb = customerBalance(cust, ledger.list, ledger.receipts, ledger.invoices);
    return refund ? Math.max(cb.collected, 0) : Math.max(cb.balance, 0);
  }, [target, cust, ledger, invoiceViews, refund]);

  useEffect(() => {
    if (!open) return;
    setRequestId(requestKey());
    const tgt = transactionId ? `tx:${transactionId}` : invoiceId ? `inv:${invoiceId}` : 'account';
    reset({ customerId: customerId ?? '', target: tgt, amount: 0, date: todayIso(), method: 'cash', accountId: defaultAccountId('cash', lk.accounts), reference: '', notes: '' });
    // Defaults depend only on what the dialog was opened for.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, customerId, transactionId, invoiceId, reset]);

  useEffect(() => {
    if (open && limit > 0 && !formState.dirtyFields.amount) setValue('amount', round2(limit));
  }, [open, limit, setValue, formState.dirtyFields.amount]);

  useEffect(() => {
    if (method) setValue('accountId', defaultAccountId(method, lk.accounts));
  }, [method, lk.accounts, setValue]);

  const exceeds = target !== 'account' || refund ? amount > limit + 0.005 : false;

  const onSubmit = (v: FormValues) => {
    if (exceeds) return;
    record.mutate(
      {
        requestId,
        kind,
        customerId: v.customerId,
        transactionId: v.target.startsWith('tx:') ? v.target.slice(3) : undefined,
        invoiceId: v.target.startsWith('inv:') ? v.target.slice(4) : invoiceId,
        stageId,
        date: v.date,
        amount: v.amount,
        method: v.method,
        accountId: v.accountId,
        reference: v.reference?.trim() || undefined,
        notes: v.notes?.trim() || undefined
      },
      {
        onSuccess: (r) => {
          toast.success(refund ? tr(`تم تسجيل رد المبلغ ${r.number}`, `Refund ${r.number} recorded`) : tr(`تم تسجيل سند القبض ${r.number}`, `Receipt ${r.number} recorded`));
          onSaved?.(r);
          onClose();
        },
        onError: (e) => toast.error(errorMessage(e, lang))
      }
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={refund ? tr('رد مبلغ إلى العميل', 'Refund to customer') : tr('سند قبض — تسجيل مبلغ مستلم فعلياً', 'Receipt — record money actually received')}
      description={refund ? tr('يُسجَّل كحركة صادرة مستقلة ولا يعدّل السندات السابقة.', 'Recorded as a separate outflow; earlier receipts are not changed.') : tr('سجّل فقط المبلغ الذي استلمته فعلاً. الدفعات الجزئية مسموحة.', 'Record only the amount actually received. Partial payments are allowed.')}
      footer={
      <>
          <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" form="receipt-form" variant={refund ? 'danger' : 'primary'} loading={record.isPending} disabled={exceeds || record.isPending}>
            {refund ? tr('تسجيل الرد', 'Record refund') : tr('حفظ سند القبض', 'Save receipt')}
          </Button>
        </>
      }>

      <form id="receipt-form" onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Field label={t('common.customer')} required error={fe(errors.customerId)}>
          <Select {...register('customerId')} disabled={Boolean(customerId)} onChange={(e) => {setValue('customerId', e.target.value);setValue('target', 'account');}}>
            <option value="">{t('common.select')}</option>
            {lk.customers.map((c) =>
            <option key={c.id} value={c.id}>{name(c)} — {c.code}</option>
            )}
          </Select>
        </Field>
        <Field label={tr('يُسجَّل مقابل', 'Applies to')} hint={target === 'account' && !refund ? tr('دفعة على الحساب: تخفض رصيد العميل دون ربطها بمعاملة.', 'On account: reduces the customer balance without a specific transaction.') : undefined}>
          <Select {...register('target')} disabled={Boolean(transactionId)}>
            <option value="account">{refund ? tr('رصيد العميل العام', 'Customer account') : tr('دفعة على الحساب', 'On account')}</option>
            {targets.txs.map((s) =>
            <option key={s.tx.id} value={`tx:${s.tx.id}`}>
                {s.tx.ref} — {tr(s.tx.titleAr, s.tx.titleEn).slice(0, 50)}
              </option>
            )}
            {targets.invs.map((v) =>
            <option key={v.invoice.id} value={`inv:${v.invoice.id}`}>
                {tr('فاتورة', 'Invoice')} {v.invoice.number}
              </option>
            )}
          </Select>
        </Field>

        {cust &&
        <div className="grid grid-cols-3 gap-3 rounded-lg bg-subtle/70 p-3 text-xs sm:col-span-2">
            <div>
              <p className="text-muted">{refund ? tr('الحد الأقصى للرد', 'Max refundable') : tr('المتبقي قبل السند', 'Balance before')}</p>
              <Money value={limit} className="mt-0.5 block text-sm font-semibold" />
            </div>
            <div>
              <p className="text-muted">{tr('هذا السند', 'This voucher')}</p>
              <Money value={refund ? -amount : amount} className="mt-0.5 block text-sm font-semibold" />
            </div>
            <div>
              <p className="text-muted">{refund ? tr('المتبقي للرد', 'Left refundable') : tr('المتبقي بعد السند', 'Balance after')}</p>
              <Money value={round2(limit - amount)} className="mt-0.5 block text-sm font-semibold" />
            </div>
          </div>
        }

        <Field label={t('common.amount')} required error={exceeds ? refund ? tr('يتجاوز المبلغ المحصّل', 'Exceeds amount collected') : tr('المبلغ يتجاوز المتبقي', 'Exceeds remaining balance') : fe(errors.amount)}>
          <Input type="number" step="0.01" min="0" dir="ltr" {...register('amount')} aria-invalid={Boolean(errors.amount) || exceeds} />
        </Field>
        <Field label={t('common.date')} required error={fe(errors.date)}>
          <Input type="date" {...register('date')} max={todayIso()} />
        </Field>
        <Field label={t('common.method')} required>
          <Select {...register('method')}>
            {METHODS.map((m) => <option key={m} value={m}>{t(`pay.${m}`)}</option>)}
          </Select>
        </Field>
        <Field label={t('common.account')} required error={fe(errors.accountId)}>
          <Select {...register('accountId')}>
            {lk.accounts.filter((a) => a.active).map((a) => <option key={a.id} value={a.id}>{name(a)}</option>)}
          </Select>
        </Field>
        <Field label={t('common.reference')} error={fe(errors.reference)} hint={tr('مطلوب للتحويل البنكي والشيك', 'Required for bank transfer and cheque')}>
          <Input dir="ltr" className="text-start" {...register('reference')} />
        </Field>
        <Field label={t('common.notes')}>
          <Textarea rows={1} {...register('notes')} />
        </Field>
      </form>
    </Dialog>);

}
