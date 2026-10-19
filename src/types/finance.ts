import type { BranchId } from './common';
import type { VatTreatment } from './catalog';

/** Unit amounts are a snapshot taken when the line is created — later price edits never change them. */
export interface LineItem {
  id: string;
  serviceId?: string;
  transactionId?: string;
  descriptionAr: string;
  descriptionEn: string;
  beneficiary?: string;
  quantity: number;
  governmentFee: number;
  providerCost: number;
  otherCosts: number;
  serviceFee: number;
  discount: number;
  vatTreatment: VatTreatment;
}

/** Stored lifecycle state. The time-aware InvoiceStatus is computed, never stored. */
export type InvoiceState = 'draft' | 'issued' | 'cancelled';
export type InvoiceStatus = 'draft' | 'issued' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';

export interface Invoice {
  id: string;
  number: string;
  customerId: string;
  companyId?: string;
  date: string;
  dueDate: string;
  lines: LineItem[];
  vatRate: number;
  state: InvoiceState;
  notes: string;
  terms: string;
  createdBy: string;
  createdAt: string;
  branchId: BranchId;
  requestId?: string;
}

export type PaymentMethod = 'cash' | 'bank_transfer' | 'card' | 'cheque';

/** Portion of a receipt applied to a specific transaction (and optionally one of its steps). */
export interface Allocation {
  transactionId: string;
  stageId?: string;
  amount: number;
}

/**
 * Customer money movement. kind "receipt" = money received (سند قبض);
 * kind "refund" = money returned to the customer (always stored as a positive amount).
 */
export interface Receipt {
  id: string;
  number: string;
  kind: 'receipt' | 'refund';
  customerId: string;
  invoiceId?: string;
  allocations: Allocation[];
  date: string;
  amount: number;
  method: PaymentMethod;
  accountId: string;
  reference?: string;
  /** Staff member who physically recorded / collected this amount. */
  receivedBy: string;
  createdAt: string;
  notes?: string;
  branchId: BranchId;
  requestId?: string;
}

/** What a payment voucher (سند صرف) to a government body / provider was for. */
export type PaymentCategory = 'government_fee' | 'provider_cost' | 'other_direct_cost';

/** Money the office actually paid to a government body or provider for a transaction. */
export interface Payment {
  id: string;
  number: string;
  category: PaymentCategory;
  supplierId?: string;
  payeeName: string;
  transactionId?: string;
  stageId?: string;
  customerId?: string;
  date: string;
  amount: number;
  method: PaymentMethod;
  accountId: string;
  reference?: string;
  /** Staff member who made / recorded the payment. */
  paidBy: string;
  createdAt: string;
  notes?: string;
  branchId: BranchId;
  requestId?: string;
}

/** Office operating expenses only — pass-through payments for transactions are Payments. */
export type ExpenseCategory = 'rent' | 'salaries' | 'utilities' | 'marketing' | 'transport' | 'office' | 'bank_fees' | 'other';

export interface Expense {
  id: string;
  number: string;
  category: ExpenseCategory;
  supplierId?: string;
  beneficiary?: string;
  date: string;
  amount: number;
  method: PaymentMethod;
  accountId: string;
  /** Unpaid expenses are recorded liabilities and do not move cash. */
  paid: boolean;
  reference?: string;
  attachmentName?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  branchId: BranchId;
  requestId?: string;
}

export type SupplierKind = 'government' | 'insurance' | 'medical' | 'typing' | 'courier' | 'landlord' | 'other';

export interface Supplier {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  kind: SupplierKind;
  mobile: string;
  email: string;
  trn?: string;
  active: boolean;
}

export type AccountKind = 'cash' | 'bank' | 'other';

export interface Account {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  kind: AccountKind;
  /** Demo opening balance at openingDate. */
  openingBalance: number;
  openingDate: string;
  active: boolean;
}

export interface Transfer {
  id: string;
  number: string;
  fromAccountId: string;
  toAccountId: string;
  date: string;
  amount: number;
  reference?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  requestId?: string;
}
