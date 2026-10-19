import { useEffect, useMemo, useState } from 'react';
import { PencilIcon, PlusIcon } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { Field } from '../../components/ui/Field';
import { Checkbox, Input, Select } from '../../components/ui/Input';
import { Panel } from '../../components/ui/Panel';
import { Avatar, Ltr } from '../../components/ui/Display';
import { DataTable, RowActions, type Column } from '../../components/tables/DataTable';
import { userHooks } from '../../hooks/useApi';
import { useLedger } from '../../hooks/useLedger';
import { useI18n } from '../../hooks/useI18n';
import { usePermissions } from '../../hooks/usePermissions';
import { ROLES, rolePermissions } from '../../data/roles';
import { branches } from '../../data/branches';
import { todayIso } from '../../utils/dates';
import { errorMessage } from '../../utils/errors';
import type { Role, User } from '../../types/system';
import type { BranchId } from '../../types/common';

function UserDialog({ open, onClose, user }: {open: boolean;onClose: () => void;user?: User;}) {
  const { t, tr, lang, name } = useI18n();
  const create = userHooks.useCreate();
  const update = userHooks.useUpdate();
  const empty = { nameAr: '', nameEn: '', email: '', mobile: '+971 ', role: 'pro' as Role, branchId: 'deira' as BranchId, active: true, createdAt: todayIso() };
  const [f, setF] = useState<Omit<User, 'id'>>(empty);
  useEffect(() => {
    if (open) setF(user ? { ...user } : empty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user]);
  const save = () => {
    if (!f.nameAr.trim() || !/^\S+@\S+\.\S+$/.test(f.email.trim())) return toast.error(tr('الاسم والبريد الإلكتروني الصحيح مطلوبان', 'Name and a valid email are required'));
    const payload = { ...f, nameEn: f.nameEn || f.nameAr, email: f.email.trim() };
    const opts = { onSuccess: () => {toast.success(t('common.saved'));onClose();}, onError: (e: unknown) => toast.error(errorMessage(e, lang)) };
    if (user) update.mutate({ id: user.id, patch: payload }, opts);else create.mutate(payload, opts);
  };
  return (
    <Dialog open={open} onClose={onClose} title={user ? tr('تعديل مستخدم', 'Edit user') : tr('مستخدم جديد', 'New user')} description={tr('كلمة المرور في النسخة التجريبية لجميع الحسابات: demo1234', 'Demo password for all accounts: demo1234')} footer={<><Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button><Button onClick={save} loading={create.isPending || update.isPending}>{t('common.save')}</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('common.nameAr')} required><Input value={f.nameAr} onChange={(e) => setF({ ...f, nameAr: e.target.value })} /></Field>
        <Field label={t('common.nameEn')}><Input dir="ltr" value={f.nameEn} onChange={(e) => setF({ ...f, nameEn: e.target.value })} /></Field>
        <Field label={t('common.email')} required><Input dir="ltr" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label={t('common.mobile')}><Input dir="ltr" value={f.mobile} onChange={(e) => setF({ ...f, mobile: e.target.value })} /></Field>
        <Field label={tr('الدور', 'Role')}><Select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as Role })}>{ROLES.map((r) => <option key={r} value={r}>{t(`role.${r}`)}</option>)}</Select></Field>
        <Field label={t('common.branch')}><Select value={f.branchId} onChange={(e) => setF({ ...f, branchId: e.target.value as BranchId })}>{branches.map((b) => <option key={b.id} value={b.id}>{name(b)}</option>)}</Select></Field>
        <Checkbox label={tr('الحساب فعّال', 'Active account')} checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} />
      </div>
    </Dialog>);

}

export function Users() {
  const { t, tr, name, dateTime } = useI18n();
  const { user: me } = usePermissions();
  const list = userHooks.useList();
  const { ledger } = useLedger({ ignoreBranch: true });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<User | undefined>();
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    ledger.transactions.forEach((x) => m.set(x.createdBy, (m.get(x.createdBy) ?? 0) + 1));
    return m;
  }, [ledger.transactions]);

  const columns: Column<User>[] = [
  { key: 'name', header: t('common.name'), alwaysVisible: true, cell: (u) => <span className="flex items-center gap-2"><Avatar name={name(u)} /><span><span className="block font-medium">{name(u)}{u.id === me?.id && <span className="ms-1 text-[10px] text-muted">({tr('أنت', 'you')})</span>}</span><Ltr className="text-xs text-muted">{u.email}</Ltr></span></span>, sortValue: (u) => u.nameAr },
  { key: 'role', header: tr('الدور', 'Role'), cell: (u) => t(`role.${u.role}`), sortValue: (u) => u.role },
  { key: 'branch', header: t('common.branch'), cell: (u) => t(`branch.${u.branchId}`) },
  { key: 'tx', header: tr('معاملات سجّلها', 'Transactions registered'), cell: (u) => <span className="num">{counts.get(u.id) ?? 0}</span>, sortValue: (u) => counts.get(u.id) ?? 0, align: 'center' },
  { key: 'last', header: tr('آخر دخول', 'Last login'), cell: (u) => <span className="text-xs text-muted">{dateTime(u.lastLoginAt)}</span>, sortValue: (u) => u.lastLoginAt ?? '' },
  { key: 'active', header: t('common.status'), cell: (u) => u.active ? <span className="text-xs text-success">{tr('فعّال', 'Active')}</span> : <span className="text-xs text-muted">{tr('معطّل', 'Disabled')}</span> },
  { key: 'actions', header: '', alwaysVisible: true, cell: (u) => <RowActions><Button variant="ghost" size="icon-sm" onClick={() => {setEditing(u);setOpen(true);}} aria-label={t('common.edit')}><PencilIcon /></Button></RowActions> }];

  const perms: Record<Role, string> = {
    owner: tr('كل البيانات، الأسعار، المستخدمين، التقارير، الحذف وإعادة الضبط.', 'Everything: data, pricing, users, reports, deletion and reset.'),
    accountant: tr('الفواتير، سندات القبض والصرف، المصروفات، حركة النقدية والتقارير المالية. اطلاع على المعاملات وتعديل رسومها.', 'Invoices, receipts, payments, expenses, cash and financial reports. Views transactions and can correct fees.'),
    pro: tr('تسجيل المعاملات وتحديث معاملاته والخطوات المسندة إليه، تسجيل التحصيل والدفع، العملاء والمستندات.', 'Registers transactions, updates own transactions/steps, records collections and payments, clients and documents.'),
    manager: tr('اطلاع على لوحة التحكم والتقارير وكل البيانات دون أي تعديل.', 'Views dashboard, reports and all data — no changes.')
  };

  return (
    <div>
      <PageHeader title={t('nav.users')} description={tr('المستخدمون لا يُحذفون بل يُعطَّلون، حتى يبقى اسم منفذ كل عملية محفوظاً.', 'Users are disabled, not deleted, so authorship of every record is preserved.')} crumbs={[{ label: t('nav.users') }]} actions={<Button onClick={() => {setEditing(undefined);setOpen(true);}}><PlusIcon />{tr('مستخدم جديد', 'New user')}</Button>} />
      <DataTable tableId="users" rows={list.data ?? []} columns={columns} getRowId={(u) => u.id} searchText={(u) => `${u.nameAr} ${u.nameEn} ${u.email}`} isLoading={list.isLoading} isError={list.isError} onRetry={() => list.refetch()} exportName="users" />
      <Panel className="mt-5" title={tr('الأدوار والصلاحيات', 'Roles & permissions')} description={tr('محاكاة للصلاحيات في الواجهة فقط وليست حماية أمنية حقيقية؛ يجب فرضها على الخادم عند إضافة Backend.', 'Frontend simulation only — not real security. Enforce on the server once a backend exists.')}>
        <div className="grid gap-3 md:grid-cols-2">
          {ROLES.map((r) =>
          <div key={r} className="rounded-lg border border-line p-3">
              <p className="text-sm font-semibold">{t(`role.${r}`)}</p>
              <p className="mt-1 text-xs text-ink-2">{perms[r]}</p>
              <p className="mt-2 text-[10px] text-muted"><Ltr>{rolePermissions[r].join(' · ')}</Ltr></p>
            </div>
          )}
        </div>
      </Panel>
      <UserDialog open={open} onClose={() => setOpen(false)} user={editing} />
    </div>);

}
