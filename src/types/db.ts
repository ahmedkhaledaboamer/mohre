import type { Customer, Company, Employee } from './crm';
import type { Transaction } from './cases';
import type { ServiceCatalogItem, PriceChange } from './catalog';
import type { Invoice, Receipt, Payment, Expense, Supplier, Account, Transfer } from './finance';
import type { User, DocumentRecord, Task, ActivityEntry, AppSettings } from './system';

export interface CollectionMap {
  customers: Customer;
  companies: Company;
  employees: Employee;
  transactions: Transaction;
  catalog: ServiceCatalogItem;
  priceHistory: PriceChange;
  invoices: Invoice;
  receipts: Receipt;
  payments: Payment;
  expenses: Expense;
  suppliers: Supplier;
  accounts: Account;
  transfers: Transfer;
  documents: DocumentRecord;
  tasks: Task;
  users: User;
  activity: ActivityEntry;
}

export type CollectionKey = keyof CollectionMap;

export type DbShape = { [K in CollectionKey]: CollectionMap[K][] } & {settings: AppSettings;schemaVersion: number;};
