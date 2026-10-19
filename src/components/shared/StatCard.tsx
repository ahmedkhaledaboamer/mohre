import type React from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowUpRightIcon } from 'lucide-react';
import { Money } from '../ui/Display';
import { cn } from '../../utils/cn';

interface StatCardProps {
  label: string;
  /** Money amount, plain count, or null when the figure cannot be determined. */
  value: number | null;
  kind?: 'money' | 'count';
  hint?: React.ReactNode;
  icon?: LucideIcon;
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'primary';
  onClick?: () => void;
  unknownLabel?: string;
}

const toneCls = {
  default: 'text-ink',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  primary: 'text-primary-strong'
};

/** A metric tile. Clicking opens the records that make up the number. */
export function StatCard({ label, value, kind = 'money', hint, icon: Icon, tone = 'default', onClick, unknownLabel }: StatCardProps) {
  const body =
  <>
      <span className="flex items-start justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs text-muted">
          {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
          {label}
        </span>
        {onClick && <ArrowUpRightIcon className="h-3.5 w-3.5 shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100" />}
      </span>
      {value === null ?
    <span className="mt-1.5 block text-sm font-medium text-muted">{unknownLabel ?? '—'}</span> :
    kind === 'money' ?
    <Money value={value} className={cn('mt-1 block text-xl font-semibold tracking-tight', toneCls[tone])} /> :

    <span className={cn('num mt-1 block text-2xl font-semibold', toneCls[tone])}>{value}</span>
    }
      {hint && <span className="mt-1 block text-[11px] leading-snug text-muted">{hint}</span>}
    </>;

  const cls = 'group block w-full rounded-xl border border-line bg-surface p-4 text-start shadow-card transition-colors';
  return onClick ?
  <button type="button" onClick={onClick} className={cn(cls, 'hover:border-line-strong hover:bg-subtle/40 focus-visible:ring-2 focus-visible:ring-primary/30')}>
      {body}
    </button> :

  <div className={cls}>{body}</div>;

}
