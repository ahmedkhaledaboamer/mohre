import type { LucideIcon } from "lucide-react";
import React from "react";
import { AlertCircleIcon, InboxIcon, RotateCwIcon } from "lucide-react";
import { cn } from "../../utils/cn";
import { Button } from "./Button";
import { useI18n } from "../../hooks/useI18n";
export function Skeleton({
  className


}: {className?: string;}) {
  return <div className={cn('animate-pulse rounded-md bg-subtle', className)} aria-hidden />;
}
export function TableSkeleton({
  rows = 6,
  cols = 5



}: {rows?: number;cols?: number;}) {
  return <div className="divide-y divide-line" aria-busy="true">
      {Array.from({
      length: rows
    }).map((_, r) => <div key={r} className="flex items-center gap-4 px-4 py-3.5">
          {Array.from({
        length: cols
      }).map((__, c) => <Skeleton key={c} className={cn('h-3.5', c === 0 ? 'w-28' : c === 1 ? 'flex-1' : 'w-20')} />)}
        </div>)}
    </div>;
}
export function PageSkeleton() {
  return <div className="space-y-5" aria-busy="true">
      <Skeleton className="h-7 w-64" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <Skeleton className="h-72" />
    </div>;
}
interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  compact?: boolean;
}
export function EmptyState({
  icon: Icon = InboxIcon,
  title,
  description,
  action,
  compact
}: EmptyStateProps) {
  return <div className={cn('flex flex-col items-center justify-center text-center', compact ? 'px-4 py-8' : 'px-6 py-14')}>
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-subtle text-muted">
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-3 text-sm font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>;
}
export function ErrorState({
  onRetry,
  message



}: {onRetry?: () => void;message?: string;}) {
  const {
    t
  } = useI18n();
  return <div className="flex flex-col items-center justify-center px-6 py-12 text-center" role="alert">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-danger-soft text-danger">
        <AlertCircleIcon className="h-5 w-5" />
      </span>
      <p className="mt-3 text-sm font-semibold">{t('common.error')}</p>
      <p className="mt-1 max-w-sm text-sm text-muted">{message ?? t('common.errorHint')}</p>
      {onRetry && <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          <RotateCwIcon />
          {t('common.retry')}
        </Button>}
    </div>;
}