import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Field } from '../ui/Field';
import { Input, Select } from '../ui/Input';
import { employeeHooks } from '../../hooks/useApi';
import { useI18n } from '../../hooks/useI18n';
import { useFormError } from '../../hooks/useFormError';
import { useLookups } from '../../hooks/useLookups';
import { nationalities } from '../../data/nationalities';
import { optStr, phone, req } from '../../utils/schemas';
import { todayIso } from '../../utils/dates';
import { errorMessage } from '../../utils/errors';
import type { Employee } from '../../types/crm';

const schema = z.object({
  companyId: req(),
  nameAr: req(),
  nameEn: req(),
  nationality: req(),
  gender: z.enum(['male', 'female']),
  passportNo: req(),
  passportExpiry: req(),
  dateOfBirth: req(),
  mobile: phone(),
  jobTitleAr: req(),
  jobTitleEn: req(),
  visaType: z.enum(['employment', 'investor', 'partner', 'domestic']),
  entryDate: optStr(),
  workPermitNo: optStr(),
  emiratesIdNo: optStr(),
  emiratesIdExpiry: optStr(),
  residenceIssue: optStr(),
  residenceExpiry: optStr(),
  caseOfficerId: req(),
  status: z.enum(['active', 'in_process', 'cancelled'])
});
type FormValues = z.infer<typeof schema>;

export function EmployeeFormDialog({ open, onClose, employee, defaultCompanyId, onSaved }: {open: boolean;onClose: () => void;employee?: Employee;defaultCompanyId?: string;onSaved?: (e: Employee) => void;}) {
  const { t, tr, lang, name } = useI18n();
  const fe = useFormError();
  const lk = useLookups();
  const create = employeeHooks.useCreate();
  const update = employeeHooks.useUpdate();
  const { register, handleSubmit, reset, formState } = useForm<FormValues>({ resolver: zodResolver(schema) });
  const errors = formState.errors;

  useEffect(() => {
    if (!open) return;
    reset(
      employee ?
      {
        ...employee,
        entryDate: employee.entryDate ?? '',
        workPermitNo: employee.workPermitNo ?? '',
        emiratesIdNo: employee.emiratesIdNo ?? '',
        emiratesIdExpiry: employee.emiratesIdExpiry ?? '',
        residenceIssue: employee.residenceIssue ?? '',
        residenceExpiry: employee.residenceExpiry ?? ''
      } :
      {
        companyId: defaultCompanyId ?? lk.companies[0]?.id ?? '',
        nameAr: '',
        nameEn: '',
        nationality: 'IN',
        gender: 'male',
        passportNo: '',
        passportExpiry: '',
        dateOfBirth: '',
        mobile: '+971 ',
        jobTitleAr: '',
        jobTitleEn: '',
        visaType: 'employment',
        entryDate: '',
        workPermitNo: '',
        emiratesIdNo: '',
        emiratesIdExpiry: '',
        residenceIssue: '',
        residenceExpiry: '',
        caseOfficerId: lk.users.find((u) => u.role === 'pro')?.id ?? 'u-pro1',
        status: 'in_process'
      }
    );
    // Reset only when the dialog opens; list refetches must not wipe what the user typed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, employee, reset, defaultCompanyId]);

  const onSubmit = (v: FormValues) => {
    const company = lk.company.get(v.companyId);
    const clean = (s?: string) => s ? s : undefined;
    const payload = {
      ...v,
      customerId: company?.customerId ?? '',
      entryDate: clean(v.entryDate),
      workPermitNo: clean(v.workPermitNo),
      emiratesIdNo: clean(v.emiratesIdNo),
      emiratesIdExpiry: clean(v.emiratesIdExpiry),
      residenceIssue: clean(v.residenceIssue),
      residenceExpiry: clean(v.residenceExpiry),
      workPermitExpiry: clean(v.residenceExpiry)
    };
    const done = (e: Employee) => {
      toast.success(employee ? t('common.saved') : t('common.created'));
      onSaved?.(e);
      onClose();
    };
    const fail = (e: unknown) => toast.error(errorMessage(e, lang));
    if (employee) update.mutate({ id: employee.id, patch: payload }, { onSuccess: done, onError: fail });else
    create.mutate({ ...payload, code: '', createdAt: todayIso() }, { onSuccess: done, onError: fail });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={employee ? tr('تعديل بيانات الموظف', 'Edit employee') : tr('موظف جديد', 'New employee')}
      footer={
      <>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="employee-form" loading={create.isPending || update.isPending}>
            {t('common.save')}
          </Button>
        </>
      }>
      
      <form id="employee-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-2 text-xs font-semibold text-muted">{tr('البيانات الشخصية', 'Personal details')}</legend>
          <Field label={t('common.nameAr')} required error={fe(errors.nameAr)}>
            <Input {...register('nameAr')} aria-invalid={Boolean(errors.nameAr)} />
          </Field>
          <Field label={t('common.nameEn')} required error={fe(errors.nameEn)}>
            <Input dir="ltr" className="text-start" {...register('nameEn')} aria-invalid={Boolean(errors.nameEn)} />
          </Field>
          <Field label={t('common.nationality')} required>
            <Select {...register('nationality')}>
              {nationalities.map((n) =>
              <option key={n.code} value={n.code}>
                  {lang === 'ar' ? n.ar : n.en}
                </option>
              )}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label={tr('الجنس', 'Gender')}>
              <Select {...register('gender')}>
                <option value="male">{tr('ذكر', 'Male')}</option>
                <option value="female">{tr('أنثى', 'Female')}</option>
              </Select>
            </Field>
            <Field label={tr('تاريخ الميلاد', 'Date of birth')} required error={fe(errors.dateOfBirth)}>
              <Input type="date" {...register('dateOfBirth')} aria-invalid={Boolean(errors.dateOfBirth)} />
            </Field>
          </div>
          <Field label={tr('رقم الجواز', 'Passport no.')} required error={fe(errors.passportNo)}>
            <Input dir="ltr" className="text-start" {...register('passportNo')} aria-invalid={Boolean(errors.passportNo)} />
          </Field>
          <Field label={tr('انتهاء الجواز', 'Passport expiry')} required error={fe(errors.passportExpiry)}>
            <Input type="date" {...register('passportExpiry')} aria-invalid={Boolean(errors.passportExpiry)} />
          </Field>
          <Field label={t('common.mobile')} required error={fe(errors.mobile)}>
            <Input dir="ltr" className="text-start" {...register('mobile')} aria-invalid={Boolean(errors.mobile)} />
          </Field>
        </fieldset>
        <fieldset className="grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
          <legend className="mb-2 text-xs font-semibold text-muted">{tr('التوظيف والإقامة', 'Employment & residence')}</legend>
          <Field label={tr('صاحب العمل', 'Employer')} required className="sm:col-span-2">
            <Select {...register('companyId')}>
              {lk.companies.map((c) =>
              <option key={c.id} value={c.id}>
                  {name(c)}
                </option>
              )}
            </Select>
          </Field>
          <Field label={tr('المسمى الوظيفي (عربي)', 'Job title (Arabic)')} required error={fe(errors.jobTitleAr)}>
            <Input {...register('jobTitleAr')} aria-invalid={Boolean(errors.jobTitleAr)} />
          </Field>
          <Field label={tr('المسمى الوظيفي (إنجليزي)', 'Job title (English)')} required error={fe(errors.jobTitleEn)}>
            <Input dir="ltr" className="text-start" {...register('jobTitleEn')} aria-invalid={Boolean(errors.jobTitleEn)} />
          </Field>
          <Field label={tr('نوع التأشيرة', 'Visa type')}>
            <Select {...register('visaType')}>
              {['employment', 'investor', 'partner', 'domestic'].map((v) =>
              <option key={v} value={v}>
                  {t(`visa.${v}`)}
                </option>
              )}
            </Select>
          </Field>
          <Field label={tr('تاريخ الدخول', 'Entry date')}>
            <Input type="date" {...register('entryDate')} />
          </Field>
          <Field label={tr('رقم تصريح العمل', 'Work permit no.')}>
            <Input dir="ltr" className="text-start" {...register('workPermitNo')} />
          </Field>
          <Field label={tr('رقم الهوية', 'Emirates ID no.')}>
            <Input dir="ltr" className="text-start" {...register('emiratesIdNo')} />
          </Field>
          <Field label={tr('انتهاء الهوية', 'Emirates ID expiry')}>
            <Input type="date" {...register('emiratesIdExpiry')} />
          </Field>
          <Field label={tr('إصدار الإقامة', 'Residence issue')}>
            <Input type="date" {...register('residenceIssue')} />
          </Field>
          <Field label={tr('انتهاء الإقامة', 'Residence expiry')}>
            <Input type="date" {...register('residenceExpiry')} />
          </Field>
          <Field label={tr('مسؤول المعاملة', 'Case officer')}>
            <Select {...register('caseOfficerId')}>
              {lk.users.
              filter((u) => u.role === 'pro' || u.role === 'owner').
              map((u) =>
              <option key={u.id} value={u.id}>
                    {name(u)}
                  </option>
              )}
            </Select>
          </Field>
          <Field label={t('common.status')}>
            <Select {...register('status')}>
              {['active', 'in_process', 'cancelled'].map((s) =>
              <option key={s} value={s}>
                  {t(`emp.${s}`)}
                </option>
              )}
            </Select>
          </Field>
        </fieldset>
      </form>
    </Dialog>);

}