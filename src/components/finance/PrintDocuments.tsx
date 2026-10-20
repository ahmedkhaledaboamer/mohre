import type React from 'react';
import { Ltr, Money } from '../ui/Display';
import { useI18n } from '../../hooks/useI18n';
import { useLookups } from '../../hooks/useLookups';
import { useSettings } from '../../hooks/useApi';
import type { Invoice, Payment, Receipt } from '../../types/finance';
import { lineTotals, type InvoiceView } from '../../utils/finance';
import { DEMO_PRICE_LABEL } from '../../data/pricing';
import { FlagStripe, LogoMark } from '../brand/Logo';

function Letterhead({ title, number, dateIso }: {title: string;number: string;dateIso: string;}) {
  const { tr, date } = useI18n();
  const settings = useSettings();
  const s = settings.data;
  return (
    <>
    <FlagStripe className="mb-4 h-1.5 rounded-full" />
    <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-navy pb-4">
      <div>
        <div className="flex items-center gap-2">
          <LogoMark size={44} />
          <div>
            <p className="text-base font-bold">{s ? tr(s.companyNameAr, s.companyNameEn) : ''}</p>
            <p className="text-[11px] text-muted">{s?.address}</p>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-muted">
          {tr('الرقم الضريبي', 'TRN')}: <Ltr>{s?.trn}</Ltr> · <Ltr>{s?.phone}</Ltr> · <Ltr>{s?.email}</Ltr>
        </p>
      </div>
      <div className="text-end">
        <p className="text-xl font-bold text-navy">{title}</p>
        <p className="mt-1 text-sm"><Ltr className="font-semibold">{number}</Ltr></p>
        <p className="text-xs text-muted">{date(dateIso)}</p>
      </div>
    </header>
    </>);

}

function Party({ label, children }: {label: string;children: React.ReactNode;}) {
  return (
    <div className="rounded-lg border border-line p-3">
      <p className="text-[11px] font-medium text-muted">{label}</p>
      <div className="mt-1 text-sm">{children}</div>
    </div>);

}

function Signatures({ left, right }: {left: string;right: string;}) {
  return (
    <div className="mt-10 grid grid-cols-2 gap-10 text-center text-xs text-muted">
      <div className="border-t border-line-strong pt-2">{left}</div>
      <div className="border-t border-line-strong pt-2">{right}</div>
    </div>);

}

export function InvoiceDocument({ view }: {view: InvoiceView;}) {
  const { t, tr, name, date } = useI18n();
  const lk = useLookups();
  const inv: Invoice = view.invoice;
  const c = lk.customer.get(inv.customerId);
  const co = inv.companyId ? lk.company.get(inv.companyId) : undefined;
  const tt = view.totals;
  const hasDemo = inv.lines.some((l) => l.serviceId && lk.service.get(l.serviceId)?.isDemoPrice);
  return (
    <article className="print-area mx-auto max-w-4xl rounded-xl border border-line bg-surface p-8 shadow-card">
      <Letterhead title={inv.state === 'draft' ? tr('فاتورة — مسودة', 'Invoice — draft') : tr('فاتورة ضريبية', 'Tax invoice')} number={inv.number} dateIso={inv.date} />
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Party label={tr('العميل', 'Bill to')}>
          <p className="font-semibold">{name(c)}</p>
          <p className="text-xs text-muted"><Ltr>{c?.mobile}</Ltr></p>
        </Party>
        <Party label={tr('الشركة', 'Company')}>
          {co ? <><p className="font-semibold">{name(co)}</p><p className="text-xs text-muted"><Ltr>{co.licenseNo}</Ltr></p></> : <p className="text-muted">—</p>}
        </Party>
        <Party label={tr('تفاصيل الفاتورة', 'Details')}>
          <p className="text-xs">{t('common.issueDate')}: {date(inv.date)}</p>
          <p className="text-xs">{t('common.dueDate')}: {date(inv.dueDate)}</p>
          <p className="text-xs">{t('common.status')}: {t(`inv.${view.status}`)}</p>
        </Party>
      </div>
      <table className="mt-6 w-full border-collapse text-sm">
        <thead>
          <tr className="bg-navy text-xs text-white">
            <th className="px-2 py-2 text-start">#</th>
            <th className="px-2 py-2 text-start">{t('common.description')}</th>
            <th className="px-2 py-2 text-center">{t('common.quantity')}</th>
            <th className="px-2 py-2 text-end">{tr('رسوم حكومية وتكاليف', 'Gov. & costs')}</th>
            <th className="px-2 py-2 text-end">{t('common.serviceFee')}</th>
            <th className="px-2 py-2 text-end">{t('common.discount')}</th>
            <th className="px-2 py-2 text-end">{t('common.vat')}</th>
            <th className="px-2 py-2 text-end">{t('common.total')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {inv.lines.map((l, i) => {
            const lt = lineTotals(l, inv.vatRate);
            return (
              <tr key={l.id}>
                <td className="num px-2 py-2 text-muted">{i + 1}</td>
                <td className="px-2 py-2">
                  {tr(l.descriptionAr, l.descriptionEn)}
                  {l.beneficiary && <span className="block text-[11px] text-muted">{l.beneficiary}</span>}
                </td>
                <td className="num px-2 py-2 text-center">{l.quantity}</td>
                <td className="px-2 py-2 text-end"><Money value={lt.directCosts} /></td>
                <td className="px-2 py-2 text-end"><Money value={lt.service} /></td>
                <td className="px-2 py-2 text-end"><Money value={-lt.discount} /></td>
                <td className="px-2 py-2 text-end"><Money value={lt.vat} /></td>
                <td className="px-2 py-2 text-end font-medium"><Money value={lt.due} /></td>
              </tr>);

          })}
        </tbody>
      </table>
      <div className="mt-5 flex flex-wrap justify-between gap-6">
        <div className="max-w-sm text-[11px] leading-relaxed text-muted">
          <p className="font-medium text-ink-2">{tr('الشروط', 'Terms')}</p>
          <p className="mt-1">{inv.terms}</p>
          {inv.notes && <p className="mt-2">{inv.notes}</p>}
          {hasDemo && <p className="mt-2 font-medium text-warning">{tr(DEMO_PRICE_LABEL.ar, DEMO_PRICE_LABEL.en)}</p>}
        </div>
        <dl className="w-72 space-y-1 text-sm">
          <div className="flex justify-between"><dt className="text-muted">{tr('رسوم حكومية ومزودون (أمانات)', 'Government & provider (pass-through)')}</dt><dd><Money value={tt.directCosts} /></dd></div>
          <div className="flex justify-between"><dt className="text-muted">{tr('أتعاب المكتب بعد الخصم', 'Office fees net')}</dt><dd><Money value={tt.netService} /></dd></div>
          <div className="flex justify-between"><dt className="text-muted">{t('common.vat')} ({inv.vatRate}%)</dt><dd><Money value={tt.vat} /></dd></div>
          <div className="flex justify-between border-t-2 border-navy pt-1.5 text-base font-bold"><dt>{t('common.grandTotal')}</dt><dd><Money value={tt.due} /></dd></div>
          <div className="flex justify-between"><dt className="text-muted">{t('common.paid')}</dt><dd><Money value={view.paid} /></dd></div>
          <div className="flex justify-between font-semibold"><dt>{t('common.remaining')}</dt><dd><Money value={view.balance} /></dd></div>
        </dl>
      </div>
      <Signatures left={tr('المحاسب', 'Accountant')} right={tr('توقيع العميل', 'Customer signature')} />
    </article>);

}

export function ReceiptDocument({ receipt, balanceAfter, refOf }: {receipt: Receipt;balanceAfter?: number;refOf: (txId: string) => string;}) {
  const { t, tr, name, dateTime } = useI18n();
  const lk = useLookups();
  const refund = receipt.kind === 'refund';
  return (
    <article className="print-area mx-auto max-w-3xl rounded-xl border border-line bg-surface p-8 shadow-card">
      <Letterhead title={refund ? tr('سند صرف — رد مبلغ لعميل', 'Refund voucher') : tr('سند قبض', 'Receipt voucher')} number={receipt.number} dateIso={receipt.date} />
      <div className="mt-6 space-y-3 text-sm">
        <p>
          {refund ? tr('دُفع إلى السيد/السادة', 'Paid to') : tr('استلمنا من السيد/السادة', 'Received from')}: <span className="font-semibold">{name(lk.customer.get(receipt.customerId))}</span>
        </p>
        <div className="flex items-center gap-3 rounded-lg bg-subtle/70 px-4 py-3">
          <span className="text-muted">{tr('مبلغ وقدره', 'The sum of')}</span>
          <Money value={receipt.amount} className="text-xl font-bold" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Party label={t('common.method')}>{t(`pay.${receipt.method}`)}{receipt.reference && <> — <Ltr>{receipt.reference}</Ltr></>}</Party>
          <Party label={t('common.account')}>{name(lk.account.get(receipt.accountId))}</Party>
          <Party label={tr('وذلك عن', 'For')}>
            {receipt.allocations.length ?
            receipt.allocations.map((a) =>
            <p key={a.transactionId} className="text-xs">
                    <Ltr>{refOf(a.transactionId)}</Ltr> — <Money value={a.amount} />
                  </p>
            ) :
            <p className="text-xs">{tr('دفعة على الحساب', 'On account')}</p>
            }
          </Party>
          <Party label={t('common.recordedBy')}>
            {name(lk.user.get(receipt.receivedBy))}
            <span className="block text-[11px] text-muted">{dateTime(receipt.createdAt)}</span>
          </Party>
        </div>
        {balanceAfter !== undefined &&
        <p className="text-xs text-muted">
            {tr('رصيد العميل بعد هذا السند', 'Customer balance after this voucher')}: <Money value={balanceAfter} className="font-semibold text-ink" />
          </p>
        }
        {receipt.notes && <p className="text-xs text-muted">{receipt.notes}</p>}
      </div>
      <Signatures left={refund ? tr('توقيع المستلم', 'Recipient signature') : tr('توقيع المستلم (المكتب)', 'Received by (office)')} right={refund ? tr('المحاسب', 'Accountant') : tr('توقيع العميل', 'Customer signature')} />
    </article>);

}

export function PaymentDocument({ payment, txRef }: {payment: Payment;txRef?: string;}) {
  const { t, tr, name, dateTime } = useI18n();
  const lk = useLookups();
  return (
    <article className="print-area mx-auto max-w-3xl rounded-xl border border-line bg-surface p-8 shadow-card">
      <Letterhead title={tr('سند صرف', 'Payment voucher')} number={payment.number} dateIso={payment.date} />
      <div className="mt-6 space-y-3 text-sm">
        <p>
          {tr('صُرف إلى', 'Paid to')}: <span className="font-semibold">{payment.payeeName}</span>
        </p>
        <div className="flex items-center gap-3 rounded-lg bg-subtle/70 px-4 py-3">
          <span className="text-muted">{tr('مبلغ وقدره', 'The sum of')}</span>
          <Money value={payment.amount} className="text-xl font-bold" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Party label={t('common.category')}>{t(`pcat.${payment.category}`)}</Party>
          <Party label={tr('المعاملة', 'Transaction')}>{txRef ? <Ltr>{txRef}</Ltr> : '—'}{payment.customerId && <span className="block text-xs text-muted">{name(lk.customer.get(payment.customerId))}</span>}</Party>
          <Party label={t('common.method')}>{t(`pay.${payment.method}`)} — {name(lk.account.get(payment.accountId))}</Party>
          <Party label={t('common.reference')}><Ltr>{payment.reference ?? '—'}</Ltr></Party>
          <Party label={t('common.recordedBy')}>
            {name(lk.user.get(payment.paidBy))}
            <span className="block text-[11px] text-muted">{dateTime(payment.createdAt)}</span>
          </Party>
        </div>
        {payment.notes && <p className="text-xs text-muted">{payment.notes}</p>}
      </div>
      <Signatures left={tr('أعدّه', 'Prepared by')} right={tr('اعتمده', 'Approved by')} />
    </article>);

}
