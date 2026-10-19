import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArchiveIcon, EyeIcon, MoreHorizontalIcon, PencilIcon, PlusIcon, ExternalLinkIcon } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { DataTable, FilterSelect, RowActions, type Column } from '../../components/tables/DataTable';
import { StatusBadge } from '../../components/status/StatusBadge';
import { Dropdown } from '../../components/ui/Dropdown';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Drawer } from '../../components/ui/Drawer';
import { InfoGrid } from '../../components/ui/Panel';
import { Ltr, Money } from '../../components/ui/Display';
import { CustomerFormDialog } from '../../components/crm/CustomerFormDialog';
import { customerHooks } from '../../hooks/useApi';
import { useI18n } from '../../hooks/useI18n';
import { useLookups } from '../../hooks/useLookups';
import { usePermissions } from '../../hooks/usePermissions';
import { useLedger } from '../../hooks/useLedger';
import { isOpen } from '../../utils/cases';
import { useAppSelector } from '../../store/hooks';
import { daysUntil } from '../../utils/dates';
import type { Customer } from '../../types/crm';

export function Customers() {
  const { t, tr, name, date, nat } = useI18n();
  const { can } = usePermissions();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const branch = useAppSelector((s) => s.ui.branch);
  const lk = useLookups();
  const list = customerHooks.useList();
  const update = customerHooks.useUpdate();
  const { ledger } = useLedger({ ignoreBranch: true });

  const [status, setStatus] = useState('all');
  const [type, setType] = useState('all');
  const [assigned, setAssigned] = useState('all');
  const [created, setCreated] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | undefined>();
  const [archiving, setArchiving] = useState<Customer | null>(null);
  const [inspect, setInspect] = useState<Customer | null>(null);

  useEffect(() => {
    if (params.get('new') === '1') {
      setEditing(undefined);
      setFormOpen(true);
      params.delete('new');
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  const balances = useMemo(() => {
    const m = new Map<string, number>();
    ledger.list.forEach((s) => m.set(s.tx.customerId, (m.get(s.tx.customerId) ?? 0) + s.receivable));
    return m;
  }, [ledger.list]);
  const openCases = useMemo(() => {
    const m = new Map<string, number>();
    ledger.transactions.filter(isOpen).forEach((x) => m.set(x.customerId, (m.get(x.customerId) ?? 0) + 1));
    return m;
  }, [ledger.transactions]);

  const rows = useMemo(
    () =>
    (list.data ?? []).filter((c) => {
      if (branch !== 'all' && c.branchId !== branch) return false;
      if (status === 'all' ? c.status === 'archived' : c.status !== status) return false;
      if (type !== 'all' && c.type !== type) return false;
      if (assigned !== 'all' && c.assignedUserId !== assigned) return false;
      if (created !== 'all' && -(daysUntil(c.createdAt) ?? 0) > Number(created)) return false;
      return true;
    }),
    [list.data, branch, status, type, assigned, created]
  );

  const columns: Column<Customer>[] = [
  { key: 'code', header: tr('رقم العميل', 'Customer ID'), cell: (c) => <Ltr className="text-xs font-medium text-muted">{c.code}</Ltr>, sortValue: (c) => c.code },
  {
    key: 'name',
    header: t('common.name'),
    cell: (c) =>
    <div>
          <p className="font-medium">{name(c)}</p>
          {c.contactPerson && <p className="text-xs text-muted">{c.contactPerson}</p>}
        </div>,

    sortValue: (c) => name(c),
    alwaysVisible: true
  },
  { key: 'type', header: t('common.type'), cell: (c) => t(`ctyp.${c.type}`), sortValue: (c) => c.type },
  { key: 'mobile', header: t('common.mobile'), cell: (c) => <Ltr className="text-ink-2">{c.mobile}</Ltr>, exportValue: (c) => c.mobile },
  { key: 'email', header: t('common.email'), cell: (c) => <Ltr className="text-ink-2">{c.email}</Ltr>, exportValue: (c) => c.email, defaultHidden: true },
  { key: 'nat', header: t('common.nationality'), cell: (c) => nat(c.nationality), defaultHidden: true },
  { key: 'assigned', header: tr('المسؤول', 'Assigned'), cell: (c) => name(lk.user.get(c.assignedUserId)), sortValue: (c) => name(lk.user.get(c.assignedUserId)) },
  { key: 'open', header: tr('معاملات مفتوحة', 'Open cases'), cell: (c) => <span className="num">{openCases.get(c.id) ?? 0}</span>, sortValue: (c) => openCases.get(c.id) ?? 0, align: 'center' },
  { key: 'balance', header: tr('الرصيد المستحق', 'Outstanding'), cell: (c) => <Money value={balances.get(c.id) ?? 0} className={(balances.get(c.id) ?? 0) > 0 ? 'font-semibold text-warning' : 'text-muted'} />, sortValue: (c) => balances.get(c.id) ?? 0, align: 'end' },
  { key: 'status', header: t('common.status'), cell: (c) => <StatusBadge domain="cust" value={c.status} />, sortValue: (c) => c.status },
  { key: 'created', header: t('common.createdAt'), cell: (c) => date(c.createdAt), sortValue: (c) => c.createdAt, defaultHidden: true },
  {
    key: 'actions',
    header: '',
    alwaysVisible: true,
    cell: (c) =>
    <RowActions>
          <Button variant="ghost" size="icon-sm" onClick={() => setInspect(c)} aria-label={tr('معاينة سريعة', 'Quick view')}>
            <EyeIcon />
          </Button>
          {can('crm.edit') &&
      <Dropdown
        trigger={({ toggle }) =>
        <Button variant="ghost" size="icon-sm" onClick={toggle} aria-label={t('common.actions')}>
                  <MoreHorizontalIcon />
                </Button>
        }
        items={[
        { label: t('common.edit'), icon: PencilIcon, onSelect: () => {setEditing(c);setFormOpen(true);} },
        { label: t('common.archive'), icon: ArchiveIcon, danger: true, onSelect: () => setArchiving(c), hidden: c.status === 'archived' }]
        } />

      }
        </RowActions>

  }];


  return (
    <div>
      <PageHeader
        title={t('nav.customers')}
        description={tr('الأفراد والشركات الذين يتعامل معهم المكتب، مع أرصدتهم ومعاملاتهم المفتوحة.', 'Individuals and companies served by the office, with balances and open cases.')}
        crumbs={[{ label: t('nav.customers') }]}
        actions={
        can('crm.edit') &&
        <Button onClick={() => {setEditing(undefined);setFormOpen(true);}}>
              <PlusIcon />
              {t('quick.customer')}
            </Button>

        } />
      
      <DataTable
        tableId="customers"
        rows={rows}
        columns={columns}
        getRowId={(c) => c.id}
        searchText={(c) => `${c.nameAr} ${c.nameEn} ${c.code} ${c.mobile} ${c.email} ${c.contactPerson ?? ''}`}
        searchPlaceholder={tr('الاسم، الجوال، البريد، رقم العميل…', 'Name, mobile, email, customer ID…')}
        onRowClick={(c) => navigate(`/customers/${c.id}`)}
        isLoading={list.isLoading}
        isError={list.isError}
        onRetry={() => list.refetch()}
        exportName="customers"
        initialSort={{ key: 'code', dir: 'asc' }}
        toolbar={
        <>
            <FilterSelect label={t('common.status')} value={status} onChange={setStatus} options={[{ value: 'all', label: tr('كل الحالات النشطة', 'All (non-archived)') }, ...['active', 'prospect', 'inactive', 'archived'].map((s) => ({ value: s, label: t(`cust.${s}`) }))]} />
            <FilterSelect label={t('common.type')} value={type} onChange={setType} className="sm:w-32" options={[{ value: 'all', label: tr('كل الأنواع', 'All types') }, { value: 'individual', label: t('ctyp.individual') }, { value: 'corporate', label: t('ctyp.corporate') }]} />
            <FilterSelect label={tr('المسؤول', 'Assigned')} value={assigned} onChange={setAssigned} options={[{ value: 'all', label: tr('كل الموظفين', 'All staff') }, ...lk.users.map((u) => ({ value: u.id, label: name(u) }))]} />
            <FilterSelect label={t('common.createdAt')} value={created} onChange={setCreated} className="sm:w-36" options={[{ value: 'all', label: tr('أي تاريخ', 'Any date') }, { value: '30', label: tr('آخر 30 يوماً', 'Last 30 days') }, { value: '90', label: tr('آخر 90 يوماً', 'Last 90 days') }, { value: '365', label: tr('آخر سنة', 'Last year') }]} />
          </>
        }
        empty={{ title: tr('لا يوجد عملاء', 'No customers'), action: can('crm.edit') ? <Button onClick={() => setFormOpen(true)}>{t('quick.customer')}</Button> : undefined }} />
      

      <CustomerFormDialog open={formOpen} onClose={() => setFormOpen(false)} customer={editing} />

      <ConfirmDialog
        open={Boolean(archiving)}
        onClose={() => setArchiving(null)}
        title={tr('أرشفة العميل', 'Archive customer')}
        description={tr(`سيتم إخفاء «${archiving ? name(archiving) : ''}» من القوائم النشطة مع الاحتفاظ بكامل سجله المالي.`, `"${archiving ? name(archiving) : ''}" will be hidden from active lists; financial history is kept.`)}
        confirmLabel={t('common.archive')}
        loading={update.isPending}
        onConfirm={() =>
        archiving &&
        update.mutate(
          { id: archiving.id, patch: { status: 'archived' } },
          { onSuccess: () => {toast.success(tr('تمت الأرشفة', 'Archived'));setArchiving(null);} }
        )
        } />
      

      <Drawer
        open={Boolean(inspect)}
        onClose={() => setInspect(null)}
        title={inspect ? name(inspect) : ''}
        subtitle={inspect && <Ltr>{inspect.code}</Ltr>}
        footer={
        inspect &&
        <Button onClick={() => navigate(`/customers/${inspect.id}`)}>
              <ExternalLinkIcon />
              {tr('فتح الملف الكامل', 'Open full profile')}
            </Button>

        }>
        
        {inspect &&
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-subtle/70 p-3">
                <p className="text-xs text-muted">{tr('الرصيد المستحق', 'Outstanding')}</p>
                <Money value={balances.get(inspect.id) ?? 0} className="mt-1 block text-lg font-semibold" />
              </div>
              <div className="rounded-lg bg-subtle/70 p-3">
                <p className="text-xs text-muted">{tr('معاملات مفتوحة', 'Open cases')}</p>
                <p className="num mt-1 text-lg font-semibold">{openCases.get(inspect.id) ?? 0}</p>
              </div>
            </div>
            <InfoGrid
            items={[
            { label: t('common.type'), value: t(`ctyp.${inspect.type}`) },
            { label: t('common.status'), value: <StatusBadge domain="cust" value={inspect.status} /> },
            { label: t('common.mobile'), value: <Ltr>{inspect.mobile}</Ltr> },
            { label: t('common.email'), value: <Ltr>{inspect.email}</Ltr> },
            { label: t('common.nationality'), value: nat(inspect.nationality) },
            { label: tr('المسؤول', 'Assigned'), value: name(lk.user.get(inspect.assignedUserId)) },
            { label: t('common.branch'), value: t(`branch.${inspect.branchId}`) },
            { label: t('common.createdAt'), value: date(inspect.createdAt) }]
            } />
          
          </div>
        }
      </Drawer>
    </div>);

}