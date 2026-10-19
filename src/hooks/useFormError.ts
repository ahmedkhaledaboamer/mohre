import { useCallback } from 'react';
import type { FieldError } from 'react-hook-form';
import { useI18n } from './useI18n';

const codes: Record<string, [string, string]> = {
  required: ['هذا الحقل مطلوب', 'This field is required'],
  email: ['بريد إلكتروني غير صالح', 'Invalid email address'],
  phone: ['رقم جوال غير صالح', 'Invalid mobile number'],
  positive: ['يجب أن تكون القيمة أكبر من صفر', 'Must be greater than zero'],
  nonNegative: ['لا يمكن أن تكون القيمة سالبة', 'Cannot be negative'],
  dateOrder: ['تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء', 'End date must be after start date'],
  lines: ['أضف بنداً واحداً على الأقل', 'Add at least one line item'],
  exceeds: ['المبلغ يتجاوز الرصيد المتبقي', 'Amount exceeds remaining balance'],
  reference: ['رقم المرجع مطلوب لغير النقد', 'Reference required for non-cash payments'],
  account: ['اختر الحساب', 'Select an account']
};

/** Maps zod message codes to localized text. */
export function useFormError() {
  const { lang } = useI18n();
  return useCallback(
    (err?: FieldError | {message?: string;}) => {
      if (!err?.message) return undefined;
      const c = codes[err.message];
      return c ? lang === 'ar' ? c[0] : c[1] : err.message;
    },
    [lang]
  );
}