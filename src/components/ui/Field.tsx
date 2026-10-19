import React from 'react';
import { cn } from '../../utils/cn';

interface FieldProps {
  label: React.ReactNode;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function Field({ label, htmlFor, error, hint, required, className, children }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={htmlFor} className="text-xs font-medium text-ink-2">
        {label}
        {required && <span className="ms-0.5 text-danger">*</span>}
      </label>
      {children}
      {error ?
      <p className="text-xs text-danger" role="alert">
          {error}
        </p> :
      hint ?
      <p className="text-xs text-muted">{hint}</p> :
      null}
    </div>);

}