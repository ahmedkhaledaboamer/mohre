import { ShieldAlertIcon } from 'lucide-react';
import { EmptyState, TableSkeleton } from '../ui/Feedback';
import { useI18n } from '../../hooks/useI18n';
import { useLookups } from '../../hooks/useLookups';
import type { ActivityEntry } from '../../types/system';
import { cn } from '../../utils/cn';

export function ActivityTimeline({ entries, isLoading }: {entries: ActivityEntry[];isLoading?: boolean;}) {
  const { tr, lang, name, dateTime } = useI18n();
  const lk = useLookups();
  if (isLoading) return <TableSkeleton rows={4} cols={2} />;
  if (!entries.length) return <EmptyState compact title={tr('لا يوجد نشاط مسجل', 'No activity recorded')} />;
  return (
    <ol className="relative space-y-5 border-s border-line ps-5">
      {entries.map((e) =>
      <li key={e.id} className="relative">
          <span className={cn('absolute -start-[25px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-surface', e.override ? 'bg-danger' : 'bg-primary')} />
          <p className="text-sm">
            {lang === 'ar' ? e.message.ar : e.message.en}
            {e.override &&
          <span className="ms-2 inline-flex items-center gap-1 rounded bg-danger-soft px-1.5 py-0.5 text-[11px] font-medium text-danger">
                <ShieldAlertIcon className="h-3 w-3" />
                {tr('تجاوز مُدقق', 'Audited override')}
              </span>
          }
          </p>
          <p className="mt-0.5 text-[11px] text-muted">
            {name(lk.user.get(e.userId))} · {dateTime(e.at)}
          </p>
        </li>
      )}
    </ol>);

}