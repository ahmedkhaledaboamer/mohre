import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArchiveIcon, MoreHorizontalIcon, PencilIcon, PlusIcon } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { DataTable, FilterSelect, RowActions, type Column } from '../../components/tables/DataTable';
import { StatusBadge } from '../../components/status/StatusBadge';
import { Dropdown } from '../../components/ui/Dropdown';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { DaysLeft, Ltr } from '../../components/ui/Display';
import { CompanyFormDialog } from '../../components/crm/CompanyFormDialog';
import { companyHooks } from '../../hooks/useApi';
import { useI18n } from '../../hooks/useI18n';
import { useLookups } from '../../hooks/useLookups';
import { usePermissions } from '../../hooks/usePermissions';
import { useAppSelector } from '../../store/hooks';
import { authorities } from '../../data/authorities';
import { daysUntil } from '../../utils/dates';
import type { Company } from '../../types/crm';

export function Companies() {
  const { t, tr, name, date, lang } = useI18n();
  const { can } = usePermissions();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const branch = useAppSelector((s) => s.ui.branch);
  const lk = useLookups();
  const list = companyHooks.useList();
  const update = companyHooks.useUpdate();
  const [status, setStatus] = useState('all');
  const [jurisdiction, setJurisdiction] = useState('all');
  const [expiry, setExpiry] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Company | undefined>();
  const [archiving, setArchiving] = useState<Company | null>(null);

  useEffect(() => {
    if (params.get('new') === '1') {
      setEditing(undefined);
      setFormOpen(true);
      params.delete('new');
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  const employeeCount = useMemo(() => {
    const m = new Map<string, number>();
    lk.employees.forEach((e) => m.set(e.companyId, (m.get(e.companyId) ?? 0) + 1));
    return m;
  }, [lk.employees]);

  const rows = useMemo(
    () =>
    (list.data ?? []).filter((c) => {
      if (branch !== 'all' && c.branchId !== branch) return false;
      if (status === 'all' ? c.status === 'archived' : c.status !== status) return false;
      if (jurisdiction !== 'all' && c.jurisdiction !== jurisdiction) return false;
      const d = daysUntil(c.licenseExpiry) ?? 999;
      if (expiry === '30' && d > 30) return false;
      if (expiry === '90' && d > 90) return false;
      if (expiry === 'expired' && d >= 0) return false;
      return true;
    }),
    [list.data, branch, status, jurisdiction, expiry]
  );

  const authName = (id: string) => {
    const a = authorities.find((x) => x.id === id);
    return a ? lang === 'ar' ? a.nameAr : a.nameEn : id;
  };

  const columns: Column<Company>[] = [
  { key: 'code', header: tr('الرمز', 'Code'), cell: (c) => <Ltr className="text-xs text-muted">{c.code}</Ltr>, sortValue: (c) => c.code, defaultHidden: true },
  {
    key: 'name',
    header: tr('الشركة', 'Company'),
    alwaysVisible: true,
    cell: (c) =>
    <div>
          <p className="font-medium">{name(c)}</p>
          <p className="text-xs text-muted">{t(`legal.${c.legalForm}`)}</p>
        </div>,

    sortValue: (c) => name(c)
  },
  { key: 'license', header: tr('رقم الرخصة', 'License no.'), cell: (c) => <Ltr className="text-ink-2">{c.licenseNo}</Ltr>, sortValue: (c) => c.licenseNo },
  { key: 'authority', header: tr('سلطة الترخيص', 'Authority'), cell: (c) => <span className="text-ink-2">{authName(c.authority)}</span>, sortValue: (c) => c.authority },
  { key: 'jur', header: tr('الاختصاص', 'Jurisdiction'), cell: (c) => t(`jur.${c.jurisdiction}`), sortValue: (c) => c.jurisdiction },
  { key: 'customer', header: t('common.customer'), cell: (c) => name(lk.customer.get(c.customerId)), defaultHidden: true },
  { key: 'emps', header: t('nav.employees'), cell: (c) => <span className="num">{employeeCount.get(c.id) ?? 0}</span>, sortValue: (c) => employeeCount.get(c.id) ?? 0, align: 'center' },
  {
    key: 'expiry',
    header: tr('انتهاء الرخصة', 'License expiry'),
    cell: (c) =>
    <div>
          <p>{date(c.licenseExpiry)}</p>
          <DaysLeft days={daysUntil(c.licenseExpiry)} />
        </div>,

    sortValue: (c) => c.licenseExpiry
  },
  { key: 'status', header: t('common.status'), cell: (c) => <StatusBadge domain="comp" value={c.status} />, sortValue: (c) => c.status },
  {
    key: 'actions',
    header: '',
    alwaysVisible: true,
    cell: (c) =>
    can('crm.edit') ?
    <RowActions>
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
      
          </RowActions> :
    null
  }];


  return (
    <div>
      <PageHeader
        title={t('nav.companies')}
        description={tr('الرخص التجارية وتواريخ التجديد والموظفون المرتبطون.', 'Trade licenses, renewal dates and linked employees.')}
        crumbs={[{ label: t('nav.companies') }]}
        actions={
        can('crm.edit') &&
        <Button onClick={() => {setEditing(undefined);setFormOpen(true);}}>
              <PlusIcon />
              {t('quick.company')}
            </Button>

        } />
      
      <DataTable
        tableId="companies"
        rows={rows}
        columns={columns}
        getRowId={(c) => c.id}
        searchText={(c) => `${c.nameAr} ${c.nameEn} ${c.licenseNo} ${c.code} ${c.mobile} ${c.email}`}
        searchPlaceholder={tr('اسم الشركة، رقم الرخصة، الجوال…', 'Company, license no., mobile…')}
        onRowClick={(c) => navigate(`/companies/${c.id}`)}
        isLoading={list.isLoading}
        isError={list.isError}
        onRetry={() => list.refetch()}
        exportName="companies"
        initialSort={{ key: 'expiry', dir: 'asc' }}
        toolbar={
        <>
            <FilterSelect label={t('common.status')} value={status} onChange={setStatus} options={[{ value: 'all', label: tr('كل الحالات النشطة', 'All (non-archived)') }, ...['active', 'expired', 'archived'].map((s) => ({ value: s, label: t(`comp.${s}`) }))]} />
            <FilterSelect label={tr('الاختصاص', 'Jurisdiction')} value={jurisdiction} onChange={setJurisdiction} className="sm:w-36" options={[{ value: 'all', label: tr('كل الاختصاصات', 'All jurisdictions') }, { value: 'mainland', label: t('jur.mainland') }, { value: 'freezone', label: t('jur.freezone') }]} />
            <FilterSelect label={tr('انتهاء الرخصة', 'License expiry')} value={expiry} onChange={setExpiry} options={[{ value: 'all', label: tr('أي تاريخ انتهاء', 'Any expiry') }, { value: '30', label: tr('خلال 30 يوماً', 'Within 30 days') }, { value: '90', label: tr('خلال 90 يوماً', 'Within 90 days') }, { value: 'expired', label: tr('منتهية', 'Expired') }]} />
          </>
        }
        empty={{ title: tr('لا توجد شركات', 'No companies') }} />
      
      <CompanyFormDialog open={formOpen} onClose={() => setFormOpen(false)} company={editing} />
      <ConfirmDialog
        open={Boolean(archiving)}
        onClose={() => setArchiving(null)}
        title={tr('أرشفة الشركة', 'Archive company')}
        description={tr('ستُخفى الشركة من القوائم النشطة وتتوقف تنبيهات تجديد الرخصة.', 'The company will be hidden and license reminders stop.')}
        confirmLabel={t('common.archive')}
        loading={update.isPending}
        onConfirm={() => archiving && update.mutate({ id: archiving.id, patch: { status: 'archived' } }, { onSuccess: () => {toast.success(tr('تمت الأرشفة', 'Archived'));setArchiving(null);} })} />
      
    </div>);

}