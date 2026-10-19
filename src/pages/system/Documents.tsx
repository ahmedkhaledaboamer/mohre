import { PageHeader } from '../../components/ui/PageHeader';
import { DocumentsTable } from '../../components/documents/DocumentsTable';
import { documentHooks } from '../../hooks/useApi';
import { useI18n } from '../../hooks/useI18n';

export function Documents() {
  const { t, tr } = useI18n();
  const docs = documentHooks.useList();
  return (
    <div>
      <PageHeader title={t('nav.documents')} description={tr('مستندات تجريبية: يُحفظ اسم الملف وبياناته فقط دون رفع فعلي.', 'Demo documents: only file metadata is stored — no real upload.')} crumbs={[{ label: t('nav.documents') }]} />
      <DocumentsTable tableId="documents" docs={docs.data ?? []} isLoading={docs.isLoading} isError={docs.isError} onRetry={() => docs.refetch()} showEntity pageSize={15} />
    </div>);

}
