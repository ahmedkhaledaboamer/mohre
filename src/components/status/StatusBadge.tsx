import { Badge, type Tone } from '../ui/Badge';
import { useI18n } from '../../hooks/useI18n';

export type StatusDomain = 'stage' | 'case' | 'inv' | 'cust' | 'comp' | 'emp' | 'ver' | 'task' | 'prio' | 'rkind' | 'pcat';

const toneMap: Record<StatusDomain, Record<string, Tone>> = {
  stage: { not_started: 'neutral', in_progress: 'info', waiting_customer: 'warning', waiting_payment: 'warning', submitted: 'primary', completed: 'success', rejected: 'danger', cancelled: 'neutral' },
  case: { new: 'neutral', in_progress: 'info', waiting_documents: 'warning', waiting_payment: 'warning', submitted: 'primary', completed: 'success', rejected: 'danger', cancelled: 'neutral' },
  inv: { draft: 'neutral', issued: 'info', partially_paid: 'warning', paid: 'success', overdue: 'danger', cancelled: 'neutral' },
  cust: { active: 'success', prospect: 'info', inactive: 'neutral', archived: 'neutral' },
  comp: { active: 'success', expired: 'danger', archived: 'neutral' },
  emp: { active: 'success', in_process: 'info', cancelled: 'neutral' },
  ver: { pending: 'warning', verified: 'success', rejected: 'danger' },
  task: { open: 'info', done: 'success' },
  prio: { low: 'neutral', normal: 'neutral', high: 'danger', urgent: 'danger' },
  rkind: { receipt: 'success', refund: 'danger' },
  pcat: { government_fee: 'navy', provider_cost: 'info', other_direct_cost: 'warning' }
};

export function StatusBadge({ domain, value, className }: {domain: StatusDomain;value: string;className?: string;}) {
  const { t } = useI18n();
  return (
    <Badge tone={toneMap[domain][value] ?? 'neutral'} dot className={className}>
      {t(`${domain}.${value}`)}
    </Badge>);

}