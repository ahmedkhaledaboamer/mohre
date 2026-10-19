import type React from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { DataTable, type Column } from '../tables/DataTable';
import { Money } from '../ui/Display';
import { useI18n } from '../../hooks/useI18n';

export interface RecordsSpec<T> {
  title: string;
  description?: React.ReactNode;
  rows: T[];
  columns: Column<T>[];
  getRowId: (row: T) => string;
  searchText?: (row: T) => string;
  onRowClick?: (row: T) => void;
  total?: number;
  totalLabel?: string;
  exportName?: string;
}

/** Drill-down: lists exactly the records that make up a dashboard / report figure. */
export function RecordsDialog<T>({ spec, onClose }: {spec: RecordsSpec<T> | null;onClose: () => void;}) {
  const { t, tr } = useI18n();
  return (
    <Dialog
      open={Boolean(spec)}
      onClose={onClose}
      size="xl"
      title={spec?.title ?? ''}
      description={typeof spec?.description === 'string' ? spec.description : undefined}
      footer={<Button variant="outline" onClick={onClose}>{t('common.close')}</Button>}>

      {spec &&
      <div className="space-y-3">
          {typeof spec.description !== 'string' && spec.description}
          {spec.total !== undefined &&
        <div className="flex items-center justify-between rounded-lg bg-subtle/70 px-4 py-2.5 text-sm">
              <span className="text-muted">
                {spec.totalLabel ?? t('common.total')} · <span className="num">{spec.rows.length}</span> {tr('سجل', 'records')}
              </span>
              <Money value={spec.total} className="font-semibold" />
            </div>
        }
          <DataTable
          tableId={`drill-${spec.exportName ?? 'records'}`}
          rows={spec.rows}
          columns={spec.columns}
          getRowId={spec.getRowId}
          searchText={spec.searchText}
          onRowClick={spec.onRowClick}
          exportName={spec.exportName}
          pageSize={10}
          empty={{ title: tr('لا توجد سجلات في هذه الفترة', 'No records in this period') }} />

        </div>
      }
    </Dialog>);

}
