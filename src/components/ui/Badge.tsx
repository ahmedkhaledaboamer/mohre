import React from 'react';
import { cn } from '../../utils/cn';

export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'primary' | 'navy';

const tones: Record<Tone, string> = {
  neutral: 'bg-subtle text-ink-2 ring-line',
  info: 'bg-info-soft text-info ring-info/15',
  success: 'bg-success-soft text-success ring-success/15',
  warning: 'bg-warning-soft text-warning ring-warning/20',
  danger: 'bg-danger-soft text-danger ring-danger/15',
  primary: 'bg-primary-soft text-primary-strong ring-primary/15',
  navy: 'bg-navy text-white ring-navy'
};

const dots: Record<Tone, string> = {
  neutral: 'bg-muted',
  info: 'bg-info',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  primary: 'bg-primary',
  navy: 'bg-white'
};

export function Badge({ tone = 'neutral', dot, className, children }: {tone?: Tone;dot?: boolean;className?: string;children: React.ReactNode;}) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset', tones[tone], className)}>
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', dots[tone])} aria-hidden />}
      {children}
    </span>);

}