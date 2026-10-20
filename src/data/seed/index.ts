import type { DbShape } from '../../types/db';
import { serviceCatalogSeed } from '../pricing';
import { seedCompanies, seedCustomers, seedEmployees, seedUsers } from './people';
import { seedTransactions } from './transactions';
import { seedAccounts, seedExpenses, seedInvoices, seedPayments, seedReceipts, seedSuppliers, seedTransfers } from './finance';
import { defaultSettings, seedActivity, seedDocuments, seedTasks } from './misc';

export const SCHEMA_VERSION = 4;

/** Builds a fresh, deep-cloned demo database from the seed files. */
export function buildSeed(): DbShape {
  const db: DbShape = {
    schemaVersion: SCHEMA_VERSION,
    customers: seedCustomers,
    companies: seedCompanies,
    employees: seedEmployees,
    transactions: seedTransactions,
    catalog: serviceCatalogSeed,
    priceHistory: [],
    invoices: seedInvoices,
    receipts: seedReceipts,
    payments: seedPayments,
    expenses: seedExpenses,
    suppliers: seedSuppliers,
    accounts: seedAccounts,
    transfers: seedTransfers,
    documents: seedDocuments,
    tasks: seedTasks,
    users: seedUsers,
    activity: seedActivity,
    settings: defaultSettings
  };
  return JSON.parse(JSON.stringify(db)) as DbShape;
}
