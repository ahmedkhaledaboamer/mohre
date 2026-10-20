import type { ActivityEntry, AppSettings, DocumentRecord, Task } from '../../types/system';
import { dateFromToday } from '../../utils/dates';
import { seedCompanies, seedEmployees, PRO_IDS } from './people';
import { seedTransactions } from './transactions';
import { DEFAULT_INVOICE_TERMS, seedPayments, seedReceipts } from './finance';
import { serviceCatalogSeed } from '../pricing';

let docSeq = 0;
const doc = (d: Omit<DocumentRecord, 'id'>): DocumentRecord => ({ id: `doc-${++docSeq}`, ...d });

export const seedDocuments: DocumentRecord[] = [
...seedEmployees.map((e, i) =>
doc({
  type: 'passport',
  title: `جواز سفر — ${e.nameAr}`,
  fileName: `passport-${e.code.toLowerCase()}.pdf`,
  entityType: 'employee',
  entityId: e.id,
  uploadedAt: e.createdAt,
  expiryDate: e.passportExpiry,
  verification: i % 7 === 3 ? 'pending' : i === 8 ? 'rejected' : 'verified',
  notes: i === 8 ? 'الصورة غير واضحة — مطلوب إعادة المسح' : undefined,
  sizeKb: 420 + i * 11,
  uploadedBy: PRO_IDS[i % 2]
})
),
...seedEmployees.
filter((e) => e.emiratesIdNo).
map((e, i) =>
doc({
  type: 'emirates_id',
  title: `هوية إماراتية — ${e.nameAr}`,
  fileName: `eid-${e.code.toLowerCase()}.pdf`,
  entityType: 'employee',
  entityId: e.id,
  uploadedAt: e.residenceIssue ?? e.createdAt,
  expiryDate: e.emiratesIdExpiry,
  verification: 'verified',
  sizeKb: 310 + i * 7,
  uploadedBy: 'u-pro1'
})
),
...seedCompanies.map((c, i) =>
doc({
  type: 'trade_license',
  title: `رخصة تجارية — ${c.nameAr}`,
  fileName: `license-${c.code.toLowerCase()}.pdf`,
  entityType: 'company',
  entityId: c.id,
  uploadedAt: c.licenseIssue,
  expiryDate: c.licenseExpiry,
  verification: 'verified',
  sizeKb: 520 + i * 13,
  uploadedBy: 'u-pro2'
})
),
...seedTransactions.
filter((t) => t.status !== 'new' && t.status !== 'cancelled').
slice(0, 18).
map((t, i) =>
doc({
  type: t.type === 'formation' ? 'trade_license' : t.serviceId.includes('medical') ? 'medical' : 'passport',
  title: `مستند المعاملة ${t.ref}`,
  fileName: `${t.ref.toLowerCase()}-${i + 1}.pdf`,
  entityType: 'case',
  entityId: t.id,
  uploadedAt: t.transactionDate,
  verification: t.status === 'waiting_documents' ? 'pending' : 'verified',
  sizeKb: 180 + i * 9,
  uploadedBy: t.officerId
})
)];


export const seedTasks: Task[] = [
{ id: 'task-1', title: 'متابعة نتيجة الفحص الطبي مع المركز', assigneeId: 'u-pro2', dueDate: dateFromToday(0), priority: 'high', status: 'open', relatedType: 'case', relatedId: 'trx-2', createdAt: dateFromToday(0), createdBy: 'u-owner' },
{ id: 'task-2', title: 'طلب نسخة جواز جديدة من العميل وإعادة تقديم تعديل الوضع', assigneeId: 'u-pro1', dueDate: dateFromToday(1), priority: 'high', status: 'open', relatedType: 'case', relatedId: 'trx-13', createdAt: dateFromToday(-4), createdBy: 'u-pro1' },
{ id: 'task-3', title: 'تحصيل رسوم تجديد تصريح العمل قبل السداد', assigneeId: 'u-acc', dueDate: dateFromToday(0), priority: 'normal', status: 'open', relatedType: 'case', relatedId: 'trx-8', createdAt: dateFromToday(-2), createdBy: 'u-pro2' },
{ id: 'task-4', title: 'استلام مستندات تجديد رخصة الريادة للشحن', assigneeId: 'u-pro1', dueDate: dateFromToday(-1), priority: 'high', status: 'open', relatedType: 'case', relatedId: 'trx-11', createdAt: dateFromToday(-3), createdBy: 'u-owner' },
{ id: 'task-5', title: 'تحصيل الرصيد المتأخر على المعاملة TRX-2026-0036', assigneeId: 'u-acc', dueDate: dateFromToday(2), priority: 'normal', status: 'open', relatedType: 'case', relatedId: 'trx-36', createdAt: dateFromToday(-4), createdBy: 'u-acc' },
{ id: 'task-6', title: 'حجز موعد البصمات للهوية', assigneeId: 'u-owner', dueDate: dateFromToday(3), priority: 'normal', status: 'open', relatedType: 'case', relatedId: 'trx-4', createdAt: dateFromToday(0), createdBy: 'u-owner' },
{ id: 'task-7', title: 'مراجعة مستندات التأسيس قبل طلب الموافقة المبدئية', assigneeId: 'u-pro1', dueDate: dateFromToday(4), priority: 'normal', status: 'open', relatedType: 'case', relatedId: 'trx-18', createdAt: dateFromToday(-6), createdBy: 'u-owner' },
{ id: 'task-8', title: 'تحديث أسعار الرسوم بعد مراجعة الجهات', assigneeId: 'u-owner', dueDate: dateFromToday(7), priority: 'normal', status: 'open', createdAt: dateFromToday(-1), createdBy: 'u-owner' },
{ id: 'task-9', title: 'تسليم الإقامة الأصلية للعميل', assigneeId: 'u-pro1', dueDate: dateFromToday(-3), priority: 'low', status: 'done', relatedType: 'case', relatedId: 'trx-24', createdAt: dateFromToday(-10), createdBy: 'u-pro1' },
{ id: 'task-10', title: 'متابعة طلب شهادة القرابة المصدقة', assigneeId: 'u-pro2', dueDate: dateFromToday(2), priority: 'normal', status: 'open', relatedType: 'case', relatedId: 'trx-23', createdAt: dateFromToday(-5), createdBy: 'u-pro2' }];


const svcName = new Map(serviceCatalogSeed.map((s) => [s.id, s.nameAr]));

export const seedActivity: ActivityEntry[] = [
...seedTransactions.flatMap((t, i) => {
  const out: ActivityEntry[] = [
  { id: `act-t${i}-a`, entityType: 'case', entityId: t.id, action: 'created', message: { ar: `تسجيل المعاملة ${t.ref} — ${svcName.get(t.serviceId)}`, en: `Registered transaction ${t.ref}` }, userId: t.createdBy, at: t.createdAt }];

  if (t.completedAt) out.push({ id: `act-t${i}-c`, entityType: 'case', entityId: t.id, action: 'completed', message: { ar: `إكمال المعاملة ${t.ref}`, en: `Transaction ${t.ref} completed` }, userId: t.completedBy ?? t.officerId, at: `${t.completedAt}T16:00:00` });
  return out;
}),
...seedReceipts.map<ActivityEntry>((r) => ({
  id: `act-${r.id}`,
  entityType: 'receipt',
  entityId: r.id,
  action: r.kind === 'refund' ? 'refund' : 'created',
  message: r.kind === 'refund' ? { ar: `رد مبلغ ${r.amount} للعميل — ${r.number}`, en: `Refunded ${r.amount} — ${r.number}` } : { ar: `سند قبض ${r.number} بمبلغ ${r.amount}`, en: `Receipt ${r.number} for ${r.amount}` },
  userId: r.receivedBy,
  at: r.createdAt
})),
...seedPayments.map<ActivityEntry>((p) => ({
  id: `act-${p.id}`,
  entityType: 'payment',
  entityId: p.id,
  action: 'created',
  message: { ar: `سند صرف ${p.number} إلى ${p.payeeName} بمبلغ ${p.amount}`, en: `Payment ${p.number} of ${p.amount}` },
  userId: p.paidBy,
  at: p.createdAt
}))].
sort((a, b) => b.at.localeCompare(a.at));

export const defaultSettings: AppSettings = {
  companyNameAr: 'تطوير لخدمات رجال الأعمال',
  companyNameEn: 'Tatweer Business Services',
  trn: '100555123400003',
  address: 'شارع المرقبات، ديرة، دبي — الإمارات العربية المتحدة',
  phone: '+971 4 555 0100',
  email: 'hello@tatweer-demo.ae',
  vatRate: 5,
  invoiceTerms: DEFAULT_INVOICE_TERMS,
  reminderDays: { passport: 180, emiratesId: 30, residence: 30, license: 30, deadline: 3 },
  notifications: {
    inApp: true,
    email: true,
    sms: false,
    dailyDigest: true,
    kinds: { passport: true, emirates_id: true, residence: true, license: true, missing_documents: true, overdue_payment: true, deadline: true }
  },
  pricingConfigured: false
};
