import { useEffect, useMemo, useState } from 'react';
import { GitBranchIcon, PencilIcon, PlusIcon } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { Field } from '../../components/ui/Field';
import { Checkbox, Input, Select, Textarea } from '../../components/ui/Input';
import { DemoPriceTag, Ltr, Money } from '../../components/ui/Display';
import { Tabs } from '../../components/ui/Tabs';
import { DataTable, FilterSelect, RowActions, type Column } from '../../components/tables/DataTable';
import { catalogHooks, usePriceHistory } from '../../hooks/useApi';
import { useI18n } from '../../hooks/useI18n';
import { useLookups } from '../../hooks/useLookups';
import { usePermissions } from '../../hooks/usePermissions';
import { authorities } from '../../data/authorities';
import { workflowTemplates } from '../../data/workflowTemplates';
import { DEMO_PRICE_LABEL } from '../../data/pricing';
import { feeTotals } from '../../utils/finance';
import { todayIso } from '../../utils/dates';
import { errorMessage } from '../../utils/errors';
import type { LinkRequirement, ServiceCatalogItem, ServiceCategory, VatTreatment } from '../../types/catalog';
import type { PriceChange } from '../../types/catalog';

const CATS: ServiceCategory[] = ['residence', 'family', 'visit', 'insurance', 'formation', 'pro', 'other'];
const REQ: LinkRequirement[] = ['required', 'optional', 'none'];
const VAT: VatTreatment[] = ['standard', 'zero', 'exempt', 'out_of_scope'];

const blank = (): Omit<ServiceCatalogItem, 'id'> => ({
  code: '',
  category: 'other',
  authority: 'typing',
  nameAr: '',
  nameEn: '',
  descriptionAr: '',
  governmentFee: 0,
  providerCost: 0,
  otherCosts: 0,
  serviceFee: 0,
  vatTreatment: 'standard',
  requiresCompany: 'optional',
  requiresBeneficiary: 'optional',
  requiredDocuments: [],
  slaDays: 3,
  effectiveFrom: todayIso(),
  active: true,
  isDemoPrice: true,
  notes: ''
});

function ServiceDialog({ open, onClose, service }: {open: boolean;onClose: () => void;service?: ServiceCatalogItem;}) {
  const { t, tr, lang, name } = useI18n();
  const create = catalogHooks.useCreate();
  const update = catalogHooks.useUpdate();
  const [f, setF] = useState(blank());
  const [docs, setDocs] = useState('');
  useEffect(() => {
    if (!open) return;
    const v = service ? { ...service } : blank();
    setF(v);
    setDocs(v.requiredDocuments.join('، '));
  }, [open, service]);
  const num = (k: 'governmentFee' | 'providerCost' | 'otherCosts' | 'serviceFee' | 'slaDays') => ({
    type: 'number',
    min: 0,
    step: k === 'slaDays' ? 1 : 0.01,
    dir: 'ltr' as const,
    value: f[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: Math.max(0, Number(e.target.value) || 0) })
  });
  const save = () => {
    if (!f.nameAr.trim()) return toast.error(tr('الاسم العربي مطلوب', 'Arabic name is required'));
    const payload = { ...f, nameAr: f.nameAr.trim(), nameEn: f.nameEn.trim(), requiredDocuments: docs.split(/[،,\n]/).map((s) => s.trim()).filter(Boolean), templateId: f.templateId || undefined };
    const opts = { onSuccess: () => {toast.success(t('common.saved'));onClose();}, onError: (e: unknown) => toast.error(errorMessage(e, lang)) };
    if (service) update.mutate({ id: service.id, patch: payload }, opts);else create.mutate(payload, opts);
  };
  const tt = feeTotals({ ...f, discount: 0 }, 5);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="xl"
      title={service ? tr('تعديل خدمة', 'Edit service') : tr('خدمة جديدة', 'New service')}
      description={tr('الأسعار تُنسخ إلى المعاملة وقت تسجيلها؛ تعديلها هنا لا يغيّر المعاملات أو الفواتير السابقة.', 'Prices are copied onto a transaction when it is registered; editing here never changes past transactions or invoices.')}
      footer={<><Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button><Button onClick={save} loading={create.isPending || update.isPending}>{t('common.save')}</Button></>}>

      <div className="grid gap-4 sm:grid-cols-4">
        <Field label={t('common.nameAr')} required className="sm:col-span-2"><Input value={f.nameAr} onChange={(e) => setF({ ...f, nameAr: e.target.value })} /></Field>
        <Field label={`${t('common.nameEn')} (${t('common.optional')})`} className="sm:col-span-2"><Input dir="ltr" value={f.nameEn} onChange={(e) => setF({ ...f, nameEn: e.target.value })} /></Field>
        <Field label={t('common.category')}><Select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value as ServiceCategory })}>{CATS.map((c) => <option key={c} value={c}>{t(`cat.${c}`)}</option>)}</Select></Field>
        <Field label={tr('الجهة', 'Authority')}><Select value={f.authority} onChange={(e) => setF({ ...f, authority: e.target.value })}>{authorities.map((a) => <option key={a.id} value={a.id}>{name(a)}</option>)}</Select></Field>
        <Field label={tr('مدة الإنجاز (أيام)', 'SLA (days)')}><Input {...num('slaDays')} /></Field>
        <Field label={t('common.vat')}><Select value={f.vatTreatment} onChange={(e) => setF({ ...f, vatTreatment: e.target.value as VatTreatment })}>{VAT.map((v) => <option key={v} value={v}>{t(`vat.${v}`)}</option>)}</Select></Field>

        <div className="grid grid-cols-2 gap-4 border-t border-line pt-4 sm:col-span-4 sm:grid-cols-5">
          <Field label={t('common.governmentFee')}><Input {...num('governmentFee')} /></Field>
          <Field label={t('common.providerCost')}><Input {...num('providerCost')} /></Field>
          <Field label={t('common.otherCosts')}><Input {...num('otherCosts')} /></Field>
          <Field label={t('common.serviceFee')}><Input {...num('serviceFee')} /></Field>
          <Field label={tr('المستحق الافتراضي (شامل الضريبة)', 'Default due incl. VAT')}><Money value={tt.due} className="flex h-9 items-center font-semibold" /></Field>
        </div>

        <Field label={tr('ربط بشركة', 'Company link')}><Select value={f.requiresCompany} onChange={(e) => setF({ ...f, requiresCompany: e.target.value as LinkRequirement })}>{REQ.map((r) => <option key={r} value={r}>{t(`req.${r}`)}</option>)}</Select></Field>
        <Field label={tr('ربط بمستفيد', 'Beneficiary link')}><Select value={f.requiresBeneficiary} onChange={(e) => setF({ ...f, requiresBeneficiary: e.target.value as LinkRequirement })}>{REQ.map((r) => <option key={r} value={r}>{t(`req.${r}`)}</option>)}</Select></Field>
        <Field label={tr('مسار متعدد الخطوات', 'Multi-step workflow')} className="sm:col-span-2">
          <Select value={f.templateId ?? ''} onChange={(e) => setF({ ...f, templateId: e.target.value || undefined })}>
            <option value="">{tr('خطوة واحدة', 'Single step')}</option>
            {workflowTemplates.map((w) => <option key={w.id} value={w.id}>{tr(w.nameAr, w.nameEn)} ({w.stages.length})</option>)}
          </Select>
        </Field>
        <Field label={tr('المستندات المطلوبة (افصل بفاصلة)', 'Required documents (comma separated)')} className="sm:col-span-4"><Input value={docs} onChange={(e) => setDocs(e.target.value)} /></Field>
        <Field label={t('common.description')} className="sm:col-span-4"><Textarea rows={2} value={f.descriptionAr} onChange={(e) => setF({ ...f, descriptionAr: e.target.value })} /></Field>
        <Checkbox label={tr('الخدمة مفعّلة', 'Active')} checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} />
        <Checkbox className="sm:col-span-3" label={tr(`السعر تجريبي — يظهر عليه "${DEMO_PRICE_LABEL.ar}"`, `Demo price — labeled "${DEMO_PRICE_LABEL.en}"`)} checked={f.isDemoPrice} onChange={(e) => setF({ ...f, isDemoPrice: e.target.checked })} />
      </div>
    </Dialog>);

}

export function ServiceCatalog() {
  const { t, tr, name, dateTime } = useI18n();
  const { can } = usePermissions();
  const lk = useLookups();
  const list = catalogHooks.useList();
  const update = catalogHooks.useUpdate();
  const history = usePriceHistory();
  const [tab, setTab] = useState('services');
  const [cat, setCat] = useState('all');
  const [editing, setEditing] = useState<ServiceCatalogItem | undefined>();
  const [open, setOpen] = useState(false);
  const rows = useMemo(() => (list.data ?? []).filter((s) => cat === 'all' || s.category === cat), [list.data, cat]);

  const columns: Column<ServiceCatalogItem>[] = [
  { key: 'code', header: tr('الرمز', 'Code'), cell: (s) => <Ltr className="text-xs">{s.code}</Ltr>, sortValue: (s) => s.code },
  {
    key: 'name',
    header: tr('الخدمة', 'Service'),
    alwaysVisible: true,
    cell: (s) =>
    <div className="min-w-[200px]">
          <p className="flex items-center gap-1.5 font-medium">
            {s.nameAr}
            {s.templateId && <GitBranchIcon className="h-3.5 w-3.5 text-info" aria-label={tr('متعددة الخطوات', 'Multi-step')} />}
          </p>
          {s.nameEn && <p className="text-xs text-muted">{s.nameEn}</p>}
        </div>,

    sortValue: (s) => s.nameAr
  },
  { key: 'cat', header: t('common.category'), cell: (s) => t(`cat.${s.category}`), sortValue: (s) => s.category },
  { key: 'gov', header: t('common.governmentFee'), cell: (s) => <Money value={s.governmentFee} />, sortValue: (s) => s.governmentFee, align: 'end' },
  { key: 'prov', header: t('common.providerCost'), cell: (s) => <Money value={s.providerCost} />, sortValue: (s) => s.providerCost, align: 'end' },
  { key: 'other', header: t('common.otherCosts'), cell: (s) => <Money value={s.otherCosts} />, sortValue: (s) => s.otherCosts, align: 'end', defaultHidden: true },
  { key: 'fee', header: t('common.serviceFee'), cell: (s) => <Money value={s.serviceFee} className="font-semibold" />, sortValue: (s) => s.serviceFee, align: 'end' },
  { key: 'vat', header: t('common.vat'), cell: (s) => <span className="text-xs">{t(`vat.${s.vatTreatment}`)}</span>, defaultHidden: true },
  { key: 'links', header: tr('شركة / مستفيد', 'Company / beneficiary'), cell: (s) => <span className="text-xs text-ink-2">{t(`req.${s.requiresCompany}`)} / {t(`req.${s.requiresBeneficiary}`)}</span> },
  { key: 'docs', header: tr('المستندات', 'Documents'), cell: (s) => <span className="num text-xs">{s.requiredDocuments.length}</span>, align: 'center', defaultHidden: true },
  { key: 'demo', header: '', cell: (s) => s.isDemoPrice ? <DemoPriceTag /> : null },
  {
    key: 'active',
    header: t('common.status'),
    cell: (s) =>
    can('pricing.edit') ?
    <RowActions>
            <button type="button" onClick={() => update.mutate({ id: s.id, patch: { active: !s.active } }, { onSuccess: () => toast.success(s.active ? tr('تم تعطيل الخدمة', 'Service disabled') : tr('تم تفعيل الخدمة', 'Service enabled')) })} className={s.active ? 'text-xs font-medium text-success hover:underline' : 'text-xs text-muted hover:underline'}>
              {s.active ? tr('مفعّلة', 'Active') : tr('معطّلة', 'Disabled')}
            </button>
          </RowActions> :
    s.active ? tr('مفعّلة', 'Active') : tr('معطّلة', 'Disabled'),
    sortValue: (s) => s.active ? 1 : 0
  },
  { key: 'actions', header: '', alwaysVisible: true, cell: (s) => can('pricing.edit') && <RowActions><Button variant="ghost" size="icon-sm" onClick={() => {setEditing(s);setOpen(true);}} aria-label={t('common.edit')}><PencilIcon /></Button></RowActions> }];

  const histCols: Column<PriceChange>[] = [
  { key: 'at', header: t('common.date'), cell: (h) => dateTime(h.changedAt), sortValue: (h) => h.changedAt },
  { key: 'svc', header: tr('الخدمة', 'Service'), cell: (h) => h.serviceName },
  { key: 'by', header: t('common.recordedBy'), cell: (h) => name(lk.user.get(h.userId)) },
  { key: 'ch', header: tr('التغييرات', 'Changes'), cell: (h) => <span className="text-xs">{h.changes.map((c) => `${c.field}: ${c.from} → ${c.to}`).join(' · ')}</span>, exportValue: (h) => h.changes.map((c) => `${c.field}:${c.from}->${c.to}`).join(' ') }];

  return (
    <div>
      <PageHeader
        title={t('nav.pricing')}
        description={tr(`كتالوج مركزي للخدمات. جميع الأسعار الحالية ${DEMO_PRICE_LABEL.ar} ولا تمثل رسوماً حكومية معتمدة.`, `Central service catalog. All current prices are "${DEMO_PRICE_LABEL.en}" and are not official government fees.`)}
        crumbs={[{ label: t('nav.pricing') }]}
        actions={can('pricing.edit') && <Button onClick={() => {setEditing(undefined);setOpen(true);}}><PlusIcon />{tr('خدمة جديدة', 'New service')}</Button>} />

      <Tabs className="mb-5" value={tab} onChange={setTab} tabs={[{ id: 'services', label: tr('الخدمات', 'Services'), count: list.data?.length }, { id: 'history', label: tr('سجل تغيير الأسعار', 'Price history'), count: history.data?.length }]} />
      {tab === 'services' ?
      <DataTable
        tableId="catalog"
        rows={rows}
        columns={columns}
        getRowId={(s) => s.id}
        searchText={(s) => `${s.code} ${s.nameAr} ${s.nameEn}`}
        isLoading={list.isLoading}
        isError={list.isError}
        onRetry={() => list.refetch()}
        exportName="service-catalog"
        pageSize={25}
        rowClassName={(s) => s.active ? undefined : 'opacity-60'}
        toolbar={<FilterSelect label={t('common.category')} value={cat} onChange={setCat} className="sm:w-52" options={[{ value: 'all', label: tr('كل الفئات', 'All categories') }, ...CATS.map((c) => ({ value: c, label: t(`cat.${c}`) }))]} />} /> :


      <DataTable tableId="price-history" rows={history.data ?? []} columns={histCols} getRowId={(h) => h.id} isLoading={history.isLoading} exportName="price-history" initialSort={{ key: 'at', dir: 'desc' }} empty={{ title: tr('لا توجد تغييرات على الأسعار بعد', 'No price changes yet') }} />
      }
      <ServiceDialog open={open} onClose={() => setOpen(false)} service={editing} />
    </div>);

}
