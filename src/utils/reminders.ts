import type { Company, Employee } from '../types/crm';
import type { AppSettings, Reminder } from '../types/system';
import type { InvoiceView, TxSummary } from './finance';
import { daysUntil } from './dates';
import { applicable, isOpen } from './cases';

interface ReminderInput {
  employees: Employee[];
  companies: Company[];
  summaries: TxSummary[];
  views: InvoiceView[];
  settings: AppSettings;
}

const severity = (d: number | null): Reminder['severity'] => d === null ? 'info' : d < 0 ? 'critical' : d <= 14 ? 'warning' : 'info';
const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function buildReminders({ employees, companies, summaries, views, settings }: ReminderInput): Reminder[] {
  const r: Reminder[] = [];
  const rd = settings.reminderDays;
  const on = settings.notifications.kinds;

  employees.forEach((e) => {
    const p = daysUntil(e.passportExpiry);
    if (on.passport && p !== null && p <= rd.passport)
    r.push({ id: `pp-${e.id}`, kind: 'passport', severity: severity(p), title: { ar: `جواز سفر ${e.nameAr}`, en: `Passport — ${e.nameEn}` }, subtitle: { ar: e.passportNo, en: e.passportNo }, date: e.passportExpiry, daysLeft: p, link: `/employees/${e.id}` });
    const res = daysUntil(e.residenceExpiry);
    if (on.residence && res !== null && res <= rd.residence)
    r.push({ id: `rs-${e.id}`, kind: 'residence', severity: severity(res), title: { ar: `إقامة ${e.nameAr}`, en: `Residence — ${e.nameEn}` }, subtitle: { ar: 'تجديد الإقامة', en: 'Residence renewal' }, date: e.residenceExpiry, daysLeft: res, link: `/employees/${e.id}` });
    const eid = daysUntil(e.emiratesIdExpiry);
    if (on.emirates_id && eid !== null && eid <= rd.emiratesId)
    r.push({ id: `eid-${e.id}`, kind: 'emirates_id', severity: severity(eid), title: { ar: `هوية ${e.nameAr}`, en: `Emirates ID — ${e.nameEn}` }, subtitle: { ar: e.emiratesIdNo ?? '', en: e.emiratesIdNo ?? '' }, date: e.emiratesIdExpiry, daysLeft: eid, link: `/employees/${e.id}` });
  });

  companies.forEach((c) => {
    const d = daysUntil(c.licenseExpiry);
    if (on.license && d !== null && d <= rd.license && c.status !== 'archived')
    r.push({ id: `lic-${c.id}`, kind: 'license', severity: severity(d), title: { ar: `رخصة ${c.nameAr}`, en: `License — ${c.nameEn}` }, subtitle: { ar: c.licenseNo, en: c.licenseNo }, date: c.licenseExpiry, daysLeft: d, link: `/companies/${c.id}` });
  });

  summaries.forEach(({ tx: t, receivable, payable }) => {
    if (isOpen(t)) {
      if (on.missing_documents && (t.status === 'waiting_documents' || applicable(t).some((s) => s.status === 'waiting_customer')))
      r.push({ id: `md-${t.id}`, kind: 'missing_documents', severity: 'warning', title: { ar: `مستندات ناقصة — ${t.ref}`, en: `Missing documents — ${t.ref}` }, subtitle: { ar: t.titleAr, en: t.titleEn }, daysLeft: null, link: `/transactions/${t.id}` });
      const d = daysUntil(t.dueDate);
      if (on.deadline && d !== null && d <= rd.deadline)
      r.push({ id: `dl-${t.id}`, kind: 'deadline', severity: severity(d), title: { ar: `موعد ${t.ref}`, en: `Deadline — ${t.ref}` }, subtitle: { ar: t.titleAr, en: t.titleEn }, date: t.dueDate, daysLeft: d, link: `/transactions/${t.id}` });
    }
    if (on.overdue_payment && t.status === 'completed' && receivable > 0) {
      const d = daysUntil(t.completedAt);
      r.push({ id: `cb-${t.id}`, kind: 'overdue_payment', severity: d !== null && d < -7 ? 'critical' : 'warning', title: { ar: `مكتملة وغير مسددة — ${t.ref}`, en: `Completed, unpaid — ${t.ref}` }, subtitle: { ar: `متبقٍ على العميل ${fmt(receivable)} د.إ`, en: `Customer owes AED ${fmt(receivable)}` }, date: t.completedAt, daysLeft: d, link: `/transactions/${t.id}` });
    }
    if (on.overdue_payment && t.status === 'completed' && payable > 0)
    r.push({ id: `pp-tx-${t.id}`, kind: 'overdue_payment', severity: 'warning', title: { ar: `رسوم غير مسددة للجهة — ${t.ref}`, en: `Unpaid government/provider cost — ${t.ref}` }, subtitle: { ar: `مستحق للجهة ${fmt(payable)} د.إ`, en: `AED ${fmt(payable)} owed` }, daysLeft: null, link: `/transactions/${t.id}` });
  });

  views.
  filter((v) => v.status === 'overdue').
  forEach((v) => {
    if (on.overdue_payment)
    r.push({ id: `od-${v.invoice.id}`, kind: 'overdue_payment', severity: 'critical', title: { ar: `فاتورة متأخرة ${v.invoice.number}`, en: `Overdue invoice ${v.invoice.number}` }, subtitle: { ar: `متأخرة ${v.daysOverdue} يوم`, en: `${v.daysOverdue} days overdue` }, date: v.invoice.dueDate, daysLeft: -v.daysOverdue, link: `/invoices/${v.invoice.id}` });
  });

  const rank = { critical: 0, warning: 1, info: 2 };
  return r.sort((a, b) => rank[a.severity] - rank[b.severity] || (a.daysLeft ?? 999) - (b.daysLeft ?? 999));
}
