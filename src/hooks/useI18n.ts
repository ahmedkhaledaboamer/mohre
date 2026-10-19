import { useMemo } from 'react';
import { useAppSelector } from '../store/hooks';
import { translate } from '../data/translations';
import { formatDate, formatDateTime, formatMoney, formatRelative } from '../utils/format';
import { nationalities } from '../data/nationalities';

export function useI18n() {
  const lang = useAppSelector((s) => s.ui.lang);
  return useMemo(
    () => ({
      lang,
      dir: (lang === 'ar' ? 'rtl' : 'ltr') as 'rtl' | 'ltr',
      t: (key: string) => translate(key, lang),
      tr: (ar: string, en: string) => lang === 'ar' ? ar : en,
      money: (v: number, opts?: {compact?: boolean;noSymbol?: boolean;}) => formatMoney(v, lang, opts),
      date: (iso?: string, pattern?: string) => formatDate(iso, lang, pattern),
      dateTime: (iso?: string) => formatDateTime(iso, lang),
      relative: (iso: string) => formatRelative(iso, lang),
      name: (o?: {nameAr: string;nameEn: string;} | null) => o ? lang === 'ar' ? o.nameAr : o.nameEn : '—',
      nat: (code?: string) => {
        const n = nationalities.find((x) => x.code === code);
        return n ? lang === 'ar' ? n.ar : n.en : code ?? '—';
      }
    }),
    [lang]
  );
}