import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckIcon, PlusIcon } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '../../components/ui/PageHeader';
import { Tabs } from '../../components/ui/Tabs';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { Field } from '../../components/ui/Field';
import { Input, Select } from '../../components/ui/Input';
import { DaysLeft } from '../../components/ui/Display';
import { StatusBadge } from '../../components/status/StatusBadge';
import { DataTable, FilterSelect, RowActions, type Column } from '../../components/tables/DataTable';
import { taskHooks, useToggleTask } from '../../hooks/useApi';
import { useReminders } from '../../hooks/useReminders';
import { useI18n } from '../../hooks/useI18n';
import { useLookups } from '../../hooks/useLookups';
import { usePermissions } from '../../hooks/usePermissions';
import { daysUntil, todayIso } from '../../utils/dates';
import { errorMessage } from '../../utils/errors';
import type { Reminder, Task, TaskPriority } from '../../types/system';

export function Tasks() {
  const { t, tr, lang, name, date } = useI18n();
  const { user, can } = usePermissions();
  const [params, setParams] = useSearchParams();
  const lk = useLookups();
  const tasks = taskHooks.useList();
  const create = taskHooks.useCreate();
  const toggle = useToggleTask();
  const { reminders, isLoading } = useReminders();
  const tab = params.get('tab') === 'reminders' ? 'reminders' : 'tasks';
  const [who, setWho] = useState('mine');
  const [status, setStatus] = useState('open');
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ title: '', assigneeId: user?.id ?? '', dueDate: todayIso(), priority: 'normal' as TaskPriority });

  const rows = (tasks.data ?? []).filter((x) => (who === 'all' || x.assigneeId === user?.id) && (status === 'all' || x.status === status));
  const taskCols: Column<Task>[] = [
  {
    key: 'done',
    header: '',
    alwaysVisible: true,
    cell: (x) =>
    <RowActions>
          <button type="button" disabled={!can('tasks.edit')} onClick={() => toggle.mutate(x)} className="flex h-4 w-4 items-center justify-center rounded border border-line-strong hover:border-primary disabled:opacity-40" aria-label={tr('إنجاز', 'Done')}>
            {x.status === 'done' && <CheckIcon className="h-3 w-3 text-primary" />}
          </button>
        </RowActions>

  },
  { key: 'title', header: tr('المهمة', 'Task'), cell: (x) => <span className={x.status === 'done' ? 'text-muted line-through' : 'font-medium'}>{x.title}</span>, sortValue: (x) => x.title },
  { key: 'related', header: tr('مرتبطة بـ', 'Related'), cell: (x) => x.relatedType === 'case' && x.relatedId ? <Link className="text-xs text-primary hover:underline" to={`/transactions/${x.relatedId}`}>{tr('معاملة', 'Transaction')}</Link> : '—' },
  { key: 'assignee', header: t('common.assignee'), cell: (x) => name(lk.user.get(x.assigneeId)), sortValue: (x) => x.assigneeId },
  { key: 'due', header: t('common.dueDate'), cell: (x) => <span className="flex items-center gap-2">{date(x.dueDate)}{x.status === 'open' && <DaysLeft days={daysUntil(x.dueDate)} />}</span>, sortValue: (x) => x.dueDate },
  { key: 'prio', header: t('common.priority'), cell: (x) => <StatusBadge domain="prio" value={x.priority} />, sortValue: (x) => x.priority },
  { key: 'status', header: t('common.status'), cell: (x) => <StatusBadge domain="task" value={x.status} /> }];

  const remCols: Column<Reminder>[] = [
  { key: 'kind', header: t('common.type'), cell: (r) => <span className="text-xs">{t(`rem.${r.kind}`)}</span>, sortValue: (r) => r.kind },
  { key: 'title', header: tr('التنبيه', 'Reminder'), cell: (r) => <Link to={r.link} className="font-medium hover:text-primary">{lang === 'ar' ? r.title.ar : r.title.en}</Link>, sortValue: (r) => r.title.ar },
  { key: 'sub', header: t('common.description'), cell: (r) => <span className="text-xs text-muted">{lang === 'ar' ? r.subtitle.ar : r.subtitle.en}</span> },
  { key: 'date', header: t('common.date'), cell: (r) => date(r.date), sortValue: (r) => r.date ?? '' },
  { key: 'left', header: tr('المتبقي', 'Left'), cell: (r) => <DaysLeft days={r.daysLeft} />, sortValue: (r) => r.daysLeft ?? 9999 }];

  return (
    <div>
      <PageHeader title={t('nav.tasks')} crumbs={[{ label: t('nav.tasks') }]} actions={tab === 'tasks' && can('tasks.edit') && <Button onClick={() => setOpen(true)}><PlusIcon />{tr('مهمة جديدة', 'New task')}</Button>} />
      <Tabs className="mb-5" value={tab} onChange={(id) => setParams(id === 'reminders' ? { tab: 'reminders' } : {})} tabs={[{ id: 'tasks', label: tr('المهام', 'Tasks'), count: rows.length }, { id: 'reminders', label: tr('التنبيهات', 'Reminders'), count: reminders.length }]} />
      {tab === 'tasks' ?
      <DataTable
        tableId="tasks"
        rows={rows}
        columns={taskCols}
        getRowId={(x) => x.id}
        searchText={(x) => x.title}
        isLoading={tasks.isLoading}
        initialSort={{ key: 'due', dir: 'asc' }}
        toolbar={
        <>
              <FilterSelect label={t('common.assignee')} value={who} onChange={setWho} options={[{ value: 'mine', label: tr('مهامي', 'My tasks') }, { value: 'all', label: tr('كل المهام', 'All tasks') }]} />
              <FilterSelect label={t('common.status')} value={status} onChange={setStatus} options={[{ value: 'open', label: t('task.open') }, { value: 'done', label: t('task.done') }, { value: 'all', label: t('common.all') }]} />
            </>
        } /> :


      <DataTable tableId="reminders" rows={reminders} columns={remCols} getRowId={(r) => r.id} searchText={(r) => r.title.ar + r.title.en} isLoading={isLoading} pageSize={25} exportName="reminders" />
      }
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={tr('مهمة جديدة', 'New task')}
        footer={
        <>
            <Button variant="outline" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
            <Button
            loading={create.isPending}
            disabled={!f.title.trim()}
            onClick={() =>
            create.mutate(
              { ...f, title: f.title.trim(), status: 'open', createdAt: todayIso(), createdBy: user?.id ?? '' },
              { onSuccess: () => {toast.success(t('common.created'));setOpen(false);setF({ ...f, title: '' });}, onError: (e) => toast.error(errorMessage(e, lang)) }
            )
            }>

              {t('common.save')}
            </Button>
          </>
        }>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={tr('المهمة', 'Task')} required className="sm:col-span-2"><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
          <Field label={t('common.assignee')}><Select value={f.assigneeId} onChange={(e) => setF({ ...f, assigneeId: e.target.value })}>{lk.users.filter((u) => u.active).map((u) => <option key={u.id} value={u.id}>{name(u)}</option>)}</Select></Field>
          <Field label={t('common.dueDate')}><Input type="date" value={f.dueDate} onChange={(e) => setF({ ...f, dueDate: e.target.value })} /></Field>
          <Field label={t('common.priority')}><Select value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value as TaskPriority })}>{(['low', 'normal', 'high'] as const).map((p) => <option key={p} value={p}>{t(`prio.${p}`)}</option>)}</Select></Field>
        </div>
      </Dialog>
    </div>);

}
