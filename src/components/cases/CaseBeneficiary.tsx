import { Link } from 'react-router-dom';
import { InfoGrid, Panel } from '../ui/Panel';
import { Ltr } from '../ui/Display';
import { useI18n } from '../../hooks/useI18n';
import { useLookups } from '../../hooks/useLookups';
import type { Transaction } from '../../types/cases';

export function CaseBeneficiary({ tx }: {tx: Transaction;}) {
  const { t, tr, name, date, nat } = useI18n();
  const lk = useLookups();
  if (tx.type === 'family' && tx.dependents) {
    return (
      <Panel title={tr('المكفولون', 'Dependents')} description={tx.family?.eligibilityNote}>
        <ul className="divide-y divide-line">
          {tx.dependents.map((d) =>
          <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
              <span>
                <span className="font-medium">{name(d)}</span>
                <span className="ms-2 text-xs text-muted">{t(`rel.${d.relationship}`)} · {nat(d.nationality)}</span>
              </span>
              <span className="text-xs text-muted">
                <Ltr>{d.passportNo}</Ltr> · {date(d.passportExpiry)}
              </span>
            </li>
          )}
        </ul>
      </Panel>);

  }
  if (tx.visit) {
    const v = tx.visit;
    return (
      <Panel title={tr('بيانات المتقدم', 'Applicant')}>
        <InfoGrid cols={3} items={[
        { label: t('common.name'), value: tr(v.applicantNameAr, v.applicantNameEn) },
        { label: t('common.nationality'), value: nat(v.nationality) },
        { label: t('common.passport'), value: <Ltr>{v.passportNo}</Ltr> },
        { label: t('common.type'), value: t(`visit.${v.visaType}`) },
        { label: tr('المدة', 'Duration'), value: `${v.durationDays} ${t('common.days')}` },
        { label: tr('الكفيل', 'Sponsor'), value: v.sponsorName }]
        } />
      </Panel>);

  }
  if (tx.formation) {
    const f = tx.formation;
    return (
      <Panel title={tr('بيانات الترخيص', 'Licensing details')}>
        <InfoGrid cols={3} items={[
        { label: tr('الاسم التجاري', 'Trade name'), value: tr(f.tradeNameAr, f.tradeNameEn) },
        { label: tr('الاختصاص', 'Jurisdiction'), value: t(`jur.${f.jurisdiction}`) },
        { label: tr('الشكل القانوني', 'Legal form'), value: t(`legal.${f.legalForm}`) },
        { label: tr('النشاط', 'Activity'), value: f.activity }]
        } />
      </Panel>);

  }
  const e = tx.employeeId ? lk.employee.get(tx.employeeId) : undefined;
  if (!e) return null;
  return (
    <Panel title={tr('الموظف', 'Employee')}>
      <InfoGrid cols={3} items={[
      { label: t('common.name'), value: <Link className="text-primary hover:underline" to={`/employees/${e.id}`}>{name(e)}</Link> },
      { label: t('common.nationality'), value: nat(e.nationality) },
      { label: t('common.passport'), value: <Ltr>{e.passportNo}</Ltr> }]
      } />
    </Panel>);

}