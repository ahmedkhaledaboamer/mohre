import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { HandCoinsIcon, PencilIcon, ReceiptTextIcon, ShieldAlertIcon, Trash2Icon, Undo2Icon, WalletIcon, PlusIcon, MoreHorizontalIcon } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Tabs } from '../../components/ui/Tabs';
import { InfoGrid, Panel } from '../../components/ui/Panel';
import { ErrorState, PageSkeleton } from '../../components/ui/Feedback';
import { Ltr, Money } from '../../components/ui/Display';
import { Dropdown } from '../../components/ui/Dropdown';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { StatusBadge } from '../../components/status/StatusBadge';
import { StatCard } from '../../components/shared/StatCard';
import { WorkflowTimeline } from '../../components/cases/WorkflowTimeline';
import { StageEditDialog } from '../../components/cases/StageEditDialog';
import { CaseActions } from '../../components/cases/CaseActions';
import { CaseFinancials } from '../../components/cases/CaseFinancials';
import { CaseBeneficiary } from '../../components/cases/CaseBeneficiary';
import { CaseDetailsDialog, CaseFeesDialog } from '../../components/cases/CaseEditDialogs';
import { ReceiptDialog } from '../../components/finance/ReceiptDialog';
import { PaymentDialog } from '../../components/finance/PaymentDialog';
import { DocumentsTable } from '../../components/documents/DocumentsTable';
import { ActivityTimeline } from '../../components/shared/ActivityTimeline';
import { NotesPanel } from '../../components/shared/NotesPanel';
import { documentHooks, useActivity, useAddNote, useRemoveTransaction, useStageUpdate } from '../../hooks/useApi';
import { useLedger } from '../../hooks/useLedger';
import { useI18n } from '../../hooks/useI18n';
import { useLookups } from '../../hooks/useLookups';
import { usePermissions } from '../../hooks/usePermissions';
import { templateById } from '../../data/workflowTemplates';
import { caseFlags, caseProgress, currentStage, stageActuals } from '../../utils/cases';
import { addDaysIso, todayIso } from '../../utils/dates';
import { errorMessage } from '../../utils/errors';
import { cn } from '../../utils/cn';
import type { WorkflowStage } from '../../types/cases';
import type { PaymentCategory } from '../../types/finance';

const segColor: Record<string, string> = {
  completed: 'bg-success',
  in_progress: 'bg-info',
  submitted: 'bg-primary',
  waiting_customer: 'bg-warning',
  waiting_payment: 'bg-warning',
  rejected: 'bg-danger',
  cancelled: 'bg-line-strong',
  not_started: 'bg-subtle'
};

export function CaseDetail() {
  const { id } = useParams();
  const { t, tr, name, date, dateTime, lang } = useI18n();
  const { can, canEditTx, canEditStep } = usePermissions();
  const navigate = useNavigate();
  const lk = useLookups();
  const { ledger, invoiceViews, isLoading, isError, refetch } = useLedger({ ignoreBranch: true });
  const stageUpdate = useStageUpdate();
  const addNote = useAddNote();
  const remove = useRemoveTransaction();
  const docs = documentHooks.useList();
  const activity = useActivity();
  const [tab, setTab] = useState('overview');
  const [editing, setEditing] = useState<WorkflowStage | null>(null);
  const [dlg, setDlg] = useState<null | 'receipt' | 'refund' | 'fees' | 'details' | 'delete'>(null);
  const [payDlg, setPayDlg] = useState<{category: PaymentCategory;stageId?: string;} | null>(null);

  const summary = id ? ledger.summaries.get(id) : undefined;
  const tx = summary?.tx;
  const myDocs = useMemo(() => (docs.data ?? []).filter((d) => d.entityId === id || tx?.employeeId && d.entityId === tx.employeeId), [docs.data, id, tx?.employeeId]);
  const myActivity = useMemo(() => (activity.data ?? []).filter((a) => a.entityId === id), [activity.data, id]);
  const myInvoices = useMemo(() => invoiceViews.filter((v) => v.invoice.lines.some((l) => l.transactionId === id)), [invoiceViews, id]);

  if (isLoading) return <PageSkeleton />;
  if (isError) return <ErrorState onRetry={refetch} />;
  if (!tx || !summary) return <ErrorState message={tr('المعاملة غير موجودة', 'Transaction not found')} />;

  const p = caseProgress(tx);
  const stage = currentStage(tx);
  const flags = caseFlags(tx);
  const template = templateById(tx.templateId);
  const svc = lk.service.get(tx.serviceId);
  const editable = canEditTx(tx);
  const closed = tx.status === 'completed' || tx.status === 'cancelled';
  const groups = tx.dependents?.length ? tx.dependents.map((d) => ({ dep: d, stages: tx.stages.filter((s) => s.dependentId === d.id) })) : [{ dep: undefined, stages: tx.stages }];

  const toggleApplicable = (s: WorkflowStage) => {
    if (s.applicable && s.status !== 'not_started') {
      toast.error(tr('لا يمكن استبعاد خطوة بدأت بالفعل', 'Cannot exclude a step that has already started'));
      return;
    }
    stageUpdate.mutate(
      { caseId: tx.id, stageId: s.id, patch: { applicable: !s.applicable, dueDate: s.dueDate ?? addDaysIso(todayIso(), 5) } },
      { onSuccess: () => toast.success(s.applicable ? tr('تم استبعاد الخطوة', 'Step excluded') : tr('تم تضمين الخطوة', 'Step included')), onError: (e) => toast.error(errorMessage(e, lang)) }
    );
  };

  const unknown = summary.realizedUnknownReason === 'costs_pending' ? tr('بانتظار سداد التكاليف', 'Costs still unpaid') : summary.realizedUnknownReason === 'cancelled' ? tr('ملغاة', 'Cancelled') : tr('يُحدد عند الإكمال', 'Known when completed');

  return (
    <div>
      <PageHeader
        title={tr(tx.titleAr, tx.titleEn)}
        crumbs={[{ label: t('nav.transactions'), to: '/transactions' }, { label: tx.ref }]}
        meta={
        <>
            <Ltr className="text-xs font-medium text-muted">{tx.ref}</Ltr>
            <StatusBadge domain="case" value={tx.status} />
            <span className="text-xs text-muted">{t(`ctype.${tx.type}`)}</span>
            {tx.priority === 'urgent' && <StatusBadge domain="prio" value="urgent" />}
            {flags.overdue && <span className="rounded bg-danger-soft px-1.5 py-0.5 text-xs font-medium text-danger">{tr('متأخرة عن الموعد', 'Past due')}</span>}
          </>
        }
        actions={
        <>
            {can('collections.record') && tx.status !== 'cancelled' && summary.customerBalance > 0 &&
          <Button onClick={() => setDlg('receipt')}>
                <WalletIcon />
                {tr('تسجيل تحصيل', 'Record collection')}
              </Button>
          }
            {can('payments.record') &&
          <Button variant="outline" onClick={() => setPayDlg({ category: summary.totals.government >= summary.totals.provider ? 'government_fee' : 'provider_cost' })}>
                <HandCoinsIcon />
                {tr('دفع للجهة', 'Pay authority')}
              </Button>
          }
            <CaseActions tx={tx} summary={summary} />
            <Dropdown
            width="w-60"
            trigger={({ toggle }) =>
            <Button variant="outline" size="icon" onClick={toggle} aria-label={t('common.actions')}>
                  <MoreHorizontalIcon />
                </Button>
            }
            items={[
            { label: tr('تعديل البيانات', 'Edit details'), icon: PencilIcon, onSelect: () => setDlg('details'), hidden: !editable },
            { label: tr('تعديل الرسوم', 'Edit fees'), icon: PencilIcon, onSelect: () => setDlg('fees'), hidden: !(editable || can('cases.fees')) || tx.status === 'cancelled' },
            { label: tr('مصروف إضافي على المعاملة', 'Extra cost on transaction'), icon: PlusIcon, onSelect: () => setPayDlg({ category: 'other_direct_cost' }), hidden: !can('payments.record') },
            { label: tr('رد مبلغ للعميل', 'Refund customer'), icon: Undo2Icon, onSelect: () => setDlg('refund'), hidden: !can('collections.record') || summary.collected <= 0 },
            { label: tr('إنشاء فاتورة', 'Create invoice'), icon: ReceiptTextIcon, onSelect: () => navigate(`/invoices/new?customer=${tx.customerId}&transaction=${tx.id}`), hidden: !can('finance.edit') || tx.status === 'cancelled' },
            { label: tr('حذف المعاملة', 'Delete transaction'), icon: Trash2Icon, danger: true, onSelect: () => setDlg('delete'), hidden: !can('cases.delete') }]
            } />

          </>
        } />


      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        <StatCard label={t('common.amountDue')} value={tx.status === 'cancelled' ? 0 : summary.totals.due} />
        <StatCard label={t('common.collected')} value={summary.collected} tone="success" />
        <StatCard label={t('common.customerBalance')} value={summary.customerBalance} tone={summary.customerBalance > 0 ? 'warning' : 'default'} hint={summary.customerBalance < 0 ? tr('رصيد دائن للعميل', 'Customer credit') : undefined} />
        <StatCard label={tr('المدفوع للجهات', 'Paid to authorities')} value={summary.paidOut} />
        <StatCard label={t('common.payable')} value={summary.payable} />
        <StatCard label={t('common.estimatedProfit')} value={summary.estimatedProfit} tone="primary" unknownLabel={tr('لا ينطبق', 'N/A')} />
        <StatCard label={t('common.realizedProfit')} value={summary.realizedProfit} tone="primary" unknownLabel={unknown} />
      </div>

      <div className="mb-5 rounded-xl border border-line bg-surface p-4 shadow-card">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="num text-2xl font-semibold">{p.pct}%</span>
            <span className="text-sm text-muted">{tr(`${p.done} من ${p.total} خطوات مكتملة`, `${p.done} of ${p.total} steps complete`)}</span>
          </div>
          {stage && !closed &&
          <span className="flex items-center gap-2 text-sm">
              <span className="text-muted">{t('common.currentStage')}:</span>
              <span className="font-medium">{tr(stage.nameAr, stage.nameEn)}</span>
              <StatusBadge domain="stage" value={stage.status} />
            </span>
          }
        </div>
        {groups.map(({ dep, stages }) =>
        <div key={dep?.id ?? 'main'} className="mt-2 flex items-center gap-3">
            {dep && <span className="w-28 shrink-0 truncate text-xs text-muted">{name(dep)}</span>}
            <div className="flex flex-1 gap-1" dir="ltr">
              {stages.filter((s) => s.applicable).map((s) =>
            <div key={s.id} title={`${tr(s.nameAr, s.nameEn)} — ${t(`stage.${s.status}`)}`} className={cn('h-2 flex-1 rounded-full', segColor[s.status])} />
            )}
            </div>
          </div>
        )}
        {tx.overrideReason &&
        <p className="mt-3 flex items-center gap-2 rounded-md bg-danger-soft px-3 py-2 text-xs text-danger">
            <ShieldAlertIcon className="h-3.5 w-3.5" />
            {tr('أُكملت بتجاوز مُدقق: ', 'Completed via audited override: ')}
            {tx.overrideReason}
          </p>
        }
      </div>

      <Tabs
        className="mb-5"
        value={tab}
        onChange={setTab}
        tabs={[
        { id: 'overview', label: t('common.overview') },
        { id: 'financials', label: t('common.financials') },
        { id: 'workflow', label: tr('خطوات التنفيذ', 'Workflow'), count: p.total },
        { id: 'documents', label: t('common.documents'), count: myDocs.length },
        { id: 'activity', label: t('common.activity'), count: myActivity.length },
        { id: 'notes', label: t('common.notes'), count: tx.notes.length }]
        } />


      {tab === 'overview' &&
      <div className="grid gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <Panel title={tr('بيانات المعاملة', 'Transaction details')}>
              <InfoGrid
              cols={3}
              items={[
              { label: tr('الخدمة', 'Service'), value: svc ? tr(svc.nameAr, svc.nameEn || svc.nameAr) : tx.serviceId },
              { label: t('common.customer'), value: <Link className="text-primary hover:underline" to={`/customers/${tx.customerId}`}>{name(lk.customer.get(tx.customerId))}</Link> },
              { label: t('common.company'), value: tx.companyId ? <Link className="text-primary hover:underline" to={`/companies/${tx.companyId}`}>{name(lk.company.get(tx.companyId))}</Link> : tr('معاملة فردية', 'Individual') },
              { label: tr('المستفيد', 'Beneficiary'), value: tx.employeeId ? <Link className="text-primary hover:underline" to={`/employees/${tx.employeeId}`}>{name(lk.employee.get(tx.employeeId))}</Link> : tx.beneficiaryName ?? '—' },
              { label: tr('الموظف المنفذ', 'Executing officer'), value: name(lk.user.get(tx.officerId)) },
              { label: tr('سجّلها', 'Registered by'), value: `${name(lk.user.get(tx.createdBy))} · ${dateTime(tx.createdAt)}` },
              { label: tr('تاريخ المعاملة', 'Transaction date'), value: date(tx.transactionDate) },
              { label: tr('الرقم المرجعي لدى الجهة', 'Authority reference'), value: tx.externalRef ? <Ltr>{tx.externalRef}</Ltr> : '—' },
              { label: t('common.dueDate'), value: <span className={flags.overdue ? 'text-danger' : ''}>{date(tx.dueDate)}</span> },
              { label: tr('تاريخ الإكمال', 'Completed'), value: tx.completedAt ? `${date(tx.completedAt)} · ${name(lk.user.get(tx.completedBy ?? ''))}` : '—' },
              { label: tr('آخر تعديل', 'Last updated'), value: tx.updatedAt ? `${name(lk.user.get(tx.updatedBy ?? ''))} · ${dateTime(tx.updatedAt)}` : '—' },
              { label: t('common.branch'), value: t(`branch.${tx.branchId}`) }]
              } />

            </Panel>
            <CaseBeneficiary tx={tx} />
          </div>
          <div className="space-y-5">
            {stage && !closed &&
          <Panel title={tr('الخطوة التالية', 'Next step')}>
                <p className="text-sm font-medium">{tr(stage.nameAr, stage.nameEn)}</p>
                <p className="mt-1 text-sm text-ink-2">{stage.nextAction ?? tr('لا يوجد إجراء محدد', 'No action specified')}</p>
                <p className="mt-2 text-xs text-muted">
                  {tr('الاستحقاق', 'Due')} {date(stage.dueDate)} · {name(lk.user.get(stage.assigneeId ?? ''))}
                </p>
                {canEditStep(tx, stage) &&
            <Button size="sm" variant="outline" className="mt-3" onClick={() => setEditing(stage)}>
                    {tr('تحديث الخطوة', 'Update step')}
                  </Button>
            }
              </Panel>
          }
            {svc && svc.requiredDocuments.length > 0 &&
          <Panel title={tr('المستندات المطلوبة', 'Required documents')}>
                <ul className="space-y-1 text-sm text-ink-2">
                  {svc.requiredDocuments.map((d) => <li key={d}>• {d}</li>)}
                </ul>
              </Panel>
          }
            <Panel title={tr('ملخص مالي سريع', 'Quick money summary')}>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-muted">{t('common.serviceFee')}</dt><dd><Money value={summary.totals.netService} /></dd></div>
                <div className="flex justify-between"><dt className="text-muted">{tr('رسوم وتكاليف الجهات', 'Authority / provider costs')}</dt><dd><Money value={summary.totals.directCosts} /></dd></div>
                <div className="flex justify-between"><dt className="text-muted">{t('common.vat')}</dt><dd><Money value={summary.totals.vat} /></dd></div>
                <div className="flex justify-between border-t border-line pt-2 font-semibold"><dt>{t('common.amountDue')}</dt><dd><Money value={summary.totals.due} /></dd></div>
              </dl>
              <Button size="sm" variant="ghost" className="mt-2" onClick={() => setTab('financials')}>
                {tr('التفاصيل المالية الكاملة', 'Full financials')}
              </Button>
            </Panel>
          </div>
        </div>
      }

      {tab === 'financials' && <CaseFinancials tx={tx} summary={summary} receipts={ledger.receipts} payments={ledger.payments} invoices={myInvoices} />}

      {tab === 'workflow' &&
      <div className="space-y-6">
          {groups.map(({ dep, stages }) =>
        <Panel
          key={dep?.id ?? 'main'}
          title={dep ? `${name(dep)} — ${t(`rel.${dep.relationship}`)}` : template ? tr(template.nameAr, template.nameEn) : tr('خطوة واحدة', 'Single step')}
          description={template ? tr(template.descriptionAr, template.descriptionEn) : undefined}>

              <WorkflowTimeline
            tx={tx}
            stages={stages}
            canEdit={(s) => canEditStep(tx, s)}
            onEdit={setEditing}
            onToggleApplicable={toggleApplicable}
            actuals={(s) => stageActuals(tx, s, ledger.receipts, ledger.payments)} />

            </Panel>
        )}
          {!editable && <p className="text-xs text-muted">{tr('يمكنك الاطلاع على الخطوات فقط؛ التعديل متاح للموظف المسند إليه الخطوة أو المدير.', 'View only; steps can be updated by their assignee or a manager.')}</p>}
        </div>
      }

      {tab === 'documents' && <DocumentsTable tableId="case-docs" docs={myDocs} isLoading={docs.isLoading} uploadFor={{ entityType: 'case', entityId: tx.id }} showEntity />}
      {tab === 'activity' &&
      <Panel>
          <ActivityTimeline entries={myActivity} isLoading={activity.isLoading} />
        </Panel>
      }
      {tab === 'notes' &&
      <NotesPanel
        title={t('common.notes')}
        notes={tx.notes}
        saving={addNote.isPending}
        onAdd={(note) => addNote.mutate({ id: tx.id, body: note.body, channel: note.channel }, { onSuccess: () => toast.success(t('common.saved')), onError: (e) => toast.error(errorMessage(e, lang)) })} />

      }

      <StageEditDialog tx={tx} stage={editing} onClose={() => setEditing(null)} />
      <ReceiptDialog open={dlg === 'receipt'} onClose={() => setDlg(null)} customerId={tx.customerId} transactionId={tx.id} />
      <ReceiptDialog open={dlg === 'refund'} kind="refund" onClose={() => setDlg(null)} customerId={tx.customerId} transactionId={tx.id} />
      <PaymentDialog open={Boolean(payDlg)} onClose={() => setPayDlg(null)} transactionId={tx.id} category={payDlg?.category} stageId={payDlg?.stageId} />
      <CaseFeesDialog tx={tx} open={dlg === 'fees'} onClose={() => setDlg(null)} />
      <CaseDetailsDialog tx={tx} open={dlg === 'details'} onClose={() => setDlg(null)} />
      <ConfirmDialog
        open={dlg === 'delete'}
        onClose={() => setDlg(null)}
        title={tr('حذف المعاملة', 'Delete transaction')}
        description={tr('يُسمح بالحذف فقط للمعاملات التي ليس لها سندات قبض أو صرف أو فواتير. استخدم الإلغاء بدلاً من ذلك عند وجود حركات مالية.', 'Only transactions without vouchers or invoices can be deleted. Cancel instead when money was recorded.')}
        confirmLabel={t('common.delete')}
        loading={remove.isPending}
        onConfirm={() =>
        remove.mutate(tx.id, {
          onSuccess: () => {
            toast.success(t('common.deleted'));
            navigate('/transactions');
          },
          onError: (e) => {
            toast.error(errorMessage(e, lang));
            setDlg(null);
          }
        })
        } />

    </div>);

}
