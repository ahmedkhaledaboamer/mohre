import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { LinkIcon } from 'lucide-react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Field } from '../ui/Field';
import { Input, Select, Textarea } from '../ui/Input';
import { useStageUpdate } from '../../hooks/useApi';
import { useI18n } from '../../hooks/useI18n';
import { useFormError } from '../../hooks/useFormError';
import { useLookups } from '../../hooks/useLookups';
import { money, optStr } from '../../utils/schemas';
import { unmetDependencies } from '../../utils/cases';
import { errorMessage } from '../../utils/errors';
import type { StageStatus, Transaction, WorkflowStage } from '../../types/cases';

const STATUSES: StageStatus[] = ['not_started', 'in_progress', 'waiting_customer', 'waiting_payment', 'submitted', 'completed', 'rejected', 'cancelled'];

const schema = z.
object({
  status: z.enum(['not_started', 'in_progress', 'waiting_customer', 'waiting_payment', 'submitted', 'completed', 'rejected', 'cancelled']),
  startDate: optStr(),
  dueDate: optStr(),
  completedDate: optStr(),
  assigneeId: optStr(),
  referenceNo: optStr(),
  expectedCost: money(),
  nextAction: optStr(),
  rejectionReason: optStr(),
  notes: optStr()
}).
refine((v) => v.status !== 'rejected' || Boolean(v.rejectionReason?.trim()), { path: ['rejectionReason'], message: 'required' });
type FormValues = z.infer<typeof schema>;

export function StageEditDialog({ tx, stage, onClose }: {tx: Transaction;stage: WorkflowStage | null;onClose: () => void;}) {
  const { t, tr, lang, name } = useI18n();
  const fe = useFormError();
  const lk = useLookups();
  const mutation = useStageUpdate();
  const { register, handleSubmit, reset, watch, formState } = useForm<FormValues>({ resolver: zodResolver(schema) });
  const errors = formState.errors;

  useEffect(() => {
    if (stage)
    reset({
      status: stage.status,
      startDate: stage.startDate ?? '',
      dueDate: stage.dueDate ?? '',
      completedDate: stage.completedDate ?? '',
      assigneeId: stage.assigneeId ?? '',
      referenceNo: stage.referenceNo ?? '',
      expectedCost: stage.expectedCost,
      nextAction: stage.nextAction ?? '',
      rejectionReason: stage.rejectionReason ?? '',
      notes: stage.notes ?? ''
    });
  }, [stage, reset]);

  if (!stage) return null;
  const blockers = unmetDependencies(tx, stage);
  const status = watch('status');
  const blocked = blockers.length > 0 && !['not_started', 'cancelled'].includes(status);
  const locked = tx.status === 'completed' || tx.status === 'cancelled';

  const onSubmit = (v: FormValues) => {
    if (blocked) return;
    const clean = (s?: string) => s ? s : undefined;
    mutation.mutate(
      {
        caseId: tx.id,
        stageId: stage.id,
        patch: {
          status: v.status,
          startDate: clean(v.startDate),
          dueDate: clean(v.dueDate),
          completedDate: v.status === 'completed' ? clean(v.completedDate) : undefined,
          assigneeId: clean(v.assigneeId),
          referenceNo: clean(v.referenceNo),
          expectedCost: v.expectedCost,
          nextAction: clean(v.nextAction),
          rejectionReason: v.status === 'rejected' ? clean(v.rejectionReason) : undefined,
          notes: clean(v.notes)
        }
      },
      {
        onSuccess: () => {
          toast.success(tr('تم تحديث المرحلة', 'Stage updated'));
          onClose();
        },
        onError: (e) => toast.error(errorMessage(e, lang))
      }
    );
  };

  return (
    <Dialog
      open={Boolean(stage)}
      onClose={onClose}
      size="lg"
      title={tr(stage.nameAr, stage.nameEn)}
      description={tr('تحديث حالة المرحلة والتواريخ والرسوم والمرجع', 'Update stage status, dates, fees and reference')}
      footer={
      <>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="stage-form" loading={mutation.isPending} disabled={blocked || locked}>
            {t('common.save')}
          </Button>
        </>
      }>
      
      {locked && <p className="mb-4 rounded-md bg-subtle px-3 py-2 text-xs text-muted">{tr('المعاملة مغلقة ولا يمكن تعديل مراحلها.', 'This case is closed; stages are read-only.')}</p>}
      {blocked &&
      <p className="mb-4 flex items-start gap-2 rounded-md bg-warning-soft px-3 py-2 text-xs text-warning">
          <LinkIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {tr('لا يمكن بدء هذه المرحلة قبل اكتمال: ', 'This stage cannot progress until these are completed: ')}
          {blockers.map((b) => tr(b.nameAr, b.nameEn)).join('، ')}
        </p>
      }
      <form id="stage-form" onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-3" noValidate>
        <Field label={t('common.status')} required>
          <Select {...register('status')}>
            {STATUSES.map((s) =>
            <option key={s} value={s}>
                {t(`stage.${s}`)}
              </option>
            )}
          </Select>
        </Field>
        <Field label={t('common.assignee')}>
          <Select {...register('assigneeId')}>
            <option value="">{t('common.select')}</option>
            {lk.users.map((u) =>
            <option key={u.id} value={u.id}>
                {name(u)}
              </option>
            )}
          </Select>
        </Field>
        <Field label={tr('الرقم المرجعي', 'Reference no.')}>
          <Input dir="ltr" className="text-start" {...register('referenceNo')} />
        </Field>
        <Field label={t('common.startDate')}>
          <Input type="date" {...register('startDate')} />
        </Field>
        <Field label={t('common.dueDate')}>
          <Input type="date" {...register('dueDate')} />
        </Field>
        <Field label={tr('تاريخ الإكمال', 'Completion date')} hint={status !== 'completed' ? tr('يُفعّل عند الإكمال', 'Enabled when completed') : undefined}>
          <Input type="date" {...register('completedDate')} disabled={status !== 'completed'} />
        </Field>
        <div className="grid gap-4 border-t border-line pt-4 sm:col-span-3 sm:grid-cols-3">
          <Field label={tr('التكلفة المتوقعة للخطوة', 'Expected step cost')} error={fe(errors.expectedCost)} hint={tr('تقديرية للتخطيط فقط', 'Planning figure only')}>
            <Input type="number" step="0.01" dir="ltr" {...register('expectedCost')} />
          </Field>
          <p className="self-end text-xs text-muted sm:col-span-2">
            {tr('التكلفة الفعلية والمبلغ المحصّل لهذه الخطوة تُحسب من سندات الصرف والقبض المرتبطة بها، ولا تُعدّل يدوياً هنا.', 'Actual cost and amount collected for this step come from linked vouchers and are not edited here.')}
          </p>
        </div>
        <Field label={tr('الإجراء التالي', 'Next action')} className="sm:col-span-3">
          <Input {...register('nextAction')} />
        </Field>
        {status === 'rejected' &&
        <Field label={tr('سبب الرفض', 'Rejection reason')} required error={fe(errors.rejectionReason)} className="sm:col-span-3">
            <Textarea rows={2} {...register('rejectionReason')} aria-invalid={Boolean(errors.rejectionReason)} />
          </Field>
        }
        <Field label={t('common.notes')} className="sm:col-span-3">
          <Textarea rows={2} {...register('notes')} />
        </Field>
      </form>
    </Dialog>);

}