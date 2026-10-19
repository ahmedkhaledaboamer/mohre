import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Field } from '../ui/Field';
import { Input, Select } from '../ui/Input';
import { customerHooks } from '../../hooks/useApi';
import { useI18n } from '../../hooks/useI18n';
import { useFormError } from '../../hooks/useFormError';
import { useLookups } from '../../hooks/useLookups';
import { nationalities } from '../../data/nationalities';
import { branches } from '../../data/branches';
import { optStr, phone, req } from '../../utils/schemas';
import { todayIso } from '../../utils/dates';
import { errorMessage } from '../../utils/errors';
import type { Customer } from '../../types/crm';

const schema = z.object({
  type: z.enum(['individual', 'corporate']),
  nameAr: req(),
  nameEn: req(),
  contactPerson: optStr(),
  mobile: phone(),
  email: z.string().trim().email('email').or(z.literal('')),
  nationality: req(),
  emiratesIdNo: optStr(),
  address: optStr(),
  status: z.enum(['active', 'prospect', 'inactive', 'archived']),
  assignedUserId: req(),
  branchId: z.enum(['deira', 'business-bay'])
});
type FormValues = z.infer<typeof schema>;

export function CustomerFormDialog({ open, onClose, customer, onSaved }: {open: boolean;onClose: () => void;customer?: Customer;onSaved?: (c: Customer) => void;}) {
  const { t, tr, lang, name } = useI18n();
  const fe = useFormError();
  const lk = useLookups();
  const create = customerHooks.useCreate();
  const update = customerHooks.useUpdate();
  const { register, handleSubmit, reset, watch, formState } = useForm<FormValues>({ resolver: zodResolver(schema) });
  const errors = formState.errors;

  useEffect(() => {
    if (open)
    reset(
      customer ?
      { ...customer, contactPerson: customer.contactPerson ?? '', emiratesIdNo: customer.emiratesIdNo ?? '' } :
      { type: 'individual', nameAr: '', nameEn: '', contactPerson: '', mobile: '+971 ', email: '', nationality: 'IN', emiratesIdNo: '', address: '', status: 'active', assignedUserId: lk.users.find((u) => u.role === 'pro')?.id ?? 'u-pro1', branchId: 'deira' }
    );
  }, [open, customer, reset]);

  const onSubmit = (v: FormValues) => {
    const payload = { ...v, email: v.email ?? '', address: v.address ?? '', contactPerson: v.contactPerson || undefined, emiratesIdNo: v.emiratesIdNo || undefined };
    const done = (c: Customer) => {
      toast.success(customer ? t('common.saved') : t('common.created'));
      onSaved?.(c);
      onClose();
    };
    const fail = (e: unknown) => toast.error(errorMessage(e, lang));
    if (customer) update.mutate({ id: customer.id, patch: payload }, { onSuccess: done, onError: fail });else
    create.mutate({ ...payload, code: '', createdAt: todayIso(), notes: [] }, { onSuccess: done, onError: fail });
  };

  const isCorporate = watch('type') === 'corporate';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={customer ? tr('تعديل بيانات العميل', 'Edit customer') : tr('عميل جديد', 'New customer')}
      description={tr('الحقول المعلّمة بـ * إلزامية', 'Fields marked * are required')}
      footer={
      <>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="customer-form" loading={create.isPending || update.isPending}>
            {t('common.save')}
          </Button>
        </>
      }>
      
      <form id="customer-form" onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Field label={t('common.type')} required>
          <Select {...register('type')}>
            <option value="individual">{t('ctyp.individual')}</option>
            <option value="corporate">{t('ctyp.corporate')}</option>
          </Select>
        </Field>
        <Field label={t('common.status')} required>
          <Select {...register('status')}>
            {['active', 'prospect', 'inactive', 'archived'].map((s) =>
            <option key={s} value={s}>
                {t(`cust.${s}`)}
              </option>
            )}
          </Select>
        </Field>
        <Field label={t('common.nameAr')} required error={fe(errors.nameAr)}>
          <Input {...register('nameAr')} aria-invalid={Boolean(errors.nameAr)} />
        </Field>
        <Field label={t('common.nameEn')} required error={fe(errors.nameEn)}>
          <Input dir="ltr" className="text-start" {...register('nameEn')} aria-invalid={Boolean(errors.nameEn)} />
        </Field>
        {isCorporate &&
        <Field label={tr('الشخص المسؤول', 'Contact person')} className="sm:col-span-2">
            <Input {...register('contactPerson')} />
          </Field>
        }
        <Field label={t('common.mobile')} required error={fe(errors.mobile)}>
          <Input dir="ltr" className="text-start" {...register('mobile')} aria-invalid={Boolean(errors.mobile)} />
        </Field>
        <Field label={t('common.email')} error={fe(errors.email)}>
          <Input dir="ltr" className="text-start" type="email" {...register('email')} aria-invalid={Boolean(errors.email)} />
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
        <Field label={tr('رقم الهوية الإماراتية', 'Emirates ID no.')}>
          <Input dir="ltr" className="text-start" placeholder="784-XXXX-XXXXXXX-X" {...register('emiratesIdNo')} />
        </Field>
        <Field label={tr('العنوان', 'Address')} error={fe(errors.address)} className="sm:col-span-2">
          <Input {...register('address')} aria-invalid={Boolean(errors.address)} />
        </Field>
        <Field label={tr('الموظف المسؤول', 'Assigned employee')} required>
          <Select {...register('assignedUserId')}>
            {lk.users.map((u) =>
            <option key={u.id} value={u.id}>
                {name(u)}
              </option>
            )}
          </Select>
        </Field>
        <Field label={t('common.branch')} required>
          <Select {...register('branchId')}>
            {branches.map((b) =>
            <option key={b.id} value={b.id}>
                {name(b)}
              </option>
            )}
          </Select>
        </Field>
      </form>
    </Dialog>);

}