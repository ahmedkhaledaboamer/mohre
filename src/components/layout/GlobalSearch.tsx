import type { LucideIcon } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Building2Icon, FileTextIcon, IdCardIcon, LandmarkIcon, SearchIcon, UserIcon } from "lucide-react";
import { useLookups } from "../../hooks/useLookups";
import { invoiceHooks, transactionHooks } from "../../hooks/useApi";
import { useI18n } from "../../hooks/useI18n";
import { useEscape } from "../ui/Dialog";
import { cn } from "../../utils/cn";
interface Result {
  id: string;
  group: string;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  to: string;
}
export function GlobalSearch({
  open,
  onClose



}: {open: boolean;onClose: () => void;}) {
  const {
    t,
    tr,
    name
  } = useI18n();
  const navigate = useNavigate();
  const lk = useLookups();
  const tx = transactionHooks.useList();
  const inv = invoiceHooks.useList();
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  useEscape(open, onClose);
  useEffect(() => {
    if (open) {
      setQ('');
      setActive(0);
    }
  }, [open]);
  const results = useMemo<Result[]>(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return [];
    const has = (...v: (string | undefined)[]) => v.some((x) => x?.toLowerCase().includes(s));
    return [...lk.customers.filter((c) => has(c.nameAr, c.nameEn, c.code, c.mobile, c.email)).slice(0, 5).map((c) => ({
      id: c.id,
      group: t('nav.customers'),
      icon: UserIcon,
      title: name(c),
      subtitle: `${c.code} · ${c.mobile}`,
      to: `/customers/${c.id}`
    })), ...lk.companies.filter((c) => has(c.nameAr, c.nameEn, c.code, c.licenseNo)).slice(0, 5).map((c) => ({
      id: c.id,
      group: t('nav.companies'),
      icon: Building2Icon,
      title: name(c),
      subtitle: c.licenseNo,
      to: `/companies/${c.id}`
    })), ...lk.employees.filter((e) => has(e.nameAr, e.nameEn, e.code, e.passportNo)).slice(0, 5).map((e) => ({
      id: e.id,
      group: t('nav.employees'),
      icon: IdCardIcon,
      title: name(e),
      subtitle: `${e.code} · ${e.passportNo}`,
      to: `/employees/${e.id}`
    })), ...(tx.data ?? []).filter((x) => has(x.ref, x.titleAr, x.titleEn)).slice(0, 5).map((x) => ({
      id: x.id,
      group: t('nav.transactions'),
      icon: LandmarkIcon,
      title: tr(x.titleAr, x.titleEn),
      subtitle: x.ref,
      to: `/transactions/${x.id}`
    })), ...(inv.data ?? []).filter((x) => has(x.number, lk.customer.get(x.customerId)?.nameAr, lk.customer.get(x.customerId)?.nameEn)).slice(0, 5).map((x) => ({
      id: x.id,
      group: t('nav.invoices'),
      icon: FileTextIcon,
      title: x.number,
      subtitle: name(lk.customer.get(x.customerId)),
      to: `/invoices/${x.id}`
    }))];
  }, [q, lk, tx.data, inv.data, t, tr, name]);
  const go = (r: Result) => {
    navigate(r.to);
    onClose();
  };
  return createPortal(<AnimatePresence>
      {open && <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]">
          <motion.div className="absolute inset-0 bg-navy/45" initial={{
        opacity: 0
      }} animate={{
        opacity: 1
      }} exit={{
        opacity: 0
      }} transition={{
        duration: 0.15
      }} onClick={onClose} />
          <motion.div role="dialog" aria-modal="true" aria-label={t('common.search')} className="relative w-full max-w-xl overflow-hidden rounded-xl border border-line bg-surface shadow-pop" initial={{
        opacity: 0,
        scale: 0.97,
        y: -6
      }} animate={{
        opacity: 1,
        scale: 1,
        y: 0
      }} exit={{
        opacity: 0,
        scale: 0.98
      }} transition={{
        duration: 0.18,
        ease: [0.23, 1, 0.32, 1]
      }}>
            <div className="flex items-center gap-3 border-b border-line px-4">
              <SearchIcon className="h-4 w-4 text-muted" />
              <input autoFocus value={q} onChange={(e) => {
            setQ(e.target.value);
            setActive(0);
          }} onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, results.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === 'Enter' && results[active]) go(results[active]);
          }} placeholder={t('common.globalSearch')} className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted" />
              <kbd className="num rounded border border-line px-1.5 text-[10px] text-muted">Esc</kbd>
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-2 scroll-thin">
              {q.trim().length < 2 ? <p className="px-3 py-6 text-center text-sm text-muted">{tr('اكتب حرفين على الأقل للبحث في العملاء والشركات والموظفين والمعاملات والفواتير.', 'Type at least 2 characters to search customers, companies, employees, cases and invoices.')}</p> : results.length === 0 ? <p className="px-3 py-6 text-center text-sm text-muted">{t('common.noResults')}</p> : results.map((r, i) => <React.Fragment key={`${r.group}-${r.id}`}>
                    {(i === 0 || results[i - 1].group !== r.group) && <p className="px-3 pb-1 pt-2 text-[11px] font-medium text-muted">{r.group}</p>}
                    <button type="button" onMouseEnter={() => setActive(i)} onClick={() => go(r)} className={cn('flex w-full items-center gap-3 rounded-md px-3 py-2 text-start', i === active ? 'bg-primary-soft' : 'hover:bg-subtle')}>
                      <r.icon className="h-4 w-4 shrink-0 text-muted" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{r.title}</span>
                        <span className="num block truncate text-xs text-muted">{r.subtitle}</span>
                      </span>
                    </button>
                  </React.Fragment>)}
            </div>
          </motion.div>
        </div>}
    </AnimatePresence>, document.body);
}