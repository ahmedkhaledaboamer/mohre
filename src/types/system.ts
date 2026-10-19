import type { BranchId, Bilingual } from './common';

/** owner = Owner/Admin, accountant, pro = Employee/PRO, manager = read-only manager. */
export type Role = 'owner' | 'accountant' | 'pro' | 'manager';

export interface User {
  id: string;
  nameAr: string;
  nameEn: string;
  email: string;
  mobile: string;
  role: Role;
  branchId: BranchId;
  active: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export type DocumentType =
'passport' |
'emirates_id' |
'residence' |
'contract' |
'trade_license' |
'medical' |
'insurance' |
'certificate' |
'invoice' |
'receipt' |
'photo' |
'other';

export type DocumentEntity = 'customer' | 'company' | 'employee' | 'case' | 'invoice';

export interface DocumentRecord {
  id: string;
  type: DocumentType;
  title: string;
  fileName: string;
  entityType: DocumentEntity;
  entityId: string;
  uploadedAt: string;
  expiryDate?: string;
  verification: 'pending' | 'verified' | 'rejected';
  notes?: string;
  sizeKb: number;
  uploadedBy: string;
}

export type TaskPriority = 'low' | 'normal' | 'high';
export type TaskStatus = 'open' | 'done';
export type TaskRelatedType = 'case' | 'company' | 'invoice' | 'customer' | 'employee';

export interface Task {
  id: string;
  title: string;
  description?: string;
  assigneeId: string;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
  relatedType?: TaskRelatedType;
  relatedId?: string;
  createdAt: string;
  createdBy: string;
}

export type ActivityEntity =
'customer' |
'company' |
'employee' |
'case' |
'pricing' |
'quotation' |
'invoice' |
'receipt' |
'payment' |
'expense' |
'transfer' |
'account' |
'document' |
'supplier' |
'insurance' |
'user' |
'settings';

export interface ActivityEntry {
  id: string;
  entityType: ActivityEntity;
  entityId: string;
  action: string;
  message: Bilingual;
  userId: string;
  at: string;
  override?: boolean;
}

export type ReminderKind =
'passport' |
'emirates_id' |
'residence' |
'license' |
'missing_documents' |
'overdue_payment' |
'deadline';

export interface Reminder {
  id: string;
  kind: ReminderKind;
  title: Bilingual;
  subtitle: Bilingual;
  date?: string;
  daysLeft: number | null;
  severity: 'critical' | 'warning' | 'info';
  link: string;
}

export interface ReminderDays {
  passport: number;
  emiratesId: number;
  residence: number;
  license: number;
  deadline: number;
}

export interface NotificationKinds {
  passport: boolean;
  emirates_id: boolean;
  residence: boolean;
  license: boolean;
  missing_documents: boolean;
  overdue_payment: boolean;
  deadline: boolean;
}

export interface NotificationSettings {
  inApp: boolean;
  email: boolean;
  sms: boolean;
  dailyDigest: boolean;
  kinds: NotificationKinds;
}

export interface AppSettings {
  companyNameAr: string;
  companyNameEn: string;
  trn: string;
  address: string;
  phone: string;
  email: string;
  vatRate: number;
  invoiceTerms: string;
  reminderDays: ReminderDays;
  notifications: NotificationSettings;
  pricingConfigured: boolean;
}