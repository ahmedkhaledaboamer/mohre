import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BadgeCheckIcon, PencilIcon, ShieldPlusIcon } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { InfoGrid, Panel } from '../../components/ui/Panel';
import { ErrorState, PageSkeleton } from '../../components/ui/Feedback';
import { DaysLeft, Ltr, Money } from '../../components/ui/Display';
import { StatusBadge } from '../../components/status/StatusBadge';
import { EmployeeFormDialog } from '../../components/crm/EmployeeFormDialog';
import { CasesTable } from '../../components/shared/EntityTables';
import { DocumentsTable } from '../../components/documents/DocumentsTable';
import { documentHooks, employeeHooks } from '../../hooks/useApi';
import { useI18n } from '../../hooks/useI18n';
import { useLedger } from '../../hooks/useLedger';
import { round2 } from '../../utils/finance';
import { useLookups } from '../../hooks/useLookups';
import { usePermissions } from '../../hooks/usePermissions';
import { daysUntil } from '../../utils/dates';

export function EmployeeDetail() {
  const { id } = useParams();
  const { t, tr, name, date, nat } = useI18n();
  const { can } = usePermissions();
  const navigate = useNavigate();
  const lk = useLookups();
  const employee = employeeHooks.useOne(id);
  const { ledger, isLoading: ledgerLoading } = useLedger({ ignoreBranch: true });
  const docs = documentHooks.useList();
  const [editOpen, setEditOpen] = useState(false);

  const cases = useMemo(() => ledger.transactions.filter((x) => x.employeeId === id), [ledger.transactions, id]);
  const myDocs = useMemo(() => (docs.data ?? []).filter((d) => d.entityId === id || cases.some((c) => c.id === d.entityId)), [docs.data, id, cases]);

  if (employee.isLoading) return <PageSkeleton />;
  if (employee.isError || !employee.data) return <ErrorState onRetry={() => employee.refetch()} />;
  const e = employee.data;
  const company = lk.company.get(e.companyId);
  const sums = cases.map((x) => ledger.summaries.get(x.id)!).filter(Boolean);
  const totalDue = round2(sums.filter((x) => x.tx.status !== 'cancelled').reduce((a, x) => a + x.totals.due, 0));
  const totalCollected = round2(sums.reduce((a, x) => a + x.collected, 0));
  const totalBalance = round2(sums.reduce((a, x) => a + x.receivable, 0));

  const expiryRow = (label: string, iso?: string) => ({
    label,
    value: iso ?
    <span className="flex flex-wrap items-center gap-2">
        {date(iso)} <DaysLeft days={daysUntil(iso)} />
      </span> :

    '—'

  });

  return (
    <div>
      <PageHeader
        title={name(e)}
        crumbs={[{ label: t('nav.employees'), to: '/employees' }, { label: name(e) }]}
        meta={
        <>
            <Ltr className="text-xs text-muted">{e.code}</Ltr>
            <StatusBadge domain="emp" value={e.status} />
            <span className="text-xs text-muted">{tr(e.jobTitleAr, e.jobTitleEn)}</span>
          </>
        }
        actions={
        <>
            {can('cases.edit') &&
          <Button variant="outline" onClick={() => navigate(`/residence/new?employee=${e.id}`)}>
                <BadgeCheckIcon />
                {tr('معاملة إقامة جديدة', 'New residence case')}
              </Button>
          }
            {can('crm.edit') &&
          <Button onClick={() => setEditOpen(true)}>
                <PencilIcon />
                {t('common.edit')}
              </Button>
          }
          </>
        } />
      

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Panel title={tr('البيانات الشخصية والجواز', 'Personal & passport')}>
            <InfoGrid
              cols={3}
              items={[
              { label: t('common.nameAr'), value: e.nameAr },
              { label: t('common.nameEn'), value: <Ltr>{e.nameEn}</Ltr> },
              { label: t('common.nationality'), value: nat(e.nationality) },
              { label: tr('تاريخ الميلاد', 'Date of birth'), value: date(e.dateOfBirth) },
              { label: tr('رقم الجواز', 'Passport no.'), value: <Ltr>{e.passportNo}</Ltr> },
              expiryRow(tr('انتهاء الجواز', 'Passport expiry'), e.passportExpiry),
              { label: t('common.mobile'), value: <Ltr>{e.mobile}</Ltr> },
              { label: tr('صاحب العمل', 'Employer'), value: company ? <Link className="text-primary hover:underline" to={`/companies/${company.id}`}>{name(company)}</Link> : '—' },
              { label: tr('مسؤول المعاملة', 'Case officer'), value: name(lk.user.get(e.caseOfficerId)) }]
              } />
            
          </Panel>
          <Panel title={tr('الإقامة وتصريح العمل والهوية', 'Residence, work permit & Emirates ID')}>
            <InfoGrid
              cols={3}
              items={[
              { label: tr('نوع التأشيرة', 'Visa type'), value: t(`visa.${e.visaType}`) },
              { label: tr('تاريخ الدخول', 'Entry date'), value: date(e.entryDate) },
              { label: tr('رقم تصريح العمل', 'Work permit no.'), value: e.workPermitNo ? <Ltr>{e.workPermitNo}</Ltr> : '—' },
              expiryRow(tr('انتهاء تصريح العمل', 'Work permit expiry'), e.workPermitExpiry),
              { label: tr('رقم الهوية', 'Emirates ID no.'), value: e.emiratesIdNo ? <Ltr>{e.emiratesIdNo}</Ltr> : '—' },
              expiryRow(tr('انتهاء الهوية', 'Emirates ID expiry'), e.emiratesIdExpiry),
              { label: tr('إصدار الإقامة', 'Residence issued'), value: date(e.residenceIssue) },
              expiryRow(tr('انتهاء الإقامة', 'Residence expiry'), e.residenceExpiry)]
              } />
            
          </Panel>
          <CasesTable tableId="employee-cases" cases={cases} ledger={ledger} isLoading={ledgerLoading} />
        </div>
        <Panel
          title={
          <span className="flex items-center gap-2">
              <ShieldPlusIcon className="h-4 w-4 text-primary" />
              {tr('الموقف المالي لمعاملات الموظف', "Employee's transactions — money")}
            </span>
          }>
          
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted">{tr('عدد المعاملات', 'Transactions')}</dt><dd className="num font-semibold">{cases.length}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">{t('common.amountDue')}</dt><dd><Money value={totalDue} /></dd></div>
            <div className="flex justify-between"><dt className="text-muted">{t('common.collected')}</dt><dd><Money value={totalCollected} className="text-success" /></dd></div>
            <div className="flex justify-between border-t border-line pt-2 font-semibold"><dt>{t('common.customerBalance')}</dt><dd><Money value={totalBalance} className={totalBalance > 0 ? 'text-warning' : ''} /></dd></div>
          </dl>
          <p className="mt-3 text-[11px] text-muted">{tr('المبالغ مستحقة على العميل/الشركة المرتبطة وليس على الموظف نفسه.', 'Amounts are owed by the linked customer/company, not the employee.')}</p>
          {can('cases.edit') &&
          <Link to={`/transactions/new?customer=${e.customerId}&company=${e.companyId}&employee=${e.id}`} className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
              {tr('+ معاملة جديدة لهذا الموظف', '+ New transaction for this employee')}
            </Link>
          }
        </Panel>
        <div className="lg:col-span-3">
          <DocumentsTable tableId="employee-docs" docs={myDocs} isLoading={docs.isLoading} uploadFor={{ entityType: 'employee', entityId: e.id }} />
        </div>
      </div>
      <EmployeeFormDialog open={editOpen} onClose={() => setEditOpen(false)} employee={e} />
    </div>);

}