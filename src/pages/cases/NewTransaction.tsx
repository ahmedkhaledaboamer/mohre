import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Building2Icon, FileTextIcon, GitBranchIcon, PaperclipIcon, PlusIcon, UserPlusIcon, XIcon } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Panel } from '../../components/ui/Panel';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { DemoPriceTag, Money } from '../../components/ui/Display';
import { CustomerFormDialog } from '../../components/crm/CustomerFormDialog';
import { CompanyFormDialog } from '../../components/crm/CompanyFormDialog';
import { EmployeeFormDialog } from '../../components/crm/EmployeeFormDialog';
import { useRegisterTransaction, useSettings } from '../../hooks/useApi';
import { useI18n } from '../../hooks/useI18n';
import { useLookups } from '../../hooks/useLookups';
import { usePermissions } from '../../hooks/usePermissions';
import { CASE_STATUSES, feesFromService } from '../../utils/cases';
import { defaultAccountId, feeTotals, round2 } from '../../utils/finance';
import { todayIso } from '../../utils/dates';
import { requestKey } from '../../utils/random';
import { errorMessage } from '../../utils/errors';
import { cn } from '../../utils/cn';
import type { CaseStatus, TransactionFees } from '../../types/cases';
import type { ServiceCategory } from '../../types/catalog';
import type { PaymentCategory, PaymentMethod } from '../../types/finance';
import type { DocumentType } from '../../types/system';

const CATEGORIES: ServiceCategory[] = ['residence', 'family', 'visit', 'insurance', 'formation', 'pro', 'other'];
const METHODS: PaymentMethod[] = ['cash', 'bank_transfer', 'card', 'cheque'];
type MoneyMode = 'none' | 'full' | 'partial';

interface FormState {
  serviceId: string;
  customerId: string;
  companyId: string;
  benMode: 'employee' | 'name';
  employeeId: string;
  beneficiaryName: string;
  officerId: string;
  transactionDate: string;
  externalRef: string;
  status: CaseStatus;
  priority: 'normal' | 'urgent';
  fees: TransactionFees;
  collectMode: MoneyMode;
  collectAmount: string;
  collectMethod: PaymentMethod;
  collectAccount: string;
  collectRef: string;
  payMode: MoneyMode;
  payAmount: string;
  payMethod: PaymentMethod;
  payAccount: string;
  payCategory: PaymentCategory;
  paySupplier: string;
  payee: string;
  payRef: string;
  note: string;
  attachments: {fileName: string;sizeKb: number;type: DocumentType;}[];
}

const emptyFees: TransactionFees = { governmentFee: 0, providerCost: 0, otherCosts: 0, serviceFee: 0, discount: 0, vatTreatment: 'standard', vatRate: 5 };

function Section({ n, title, hint, children, actions }: {n: number;title: ReactNode;hint?: string;children: ReactNode;actions?: ReactNode;}) {
  return (
    <Panel
      title={
      <span className="flex items-center gap-2">
          <span className="num flex h-5 w-5 items-center justify-center rounded-full bg-primary-soft text-[11px] font-semibold text-primary-strong">{n}</span>
          {title}
        </span>
      }
      description={hint}
      actions={actions}>

      {children}
    </Panel>);

}

function ModeSwitch({ value, onChange, options }: {value: MoneyMode;onChange: (v: MoneyMode) => void;options: {value: MoneyMode;label: string;}[];}) {
  return (
    <div role="radiogroup" className="inline-flex flex-wrap gap-1 rounded-lg border border-line bg-subtle/60 p-1">
      {options.map((o) =>
      <button
        key={o.value}
        type="button"
        role="radio"
        aria-checked={value === o.value}
        onClick={() => onChange(o.value)}
        className={cn('rounded-md px-3 py-1.5 text-xs font-medium transition-colors', value === o.value ? 'bg-surface text-ink shadow-sm ring-1 ring-line' : 'text-muted hover:text-ink')}>

          {o.label}
        </button>
      )}
    </div>);

}

export function NewTransaction() {
  const { t, tr, lang, name } = useI18n();
  const { user, can } = usePermissions();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const lk = useLookups();
  const settings = useSettings();
  const register = useRegisterTransaction();
  const [requestId, setRequestId] = useState(requestKey);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dialog, setDialog] = useState<'customer' | 'company' | 'employee' | null>(null);
  const vatRate = settings.data?.vatRate ?? 5;
  const canReassign = can('cases.reassign') || can('cases.editAny');

  const initial = (): FormState => ({
    serviceId: params.get('service') ?? '',
    customerId: params.get('customer') ?? '',
    companyId: params.get('company') ?? '',
    benMode: 'employee',
    employeeId: params.get('employee') ?? '',
    beneficiaryName: '',
    officerId: user?.id ?? '',
    transactionDate: todayIso(),
    externalRef: '',
    status: 'in_progress',
    priority: 'normal',
    fees: { ...emptyFees, vatRate },
    collectMode: 'none',
    collectAmount: '',
    collectMethod: 'cash',
    collectAccount: '',
    collectRef: '',
    payMode: 'none',
    payAmount: '',
    payMethod: 'card',
    payAccount: '',
    payCategory: 'government_fee',
    paySupplier: '',
    payee: '',
    payRef: '',
    note: '',
    attachments: []
  });
  const [f, setF] = useState<FormState>(initial);
  const set = <K extends keyof FormState,>(k: K, v: FormState[K]) => setF((s) => ({ ...s, [k]: v }));
  const setFee = (k: keyof TransactionFees, v: string) => setF((s) => ({ ...s, fees: { ...s.fees, [k]: v === '' ? 0 : Number(v) } }));

  const svc = lk.service.get(f.serviceId);
  const totals = useMemo(() => feeTotals(f.fees, f.fees.vatRate), [f.fees]);
  const collectAmount = f.collectMode === 'full' ? totals.due : f.collectMode === 'partial' ? Number(f.collectAmount) || 0 : 0;
  const payAmount = f.payMode === 'full' ? totals.directCosts : f.payMode === 'partial' ? Number(f.payAmount) || 0 : 0;

  // Service picked → snapshot its default demo prices and suggest the payee.
  useEffect(() => {
    if (!svc) return;
    const govSupplier = lk.suppliers.find((s) => s.kind === 'government' && (svc.authority === 'mohre' ? s.id === 'sup-gov-lab' : svc.authority === 'det' ? s.id === 'sup-gov-det' : s.id === 'sup-gov-res'));
    const provSupplier = lk.suppliers.find((s) => svc.authority === 'medical' ? s.kind === 'medical' : svc.authority === 'insurer' ? s.kind === 'insurance' : false);
    const providerHeavy = svc.providerCost > svc.governmentFee;
    const sup = providerHeavy ? provSupplier : govSupplier;
    setF((s) => ({
      ...s,
      fees: feesFromService(svc, vatRate),
      payCategory: providerHeavy ? 'provider_cost' : 'government_fee',
      paySupplier: sup?.id ?? '',
      payee: sup?.nameAr ?? ''
    }));
  }, [svc, vatRate, lk.suppliers]);

  useEffect(() => {
    if (!f.officerId && user) set('officerId', user.id);
  }, [user, f.officerId]);

  useEffect(() => set('collectAccount', defaultAccountId(f.collectMethod, lk.accounts)), [f.collectMethod, lk.accounts]);
  useEffect(() => set('payAccount', defaultAccountId(f.payMethod, lk.accounts, f.payCategory === 'government_fee' ? 'gov' : 'out')), [f.payMethod, f.payCategory, lk.accounts]);

  const customer = lk.customer.get(f.customerId);
  const companies = useMemo(() => {
    const mine = lk.companies.filter((c) => c.customerId === f.customerId);
    const others = lk.companies.filter((c) => c.customerId !== f.customerId);
    return { mine, others };
  }, [lk.companies, f.customerId]);
  const employees = useMemo(() => lk.employees.filter((e) => !f.companyId || e.companyId === f.companyId), [lk.employees, f.companyId]);
  const officers = lk.users.filter((u) => u.active && (u.role === 'pro' || u.role === 'owner'));

  // Picking a customer that owns exactly one company pre-selects it.
  useEffect(() => {
    if (!f.customerId || f.companyId || svc?.requiresCompany === 'none') return;
    if (companies.mine.length === 1) set('companyId', companies.mine[0].id);
  }, [f.customerId, companies.mine, f.companyId, svc?.requiresCompany]);

  const validate = () => {
    const e: Record<string, string> = {};
    const req = tr('هذا الحقل مطلوب', 'Required');
    if (!svc) e.serviceId = req;
    if (!f.customerId) e.customerId = req;
    if (svc?.requiresCompany === 'required' && !f.companyId) e.companyId = tr('هذه الخدمة تتطلب شركة', 'This service requires a company');
    const hasBen = f.benMode === 'employee' ? Boolean(f.employeeId) : Boolean(f.beneficiaryName.trim());
    if (svc?.requiresBeneficiary === 'required' && !hasBen) e.beneficiary = tr('حدد المستفيد من الخدمة', 'Specify who the service is for');
    if (!f.officerId) e.officerId = req;
    if (!f.transactionDate) e.transactionDate = req;
    const fees = [f.fees.governmentFee, f.fees.providerCost, f.fees.otherCosts, f.fees.serviceFee, f.fees.discount];
    if (fees.some((n) => !Number.isFinite(n) || n < 0)) e.fees = tr('المبالغ لا يمكن أن تكون سالبة', 'Amounts cannot be negative');
    if (f.fees.discount > f.fees.serviceFee) e.fees = tr('الخصم لا يتجاوز أتعاب المكتب', 'Discount cannot exceed the office fee');
    if (f.collectMode === 'partial' && !(collectAmount > 0)) e.collect = tr('أدخل المبلغ المحصّل', 'Enter the amount collected');
    if (f.collectMode !== 'none' && collectAmount > totals.due + 0.005) e.collect = tr('المبلغ المحصّل أكبر من المستحق', 'Collected exceeds amount due');
    if (f.collectMode !== 'none' && !(collectAmount > 0)) e.collect = tr('لا يوجد مبلغ مستحق للتحصيل', 'Nothing due to collect');
    if (f.collectMode !== 'none' && (f.collectMethod === 'bank_transfer' || f.collectMethod === 'cheque') && !f.collectRef.trim()) e.collectRef = tr('رقم المرجع مطلوب', 'Reference required');
    if (f.payMode === 'partial' && !(payAmount > 0)) e.pay = tr('أدخل المبلغ المدفوع', 'Enter the amount paid');
    if (f.payMode !== 'none' && !(payAmount > 0)) e.pay = tr('لا توجد تكاليف للدفع', 'No costs to pay');
    if (f.payMode !== 'none' && !f.payee.trim()) e.payee = req;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = (another: boolean) => {
    if (!validate()) {
      toast.error(tr('راجع الحقول المطلوبة', 'Please review the required fields'));
      return;
    }
    register.mutate(
      {
        requestId,
        serviceId: f.serviceId,
        customerId: f.customerId,
        companyId: f.companyId || undefined,
        employeeId: f.benMode === 'employee' && f.employeeId ? f.employeeId : undefined,
        beneficiaryName: f.benMode === 'name' ? f.beneficiaryName.trim() || undefined : undefined,
        officerId: f.officerId,
        transactionDate: f.transactionDate,
        externalRef: f.externalRef.trim() || undefined,
        status: f.status,
        priority: f.priority,
        fees: f.fees,
        note: f.note.trim() || undefined,
        collection: f.collectMode === 'none' ? undefined : { amount: round2(collectAmount), method: f.collectMethod, accountId: f.collectAccount, reference: f.collectRef.trim() || undefined },
        costPayment:
        f.payMode === 'none' ?
        undefined :
        { amount: round2(payAmount), method: f.payMethod, accountId: f.payAccount, reference: f.payRef.trim() || undefined, category: f.payCategory, supplierId: f.paySupplier || undefined, payeeName: f.payee.trim() },
        attachments: f.attachments
      },
      {
        onSuccess: (res) => {
          const extra = [res.receipt && tr(`سند قبض ${res.receipt.number}`, `receipt ${res.receipt.number}`), res.payment && tr(`سند صرف ${res.payment.number}`, `payment ${res.payment.number}`)].filter(Boolean).join(' · ');
          toast.success(tr(`تم حفظ المعاملة ${res.transaction.ref}`, `Transaction ${res.transaction.ref} saved`), { description: extra || undefined });
          if (another) {
            setF({ ...initial(), customerId: f.customerId, companyId: f.companyId, officerId: f.officerId });
            setErrors({});
            setRequestId(requestKey());
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } else navigate(`/transactions/${res.transaction.id}`);
        },
        onError: (e) => toast.error(errorMessage(e, lang))
      }
    );
  };

  const reqBadge = (r?: 'required' | 'optional' | 'none') => r ? <span className={cn('ms-1 text-[10px] font-medium', r === 'required' ? 'text-danger' : 'text-muted')}>({t(`req.${r}`)})</span> : null;
  const svcGroups = CATEGORIES.map((c) => ({ c, items: lk.catalog.filter((s) => s.active && s.category === c) })).filter((g) => g.items.length);

  return (
    <div>
      <PageHeader
        title={t('nav.newTransaction')}
        description={tr('سجّل المعاملة التي أنجزتها مع المبالغ الفعلية فقط. لن يُنشأ أي سند قبض أو صرف ما لم تحدد ذلك.', 'Record the work you did with actual amounts only. No receipt or payment voucher is created unless you say so.')}
        crumbs={[{ label: t('nav.transactions'), to: '/transactions' }, { label: t('nav.newTransaction') }]} />


      <form
        className="grid gap-5 xl:grid-cols-[1fr_340px]"
        onSubmit={(e) => {
          e.preventDefault();
          submit(false);
        }}
        noValidate>

        <div className="space-y-5">
          <Section n={1} title={tr('نوع الخدمة', 'Service')}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={tr('الخدمة', 'Service')} required error={errors.serviceId} className="sm:col-span-2">
                <Select value={f.serviceId} onChange={(e) => set('serviceId', e.target.value)} aria-invalid={Boolean(errors.serviceId)} autoFocus>
                  <option value="">{t('common.select')}</option>
                  {svcGroups.map((g) =>
                  <optgroup key={g.c} label={t(`cat.${g.c}`)}>
                      {g.items.map((s) =>
                    <option key={s.id} value={s.id}>
                          {lang === 'ar' ? s.nameAr : s.nameEn || s.nameAr}
                        </option>
                    )}
                    </optgroup>
                  )}
                </Select>
              </Field>
              {svc &&
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted sm:col-span-2">
                  {svc.templateId ?
                <span className="inline-flex items-center gap-1 rounded bg-info-soft px-1.5 py-0.5 text-info">
                      <GitBranchIcon className="h-3 w-3" />
                      {tr('خدمة متعددة الخطوات', 'Multi-step workflow')}
                    </span> :

                <span className="rounded bg-subtle px-1.5 py-0.5">{tr('خدمة بخطوة واحدة', 'Single step')}</span>
                }
                  <span>
                    {tr('الشركة', 'Company')}: {t(`req.${svc.requiresCompany}`)} · {tr('المستفيد', 'Beneficiary')}: {t(`req.${svc.requiresBeneficiary}`)}
                  </span>
                  {svc.requiredDocuments.length > 0 &&
                <span className="inline-flex items-center gap-1">
                      <FileTextIcon className="h-3 w-3" />
                      {svc.requiredDocuments.join('، ')}
                    </span>
                }
                </div>
              }
            </div>
          </Section>

          <Section n={2} title={tr('العميل والشركة', 'Customer & company')}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('common.customer')} required error={errors.customerId}>
                <div className="flex gap-2">
                  <Select value={f.customerId} onChange={(e) => setF((s) => ({ ...s, customerId: e.target.value, companyId: '', employeeId: '' }))} aria-invalid={Boolean(errors.customerId)} className="flex-1">
                    <option value="">{t('common.select')}</option>
                    {lk.customers.filter((c) => c.status !== 'archived').map((c) =>
                    <option key={c.id} value={c.id}>
                        {name(c)} — {c.mobile}
                      </option>
                    )}
                  </Select>
                  {can('crm.edit') &&
                  <Button variant="outline" size="icon" onClick={() => setDialog('customer')} aria-label={t('quick.customer')} title={t('quick.customer')}>
                      <UserPlusIcon />
                    </Button>
                  }
                </div>
              </Field>
              <Field label={<>{t('common.company')}{reqBadge(svc?.requiresCompany)}</>} error={errors.companyId}>
                <div className="flex gap-2">
                  <Select value={f.companyId} onChange={(e) => setF((s) => ({ ...s, companyId: e.target.value, employeeId: '' }))} aria-invalid={Boolean(errors.companyId)} className="flex-1">
                    <option value="">{tr('بدون شركة — معاملة فردية', 'No company — individual')}</option>
                    {companies.mine.length > 0 &&
                    <optgroup label={tr('شركات هذا العميل', "This customer's companies")}>
                        {companies.mine.map((c) => <option key={c.id} value={c.id}>{name(c)}</option>)}
                      </optgroup>
                    }
                    <optgroup label={tr('شركات أخرى', 'Other companies')}>
                      {companies.others.map((c) => <option key={c.id} value={c.id}>{name(c)}</option>)}
                    </optgroup>
                  </Select>
                  {can('crm.edit') &&
                  <Button variant="outline" size="icon" onClick={() => setDialog('company')} aria-label={t('quick.company')} title={t('quick.company')}>
                      <Building2Icon />
                    </Button>
                  }
                </div>
              </Field>
            </div>
          </Section>

          <Section n={3} title={<>{tr('المستفيد من الخدمة', 'Beneficiary')}{reqBadge(svc?.requiresBeneficiary)}</>} hint={tr('الشخص الذي تخصه المعاملة — يختلف عن الموظف الداخلي الذي ينفذها.', 'Who the service is for — not the staff member doing it.')}>
            <div className="space-y-3">
              <div className="inline-flex gap-1 rounded-lg border border-line bg-subtle/60 p-1">
                {(['employee', 'name'] as const).map((m) =>
                <button key={m} type="button" onClick={() => set('benMode', m)} className={cn('rounded-md px-3 py-1.5 text-xs font-medium', f.benMode === m ? 'bg-surface shadow-sm ring-1 ring-line' : 'text-muted')}>
                    {m === 'employee' ? tr('موظف تابع لشركة', 'Company employee') : tr('فرد / أحد أفراد الأسرة / زائر', 'Individual / family / visitor')}
                  </button>
                )}
              </div>
              {f.benMode === 'employee' ?
              <Field label={tr('ملف الموظف المستفيد', 'Beneficiary employee profile')} error={errors.beneficiary} hint={!f.companyId ? tr('اختر الشركة أولاً لعرض موظفيها فقط', 'Pick a company to narrow the list') : undefined}>
                  <div className="flex gap-2">
                    <Select value={f.employeeId} onChange={(e) => set('employeeId', e.target.value)} aria-invalid={Boolean(errors.beneficiary)} className="flex-1">
                      <option value="">{t('common.select')}</option>
                      {employees.map((e) =>
                    <option key={e.id} value={e.id}>
                          {name(e)} — {e.passportNo}
                        </option>
                    )}
                    </Select>
                    {can('crm.edit') &&
                  <Button variant="outline" size="sm" className="h-9" onClick={() => setDialog('employee')} disabled={lk.companies.length === 0}>
                        <PlusIcon />
                        {tr('موظف جديد', 'New employee')}
                      </Button>
                  }
                  </div>
                </Field> :

              <Field label={tr('اسم المستفيد وصلته', 'Beneficiary name & relation')} error={errors.beneficiary}>
                  <Input value={f.beneficiaryName} onChange={(e) => set('beneficiaryName', e.target.value)} placeholder={tr('مثال: سارة محمد (زوجة)', 'e.g. Sara Mohammed (spouse)')} aria-invalid={Boolean(errors.beneficiary)} />
                </Field>
              }
            </div>
          </Section>

          <Section n={4} title={tr('التنفيذ', 'Execution')}>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label={tr('الموظف المسؤول عن التنفيذ', 'Executing officer')} required error={errors.officerId} hint={!canReassign ? tr('تُسجَّل باسمك', 'Registered under your name') : undefined}>
                <Select value={f.officerId} onChange={(e) => set('officerId', e.target.value)} disabled={!canReassign}>
                  {(canReassign ? officers : lk.users.filter((u) => u.id === user?.id)).map((u) =>
                  <option key={u.id} value={u.id}>{name(u)}</option>
                  )}
                </Select>
              </Field>
              <Field label={tr('تاريخ المعاملة', 'Transaction date')} required error={errors.transactionDate}>
                <Input type="date" value={f.transactionDate} max={todayIso()} onChange={(e) => set('transactionDate', e.target.value)} />
              </Field>
              <Field label={tr('الرقم المرجعي لدى الجهة', 'Authority reference no.')} hint={tr('رقم المرجع الداخلي يُولَّد تلقائياً', 'Internal reference is generated')}>
                <Input dir="ltr" className="text-start" value={f.externalRef} onChange={(e) => set('externalRef', e.target.value)} placeholder="MB12345678" />
              </Field>
              <Field label={t('common.status')} required>
                <Select value={f.status} onChange={(e) => set('status', e.target.value as CaseStatus)}>
                  {CASE_STATUSES.filter((s) => s !== 'cancelled').map((s) => <option key={s} value={s}>{t(`case.${s}`)}</option>)}
                </Select>
              </Field>
              <Field label={t('common.priority')}>
                <Select value={f.priority} onChange={(e) => set('priority', e.target.value as 'normal' | 'urgent')}>
                  <option value="normal">{t('prio.normal')}</option>
                  <option value="urgent">{t('prio.urgent')}</option>
                </Select>
              </Field>
            </div>
            {f.status === 'completed' && <p className="mt-3 rounded-md bg-info-soft px-3 py-2 text-xs text-info">{tr('إكمال المعاملة لا يعني أن العميل دفع — سجّل التحصيل أدناه إن تم فعلاً.', 'Completed does not mean paid — record the collection below only if it actually happened.')}</p>}
          </Section>

          <Section
            n={5}
            title={tr('الرسوم والتكاليف', 'Fees & costs')}
            hint={tr('القيم الافتراضية من كتالوج الخدمات ويمكن تعديلها لهذه المعاملة فقط.', 'Defaults come from the catalog and can be adjusted for this transaction only.')}
            actions={svc?.isDemoPrice ? <DemoPriceTag /> : undefined}>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Field label={t('common.governmentFee')}>
                <Input type="number" step="0.01" min="0" dir="ltr" value={f.fees.governmentFee} onChange={(e) => setFee('governmentFee', e.target.value)} />
              </Field>
              <Field label={t('common.providerCost')}>
                <Input type="number" step="0.01" min="0" dir="ltr" value={f.fees.providerCost} onChange={(e) => setFee('providerCost', e.target.value)} />
              </Field>
              <Field label={t('common.otherCosts')}>
                <Input type="number" step="0.01" min="0" dir="ltr" value={f.fees.otherCosts} onChange={(e) => setFee('otherCosts', e.target.value)} />
              </Field>
              <Field label={t('common.serviceFee')}>
                <Input type="number" step="0.01" min="0" dir="ltr" value={f.fees.serviceFee} onChange={(e) => setFee('serviceFee', e.target.value)} />
              </Field>
              <Field label={t('common.discount')} hint={tr('على أتعاب المكتب فقط', 'Office fee only')}>
                <Input type="number" step="0.01" min="0" dir="ltr" value={f.fees.discount} onChange={(e) => setFee('discount', e.target.value)} />
              </Field>
              <Field label={t('common.vat')}>
                <Select value={f.fees.vatTreatment} onChange={(e) => setF((s) => ({ ...s, fees: { ...s.fees, vatTreatment: e.target.value as TransactionFees['vatTreatment'] } }))}>
                  {(['standard', 'zero', 'exempt', 'out_of_scope'] as const).map((v) => <option key={v} value={v}>{t(`vat.${v}`)}</option>)}
                </Select>
              </Field>
            </div>
            {errors.fees && <p className="mt-2 text-xs text-danger">{errors.fees}</p>}
            <Button
              variant="ghost"
              size="sm"
              className="mt-3"
              onClick={() => setF((s) => ({ ...s, fees: { ...s.fees, governmentFee: 0, providerCost: 0, otherCosts: 0 }, payMode: 'none' }))}>

              {tr('الرسوم الحكومية دفعها العميل مباشرة (احتساب أتعاب المكتب فقط)', 'Customer paid authority fees directly (office fee only)')}
            </Button>
          </Section>

          {can('collections.record') &&
          <Section n={6} title={tr('التحصيل من العميل', 'Collection from customer')} hint={tr('سجّل فقط ما استلمته فعلاً الآن. "لم يتم التحصيل" لا يُنشئ سند قبض.', 'Record only money actually received now. "Not collected" creates no receipt.')}>
              <ModeSwitch
              value={f.collectMode}
              onChange={(v) => set('collectMode', v)}
              options={[
              { value: 'none', label: tr('لم يتم التحصيل', 'Not collected') },
              { value: 'full', label: tr('تحصيل كامل المبلغ', 'Collected in full') },
              { value: 'partial', label: tr('تحصيل جزء من المبلغ', 'Partially collected') }]
              } />

              {f.collectMode !== 'none' &&
            <div className="mt-4 grid gap-4 sm:grid-cols-4">
                  <Field label={t('common.amount')} error={errors.collect}>
                    {f.collectMode === 'full' ?
                <Money value={totals.due} className="flex h-9 items-center font-semibold" /> :

                <Input type="number" step="0.01" min="0" dir="ltr" value={f.collectAmount} onChange={(e) => set('collectAmount', e.target.value)} aria-invalid={Boolean(errors.collect)} />
                }
                  </Field>
                  <Field label={t('common.method')}>
                    <Select value={f.collectMethod} onChange={(e) => set('collectMethod', e.target.value as PaymentMethod)}>
                      {METHODS.map((m) => <option key={m} value={m}>{t(`pay.${m}`)}</option>)}
                    </Select>
                  </Field>
                  <Field label={t('common.account')}>
                    <Select value={f.collectAccount} onChange={(e) => set('collectAccount', e.target.value)}>
                      {lk.accounts.filter((a) => a.active).map((a) => <option key={a.id} value={a.id}>{name(a)}</option>)}
                    </Select>
                  </Field>
                  <Field label={t('common.reference')} error={errors.collectRef}>
                    <Input dir="ltr" className="text-start" value={f.collectRef} onChange={(e) => set('collectRef', e.target.value)} />
                  </Field>
                </div>
            }
            </Section>
          }

          {can('payments.record') &&
          <Section n={7} title={tr('الدفع للجهة الحكومية / المزود', 'Payment to authority / provider')} hint={tr('مستقل عن التحصيل: سجّل ما دفعه المكتب فعلاً. غير المدفوع يبقى مستحقاً للجهة.', 'Independent of collection: record what the office actually paid. Anything unpaid stays as payable.')}>
              <ModeSwitch
              value={f.payMode}
              onChange={(v) => set('payMode', v)}
              options={[
              { value: 'none', label: tr('لم يُدفع بعد', 'Not paid yet') },
              { value: 'full', label: tr('دفع كامل التكاليف', 'Paid in full') },
              { value: 'partial', label: tr('دفع جزء من التكاليف', 'Partially paid') }]
              } />

              {f.payMode !== 'none' &&
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <Field label={t('common.amount')} error={errors.pay}>
                    {f.payMode === 'full' ?
                <Money value={totals.directCosts} className="flex h-9 items-center font-semibold" /> :

                <Input type="number" step="0.01" min="0" dir="ltr" value={f.payAmount} onChange={(e) => set('payAmount', e.target.value)} aria-invalid={Boolean(errors.pay)} />
                }
                  </Field>
                  <Field label={t('common.category')}>
                    <Select value={f.payCategory} onChange={(e) => set('payCategory', e.target.value as PaymentCategory)}>
                      {(['government_fee', 'provider_cost', 'other_direct_cost'] as const).map((c) => <option key={c} value={c}>{t(`pcat.${c}`)}</option>)}
                    </Select>
                  </Field>
                  <Field label={tr('الجهة / المورد', 'Payee')} error={errors.payee}>
                    <Select
                  value={f.paySupplier}
                  onChange={(e) => {
                    const s = lk.supplier.get(e.target.value);
                    setF((st) => ({ ...st, paySupplier: e.target.value, payee: s?.nameAr ?? st.payee }));
                  }}>

                      <option value="">{tr('— إدخال يدوي —', '— manual —')}</option>
                      {lk.suppliers.filter((s) => s.active).map((s) => <option key={s.id} value={s.id}>{name(s)}</option>)}
                    </Select>
                  </Field>
                  {!f.paySupplier &&
              <Field label={tr('اسم الجهة', 'Payee name')} error={errors.payee}>
                      <Input value={f.payee} onChange={(e) => set('payee', e.target.value)} />
                    </Field>
              }
                  <Field label={t('common.method')}>
                    <Select value={f.payMethod} onChange={(e) => set('payMethod', e.target.value as PaymentMethod)}>
                      {METHODS.map((m) => <option key={m} value={m}>{t(`pay.${m}`)}</option>)}
                    </Select>
                  </Field>
                  <Field label={tr('من حساب', 'From account')}>
                    <Select value={f.payAccount} onChange={(e) => set('payAccount', e.target.value)}>
                      {lk.accounts.filter((a) => a.active).map((a) => <option key={a.id} value={a.id}>{name(a)}</option>)}
                    </Select>
                  </Field>
                  <Field label={tr('رقم إيصال الجهة', 'Authority receipt no.')}>
                    <Input dir="ltr" className="text-start" value={f.payRef} onChange={(e) => set('payRef', e.target.value)} />
                  </Field>
                </div>
            }
            </Section>
          }

          <Section n={8} title={tr('ملاحظات ومرفقات', 'Notes & attachments')} hint={tr('المرفقات في هذه النسخة تجريبية: يُحفظ اسم الملف وحجمه فقط.', 'Demo attachments: only file name and size are stored.')}>
            <div className="space-y-3">
              <Textarea rows={2} value={f.note} onChange={(e) => set('note', e.target.value)} placeholder={tr('أي ملاحظة عن المعاملة…', 'Any note about the transaction…')} />
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-line-strong px-3 py-2 text-xs text-ink-2 hover:bg-subtle">
                <PaperclipIcon className="h-3.5 w-3.5" />
                {tr('إرفاق ملفات', 'Attach files')}
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []).map((file) => ({ fileName: file.name, sizeKb: Math.max(1, Math.round(file.size / 1024)), type: 'other' as DocumentType }));
                    setF((s) => ({ ...s, attachments: [...s.attachments, ...files] }));
                    e.target.value = '';
                  }} />

              </label>
              {f.attachments.length > 0 &&
              <ul className="flex flex-wrap gap-2">
                  {f.attachments.map((a, i) =>
                <li key={`${a.fileName}-${i}`} className="inline-flex items-center gap-1.5 rounded bg-subtle px-2 py-1 text-xs">
                      <span className="num">{a.fileName}</span>
                      <button type="button" onClick={() => setF((s) => ({ ...s, attachments: s.attachments.filter((_, j) => j !== i) }))} aria-label={t('common.delete')}>
                        <XIcon className="h-3 w-3" />
                      </button>
                    </li>
                )}
                </ul>
              }
            </div>
          </Section>
        </div>

        <aside className="xl:sticky xl:top-20 xl:self-start">
          <Panel title={tr('ملخص المعاملة', 'Summary')}>
            <dl className="space-y-1.5 text-sm">
              {[
              [t('common.governmentFee'), totals.government],
              [t('common.providerCost'), totals.provider],
              [t('common.otherCosts'), totals.other],
              [t('common.serviceFee'), totals.service],
              [t('common.discount'), -totals.discount],
              [`${t('common.vat')} (${f.fees.vatRate}%)`, totals.vat]].
              map(([label, v]) =>
              <div key={label as string} className="flex justify-between">
                  <dt className="text-muted">{label}</dt>
                  <dd><Money value={v as number} /></dd>
                </div>
              )}
              <div className="flex justify-between border-t border-line pt-2 font-semibold">
                <dt>{t('common.amountDue')}</dt>
                <dd><Money value={totals.due} /></dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">{tr('يُحصَّل الآن', 'Collecting now')}</dt>
                <dd><Money value={collectAmount} className="text-success" /></dd>
              </div>
              <div className="flex justify-between font-medium">
                <dt>{t('common.customerBalance')}</dt>
                <dd><Money value={round2(totals.due - collectAmount)} className="text-warning" /></dd>
              </div>
              <div className="flex justify-between border-t border-line pt-2">
                <dt className="text-muted">{tr('يُدفع للجهات الآن', 'Paying authorities now')}</dt>
                <dd><Money value={payAmount} /></dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">{tr('يبقى مستحقاً للجهات', 'Still owed to authorities')}</dt>
                <dd><Money value={round2(Math.max(totals.directCosts - payAmount, 0))} /></dd>
              </div>
              <div className="flex justify-between border-t border-line pt-2">
                <dt className="text-muted">{t('common.estimatedProfit')}</dt>
                <dd><Money value={round2(totals.netService - Math.max(payAmount - totals.directCosts, 0))} className="font-semibold text-primary-strong" /></dd>
              </div>
            </dl>
            <p className="mt-3 text-[11px] leading-relaxed text-muted">
              {tr('الربح المتوقع = أتعاب المكتب − الخصم. الضريبة والرسوم الحكومية ليست إيراداً للمكتب.', 'Estimated profit = office fee − discount. VAT and government fees are not office revenue.')}
            </p>
            {customer && <p className="mt-3 text-xs text-ink-2">{tr('العميل', 'Customer')}: <span className="font-medium">{name(customer)}</span></p>}
            <div className="mt-4 flex flex-col gap-2">
              <Button type="submit" loading={register.isPending} disabled={register.isPending}>
                {tr('حفظ المعاملة', 'Save transaction')}
              </Button>
              <Button variant="outline" onClick={() => submit(true)} disabled={register.isPending}>
                {tr('حفظ وإضافة معاملة أخرى لنفس العميل', 'Save & add another for this customer')}
              </Button>
            </div>
          </Panel>
        </aside>
      </form>

      <CustomerFormDialog open={dialog === 'customer'} onClose={() => setDialog(null)} onSaved={(c) => setF((s) => ({ ...s, customerId: c.id, companyId: '', employeeId: '' }))} />
      <CompanyFormDialog open={dialog === 'company'} onClose={() => setDialog(null)} defaultCustomerId={f.customerId || undefined} onSaved={(c) => setF((s) => ({ ...s, companyId: c.id, customerId: s.customerId || c.customerId, employeeId: '' }))} />
      <EmployeeFormDialog open={dialog === 'employee'} onClose={() => setDialog(null)} defaultCompanyId={f.companyId || undefined} onSaved={(e) => setF((s) => ({ ...s, employeeId: e.id, companyId: s.companyId || e.companyId, benMode: 'employee' }))} />
    </div>);

}
