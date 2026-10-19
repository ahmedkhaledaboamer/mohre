import { addDays, differenceInCalendarDays, endOfMonth, format, parseISO, startOfMonth, subDays, subMonths } from 'date-fns';

export const toIso = (d: Date) => format(d, 'yyyy-MM-dd');
export const todayIso = () => toIso(new Date());
export const nowIso = () => new Date().toISOString();
export const addDaysIso = (iso: string, n: number) => toIso(addDays(parseISO(iso.slice(0, 10)), n));
export const dateFromToday = (n: number) => addDaysIso(todayIso(), n);
export const daysUntil = (iso?: string): number | null => iso ? differenceInCalendarDays(parseISO(iso.slice(0, 10)), new Date()) : null;
/** Returns the earlier of two ISO dates (used to keep seeded dates from landing in the future). */
export const minIso = (a: string, b: string) => a.slice(0, 10) <= b.slice(0, 10) ? a : b;
/** Local calendar date (yyyy-MM-dd) of an ISO date or timestamp. */
export const localDay = (iso: string) => iso.length > 10 ? toIso(new Date(iso)) : iso;
/** Inclusive date-range test on yyyy-MM-dd strings. Timestamps are converted to the local day first. */
export const inRange = (iso: string | undefined, from: string, to: string) => {
  if (!iso) return false;
  const d = localDay(iso);
  return d >= from && d <= to;
};

export type PeriodKey = 'today' | 'yesterday' | '7d' | 'month' | 'last_month' | 'custom';

export interface Period {
  key: PeriodKey;
  from: string;
  to: string;
}

export function periodRange(key: PeriodKey, custom?: {from?: string;to?: string;}): {from: string;to: string;} {
  const now = new Date();
  switch (key) {
    case 'today':
      return { from: toIso(now), to: toIso(now) };
    case 'yesterday':{
        const y = toIso(subDays(now, 1));
        return { from: y, to: y };
      }
    case '7d':
      return { from: toIso(subDays(now, 6)), to: toIso(now) };
    case 'month':
      return { from: toIso(startOfMonth(now)), to: toIso(endOfMonth(now)) };
    case 'last_month':{
        const m = subMonths(now, 1);
        return { from: toIso(startOfMonth(m)), to: toIso(endOfMonth(m)) };
      }
    case 'custom':{
        const from = custom?.from || toIso(subDays(now, 29));
        const to = custom?.to || toIso(now);
        return from <= to ? { from, to } : { from: to, to: from };
      }
  }
}

/** The equally long window immediately before a range — used for "vs previous period". */
export function previousRange(r: {from: string;to: string;}) {
  const len = differenceInCalendarDays(parseISO(r.to), parseISO(r.from)) + 1;
  return { from: addDaysIso(r.from, -len), to: addDaysIso(r.from, -1) };
}

export function eachDay(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to && out.length < 400; d = addDaysIso(d, 1)) out.push(d);
  return out;
}

export const periodOptions: {value: PeriodKey;ar: string;en: string;}[] = [
{ value: 'today', ar: 'اليوم', en: 'Today' },
{ value: 'yesterday', ar: 'أمس', en: 'Yesterday' },
{ value: '7d', ar: 'آخر 7 أيام', en: 'Last 7 days' },
{ value: 'month', ar: 'هذا الشهر', en: 'This month' },
{ value: 'last_month', ar: 'الشهر الماضي', en: 'Last month' },
{ value: 'custom', ar: 'فترة مخصصة', en: 'Custom range' }];
