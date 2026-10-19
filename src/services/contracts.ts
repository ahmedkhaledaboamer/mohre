import type { Customer, Company, Employee } from '../types/crm';
import type { CaseStatus, Transaction, TransactionFees, WorkflowStage } from '../types/cases';
import type { ServiceCatalogItem, PriceChange } from '../types/catalog';
import type { Account, Expense, Invoice, InvoiceState, LineItem, Payment, PaymentCategory, PaymentMethod, Receipt, Supplier, Transfer } from '../types/finance';
import type { User, DocumentRecord, DocumentType, Task, ActivityEntry, AppSettings } from '../types/system';

/** Contract every backend adapter (mock or REST) must satisfy. Pages never talk to adapters directly. */
export interface EntityService<T extends {id: string;}> {
  list(): Promise<T[]>;
  get(id: string): Promise<T>;
  /** Server assigns id and, when blank, the document number/code. */
  create(input: Omit<T, 'id'>): Promise<T>;
  update(id: string, patch: Partial<T>): Promise<T>;
  remove(id: string): Promise<void>;
}

/** Read + create only: financial vouchers are never edited in place. */
export interface ReadService<T> {
  list(): Promise<T[]>;
  get(id: string): Promise<T>;
}

export interface StageUpdateInput {
  caseId: string;
  stageId: string;
  patch: Partial<WorkflowStage>;
}

export interface MoneyInput {
  amount: number;
  method: PaymentMethod;
  accountId: string;
  reference?: string;
}

/** Everything a staff member enters on the quick "Add transaction" form. Saved atomically. */
export interface RegisterTransactionInput {
  requestId: string;
  serviceId: string;
  customerId: string;
  companyId?: string;
  employeeId?: string;
  beneficiaryName?: string;
  officerId: string;
  transactionDate: string;
  dueDate?: string;
  externalRef?: string;
  status: CaseStatus;
  priority: 'normal' | 'urgent';
  fees: TransactionFees;
  note?: string;
  /** Money actually received now. Omitted = nothing collected → no receipt is created. */
  collection?: MoneyInput;
  /** Money the office actually paid now to the government body / provider. */
  costPayment?: MoneyInput & {category: PaymentCategory;supplierId?: string;payeeName: string;};
  attachments?: {fileName: string;sizeKb: number;type: DocumentType;}[];
}

export interface RegisterTransactionResult {
  transaction: Transaction;
  receipt?: Receipt;
  payment?: Payment;
  /** True when the request id had already been processed — nothing new was written. */
  duplicate: boolean;
}

/** Editable transaction details. Registration metadata (createdBy, createdAt, ref) is immutable. */
export type TransactionPatch = Partial<
  Pick<Transaction, 'officerId' | 'priority' | 'externalRef' | 'dueDate' | 'transactionDate' | 'beneficiaryName' | 'companyId' | 'employeeId' | 'notes' | 'costsFinalized'>>;


export interface RecordReceiptInput {
  requestId: string;
  kind: Receipt['kind'];
  customerId: string;
  invoiceId?: string;
  transactionId?: string;
  stageId?: string;
  date: string;
  amount: number;
  method: PaymentMethod;
  accountId: string;
  reference?: string;
  notes?: string;
}

export interface RecordPaymentInput {
  requestId: string;
  category: PaymentCategory;
  supplierId?: string;
  payeeName: string;
  transactionId?: string;
  stageId?: string;
  date: string;
  amount: number;
  method: PaymentMethod;
  accountId: string;
  reference?: string;
  notes?: string;
}

export interface CreateInvoiceInput {
  requestId: string;
  customerId: string;
  companyId?: string;
  transactionIds: string[];
  extraLines: Omit<LineItem, 'id'>[];
  date: string;
  dueDate: string;
  state: InvoiceState;
  notes: string;
}

export interface ApiContract {
  auth: {login(email: string, password: string): Promise<User>;};
  customers: EntityService<Customer>;
  companies: EntityService<Company>;
  employees: EntityService<Employee>;
  transactions: ReadService<Transaction> & {
    register(input: RegisterTransactionInput): Promise<RegisterTransactionResult>;
    update(id: string, patch: TransactionPatch): Promise<Transaction>;
    updateFees(id: string, fees: TransactionFees, reason: string): Promise<Transaction>;
    setStatus(input: {id: string;status: CaseStatus;reason?: string;override?: boolean;}): Promise<Transaction>;
    updateStage(input: StageUpdateInput): Promise<Transaction>;
    addNote(id: string, body: string, channel: 'note' | 'call' | 'email' | 'whatsapp' | 'meeting'): Promise<Transaction>;
    remove(id: string): Promise<void>;
  };
  catalog: EntityService<ServiceCatalogItem>;
  invoices: ReadService<Invoice> & {
    createFromTransactions(input: CreateInvoiceInput): Promise<Invoice>;
    setState(id: string, state: InvoiceState): Promise<Invoice>;
  };
  receipts: ReadService<Receipt> & {
    record(input: RecordReceiptInput): Promise<Receipt>;
    remove(id: string, reason: string): Promise<void>;
  };
  payments: ReadService<Payment> & {
    record(input: RecordPaymentInput): Promise<Payment>;
    remove(id: string, reason: string): Promise<void>;
  };
  expenses: EntityService<Expense>;
  transfers: ReadService<Transfer> & {record(input: Omit<Transfer, 'id' | 'number' | 'createdBy' | 'createdAt'> & {requestId: string;}): Promise<Transfer>;};
  accounts: EntityService<Account>;
  suppliers: EntityService<Supplier>;
  documents: EntityService<DocumentRecord>;
  tasks: EntityService<Task>;
  users: EntityService<User>;
  activity: {list(): Promise<ActivityEntry[]>;};
  priceHistory: {list(): Promise<PriceChange[]>;};
  settings: {get(): Promise<AppSettings>;update(patch: Partial<AppSettings>): Promise<AppSettings>;};
  demo: {reset(): Promise<void>;};
}
