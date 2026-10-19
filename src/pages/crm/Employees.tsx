import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PencilIcon, PlusIcon } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { DataTable, FilterSelect, RowActions, type Column } from '../../components/tables/DataTable';
import { StatusBadge } from '../../components/status/StatusBadge';
import { DaysLeft, Ltr } from '../../components/ui/Display';
import { EmployeeFormDialog } from '../../components/crm/EmployeeFormDialog';
import { employeeHooks, transactionHooks } from '../../hooks/useApi';
import { useI18n } from '../../hooks/useI18n';
import { useLookups } from '../../hooks/useLookups';
import { usePermissions } from '../../hooks/usePermissions';
import { useAppSelector } from '../../store/hooks';
import { daysUntil } from '../../utils/dates';
import { currentStage } from '../../utils/cases';
import type { Employee } from '../../types/crm';

export function Employees() {
  const { t, tr, name, date, nat } = useI18n();
  const { can } = usePermissions();
  const navigate = useNavigate();
  const branch = useAppSelector((s) => s.ui.branch);
  const lk = useLookups();
  const list = employeeHooks.useList();
  const tx = transactionHooks.useList();
  const [company, setCompany] = useState('all');
  const [status, setStatus] = useState('all');
  const [officer, setOfficer] = useState('all');
  const [expiry, setExpiry] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | undefined>();

  const latestCase = useMemo(() => {
    const m = new Map<string, NonNullable<typeof tx.data>[number]>();
    (tx.data ?? []).
    filter((x) => x.type === 'residence' && x.employeeId).
    sort((a, b) => a.createdAt.localeCompare(b.createdAt)).
    forEach((x) => m.set(x.employeeId!, x));
    return m;
  }, [tx.data]);

  const rows = useMemo(
    () =>
    (list.data ?? []).filter((e) => {
      const co = lk.company.get(e.companyId);
      if (branch !== 'all' && co && co.branchId !== branch) return false;
      if (company !== 'all' && e.companyId !== company) return false;
      if (status !== 'all' && e.status !== status) return false;
      if (officer !== 'all' && e.caseOfficerId !== officer) return false;
      const soonest = Math.min(daysUntil(e.residenceExpiry) ?? 9999, daysUntil(e.passportExpiry) ?? 9999);
      if (expiry === '30' && soonest > 30) return false;
      if (expiry === '90' && soonest > 90) return false;
      return true;
    }),
    [list.data, lk.company, branch, company, status, officer, expiry]
  );

  const columns: Column<Employee>[] = [
  { key: 'code', header: tr('رقم السجل', 'Record no.'), cell: (e) => <Ltr className="text-xs text-muted">{e.code}</Ltr>, sortValue: (e) => e.code },
  {
    key: 'name',
    header: t('common.name'),
    alwaysVisible: true,
    cell: (e) =>
    <div>
          <p className="font-medium">{name(e)}</p>
          <p className="text-xs text-muted">{tr(e.jobTitleAr, e.jobTitleEn)}</p>
        </div>,

    sortValue: (e) => name(e)
  },
  { key: 'nat', header: t('common.nationality'), cell: (e) => nat(e.nationality), sortValue: (e) => e.nationality },
  { key: 'passport', header: t('common.passport'), cell: (e) => <div><Ltr className="text-ink-2">{e.passportNo}</Ltr><div><DaysLeft days={daysUntil(e.passportExpiry)} /></div></div>, exportValue: (e) => e.passportNo },
  { key: 'employer', header: tr('صاحب العمل', 'Employer'), cell: (e) => <span className="text-ink-2">{name(lk.company.get(e.companyId))}</span>, sortValue: (e) => name(lk.company.get(e.companyId)) },
  { key: 'residence', header: tr('انتهاء الإقامة', 'Residence expiry'), cell: (e) => e.residenceExpiry ? <div><p>{date(e.residenceExpiry)}</p><DaysLeft days={daysUntil(e.residenceExpiry)} /></div> : <span className="text-muted">—</span>, sortValue: (e) => e.residenceExpiry ?? '9999' },
  {
    key: 'case',
    header: tr('المعاملة الحالية', 'Current transaction'),
    cell: (e) => {
      const c = latestCase.get(e.id);
      if (!c || c.status === 'completed' || c.status === 'cancelled') return <span className="text-muted">—</span>;
      const s = currentStage(c);
      return <div className="flex flex-col gap-1"><span className="text-xs text-ink-2">{s ? tr(s.nameAr, s.nameEn) : ''}</span>{s && <StatusBadge domain="stage" value={s.status} />}</div>;
    }
  },
  { key: 'officer', header: tr('مسؤول المعاملة', 'Case officer'), cell: (e) => name(lk.user.get(e.caseOfficerId)), defaultHidden: true },
  { key: 'status', header: t('common.status'), cell: (e) => <StatusBadge domain="emp" value={e.status} />, sortValue: (e) => e.status },
  {
    key: 'actions',
    header: '',
    alwaysVisible: true,
    cell: (e) =>
    can('crm.edit') ?
    <RowActions>
            <Button variant="ghost" size="icon-sm" onClick={() => {setEditing(e);setFormOpen(true);}} aria-label={t('common.edit')}>
              <PencilIcon />
            </Button>
          </RowActions> :
    null
  }];


  return (
    <div>
      <PageHeader
        title={t('nav.employees')}
        description={tr('موظفو العملاء مع بيانات الجواز والإقامة والهوية وحالة المعاملات.', 'Client employees with passport, residence and ID details and case status.')}
        crumbs={[{ label: t('nav.employees') }]}
        actions={
        can('crm.edit') &&
        <Button onClick={() => {setEditing(undefined);setFormOpen(true);}}>
              <PlusIcon />
              {tr('موظف جديد', 'New employee')}
            </Button>

        } />
      
      <DataTable
        tableId="employees"
        rows={rows}
        columns={columns}
        getRowId={(e) => e.id}
        searchText={(e) => `${e.nameAr} ${e.nameEn} ${e.code} ${e.passportNo} ${e.emiratesIdNo ?? ''} ${e.mobile}`}
        searchPlaceholder={tr('الاسم، رقم الجواز، الهوية…', 'Name, passport, Emirates ID…')}
        onRowClick={(e) => navigate(`/employees/${e.id}`)}
        isLoading={list.isLoading}
        isError={list.isError}
        onRetry={() => list.refetch()}
        exportName="employees"
        initialSort={{ key: 'code', dir: 'asc' }}
        toolbar={
        <>
            <FilterSelect label={t('common.company')} value={company} onChange={setCompany} options={[{ value: 'all', label: tr('كل الشركات', 'All companies') }, ...lk.companies.map((c) => ({ value: c.id, label: name(c) }))]} />
            <FilterSelect label={t('common.status')} value={status} onChange={setStatus} className="sm:w-36" options={[{ value: 'all', label: tr('كل الحالات', 'All statuses') }, ...['active', 'in_process', 'cancelled'].map((s) => ({ value: s, label: t(`emp.${s}`) }))]} />
            <FilterSelect label={tr('مسؤول المعاملة', 'Case officer')} value={officer} onChange={setOfficer} className="sm:w-40" options={[{ value: 'all', label: tr('كل المسؤولين', 'All officers') }, ...lk.users.filter((u) => u.role === 'pro').map((u) => ({ value: u.id, label: name(u) }))]} />
            <FilterSelect label={tr('الانتهاء', 'Expiry')} value={expiry} onChange={setExpiry} className="sm:w-44" options={[{ value: 'all', label: tr('أي انتهاء', 'Any expiry') }, { value: '30', label: tr('جواز/إقامة خلال 30 يوماً', 'Passport/residence ≤30d') }, { value: '90', label: tr('خلال 90 يوماً', 'Within 90 days') }]} />
          </>
        }
        empty={{ title: tr('لا يوجد موظفون', 'No employees') }} />
      
      <EmployeeFormDialog open={formOpen} onClose={() => setFormOpen(false)} employee={editing} />
    </div>);

}