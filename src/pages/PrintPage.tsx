import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { ArrowRightIcon, ArrowLeftIcon, PrinterIcon } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { ErrorState, PageSkeleton } from '../components/ui/Feedback';
import { InvoiceDocument, PaymentDocument, ReceiptDocument } from '../components/finance/PrintDocuments';
import { useLedger } from '../hooks/useLedger';
import { useI18n } from '../hooks/useI18n';
import { useAppSelector } from '../store/hooks';
import { runningBalances } from '../utils/finance';

/** Full-page printable document (outside the app shell so nothing else prints). */
export function PrintPage() {
  const { kind, id } = useParams();
  const { t, tr, dir } = useI18n();
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const { ledger, invoiceViews, isLoading, isError, refetch } = useLedger({ ignoreBranch: true });
  if (!user) return <Navigate to="/login" replace />;
  if (isLoading) return <div className="p-8"><PageSkeleton /></div>;
  if (isError) return <ErrorState onRetry={refetch} />;

  const refOf = (txId: string) => ledger.summaries.get(txId)?.tx.ref ?? txId;
  let doc: React.ReactNode = null;
  if (kind === 'invoice') {
    const v = invoiceViews.find((x) => x.invoice.id === id);
    if (v) doc = <InvoiceDocument view={v} />;
  } else if (kind === 'receipt') {
    const r = ledger.receipts.find((x) => x.id === id);
    if (r) doc = <ReceiptDocument receipt={r} refOf={refOf} balanceAfter={runningBalances(r.customerId, ledger.list, ledger.receipts, ledger.invoices).get(r.id)} />;
  } else if (kind === 'payment') {
    const p = ledger.payments.find((x) => x.id === id);
    if (p) doc = <PaymentDocument payment={p} txRef={p.transactionId ? refOf(p.transactionId) : undefined} />;
  }
  const Back = dir === 'rtl' ? ArrowRightIcon : ArrowLeftIcon;

  return (
    <div className="min-h-screen bg-canvas px-4 py-6 print:bg-white print:p-0">
      <div className="no-print mx-auto mb-4 flex max-w-4xl items-center justify-between">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <Back />
          {t('common.back')}
        </Button>
        <Button onClick={() => window.print()} disabled={!doc}>
          <PrinterIcon />
          {t('common.print')}
        </Button>
      </div>
      {doc ?? <ErrorState message={tr('المستند غير موجود', 'Document not found')} />}
    </div>);

}
