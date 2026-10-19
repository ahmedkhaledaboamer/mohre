import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { useI18n } from '../../hooks/useI18n';

export interface Crumb {
  label: string;
  to?: string;
}

interface PageHeaderProps {
  title: string;
  description?: React.ReactNode;
  crumbs?: Crumb[];
  actions?: React.ReactNode;
  meta?: React.ReactNode;
}

export function PageHeader({ title, description, crumbs, actions, meta }: PageHeaderProps) {
  const { dir, t } = useI18n();
  const Sep = dir === 'rtl' ? ChevronLeftIcon : ChevronRightIcon;
  const trail: Crumb[] = [{ label: t('nav.dashboard'), to: '/' }, ...(crumbs ?? [])];
  return (
    <header className="mb-6">
      <nav aria-label="breadcrumb" className="mb-2">
        <ol className="flex flex-wrap items-center gap-1 text-xs text-muted">
          {trail.map((c, i) =>
          <li key={`${c.label}-${i}`} className="flex items-center gap-1">
              {i > 0 && <Sep className="h-3 w-3" aria-hidden />}
              {c.to && i < trail.length - 1 ?
            <Link to={c.to} className="transition-colors hover:text-ink">
                  {c.label}
                </Link> :

            <span className={i === trail.length - 1 ? 'text-ink-2' : undefined}>{c.label}</span>
            }
            </li>
          )}
        </ol>
      </nav>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">{title}</h1>
          {description && <p className="mt-1 max-w-3xl text-sm text-muted">{description}</p>}
          {meta && <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>);

}