import type { Lang } from '../types/common';

const messages: Record<string, [string, string]> = {
  NOT_FOUND: ['السجل غير موجود', 'Record not found'],
  INVALID_CREDENTIALS: ['البريد الإلكتروني أو كلمة المرور غير صحيحة', 'Invalid email or password'],
  USER_INACTIVE: ['هذا الحساب معطّل', 'This account is disabled'],
  INVALID_STATE: ['لا يمكن تنفيذ هذا الإجراء في الحالة الحالية', 'Action not allowed in the current state'],
  MANDATORY_INCOMPLETE: ['توجد خطوات إلزامية مرفوضة أو بانتظار العميل', 'Mandatory steps are rejected or waiting on the customer'],
  FORBIDDEN: ['لا تملك صلاحية لتنفيذ هذا الإجراء', 'You are not allowed to perform this action'],
  REASON_REQUIRED: ['يجب إدخال السبب', 'A reason is required'],
  AMOUNT_EXCEEDS_BALANCE: ['المبلغ يتجاوز الرصيد المتبقي', 'Amount exceeds the remaining balance'],
  REFUND_EXCEEDS_COLLECTED: ['مبلغ الرد يتجاوز ما تم تحصيله فعلياً', 'Refund exceeds what was actually collected'],
  INVOICE_NOT_PAYABLE: ['لا يمكن تسجيل دفعة على فاتورة مسودة أو ملغاة', 'Cannot record payment on a draft or cancelled invoice'],
  INVALID_AMOUNT: ['المبلغ غير صالح', 'Invalid amount'],
  DISCOUNT_EXCEEDS_FEE: ['الخصم لا يمكن أن يتجاوز أتعاب المكتب', 'Discount cannot exceed the office fee'],
  SERVICE_REQUIRED: ['اختر خدمة مفعّلة', 'Select an active service'],
  CUSTOMER_REQUIRED: ['اختر العميل', 'Select a customer'],
  COMPANY_REQUIRED: ['هذه الخدمة تتطلب ربطها بشركة', 'This service requires a company'],
  BENEFICIARY_REQUIRED: ['هذه الخدمة تتطلب تحديد المستفيد', 'This service requires a beneficiary'],
  EMPLOYEE_COMPANY_MISMATCH: ['الموظف المستفيد لا يتبع الشركة المختارة', 'The beneficiary employee does not belong to the selected company'],
  OFFICER_REQUIRED: ['اختر موظفاً فعّالاً لتنفيذ المعاملة', 'Select an active officer'],
  ACCOUNT_REQUIRED: ['اختر حساباً فعّالاً', 'Select an active account'],
  CUSTOMER_MISMATCH: ['السجل لا يخص هذا العميل', 'Record does not belong to this customer'],
  TRANSACTION_CANCELLED: ['المعاملة ملغاة', 'The transaction is cancelled'],
  ALREADY_INVOICED: ['المعاملة مضافة إلى فاتورة سارية بالفعل', 'Transaction is already on an active invoice'],
  LINES_REQUIRED: ['أضف بنداً واحداً على الأقل', 'Add at least one line'],
  HAS_FINANCIAL_RECORDS: ['لا يمكن حذف معاملة مرتبطة بسندات أو فواتير', 'Cannot delete a transaction with vouchers or invoices'],
  PAYEE_REQUIRED: ['حدد الجهة أو المورد', 'Specify the payee'],
  SAME_ACCOUNT: ['لا يمكن التحويل إلى نفس الحساب', 'Cannot transfer to the same account'],
  EMAIL_TAKEN: ['البريد الإلكتروني مستخدم لمستخدم آخر', 'Email already used by another user'],
  CANNOT_CHANGE_SELF: ['لا يمكنك تعطيل حسابك أو تغيير دورك', 'You cannot deactivate yourself or change your own role'],
  USE_DEACTIVATE: ['لا يُحذف المستخدم؛ استخدم التعطيل للحفاظ على سجل العمليات', 'Users are deactivated, not deleted, to preserve history']
};

export function errorMessage(err: unknown, lang: Lang) {
  const code = err instanceof Error ? err.message : String(err);
  const m = messages[code];
  if (m) return lang === 'ar' ? m[0] : m[1];
  return lang === 'ar' ? 'حدث خطأ غير متوقع' : 'Unexpected error';
}