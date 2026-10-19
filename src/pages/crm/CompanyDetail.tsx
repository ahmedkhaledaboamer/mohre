import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangleIcon, PencilIcon, PlusIcon, RefreshCwIcon } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Tabs } from '../../components/ui/Tabs';
import { InfoGrid, Panel } from '../../components/ui/Panel';
import { ErrorState, PageSkeleton, EmptyState } from '../../components/ui/Feedback';
import { DaysLeft, Ltr, Money } from '../../components/ui/Display';
import { StatusBadge } from '../../components/status/StatusBadge';
import { CompanyFormDialog } from '../../components/crm/CompanyFormDialog';
import { EmployeeFormDialog } from '../../components/crm/EmployeeFormDialog';
import { CasesTable, InvoicesTable } from '../../components/shared/EntityTables';
import { DocumentsTable } from '../../components/documents/DocumentsTable';
import { ActivityTimeline } from '../../components/shared/ActivityTimeline';
import { companyHooks, documentHooks, useActivity, useSettings } from '../../hooks/useApi';
import { useI18n } from '../../hooks/useI18n';
import { useLookups } from '../../hooks/useLookups';
import { usePermissions } from '../../hooks/usePermissions';
import { useLedger } from '../../hooks/useLedger';
import { round2 } from '../../utils/finance';
import { authorities } from '../../data/authorities';
import { daysUntil } from '../../utils/dates';

export function CompanyDetail() {
  const { id } = useParams();
  const { t, tr, name, date, lang } = useI18n();
  const { can } = usePermissions();
  const navigate = useNavigate();
  const lk = useLookups();
  const company = companyHooks.useOne(id);
  const docs = documentHooks.useList();
  const activity = useActivity();
  const settings = useSettings();
  const { ledger, invoiceViews: views, isLoading: ledgerLoading } = useLedger({ ignoreBranch: true });
  const [tab, setTab] = useState('overview');
  const [editOpen, setEditOpen] = useState(false);
  const [empOpen, setEmpOpen] = useState(false);

  const employees = useMemo(() => lk.employees.filter((e) => e.companyId === id), [lk.employees, id]);
  const cases = useMemo(() => ledger.transactions.filter((x) => x.companyId === id), [ledger.transactions, id]);
  const myViews = useMemo(() => views.filter((v) => v.invoice.companyId === id), [views, id]);
  const ids = useMemo(() => new Set([id ?? '', ...employees.map((e) => e.id), ...cases.map((c) => c.id)]), [id, employees, cases]);
  const myDocs = useMemo(() => (docs.data ?? []).filter((d) => ids.has(d.entityId)), [docs.data, ids]);

  if (company.isLoading) return <PageSkeleton />;
  if (company.isError || !company.data) return <ErrorState onRetry={() => company.refetch()} />;
  const c = company.data;
  const days = daysUntil(c.licenseExpiry) ?? 999;
  const reminderWindow = settings.data?.reminderDays.license ?? 30;
  const auth = authorities.find((a) => a.id === c.authority);
  const sums = cases.map((x) => ledger.summaries.get(x.id)!).filter(Boolean);
  const outstanding = round2(sums.reduce((a, x) => a + x.receivable, 0));
  const billed = round2(sums.filter((x) => x.tx.status !== 'cancelled').reduce((a, x) => a + x.totals.due, 0));
  const paid = round2(sums.reduce((a, x) => a + x.collected, 0));

  return (
    <div>
      <PageHeader
        title={name(c)}
        crumbs={[{ label: t('nav.companies'), to: '/companies' }, { label: name(c) }]}
        meta={
        <>
            <Ltr className="text-xs text-muted">{c.licenseNo}</Ltr>
            <StatusBadge domain="comp" value={c.status} />
            <span className="text-xs text-muted">{t(`jur.${c.jurisdiction}`)}</span>
          </>
        }
        actions={
        can('crm.edit') &&
        <Button onClick={() => setEditOpen(true)}>
              <PencilIcon />
              {t('common.edit')}
            </Button>

        } />
      

      {days <= reminderWindow &&
      <div className={`mb-5 flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 ${days < 0 ? 'border-danger/25 bg-danger-soft text-danger' : 'border-warning/25 bg-warning-soft text-warning'}`}>
          <AlertTriangleIcon className="h-4 w-4 shrink-0" />
          <p className="text-sm font-medium">
            {days < 0 ? tr(`الرخصة التجارية منتهية منذ ${-days} يوم.`, `Trade license expired ${-days} days ago.`) : tr(`تنتهي الرخصة التجارية خلال ${days} يوم.`, `Trade license expires in ${days} days.`)}
          </p>
          {can('cases.edit') &&
        <Button size="sm" variant="outline" className="ms-auto bg-surface" onClick={() => navigate(`/formation/new?customer=${c.customerId}&company=${c.id}&kind=renewal`)}>
              <RefreshCwIcon />
              {tr('بدء معاملة تجديد', 'Start renewal case')}
            </Button>
        }
        </div>
      }

      <Tabs
        className="mb-5"
        value={tab}
        onChange={setTab}
        tabs={[
        { id: 'overview', label: t('common.overview') },
        { id: 'employees', label: t('nav.employees'), count: employees.length },
        { id: 'cases', label: t('nav.transactions'), count: cases.length },
        { id: 'finance', label: tr('الأرصدة والسجل المالي', 'Balances & financial history') },
        { id: 'documents', label: t('common.documents'), count: myDocs.length },
        { id: 'activity', label: t('common.activity') }]
        } />
      

      {tab === 'overview' &&
      <div className="grid gap-5 lg:grid-cols-3">
          <Panel className="lg:col-span-2" title={tr('بيانات الرخصة والشركة', 'License & company details')}>
            <InfoGrid
            cols={3}
            items={[
            { label: tr('الاسم بالعربية', 'Arabic name'), value: c.nameAr },
            { label: tr('الاسم بالإنجليزية', 'English name'), value: <Ltr>{c.nameEn}</Ltr> },
            { label: tr('رقم الرخصة', 'License no.'), value: <Ltr>{c.licenseNo}</Ltr> },
            { label: tr('سلطة الترخيص', 'Licensing authority'), value: auth ? lang === 'ar' ? auth.nameAr : auth.nameEn : c.authority },
            { label: tr('الاختصاص', 'Jurisdiction'), value: t(`jur.${c.jurisdiction}`) },
            { label: tr('الشكل القانوني', 'Legal form'), value: t(`legal.${c.legalForm}`) },
            { label: t('common.issueDate'), value: date(c.licenseIssue) },
            { label: t('common.expiryDate'), value: <span className="flex items-center gap-2">{date(c.licenseExpiry)} <DaysLeft days={days} /></span> },
            { label: tr('الأنشطة', 'Activities'), value: (lang === 'ar' ? c.activitiesAr : c.activitiesEn.length ? c.activitiesEn : c.activitiesAr).join('، ') },
            { label: tr('المالك', 'Owner'), value: c.ownerName },
            { label: tr('جهة الاتصال المفوضة', 'Authorized contact'), value: c.contactName },
            { label: t('common.customer'), value: <Link className="text-primary hover:underline" to={`/customers/${c.customerId}`}>{name(lk.customer.get(c.customerId))}</Link> },
            { label: t('common.mobile'), value: <Ltr>{c.mobile}</Ltr> },
            { label: t('common.email'), value: <Ltr>{c.email}</Ltr> },
            { label: tr('العنوان', 'Address'), value: c.address }]
            } />
          
          </Panel>
          <Panel title={tr('ملخص مالي', 'Financial summary')}>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between"><dt className="text-muted">{tr('إجمالي المفوتر', 'Total billed')}</dt><dd><Money value={billed} /></dd></div>
              <div className="flex justify-between"><dt className="text-muted">{tr('إجمالي المدفوع', 'Total paid')}</dt><dd><Money value={paid} className="text-success" /></dd></div>
              <div className="flex justify-between border-t border-line pt-3"><dt className="font-medium">{tr('الرصيد المستحق', 'Outstanding')}</dt><dd><Money value={outstanding} className="font-semibold text-warning" /></dd></div>
            </dl>
            <p className="mt-4 text-xs text-muted">{tr(`تذكير التجديد يظهر قبل ${reminderWindow} يوماً من الانتهاء (قابل للتعديل من الإعدادات).`, `Renewal reminder shows ${reminderWindow} days before expiry (configurable in Settings).`)}</p>
          </Panel>
        </div>
      }

      {tab === 'employees' &&
      <Panel
        title={tr('الموظفون المرتبطون', 'Linked employees')}
        actions={can('crm.edit') && <Button size="sm" onClick={() => setEmpOpen(true)}><PlusIcon />{tr('موظف جديد', 'New employee')}</Button>}
        flush>
        
          {employees.length === 0 ?
        <EmptyState compact title={tr('لا يوجد موظفون', 'No employees')} /> :

        <ul className="divide-y divide-line border-t border-line">
              {employees.map((e) =>
          <li key={e.id}>
                  <Link to={`/employees/${e.id}`} className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-subtle/60">
                    <span>
                      <span className="block font-medium">{name(e)}</span>
                      <span className="text-xs text-muted">{tr(e.jobTitleAr, e.jobTitleEn)} · <Ltr>{e.passportNo}</Ltr></span>
                    </span>
                    <span className="flex items-center gap-3">
                      {e.residenceExpiry && <DaysLeft days={daysUntil(e.residenceExpiry)} />}
                      <StatusBadge domain="emp" value={e.status} />
                    </span>
                  </Link>
                </li>
          )}
            </ul>
        }
        </Panel>
      }

      {tab === 'cases' && <CasesTable tableId="company-cases" cases={cases} ledger={ledger} isLoading={ledgerLoading} />}
      {tab === 'finance' && <InvoicesTable tableId="company-invoices" views={myViews} />}
      {tab === 'documents' && <DocumentsTable tableId="company-docs" docs={myDocs} isLoading={docs.isLoading} uploadFor={{ entityType: 'company', entityId: c.id }} showEntity />}
      {tab === 'activity' &&
      <Panel>
          <ActivityTimeline entries={(activity.data ?? []).filter((a) => ids.has(a.entityId)).slice(0, 40)} isLoading={activity.isLoading} />
        </Panel>
      }

      <CompanyFormDialog open={editOpen} onClose={() => setEditOpen(false)} company={c} />
      <EmployeeFormDialog open={empOpen} onClose={() => setEmpOpen(false)} defaultCompanyId={c.id} />
    </div>);

}