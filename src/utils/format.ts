import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns';
import { ar, enGB } from 'date-fns/locale';
import type { Lang } from '../types/common';

const money = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const whole = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

export const currencySymbol = (lang: Lang) => lang === 'ar' ? 'د.إ' : 'AED';

export function formatMoney(value: number, lang: Lang, opts: {compact?: boolean;noSymbol?: boolean;} = {}) {
  const n = opts.compact ? compact.format(value) : money.format(value);
  if (opts.noSymbol) return n;
  return `${currencySymbol(lang)} ${n}`;
}

export function formatNumber(value: number) {
  return whole.format(value);
}

export function formatDate(iso: string | undefined, lang: Lang, pattern = 'dd MMM yyyy') {
  if (!iso) return '—';
  const d = parseISO(iso);
  if (!isValid(d)) return '—';
  return format(d, pattern, { locale: lang === 'ar' ? ar : enGB });
}

export function formatDateTime(iso: string | undefined, lang: Lang) {
  return formatDate(iso, lang, 'dd MMM yyyy, HH:mm');
}

export function formatRelative(iso: string, lang: Lang) {
  const d = parseISO(iso);
  if (!isValid(d)) return '';
  return formatDistanceToNow(d, { addSuffix: true, locale: lang === 'ar' ? ar : enGB });
}

export function initials(name: string) {
  return name.
  split(' ').
  filter(Boolean).
  slice(0, 2).
  map((p) => p[0]).
  join('');
}