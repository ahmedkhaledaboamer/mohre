import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { LandmarkIcon, PencilIcon, PlusIcon, ReceiptTextIcon, Undo2Icon } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Tabs } from '../../components/ui/Tabs';
import { InfoGrid, Panel } from '../../components/ui/Panel';
import { ErrorState, PageSkeleton, EmptyState } from '../../components/ui/Feedback';
import { Ltr, Money } from '../../components/ui/Display';
import { StatusBadge } from '../../components/status/StatusBadge';
import { CustomerFormDialog } from '../../components/crm/CustomerFormDialog';
import { CasesTable, InvoicesTable, ReceiptsTable } from '../../components/shared/EntityTables';
import { NotesPanel } from '../../components/shared/NotesPanel';
import { ActivityTimeline } from '../../components/shared/ActivityTimeline';
import { DocumentsTable } from '../../components/documents/DocumentsTable';
import { DataTable, type Column } from '../../components/tables/DataTable';
import { customerHooks, documentHooks, useActivity } from '../../hooks/useApi';
import { useI18n } from '../../hooks/useI18n';
import { useLookups } from '../../hooks/useLookups';
import { usePermissions } from '../../hooks/usePermissions';
import { useLedger } from '../../hooks/useLedger';
import { ReceiptDialog } from '../../components/finance/ReceiptDialog';
import { customerBalance, runningBalances } from '../../utils/finance';
import { isOpen } from '../../utils/cases';
import type { Dependent } from '../../types/cases';

export function CustomerDetail() {
  const { id } = useParams();
  const { t, tr, name, date, nat } = useI18n();
  const { can } = usePermissions();
  const navigate = useNavigate();
  const lk = useLookups();
  const customer = customerHooks.useOne(id);
  const update = customerHooks.useUpdate();
  const { ledger, invoiceViews: views, isLoading: ledgerLoading } = useLedger({ ignoreBranch: true });
  const receipts = ledger.receipts;
  const docs = documentHooks.useList();
  const activity = useActivity();
  const [tab, setTab] = useState('overview');
  const [editOpen, setEditOpen] = useState(false);
  const [rcpt, setRcpt] = useState<null | 'receipt' | 'refund'>(null);

  const companies = useMemo(() => lk.companies.filter((c) => c.customerId === id), [lk.companies, id]);
  const employees = useMemo(() => lk.employees.filter((e) => e.customerId === id), [lk.employees, id]);
  const cases = useMemo(() => ledger.transactions.filter((x) => x.customerId === id), [ledger.transactions, id]);
  const dependents = useMemo(() => cases.flatMap((c) => (c.dependents ?? []).map((d) => ({ ...d, caseId: c.id, sponsor: c.family?.sponsorName ?? '' }))), [cases]);
  const myViews = useMemo(() => views.filter((v) => v.invoice.customerId === id), [views, id]);
  const myReceipts = useMemo(() => receipts.filter((r) => r.customerId === id).sort((a, b) => b.date.localeCompare(a.date)), [receipts, id]);
  const relatedIds = useMemo(() => new Set([id ?? '', ...companies.map((c) => c.id), ...employees.map((e) => e.id), ...cases.map((c) => c.id)]), [id, companies, employees, cases]);
  const myDocs = useMemo(() => (docs.data ?? []).filter((d) => relatedIds.has(d.entityId)), [docs.data, relatedIds]);
  const myActivity = useMemo(() => (activity.data ?? []).filter((a) => relatedIds.has(a.entityId)).slice(0, 40), [activity.data, relatedIds]);

  if (customer.isLoading) return <PageSkeleton />;
  if (customer.isError || !customer.data) return <ErrorState onRetry={() => customer.refetch()} />;
  const c = customer.data;

  const bal = customerBalance(c.id, ledger.list, ledger.receipts, ledger.invoices);
  const balances = runningBalances(c.id, ledger.list, ledger.receipts, ledger.invoices);
  const outstanding = bal.balance;
  const open = cases.filter(isOpen).length;

  const depCols: Column<Dependent & {caseId: string;sponsor: string;}>[] = [
  { key: 'n', header: t('common.name'), cell: (d) => <span className="font-medium">{name(d)}</span> },
  { key: 'r', header: tr('صلة القرابة', 'Relationship'), cell: (d) => t(`rel.${d.relationship}`) },
  { key: 's', header: tr('الكفيل', 'Sponsor'), cell: (d) => d.sponsor },
  { key: 'p', header: t('common.passport'), cell: (d) => <Ltr>{d.passportNo}</Ltr> },
  { key: 'c', header: '', cell: (d) => <Link to={`/transactions/${d.caseId}`} className="text-xs font-medium text-primary hover:underline">{tr('المعاملة', 'Case')}</Link> }];


  return (
    <div>
      <PageHeader
        title={name(c)}
        crumbs={[{ label: t('nav.customers'), to: '/customers' }, { label: name(c) }]}
        meta={
        <>
            <Ltr className="text-xs text-muted">{c.code}</Ltr>
            <StatusBadge domain="cust" value={c.status} />
            <span className="text-xs text-muted">{t(`ctyp.${c.type}`)}</span>
          </>
        }
        actions={
        <>
            {can('cases.edit') &&
          <Button variant="outline" onClick={() => navigate(`/transactions/new?customer=${c.id}`)}>
                <LandmarkIcon />
                {t('nav.newTransaction')}
              </Button>
          }
            {can('collections.record') && outstanding > 0 &&
          <Button variant="outline" onClick={() => setRcpt('receipt')}>
                <PlusIcon />
                {t('quick.receipt')}
              </Button>
          }
            {can('finance.edit') &&
          <Button variant="outline" onClick={() => navigate(`/invoices/new?customer=${c.id}`)}>
                <ReceiptTextIcon />
                {t('quick.invoice')}
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
      

      <div className="mb-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line lg:grid-cols-4">
        {[
        { l: outstanding < 0 ? tr('رصيد دائن للعميل', 'Customer credit') : tr('الرصيد المستحق', 'Outstanding balance'), v: <Money value={outstanding} className={outstanding > 0 ? 'text-warning' : ''} /> },
        { l: tr('إجمالي المستحق عليه', 'Total charged'), v: <Money value={bal.charged} /> },
        { l: tr('إجمالي المحصّل (صافي)', 'Total collected (net)'), v: <Money value={bal.collected} className="text-success" /> },
        { l: tr('معاملات مفتوحة', 'Open transactions'), v: <span className="num">{open}</span> }].
        map((k) =>
        <div key={k.l} className="bg-surface px-5 py-4">
            <p className="text-xs text-muted">{k.l}</p>
            <p className="mt-1 text-lg font-semibold">{k.v}</p>
          </div>
        )}
      </div>

      <Tabs
        className="mb-5"
        value={tab}
        onChange={setTab}
        tabs={[
        { id: 'overview', label: t('common.overview') },
        { id: 'personal', label: tr('البيانات الشخصية', 'Personal info') },
        { id: 'companies', label: tr('الشركات والتوظيف', 'Companies'), count: companies.length },
        { id: 'employees', label: tr('الموظفون والمكفولون', 'Employees & dependents'), count: employees.length + dependents.length },
        { id: 'cases', label: t('nav.transactions'), count: cases.length },
        { id: 'billing', label: t('nav.invoices'), count: myViews.length },
        { id: 'payments', label: tr('المقبوضات والأرصدة', 'Receipts & balances'), count: myReceipts.length },
        { id: 'documents', label: t('common.documents'), count: myDocs.length },
        { id: 'notes', label: tr('الملاحظات والنشاط', 'Notes & activity') }]
        } />
      

      {tab === 'overview' &&
      <div className="grid gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <CasesTable tableId="cust-cases-overview" cases={cases.filter((x) => isOpen(x) || (ledger.summaries.get(x.id)?.receivable ?? 0) > 0)} ledger={ledger} isLoading={ledgerLoading} />
            <InvoicesTable tableId="cust-inv-overview" views={myViews.filter((v) => v.balance > 0)} />
          </div>
          <Panel title={tr('معلومات التواصل', 'Contact')}>
            <InfoGrid
            cols={2}
            items={[
            { label: t('common.mobile'), value: <Ltr>{c.mobile}</Ltr> },
            { label: t('common.email'), value: <Ltr className="break-all">{c.email}</Ltr> },
            { label: tr('المسؤول', 'Assigned'), value: name(lk.user.get(c.assignedUserId)) },
            { label: t('common.branch'), value: t(`branch.${c.branchId}`) }]
            } />
          
            <div className="mt-5 border-t border-line pt-4">
              <p className="mb-3 text-xs font-medium text-muted">{tr('آخر النشاطات', 'Latest activity')}</p>
              <ActivityTimeline entries={myActivity.slice(0, 5)} isLoading={activity.isLoading} />
            </div>
          </Panel>
        </div>
      }

      {tab === 'personal' &&
      <Panel>
          <InfoGrid
          cols={3}
          items={[
          { label: t('common.nameAr'), value: c.nameAr },
          { label: t('common.nameEn'), value: <Ltr>{c.nameEn}</Ltr> },
          { label: tr('الشخص المسؤول', 'Contact person'), value: c.contactPerson ?? '—' },
          { label: t('common.nationality'), value: nat(c.nationality) },
          { label: tr('رقم الهوية', 'Emirates ID'), value: c.emiratesIdNo ? <Ltr>{c.emiratesIdNo}</Ltr> : '—' },
          { label: tr('العنوان', 'Address'), value: c.address },
          { label: t('common.mobile'), value: <Ltr>{c.mobile}</Ltr> },
          { label: t('common.email'), value: <Ltr>{c.email}</Ltr> },
          { label: t('common.createdAt'), value: date(c.createdAt) }]
          } />
        
        </Panel>
      }

      {tab === 'companies' &&
      <Panel title={tr('الشركات المرتبطة', 'Linked companies')} flush>
          {companies.length === 0 ?
        <EmptyState compact title={tr('لا توجد شركات مرتبطة', 'No linked companies')} /> :

        <ul className="divide-y divide-line border-t border-line">
              {companies.map((co) =>
          <li key={co.id}>
                  <Link to={`/companies/${co.id}`} className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-subtle/60">
                    <span>
                      <span className="block font-medium">{name(co)}</span>
                      <Ltr className="text-xs text-muted">{co.licenseNo}</Ltr>
                    </span>
                    <span className="text-end text-xs text-muted">
                      {tr('تنتهي الرخصة', 'License expires')} {date(co.licenseExpiry)}
                      <span className="mt-1 block">
                        <StatusBadge domain="comp" value={co.status} />
                      </span>
                    </span>
                  </Link>
                </li>
          )}
            </ul>
        }
        </Panel>
      }

      {tab === 'employees' &&
      <div className="space-y-5">
          <Panel title={t('nav.employees')} flush>
            {employees.length === 0 ?
          <EmptyState compact title={tr('لا يوجد موظفون', 'No employees')} /> :

          <ul className="divide-y divide-line border-t border-line">
                {employees.map((e) =>
            <li key={e.id}>
                    <Link to={`/employees/${e.id}`} className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-subtle/60">
                      <span>
                        <span className="block font-medium">{name(e)}</span>
                        <span className="text-xs text-muted">{tr(e.jobTitleAr, e.jobTitleEn)} · {name(lk.company.get(e.companyId))}</span>
                      </span>
                      <StatusBadge domain="emp" value={e.status} />
                    </Link>
                  </li>
            )}
              </ul>
          }
          </Panel>
          <DataTable tableId="cust-deps" rows={dependents} columns={depCols} getRowId={(d) => d.id} pageSize={5} empty={{ title: tr('لا يوجد مكفولون', 'No dependents') }} />
        </div>
      }

      {tab === 'cases' && <CasesTable tableId="cust-cases" cases={cases} ledger={ledger} isLoading={ledgerLoading} />}

      {tab === 'billing' &&
      <div className="space-y-5">
          <InvoicesTable tableId="cust-invoices" views={myViews} />
        </div>
      }

      {tab === 'payments' &&
      <div className="space-y-5">
          <ReceiptsTable tableId="cust-receipts" receipts={myReceipts} ledger={ledger} balances={balances} />
          {can('collections.record') &&
        <div className="flex justify-end gap-2">
              {bal.collected > 0 && <Button variant="outline" onClick={() => setRcpt('refund')}><Undo2Icon />{tr('رد مبلغ', 'Refund')}</Button>}
              <Button onClick={() => setRcpt('receipt')}><PlusIcon />{t('quick.receipt')}</Button>
            </div>
        }
        </div>
      }

      {tab === 'documents' && <DocumentsTable tableId="cust-docs" docs={myDocs} isLoading={docs.isLoading} uploadFor={{ entityType: 'customer', entityId: c.id }} showEntity />}

      {tab === 'notes' &&
      <div className="grid gap-5 lg:grid-cols-2">
          <NotesPanel
          notes={c.notes}
          saving={update.isPending}
          onAdd={(note) => update.mutate({ id: c.id, patch: { notes: [...c.notes, note] } }, { onSuccess: () => toast.success(t('common.saved')) })} />
        
          <Panel title={t('common.activity')}>
            <ActivityTimeline entries={myActivity} isLoading={activity.isLoading} />
          </Panel>
        </div>
      }

      <CustomerFormDialog open={editOpen} onClose={() => setEditOpen(false)} customer={c} />
      <ReceiptDialog open={Boolean(rcpt)} kind={rcpt ?? 'receipt'} onClose={() => setRcpt(null)} customerId={c.id} />
    </div>);

}