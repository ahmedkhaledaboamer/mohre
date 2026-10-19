import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PlusIcon } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { DataTable, FilterSelect, type Column } from '../../components/tables/DataTable';
import { StatusBadge } from '../../components/status/StatusBadge';
import { Ltr, Money } from '../../components/ui/Display';
import { useLedger } from '../../hooks/useLedger';
import { useI18n } from '../../hooks/useI18n';
import { useLookups } from '../../hooks/useLookups';
import { usePermissions } from '../../hooks/usePermissions';
import type { InvoiceView } from '../../utils/finance';

export function Invoices() {
  const { t, tr, date, name } = useI18n();
  const { can } = usePermissions();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const lk = useLookups();
  const { invoiceViews, isLoading, isError, refetch } = useLedger();
  const [status, setStatus] = useState(params.get('status') ?? 'all');

  const rows = useMemo(() => invoiceViews.filter((v) => status === 'all' || (status === 'open' ? v.balance > 0 : v.status === status)), [invoiceViews, status]);

  const columns: Column<InvoiceView>[] = [
  { key: 'number', header: tr('رقم الفاتورة', 'Invoice no.'), cell: (v) => <Ltr className="font-medium">{v.invoice.number}</Ltr>, sortValue: (v) => v.invoice.number },
  { key: 'date', header: t('common.issueDate'), cell: (v) => date(v.invoice.date), sortValue: (v) => v.invoice.date },
  { key: 'customer', header: t('common.customer'), cell: (v) => name(lk.customer.get(v.invoice.customerId)), sortValue: (v) => name(lk.customer.get(v.invoice.customerId)) },
  { key: 'company', header: t('common.company'), cell: (v) => v.invoice.companyId ? name(lk.company.get(v.invoice.companyId)) : '—', defaultHidden: true },
  { key: 'lines', header: tr('البنود', 'Lines'), cell: (v) => <span className="num">{v.invoice.lines.length}</span>, sortValue: (v) => v.invoice.lines.length, align: 'center' },
  { key: 'dueDate', header: t('common.dueDate'), cell: (v) => <span className={v.status === 'overdue' ? 'text-danger' : ''}>{date(v.invoice.dueDate)}</span>, sortValue: (v) => v.invoice.dueDate },
  { key: 'gov', header: t('common.governmentFee'), cell: (v) => <Money value={v.totals.directCosts} className="text-ink-2" />, sortValue: (v) => v.totals.directCosts, align: 'end', defaultHidden: true },
  { key: 'fees', header: t('common.serviceFee'), cell: (v) => <Money value={v.totals.netService} className="text-ink-2" />, sortValue: (v) => v.totals.netService, align: 'end', defaultHidden: true },
  { key: 'total', header: t('common.total'), cell: (v) => <Money value={v.totals.due} className="font-medium" />, sortValue: (v) => v.totals.due, align: 'end' },
  { key: 'paid', header: t('common.paid'), cell: (v) => <Money value={v.paid} className="text-success" />, sortValue: (v) => v.paid, align: 'end' },
  { key: 'balance', header: t('common.remaining'), cell: (v) => <Money value={v.balance} className={v.balance > 0 ? 'font-semibold text-warning' : 'text-muted'} />, sortValue: (v) => v.balance, align: 'end' },
  { key: 'status', header: t('common.status'), cell: (v) => <StatusBadge domain="inv" value={v.status} />, sortValue: (v) => v.status }];

  return (
    <div>
      <PageHeader
        title={t('nav.invoices')}
        description={tr('فواتير بأسعار محفوظة وقت الإصدار. المدفوع يُحسب من سندات القبض الفعلية المرتبطة بمعاملات الفاتورة.', 'Invoices keep issue-time prices. Paid amounts come from actual receipts on the invoiced transactions.')}
        crumbs={[{ label: t('nav.invoices') }]}
        actions={can('finance.edit') && <Button onClick={() => navigate('/invoices/new')}><PlusIcon />{t('quick.invoice')}</Button>} />

      <DataTable
        tableId="invoices"
        rows={rows}
        columns={columns}
        getRowId={(v) => v.invoice.id}
        searchText={(v) => `${v.invoice.number} ${name(lk.customer.get(v.invoice.customerId))} ${v.invoice.lines.map((l) => l.descriptionAr + (l.beneficiary ?? '')).join(' ')}`}
        onRowClick={(v) => navigate(`/invoices/${v.invoice.id}`)}
        isLoading={isLoading}
        isError={isError}
        onRetry={refetch}
        exportName="invoices"
        initialSort={{ key: 'date', dir: 'desc' }}
        toolbar={
        <FilterSelect
          label={t('common.status')}
          value={status}
          onChange={setStatus}
          options={[
          { value: 'all', label: tr('كل الحالات', 'All statuses') },
          { value: 'open', label: tr('عليها رصيد', 'With balance') },
          ...['draft', 'issued', 'partially_paid', 'paid', 'overdue', 'cancelled'].map((s) => ({ value: s, label: t(`inv.${s}`) }))]
          } />

        }
        empty={{ title: tr('لا توجد فواتير', 'No invoices') }} />

    </div>);

}
