import React from 'react';
import { cn } from '../../utils/cn';

interface PanelProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  flush?: boolean;
  children: React.ReactNode;
}

export function Panel({ title, description, actions, className, bodyClassName, flush, children }: PanelProps) {
  return (
    <section className={cn('rounded-xl border border-line bg-surface shadow-card', className)}>
      {(title || actions) &&
      <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-4">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-semibold text-ink">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      }
      <div className={cn(flush ? '' : 'px-5 pb-5', !title && !actions && !flush && 'pt-5', bodyClassName)}>{children}</div>
    </section>);

}

export function InfoGrid({ items, cols = 2 }: {items: {label: string;value: React.ReactNode;}[];cols?: 2 | 3 | 4;}) {
  const grid = { 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-2 lg:grid-cols-3', 4: 'sm:grid-cols-2 lg:grid-cols-4' }[cols];
  return (
    <dl className={cn('grid gap-x-6 gap-y-4', grid)}>
      {items.map((it) =>
      <div key={it.label} className="min-w-0">
          <dt className="text-xs text-muted">{it.label}</dt>
          <dd className="mt-1 break-words text-sm font-medium text-ink">{it.value ?? '—'}</dd>
        </div>
      )}
    </dl>);

}