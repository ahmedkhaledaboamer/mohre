import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { XIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizes = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' };
const ease = [0.23, 1, 0.32, 1] as const;

export function useEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
}

export function Dialog({ open, onClose, title, description, children, footer, size = 'md' }: DialogProps) {
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  useEscape(open, onClose);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => {
        const el = panel.current?.querySelector<HTMLElement>('input:not([type=hidden]), select, textarea, button[data-autofocus]');
        el?.focus();
      }, 60);
      return () => clearTimeout(t);
    }
  }, [open]);

  return createPortal(
    <AnimatePresence>
      {open &&
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center">
          <motion.div
          className="fixed inset-0 bg-navy/45"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          aria-hidden />
        
          <motion.div
          ref={panel}
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${id}-title`}
          className={cn('relative my-8 w-full rounded-xl border border-line bg-surface shadow-pop', sizes[size])}
          initial={{ opacity: 0, scale: 0.97, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 4 }}
          transition={{ duration: 0.2, ease }}>
          
            <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
              <div>
                <h2 id={`${id}-title`} className="text-base font-semibold text-ink">
                  {title}
                </h2>
                {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
              </div>
              <button type="button" onClick={onClose} className="rounded-md p-1 text-muted transition-colors hover:bg-subtle hover:text-ink" aria-label="close">
                <XIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto px-5 py-4 scroll-thin">{children}</div>
            {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-subtle/40 px-5 py-3">{footer}</div>}
          </motion.div>
        </div>
      }
    </AnimatePresence>,
    document.body
  );
}