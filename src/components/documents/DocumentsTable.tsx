import React, { useState } from 'react';
import { CheckCircle2Icon, FileTextIcon, PlusIcon, Trash2Icon, XCircleIcon } from 'lucide-react';
import { toast } from 'sonner';
import { DataTable, RowActions, type Column } from '../tables/DataTable';
import { StatusBadge } from '../status/StatusBadge';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { DaysLeft, Ltr } from '../ui/Display';
import { DocumentUploadDialog } from './DocumentUploadDialog';
import { documentHooks } from '../../hooks/useApi';
import { useI18n } from '../../hooks/useI18n';
import { usePermissions } from '../../hooks/usePermissions';
import { useLookups } from '../../hooks/useLookups';
import type { DocumentEntity, DocumentRecord } from '../../types/system';
import { daysUntil } from '../../utils/dates';

interface DocumentsTableProps {
  tableId: string;
  docs: DocumentRecord[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  uploadFor?: {entityType: DocumentEntity;entityId: string;};
  showEntity?: boolean;
  toolbar?: React.ReactNode;
  pageSize?: number;
}

export function DocumentsTable({ tableId, docs, isLoading, isError, onRetry, uploadFor, showEntity, toolbar, pageSize = 8 }: DocumentsTableProps) {
  const { t, tr, date, name } = useI18n();
  const { can } = usePermissions();
  const lk = useLookups();
  const update = documentHooks.useUpdate();
  const remove = documentHooks.useRemove();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [toDelete, setToDelete] = useState<DocumentRecord | null>(null);
  const editable = can('documents.edit');

  const entityLabel = (d: DocumentRecord) => {
    if (d.entityType === 'employee') return name(lk.employee.get(d.entityId));
    if (d.entityType === 'customer') return name(lk.customer.get(d.entityId));
    if (d.entityType === 'company') return name(lk.company.get(d.entityId));
    return d.entityId;
  };

  const verify = (d: DocumentRecord, verification: DocumentRecord['verification']) =>
  update.mutate({ id: d.id, patch: { verification } }, { onSuccess: () => toast.success(t('common.saved')) });

  const columns: Column<DocumentRecord>[] = [
  {
    key: 'title',
    header: tr('المستند', 'Document'),
    cell: (d) =>
    <div className="flex items-center gap-2.5">
          <FileTextIcon className="h-4 w-4 shrink-0 text-muted" />
          <div className="min-w-0">
            <p className="max-w-[260px] truncate font-medium">{d.title}</p>
            <Ltr className="text-[11px] text-muted">
              {d.fileName} · {d.sizeKb} KB
            </Ltr>
          </div>
        </div>,

    sortValue: (d) => d.title
  },
  { key: 'type', header: t('common.type'), cell: (d) => t(`doc.${d.type}`), sortValue: (d) => d.type },
  ...(showEntity ?
  [{ key: 'entity', header: tr('مرتبط بـ', 'Linked to'), cell: (d: DocumentRecord) => <span className="text-ink-2">{t(`ent.${d.entityType}`)} · {entityLabel(d)}</span>, exportValue: (d: DocumentRecord) => entityLabel(d) } as Column<DocumentRecord>] :
  []),
  { key: 'uploaded', header: tr('تاريخ الرفع', 'Uploaded'), cell: (d) => date(d.uploadedAt), sortValue: (d) => d.uploadedAt },
  {
    key: 'expiry',
    header: t('common.expiryDate'),
    cell: (d) =>
    d.expiryDate ?
    <div>
            <p>{date(d.expiryDate)}</p>
            <DaysLeft days={daysUntil(d.expiryDate)} />
          </div> :

    '—',

    sortValue: (d) => d.expiryDate ?? '9999'
  },
  { key: 'ver', header: tr('التحقق', 'Verification'), cell: (d) => <StatusBadge domain="ver" value={d.verification} />, sortValue: (d) => d.verification },
  {
    key: 'actions',
    header: '',
    alwaysVisible: true,
    cell: (d) =>
    editable ?
    <RowActions>
            {d.verification !== 'verified' &&
      <Button variant="ghost" size="icon-sm" onClick={() => verify(d, 'verified')} aria-label={tr('توثيق', 'Verify')} title={tr('توثيق', 'Verify')}>
                <CheckCircle2Icon className="text-success" />
              </Button>
      }
            {d.verification !== 'rejected' &&
      <Button variant="ghost" size="icon-sm" onClick={() => verify(d, 'rejected')} aria-label={tr('رفض', 'Reject')} title={tr('رفض', 'Reject')}>
                <XCircleIcon className="text-warning" />
              </Button>
      }
            <Button variant="ghost" size="icon-sm" onClick={() => setToDelete(d)} aria-label={t('common.delete')}>
              <Trash2Icon className="text-danger" />
            </Button>
          </RowActions> :
    null
  }];


  return (
    <>
      <DataTable
        tableId={tableId}
        rows={docs}
        columns={columns}
        getRowId={(d) => d.id}
        searchText={(d) => `${d.title} ${d.fileName}`}
        isLoading={isLoading}
        isError={isError}
        onRetry={onRetry}
        toolbar={toolbar}
        pageSize={pageSize}
        initialSort={{ key: 'uploaded', dir: 'desc' }}
        toolbarEnd={
        editable &&
        <Button size="sm" onClick={() => setUploadOpen(true)}>
              <PlusIcon />
              {tr('إضافة مستند', 'Add document')}
            </Button>

        }
        empty={{ title: tr('لا توجد مستندات', 'No documents'), description: tr('أضف جوازات السفر والعقود والرخص هنا.', 'Add passports, contracts and licenses here.') }} />
      
      <DocumentUploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} entityType={uploadFor?.entityType} entityId={uploadFor?.entityId} />
      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        title={tr('حذف المستند', 'Delete document')}
        description={tr(`سيتم حذف سجل «${toDelete?.title ?? ''}» نهائياً.`, `"${toDelete?.title ?? ''}" will be permanently removed.`)}
        confirmLabel={t('common.delete')}
        loading={remove.isPending}
        onConfirm={() =>
        toDelete &&
        remove.mutate(toDelete.id, {
          onSuccess: () => {
            toast.success(t('common.deleted'));
            setToDelete(null);
          }
        })
        } />
      
    </>);

}