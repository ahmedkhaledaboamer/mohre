import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon, ChevronLeftIcon, ChevronRightIcon, Columns3Icon, DownloadIcon, SearchIcon } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Input, Select, Checkbox } from '../ui/Input';
import { Button } from '../ui/Button';
import { Dropdown } from '../ui/Dropdown';
import { EmptyState, ErrorState, TableSkeleton } from '../ui/Feedback';
import { useI18n } from '../../hooks/useI18n';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { columnsSet } from '../../store/slices/uiSlice';
import { downloadCsv } from '../../utils/csv';

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  sortValue?: (row: T) => string | number;
  exportValue?: (row: T) => string | number;
  className?: string;
  align?: 'start' | 'end' | 'center';
  defaultHidden?: boolean;
  alwaysVisible?: boolean;
}

interface DataTableProps<T> {
  tableId: string;
  rows: T[];
  columns: Column<T>[];
  getRowId: (row: T) => string;
  searchText?: (row: T) => string;
  searchPlaceholder?: string;
  toolbar?: React.ReactNode;
  toolbarEnd?: React.ReactNode;
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  empty?: {title: string;description?: string;action?: React.ReactNode;};
  pageSize?: number;
  exportName?: string;
  initialSort?: {key: string;dir: 'asc' | 'desc';};
  rowClassName?: (row: T) => string | undefined;
  footer?: React.ReactNode;
  hideSearch?: boolean;
}

export function DataTable<T>({
  tableId,
  rows,
  columns,
  getRowId,
  searchText,
  searchPlaceholder,
  toolbar,
  toolbarEnd,
  onRowClick,
  isLoading,
  isError,
  onRetry,
  empty,
  pageSize: initialPageSize = 10,
  exportName,
  initialSort,
  rowClassName,
  footer,
  hideSearch
}: DataTableProps<T>) {
  const { t, tr, dir, lang } = useI18n();
  const dispatch = useAppDispatch();
  const stored = useAppSelector((s) => s.ui.hiddenColumns[tableId]);
  const hidden = stored ?? columns.filter((c) => c.defaultHidden).map((c) => c.key);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState(initialSort);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const visibleCols = columns.filter((c) => c.alwaysVisible || !hidden.includes(c.key));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = q && searchText ? rows.filter((r) => searchText(r).toLowerCase().includes(q)) : rows;
    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      if (col?.sortValue) {
        const sv = col.sortValue;
        out = [...out].sort((a, b) => {
          const va = sv(a);
          const vb = sv(b);
          const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), lang);
          return sort.dir === 'asc' ? cmp : -cmp;
        });
      }
    }
    return out;
  }, [rows, query, sort, columns, searchText, lang]);

  useEffect(() => setPage(1), [query, rows.length, pageSize]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pages);
  const pageRows = filtered.slice((current - 1) * pageSize, current * pageSize);

  const toggleSort = (key: string) =>
  setSort((s) => s?.key === key ? s.dir === 'asc' ? { key, dir: 'desc' } : undefined : { key, dir: 'asc' });

  const toggleColumn = (key: string) => {
    const next = hidden.includes(key) ? hidden.filter((k) => k !== key) : [...hidden, key];
    dispatch(columnsSet({ table: tableId, hidden: next }));
  };

  const exportCsv = () => {
    const cols = visibleCols.filter((c) => c.exportValue || c.sortValue);
    downloadCsv(
      exportName ?? tableId,
      cols.map((c) => c.header),
      filtered.map((r) => cols.map((c) => (c.exportValue ?? c.sortValue)!(r)))
    );
  };

  const Prev = dir === 'rtl' ? ChevronRightIcon : ChevronLeftIcon;
  const Next = dir === 'rtl' ? ChevronLeftIcon : ChevronRightIcon;
  const alignCls = (a?: string) => a === 'end' ? 'text-end' : a === 'center' ? 'text-center' : 'text-start';

  return (
    <div className="rounded-xl border border-line bg-surface shadow-card">
      <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
        {!hideSearch && searchText &&
        <div className="relative w-full sm:w-72">
            <SearchIcon className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder ?? t('common.searchPlaceholder')}
            className="ps-9"
            aria-label={t('common.search')} />
          
          </div>
        }
        {toolbar}
        <div className="ms-auto flex items-center gap-2">
          {toolbarEnd}
          <Dropdown
            width="w-60"
            trigger={({ toggle }) =>
            <Button variant="outline" size="sm" onClick={toggle} aria-label={t('common.columns')}>
                <Columns3Icon />
                <span className="hidden sm:inline">{t('common.columns')}</span>
              </Button>
            }
            content={() =>
            <div className="max-h-72 space-y-1 overflow-y-auto p-1.5">
                {columns.
              filter((c) => !c.alwaysVisible && c.header).
              map((c) =>
              <Checkbox key={c.key} className="w-full rounded px-1.5 py-1 hover:bg-subtle" label={c.header} checked={!hidden.includes(c.key)} onChange={() => toggleColumn(c.key)} />
              )}
              </div>
            } />
          
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!filtered.length}>
            <DownloadIcon />
            <span className="hidden sm:inline">{t('common.export')}</span>
          </Button>
        </div>
      </div>

      {isLoading ?
      <TableSkeleton cols={Math.min(visibleCols.length, 6)} /> :
      isError ?
      <ErrorState onRetry={onRetry} /> :
      filtered.length === 0 ?
      <EmptyState
        title={query ? t('common.noResults') : empty?.title ?? t('common.noResults')}
        description={query ? t('common.noResultsHint') : empty?.description}
        action={query ? undefined : empty?.action} /> :


      <div className="overflow-x-auto scroll-thin">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line bg-subtle/50">
                {visibleCols.map((c) =>
              <th key={c.key} scope="col" className={cn('whitespace-nowrap px-4 py-2.5 text-xs font-medium text-muted', alignCls(c.align), c.className)}>
                    {c.sortValue ?
                <button type="button" onClick={() => toggleSort(c.key)} className="inline-flex items-center gap-1 hover:text-ink">
                        {c.header}
                        {sort?.key === c.key ? sort.dir === 'asc' ? <ArrowUpIcon className="h-3 w-3" /> : <ArrowDownIcon className="h-3 w-3" /> : <ArrowUpDownIcon className="h-3 w-3 opacity-40" />}
                      </button> :

                c.header
                }
                  </th>
              )}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {pageRows.map((row) =>
            <tr
              key={getRowId(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(onRowClick && 'cursor-pointer', 'transition-colors duration-100 hover:bg-subtle/60', rowClassName?.(row))}>
              
                  {visibleCols.map((c) =>
              <td key={c.key} className={cn('whitespace-nowrap px-4 py-3 align-middle', alignCls(c.align), c.className)}>
                      {c.cell(row)}
                    </td>
              )}
                </tr>
            )}
            </tbody>
          </table>
          {footer}
        </div>
      }

      {!isLoading && !isError && filtered.length > 0 &&
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-2.5 text-xs text-muted">
          <span>
            <span className="num">
              {(current - 1) * pageSize + 1}–{Math.min(current * pageSize, filtered.length)}
            </span>{' '}
            {t('common.of')} <span className="num">{filtered.length}</span> {t('common.rows')}
          </span>
          <div className="flex items-center gap-2">
            <Select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="w-20" aria-label={tr('عدد الصفوف', 'Rows per page')}>
              {[10, 25, 50].map((n) =>
            <option key={n} value={n}>
                  {n}
                </option>
            )}
            </Select>
            <Button variant="outline" size="icon-sm" onClick={() => setPage(current - 1)} disabled={current <= 1} aria-label={t('common.previous')}>
              <Prev />
            </Button>
            <span className="num min-w-[3rem] text-center">
              {current} / {pages}
            </span>
            <Button variant="outline" size="icon-sm" onClick={() => setPage(current + 1)} disabled={current >= pages} aria-label={t('common.next')}>
              <Next />
            </Button>
          </div>
        </div>
      }
    </div>);

}

/** Wrap row-level action buttons so clicks don't trigger row navigation. */
export function RowActions({ children }: {children: React.ReactNode;}) {
  return (
    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
      {children}
    </div>);

}

export function FilterSelect({ label, value, onChange, options, className }: {label: string;value: string;onChange: (v: string) => void;options: {value: string;label: string;}[];className?: string;}) {
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} className={cn('w-full sm:w-44', className)}>
      {options.map((o) =>
      <option key={o.value} value={o.value}>
          {o.label}
        </option>
      )}
    </Select>);

}