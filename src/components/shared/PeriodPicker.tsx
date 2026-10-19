import { CalendarRangeIcon } from 'lucide-react';
import { Input, Select } from '../ui/Input';
import { useI18n } from '../../hooks/useI18n';
import { usePeriod } from '../../hooks/useLedger';
import { useAppDispatch } from '../../store/hooks';
import { periodSet } from '../../store/slices/uiSlice';
import { periodOptions, type PeriodKey } from '../../utils/dates';

/** Period selector shared by the dashboard and all reports (state lives in Redux). */
export function PeriodPicker() {
  const { lang, tr, date } = useI18n();
  const dispatch = useAppDispatch();
  const period = usePeriod();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={period.key}
        onChange={(e) => dispatch(periodSet({ key: e.target.value as PeriodKey, from: period.from, to: period.to }))}
        className="w-40"
        aria-label={tr('الفترة', 'Period')}>

        {periodOptions.map((o) =>
        <option key={o.value} value={o.value}>
            {lang === 'ar' ? o.ar : o.en}
          </option>
        )}
      </Select>
      {period.key === 'custom' ?
      <>
          <Input type="date" className="w-40" value={period.from} max={period.to} onChange={(e) => e.target.value && dispatch(periodSet({ key: 'custom', from: e.target.value, to: period.to }))} aria-label={tr('من', 'From')} />
          <span className="text-xs text-muted">{tr('إلى', 'to')}</span>
          <Input type="date" className="w-40" value={period.to} min={period.from} onChange={(e) => e.target.value && dispatch(periodSet({ key: 'custom', from: period.from, to: e.target.value }))} aria-label={tr('إلى', 'To')} />
        </> :

      <span className="flex items-center gap-1.5 text-xs text-muted">
          <CalendarRangeIcon className="h-3.5 w-3.5" />
          {period.from === period.to ? date(period.from) : `${date(period.from)} — ${date(period.to)}`}
        </span>
      }
    </div>);

}
