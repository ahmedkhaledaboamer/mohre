import type { BranchId, Note } from './common';
import type { Jurisdiction, LegalForm } from './crm';
import type { ServiceCategory, VatTreatment } from './catalog';

export type CaseType = ServiceCategory;

/** Transaction lifecycle. Set explicitly by staff — completing never implies the customer paid. */
export type CaseStatus =
'new' |
'in_progress' |
'waiting_documents' |
'waiting_payment' |
'submitted' |
'completed' |
'rejected' |
'cancelled';

export type StageStatus =
'not_started' |
'in_progress' |
'waiting_customer' |
'waiting_payment' |
'submitted' |
'completed' |
'rejected' |
'cancelled';

export type CasePathway = 'standard' | 'integrated' | 'renewal' | 'amendment';

/** Condition evaluated when a workflow template is applied to a specific case/dependent. */
export type StageCondition = 'always' | 'insideUae' | 'outsideUae' | 'medicalRequired';

export interface StageTemplate {
  key: string;
  nameAr: string;
  nameEn: string;
  serviceId?: string;
  mandatory: boolean;
  condition: StageCondition;
  dependsOn: string[];
  slaDays: number;
  /** Whether an optional stage is included by default when a case is created. Defaults to true. */
  defaultOn?: boolean;
}

export interface WorkflowTemplate {
  id: string;
  caseType: CaseType;
  pathway: CasePathway;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  stages: StageTemplate[];
}

/**
 * A step of a transaction. Actual cost and amount collected for a step are never stored here —
 * they are derived from payment vouchers / receipt allocations that reference the stage.
 */
export interface WorkflowStage {
  id: string;
  key: string;
  nameAr: string;
  nameEn: string;
  serviceId?: string;
  dependentId?: string;
  mandatory: boolean;
  applicable: boolean;
  dependsOn: string[];
  status: StageStatus;
  startDate?: string;
  dueDate?: string;
  completedDate?: string;
  assigneeId?: string;
  referenceNo?: string;
  /** Expected government / provider cost of this step (planning figure). */
  expectedCost: number;
  nextAction?: string;
  rejectionReason?: string;
  notes?: string;
  attachments: string[];
}

export type Relationship = 'spouse' | 'son' | 'daughter' | 'father' | 'mother';

export interface Dependent {
  id: string;
  nameAr: string;
  nameEn: string;
  relationship: Relationship;
  nationality: string;
  passportNo: string;
  passportExpiry: string;
  dateOfBirth: string;
  insideUae: boolean;
  medicalRequired: boolean;
  insuranceProvider?: string;
}

export type VisitVisaType = 'tourist' | 'family_visit' | 'business';

/** Financial snapshot of what the customer is charged — copied from the catalog at registration. */
export interface TransactionFees {
  governmentFee: number;
  providerCost: number;
  otherCosts: number;
  serviceFee: number;
  discount: number;
  vatTreatment: VatTreatment;
  vatRate: number;
}

export interface Transaction {
  id: string;
  /** Unique office reference, e.g. TRX-2026-0001. */
  ref: string;
  serviceId: string;
  type: CaseType;
  templateId?: string;
  pathway: CasePathway;
  titleAr: string;
  titleEn: string;
  customerId: string;
  companyId?: string;
  /** Beneficiary employee profile (the person the service is for), when linked to a company employee. */
  employeeId?: string;
  /** Free-text beneficiary (family member, visitor…) when there is no employee profile. */
  beneficiaryName?: string;
  status: CaseStatus;
  priority: 'normal' | 'urgent';
  branchId: BranchId;
  /** Internal staff member responsible for executing the transaction. */
  officerId: string;
  /** Internal staff member who registered the transaction. Immutable. */
  createdBy: string;
  /** Full ISO timestamp of registration. Immutable. */
  createdAt: string;
  /** Business date of the transaction (yyyy-MM-dd). */
  transactionDate: string;
  /** Government / provider application number. */
  externalRef?: string;
  startedAt?: string;
  dueDate: string;
  completedAt?: string;
  completedBy?: string;
  updatedAt?: string;
  updatedBy?: string;
  fees: TransactionFees;
  /** When true, any unpaid expected direct cost is no longer owed (e.g. supplier charged less). */
  costsFinalized?: boolean;
  stages: WorkflowStage[];
  dependents?: Dependent[];
  family?: {
    sponsorName: string;
    sponsorEmployeeId?: string;
    sponsorSalary: number;
    eligibilityNote?: string;
  };
  visit?: {
    visaType: VisitVisaType;
    durationDays: number;
    applicantNameAr: string;
    applicantNameEn: string;
    nationality: string;
    passportNo: string;
    applicationDate: string;
    sponsorName: string;
    expiryDate?: string;
  };
  formation?: {
    caseKind: 'new' | 'renewal' | 'amendment';
    jurisdiction: Jurisdiction;
    authority: string;
    legalForm: LegalForm;
    activity: string;
    tradeNameAr: string;
    tradeNameEn: string;
  };
  notes: Note[];
  overrideReason?: string;
  /** Idempotency key supplied by the client that created the record. */
  requestId?: string;
}
