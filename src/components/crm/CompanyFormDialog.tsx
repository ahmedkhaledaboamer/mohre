import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Field } from '../ui/Field';
import { Input, Select } from '../ui/Input';
import { companyHooks } from '../../hooks/useApi';
import { useI18n } from '../../hooks/useI18n';
import { useFormError } from '../../hooks/useFormError';
import { useLookups } from '../../hooks/useLookups';
import { licensingAuthorities } from '../../data/authorities';
import { branches } from '../../data/branches';
import { email, phone, req } from '../../utils/schemas';
import { todayIso, addDaysIso } from '../../utils/dates';
import { errorMessage } from '../../utils/errors';
import type { Company } from '../../types/crm';

const schema = z.
object({
  customerId: req(),
  nameAr: req(),
  nameEn: req(),
  licenseNo: req(),
  authority: req(),
  jurisdiction: z.enum(['mainland', 'freezone']),
  legalForm: z.enum(['llc', 'sole_establishment', 'fz_llc', 'fze', 'branch', 'civil_company']),
  licenseIssue: req(),
  licenseExpiry: req(),
  activitiesAr: req(),
  activitiesEn: z.string().optional(),
  ownerName: req(),
  contactName: req(),
  mobile: phone(),
  email: email(),
  address: req(),
  status: z.enum(['active', 'expired', 'archived']),
  branchId: z.enum(['deira', 'business-bay'])
}).
refine((v) => v.licenseExpiry > v.licenseIssue, { path: ['licenseExpiry'], message: 'dateOrder' });
type FormValues = z.infer<typeof schema>;

export function CompanyFormDialog({ open, onClose, company, defaultCustomerId, onSaved }: {open: boolean;onClose: () => void;company?: Company;defaultCustomerId?: string;onSaved?: (c: Company) => void;}) {
  const { t, tr, lang, name } = useI18n();
  const fe = useFormError();
  const lk = useLookups();
  const create = companyHooks.useCreate();
  const update = companyHooks.useUpdate();
  const { register, handleSubmit, reset, formState } = useForm<FormValues>({ resolver: zodResolver(schema) });
  const errors = formState.errors;

  useEffect(() => {
    if (!open) return;
    reset(
      company ?
      { ...company, activitiesAr: company.activitiesAr.join('، '), activitiesEn: company.activitiesEn.join(', ') } :
      {
        customerId: defaultCustomerId ?? lk.customers.find((c) => c.type === 'corporate')?.id ?? '',
        nameAr: '',
        nameEn: '',
        licenseNo: '',
        authority: 'det',
        jurisdiction: 'mainland',
        legalForm: 'llc',
        licenseIssue: todayIso(),
        licenseExpiry: addDaysIso(todayIso(), 365),
        activitiesAr: '',
        activitiesEn: '',
        ownerName: '',
        contactName: '',
        mobile: '+971 ',
        email: '',
        address: '',
        status: 'active',
        branchId: 'deira'
      }
    );
    // Reset only when the dialog opens; list refetches must not wipe what the user typed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, company, reset, defaultCustomerId]);

  const onSubmit = (v: FormValues) => {
    const payload = {
      ...v,
      activitiesAr: v.activitiesAr.split(/[،,]/).map((s) => s.trim()).filter(Boolean),
      activitiesEn: (v.activitiesEn ?? '').split(',').map((s) => s.trim()).filter(Boolean)
    };
    const done = (c: Company) => {
      toast.success(company ? t('common.saved') : t('common.created'));
      onSaved?.(c);
      onClose();
    };
    const fail = (e: unknown) => toast.error(errorMessage(e, lang));
    if (company) update.mutate({ id: company.id, patch: payload }, { onSuccess: done, onError: fail });else
    create.mutate({ ...payload, code: '', createdAt: todayIso() }, { onSuccess: done, onError: fail });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={company ? tr('تعديل بيانات الشركة', 'Edit company') : tr('شركة جديدة', 'New company')}
      footer={
      <>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="company-form" loading={create.isPending || update.isPending}>
            {t('common.save')}
          </Button>
        </>
      }>
      
      <form id="company-form" onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Field label={tr('العميل المالك للحساب', 'Account customer')} required error={fe(errors.customerId)} className="sm:col-span-2">
          <Select {...register('customerId')}>
            {lk.customers.map((c) =>
            <option key={c.id} value={c.id}>
                {name(c)} — {c.code}
              </option>
            )}
          </Select>
        </Field>
        <Field label={tr('اسم الشركة بالعربية', 'Company name (Arabic)')} required error={fe(errors.nameAr)}>
          <Input {...register('nameAr')} aria-invalid={Boolean(errors.nameAr)} />
        </Field>
        <Field label={tr('اسم الشركة بالإنجليزية', 'Company name (English)')} required error={fe(errors.nameEn)}>
          <Input dir="ltr" className="text-start" {...register('nameEn')} aria-invalid={Boolean(errors.nameEn)} />
        </Field>
        <Field label={tr('رقم الرخصة التجارية', 'Trade license no.')} required error={fe(errors.licenseNo)}>
          <Input dir="ltr" className="text-start" {...register('licenseNo')} aria-invalid={Boolean(errors.licenseNo)} />
        </Field>
        <Field label={tr('سلطة الترخيص', 'Licensing authority')} required>
          <Select {...register('authority')}>
            {licensingAuthorities.map((a) =>
            <option key={a.id} value={a.id}>
                {lang === 'ar' ? a.nameAr : a.nameEn}
              </option>
            )}
          </Select>
        </Field>
        <Field label={tr('الاختصاص', 'Jurisdiction')} required>
          <Select {...register('jurisdiction')}>
            <option value="mainland">{t('jur.mainland')}</option>
            <option value="freezone">{t('jur.freezone')}</option>
          </Select>
        </Field>
        <Field label={tr('الشكل القانوني', 'Legal form')} required>
          <Select {...register('legalForm')}>
            {['llc', 'sole_establishment', 'fz_llc', 'fze', 'branch', 'civil_company'].map((l) =>
            <option key={l} value={l}>
                {t(`legal.${l}`)}
              </option>
            )}
          </Select>
        </Field>
        <Field label={t('common.issueDate')} required error={fe(errors.licenseIssue)}>
          <Input type="date" {...register('licenseIssue')} />
        </Field>
        <Field label={t('common.expiryDate')} required error={fe(errors.licenseExpiry)}>
          <Input type="date" {...register('licenseExpiry')} aria-invalid={Boolean(errors.licenseExpiry)} />
        </Field>
        <Field label={tr('الأنشطة (بالعربية، مفصولة بفواصل)', 'Activities (Arabic, comma separated)')} required error={fe(errors.activitiesAr)}>
          <Input {...register('activitiesAr')} aria-invalid={Boolean(errors.activitiesAr)} />
        </Field>
        <Field label={tr('الأنشطة (بالإنجليزية)', 'Activities (English)')}>
          <Input dir="ltr" className="text-start" {...register('activitiesEn')} />
        </Field>
        <Field label={tr('المالك', 'Owner')} required error={fe(errors.ownerName)}>
          <Input {...register('ownerName')} aria-invalid={Boolean(errors.ownerName)} />
        </Field>
        <Field label={tr('جهة الاتصال المفوضة', 'Authorized contact')} required error={fe(errors.contactName)}>
          <Input {...register('contactName')} aria-invalid={Boolean(errors.contactName)} />
        </Field>
        <Field label={t('common.mobile')} required error={fe(errors.mobile)}>
          <Input dir="ltr" className="text-start" {...register('mobile')} aria-invalid={Boolean(errors.mobile)} />
        </Field>
        <Field label={t('common.email')} required error={fe(errors.email)}>
          <Input dir="ltr" className="text-start" {...register('email')} aria-invalid={Boolean(errors.email)} />
        </Field>
        <Field label={tr('العنوان', 'Address')} required error={fe(errors.address)}>
          <Input {...register('address')} aria-invalid={Boolean(errors.address)} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label={t('common.status')}>
            <Select {...register('status')}>
              {['active', 'expired', 'archived'].map((s) =>
              <option key={s} value={s}>
                  {t(`comp.${s}`)}
                </option>
              )}
            </Select>
          </Field>
          <Field label={t('common.branch')}>
            <Select {...register('branchId')}>
              {branches.map((b) =>
              <option key={b.id} value={b.id}>
                  {name(b)}
                </option>
              )}
            </Select>
          </Field>
        </div>
      </form>
    </Dialog>);

}