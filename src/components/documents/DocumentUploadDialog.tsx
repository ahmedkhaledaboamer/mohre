import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { UploadCloudIcon, FileIcon } from 'lucide-react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Field } from '../ui/Field';
import { Input, Select, Textarea } from '../ui/Input';
import { documentHooks, transactionHooks } from '../../hooks/useApi';
import { useI18n } from '../../hooks/useI18n';
import { useFormError } from '../../hooks/useFormError';
import { useLookups } from '../../hooks/useLookups';
import { usePermissions } from '../../hooks/usePermissions';
import { optStr, req } from '../../utils/schemas';
import { todayIso } from '../../utils/dates';
import { errorMessage } from '../../utils/errors';
import type { DocumentEntity, DocumentType } from '../../types/system';

const DOC_TYPES: DocumentType[] = ['passport', 'emirates_id', 'residence', 'contract', 'trade_license', 'medical', 'insurance', 'certificate', 'invoice', 'receipt', 'photo', 'other'];
const ENTITIES: DocumentEntity[] = ['employee', 'customer', 'company', 'case'];

const schema = z.object({
  type: z.enum(['passport', 'emirates_id', 'residence', 'contract', 'trade_license', 'medical', 'insurance', 'certificate', 'invoice', 'receipt', 'photo', 'other']),
  title: req(),
  entityType: z.enum(['customer', 'company', 'employee', 'case', 'invoice']),
  entityId: req(),
  expiryDate: optStr(),
  notes: optStr()
});
type FormValues = z.infer<typeof schema>;

/** Records file metadata only. Files are selected locally and never uploaded to an external service. */
export function DocumentUploadDialog({ open, onClose, entityType, entityId }: {open: boolean;onClose: () => void;entityType?: DocumentEntity;entityId?: string;}) {
  const { t, tr, lang, name } = useI18n();
  const fe = useFormError();
  const lk = useLookups();
  const { user } = usePermissions();
  const cases = transactionHooks.useList();
  const create = documentHooks.useCreate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState(false);
  const { register, handleSubmit, reset, watch, setValue, formState } = useForm<FormValues>({ resolver: zodResolver(schema) });
  const errors = formState.errors;
  const et = watch('entityType');

  useEffect(() => {
    if (open) {
      reset({ type: 'passport', title: '', entityType: entityType ?? 'employee', entityId: entityId ?? '', expiryDate: '', notes: '' });
      setFile(null);
      setFileError(false);
    }
  }, [open, entityType, entityId, reset]);

  const options =
  et === 'employee' ?
  lk.employees.map((e) => ({ id: e.id, label: `${name(e)} — ${e.code}` })) :
  et === 'customer' ?
  lk.customers.map((c) => ({ id: c.id, label: `${name(c)} — ${c.code}` })) :
  et === 'company' ?
  lk.companies.map((c) => ({ id: c.id, label: name(c) })) :
  (cases.data ?? []).map((c) => ({ id: c.id, label: `${c.ref} — ${lang === 'ar' ? c.titleAr : c.titleEn}` }));

  const onSubmit = (v: FormValues) => {
    if (!file) {
      setFileError(true);
      return;
    }
    create.mutate(
      {
        type: v.type,
        title: v.title,
        fileName: file.name,
        entityType: v.entityType,
        entityId: v.entityId,
        uploadedAt: todayIso(),
        expiryDate: v.expiryDate || undefined,
        verification: 'pending',
        notes: v.notes || undefined,
        sizeKb: Math.max(1, Math.round(file.size / 1024)),
        uploadedBy: user?.id ?? ''
      },
      {
        onSuccess: () => {
          toast.success(tr('تم تسجيل المستند', 'Document recorded'));
          onClose();
        },
        onError: (e) => toast.error(errorMessage(e, lang))
      }
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={tr('إضافة مستند', 'Add document')}
      description={tr('يتم اختيار الملف محلياً لأغراض العرض فقط ولا يُرفع إلى أي خدمة خارجية.', 'The file is selected locally for demo purposes and is never uploaded externally.')}
      footer={
      <>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="doc-form" loading={create.isPending}>
            {t('common.save')}
          </Button>
        </>
      }>
      
      <form id="doc-form" onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" noValidate>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-6 text-center transition-colors hover:bg-subtle sm:col-span-2 ${fileError ? 'border-danger' : 'border-line-strong'}`}>
          
          {file ? <FileIcon className="h-6 w-6 text-primary" /> : <UploadCloudIcon className="h-6 w-6 text-muted" />}
          <span className="text-sm font-medium">{file ? file.name : tr('اختر ملفاً من جهازك', 'Choose a file from your device')}</span>
          <span className="text-xs text-muted">{file ? `${Math.round(file.size / 1024)} KB` : 'PDF, JPG, PNG'}</span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            setFile(f);
            setFileError(false);
            if (f && !watch('title')) setValue('title', f.name.replace(/\.[^.]+$/, ''));
          }} />
        
        {fileError && <p className="-mt-2 text-xs text-danger sm:col-span-2">{tr('يرجى اختيار ملف', 'Please choose a file')}</p>}
        <Field label={tr('نوع المستند', 'Document type')} required>
          <Select {...register('type')}>
            {DOC_TYPES.map((d) =>
            <option key={d} value={d}>
                {t(`doc.${d}`)}
              </option>
            )}
          </Select>
        </Field>
        <Field label={tr('العنوان', 'Title')} required error={fe(errors.title)}>
          <Input {...register('title')} aria-invalid={Boolean(errors.title)} />
        </Field>
        <Field label={tr('مرتبط بـ', 'Linked to')} required>
          <Select {...register('entityType')} disabled={Boolean(entityType)} onChange={(e) => {setValue('entityType', e.target.value as DocumentEntity);setValue('entityId', '');}}>
            {ENTITIES.map((x) =>
            <option key={x} value={x}>
                {t(`ent.${x}`)}
              </option>
            )}
          </Select>
        </Field>
        <Field label={tr('السجل', 'Record')} required error={fe(errors.entityId)}>
          <Select {...register('entityId')} disabled={Boolean(entityId)} aria-invalid={Boolean(errors.entityId)}>
            <option value="">{t('common.select')}</option>
            {options.map((o) =>
            <option key={o.id} value={o.id}>
                {o.label}
              </option>
            )}
          </Select>
        </Field>
        <Field label={t('common.expiryDate')} hint={t('common.optional')}>
          <Input type="date" {...register('expiryDate')} />
        </Field>
        <Field label={t('common.notes')} className="sm:col-span-2">
          <Textarea rows={2} {...register('notes')} />
        </Field>
      </form>
    </Dialog>);

}