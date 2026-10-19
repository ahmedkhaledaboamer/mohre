import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckIcon, PencilIcon, PlusIcon } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Money } from '../../components/ui/Display';
import { DataTable, FilterSelect, RowActions, type Column } from '../../components/tables/DataTable';
import { useLedgerColumns } from '../../components/shared/ledgerColumns';
import { ExpenseDialog } from '../../components/finance/ExpenseDialog';
import { expenseHooks } from '../../hooks/useApi';
import { useLedger } from '../../hooks/useLedger';
import { useI18n } from '../../hooks/useI18n';
import { usePermissions } from '../../hooks/usePermissions';
import { errorMessage } from '../../utils/errors';
import { round2 } from '../../utils/finance';
import { todayIso } from '../../utils/dates';
import type { Expense } from '../../types/finance';

const CATS = ['rent', 'salaries', 'utilities', 'marketing', 'transport', 'office', 'bank_fees', 'other'];

export function Expenses() {
  const { t, tr, lang } = useI18n();
  const { can } = usePermissions();
  const [params] = useSearchParams();
  const { ledger, isLoading, isError, refetch } = useLedger();
  const cols = useLedgerColumns(ledger);
  const update = expenseHooks.useUpdate();
  const [editing, setEditing] = useState<Expense | undefined>();
  const [open, setOpen] = useState(false);
  const [cat, setCat] = useState('all');
  const [paid, setPaid] = useState(params.get('paid') ?? 'all');

  const rows = useMemo(() => ledger.expenses.filter((e) => (cat === 'all' || e.category === cat) && (paid === 'all' || (paid === 'paid' ? e.paid : !e.paid))), [ledger.expenses, cat, paid]);
  const total = round2(rows.reduce((a, e) => a + e.amount, 0));

  const columns: Column<Expense>[] = [
  ...cols.expenses,
  {
    key: 'actions',
    header: '',
    alwaysVisible: true,
    cell: (e) =>
    can('finance.edit') &&
    <RowActions>
            {!e.paid &&
      <Button
        variant="ghost"
        size="sm"
        onClick={() => update.mutate({ id: e.id, patch: { paid: true, date: todayIso() } }, { onSuccess: () => toast.success(tr('تم تسجيل الدفع', 'Marked as paid')), onError: (err) => toast.error(errorMessage(err, lang)) })}>

                <CheckIcon />
                {tr('تم الدفع', 'Mark paid')}
              </Button>
      }
            {!e.paid &&
      <Button variant="ghost" size="icon-sm" onClick={() => {setEditing(e);setOpen(true);}} aria-label={t('common.edit')}>
                <PencilIcon />
              </Button>
      }
          </RowActions>

  }];

  return (
    <div>
      <PageHeader
        title={t('nav.expenses')}
        description={tr('مصروفات تشغيل المكتب فقط (إيجار، رواتب، مرافق…). المصروف المدفوع لا يُعدَّل؛ غير المدفوع يبقى مستحقاً ولا يحرّك النقدية.', 'Office running costs only. Paid expenses are locked; unpaid ones are accrued and move no cash.')}
        crumbs={[{ label: t('nav.expenses') }]}
        actions={can('finance.edit') && <Button onClick={() => {setEditing(undefined);setOpen(true);}}><PlusIcon />{t('quick.expense')}</Button>} />

      <DataTable
        tableId="expenses"
        rows={rows}
        columns={columns}
        getRowId={(e) => e.id}
        searchText={(e) => `${e.number} ${e.beneficiary ?? ''} ${e.notes ?? ''}`}
        isLoading={isLoading}
        isError={isError}
        onRetry={refetch}
        exportName="operating-expenses"
        initialSort={{ key: 'date', dir: 'desc' }}
        toolbar={
        <>
            <FilterSelect label={t('common.category')} value={cat} onChange={setCat} options={[{ value: 'all', label: tr('كل الفئات', 'All categories') }, ...CATS.map((c) => ({ value: c, label: t(`exp.${c}`) }))]} />
            <FilterSelect label={t('common.status')} value={paid} onChange={setPaid} className="sm:w-40" options={[{ value: 'all', label: tr('الكل', 'All') }, { value: 'paid', label: tr('مدفوعة', 'Paid') }, { value: 'unpaid', label: tr('مستحقة غير مدفوعة', 'Unpaid') }]} />
          </>
        }
        footer={rows.length > 0 && <div className="flex justify-end gap-2 border-t border-line bg-subtle/40 px-4 py-2.5 text-xs"><span className="text-muted">{t('common.total')}:</span><Money value={total} className="font-semibold" /></div>}
        empty={{ title: tr('لا توجد مصروفات', 'No expenses') }} />

      <ExpenseDialog open={open} onClose={() => setOpen(false)} expense={editing} />
    </div>);

}
