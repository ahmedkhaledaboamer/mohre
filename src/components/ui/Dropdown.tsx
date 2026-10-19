import type { LucideIcon } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "../../utils/cn";
export interface DropdownItem {
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
  hidden?: boolean;
}
interface DropdownProps {
  trigger: (props: {
    open: boolean;
    toggle: () => void;
  }) => React.ReactNode;
  items?: DropdownItem[];
  content?: (close: () => void) => React.ReactNode;
  align?: 'start' | 'end';
  width?: string;
  className?: string;
}
export function Dropdown({
  trigger,
  items,
  content,
  align = 'end',
  width = 'w-56',
  className
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  const close = () => setOpen(false);
  return <div ref={ref} className={cn('relative', className)} onClick={(e) => e.stopPropagation()}>
      {trigger({
      open,
      toggle: () => setOpen((o) => !o)
    })}
      <AnimatePresence>
        {open && <motion.div role="menu" initial={{
        opacity: 0,
        y: -4,
        scale: 0.98
      }} animate={{
        opacity: 1,
        y: 0,
        scale: 1
      }} exit={{
        opacity: 0,
        y: -4,
        scale: 0.98
      }} transition={{
        duration: 0.15,
        ease: [0.23, 1, 0.32, 1]
      }} className={cn('absolute top-full z-40 mt-1.5 rounded-lg border border-line bg-surface p-1 shadow-pop', width, align === 'end' ? 'end-0' : 'start-0')}>
            {content ? content(close) : items?.filter((i) => !i.hidden).map((item) => <button key={item.label} type="button" role="menuitem" disabled={item.disabled} onClick={() => {
          close();
          item.onSelect();
        }} className={cn('flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-start text-sm transition-colors disabled:opacity-40', item.danger ? 'text-danger hover:bg-danger-soft' : 'text-ink-2 hover:bg-subtle hover:text-ink')}>
                      {item.icon && <item.icon className="h-4 w-4 shrink-0" />}
                      <span className="truncate">{item.label}</span>
                    </button>)}
          </motion.div>}
      </AnimatePresence>
    </div>;
}