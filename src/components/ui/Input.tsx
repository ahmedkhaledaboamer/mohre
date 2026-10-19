import React, { forwardRef } from 'react';
import { ChevronDownIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

const base =
'w-full rounded-md border border-line bg-surface text-sm text-ink placeholder:text-muted transition-colors duration-150 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-subtle disabled:text-muted aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/20';

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(base, 'h-9 px-3', className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
{ className, rows = 3, ...props },
ref)
{
  return <textarea ref={ref} rows={rows} className={cn(base, 'px-3 py-2 leading-relaxed', className)} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select(
{ className, children, ...props },
ref)
{
  return (
    <div className={cn('relative', className)}>
      <select ref={ref} className={cn(base, 'h-9 appearance-none pe-8 ps-3')} {...props}>
        {children}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute end-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
    </div>);

});

export const Checkbox = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & {label?: React.ReactNode;}>(function Checkbox(
{ className, label, ...props },
ref)
{
  return (
    <label className={cn('inline-flex cursor-pointer items-center gap-2 text-sm text-ink-2', className)}>
      <input ref={ref} type="checkbox" className="h-4 w-4 rounded border-line-strong text-primary accent-[rgb(var(--primary))] focus:ring-primary/30" {...props} />
      {label}
    </label>);

});