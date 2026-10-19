import React from 'react';
import { FlaskConicalIcon } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useI18n } from '../../hooks/useI18n';
import { initials } from '../../utils/format';

/** Monetary amount rendered as an isolated LTR run so it stays readable inside RTL text. */
export function Money({ value, className, compact }: {value: number;className?: string;compact?: boolean;}) {
  const { money } = useI18n();
  return <span className={cn('num whitespace-nowrap', value < 0 && 'text-danger', className)}>{money(value, { compact })}</span>;
}

/** Latin identifiers (passport numbers, emails, references) isolated as LTR. */
export function Ltr({ children, className }: {children: React.ReactNode;className?: string;}) {
  return <span className={cn('num', className)}>{children}</span>;
}

export function ProgressBar({ value, className, tone = 'primary' }: {value: number;className?: string;tone?: 'primary' | 'success' | 'warning';}) {
  const color = { primary: 'bg-primary', success: 'bg-success', warning: 'bg-warning' }[tone];
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-subtle', className)} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn('h-full rounded-full transition-[width] duration-300 ease-out', color)} style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }} />
    </div>);

}

export function Avatar({ name, className }: {name: string;className?: string;}) {
  return (
    <span className={cn('inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary-strong', className)} aria-hidden>
      {initials(name)}
    </span>);

}

export function DemoPriceTag({ className }: {className?: string;}) {
  const { t } = useI18n();
  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded border border-warning/30 bg-warning-soft px-1.5 py-0.5 text-[10px] font-medium text-warning', className)}>
      <FlaskConicalIcon className="h-3 w-3" />
      {t('common.demoPrice')}
    </span>);

}

export function DaysLeft({ days }: {days: number | null;}) {
  const { tr } = useI18n();
  if (days === null) return <span className="text-muted">—</span>;
  const tone = days < 0 ? 'text-danger' : days <= 30 ? 'text-warning' : 'text-muted';
  const label = days < 0 ? tr(`منتهٍ منذ ${-days} يوم`, `Expired ${-days}d ago`) : days === 0 ? tr('اليوم', 'Today') : tr(`بعد ${days} يوم`, `in ${days}d`);
  return <span className={cn('text-xs font-medium', tone)}>{label}</span>;
}