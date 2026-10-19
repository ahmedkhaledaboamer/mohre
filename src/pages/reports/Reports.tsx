import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { endOfMonth, format, startOfMonth, subMonths } from 'date-fns';
import { PageHeader } from '../../components/ui/PageHeader';
import { Tabs } from '../../components/ui/Tabs';
import { Panel } from '../../components/ui/Panel';
import { Money } from '../../components/ui/Display';
import { ErrorState, PageSkeleton } from '../../components/ui/Feedback';
import { DataTable, FilterSelect, type Column } from '../../components/tables/DataTable';
import { PeriodPicker } from '../../components/shared/PeriodPicker';
import { StatCard } from '../../components/shared/StatCard';
import { RecordsDialog, type RecordsSpec } from '../../components/shared/RecordsDialog';
import { useLedgerColumns } from '../../components/shared/ledgerColumns';
import { DailyCashChart } from '../../components/dashboard/DashboardCharts';
import { useLedger, usePeriod } from '../../hooks/useLedger';
import { useI18n } from '../../hooks/useI18n';
import { useLookups } from '../../hooks/useLookups';
import { customerBalance, round2, type TxSummary } from '../../utils/finance';
import { dailySeries, dashboardMetrics, employeePerformance, serviceStats, type EmployeeStat, type ServiceStat } from '../../utils/reports';
import { toIso } from '../../utils/dates';

const TABS = ['daily', 'monthly', 'employees', 'services', 'receivables', 'profitability'] as const;
type Tab = (typeof TABS)[number];

export function Reports() {
  const { tab: tabParam } = useParams();
  const tab: Tab = TABS.includes(tabParam as Tab) ? tabParam as Tab : 'daily';
  const navigate = useNavigate();
  const { tr } = useI18n();
  const labels: Record<Tab, string> = {
    daily: tr('التقرير اليومي', 'Daily report'),
    monthly: tr('التقرير الشهري', 'Monthly report'),
    employees: tr('أداء الموظفين', 'Staff performance'),
    services: tr('الخدمات الأكثر تنفيذاً', 'Most performed services'),
    receivables: tr('المبالغ المستحقة', 'Outstanding amounts'),
    profitability: tr('الربحية', 'Profitability')
  };
  return (
    <div>
      <PageHeader
        title={tr('التقارير', 'Reports')}
        description={tr('كل التقارير محسوبة من العمليات المسجلة فعلياً وتدعم الفترة الزمنية والفلاتر والتصدير إلى CSV.', 'All reports are computed from recorded operations, with period, filters and CSV export.')}
        crumbs={[{ label: tr('التقارير', 'Reports') }]}
        actions={tab !== 'monthly' && tab !== 'receivables' ? <PeriodPicker /> : undefined} />

      <Tabs className="mb-5" value={tab} onChange={(id) => navigate(`/reports/${id}`)} tabs={TABS.map((id) => ({ id, label: labels[id] }))} />
      {tab === 'daily' && <DailyReport />}
      {tab === 'monthly' && <MonthlyReport />}
      {tab === 'employees' && <EmployeeReport />}
      {tab === 'services' && <ServicesReport mode="volume" />}
      {tab === 'receivables' && <ReceivablesReport />}
      {tab === 'profitability' && <ServicesReport mode="profit" />}
    </div>);

}

function useReportData() {
  const l = useLedger();
  const period = usePeriod();
  return { ...l, period };
}

function DailyReport() {
  const { t, tr, date } = useI18n();
  const navigate = useNavigate();
  const { ledger, period, isLoading, isError, refetch } = useReportData();
  const cols = useLedgerColumns(ledger);
  const [spec, setSpec] = useState<RecordsSpec<unknown> | null>(null);
  const series = useMemo(() => dailySeries(ledger, period.from, period.to), [ledger, period]);
  const m = useMemo(() => dashboardMetrics(ledger, period), [ledger, period]);
  if (isLoading) return <PageSkeleton />;
  if (isError) return <ErrorState onRetry={refetch} />;

  const dayRows = series.map((d) => ({ ...d, net: round2(d.collected - d.paid - d.expenses) }));
  const columns: Column<(typeof dayRows)[number]>[] = [
  { key: 'date', header: t('common.date'), cell: (d) => date(d.date), sortValue: (d) => d.date },
  { key: 'registered', header: tr('معاملات مسجلة', 'Registered'), cell: (d) => <span className="num">{d.registered}</span>, sortValue: (d) => d.registered, align: 'center' },
  { key: 'collected', header: t('common.collected'), cell: (d) => <Money value={d.collected} className="text-success" />, sortValue: (d) => d.collected, align: 'end' },
  { key: 'paid', header: tr('مدفوع للجهات', 'Paid to authorities'), cell: (d) => <Money value={d.paid} />, sortValue: (d) => d.paid, align: 'end' },
  { key: 'expenses', header: tr('مصروفات تشغيلية', 'Operating expenses'), cell: (d) => <Money value={d.expenses} />, sortValue: (d) => d.expenses, align: 'end' },
  { key: 'net', header: tr('صافي التدفق', 'Net cash'), cell: (d) => <Money value={d.net} className="font-semibold" />, sortValue: (d) => d.net, align: 'end' }];

  const open = <T,>(s: RecordsSpec<T>) => setSpec(s as unknown as RecordsSpec<unknown>);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard kind="count" label={tr('معاملات مسجلة', 'Registered')} value={m.registered.length} onClick={() => open({ title: tr('المعاملات المسجلة', 'Registered'), rows: m.registered, columns: [...cols.tx.base, cols.tx.due], getRowId: (s) => s.tx.id, onRowClick: (s) => navigate(`/transactions/${s.tx.id}`) })} />
        <StatCard kind="count" tone="success" label={tr('مكتملة', 'Completed')} value={m.completed.length} onClick={() => open({ title: tr('المكتملة', 'Completed'), rows: m.completed, columns: [...cols.tx.base, cols.tx.balance], getRowId: (s) => s.tx.id, onRowClick: (s) => navigate(`/transactions/${s.tx.id}`) })} />
        <StatCard tone="success" label={t('common.collected')} value={m.collected} onClick={() => open({ title: t('nav.receipts'), rows: [...m.receipts, ...m.refunds], columns: cols.receipts, getRowId: (r) => r.id, total: m.collected })} />
        <StatCard label={tr('مدفوع للجهات', 'Paid to authorities')} value={m.paidOut} onClick={() => open({ title: t('nav.payments'), rows: m.payments, columns: cols.payments, getRowId: (p) => p.id, total: m.paidOut })} />
        <StatCard label={tr('مصروفات تشغيلية', 'Operating expenses')} value={m.opex} onClick={() => open({ title: t('nav.expenses'), rows: m.expensesPaid, columns: cols.expenses, getRowId: (e) => e.id, total: m.opex })} />
        <StatCard tone={m.netCash < 0 ? 'danger' : 'primary'} label={tr('صافي التدفق النقدي', 'Net cash flow')} value={m.netCash} />
      </div>
      <DailyCashChart series={series} from={period.from} to={period.to} title={tr('الحركة اليومية في الفترة', 'Daily movement in period')} />
      <DataTable tableId="report-daily" rows={dayRows} columns={columns} getRowId={(d) => d.date} exportName={`daily-${period.from}-${period.to}`} pageSize={31} initialSort={{ key: 'date', dir: 'desc' }} />
      <RecordsDialog spec={spec} onClose={() => setSpec(null)} />
    </div>);

}

function MonthlyReport() {
  const { tr, lang } = useI18n();
  const { ledger, isLoading, isError, refetch } = useReportData();
  const rows = useMemo(
    () =>
    Array.from({ length: 12 }, (_, i) => {
      const d = subMonths(new Date(), i);
      const r = { from: toIso(startOfMonth(d)), to: toIso(endOfMonth(d)) };
      const m = dashboardMetrics(ledger, r);
      return {
        key: format(d, 'yyyy-MM'),
        label: d.toLocaleDateString(lang === 'ar' ? 'ar-AE' : 'en-GB', { month: 'long', year: 'numeric' }),
        registered: m.registered.length,
        completed: m.completed.length,
        fees: m.serviceFees,
        collected: m.collected,
        paid: m.paidOut,
        opex: m.opex,
        net: m.netCash,
        realized: m.realizedTotal,
        unknown: m.realizedUnknown.length
      };
    }),
    [ledger, lang]
  );
  if (isLoading) return <PageSkeleton />;
  if (isError) return <ErrorState onRetry={refetch} />;
  type R = (typeof rows)[number];
  const money = (key: keyof R, header: string, cls?: string): Column<R> => ({ key: String(key), header, cell: (r) => <Money value={r[key] as number} className={cls} />, sortValue: (r) => r[key] as number, align: 'end' });
  const columns: Column<R>[] = [
  { key: 'label', header: tr('الشهر', 'Month'), cell: (r) => <span className="font-medium">{r.label}</span>, sortValue: (r) => r.key, exportValue: (r) => r.key },
  { key: 'registered', header: tr('مسجلة', 'Registered'), cell: (r) => <span className="num">{r.registered}</span>, sortValue: (r) => r.registered, align: 'center' },
  { key: 'completed', header: tr('مكتملة', 'Completed'), cell: (r) => <span className="num">{r.completed}</span>, sortValue: (r) => r.completed, align: 'center' },
  money('fees', tr('أتعاب مسجلة', 'Office fees')),
  money('collected', tr('محصّل', 'Collected'), 'text-success'),
  money('paid', tr('مدفوع للجهات', 'Paid out')),
  money('opex', tr('مصروفات تشغيلية', 'Opex')),
  money('net', tr('صافي التدفق', 'Net cash'), 'font-semibold'),
  { key: 'realized', header: tr('الربح الفعلي', 'Realized profit'), cell: (r) => <span><Money value={r.realized} className="font-semibold" />{r.unknown > 0 && <span className="ms-1 text-[10px] text-muted">({tr(`${r.unknown} غير محددة`, `${r.unknown} unknown`)})</span>}</span>, sortValue: (r) => r.realized, exportValue: (r) => r.realized, align: 'end' }];

  return (
    <Panel title={tr('آخر 12 شهراً', 'Last 12 months')} description={tr('التدفقات بتاريخ كل سند؛ الأتعاب حسب تاريخ تسجيل المعاملة؛ الربح الفعلي للمعاملات المكتملة ذات التكاليف المسددة فقط.', 'Cash by voucher date; fees by registration date; realized profit only where costs are settled.')} flush>
      <DataTable tableId="report-monthly" rows={rows} columns={columns} getRowId={(r) => r.key} exportName="monthly-report" pageSize={12} hideSearch />
    </Panel>);

}

function EmployeeReport() {
  const { t, tr, name } = useI18n();
  const navigate = useNavigate();
  const lk = useLookups();
  const { ledger, period, isLoading, isError, refetch } = useReportData();
  const cols = useLedgerColumns(ledger);
  const [userId, setUserId] = useState('all');
  const [serviceId, setServiceId] = useState('all');
  const [spec, setSpec] = useState<RecordsSpec<unknown> | null>(null);
  const stats = useMemo(
    () => employeePerformance(ledger, lk.users.filter((u) => u.role !== 'manager' && (userId === 'all' || u.id === userId)), period, { serviceId: serviceId === 'all' ? undefined : serviceId }),
    [ledger, lk.users, period, userId, serviceId]
  );
  if (isLoading) return <PageSkeleton />;
  if (isError) return <ErrorState onRetry={refetch} />;
  const open = <T,>(s: RecordsSpec<T>) => setSpec(s as unknown as RecordsSpec<unknown>);
  const txList = (title: string, rows: TxSummary[]) => () => open({ title, rows, columns: [...cols.tx.base, cols.tx.due, cols.tx.balance], getRowId: (s) => s.tx.id, onRowClick: (s) => navigate(`/transactions/${s.tx.id}`) });
  const count = (key: string, header: string, f: (s: EmployeeStat) => TxSummary[], tone?: string): Column<EmployeeStat> => ({
    key,
    header,
    cell: (s) =>
    <button type="button" className={`num font-semibold hover:underline ${tone ?? ''}`} onClick={txList(`${header} — ${name(s.user)}`, f(s))}>
          {f(s).length}
        </button>,

    sortValue: (s) => f(s).length,
    align: 'center'
  });

  const columns: Column<EmployeeStat>[] = [
  { key: 'user', header: tr('الموظف الداخلي', 'Staff member'), cell: (s) => <span className="font-medium">{name(s.user)}<span className="block text-[11px] text-muted">{t(`role.${s.user.role}`)}</span></span>, sortValue: (s) => name(s.user), exportValue: (s) => name(s.user) },
  count('registered', tr('سجّلها', 'Registered'), (s) => s.registered),
  count('completed', tr('أكملها', 'Completed'), (s) => s.completed, 'text-success'),
  count('executed', tr('مسندة إليه (منفذ)', 'Assigned (officer)'), (s) => s.executed),
  { key: 'services', header: tr('أنواع الخدمات', 'Service types'), cell: (s) => <span className="text-xs text-ink-2" title={s.services.map((id) => lk.service.get(id)?.nameAr).join('، ')}>{s.services.length}</span>, sortValue: (s) => s.services.length, exportValue: (s) => s.services.map((id) => lk.service.get(id)?.nameAr).join(' | '), align: 'center' },
  { key: 'value', header: tr('قيمة الخدمات المسجلة', 'Value registered'), cell: (s) => <Money value={s.registeredValue} />, sortValue: (s) => s.registeredValue, align: 'end' },
  {
    key: 'collected',
    header: tr('حصّلها بنفسه', 'Collected personally'),
    cell: (s) => <button type="button" className="hover:underline" onClick={() => open({ title: `${tr('سندات القبض المسجلة بواسطة', 'Receipts recorded by')} ${name(s.user)}`, rows: s.receipts, columns: cols.receipts, getRowId: (r) => r.id, total: s.collected })}><Money value={s.collected} className="text-success" /></button>,
    sortValue: (s) => s.collected,
    exportValue: (s) => s.collected,
    align: 'end'
  },
  {
    key: 'paid',
    header: tr('دفعها للجهات وسجّلها', 'Paid & recorded'),
    cell: (s) => <button type="button" className="hover:underline" onClick={() => open({ title: `${tr('سندات الصرف المسجلة بواسطة', 'Payments recorded by')} ${name(s.user)}`, rows: s.payments, columns: cols.payments, getRowId: (p) => p.id, total: s.paidOut })}><Money value={s.paidOut} /></button>,
    sortValue: (s) => s.paidOut,
    exportValue: (s) => s.paidOut,
    align: 'end'
  },
  { key: 'fees', header: tr('أتعاب المكتب لمعاملاته', 'Office fees on his work'), cell: (s) => <Money value={s.officeFees} className="font-semibold text-primary-strong" />, sortValue: (s) => s.officeFees, align: 'end' },
  count('overdue', tr('متأخرة (حالياً)', 'Overdue (now)'), (s) => s.overdue, 'text-danger'),
  count('review', tr('تحتاج مراجعة', 'Needs review'), (s) => s.needsReview, 'text-warning')];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <FilterSelect label={tr('الموظف', 'Staff')} value={userId} onChange={setUserId} options={[{ value: 'all', label: tr('كل الموظفين', 'All staff') }, ...lk.users.filter((u) => u.role !== 'manager').map((u) => ({ value: u.id, label: name(u) }))]} />
        <FilterSelect label={tr('نوع المعاملة', 'Service')} value={serviceId} onChange={setServiceId} className="sm:w-56" options={[{ value: 'all', label: tr('كل الخدمات', 'All services') }, ...lk.catalog.map((s) => ({ value: s.id, label: tr(s.nameAr, s.nameEn || s.nameAr) }))]} />
      </div>
      <DataTable tableId="report-employees" rows={stats} columns={columns} getRowId={(s) => s.user.id} exportName={`staff-${period.from}-${period.to}`} hideSearch initialSort={{ key: 'registered', dir: 'desc' }} />
      <p className="text-xs leading-relaxed text-muted">
        {tr(
          '«سجّلها» = من أنشأ المعاملة (لا يتغير عند التعديل، والتعديلات لا تُحتسب معاملات جديدة). «أكملها» = من غيّر الحالة إلى مكتملة. «حصّلها بنفسه» = سندات القبض التي سجّلها الموظف فعلياً، وليس كل ما حُصّل على معاملاته. «متأخرة» و«تحتاج مراجعة» تعكس الوضع الحالي لمعاملاته المسندة إليه.',
          '"Registered" = who created it (never changes on edit; edits are not new transactions). "Completed" = who closed it. "Collected personally" = receipts this person recorded, not everything collected on their work. Overdue / review reflect the current state of their assigned work.'
        )}
      </p>
      <RecordsDialog spec={spec} onClose={() => setSpec(null)} />
    </div>);

}

function ServicesReport({ mode }: {mode: 'volume' | 'profit';}) {
  const { t, tr, lang } = useI18n();
  const lk = useLookups();
  const { ledger, period, isLoading, isError, refetch } = useReportData();
  const [category, setCategory] = useState('all');
  const stats = useMemo(() => serviceStats(ledger, period, (s) => category === 'all' || s.tx.type === category), [ledger, period, category]);
  if (isLoading) return <PageSkeleton />;
  if (isError) return <ErrorState onRetry={refetch} />;
  const svcName = (id: string) => {
    const s = lk.service.get(id);
    return s ? lang === 'ar' ? s.nameAr : s.nameEn || s.nameAr : id;
  };
  const m = (key: keyof ServiceStat, header: string, cls?: string): Column<ServiceStat> => ({ key: String(key), header, cell: (s) => <Money value={s[key] as number} className={cls} />, sortValue: (s) => s[key] as number, align: 'end' });
  const columns: Column<ServiceStat>[] = [
  { key: 'service', header: tr('الخدمة', 'Service'), cell: (s) => <span className="font-medium">{svcName(s.serviceId)}<span className="block text-[11px] text-muted">{t(`cat.${lk.service.get(s.serviceId)?.category ?? 'other'}`)}</span></span>, sortValue: (s) => svcName(s.serviceId), exportValue: (s) => svcName(s.serviceId) },
  { key: 'count', header: tr('عدد المعاملات', 'Transactions'), cell: (s) => <span className="num font-semibold">{s.count}</span>, sortValue: (s) => s.count, align: 'center' },
  { key: 'completed', header: tr('مكتملة', 'Completed'), cell: (s) => <span className="num">{s.completed}</span>, sortValue: (s) => s.completed, align: 'center' },
  ...(mode === 'volume' ?
  [m('due', t('common.amountDue')), m('collected', t('common.collected'), 'text-success'), m('netService', t('common.serviceFee'), 'font-semibold')] :
  [
  m('netService', tr('إيراد المكتب (أتعاب صافية)', 'Office revenue (net fees)')),
  m('estimatedProfit', t('common.estimatedProfit'), 'text-primary-strong'),
  {
    key: 'realized',
    header: t('common.realizedProfit'),
    cell: (s: ServiceStat) =>
    <span>
              <Money value={s.realizedProfit} className="font-semibold" />
              {s.realizedUnknown > 0 && <span className="block text-[10px] text-muted">{tr(`${s.realizedKnown} محسوبة · ${s.realizedUnknown} غير محددة`, `${s.realizedKnown} known · ${s.realizedUnknown} unknown`)}</span>}
            </span>,

    sortValue: (s: ServiceStat) => s.realizedProfit,
    exportValue: (s: ServiceStat) => s.realizedProfit,
    align: 'end'
  } as Column<ServiceStat>])];


  const total = (k: keyof ServiceStat) => round2(stats.reduce((a, s) => a + (s[k] as number), 0));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <FilterSelect label={t('common.category')} value={category} onChange={setCategory} options={[{ value: 'all', label: tr('كل الفئات', 'All categories') }, ...['residence', 'family', 'visit', 'insurance', 'formation', 'pro', 'other'].map((c) => ({ value: c, label: t(`cat.${c}`) }))]} />
        {mode === 'profit' &&
        <span className="text-xs text-muted">
            {tr('الضريبة والرسوم الحكومية المحصّلة نيابةً عن الجهات لا تُعد إيراداً. الربح الفعلي يُحتسب فقط للمعاملات المكتملة التي سُددت تكاليفها.', 'VAT and pass-through government fees are not revenue. Realized profit only counts completed transactions with settled costs.')}
          </span>
        }
      </div>
      {mode === 'profit' &&
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label={tr('إيراد المكتب', 'Office revenue')} value={total('netService')} />
          <StatCard label={t('common.estimatedProfit')} value={total('estimatedProfit')} tone="primary" />
          <StatCard label={t('common.realizedProfit')} value={total('realizedProfit')} tone="primary" hint={tr(`${stats.reduce((a, s) => a + s.realizedUnknown, 0)} معاملة مكتملة غير محددة الربح بعد`, `${stats.reduce((a, s) => a + s.realizedUnknown, 0)} completed but not yet determinable`)} />
          <StatCard label={tr('المصروفات التشغيلية في الفترة', 'Operating expenses in period')} value={dashboardMetrics(ledger, period).opex} hint={tr('تُطرح لتقدير صافي ربح المكتب — لا تُوزَّع على المعاملات', 'Deduct for an office net estimate — not allocated to transactions')} />
        </div>
      }
      <DataTable tableId={`report-services-${mode}`} rows={stats} columns={columns} getRowId={(s) => s.serviceId} exportName={`services-${mode}-${period.from}-${period.to}`} initialSort={{ key: mode === 'volume' ? 'count' : 'netService', dir: 'desc' }} hideSearch />
    </div>);

}

function ReceivablesReport() {
  const { t, tr, name } = useI18n();
  const navigate = useNavigate();
  const lk = useLookups();
  const { ledger, isLoading, isError, refetch } = useLedger();
  const cols = useLedgerColumns(ledger);
  const [view, setView] = useState('customers');
  const customers = useMemo(
    () =>
    lk.customers.
    map((c) => ({ customer: c, ...customerBalance(c.id, ledger.list, ledger.receipts, ledger.invoices), open: ledger.list.filter((s) => s.tx.customerId === c.id && s.receivable > 0).length })).
    filter((r) => Math.abs(r.balance) > 0.005),
    [lk.customers, ledger]
  );
  const txs = useMemo(() => ledger.list.filter((s) => s.receivable > 0), [ledger.list]);
  const payables = useMemo(() => ledger.list.filter((s) => s.payable > 0), [ledger.list]);
  if (isLoading) return <PageSkeleton />;
  if (isError) return <ErrorState onRetry={refetch} />;
  type C = (typeof customers)[number];
  const cColumns: Column<C>[] = [
  { key: 'name', header: t('common.customer'), cell: (r) => <span className="font-medium">{name(r.customer)}</span>, sortValue: (r) => name(r.customer) },
  { key: 'open', header: tr('معاملات عليها رصيد', 'Open transactions'), cell: (r) => <span className="num">{r.open}</span>, sortValue: (r) => r.open, align: 'center' },
  { key: 'charged', header: tr('إجمالي المستحق', 'Total charged'), cell: (r) => <Money value={r.charged} />, sortValue: (r) => r.charged, align: 'end' },
  { key: 'collected', header: t('common.collected'), cell: (r) => <Money value={r.collected} className="text-success" />, sortValue: (r) => r.collected, align: 'end' },
  { key: 'balance', header: t('common.balance'), cell: (r) => <Money value={r.balance} className={r.balance > 0 ? 'font-semibold text-warning' : 'font-semibold text-info'} />, sortValue: (r) => r.balance, align: 'end' }];

  const totalCust = round2(customers.reduce((a, r) => a + Math.max(r.balance, 0), 0));
  const totalPay = round2(payables.reduce((a, s) => a + s.payable, 0));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatCard tone="warning" label={tr('مستحق على العملاء', 'Owed by customers')} value={totalCust} onClick={() => setView('customers')} />
        <StatCard label={tr('مستحق للجهات على المعاملات', 'Owed to authorities')} value={totalPay} onClick={() => setView('payables')} />
        <StatCard label={tr('أرصدة دائنة للعملاء', 'Customer credits')} value={round2(customers.reduce((a, r) => a + Math.min(r.balance, 0), 0))} hint={tr('مبالغ محصّلة زائدة أو لمعاملات ملغاة تحتاج رداً', 'Overpaid or cancelled — may need a refund')} />
      </div>
      <FilterSelect label={tr('العرض', 'View')} value={view} onChange={setView} className="sm:w-56" options={[{ value: 'customers', label: tr('حسب العميل', 'By customer') }, { value: 'transactions', label: tr('حسب المعاملة', 'By transaction') }, { value: 'payables', label: tr('مستحق للجهات والموردين', 'Payables') }]} />
      {view === 'customers' && <DataTable tableId="report-recv-customers" rows={customers} columns={cColumns} getRowId={(r) => r.customer.id} searchText={(r) => name(r.customer)} onRowClick={(r) => navigate(`/customers/${r.customer.id}`)} exportName="receivables-by-customer" initialSort={{ key: 'balance', dir: 'desc' }} />}
      {view === 'transactions' && <DataTable tableId="report-recv-tx" rows={txs} columns={[...cols.tx.base, cols.tx.due, cols.tx.collected, cols.tx.balance]} getRowId={(s) => s.tx.id} searchText={(s) => `${s.tx.ref} ${s.tx.titleAr}`} onRowClick={(s) => navigate(`/transactions/${s.tx.id}`)} exportName="receivables-by-transaction" initialSort={{ key: 'balance', dir: 'desc' }} />}
      {view === 'payables' && <DataTable tableId="report-payables" rows={payables} columns={[...cols.tx.base, cols.tx.paidOut, cols.tx.payable]} getRowId={(s) => s.tx.id} searchText={(s) => `${s.tx.ref} ${s.tx.titleAr}`} onRowClick={(s) => navigate(`/transactions/${s.tx.id}`)} exportName="payables" initialSort={{ key: 'payable', dir: 'desc' }} />}
    </div>);

}
