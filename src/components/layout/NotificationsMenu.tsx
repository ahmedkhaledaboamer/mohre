import { useNavigate } from 'react-router-dom';
import { BellIcon } from 'lucide-react';
import { Dropdown } from '../ui/Dropdown';
import { Button } from '../ui/Button';
import { DaysLeft } from '../ui/Display';
import { useReminders } from '../../hooks/useReminders';
import { useI18n } from '../../hooks/useI18n';
import { cn } from '../../utils/cn';

export function NotificationsMenu() {
  const { reminders } = useReminders();
  const { t, tr, lang } = useI18n();
  const navigate = useNavigate();
  const urgent = reminders.filter((r) => r.severity !== 'info');

  return (
    <Dropdown
      width="w-80 sm:w-96"
      trigger={({ toggle }) =>
      <Button variant="ghost" size="icon" onClick={toggle} aria-label={t('common.notifications')} className="relative">
          <BellIcon />
          {urgent.length > 0 &&
        <span className="num absolute end-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">{urgent.length > 99 ? '99+' : urgent.length}</span>
        }
        </Button>
      }
      content={(close) =>
      <div>
          <div className="flex items-center justify-between px-3 py-2">
            <p className="text-sm font-semibold">{t('common.notifications')}</p>
            <span className="text-xs text-muted">{tr(`${urgent.length} تحتاج إجراء`, `${urgent.length} need action`)}</span>
          </div>
          <ul className="max-h-96 divide-y divide-line overflow-y-auto border-y border-line scroll-thin">
            {reminders.slice(0, 8).map((r) =>
          <li key={r.id}>
                <button
              type="button"
              onClick={() => {
                close();
                navigate(r.link);
              }}
              className="flex w-full items-start gap-3 px-3 py-2.5 text-start hover:bg-subtle">
              
                  <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', r.severity === 'critical' ? 'bg-danger' : r.severity === 'warning' ? 'bg-warning' : 'bg-info')} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] text-muted">{t(`rem.${r.kind}`)}</span>
                    <span className="block truncate text-sm font-medium">{lang === 'ar' ? r.title.ar : r.title.en}</span>
                  </span>
                  <DaysLeft days={r.daysLeft} />
                </button>
              </li>
          )}
            {reminders.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted">{tr('لا توجد تنبيهات', 'No notifications')}</li>}
          </ul>
          <button
          type="button"
          className="w-full px-3 py-2 text-center text-xs font-medium text-primary hover:bg-subtle"
          onClick={() => {
            close();
            navigate('/tasks?tab=reminders');
          }}>
          
            {t('common.viewAll')}
          </button>
        </div>
      } />);


}