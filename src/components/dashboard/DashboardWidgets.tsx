import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertOctagonIcon, CheckIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { Panel } from '../ui/Panel';
import { EmptyState } from '../ui/Feedback';
import { Money, DaysLeft, ProgressBar } from '../ui/Display';
import { Tabs } from '../ui/Tabs';
import { StatusBadge } from '../status/StatusBadge';
import { useI18n } from '../../hooks/useI18n';
import { usePermissions } from '../../hooks/usePermissions';
import { taskHooks, useToggleTask } from '../../hooks/useApi';
import { useLookups } from '../../hooks/useLookups';
import type { Transaction } from '../../types/cases';
import type { Customer } from '../../types/crm';
import type { Receipt } from '../../types/finance';
import type { Reminder } from '../../types/system';
import type { InvoiceView } from '../../utils/finance';
import { caseProgress, currentStage } from '../../utils/cases';
import { cn } from '../../utils/cn';

export interface OpsItem {
  key: string;
  label: string;
  value: number;
  to: string;
  tone?: 'danger' | 'warning' | 'default';
}

export function OperationsPanel({ items }: {items: OpsItem[];}) {
  const { tr } = useI18n();
  return (
    <Panel className="xl:col-span-7" title={tr('مؤشرات العمليات', 'Operations')} description={tr('اضغط على أي مؤشر لعرض المعاملات المعنية', 'Click a metric to open the matching cases')}>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-3">
        {items.map((it) =>
        <Link key={it.key} to={it.to} className="group bg-surface px-4 py-4 transition-colors hover:bg-subtle">

            <p className="text-xs text-muted">{it.label}</p>
            <p className={cn('num mt-1 text-2xl font-semibold', it.tone === 'danger' ? 'text-danger' : it.tone === 'warning' ? 'text-warning' : 'text-ink')}>{it.value}</p>
          </Link>
        )}
      </div>
    </Panel>);

}

export function UrgentActions({ items }: {items: {t: Transaction;reason: string;}[];}) {
  const { tr, name } = useI18n();
  const lk = useLookups();
  const navigate = useNavigate();
  return (
    <Panel
      className="xl:col-span-7"
      title={
      <span className="flex items-center gap-2">
          <AlertOctagonIcon className="h-4 w-4 text-danger" />
          {tr('معاملات تتطلب إجراءً عاجلاً', 'Transactions requiring urgent action')}
        </span>
      }
      actions={
      <Link to="/transactions?flag=urgent" className="text-xs font-medium text-primary hover:underline">
          {tr('عرض الكل', 'View all')}
        </Link>
      }
      flush>
      
      {items.length === 0 ?
      <EmptyState compact title={tr('لا توجد معاملات عاجلة', 'No urgent transactions')} /> :

      <ul className="divide-y divide-line border-t border-line">
          {items.map(({ t, reason }) => {
          const stage = currentStage(t);
          return (
            <li key={t.id}>
                <button type="button" onClick={() => navigate(`/transactions/${t.id}`)} className="flex w-full items-center gap-4 px-5 py-3 text-start hover:bg-subtle/60">
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="num text-xs text-muted">{t.ref}</span>
                      <span className="rounded bg-danger-soft px-1.5 py-0.5 text-[11px] font-medium text-danger">{reason}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-sm font-medium">{tr(t.titleAr, t.titleEn)}</span>
                    <span className="block truncate text-xs text-muted">
                      {stage ? tr(stage.nameAr, stage.nameEn) : '—'} · {name(lk.customer.get(t.customerId))}
                    </span>
                  </span>
                  {stage && <StatusBadge domain="stage" value={stage.status} />}
                </button>
              </li>);

        })}
        </ul>
      }
    </Panel>);

}

export function UpcomingDeadlines({ reminders }: {reminders: Reminder[];}) {
  const { tr, t, lang, date } = useI18n();
  return (
    <Panel
      className="xl:col-span-5"
      title={tr('المواعيد والانتهاءات القادمة', 'Upcoming deadlines & expiries')}
      actions={
      <Link to="/tasks?tab=reminders" className="text-xs font-medium text-primary hover:underline">
          {tr('كل التنبيهات', 'All reminders')}
        </Link>
      }
      flush>
      
      {reminders.length === 0 ?
      <EmptyState compact title={tr('لا توجد مواعيد قريبة', 'Nothing due soon')} /> :

      <ul className="divide-y divide-line border-t border-line">
          {reminders.map((r) =>
        <li key={r.id}>
              <Link to={r.link} className="flex items-center gap-3 px-5 py-2.5 hover:bg-subtle/60">
                <span className={cn('h-2 w-2 shrink-0 rounded-full', r.severity === 'critical' ? 'bg-danger' : r.severity === 'warning' ? 'bg-warning' : 'bg-info')} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{lang === 'ar' ? r.title.ar : r.title.en}</span>
                  <span className="block text-[11px] text-muted">
                    {t(`rem.${r.kind}`)}
                    {r.date ? ` · ${date(r.date)}` : ''}
                  </span>
                </span>
                <DaysLeft days={r.daysLeft} />
              </Link>
            </li>
        )}
        </ul>
      }
    </Panel>);

}

export function MyTasks() {
  const { tr, date } = useI18n();
  const { user } = usePermissions();
  const tasks = taskHooks.useList();
  const toggle = useToggleTask();
  const mine = (tasks.data ?? []).filter((x) => x.assigneeId === user?.id && x.status === 'open').slice(0, 6);
  return (
    <Panel
      className="xl:col-span-4"
      title={tr('مهامي', 'My tasks')}
      actions={
      <Link to="/tasks" className="text-xs font-medium text-primary hover:underline">
          {tr('كل المهام', 'All tasks')}
        </Link>
      }
      flush>
      
      {mine.length === 0 ?
      <EmptyState compact title={tr('لا توجد مهام مفتوحة لك', 'No open tasks assigned to you')} /> :

      <ul className="divide-y divide-line border-t border-line">
          {mine.map((task) =>
        <li key={task.id} className="flex items-start gap-3 px-5 py-2.5">
              <button
            type="button"
            onClick={() => toggle.mutate(task)}
            className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-line-strong transition-colors hover:border-primary"
            aria-label={tr('إنجاز المهمة', 'Complete task')}>
            
                {task.status === 'done' && <CheckIcon className="h-3 w-3 text-primary" />}
              </button>
              <span className="min-w-0 flex-1">
                <span className="block text-sm leading-snug">{task.title}</span>
                <span className={cn('text-[11px]', task.dueDate < new Date().toISOString().slice(0, 10) ? 'text-danger' : 'text-muted')}>{date(task.dueDate)}</span>
              </span>
              {task.priority === 'high' && <StatusBadge domain="prio" value="high" />}
            </li>
        )}
        </ul>
      }
    </Panel>);

}

export function RecentTransactions({ cases }: {cases: Transaction[];}) {
  const { tr, t, dir } = useI18n();
  const Chevron = dir === 'rtl' ? ChevronLeftIcon : ChevronRightIcon;
  return (
    <Panel className="xl:col-span-5" title={tr('أحدث المعاملات', 'Recent transactions')} flush>
      <ul className="divide-y divide-line border-t border-line">
        {cases.map((c) => {
          const p = caseProgress(c);
          return (
            <li key={c.id}>
              <Link to={`/transactions/${c.id}`} className="flex items-center gap-3 px-5 py-2.5 hover:bg-subtle/60">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{tr(c.titleAr, c.titleEn)}</span>
                  <span className="flex items-center gap-2 text-[11px] text-muted">
                    <span className="num">{c.ref}</span>·<span>{t(`ctype.${c.type}`)}</span>
                  </span>
                </span>
                <span className="w-20">
                  <ProgressBar value={p.pct} tone={c.status === 'completed' ? 'success' : 'primary'} />
                  <span className="num mt-1 block text-end text-[10px] text-muted">
                    {p.done}/{p.total}
                  </span>
                </span>
                <Chevron className="h-4 w-4 text-muted" />
              </Link>
            </li>);

        })}
      </ul>
    </Panel>);

}

export function LatestBilling({ views, receipts }: {views: InvoiceView[];receipts: Receipt[];}) {
  const { tr, name, date, t } = useI18n();
  const lk = useLookups();
  const [tab, setTab] = useState('invoices');
  return (
    <Panel className="xl:col-span-4" title={tr('أحدث الفواتير والمقبوضات', 'Latest invoices & receipts')} flush>
      <Tabs className="px-3" value={tab} onChange={setTab} tabs={[{ id: 'invoices', label: t('nav.invoices') }, { id: 'receipts', label: tr('سندات القبض', 'Receipts') }]} />
      <ul className="divide-y divide-line">
        {tab === 'invoices' ?
        views.slice(0, 5).map((v) =>
        <li key={v.invoice.id}>
                <Link to={`/invoices/${v.invoice.id}`} className="flex items-center gap-3 px-5 py-2.5 hover:bg-subtle/60">
                  <span className="min-w-0 flex-1">
                    <span className="num block text-sm font-medium">{v.invoice.number}</span>
                    <span className="block truncate text-[11px] text-muted">{name(lk.customer.get(v.invoice.customerId))}</span>
                  </span>
                  <span className="text-end">
                    <Money value={v.totals.due} className="block text-sm" />
                    <StatusBadge domain="inv" value={v.status} className="mt-0.5" />
                  </span>
                </Link>
              </li>
        ) :
        receipts.slice(0, 5).map((r) =>
        <li key={r.id} className="flex items-center gap-3 px-5 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="num block text-sm font-medium">{r.number}</span>
                  <span className="block truncate text-[11px] text-muted">
                    {name(lk.customer.get(r.customerId))} · {date(r.date)}
                  </span>
                </span>
                <span className="text-end">
                  <Money value={r.amount} className="block text-sm font-medium text-success" />
                  <span className="text-[11px] text-muted">{t(`pay.${r.method}`)}</span>
                </span>
              </li>
        )}
      </ul>
    </Panel>);

}

export function RecentCustomers({ customers }: {customers: Customer[];}) {
  const { tr, name, t, relative } = useI18n();
  return (
    <Panel className="xl:col-span-3" title={tr('عملاء جدد', 'New customers')} flush>
      <ul className="divide-y divide-line border-t border-line">
        {customers.map((c) =>
        <li key={c.id}>
            <Link to={`/customers/${c.id}`} className="block px-5 py-2.5 hover:bg-subtle/60">
              <span className="block truncate text-sm font-medium">{name(c)}</span>
              <span className="text-[11px] text-muted">
                {t(`ctyp.${c.type}`)} · {relative(c.createdAt)}
              </span>
            </Link>
          </li>
        )}
      </ul>
    </Panel>);

}