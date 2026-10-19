import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DatabaseIcon, PlusIcon, RotateCcwIcon } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '../../components/ui/PageHeader';
import { Panel } from '../../components/ui/Panel';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { Checkbox, Input, Select, Textarea } from '../../components/ui/Input';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Money } from '../../components/ui/Display';
import { PageSkeleton } from '../../components/ui/Feedback';
import { accountHooks, useResetDemo, useSettings, useUpdateSettings } from '../../hooks/useApi';
import { useI18n } from '../../hooks/useI18n';
import { STORAGE_KEY } from '../../services/mockDb';
import { USE_MOCK_API } from '../../services/apiClient';
import { errorMessage } from '../../utils/errors';
import { todayIso } from '../../utils/dates';
import type { AppSettings } from '../../types/system';
import type { AccountKind } from '../../types/finance';

export function Settings() {
  const { t, tr, lang, name } = useI18n();
  const navigate = useNavigate();
  const settings = useSettings();
  const save = useUpdateSettings();
  const reset = useResetDemo();
  const accounts = accountHooks.useList();
  const createAccount = accountHooks.useCreate();
  const updateAccount = accountHooks.useUpdate();
  const [f, setF] = useState<AppSettings | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [acc, setAcc] = useState({ nameAr: '', kind: 'other' as AccountKind, openingBalance: 0 });

  useEffect(() => {
    if (settings.data) setF(settings.data);
  }, [settings.data]);
  if (!f) return <PageSkeleton />;

  const set = <K extends keyof AppSettings,>(k: K, v: AppSettings[K]) => setF({ ...f, [k]: v });
  const onSave = () => save.mutate(f, { onSuccess: () => toast.success(t('common.saved')), onError: (e) => toast.error(errorMessage(e, lang)) });

  return (
    <div>
      <PageHeader title={t('nav.settings')} crumbs={[{ label: t('nav.settings') }]} actions={<Button onClick={onSave} loading={save.isPending}>{t('common.save')}</Button>} />
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title={tr('بيانات المكتب', 'Office details')} description={tr('تظهر في الفواتير والسندات المطبوعة.', 'Shown on printed invoices and vouchers.')}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('common.nameAr')}><Input value={f.companyNameAr} onChange={(e) => set('companyNameAr', e.target.value)} /></Field>
            <Field label={t('common.nameEn')}><Input dir="ltr" value={f.companyNameEn} onChange={(e) => set('companyNameEn', e.target.value)} /></Field>
            <Field label={tr('الرقم الضريبي', 'TRN')}><Input dir="ltr" value={f.trn} onChange={(e) => set('trn', e.target.value)} /></Field>
            <Field label={t('common.mobile')}><Input dir="ltr" value={f.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
            <Field label={t('common.email')}><Input dir="ltr" value={f.email} onChange={(e) => set('email', e.target.value)} /></Field>
            <Field label={tr('نسبة ضريبة القيمة المضافة %', 'VAT rate %')} hint={tr('تُطبق على المعاملات الجديدة فقط', 'Applies to new transactions only')}><Input type="number" min={0} max={100} dir="ltr" value={f.vatRate} onChange={(e) => set('vatRate', Math.max(0, Number(e.target.value) || 0))} /></Field>
            <Field label={tr('العنوان', 'Address')} className="sm:col-span-2"><Input value={f.address} onChange={(e) => set('address', e.target.value)} /></Field>
            <Field label={tr('شروط الفاتورة', 'Invoice terms')} className="sm:col-span-2"><Textarea rows={3} value={f.invoiceTerms} onChange={(e) => set('invoiceTerms', e.target.value)} /></Field>
          </div>
        </Panel>

        <Panel title={tr('التنبيهات', 'Reminders')}>
          <div className="grid gap-4 sm:grid-cols-3">
            {(['passport', 'emiratesId', 'residence', 'license', 'deadline'] as const).map((k) =>
            <Field key={k} label={`${t(`rem.${k === 'emiratesId' ? 'emirates_id' : k}`)} (${t('common.days')})`}>
                <Input type="number" min={0} dir="ltr" value={f.reminderDays[k]} onChange={(e) => set('reminderDays', { ...f.reminderDays, [k]: Math.max(0, Number(e.target.value) || 0) })} />
              </Field>
            )}
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {(Object.keys(f.notifications.kinds) as (keyof AppSettings['notifications']['kinds'])[]).map((k) =>
            <Checkbox key={k} label={t(`rem.${k}`)} checked={f.notifications.kinds[k]} onChange={(e) => set('notifications', { ...f.notifications, kinds: { ...f.notifications.kinds, [k]: e.target.checked } })} />
            )}
          </div>
        </Panel>

        <Panel title={tr('حسابات النقدية والدفع', 'Cash & payment accounts')} description={tr('الأرصدة الافتتاحية تجريبية. الحركات تُسجَّل فقط عبر السندات والتحويلات.', 'Opening balances are demo values. Movements come only from vouchers and transfers.')}>
          <ul className="divide-y divide-line">
            {(accounts.data ?? []).map((a) =>
            <li key={a.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span>
                  <span className="font-medium">{name(a)}</span>
                  <span className="ms-2 text-xs text-muted">{t(`acck.${a.kind}`)} · {tr('افتتاحي', 'opening')} <Money value={a.openingBalance} /></span>
                </span>
                <Checkbox label={tr('فعّال', 'Active')} checked={a.active} onChange={(e) => updateAccount.mutate({ id: a.id, patch: { active: e.target.checked } })} />
              </li>
            )}
          </ul>
          <div className="mt-3 grid gap-2 border-t border-line pt-3 sm:grid-cols-[1fr_140px_140px_auto]">
            <Input placeholder={tr('اسم حساب جديد', 'New account name')} value={acc.nameAr} onChange={(e) => setAcc({ ...acc, nameAr: e.target.value })} />
            <Select value={acc.kind} onChange={(e) => setAcc({ ...acc, kind: e.target.value as AccountKind })}>{(['cash', 'bank', 'other'] as const).map((k) => <option key={k} value={k}>{t(`acck.${k}`)}</option>)}</Select>
            <Input type="number" dir="ltr" placeholder={tr('رصيد افتتاحي', 'Opening')} value={acc.openingBalance || ''} onChange={(e) => setAcc({ ...acc, openingBalance: Number(e.target.value) || 0 })} />
            <Button
              variant="outline"
              disabled={!acc.nameAr.trim()}
              loading={createAccount.isPending}
              onClick={() =>
              createAccount.mutate(
                { code: '', nameAr: acc.nameAr.trim(), nameEn: acc.nameAr.trim(), kind: acc.kind, openingBalance: acc.openingBalance, openingDate: todayIso(), active: true },
                { onSuccess: () => {toast.success(t('common.created'));setAcc({ nameAr: '', kind: 'other', openingBalance: 0 });}, onError: (e) => toast.error(errorMessage(e, lang)) }
              )
              }>

              <PlusIcon />
              {t('common.add')}
            </Button>
          </div>
        </Panel>

        <Panel title={tr('البيانات التجريبية', 'Demo data')} description={tr('كل البيانات محفوظة محلياً في هذا المتصفح (localStorage) ولا يوجد خادم.', 'All data lives locally in this browser (localStorage); there is no server.')}>
          <p className="flex items-center gap-2 text-xs text-muted">
            <DatabaseIcon className="h-3.5 w-3.5" />
            {tr('مفتاح التخزين', 'Storage key')}: <code className="num rounded bg-subtle px-1">{STORAGE_KEY}</code> · {USE_MOCK_API ? tr('وضع المحاكاة', 'Mock mode') : 'REST'}
          </p>
          <p className="mt-3 text-sm text-ink-2">
            {tr('إعادة الضبط تستبدل كل المعاملات والسندات والعملاء والإعدادات بالبيانات التجريبية الأصلية. لا يُمسح أي شيء آخر في المتصفح (تفضيلات العرض وجلسة الدخول تبقى).', 'Reset replaces all transactions, vouchers, customers and settings with the original demo data. Nothing else in the browser is touched (display preferences and your session stay).')}
          </p>
          <Button variant="danger" className="mt-4" onClick={() => setConfirm(true)}>
            <RotateCcwIcon />
            {tr('إعادة البيانات التجريبية للحالة الأصلية', 'Reset demo data')}
          </Button>
        </Panel>
      </div>

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title={tr('تأكيد إعادة الضبط', 'Confirm reset')}
        description={tr('سيتم حذف كل ما أضفته أو عدّلته واستعادة البيانات التجريبية الأصلية. لا يمكن التراجع.', 'Everything you added or changed will be replaced by the original demo data. This cannot be undone.')}
        confirmLabel={tr('إعادة الضبط', 'Reset')}
        loading={reset.isPending}
        onConfirm={() =>
        reset.mutate(undefined, {
          onSuccess: () => {
            toast.success(tr('تمت استعادة البيانات التجريبية', 'Demo data restored'));
            setConfirm(false);
            navigate('/');
          },
          onError: (e) => toast.error(errorMessage(e, lang))
        })
        } />

    </div>);

}
