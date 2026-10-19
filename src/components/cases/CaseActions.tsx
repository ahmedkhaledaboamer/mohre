import { useState } from 'react';
import { CheckCircle2Icon, ChevronDownIcon, ShieldAlertIcon, XCircleIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Dropdown } from '../ui/Dropdown';
import { Textarea } from '../ui/Input';
import { useSetStatus } from '../../hooks/useApi';
import { useI18n } from '../../hooks/useI18n';
import { usePermissions } from '../../hooks/usePermissions';
import type { CaseStatus, Transaction } from '../../types/cases';
import { applicable, blockingStages } from '../../utils/cases';
import { errorMessage } from '../../utils/errors';
import type { TxSummary } from '../../utils/finance';

const MOVABLE: CaseStatus[] = ['new', 'in_progress', 'waiting_documents', 'waiting_payment', 'submitted'];

/** Lifecycle controls. Completing a transaction never records a payment. */
export function CaseActions({ tx, summary }: {tx: Transaction;summary?: TxSummary;}) {
  const { t, tr, lang } = useI18n();
  const { can, canEditTx } = usePermissions();
  const mutation = useSetStatus();
  const [dialog, setDialog] = useState<'complete' | 'cancel' | 'rejected' | null>(null);
  const [reason, setReason] = useState('');
  if (!canEditTx(tx) || tx.status === 'cancelled') return null;

  const hard = blockingStages(tx).filter((s) => s.status === 'rejected' || s.status === 'waiting_customer');
  const open = applicable(tx).filter((s) => s.status !== 'completed' && s.status !== 'cancelled');
  const canOverride = can('cases.override');

  const run = (status: CaseStatus, override?: boolean) =>
  mutation.mutate(
    { id: tx.id, status, override, reason: reason.trim() || undefined },
    {
      onSuccess: () => {
        toast.success(tr(`تم تغيير الحالة إلى «${t(`case.${status}`)}»`, `Status changed to ${t(`case.${status}`)}`));
        setDialog(null);
        setReason('');
      },
      onError: (e) => toast.error(errorMessage(e, lang))
    }
  );

  return (
    <>
      <Dropdown
        width="w-56"
        trigger={({ toggle }) =>
        <Button variant="outline" onClick={toggle} loading={mutation.isPending}>
            {tr('تغيير الحالة', 'Change status')}
            <ChevronDownIcon />
          </Button>
        }
        items={[
        ...MOVABLE.filter((s) => s !== tx.status).map((s) => ({ label: t(`case.${s}`), onSelect: () => run(s) })),
        { label: t('case.rejected'), onSelect: () => setDialog('rejected'), hidden: tx.status === 'rejected' },
        { label: tr('إلغاء المعاملة', 'Cancel transaction'), icon: XCircleIcon, danger: true, onSelect: () => setDialog('cancel') }]
        } />

      {tx.status !== 'completed' &&
      <Button onClick={() => setDialog('complete')}>
          <CheckCircle2Icon />
          {tr('إكمال المعاملة', 'Complete')}
        </Button>
      }

      <ConfirmDialog
        open={dialog === 'cancel'}
        onClose={() => setDialog(null)}
        title={tr('إلغاء المعاملة', 'Cancel transaction')}
        description={tr(
          'لن تُحتسب مستحقات على العميل بعد الإلغاء. أي مبلغ محصّل يبقى رصيداً دائناً للعميل حتى تسجيل رد المبلغ.',
          'The customer will no longer owe anything. Money already collected becomes a customer credit until a refund is recorded.'
        )}
        confirmLabel={tr('إلغاء المعاملة', 'Cancel transaction')}
        loading={mutation.isPending}
        confirmDisabled={!reason.trim()}
        onConfirm={() => run('cancelled')}>

        <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={tr('سبب الإلغاء (مطلوب)', 'Reason (required)')} />
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog === 'rejected'}
        onClose={() => setDialog(null)}
        title={tr('تسجيل رفض الطلب', 'Mark as rejected')}
        description={tr('سجّل سبب رفض الجهة ليظهر في المراجعة.', 'Record the authority rejection reason for review.')}
        confirmLabel={t('case.rejected')}
        loading={mutation.isPending}
        confirmDisabled={!reason.trim()}
        onConfirm={() => run('rejected')}>

        <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={tr('سبب الرفض (مطلوب)', 'Rejection reason (required)')} />
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog === 'complete'}
        onClose={() => setDialog(null)}
        tone={hard.length ? 'danger' : 'primary'}
        title={tr('إكمال المعاملة', 'Complete transaction')}
        description={
        hard.length ?
        canOverride ?
        tr(`توجد ${hard.length} خطوة إلزامية مرفوضة أو بانتظار العميل. يمكنك التجاوز بصلاحيتك مع تسجيل السبب.`, `${hard.length} mandatory step(s) are rejected or waiting on the customer. You may override with a reason.`) :
        tr('لا يمكن الإكمال: توجد خطوات إلزامية مرفوضة أو بانتظار العميل.', 'Cannot complete: mandatory steps are rejected or waiting on the customer.') :
        open.length ?
        tr(`سيتم إغلاق ${open.length} خطوة مفتوحة كمكتملة.`, `${open.length} open step(s) will be closed as completed.`) :
        tr('سيتم إغلاق المعاملة كمكتملة.', 'The transaction will be closed as completed.')
        }
        confirmLabel={hard.length ? tr('إكمال مع التجاوز', 'Complete with override') : tr('إكمال', 'Complete')}
        loading={mutation.isPending}
        confirmDisabled={hard.length > 0 && (!canOverride || !reason.trim())}
        onConfirm={() => run('completed', hard.length > 0)}>

        {summary && summary.receivable > 0 &&
        <p className="rounded-md bg-warning-soft px-3 py-2 text-xs text-warning">
            {tr('تنبيه: ما زال على العميل مبلغ غير محصّل. الإكمال لا يسجّل أي تحصيل.', 'Note: the customer still owes money. Completing records no payment.')}
          </p>
        }
        {hard.length > 0 &&
        <>
            <ul className="space-y-1 rounded-md bg-subtle px-3 py-2 text-xs">
              {hard.map((s) =>
            <li key={s.id}>
                  • {tr(s.nameAr, s.nameEn)} — {t(`stage.${s.status}`)}
                </li>
            )}
            </ul>
            {canOverride &&
          <div className="space-y-1.5">
                <p className="flex items-center gap-1.5 text-xs font-medium text-danger">
                  <ShieldAlertIcon className="h-3.5 w-3.5" />
                  {tr('سبب التجاوز (يُسجَّل في سجل التدقيق)', 'Override reason (audited)')}
                </p>
                <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
              </div>
          }
          </>
        }
      </ConfirmDialog>
    </>);

}
