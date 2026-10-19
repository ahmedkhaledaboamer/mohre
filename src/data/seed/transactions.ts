import type { CaseStatus, StageStatus, Transaction, WorkflowStage } from '../../types/cases';
import type { BranchId } from '../../types/common';
import { serviceCatalogSeed } from '../pricing';
import { templateById } from '../workflowTemplates';
import { buildStages, feesFromService, singleStage } from '../../utils/cases';
import { addDaysIso, dateFromToday, minIso, todayIso } from '../../utils/dates';
import { seedCompanies, seedCustomers, seedEmployees } from './people';

export const SEED_VAT_RATE = 5;

export type CollectPlan = 'full' | 'split' | 'partial' | 'none' | 'refund';
export type PayPlan = 'full' | 'partial' | 'none' | 'overrun';

/** One row = one transaction. Everything below is fictional demo data with stable ids. */
export interface SeedRow {
  svc: string;
  cus: string;
  cmp?: string;
  emp?: string;
  ben?: string;
  officer: string;
  by: string;
  ago: number;
  time: string;
  status: CaseStatus;
  collect: CollectPlan;
  pay: PayPlan;
  /** Government / provider fees were paid by the customer directly at the portal — office charges its fee only. */
  directByCustomer?: boolean;
  discount?: number;
  urgent?: boolean;
  costsFinalized?: boolean;
  /** Staff member who recorded the customer's payment, when not the officer. */
  collector?: string;
}

export const seedRows: SeedRow[] = [
/* 1 */{ svc: 'svc-offer', cus: 'cus-1', cmp: 'cmp-1', emp: 'emp-1', officer: 'u-pro1', by: 'u-pro1', ago: 0, time: '09:20', status: 'completed', collect: 'full', pay: 'full' },
/* 2 */{ svc: 'svc-medical', cus: 'cus-2', cmp: 'cmp-2', emp: 'emp-4', officer: 'u-pro2', by: 'u-pro2', ago: 0, time: '10:05', status: 'in_progress', collect: 'none', pay: 'none' },
/* 3 */{ svc: 'svc-visit', cus: 'cus-13', ben: 'سعاد نصر', officer: 'u-pro1', by: 'u-pro1', ago: 0, time: '11:30', status: 'submitted', collect: 'full', pay: 'full' },
/* 4 */{ svc: 'svc-eid', cus: 'cus-4', cmp: 'cmp-4', emp: 'emp-10', officer: 'u-owner', by: 'u-owner', ago: 0, time: '12:10', status: 'new', collect: 'none', pay: 'none' },
/* 5 */{ svc: 'svc-res-renew', cus: 'cus-3', cmp: 'cmp-3', emp: 'emp-7', officer: 'u-pro1', by: 'u-pro1', ago: 1, time: '09:45', status: 'completed', collect: 'full', pay: 'full' },
/* 6 */{ svc: 'svc-health-ins', cus: 'cus-11', ben: 'رامي نصر', officer: 'u-pro2', by: 'u-pro2', ago: 1, time: '13:00', status: 'completed', collect: 'full', pay: 'full', collector: 'u-acc' },
/* 7 */{ svc: 'svc-fam-package', cus: 'cus-12', ben: 'سارة كومار مينون (زوجة)', officer: 'u-pro1', by: 'u-owner', ago: 1, time: '15:20', status: 'in_progress', collect: 'partial', pay: 'partial' },
/* 8 */{ svc: 'svc-wp-renew', cus: 'cus-5', cmp: 'cmp-5', emp: 'emp-13', officer: 'u-pro2', by: 'u-pro2', ago: 2, time: '10:00', status: 'waiting_payment', collect: 'none', pay: 'none' },
/* 9 */{ svc: 'svc-res-package', cus: 'cus-1', cmp: 'cmp-1', emp: 'emp-2', officer: 'u-pro1', by: 'u-pro1', ago: 2, time: '11:15', status: 'in_progress', collect: 'partial', pay: 'partial', urgent: true },
/* 10 */{ svc: 'svc-attest', cus: 'cus-14', officer: 'u-pro2', by: 'u-pro2', ago: 3, time: '09:30', status: 'completed', collect: 'full', pay: 'none', directByCustomer: true },
/* 11 */{ svc: 'svc-license-renew', cus: 'cus-6', cmp: 'cmp-6', officer: 'u-pro1', by: 'u-owner', ago: 3, time: '14:00', status: 'waiting_documents', collect: 'none', pay: 'none', urgent: true },
/* 12 */{ svc: 'svc-res-cancel', cus: 'cus-2', cmp: 'cmp-2', emp: 'emp-6', officer: 'u-pro2', by: 'u-pro2', ago: 4, time: '10:40', status: 'completed', collect: 'full', pay: 'full' },
/* 13 */{ svc: 'svc-cos', cus: 'cus-7', cmp: 'cmp-7', emp: 'emp-19', officer: 'u-pro1', by: 'u-pro1', ago: 4, time: '12:30', status: 'rejected', collect: 'none', pay: 'full' },
/* 14 */{ svc: 'svc-pro', cus: 'cus-9', cmp: 'cmp-9', officer: 'u-pro2', by: 'u-pro2', ago: 5, time: '11:00', status: 'completed', collect: 'full', pay: 'overrun' },
/* 15 */{ svc: 'svc-iloe', cus: 'cus-8', cmp: 'cmp-8', emp: 'emp-22', officer: 'u-pro1', by: 'u-pro1', ago: 5, time: '13:45', status: 'completed', collect: 'none', pay: 'none', directByCustomer: true },
/* 16 */{ svc: 'svc-fam-renew', cus: 'cus-15', ben: 'نور ماريا سانتوس (ابنة)', officer: 'u-pro2', by: 'u-pro2', ago: 6, time: '09:10', status: 'completed', collect: 'full', pay: 'full' },
/* 17 */{ svc: 'svc-entry', cus: 'cus-10', cmp: 'cmp-10', emp: 'emp-28', officer: 'u-pro1', by: 'u-pro1', ago: 6, time: '16:00', status: 'submitted', collect: 'none', pay: 'full' },
/* 18 */{ svc: 'svc-formation', cus: 'cus-20', officer: 'u-pro1', by: 'u-owner', ago: 8, time: '10:20', status: 'in_progress', collect: 'partial', pay: 'partial' },
/* 19 */{ svc: 'svc-wp-deposit', cus: 'cus-4', cmp: 'cmp-4', emp: 'emp-11', officer: 'u-pro2', by: 'u-pro2', ago: 9, time: '11:40', status: 'completed', collect: 'full', pay: 'none', directByCustomer: true },
/* 20 */{ svc: 'svc-tawjeeh', cus: 'cus-3', cmp: 'cmp-3', emp: 'emp-8', officer: 'u-pro1', by: 'u-pro1', ago: 10, time: '10:00', status: 'completed', collect: 'full', pay: 'none', directByCustomer: true },
/* 21 */{ svc: 'svc-health-ins', cus: 'cus-16', ben: 'عمران شيخ', officer: 'u-pro2', by: 'u-pro2', ago: 11, time: '12:00', status: 'cancelled', collect: 'refund', pay: 'none' },
/* 22 */{ svc: 'svc-visa-inside', cus: 'cus-5', cmp: 'cmp-5', emp: 'emp-14', officer: 'u-pro1', by: 'u-pro1', ago: 12, time: '09:50', status: 'completed', collect: 'partial', pay: 'full' },
/* 23 */{ svc: 'svc-fam-entry', cus: 'cus-17', ben: 'آدم ماثيو (ابن)', officer: 'u-pro2', by: 'u-pro2', ago: 13, time: '14:30', status: 'waiting_documents', collect: 'none', pay: 'none' },
/* 24 */{ svc: 'svc-residence', cus: 'cus-6', cmp: 'cmp-6', emp: 'emp-16', officer: 'u-pro1', by: 'u-pro1', ago: 15, time: '10:30', status: 'completed', collect: 'full', pay: 'full', collector: 'u-acc' },
/* 25 */{ svc: 'svc-license-amend', cus: 'cus-2', cmp: 'cmp-2', officer: 'u-pro2', by: 'u-owner', ago: 17, time: '11:00', status: 'submitted', collect: 'full', pay: 'full' },
/* 26 */{ svc: 'svc-wp-fee', cus: 'cus-7', cmp: 'cmp-7', emp: 'emp-20', officer: 'u-pro1', by: 'u-pro1', ago: 18, time: '09:00', status: 'completed', collect: 'full', pay: 'none', directByCustomer: true, discount: 50 },
/* 27 */{ svc: 'svc-fam-medical', cus: 'cus-18', ben: 'مريم خوري (أم)', officer: 'u-pro2', by: 'u-pro2', ago: 20, time: '13:10', status: 'completed', collect: 'full', pay: 'partial', costsFinalized: true },
/* 28 */{ svc: 'svc-est-card', cus: 'cus-9', cmp: 'cmp-9', officer: 'u-pro1', by: 'u-pro1', ago: 22, time: '10:45', status: 'completed', collect: 'full', pay: 'none', directByCustomer: true },
/* 29 */{ svc: 'svc-visit', cus: 'cus-19', ben: 'محمود الدوري', officer: 'u-pro2', by: 'u-pro2', ago: 24, time: '15:00', status: 'completed', collect: 'none', pay: 'full' },
/* 30 */{ svc: 'svc-res-renew', cus: 'cus-8', cmp: 'cmp-8', emp: 'emp-23', officer: 'u-pro1', by: 'u-pro1', ago: 26, time: '09:40', status: 'completed', collect: 'partial', pay: 'full' },
/* 31 */{ svc: 'svc-offer', cus: 'cus-10', cmp: 'cmp-10', emp: 'emp-29', officer: 'u-pro2', by: 'u-pro2', ago: 28, time: '10:15', status: 'completed', collect: 'full', pay: 'none', directByCustomer: true },
/* 32 */{ svc: 'svc-fam-cancel', cus: 'cus-11', ben: 'سارة نصر (ابنة)', officer: 'u-pro1', by: 'u-pro1', ago: 30, time: '11:20', status: 'completed', collect: 'full', pay: 'none', directByCustomer: true },
/* 33 */{ svc: 'svc-medical', cus: 'cus-1', cmp: 'cmp-1', emp: 'emp-3', officer: 'u-pro2', by: 'u-pro2', ago: 33, time: '09:30', status: 'completed', collect: 'full', pay: 'full', collector: 'u-acc' },
/* 34 */{ svc: 'svc-license-issue', cus: 'cus-14', officer: 'u-pro1', by: 'u-owner', ago: 35, time: '12:00', status: 'completed', collect: 'full', pay: 'full' },
/* 35 */{ svc: 'svc-eid', cus: 'cus-3', cmp: 'cmp-3', emp: 'emp-9', officer: 'u-pro2', by: 'u-pro2', ago: 38, time: '10:10', status: 'completed', collect: 'full', pay: 'none', directByCustomer: true },
/* 36 */{ svc: 'svc-pro', cus: 'cus-12', officer: 'u-pro1', by: 'u-pro1', ago: 41, time: '14:00', status: 'completed', collect: 'none', pay: 'full' },
/* 37 */{ svc: 'svc-fam-insurance', cus: 'cus-13', ben: 'رنا العلي (ابنة)', officer: 'u-pro2', by: 'u-pro2', ago: 45, time: '11:30', status: 'completed', collect: 'full', pay: 'full' },
/* 38 */{ svc: 'svc-res-cancel', cus: 'cus-4', cmp: 'cmp-4', emp: 'emp-12', officer: 'u-pro1', by: 'u-pro1', ago: 50, time: '09:00', status: 'completed', collect: 'full', pay: 'none', directByCustomer: true },
/* 39 */{ svc: 'svc-trade-name', cus: 'cus-20', officer: 'u-pro2', by: 'u-pro2', ago: 55, time: '10:00', status: 'completed', collect: 'full', pay: 'none', directByCustomer: true },
/* 40 */{ svc: 'svc-wp-renew', cus: 'cus-9', cmp: 'cmp-9', emp: 'emp-26', officer: 'u-pro1', by: 'u-pro1', ago: 60, time: '12:00', status: 'completed', collect: 'full', pay: 'none', directByCustomer: true, collector: 'u-acc' }];


const svcById = new Map(serviceCatalogSeed.map((s) => [s.id, s]));
const pad = (n: number) => String(n).padStart(4, '0');

/** How many applicable stages are finished for a given transaction status. */
function stageProgress(status: CaseStatus, count: number) {
  if (status === 'completed') return count;
  if (status === 'new' || status === 'cancelled') return 0;
  return Math.min(Math.max(Math.floor(count / 2), count > 1 ? 1 : 0), count - 1);
}

const currentStageStatus: Partial<Record<CaseStatus, StageStatus>> = {
  in_progress: 'in_progress',
  waiting_documents: 'waiting_customer',
  waiting_payment: 'waiting_payment',
  submitted: 'submitted',
  rejected: 'rejected',
  cancelled: 'cancelled'
};

function progressStages(stages: WorkflowStage[], status: CaseStatus, date: string, extRef: string) {
  const app = stages.filter((s) => s.applicable);
  const done = stageProgress(status, app.length);
  app.forEach((s, j) => {
    const start = minIso(addDaysIso(date, j), todayIso());
    if (j < done) {
      s.status = 'completed';
      s.startDate = start;
      s.completedDate = minIso(addDaysIso(start, 1), todayIso());
      if (s.expectedCost > 0) s.referenceNo = `${extRef}-${j + 1}`;
    } else if (j === done && currentStageStatus[status]) {
      s.status = currentStageStatus[status]!;
      s.startDate = start;
      if (s.status === 'rejected') {
        s.rejectionReason = 'صورة جواز السفر غير واضحة وصلاحية الجواز أقل من المطلوب';
        s.nextAction = 'طلب نسخة جواز جديدة من العميل وإعادة التقديم';
      } else if (s.status === 'waiting_customer') s.nextAction = 'بانتظار استلام المستندات الأصلية من العميل';else
      if (s.status === 'waiting_payment') s.nextAction = 'تحصيل الرسوم من العميل قبل السداد للجهة';else
      if (s.status === 'submitted') {
        s.referenceNo = extRef;
        s.nextAction = 'متابعة حالة الطلب لدى الجهة';
      } else s.nextAction = 'استكمال إجراءات المرحلة';
    }
  });
}

function beneficiaryLabel(r: SeedRow) {
  const emp = r.emp ? seedEmployees.find((e) => e.id === r.emp) : undefined;
  if (emp) return { ar: emp.nameAr, en: emp.nameEn };
  if (r.ben) return { ar: r.ben, en: r.ben };
  const cmp = r.cmp ? seedCompanies.find((c) => c.id === r.cmp) : undefined;
  const cus = seedCustomers.find((c) => c.id === r.cus)!;
  return cmp ? { ar: cmp.nameAr, en: cmp.nameEn } : { ar: cus.nameAr, en: cus.nameEn };
}

export const seedTransactions: Transaction[] = seedRows.map((r, i) => {
  const svc = svcById.get(r.svc)!;
  const customer = seedCustomers.find((c) => c.id === r.cus)!;
  const date = dateFromToday(-r.ago);
  const template = templateById(svc.templateId);
  const extRef = `MB${String(40817000 + i * 7919).slice(-8)}`;
  const stages = template ?
  buildStages(template, serviceCatalogSeed, { insideUae: false, medicalRequired: true, startDate: date, assigneeId: r.officer }) :
  singleStage(svc, { startDate: date, assigneeId: r.officer });
  stages.forEach((s, j) => {
    s.id = `stg-${i + 1}-${j + 1}`;
  });
  progressStages(stages, r.status, date, extRef);

  const fees = feesFromService(svc, SEED_VAT_RATE);
  if (r.directByCustomer) {
    fees.governmentFee = 0;
    fees.providerCost = 0;
    fees.otherCosts = 0;
    stages.forEach((s) => {
      s.expectedCost = 0;
    });
  }
  if (r.discount) fees.discount = r.discount;

  const ben = beneficiaryLabel(r);
  const sla = template ? template.stages.reduce((a, s) => a + s.slaDays, 0) : svc.slaDays;
  const completedAt = r.status === 'completed' ? minIso(addDaysIso(date, Math.min(r.ago, Math.max(1, Math.floor(sla / 3)))), todayIso()) : undefined;
  const branchId: BranchId = r.cmp ? seedCompanies.find((c) => c.id === r.cmp)!.branchId : customer.branchId;

  const tx: Transaction = {
    id: `trx-${i + 1}`,
    ref: `TRX-2026-${pad(i + 1)}`,
    serviceId: svc.id,
    type: svc.category,
    templateId: template?.id,
    pathway: template?.pathway ?? 'standard',
    titleAr: `${svc.nameAr} — ${ben.ar}`,
    titleEn: `${svc.nameEn} — ${ben.en}`,
    customerId: r.cus,
    companyId: r.cmp,
    employeeId: r.emp,
    beneficiaryName: r.emp ? undefined : r.ben,
    status: r.status,
    priority: r.urgent ? 'urgent' : 'normal',
    branchId,
    officerId: r.officer,
    createdBy: r.by,
    createdAt: `${date}T${r.time}:00`,
    transactionDate: date,
    externalRef: r.status === 'new' ? undefined : extRef,
    startedAt: r.status === 'new' ? undefined : date,
    dueDate: addDaysIso(date, sla),
    completedAt,
    completedBy: completedAt ? r.officer : undefined,
    fees,
    costsFinalized: r.costsFinalized,
    stages,
    notes: r.directByCustomer ?
    [{ id: `note-trx-${i + 1}`, body: 'الرسوم الحكومية/رسوم المزود دفعها العميل مباشرة عبر البوابة؛ المكتب يحصّل أتعابه فقط.', authorId: r.by, createdAt: `${date}T${r.time}:30`, channel: 'note' }] :
    []
  };
  if (svc.category === 'visit') {
    tx.visit = { visaType: 'family_visit', durationDays: 30, applicantNameAr: ben.ar, applicantNameEn: ben.en, nationality: customer.nationality, passportNo: `P${pad(5000 + i * 37)}${i}`, applicationDate: date, sponsorName: customer.nameAr };
  }
  if (svc.category === 'formation') {
    const cmp = r.cmp ? seedCompanies.find((c) => c.id === r.cmp) : undefined;
    tx.formation = {
      caseKind: svc.id === 'svc-license-renew' ? 'renewal' : svc.id === 'svc-license-amend' ? 'amendment' : 'new',
      jurisdiction: cmp?.jurisdiction ?? 'mainland',
      authority: cmp?.authority ?? 'det',
      legalForm: cmp?.legalForm ?? 'sole_establishment',
      activity: cmp?.activitiesAr[0] ?? 'استشارات هندسية',
      tradeNameAr: cmp?.nameAr ?? 'الدوري للاستشارات الهندسية',
      tradeNameEn: cmp?.nameEn ?? 'Al Douri Engineering Consultancy'
    };
  }
  return tx;
});
