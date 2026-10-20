import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  Building2Icon,
  CornerDownLeftIcon,
  FileTextIcon,
  HandCoinsIcon,
  HistoryIcon,
  IdCardIcon,
  LandmarkIcon,
  PlusCircleIcon,
  SearchIcon,
  TagsIcon,
  UserIcon,
  WalletIcon,
  XIcon,
  CompassIcon } from
'lucide-react';
import { useLookups } from '../../hooks/useLookups';
import { invoiceHooks, paymentHooks, receiptHooks, transactionHooks } from '../../hooks/useApi';
import { useI18n } from '../../hooks/useI18n';
import { usePermissions } from '../../hooks/usePermissions';
import { useEscape } from '../ui/Dialog';
import { StatusBadge } from '../status/StatusBadge';
import { navigation } from '../../data/navigation';
import { cn } from '../../utils/cn';

interface Result {
  id: string;
  group: string;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  to: string;
  badge?: ReactNode;
  score: number;
}

const RECENT_KEY = 'tatweer-recent-searches';
const MAX_PER_GROUP = 5;

/** Arabic/Latin-insensitive form: unify alef/ya/ta-marbuta, drop diacritics & tatweel, Arabic-Indic digits → Latin. */
export function normalize(s: string) {
  return s.
  toLowerCase().
  replace(/[ً-ْـ]/g, '').
  replace(/[أإآٱ]/g, 'ا').
  replace(/ى/g, 'ي').
  replace(/ة/g, 'ه').
  replace(/ؤ/g, 'و').
  replace(/ئ/g, 'ي').
  replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).
  replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).
  trim();
}
const compact = (s: string) => normalize(s).replace(/[\s\-_/.+]/g, '');

/** 3 = starts with, 2 = word starts with, 1 = contains, 0 = no match. Ignores spaces/dashes for codes & phones. */
function matchScore(q: string, values: (string | undefined)[]) {
  const nq = normalize(q);
  const cq = compact(q);
  let best = 0;
  for (const v of values) {
    if (!v) continue;
    const nv = normalize(v);
    if (nv.startsWith(nq)) return 3;
    if (nv.split(/\s+/).some((w) => w.startsWith(nq))) best = Math.max(best, 2);else
    if (nv.includes(nq)) best = Math.max(best, 1);else
    if (cq.length >= 3 && compact(v).includes(cq)) best = Math.max(best, 1);
  }
  return best;
}

function Highlight({ text, query }: {text: string;query: string;}) {
  const q = query.trim();
  if (q.length < 2) return <>{text}</>;
  // Case-insensitive literal highlight; normalized matches still show, just without a mark.
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded-sm bg-warning-soft px-0.5 text-ink">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>);

}

function loadRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
}
function saveRecent(list: string[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 6)));
  } catch {

    // storage unavailable — recent searches are a convenience only
  }}

export function GlobalSearch({ open, onClose }: {open: boolean;onClose: () => void;}) {
  const { t, tr, name, money, date } = useI18n();
  const { can } = usePermissions();
  const navigate = useNavigate();
  const lk = useLookups();
  const tx = transactionHooks.useList();
  const inv = invoiceHooks.useList();
  const rcp = receiptHooks.useList();
  const pay = paymentHooks.useList();
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  useEscape(open, onClose);

  useEffect(() => {
    if (open) {
      setQ('');
      setActive(0);
      setRecent(loadRecent());
    }
  }, [open]);

  const quickActions = useMemo<Result[]>(
    () =>
    [
    { id: 'new-tx', title: t('nav.newTransaction'), to: '/transactions/new', icon: PlusCircleIcon, ok: can('cases.edit') },
    { id: 'new-rcp', title: t('quick.receipt'), to: '/receipts?new=1', icon: WalletIcon, ok: can('collections.record') && can('finance.view') },
    { id: 'new-cus', title: t('quick.customer'), to: '/customers?new=1', icon: UserIcon, ok: can('crm.edit') },
    { id: 'new-inv', title: t('quick.invoice'), to: '/invoices/new', icon: FileTextIcon, ok: can('finance.edit') }].

    filter((a) => a.ok).
    map((a) => ({ ...a, group: tr('إجراءات سريعة', 'Quick actions'), subtitle: '', score: 0 })),
    [t, tr, can]
  );

  const results = useMemo<Result[]>(() => {
    const s = q.trim();
    if (s.length < 2) return [];
    const out: Result[] = [];
    const push = <T,>(group: string, items: T[], values: (x: T) => (string | undefined)[], make: (x: T) => Omit<Result, 'group' | 'score'>) => {
      out.push(
        ...items.
        map((x) => ({ x, score: matchScore(s, values(x)) })).
        filter((r) => r.score > 0).
        sort((a, b) => b.score - a.score).
        slice(0, MAX_PER_GROUP).
        map(({ x, score }) => ({ ...make(x), group, score }))
      );
    };

    if (can('cases.view'))
    push(
      t('nav.transactions'),
      tx.data ?? [],
      (x) => [x.ref, x.externalRef, x.titleAr, x.titleEn, x.beneficiaryName, name(lk.customer.get(x.customerId)), lk.employee.get(x.employeeId ?? '')?.passportNo],
      (x) => ({
        id: x.id,
        icon: LandmarkIcon,
        title: tr(x.titleAr, x.titleEn),
        subtitle: `${x.ref} · ${name(lk.customer.get(x.customerId))} · ${date(x.transactionDate)}`,
        to: `/transactions/${x.id}`,
        badge: <StatusBadge domain="case" value={x.status} />
      })
    );
    if (can('crm.view')) {
      push(t('nav.customers'), lk.customers, (c) => [c.nameAr, c.nameEn, c.code, c.mobile, c.email, c.emiratesIdNo, c.contactPerson], (c) => ({ id: c.id, icon: UserIcon, title: name(c), subtitle: `${c.code} · ${c.mobile}`, to: `/customers/${c.id}` }));
      push(t('nav.companies'), lk.companies, (c) => [c.nameAr, c.nameEn, c.code, c.licenseNo, c.mobile], (c) => ({ id: c.id, icon: Building2Icon, title: name(c), subtitle: `${c.licenseNo} · ${name(lk.customer.get(c.customerId))}`, to: `/companies/${c.id}` }));
      push(t('nav.employees'), lk.employees, (e) => [e.nameAr, e.nameEn, e.code, e.passportNo, e.emiratesIdNo, e.mobile], (e) => ({ id: e.id, icon: IdCardIcon, title: name(e), subtitle: `${e.passportNo} · ${name(lk.company.get(e.companyId))}`, to: `/employees/${e.id}` }));
    }
    if (can('finance.view')) {
      push(t('nav.invoices'), inv.data ?? [], (x) => [x.number, name(lk.customer.get(x.customerId))], (x) => ({ id: x.id, icon: FileTextIcon, title: x.number, subtitle: `${name(lk.customer.get(x.customerId))} · ${date(x.date)}`, to: `/invoices/${x.id}` }));
      push(t('nav.receipts'), rcp.data ?? [], (x) => [x.number, x.reference, name(lk.customer.get(x.customerId))], (x) => ({ id: x.id, icon: WalletIcon, title: `${x.number} — ${money(x.amount)}`, subtitle: `${name(lk.customer.get(x.customerId))} · ${date(x.date)}`, to: `/print/receipt/${x.id}` }));
      push(t('nav.payments'), pay.data ?? [], (x) => [x.number, x.reference, x.payeeName], (x) => ({ id: x.id, icon: HandCoinsIcon, title: `${x.number} — ${money(x.amount)}`, subtitle: `${x.payeeName} · ${date(x.date)}`, to: `/print/payment/${x.id}` }));
    }
    if (can('pricing.view'))
    push(
      tr('الخدمات', 'Services'),
      lk.catalog.filter((x) => x.active),
      (x) => [x.nameAr, x.nameEn, x.code],
      (x) => ({ id: x.id, icon: TagsIcon, title: tr(x.nameAr, x.nameEn || x.nameAr), subtitle: `${x.code} · ${tr('سجّل معاملة بهذه الخدمة', 'Register a transaction')}`, to: can('cases.edit') ? `/transactions/new?service=${x.id}` : '/pricing' })
    );
    push(
      tr('الصفحات', 'Pages'),
      navigation.flatMap((g) => g.items).filter((i) => can(i.permission)),
      (i) => [t(`nav.${i.key}`), i.key],
      (i) => ({ id: i.key, icon: i.icon ?? CompassIcon, title: t(`nav.${i.key}`), subtitle: i.to, to: i.to })
    );
    return out;
  }, [q, lk, tx.data, inv.data, rcp.data, pay.data, t, tr, name, money, date, can]);

  const items = q.trim().length < 2 ? quickActions : results;

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const go = (r: Result) => {
    if (q.trim().length >= 2) {
      const next = [q.trim(), ...recent.filter((x) => x !== q.trim())];
      saveRecent(next);
    }
    navigate(r.to);
    onClose();
  };

  return createPortal(
    <AnimatePresence>
      {open &&
      <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[10vh]">
          <motion.div className="absolute inset-0 bg-navy/50 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} onClick={onClose} />
          <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={t('common.search')}
          className="relative flex max-h-[75vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-pop"
          initial={{ opacity: 0, scale: 0.97, y: -6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}>

            <div className="flex items-center gap-3 border-b border-line px-5">
              <SearchIcon className="h-5 w-5 shrink-0 text-primary" />
              <input
              autoFocus
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setActive(0);
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setActive((a) => Math.min(a + 1, items.length - 1));
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setActive((a) => Math.max(a - 1, 0));
                } else if (e.key === 'Enter' && items[active]) go(items[active]);
              }}
              placeholder={tr('ابحث بالاسم، رقم المعاملة، الجواز، الجوال، رقم الفاتورة أو السند…', 'Search name, reference, passport, mobile, invoice or voucher no…')}
              className="h-14 flex-1 border-0 bg-transparent text-[15px] text-ink outline-none ring-0 placeholder:text-muted focus:outline-none focus:ring-0 focus-visible:outline-none"
              aria-label={t('common.search')}
              role="combobox"
              aria-expanded={items.length > 0}
              aria-controls="global-search-list" />

              {q &&
            <button type="button" onClick={() => setQ('')} className="rounded-md p-1 text-muted hover:bg-subtle hover:text-ink" aria-label={t('common.clear')}>
                  <XIcon className="h-4 w-4" />
                </button>
            }
              <kbd className="num rounded border border-line bg-subtle px-1.5 py-0.5 text-[10px] text-muted">Esc</kbd>
            </div>

            <div ref={listRef} id="global-search-list" role="listbox" className="min-h-0 flex-1 overflow-y-auto p-2 scroll-thin">
              {q.trim().length < 2 && recent.length > 0 &&
            <div className="mb-1 px-2 pb-2 pt-1">
                  <p className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-muted">
                    <span className="flex items-center gap-1.5">
                      <HistoryIcon className="h-3.5 w-3.5" />
                      {tr('عمليات بحث سابقة', 'Recent searches')}
                    </span>
                    <button type="button" className="hover:text-ink" onClick={() => {saveRecent([]);setRecent([]);}}>
                      {t('common.clear')}
                    </button>
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {recent.map((r) =>
                <button key={r} type="button" onClick={() => setQ(r)} className="rounded-full border border-line bg-surface px-2.5 py-1 text-xs text-ink-2 hover:border-primary/40 hover:bg-primary-soft/40">
                        {r}
                      </button>
                )}
                  </div>
                </div>
            }

              {q.trim().length >= 2 && items.length === 0 ?
            <div className="px-4 py-10 text-center">
                  <p className="text-sm font-medium">{tr(`لا توجد نتائج لـ «${q.trim()}»`, `No results for “${q.trim()}”`)}</p>
                  <p className="mt-1 text-xs text-muted">{tr('جرّب جزءاً من الاسم، أو رقم المرجع بدون مسافات، أو رقم الجوال.', 'Try part of a name, a reference without spaces, or a mobile number.')}</p>
                </div> :

            items.map((r, i) =>
            <Fragment key={`${r.group}-${r.id}`}>
                    {(i === 0 || items[i - 1].group !== r.group) &&
              <p className="flex items-center justify-between px-3 pb-1 pt-3 text-[11px] font-semibold text-muted first:pt-1">
                        {r.group}
                        {q.trim().length >= 2 && <span className="num font-normal">{items.filter((x) => x.group === r.group).length}</span>}
                      </p>
              }
                    <button
                type="button"
                role="option"
                aria-selected={i === active}
                data-idx={i}
                onMouseMove={() => setActive(i)}
                onClick={() => go(r)}
                className={cn('flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-start transition-colors', i === active ? 'bg-primary-soft' : 'hover:bg-subtle')}>

                      <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', i === active ? 'bg-surface text-primary' : 'bg-subtle text-muted')}>
                        <r.icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          <Highlight text={r.title} query={q} />
                        </span>
                        {r.subtitle &&
                  <span className="block truncate text-xs text-muted">
                            <Highlight text={r.subtitle} query={q} />
                          </span>
                  }
                      </span>
                      {r.badge}
                      {i === active && <CornerDownLeftIcon className="h-3.5 w-3.5 shrink-0 text-primary" />}
                    </button>
                  </Fragment>
            )
            }
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-line bg-subtle/50 px-4 py-2 text-[11px] text-muted">
              <span className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-line bg-surface p-0.5"><ArrowUpIcon className="h-3 w-3" /></kbd>
                  <kbd className="rounded border border-line bg-surface p-0.5"><ArrowDownIcon className="h-3 w-3" /></kbd>
                  {tr('للتنقل', 'navigate')}
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-line bg-surface p-0.5"><CornerDownLeftIcon className="h-3 w-3" /></kbd>
                  {tr('للفتح', 'open')}
                </span>
              </span>
              <span>{q.trim().length >= 2 ? tr(`${results.length} نتيجة`, `${results.length} results`) : tr('اكتب حرفين على الأقل', 'Type at least 2 characters')}</span>
            </div>
          </motion.div>
        </div>
      }
    </AnimatePresence>,
    document.body
  );
}
