import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PlusIcon } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { DataTable, FilterSelect, type Column } from '../../components/tables/DataTable';
import { SavedFilters } from '../../components/tables/SavedFilters';
import { StatusBadge } from '../../components/status/StatusBadge';
import { Ltr, Money, ProgressBar } from '../../components/ui/Display';
import { useLedger } from '../../hooks/useLedger';
import { useI18n } from '../../hooks/useI18n';
import { useLookups } from '../../hooks/useLookups';
import { usePermissions } from '../../hooks/usePermissions';
import { CASE_STATUSES, caseFlags, caseProgress, currentStage, isOpen } from '../../utils/cases';
import { daysUntil, inRange } from '../../utils/dates';
import { needsReview } from '../../utils/reports';
import { cn } from '../../utils/cn';
import type { CaseType } from '../../types/cases';
import type { TxSummary } from '../../utils/finance';

const TYPES: CaseType[] = ['residence', 'family', 'visit', 'insurance', 'formation', 'pro', 'other'];
const titles: Partial<Record<CaseType, string>> = { residence: 'nav.residence', family: 'nav.family', visit: 'nav.visits', formation: 'nav.formation' };

const DEFAULTS = { status: 'all', flag: 'all', officer: 'all', by: 'all', service: 'all', ctype: 'all', money: 'all', from: '', to: '' };

export function CaseList({ type }: {type?: CaseType;}) {
  const { t, tr, name, date } = useI18n();
  const { can, user } = usePermissions();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const lk = useLookups();
  const { ledger, isLoading, isError, refetch } = useLedger();
  const [filters, setFilters] = useState<Record<string, string>>(DEFAULTS);

  useEffect(() => {
    const next = { ...DEFAULTS };
    (Object.keys(DEFAULTS) as (keyof typeof DEFAULTS)[]).forEach((k) => {
      const v = params.get(k);
      if (v) next[k] = v;
    });
    if (params.get('mine') === '1' && user) next.officer = user.id;
    setFilters(next);
  }, [params, type, user]);
  const set = (k: string) => (v: string) => setFilters((f) => ({ ...f, [k]: v }));

  const rows = useMemo(
    () =>
    ledger.list.filter(({ tx: c, ...s }) => {
      if (type && c.type !== type) return false;
      if (!type && filters.ctype !== 'all' && c.type !== filters.ctype) return false;
      if (filters.status === 'open' && !isOpen(c)) return false;
      if (filters.status !== 'open' && filters.status !== 'all' && c.status !== filters.status) return false;
      if (filters.officer !== 'all' && c.officerId !== filters.officer) return false;
      if (filters.by !== 'all' && c.createdBy !== filters.by) return false;
      if (filters.service !== 'all' && c.serviceId !== filters.service) return false;
      if ((filters.from || filters.to) && !inRange(c.createdAt, filters.from || '0000-01-01', filters.to || '9999-12-31')) return false;
      if (filters.money === 'receivable' && !(s.receivable > 0)) return false;
      if (filters.money === 'payable' && !(s.payable > 0)) return false;
      if (filters.money === 'unpaid' && s.collected > 0) return false;
      if (filters.flag !== 'all') {
        const f = caseFlags(c);
        if (filters.flag === 'overdue' && !f.overdue) return false;
        if (filters.flag === 'waiting_customer' && !f.awaitingCustomer) return false;
        if (filters.flag === 'waiting_payment' && !f.awaitingPayment) return false;
        if (filters.flag === 'rejected' && !f.rejected) return false;
        if (filters.flag === 'review' && !needsReview({ tx: c, ...s } as TxSummary)) return false;
        if (filters.flag === 'urgent' && !(f.rejected || f.overdue || f.stageOverdue || c.priority === 'urgent')) return false;
      }
      return true;
    }),
    [ledger.list, type, filters]
  );

  const beneficiary = (s: TxSummary) => s.tx.employeeId ? name(lk.employee.get(s.tx.employeeId)) : s.tx.beneficiaryName ?? s.tx.visit?.applicantNameAr ?? s.tx.formation?.tradeNameAr ?? '—';

  const columns: Column<TxSummary>[] = [
  { key: 'ref', header: t('common.reference'), cell: (s) => <Ltr className="text-xs font-medium text-ink-2">{s.tx.ref}</Ltr>, sortValue: (s) => s.tx.ref },
  {
    key: 'service',
    header: tr('الخدمة / المستفيد', 'Service / beneficiary'),
    alwaysVisible: true,
    cell: (s) =>
    <div className="min-w-[200px]">
          <p className="flex items-center gap-1.5 font-medium">
            {tr(lk.service.get(s.tx.serviceId)?.nameAr ?? s.tx.titleAr, lk.service.get(s.tx.serviceId)?.nameEn ?? s.tx.titleEn)}
            {s.tx.priority === 'urgent' && <span className="rounded bg-danger-soft px-1 text-[10px] text-danger">{t('prio.urgent')}</span>}
          </p>
          <p className="text-xs text-muted">{beneficiary(s)}</p>
        </div>,

    sortValue: (s) => s.tx.titleAr,
    exportValue: (s) => s.tx.titleAr
  },
  { key: 'customer', header: t('common.customer'), cell: (s) => <span className="text-ink-2">{name(lk.customer.get(s.tx.customerId))}</span>, sortValue: (s) => name(lk.customer.get(s.tx.customerId)) },
  { key: 'company', header: t('common.company'), cell: (s) => <span className="text-ink-2">{s.tx.companyId ? name(lk.company.get(s.tx.companyId)) : '—'}</span>, defaultHidden: true, exportValue: (s) => s.tx.companyId ? name(lk.company.get(s.tx.companyId)) : '' },
  {
    key: 'stage',
    header: t('common.currentStage'),
    cell: (s) => {
      const st = currentStage(s.tx);
      if (!st || !isOpen(s.tx)) return <span className="text-muted">—</span>;
      return <span className="text-xs text-ink-2">{tr(st.nameAr, st.nameEn)}</span>;
    },
    defaultHidden: true
  },
  {
    key: 'progress',
    header: t('common.progress'),
    cell: (s) => {
      const p = caseProgress(s.tx);
      return (
        <div className="flex w-24 items-center gap-2">
            <ProgressBar value={p.pct} tone={s.tx.status === 'completed' ? 'success' : 'primary'} />
            <span className="num text-[11px] text-muted">{p.done}/{p.total}</span>
          </div>);

    },
    sortValue: (s) => caseProgress(s.tx).pct,
    defaultHidden: true
  },
  { key: 'status', header: t('common.status'), cell: (s) => <StatusBadge domain="case" value={s.tx.status} />, sortValue: (s) => s.tx.status },
  { key: 'date', header: t('common.date'), cell: (s) => date(s.tx.transactionDate), sortValue: (s) => s.tx.createdAt },
  {
    key: 'due',
    header: t('common.dueDate'),
    cell: (s) => {
      const overdue = caseFlags(s.tx).overdue;
      return <span className={cn(overdue ? 'font-medium text-danger' : 'text-ink-2')}>{date(s.tx.dueDate)}{overdue && <span className="num ms-1 text-[11px]">({daysUntil(s.tx.dueDate)})</span>}</span>;
    },
    sortValue: (s) => s.tx.dueDate,
    defaultHidden: true
  },
  { key: 'officer', header: tr('المنفذ', 'Officer'), cell: (s) => name(lk.user.get(s.tx.officerId)), sortValue: (s) => name(lk.user.get(s.tx.officerId)) },
  { key: 'by', header: tr('سجّلها', 'Registered by'), cell: (s) => name(lk.user.get(s.tx.createdBy)), sortValue: (s) => name(lk.user.get(s.tx.createdBy)), defaultHidden: true },
  { key: 'amount', header: t('common.amountDue'), cell: (s) => <Money value={s.tx.status === 'cancelled' ? 0 : s.totals.due} />, sortValue: (s) => s.totals.due, align: 'end' },
  { key: 'collected', header: t('common.collected'), cell: (s) => <Money value={s.collected} className="text-success" />, sortValue: (s) => s.collected, align: 'end' },
  { key: 'balance', header: t('common.customerBalance'), cell: (s) => <Money value={s.receivable} className={s.receivable > 0 ? 'font-semibold text-warning' : 'text-muted'} />, sortValue: (s) => s.receivable, align: 'end' },
  { key: 'payable', header: t('common.payable'), cell: (s) => <Money value={s.payable} className={s.payable > 0 ? '' : 'text-muted'} />, sortValue: (s) => s.payable, align: 'end', defaultHidden: true },
  { key: 'fees', header: t('common.serviceFee'), cell: (s) => <Money value={s.totals.netService} />, sortValue: (s) => s.totals.netService, align: 'end', defaultHidden: true }];


  const staff = lk.users.filter((u) => u.role !== 'manager');
  const totalDue = rows.reduce((a, s) => a + (s.tx.status === 'cancelled' ? 0 : s.totals.due), 0);
  const totalCollected = rows.reduce((a, s) => a + s.collected, 0);
  const totalBalance = rows.reduce((a, s) => a + s.receivable, 0);

  return (
    <div>
      <PageHeader
        title={t(type ? titles[type] ?? `ctype.${type}` : 'nav.transactions')}
        description={tr('كل معاملة مع موقفها المالي الفعلي: المستحق والمحصّل والمتبقي.', 'Every transaction with its real money position: due, collected and outstanding.')}
        crumbs={type ? [{ label: t('nav.transactions'), to: '/transactions' }, { label: t(titles[type] ?? `ctype.${type}`) }] : [{ label: t('nav.transactions') }]}
        actions={
        can('cases.edit') &&
        <Button onClick={() => navigate('/transactions/new')}>
              <PlusIcon />
              {t('nav.newTransaction')}
            </Button>

        } />

      <DataTable
        tableId={`cases-${type ?? 'all'}`}
        rows={rows}
        columns={columns}
        getRowId={(s) => s.tx.id}
        searchText={(s) => `${s.tx.ref} ${s.tx.titleAr} ${s.tx.titleEn} ${s.tx.externalRef ?? ''} ${beneficiary(s)} ${name(lk.customer.get(s.tx.customerId))}`}
        searchPlaceholder={tr('المرجع، الاسم، العميل، رقم الجهة…', 'Reference, name, customer, authority no…')}
        onRowClick={(s) => navigate(`/transactions/${s.tx.id}`)}
        isLoading={isLoading}
        isError={isError}
        onRetry={refetch}
        exportName={`transactions-${type ?? 'all'}`}
        initialSort={{ key: 'date', dir: 'desc' }}
        rowClassName={(s) => caseFlags(s.tx).rejected ? 'bg-danger-soft/30' : undefined}
        toolbar={
        <>
            <FilterSelect label={t('common.status')} value={filters.status} onChange={set('status')} className="sm:w-40" options={[{ value: 'all', label: tr('كل الحالات', 'All statuses') }, { value: 'open', label: tr('المفتوحة', 'Open') }, ...CASE_STATUSES.map((s) => ({ value: s, label: t(`case.${s}`) }))]} />
            <FilterSelect label={tr('الخدمة', 'Service')} value={filters.service} onChange={set('service')} className="sm:w-48" options={[{ value: 'all', label: tr('كل الخدمات', 'All services') }, ...lk.catalog.filter((s) => !type || s.category === type).map((s) => ({ value: s.id, label: tr(s.nameAr, s.nameEn || s.nameAr) }))]} />
            <FilterSelect label={tr('المنفذ', 'Officer')} value={filters.officer} onChange={set('officer')} className="sm:w-40" options={[{ value: 'all', label: tr('كل المنفذين', 'All officers') }, ...staff.map((u) => ({ value: u.id, label: name(u) }))]} />
            <FilterSelect label={tr('سجّلها', 'Registered by')} value={filters.by} onChange={set('by')} className="sm:w-40" options={[{ value: 'all', label: tr('كل المسجِّلين', 'Anyone registered') }, ...staff.map((u) => ({ value: u.id, label: name(u) }))]} />
            <FilterSelect
            label={tr('الموقف المالي', 'Money')}
            value={filters.money}
            onChange={set('money')}
            className="sm:w-44"
            options={[
            { value: 'all', label: tr('كل المواقف المالية', 'Any money status') },
            { value: 'receivable', label: tr('عليها مبالغ للعميل', 'Customer owes') },
            { value: 'unpaid', label: tr('لم يُحصَّل منها شيء', 'Nothing collected') },
            { value: 'payable', label: tr('مستحق للجهات', 'Owed to authorities') }]
            } />

            <FilterSelect
            label={tr('تنبيه', 'Flag')}
            value={filters.flag}
            onChange={set('flag')}
            className="sm:w-44"
            options={[
            { value: 'all', label: tr('بدون تنبيه محدد', 'Any flag') },
            { value: 'urgent', label: tr('تتطلب إجراءً عاجلاً', 'Needs urgent action') },
            { value: 'overdue', label: tr('متأخرة', 'Overdue') },
            { value: 'review', label: tr('تحتاج مراجعة', 'Needs review') },
            { value: 'waiting_customer', label: t('case.waiting_documents') },
            { value: 'waiting_payment', label: t('case.waiting_payment') },
            { value: 'rejected', label: t('case.rejected') }]
            } />

            {!type && <FilterSelect label={t('common.type')} value={filters.ctype} onChange={set('ctype')} className="sm:w-40" options={[{ value: 'all', label: tr('كل الأنواع', 'All types') }, ...TYPES.map((x) => ({ value: x, label: t(`ctype.${x}`) }))]} />}
            <span className="flex items-center gap-1 text-xs text-muted">
              <Input type="date" className="h-8 w-36 text-xs" value={filters.from} onChange={(e) => set('from')(e.target.value)} aria-label={tr('من تاريخ', 'From')} />
              —
              <Input type="date" className="h-8 w-36 text-xs" value={filters.to} onChange={(e) => set('to')(e.target.value)} aria-label={tr('إلى تاريخ', 'To')} />
            </span>
            <SavedFilters page={`cases-${type ?? 'all'}`} values={filters} onApply={(v) => setFilters((f) => ({ ...f, ...v }))} />
          </>
        }
        footer={
        rows.length > 0 &&
        <div className="flex flex-wrap justify-end gap-x-6 gap-y-1 border-t border-line bg-subtle/40 px-4 py-2.5 text-xs">
              <span className="text-muted">{tr(`${rows.length} معاملة`, `${rows.length} transactions`)}</span>
              <span>{t('common.amountDue')}: <Money value={totalDue} className="font-semibold" /></span>
              <span>{t('common.collected')}: <Money value={totalCollected} className="font-semibold text-success" /></span>
              <span>{t('common.customerBalance')}: <Money value={totalBalance} className="font-semibold text-warning" /></span>
            </div>

        }
        empty={{ title: tr('لا توجد معاملات مطابقة', 'No matching transactions'), action: can('cases.edit') ? <Button onClick={() => navigate('/transactions/new')}>{t('nav.newTransaction')}</Button> : undefined }} />

    </div>);

}
