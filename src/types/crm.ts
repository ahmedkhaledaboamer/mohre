import type { BranchId, Note } from './common';

export type Jurisdiction = 'mainland' | 'freezone';
export type LegalForm = 'llc' | 'sole_establishment' | 'fz_llc' | 'fze' | 'branch' | 'civil_company';

export type CustomerType = 'individual' | 'corporate';
export type CustomerStatus = 'active' | 'prospect' | 'inactive' | 'archived';

export interface Customer {
  id: string;
  code: string;
  type: CustomerType;
  nameAr: string;
  nameEn: string;
  contactPerson?: string;
  mobile: string;
  email: string;
  nationality: string;
  emiratesIdNo?: string;
  address: string;
  status: CustomerStatus;
  assignedUserId: string;
  branchId: BranchId;
  createdAt: string;
  notes: Note[];
}

export type CompanyStatus = 'active' | 'expired' | 'archived';

export interface Company {
  id: string;
  code: string;
  customerId: string;
  nameAr: string;
  nameEn: string;
  licenseNo: string;
  authority: string;
  jurisdiction: Jurisdiction;
  licenseIssue: string;
  licenseExpiry: string;
  legalForm: LegalForm;
  activitiesAr: string[];
  activitiesEn: string[];
  ownerName: string;
  contactName: string;
  mobile: string;
  email: string;
  address: string;
  status: CompanyStatus;
  branchId: BranchId;
  createdAt: string;
}

export type Gender = 'male' | 'female';
export type VisaType = 'employment' | 'investor' | 'partner' | 'domestic';
export type EmployeeStatus = 'active' | 'in_process' | 'cancelled';

export interface Employee {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  nationality: string;
  gender: Gender;
  jobTitleAr: string;
  jobTitleEn: string;
  passportNo: string;
  passportExpiry: string;
  dateOfBirth: string;
  mobile: string;
  companyId: string;
  customerId: string;
  visaType: VisaType;
  entryDate?: string;
  workPermitNo?: string;
  workPermitExpiry?: string;
  emiratesIdNo?: string;
  emiratesIdExpiry?: string;
  residenceIssue?: string;
  residenceExpiry?: string;
  caseOfficerId: string;
  status: EmployeeStatus;
  createdAt: string;
}