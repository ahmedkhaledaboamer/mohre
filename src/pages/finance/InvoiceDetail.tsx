import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BanIcon, PrinterIcon, SendIcon, WalletIcon } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Panel } from '../../components/ui/Panel';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { ErrorState, PageSkeleton } from '../../components/ui/Feedback';
import { StatusBadge } from '../../components/status/StatusBadge';
import { Ltr, Money } from '../../components/ui/Display';
import { InvoiceDocument } from '../../components/finance/PrintDocuments';
import { ReceiptDialog } from '../../components/finance/ReceiptDialog';
import { useSetInvoiceState } from '../../hooks/useApi';
import { useLedger } from '../../hooks/useLedger';
import { useI18n } from '../../hooks/useI18n';
import { usePermissions } from '../../hooks/usePermissions';
import { errorMessage } from '../../utils/errors';

export function InvoiceDetail() {
  const { id } = useParams();
  const { t, tr, lang, date } = useI18n();
  const { can } = usePermissions();
  const navigate = useNavigate();
  const { ledger, invoiceViews, isLoading, isError, refetch } = useLedger({ ignoreBranch: true });
  const setState = useSetInvoiceState();
  const [dlg, setDlg] = useState<'receipt' | 'cancel' | null>(null);

  if (isLoading) return <PageSkeleton />;
  if (isError) return <ErrorState onRetry={refetch} />;
  const view = invoiceViews.find((v) => v.invoice.id === id);
  if (!view) return <ErrorState message={tr('الفاتورة غير موجودة', 'Invoice not found')} />;
  const inv = view.invoice;
  const txs = [...new Set(inv.lines.map((l) => l.transactionId).filter(Boolean) as string[])].map((x) => ledger.summaries.get(x)).filter(Boolean);
  const mutate = (state: 'issued' | 'cancelled') =>
  setState.mutate({ id: inv.id, state }, { onSuccess: () => {toast.success(t('common.saved'));setDlg(null);}, onError: (e) => toast.error(errorMessage(e, lang)) });

  return (
    <div>
      <PageHeader
        title={`${tr('فاتورة', 'Invoice')} ${inv.number}`}
        crumbs={[{ label: t('nav.invoices'), to: '/invoices' }, { label: inv.number }]}
        meta={<StatusBadge domain="inv" value={view.status} />}
        actions={
        <>
            {can('collections.record') && view.balance > 0 &&
          <Button onClick={() => setDlg('receipt')}>
                <WalletIcon />
                {tr('تسجيل دفعة على الفاتورة', 'Record payment')}
              </Button>
          }
            {can('finance.edit') && inv.state === 'draft' && <Button variant="outline" onClick={() => mutate('issued')} loading={setState.isPending}><SendIcon />{tr('إصدار', 'Issue')}</Button>}
            <Button variant="outline" onClick={() => navigate(`/print/invoice/${inv.id}`)}>
              <PrinterIcon />
              {t('common.print')}
            </Button>
            {can('finance.edit') && inv.state !== 'cancelled' &&
          <Button variant="ghost" className="text-danger hover:bg-danger-soft" onClick={() => setDlg('cancel')}>
                <BanIcon />
                {tr('إلغاء الفاتورة', 'Cancel invoice')}
              </Button>
          }
          </>
        } />

      <div className="grid gap-5 xl:grid-cols-[1fr_300px]">
        <InvoiceDocument view={view} />
        <div className="space-y-5">
          <Panel title={tr('المعاملات المفوترة', 'Invoiced transactions')}>
            {txs.length === 0 ?
            <p className="text-xs text-muted">{tr('بنود يدوية فقط', 'Manual lines only')}</p> :

            <ul className="space-y-2 text-sm">
                {txs.map((s) =>
              <li key={s!.tx.id} className="flex items-center justify-between gap-2">
                    <Link to={`/transactions/${s!.tx.id}`} className="text-primary hover:underline"><Ltr>{s!.tx.ref}</Ltr></Link>
                    <span className="text-xs text-muted">{tr('محصّل', 'collected')} <Money value={s!.collected} /></span>
                  </li>
              )}
              </ul>
            }
          </Panel>
          <Panel title={tr('السداد', 'Payments')}>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-muted">{t('common.total')}</dt><dd><Money value={view.totals.due} /></dd></div>
              <div className="flex justify-between"><dt className="text-muted">{t('common.paid')}</dt><dd><Money value={view.paid} className="text-success" /></dd></div>
              <div className="flex justify-between font-semibold"><dt>{t('common.remaining')}</dt><dd><Money value={view.balance} /></dd></div>
            </dl>
            <p className="mt-3 text-[11px] text-muted">{tr(`الاستحقاق ${date(inv.dueDate)}. المدفوع يشمل كل التحصيلات المسجلة على معاملات الفاتورة حتى قبل إصدارها.`, `Due ${date(inv.dueDate)}. Paid includes all collections recorded on the invoiced transactions, even before issue.`)}</p>
          </Panel>
        </div>
      </div>
      <ReceiptDialog open={dlg === 'receipt'} onClose={() => setDlg(null)} customerId={inv.customerId} invoiceId={inv.id} />
      <ConfirmDialog
        open={dlg === 'cancel'}
        onClose={() => setDlg(null)}
        title={tr('إلغاء الفاتورة', 'Cancel invoice')}
        description={tr('تبقى سندات القبض المسجلة كما هي ومرتبطة بالمعاملات، ويمكن إصدار فاتورة جديدة لنفس المعاملات.', 'Recorded receipts remain on their transactions; the transactions can be invoiced again.')}
        loading={setState.isPending}
        onConfirm={() => mutate('cancelled')} />

    </div>);

}
