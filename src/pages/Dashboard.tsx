import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangleIcon,
  BanknoteIcon,
  CheckCircle2Icon,
  ClipboardListIcon,
  CreditCardIcon,
  HandCoinsIcon,
  LandmarkIcon,
  PlusIcon,
  ScaleIcon,
  TrendingUpIcon,
  WalletIcon,
  BriefcaseIcon } from
'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Panel } from '../components/ui/Panel';
import { Tabs } from '../components/ui/Tabs';
import { Ltr, Money, DaysLeft } from '../components/ui/Display';
import { EmptyState, ErrorState, PageSkeleton } from '../components/ui/Feedback';
import { StatusBadge } from '../components/status/StatusBadge';
import { StatCard } from '../components/shared/StatCard';
import { PeriodPicker } from '../components/shared/PeriodPicker';
import { RecordsDialog, type RecordsSpec } from '../components/shared/RecordsDialog';
import { useLedgerColumns } from '../components/shared/ledgerColumns';
import { BarList, CategoryDonut, DailyCashChart } from '../components/dashboard/DashboardCharts';
import { MyTasks } from '../components/dashboard/DashboardWidgets';
import type { Column } from '../components/tables/DataTable';
import { useI18n } from '../hooks/useI18n';
import { usePermissions } from '../hooks/usePermissions';
import { useLookups } from '../hooks/useLookups';
import { useLedger, usePeriod } from '../hooks/useLedger';
import { useReminders } from '../hooks/useReminders';
import { addDaysIso, previousRange } from '../utils/dates';
import { caseFlags, isOpen } from '../utils/cases';
import { round2, type CashMovement, type TxSummary } from '../utils/finance';
import { dailySeries, dashboardMetrics, serviceName, topBy } from '../utils/reports';
import { cn } from '../utils/cn';
import type { Expense } from '../types/finance';

function pctChange(now: number, before: number) {
  if (!before) return null;
  return Math.round((now - before) / Math.abs(before) * 100);
}

export function Dashboard() {
  const { t, tr, lang, name, date, money } = useI18n();
  const { user, can } = usePermissions();
  const navigate = useNavigate();
  const lk = useLookups();
  const period = usePeriod();
  const { ledger, isLoading, isError, refetch } = useLedger();
  const { reminders } = useReminders();
  const cols = useLedgerColumns(ledger);
  const [spec, setSpec] = useState<RecordsSpec<unknown> | null>(null);
  const [moneyTab, setMoneyTab] = useState('receipts');
  const open = <T,>(s: RecordsSpec<T>) => setSpec(s as unknown as RecordsSpec<unknown>);

  const m = useMemo(() => dashboardMetrics(ledger, period), [ledger, period]);
  const prev = useMemo(() => dashboardMetrics(ledger, previousRange(period)), [ledger, period]);
  const chartFrom = useMemo(() => {
    // Always show at least 14 days so the selected period is compared with the days before it.
    const start = addDaysIso(period.to, -13);
    return start < period.from ? start : addDaysIso(period.from, -7);
  }, [period]);
  const series = useMemo(() => dailySeries(ledger, chartFrom, period.to), [ledger, chartFrom, period.to]);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    m.registered.forEach((s) => map.set(s.tx.type, (map.get(s.tx.type) ?? 0) + 1));
    return [...map.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ name: t(`ctype.${k}`), value: v }));
  }, [m.registered, t]);

  const topStaff = useMemo(() => topBy(m.registered, (s) => s.tx.createdBy, () => 1).map((x) => ({ key: x.key, label: name(lk.user.get(x.key)), value: x.value })), [m.registered, lk.user, name]);
  const topServices = useMemo(
    () =>
    topBy(m.registered.filter((s) => s.tx.status !== 'cancelled'), (s) => s.tx.serviceId, (s) => s.totals.netService).
    filter((x) => x.value > 0).
    map((x) => ({ key: x.key, label: serviceName(lk.catalog, x.key, lang), value: x.value })),
    [m.registered, lk.catalog, lang]
  );
  const overdue = useMemo(() => ledger.list.filter((s) => isOpen(s.tx) && caseFlags(s.tx).overdue).sort((a, b) => a.tx.dueDate.localeCompare(b.tx.dueDate)), [ledger.list]);
  const alerts = useMemo(() => reminders.filter((r) => r.kind === 'overdue_payment' || r.kind === 'missing_documents' || r.kind === 'deadline'), [reminders]);

  if (isLoading) return <PageSkeleton />;
  if (isError) return <ErrorState onRetry={refetch} />;

  const label = (lang === 'ar' ? { today: 'اليوم', yesterday: 'أمس' } : { today: 'today', yesterday: 'yesterday' })[period.key as 'today'] ?? tr('في الفترة', 'in period');
  const txCols = (...extra: Column<TxSummary>[]) => [...cols.tx.base, ...extra];
  const goTx = (s: TxSummary) => navigate(`/transactions/${s.tx.id}`);
  const vs = (now: number, before: number) => {
    const c = pctChange(now, before);
    return c === null ? tr('لا توجد بيانات للفترة السابقة', 'No previous-period data') : tr(`${c >= 0 ? '+' : ''}${c}% مقارنة بالفترة السابقة`, `${c >= 0 ? '+' : ''}${c}% vs previous period`);
  };

  const movementCols: Column<CashMovement>[] = [
  { key: 'date', header: t('common.date'), cell: (x) => date(x.date), sortValue: (x) => x.date + x.createdAt },
  { key: 'number', header: tr('المصدر', 'Source'), cell: (x) => <Ltr className="text-xs font-medium">{x.number}</Ltr>, sortValue: (x) => x.number },
  { key: 'type', header: t('common.type'), cell: (x) => t(`mv.${x.source}`), sortValue: (x) => x.source },
  { key: 'party', header: tr('الطرف', 'Party'), cell: (x) => x.customerId ? name(lk.customer.get(x.customerId)) : x.counterparty ?? '—' },
  { key: 'account', header: t('common.account'), cell: (x) => name(lk.account.get(x.accountId)) },
  { key: 'by', header: t('common.recordedBy'), cell: (x) => name(lk.user.get(x.userId)) },
  { key: 'amount', header: t('common.amount'), cell: (x) => <Money value={x.direction === 'in' ? x.amount : -x.amount} className={x.direction === 'in' ? 'font-semibold text-success' : 'font-semibold'} />, sortValue: (x) => x.direction === 'in' ? x.amount : -x.amount, align: 'end' }];

  const periodMovements = ledger.movements.filter((x) => x.source !== 'transfer' && x.date >= period.from && x.date <= period.to);

  const latestReceipts = [...ledger.receipts].sort((a, b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt)).slice(0, 6);
  const latestPayments = [...ledger.payments].sort((a, b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt)).slice(0, 6);

  return (
    <div>
      <PageHeader
        title={tr('ماذا حدث اليوم؟', 'What happened today?')}
        description={tr(`مرحباً ${user?.nameAr.split(' ')[0] ?? ''} — كل الأرقام محسوبة من السجلات الفعلية. اضغط على أي رقم لعرض السجلات التي كوّنته.`, `Hi ${user?.nameEn.split(' ')[0] ?? ''} — every figure is computed from recorded operations. Click any number to see the records behind it.`)}
        crumbs={[]}
        actions={
        <>
            <PeriodPicker />
            {can('cases.edit') &&
          <Button onClick={() => navigate('/transactions/new')}>
                <PlusIcon />
                {t('nav.newTransaction')}
              </Button>
          }
          </>
        } />


      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatCard
          icon={ClipboardListIcon}
          kind="count"
          label={tr(`معاملات مسجلة ${label}`, `Transactions registered ${label}`)}
          value={m.registered.length}
          hint={vs(m.registered.length, prev.registered.length)}
          onClick={() => open({ title: tr('المعاملات المسجلة في الفترة', 'Transactions registered in period'), rows: m.registered, columns: txCols(cols.tx.due, cols.tx.fees), getRowId: (s) => s.tx.id, onRowClick: goTx, total: round2(m.registered.reduce((a, s) => a + (s.tx.status === 'cancelled' ? 0 : s.totals.due), 0)), totalLabel: t('common.amountDue'), exportName: 'registered' })} />

        <StatCard
          icon={CheckCircle2Icon}
          kind="count"
          tone="success"
          label={tr(`معاملات مكتملة ${label}`, `Completed ${label}`)}
          value={m.completed.length}
          hint={tr('حسب تاريخ الإكمال', 'By completion date')}
          onClick={() => open({ title: tr('المعاملات المكتملة في الفترة', 'Transactions completed in period'), rows: m.completed, columns: txCols(cols.tx.due, cols.tx.collected, cols.tx.balance), getRowId: (s) => s.tx.id, onRowClick: goTx, exportName: 'completed' })} />

        <StatCard
          icon={WalletIcon}
          tone="success"
          label={tr(`المبالغ المحصّلة ${label}`, `Collected ${label}`)}
          value={m.collected}
          hint={m.refunds.length ? tr(`صافٍ بعد ${m.refunds.length} رد مبلغ · ${vs(m.collected, prev.collected)}`, `Net of ${m.refunds.length} refund(s) · ${vs(m.collected, prev.collected)}`) : vs(m.collected, prev.collected)}
          onClick={() => open({ title: tr('سندات القبض والرد في الفترة', 'Receipts & refunds in period'), description: tr('تحصيلات نقدية فعلية بتاريخ كل سند — وليست إجمالي الفواتير.', 'Actual collections by voucher date — not invoice totals.'), rows: [...m.receipts, ...m.refunds], columns: cols.receipts, getRowId: (r) => r.id, onRowClick: (r) => navigate(`/print/receipt/${r.id}`), total: m.collected, exportName: 'receipts' })} />

        <StatCard
          icon={HandCoinsIcon}
          label={tr(`ما دفعه المكتب للجهات والموردين ${label}`, `Paid to authorities/providers ${label}`)}
          value={m.paidOut}
          hint={tr(`${m.payments.length} سند صرف`, `${m.payments.length} voucher(s)`)}
          onClick={() => open({ title: tr('سندات الصرف للجهات والموردين في الفترة', 'Payments to authorities/providers in period'), rows: m.payments, columns: cols.payments, getRowId: (p) => p.id, onRowClick: (p) => navigate(`/print/payment/${p.id}`), total: m.paidOut, exportName: 'payments' })} />

        <StatCard
          icon={CreditCardIcon}
          label={tr(`المصروفات التشغيلية المدفوعة ${label}`, `Operating expenses paid ${label}`)}
          value={m.opex}
          onClick={() => open({ title: tr('المصروفات التشغيلية المدفوعة في الفترة', 'Operating expenses paid in period'), rows: m.expensesPaid, columns: cols.expenses, getRowId: (e) => e.id, total: m.opex, exportName: 'expenses' })} />

        <StatCard
          icon={BriefcaseIcon}
          tone="primary"
          label={tr(`أتعاب الخدمات المسجلة ${label}`, `Office fees registered ${label}`)}
          value={m.serviceFees}
          hint={tr('أتعاب المكتب بعد الخصم — بدون الضريبة والرسوم الحكومية', 'Net office fees — excl. VAT & government fees')}
          onClick={() => open({ title: tr('أتعاب المكتب للمعاملات المسجلة', 'Office fees on registered transactions'), rows: m.registered.filter((s) => s.tx.status !== 'cancelled'), columns: txCols(cols.tx.fees), getRowId: (s) => s.tx.id, onRowClick: goTx, total: m.serviceFees, exportName: 'office-fees' })} />

        <StatCard
          icon={ScaleIcon}
          tone="warning"
          label={tr('المستحق على العملاء (حالياً)', 'Owed by customers (now)')}
          value={m.receivablesTotal}
          hint={tr(`${m.receivables.length} معاملة — كل الفترات`, `${m.receivables.length} transactions — all time`)}
          onClick={() => open({ title: tr('المبالغ المستحقة على العملاء', 'Amounts owed by customers'), rows: m.receivables, columns: txCols(cols.tx.due, cols.tx.collected, cols.tx.balance), getRowId: (s) => s.tx.id, onRowClick: goTx, total: m.receivablesTotal, exportName: 'receivables' })} />

        <StatCard
          icon={LandmarkIcon}
          label={tr('المستحق للجهات والموردين (حالياً)', 'Owed to authorities/suppliers (now)')}
          value={m.payablesTotal}
          hint={tr(`${m.payables.length} معاملة + ${m.unpaidExpenses.length} مصروف غير مدفوع`, `${m.payables.length} transactions + ${m.unpaidExpenses.length} unpaid expenses`)}
          onClick={() =>
          open({
            title: tr('المبالغ المستحق دفعها للجهات والموردين', 'Amounts still to pay'),
            description:
            <p className="rounded-md bg-subtle/70 px-3 py-2 text-xs text-ink-2">
                    {tr('يشمل أيضاً مصروفات تشغيلية مستحقة غير مدفوعة بقيمة ', 'Also includes unpaid operating expenses of ')}
                    <Money value={m.unpaidExpenses.reduce((a: number, e: Expense) => a + e.amount, 0)} className="font-semibold" /> —{' '}
                    <Link to="/expenses?paid=unpaid" className="text-primary hover:underline">{tr('عرضها', 'view')}</Link>
                  </p>,

            rows: m.payables,
            columns: txCols(cols.tx.paidOut, cols.tx.payable),
            getRowId: (s) => s.tx.id,
            onRowClick: goTx,
            total: round2(m.payables.reduce((a, s) => a + s.payable, 0)),
            exportName: 'payables'
          })
          } />

        <StatCard
          icon={BanknoteIcon}
          tone={m.netCash < 0 ? 'danger' : 'success'}
          label={tr(`صافي التدفق النقدي ${label}`, `Net cash flow ${label}`)}
          value={m.netCash}
          hint={tr('المحصّل − المدفوع للجهات − المصروفات (التحويلات مستبعدة)', 'Collected − paid − expenses (transfers excluded)')}
          onClick={() => open({ title: tr('الحركات النقدية في الفترة', 'Cash movements in period'), rows: periodMovements, columns: movementCols, getRowId: (x) => x.id, total: m.netCash, totalLabel: tr('صافي التدفق', 'Net flow'), exportName: 'cash-flow' })} />

        <StatCard
          icon={TrendingUpIcon}
          tone="primary"
          label={tr(`الربح الفعلي ${label}`, `Realized profit ${label}`)}
          value={m.realized.length || !m.realizedUnknown.length ? m.realizedTotal : null}
          unknownLabel={tr('لا توجد معاملات محددة التكاليف', 'No transactions with final costs')}
          hint={m.realizedUnknown.length ? tr(`${m.realized.length} معاملة محسوبة · ${m.realizedUnknown.length} غير محددة بعد`, `${m.realized.length} computed · ${m.realizedUnknown.length} not yet determinable`) : tr('للمعاملات المكتملة ذات التكاليف المسددة', 'Completed transactions with settled costs')}
          onClick={() => open({ title: tr('الربح الفعلي للمعاملات المكتملة', 'Realized profit on completed transactions'), description: tr('المعاملات المكتملة التي ما زالت عليها تكاليف غير مسددة تظهر بقيمة "غير محدد" ولا تدخل في الإجمالي.', 'Completed transactions with unpaid costs show as "unknown" and are excluded from the total.'), rows: m.completed, columns: txCols(cols.tx.fees, cols.tx.paidOut, cols.tx.realized), getRowId: (s) => s.tx.id, onRowClick: goTx, total: m.realizedTotal, exportName: 'realized-profit' })} />

      </div>

      <div className="grid gap-5 xl:grid-cols-12">
        <DailyCashChart className="xl:col-span-8" series={series} from={period.from} to={period.to} />
        <CategoryDonut className="xl:col-span-4" title={tr('المعاملات حسب نوع الخدمة', 'Transactions by service type')} description={tr('المعاملات المسجلة في الفترة', 'Registered in period')} data={byCategory} />

        <BarList className="xl:col-span-4" title={tr('أكثر الموظفين تسجيلاً للمعاملات', 'Top staff by transactions registered')} items={topStaff} onSelect={(id) => open({ title: name(lk.user.get(id)), rows: m.registered.filter((s) => s.tx.createdBy === id), columns: txCols(cols.tx.due), getRowId: (s) => s.tx.id, onRowClick: goTx })} />
        <BarList className="xl:col-span-4" title={tr('أكثر الخدمات تحقيقاً لأتعاب المكتب', 'Services earning the most office fees')} items={topServices} format={(v) => money(v, { compact: true })} onSelect={(id) => open({ title: serviceName(lk.catalog, id, lang), rows: m.registered.filter((s) => s.tx.serviceId === id), columns: txCols(cols.tx.fees), getRowId: (s) => s.tx.id, onRowClick: goTx })} />

        <Panel className="xl:col-span-4" title={tr('آخر عمليات القبض والصرف', 'Latest receipts & payments')} flush>
          <Tabs className="px-3" value={moneyTab} onChange={setMoneyTab} tabs={[{ id: 'receipts', label: t('nav.receipts') }, { id: 'payments', label: t('nav.payments') }]} />
          <ul className="divide-y divide-line">
            {moneyTab === 'receipts' ?
            latestReceipts.map((r) =>
            <li key={r.id}>
                    <Link to={`/print/receipt/${r.id}`} className="flex items-center gap-3 px-5 py-2.5 hover:bg-subtle/60">
                      <span className="min-w-0 flex-1">
                        <span className="num block text-sm font-medium">{r.number}</span>
                        <span className="block truncate text-[11px] text-muted">
                          {name(lk.customer.get(r.customerId))} · {date(r.date)} · {name(lk.user.get(r.receivedBy))}
                        </span>
                      </span>
                      <Money value={r.kind === 'refund' ? -r.amount : r.amount} className={cn('text-sm font-medium', r.kind === 'receipt' && 'text-success')} />
                    </Link>
                  </li>
            ) :
            latestPayments.map((p) =>
            <li key={p.id}>
                    <Link to={`/print/payment/${p.id}`} className="flex items-center gap-3 px-5 py-2.5 hover:bg-subtle/60">
                      <span className="min-w-0 flex-1">
                        <span className="num block text-sm font-medium">{p.number}</span>
                        <span className="block truncate text-[11px] text-muted">
                          {p.payeeName} · {date(p.date)} · {name(lk.user.get(p.paidBy))}
                        </span>
                      </span>
                      <Money value={-p.amount} className="text-sm font-medium" />
                    </Link>
                  </li>
            )}
          </ul>
        </Panel>

        <Panel
          className="xl:col-span-6"
          title={
          <span className="flex items-center gap-2">
              <AlertTriangleIcon className="h-4 w-4 text-danger" />
              {tr('المعاملات المتأخرة', 'Overdue transactions')}
            </span>
          }
          actions={<Link to="/transactions?flag=overdue" className="text-xs font-medium text-primary hover:underline">{t('common.viewAll')}</Link>}
          flush>

          {overdue.length === 0 ?
          <EmptyState compact title={tr('لا توجد معاملات متأخرة', 'No overdue transactions')} /> :

          <ul className="divide-y divide-line border-t border-line">
              {overdue.slice(0, 6).map((s) =>
            <li key={s.tx.id}>
                  <Link to={`/transactions/${s.tx.id}`} className="flex items-center gap-3 px-5 py-2.5 hover:bg-subtle/60">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{tr(s.tx.titleAr, s.tx.titleEn)}</span>
                      <span className="text-[11px] text-muted">
                        <span className="num">{s.tx.ref}</span> · {name(lk.user.get(s.tx.officerId))}
                      </span>
                    </span>
                    <StatusBadge domain="case" value={s.tx.status} />
                    <DaysLeft days={Math.round((new Date(s.tx.dueDate).getTime() - Date.now()) / 86400000)} />
                  </Link>
                </li>
            )}
            </ul>
          }
        </Panel>

        <Panel className="xl:col-span-6" title={tr('تنبيهات المدفوعات والمستندات', 'Payment & document alerts')} actions={<Link to="/tasks?tab=reminders" className="text-xs font-medium text-primary hover:underline">{t('common.viewAll')}</Link>} flush>
          {alerts.length === 0 ?
          <EmptyState compact title={tr('لا توجد تنبيهات', 'No alerts')} /> :

          <ul className="divide-y divide-line border-t border-line">
              {alerts.slice(0, 7).map((r) =>
            <li key={r.id}>
                  <Link to={r.link} className="flex items-center gap-3 px-5 py-2.5 hover:bg-subtle/60">
                    <span className={cn('h-2 w-2 shrink-0 rounded-full', r.severity === 'critical' ? 'bg-danger' : r.severity === 'warning' ? 'bg-warning' : 'bg-info')} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{lang === 'ar' ? r.title.ar : r.title.en}</span>
                      <span className="block text-[11px] text-muted">{lang === 'ar' ? r.subtitle.ar : r.subtitle.en}</span>
                    </span>
                    <span className="text-[11px] text-muted">{t(`rem.${r.kind}`)}</span>
                  </Link>
                </li>
            )}
            </ul>
          }
        </Panel>

        <MyTasks />
      </div>

      <RecordsDialog spec={spec} onClose={() => setSpec(null)} />
    </div>);

}
