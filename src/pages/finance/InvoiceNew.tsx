import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PlusIcon, Trash2Icon } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '../../components/ui/PageHeader';
import { Panel } from '../../components/ui/Panel';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { Checkbox, Input, Select, Textarea } from '../../components/ui/Input';
import { Ltr, Money } from '../../components/ui/Display';
import { EmptyState } from '../../components/ui/Feedback';
import { StatusBadge } from '../../components/status/StatusBadge';
import { useCreateInvoice, useSettings } from '../../hooks/useApi';
import { useLedger } from '../../hooks/useLedger';
import { useI18n } from '../../hooks/useI18n';
import { useLookups } from '../../hooks/useLookups';
import { addDaysIso, todayIso } from '../../utils/dates';
import { addTotals, feeTotals, sumTotals, type FeeTotals } from '../../utils/finance';
import { requestKey } from '../../utils/random';
import { errorMessage } from '../../utils/errors';
import type { LineItem } from '../../types/finance';

type Extra = Omit<LineItem, 'id'> & {key: string;};

/** Invoice from one or more of a customer's transactions, plus optional ad-hoc service lines. */
export function InvoiceNew() {
  const { t, tr, lang, name, date } = useI18n();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const lk = useLookups();
  const settings = useSettings();
  const { ledger, invoiceViews } = useLedger({ ignoreBranch: true });
  const create = useCreateInvoice();
  const [requestId] = useState(requestKey);
  const [customerId, setCustomerId] = useState(params.get('customer') ?? '');
  const [selected, setSelected] = useState<string[]>(params.get('transaction') ? [params.get('transaction')!] : []);
  const [extras, setExtras] = useState<Extra[]>([]);
  const [dateIso, setDate] = useState(todayIso());
  const [dueDate, setDueDate] = useState(addDaysIso(todayIso(), 14));
  const [notes, setNotes] = useState('');
  const vatRate = settings.data?.vatRate ?? 5;

  const invoiced = useMemo(() => new Set(invoiceViews.filter((v) => v.invoice.state !== 'cancelled').flatMap((v) => v.invoice.lines.map((l) => l.transactionId).filter(Boolean) as string[])), [invoiceViews]);
  const candidates = useMemo(() => ledger.list.filter((s) => s.tx.customerId === customerId && s.tx.status !== 'cancelled' && !invoiced.has(s.tx.id)).sort((a, b) => b.tx.createdAt.localeCompare(a.tx.createdAt)), [ledger.list, customerId, invoiced]);

  useEffect(() => {
    setSelected((sel) => sel.filter((id) => candidates.some((c) => c.tx.id === id)));
  }, [candidates]);

  const totals = useMemo(() => {
    let tt = selected.map((id) => ledger.summaries.get(id)).filter(Boolean).reduce<FeeTotals>((acc, s) => addTotals(acc, feeTotals(s!.tx.fees, vatRate)), sumTotals([], vatRate));
    tt = addTotals(tt, sumTotals(extras.map((e) => ({ ...e, id: e.key })), vatRate));
    return tt;
  }, [selected, extras, ledger.summaries, vatRate]);

  const addExtra = (serviceId: string) => {
    const s = lk.service.get(serviceId);
    if (!s) return;
    setExtras((x) => [...x, { key: requestKey(), serviceId: s.id, descriptionAr: s.nameAr, descriptionEn: s.nameEn, quantity: 1, governmentFee: s.governmentFee, providerCost: s.providerCost, otherCosts: s.otherCosts, serviceFee: s.serviceFee, discount: 0, vatTreatment: s.vatTreatment }]);
  };
  const setExtra = (key: string, patch: Partial<Extra>) => setExtras((x) => x.map((e) => e.key === key ? { ...e, ...patch } : e));

  const submit = (state: 'draft' | 'issued') => {
    if (!customerId) return toast.error(tr('اختر العميل', 'Select a customer'));
    if (!selected.length && !extras.length) return toast.error(tr('أضف معاملة أو بنداً واحداً على الأقل', 'Add at least one transaction or line'));
    create.mutate(
      { requestId, customerId, transactionIds: selected, extraLines: extras.map(({ key: _k, ...l }) => l), date: dateIso, dueDate, state, notes },
      {
        onSuccess: (inv) => {
          toast.success(tr(`تم إنشاء الفاتورة ${inv.number}`, `Invoice ${inv.number} created`));
          navigate(`/invoices/${inv.id}`);
        },
        onError: (e) => toast.error(errorMessage(e, lang))
      }
    );
  };

  return (
    <div>
      <PageHeader title={t('quick.invoice')} description={tr('تُحفظ أسعار البنود كما هي وقت الإصدار ولا تتأثر بتغيير الأسعار لاحقاً.', 'Line prices are frozen at issue time.')} crumbs={[{ label: t('nav.invoices'), to: '/invoices' }, { label: t('quick.invoice') }]} />
      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <Panel title={tr('العميل', 'Customer')}>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label={t('common.customer')} required>
                <Select value={customerId} onChange={(e) => {setCustomerId(e.target.value);setSelected([]);}}>
                  <option value="">{t('common.select')}</option>
                  {lk.customers.map((c) => <option key={c.id} value={c.id}>{name(c)}</option>)}
                </Select>
              </Field>
              <Field label={t('common.issueDate')}>
                <Input type="date" value={dateIso} onChange={(e) => setDate(e.target.value)} />
              </Field>
              <Field label={t('common.dueDate')}>
                <Input type="date" value={dueDate} min={dateIso} onChange={(e) => setDueDate(e.target.value)} />
              </Field>
            </div>
          </Panel>

          <Panel title={tr('معاملات العميل غير المفوترة', "Customer's uninvoiced transactions")} description={tr('لا يمكن إضافة معاملة لأكثر من فاتورة سارية.', 'A transaction can be on only one active invoice.')} flush>
            {!customerId ?
            <EmptyState compact title={tr('اختر العميل أولاً', 'Select a customer first')} /> :
            candidates.length === 0 ?
            <EmptyState compact title={tr('لا توجد معاملات غير مفوترة', 'No uninvoiced transactions')} /> :

            <ul className="divide-y divide-line border-t border-line">
                {candidates.map((s) =>
              <li key={s.tx.id} className="flex items-center gap-3 px-5 py-2.5">
                    <Checkbox checked={selected.includes(s.tx.id)} onChange={(e) => setSelected((sel) => e.target.checked ? [...sel, s.tx.id] : sel.filter((x) => x !== s.tx.id))} aria-label={s.tx.ref} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{tr(s.tx.titleAr, s.tx.titleEn)}</span>
                      <span className="text-[11px] text-muted"><Ltr>{s.tx.ref}</Ltr> · {date(s.tx.transactionDate)}</span>
                    </span>
                    <StatusBadge domain="case" value={s.tx.status} />
                    <Money value={s.totals.due} className="w-28 text-end text-sm" />
                  </li>
              )}
              </ul>
            }
          </Panel>

          <Panel
            title={tr('بنود إضافية (خدمات بدون معاملة)', 'Additional lines (services without a transaction)')}
            actions={
            <Select value="" onChange={(e) => addExtra(e.target.value)} className="w-56">
                <option value="">{tr('+ إضافة خدمة…', '+ Add service…')}</option>
                {lk.catalog.filter((s) => s.active).map((s) => <option key={s.id} value={s.id}>{tr(s.nameAr, s.nameEn || s.nameAr)}</option>)}
              </Select>
            }>

            {extras.length === 0 ?
            <p className="text-xs text-muted">{tr('اختياري.', 'Optional.')}</p> :

            <div className="space-y-3">
                {extras.map((e) =>
              <div key={e.key} className="grid grid-cols-2 items-end gap-2 rounded-lg border border-line p-3 sm:grid-cols-7">
                    <Field label={t('common.description')} className="col-span-2">
                      <Input value={e.descriptionAr} onChange={(ev) => setExtra(e.key, { descriptionAr: ev.target.value })} />
                    </Field>
                    <Field label={t('common.quantity')}>
                      <Input type="number" min="1" dir="ltr" value={e.quantity} onChange={(ev) => setExtra(e.key, { quantity: Math.max(1, Number(ev.target.value) || 1) })} />
                    </Field>
                    <Field label={t('common.governmentFee')}>
                      <Input type="number" min="0" dir="ltr" value={e.governmentFee} onChange={(ev) => setExtra(e.key, { governmentFee: Number(ev.target.value) || 0 })} />
                    </Field>
                    <Field label={t('common.serviceFee')}>
                      <Input type="number" min="0" dir="ltr" value={e.serviceFee} onChange={(ev) => setExtra(e.key, { serviceFee: Number(ev.target.value) || 0 })} />
                    </Field>
                    <Field label={t('common.discount')}>
                      <Input type="number" min="0" dir="ltr" value={e.discount} onChange={(ev) => setExtra(e.key, { discount: Number(ev.target.value) || 0 })} />
                    </Field>
                    <Button variant="ghost" size="icon" onClick={() => setExtras((x) => x.filter((y) => y.key !== e.key))} aria-label={t('common.delete')}>
                      <Trash2Icon />
                    </Button>
                  </div>
              )}
              </div>
            }
          </Panel>
          <Panel title={t('common.notes')}>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Panel>
        </div>

        <aside className="xl:sticky xl:top-20 xl:self-start">
          <Panel title={tr('إجمالي الفاتورة', 'Invoice total')}>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-muted">{t('common.governmentFee')}</dt><dd><Money value={totals.government} /></dd></div>
              <div className="flex justify-between"><dt className="text-muted">{t('common.providerCost')}</dt><dd><Money value={totals.provider} /></dd></div>
              <div className="flex justify-between"><dt className="text-muted">{t('common.otherCosts')}</dt><dd><Money value={totals.other} /></dd></div>
              <div className="flex justify-between"><dt className="text-muted">{t('common.serviceFee')}</dt><dd><Money value={totals.service} /></dd></div>
              <div className="flex justify-between"><dt className="text-muted">{t('common.discount')}</dt><dd><Money value={-totals.discount} /></dd></div>
              <div className="flex justify-between"><dt className="text-muted">{t('common.vat')} ({vatRate}%)</dt><dd><Money value={totals.vat} /></dd></div>
              <div className="flex justify-between border-t border-line pt-2 font-semibold"><dt>{t('common.grandTotal')}</dt><dd><Money value={totals.due} /></dd></div>
            </dl>
            <div className="mt-4 flex flex-col gap-2">
              <Button onClick={() => submit('issued')} loading={create.isPending}><PlusIcon />{tr('إصدار الفاتورة', 'Issue invoice')}</Button>
              <Button variant="outline" onClick={() => submit('draft')} disabled={create.isPending}>{tr('حفظ كمسودة', 'Save as draft')}</Button>
            </div>
          </Panel>
        </aside>
      </div>
    </div>);

}
