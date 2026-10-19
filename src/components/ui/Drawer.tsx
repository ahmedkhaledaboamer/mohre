import React from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { XIcon } from 'lucide-react';
import { useEscape } from './Dialog';
import { useI18n } from '../../hooks/useI18n';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/** Side sheet that opens from the inline-end edge (left in RTL). */
export function Drawer({ open, onClose, title, subtitle, children, footer }: DrawerProps) {
  const { dir } = useI18n();
  useEscape(open, onClose);
  const offset = dir === 'rtl' ? -40 : 40;
  return createPortal(
    <AnimatePresence>
      {open &&
      <div className="fixed inset-0 z-50">
          <motion.div className="absolute inset-0 bg-navy/35" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} onClick={onClose} />
          <motion.aside
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="absolute inset-y-0 end-0 flex w-full max-w-md flex-col border-s border-line bg-surface shadow-pop"
          initial={{ opacity: 0, x: offset }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: offset }}
          transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}>
          
            <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold">{title}</h2>
                {subtitle && <div className="mt-0.5 text-sm text-muted">{subtitle}</div>}
              </div>
              <button type="button" onClick={onClose} className="rounded-md p-1 text-muted hover:bg-subtle hover:text-ink" aria-label="close">
                <XIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 scroll-thin">{children}</div>
            {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
          </motion.aside>
        </div>
      }
    </AnimatePresence>,
    document.body
  );
}