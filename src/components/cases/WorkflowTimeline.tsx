import { CheckIcon, CircleDashedIcon, ClockIcon, LinkIcon, PencilIcon, XIcon, AlertTriangleIcon, BanIcon, SendIcon, WalletIcon, UserRoundIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import { Money, Ltr } from '../ui/Display';
import { StatusBadge } from '../status/StatusBadge';
import { useI18n } from '../../hooks/useI18n';
import { useLookups } from '../../hooks/useLookups';
import type { Transaction, WorkflowStage, StageStatus } from '../../types/cases';
import { unmetDependencies } from '../../utils/cases';
import { daysUntil } from '../../utils/dates';
import { cn } from '../../utils/cn';

const iconFor: Record<StageStatus, {icon: typeof CheckIcon;cls: string;}> = {
  not_started: { icon: CircleDashedIcon, cls: 'bg-surface text-muted ring-line-strong' },
  in_progress: { icon: ClockIcon, cls: 'bg-info-soft text-info ring-info/30' },
  waiting_customer: { icon: UserRoundIcon, cls: 'bg-warning-soft text-warning ring-warning/30' },
  waiting_payment: { icon: WalletIcon, cls: 'bg-warning-soft text-warning ring-warning/30' },
  submitted: { icon: SendIcon, cls: 'bg-primary-soft text-primary ring-primary/30' },
  completed: { icon: CheckIcon, cls: 'bg-success text-white ring-success' },
  rejected: { icon: XIcon, cls: 'bg-danger text-white ring-danger' },
  cancelled: { icon: BanIcon, cls: 'bg-subtle text-muted ring-line' }
};

interface Props {
  tx: Transaction;
  stages: WorkflowStage[];
  /** Whether the current user may edit a given step (own steps for staff, all for managers). */
  canEdit: (s: WorkflowStage) => boolean;
  onEdit: (s: WorkflowStage) => void;
  onToggleApplicable: (s: WorkflowStage) => void;
  actuals: (s: WorkflowStage) => {actual: number;collected: number;};
}

export function WorkflowTimeline({ tx, stages, canEdit, onEdit, onToggleApplicable, actuals }: Props) {
  const { t, tr, date, name } = useI18n();
  const lk = useLookups();
  return (
    <ol className="relative">
      {stages.map((s, i) => {
        const I = iconFor[s.status];
        const blockedBy = unmetDependencies(tx, s);
        const stageOverdue = s.applicable && !['completed', 'cancelled', 'not_started'].includes(s.status) && (daysUntil(s.dueDate) ?? 1) < 0;
        const last = i === stages.length - 1;
        const editable = canEdit(s) && tx.status !== 'completed' && tx.status !== 'cancelled';
        const act = actuals(s);
        return (
          <li key={s.id} className={cn('relative flex gap-4 pb-6', last && 'pb-0', !s.applicable && 'opacity-55')}>
            {!last && <span className={cn('absolute start-[15px] top-8 h-[calc(100%-2rem)] w-px', s.status === 'completed' ? 'bg-success/50' : 'bg-line')} aria-hidden />}
            <span className={cn('relative z-[1] mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1', s.applicable ? I.cls : 'bg-subtle text-muted ring-line')}>
              <I.icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1 rounded-lg border border-line bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className={cn('text-sm font-semibold', !s.applicable && 'line-through decoration-muted')}>{tr(s.nameAr, s.nameEn)}</h4>
                    <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium', s.mandatory ? 'bg-navy/5 text-navy-3' : 'bg-subtle text-muted')}>{s.mandatory ? t('common.mandatory') : t('common.optional')}</span>
                    {s.applicable ? <StatusBadge domain="stage" value={s.status} /> : <span className="text-[11px] text-muted">{tr('غير منطبقة على هذه الحالة', 'Not applicable to this case')}</span>}
                    {stageOverdue &&
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-danger">
                        <AlertTriangleIcon className="h-3 w-3" />
                        {tr('متأخرة', 'Overdue')}
                      </span>
                    }
                  </div>
                  {s.applicable &&
                  <p className="mt-1 text-xs text-muted">
                      {s.startDate && <>{tr('بدأت', 'Started')} {date(s.startDate)} · </>}
                      {s.completedDate ?
                    <>{tr('اكتملت', 'Completed')} {date(s.completedDate)}</> :

                    <>{tr('الاستحقاق', 'Due')} {date(s.dueDate)}</>
                    }
                      {s.assigneeId && <> · {name(lk.user.get(s.assigneeId))}</>}
                      {s.referenceNo &&
                    <>
                          {' · '}
                          <Ltr>{s.referenceNo}</Ltr>
                        </>
                    }
                    </p>
                  }
                </div>
                {editable &&
                <div className="no-print flex items-center gap-1">
                    {!s.mandatory && tx.status !== 'completed' && tx.status !== 'cancelled' &&
                  <Button variant="ghost" size="sm" onClick={() => onToggleApplicable(s)}>
                        {s.applicable ? tr('استبعاد', 'Exclude') : tr('تضمين', 'Include')}
                      </Button>
                  }
                    {s.applicable &&
                  <Button variant="outline" size="sm" onClick={() => onEdit(s)}>
                        <PencilIcon />
                        {t('common.edit')}
                      </Button>
                  }
                  </div>
                }
              </div>
              {s.applicable &&
              <>
                  {s.status === 'rejected' && s.rejectionReason &&
                <p className="mt-3 rounded-md bg-danger-soft px-3 py-2 text-xs text-danger">
                      <span className="font-semibold">{tr('سبب الرفض: ', 'Rejection reason: ')}</span>
                      {s.rejectionReason}
                    </p>
                }
                  {s.nextAction && s.status !== 'completed' &&
                <p className="mt-3 text-xs text-ink-2">
                      <span className="font-medium text-muted">{tr('الإجراء التالي: ', 'Next action: ')}</span>
                      {s.nextAction}
                    </p>
                }
                  {blockedBy.length > 0 && s.status === 'not_started' &&
                <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted">
                      <LinkIcon className="h-3 w-3" />
                      {tr('تعتمد على: ', 'Depends on: ')}
                      {blockedBy.map((b) => tr(b.nameAr, b.nameEn)).join('، ')}
                    </p>
                }
                  {(s.expectedCost > 0 || act.actual > 0 || act.collected > 0) &&
                <dl className="mt-3 grid grid-cols-3 gap-x-4 gap-y-1 border-t border-line pt-3 text-xs">
                      <div>
                        <dt className="text-muted">{tr('التكلفة المتوقعة', 'Expected cost')}</dt>
                        <dd><Money value={s.expectedCost} /></dd>
                      </div>
                      <div>
                        <dt className="text-muted">{tr('التكلفة الفعلية (سندات صرف)', 'Actual cost (vouchers)')}</dt>
                        <dd><Money value={act.actual} className={act.actual > s.expectedCost ? 'text-danger' : act.actual > 0 ? 'text-ink' : 'text-muted'} /></dd>
                      </div>
                      <div>
                        <dt className="text-muted">{tr('المحصّل مقابل الخطوة', 'Collected for step')}</dt>
                        <dd><Money value={act.collected} className={act.collected > 0 ? 'text-success' : 'text-muted'} /></dd>
                      </div>
                    </dl>
                }
                  {s.notes && <p className="mt-2 text-xs text-muted">{s.notes}</p>}
                </>
              }
            </div>
          </li>);

      })}
    </ol>);

}