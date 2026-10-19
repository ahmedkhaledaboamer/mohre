import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PrinterIcon } from 'lucide-react';
import { Panel } from '../ui/Panel';
import { Ltr, Money } from '../ui/Display';
import { EmptyState } from '../ui/Feedback';
import { StatusBadge } from '../status/StatusBadge';
import { InvoicesTable } from '../shared/EntityTables';
import { useI18n } from '../../hooks/useI18n';
import { useLookups } from '../../hooks/useLookups';
import type { Transaction } from '../../types/cases';
import type { Payment, Receipt } from '../../types/finance';
import { allocatedTo, round2, type InvoiceView, type TxSummary } from '../../utils/finance';
import { cn } from '../../utils/cn';

interface Row {
  id: string;
  date: string;
  createdAt: string;
  number: string;
  kind: 'receipt' | 'refund' | 'payment';
  label: string;
  amount: number;
  userId: string;
  method: string;
  printPath: string;
}

function FinRow({ n, label, value, formula, strong, tone, unknown }: {n: number;label: string;value: number | null;formula?: string;strong?: boolean;tone?: string;unknown?: string;}) {
  return (
    <tr className={cn(strong && 'bg-subtle/40 font-semibold')}>
      <td className="num w-8 px-4 py-2 text-xs text-muted">{n}</td>
      <td className="px-2 py-2">
        <span className="block text-sm">{label}</span>
        {formula && <span className="block text-[11px] text-muted">{formula}</span>}
      </td>
      <td className="px-4 py-2 text-end">{value === null ? <span className="text-xs text-muted">{unknown}</span> : <Money value={value} className={tone} />}</td>
    </tr>);

}

export function CaseFinancials({ tx, summary, receipts, payments, invoices }: {tx: Transaction;summary: TxSummary;receipts: Receipt[];payments: Payment[];invoices: InvoiceView[];}) {
  const { t, tr, date, name, dateTime } = useI18n();
  const lk = useLookups();
  const s = summary;
  const tt = s.totals;

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    receipts.forEach((r) => {
      const amt = Math.abs(allocatedTo(r, tx.id));
      if (!amt) return;
      out.push({ id: r.id, date: r.date, createdAt: r.createdAt, number: r.number, kind: r.kind, label: r.kind === 'refund' ? tr('رد مبلغ للعميل', 'Refund to customer') : tr('تحصيل من العميل', 'Collected from customer'), amount: r.kind === 'refund' ? -amt : amt, userId: r.receivedBy, method: r.method, printPath: `/print/receipt/${r.id}` });
    });
    payments.
    filter((p) => p.transactionId === tx.id).
    forEach((p) => out.push({ id: p.id, date: p.date, createdAt: p.createdAt, number: p.number, kind: 'payment', label: `${t(`pcat.${p.category}`)} — ${p.payeeName}`, amount: -p.amount, userId: p.paidBy, method: p.method, printPath: `/print/payment/${p.id}` }));
    return out.sort((a, b) => (a.date + a.createdAt).localeCompare(b.date + b.createdAt));
  }, [receipts, payments, tx.id, t, tr]);

  const unknownLabel = s.realizedUnknownReason === 'costs_pending' ? tr('غير محدد — توجد تكاليف متوقعة غير مدفوعة', 'Unknown — expected costs still unpaid') : s.realizedUnknownReason === 'cancelled' ? tr('لا ينطبق — معاملة ملغاة', 'N/A — cancelled') : tr('غير محدد — المعاملة لم تكتمل', 'Unknown — not completed yet');

  return (
    <div className="grid gap-5 lg:grid-cols-5">
      <Panel className="lg:col-span-2" title={tr('النموذج المالي للمعاملة', 'Financial model')} description={tr('كل مبلغ منفصل؛ التحصيل والدفع للجهات من السندات الفعلية فقط.', 'Each amount is separate; collected and paid come from actual vouchers only.')} flush>
        <table className="w-full border-t border-line text-sm">
          <tbody className="divide-y divide-line">
            <FinRow n={1} label={t('common.governmentFee')} value={tt.government} />
            <FinRow n={2} label={t('common.providerCost')} value={tt.provider} />
            <FinRow n={3} label={t('common.otherCosts')} value={tt.other} />
            <FinRow n={4} label={t('common.serviceFee')} value={tt.service} />
            <FinRow n={5} label={t('common.discount')} value={-tt.discount} />
            <FinRow n={6} label={`${t('common.vat')} (${tx.fees.vatRate}% — ${t(`vat.${tx.fees.vatTreatment}`)})`} value={tt.vat} formula={tr('على أتعاب المكتب بعد الخصم فقط — التزام ضريبي وليس ربحاً', 'On net office fee only — a liability, not profit')} />
            <FinRow n={7} strong label={t('common.amountDue')} value={tx.status === 'cancelled' ? 0 : tt.due} formula="1 + 2 + 3 + 4 − 5 + 6" />
            <FinRow n={8} label={t('common.collected')} value={s.collected} tone="text-success" formula={s.refunded ? tr(`مستلم ${s.received} − مردود ${s.refunded}`, `received ${s.received} − refunded ${s.refunded}`) : undefined} />
            <FinRow n={9} label={tr('المدفوع فعلياً للجهة/المزود', 'Actually paid to authority/provider')} value={s.paidOut} />
            <FinRow n={10} strong label={t('common.customerBalance')} value={s.customerBalance} formula={tx.status === 'cancelled' ? tr('ملغاة: المحصّل رصيد دائن للعميل', 'Cancelled: collected amount is a customer credit') : '7 − 8'} tone={s.customerBalance > 0 ? 'text-warning' : undefined} />
            <FinRow n={11} strong label={t('common.payable')} value={s.payable} formula={tx.costsFinalized ? tr('التكاليف معتمدة نهائياً', 'Costs finalized') : '(1 + 2 + 3) − 9'} />
            <FinRow n={12} label={t('common.estimatedProfit')} value={s.estimatedProfit} unknown={tr('لا ينطبق', 'N/A')} formula={tr('4 − 5 + 0 (الضريبة ليست إيراداً) − تكاليف يتحملها المكتب', '4 − 5 + 0 (VAT is not revenue) − office-borne costs')} tone="text-primary-strong" />
            <FinRow n={13} strong label={t('common.realizedProfit')} value={s.realizedProfit} unknown={unknownLabel} formula={tr('أتعاب المكتب المعترف بها − (المدفوع فعلياً − التكاليف المستردة من العميل)', 'Recognized office fee − (actual paid − costs recharged)')} />
          </tbody>
        </table>
        <p className="px-5 py-3 text-[11px] leading-relaxed text-muted">
          {tr('معادلات تشغيلية أولية وليست بديلاً عن قواعد المحاسبة النهائية. الرسوم المحصّلة نيابةً عن الجهات الحكومية ليست إيراداً للمكتب.', 'Operational formulas, not a substitute for final accounting rules. Fees collected on behalf of authorities are not office revenue.')}
        </p>
      </Panel>

      <div className="space-y-5 lg:col-span-3">
        <Panel title={tr('سجل الحركات المالية للمعاملة', 'Money movements on this transaction')} description={tr('كل عملية قبض أو صرف مسجلة كسند مستقل بتاريخه وموظفه.', 'Every receipt or payment is a separate voucher with its own date and staff member.')} flush>
          {rows.length === 0 ?
          <EmptyState compact title={tr('لم تُسجَّل أي عملية مالية بعد', 'No money recorded yet')} description={tr('لا يُنشأ تحصيل تلقائياً عند إكمال المعاملة.', 'Completing a transaction never creates a receipt.')} /> :

          <div className="overflow-x-auto border-t border-line">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-subtle/50 text-xs text-muted">
                    <th className="px-4 py-2 text-start">{t('common.date')}</th>
                    <th className="px-4 py-2 text-start">{tr('السند', 'Voucher')}</th>
                    <th className="px-4 py-2 text-start">{t('common.description')}</th>
                    <th className="px-4 py-2 text-start">{t('common.recordedBy')}</th>
                    <th className="px-4 py-2 text-end">{t('common.amount')}</th>
                    <th className="px-2 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((r) =>
                <tr key={r.id}>
                      <td className="whitespace-nowrap px-4 py-2.5">
                        {date(r.date)}
                        <span className="block text-[10px] text-muted">{dateTime(r.createdAt)}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <Ltr className="text-xs font-medium">{r.number}</Ltr>
                        <span className="block">{r.kind === 'payment' ? <span className="text-[11px] text-muted">{tr('سند صرف', 'Payment')}</span> : <StatusBadge domain="rkind" value={r.kind} />}</span>
                      </td>
                      <td className="px-4 py-2.5 text-ink-2">
                        {r.label}
                        <span className="block text-[11px] text-muted">{t(`pay.${r.method}`)}</span>
                      </td>
                      <td className="px-4 py-2.5 text-ink-2">{name(lk.user.get(r.userId))}</td>
                      <td className="px-4 py-2.5 text-end">
                        <Money value={r.amount} className={cn('font-semibold', r.kind === 'receipt' && 'text-success')} />
                      </td>
                      <td className="px-2 py-2.5">
                        <Link to={r.printPath} className="rounded p-1 text-muted hover:bg-subtle hover:text-ink" aria-label={t('common.print')} title={t('common.print')}>
                          <PrinterIcon className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                )}
                  <tr className="bg-subtle/40 text-xs font-medium">
                    <td colSpan={4} className="px-4 py-2">{tr('صافي حركة المعاملة (محصّل − مدفوع)', 'Net (collected − paid)')}</td>
                    <td className="px-4 py-2 text-end"><Money value={round2(s.collected - s.paidOut)} /></td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          }
        </Panel>
        <div>
          <p className="mb-2 text-sm font-semibold">{t('nav.invoices')}</p>
          <InvoicesTable tableId="case-invoices" views={invoices} />
          {invoices.some((v) => v.status !== 'cancelled' && Math.abs(v.totals.due - tt.due) > 0.01 && v.invoice.lines.length === 1) &&
          <p className="mt-2 text-xs text-warning">{tr('تنبيه: رسوم المعاملة عُدّلت بعد إصدار الفاتورة؛ الفاتورة تحتفظ بالأسعار وقت إصدارها.', 'Note: fees changed after invoicing; the invoice keeps its issue-time prices.')}</p>
          }
          <p className="mt-2 text-[11px] text-muted">{tr('العميل', 'Customer')}: <Link className="text-primary hover:underline" to={`/customers/${tx.customerId}`}>{name(lk.customer.get(tx.customerId))}</Link></p>
        </div>
      </div>
    </div>);

}
