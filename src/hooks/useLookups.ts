import { useMemo } from 'react';
import { accountHooks, catalogHooks, companyHooks, customerHooks, employeeHooks, supplierHooks, userHooks } from './useApi';

/** Shared id → record maps built from cached lists (React Query dedupes requests). */
export function useLookups() {
  const customers = customerHooks.useList();
  const companies = companyHooks.useList();
  const employees = employeeHooks.useList();
  const users = userHooks.useList();
  const catalog = catalogHooks.useList();
  const suppliers = supplierHooks.useList();
  const accounts = accountHooks.useList();

  return useMemo(
    () => ({
      customers: customers.data ?? [],
      companies: companies.data ?? [],
      employees: employees.data ?? [],
      users: users.data ?? [],
      catalog: catalog.data ?? [],
      suppliers: suppliers.data ?? [],
      accounts: accounts.data ?? [],
      customer: new Map((customers.data ?? []).map((x) => [x.id, x])),
      company: new Map((companies.data ?? []).map((x) => [x.id, x])),
      employee: new Map((employees.data ?? []).map((x) => [x.id, x])),
      user: new Map((users.data ?? []).map((x) => [x.id, x])),
      service: new Map((catalog.data ?? []).map((x) => [x.id, x])),
      supplier: new Map((suppliers.data ?? []).map((x) => [x.id, x])),
      account: new Map((accounts.data ?? []).map((x) => [x.id, x])),
      isLoading: customers.isLoading || companies.isLoading || employees.isLoading || users.isLoading
    }),
    [customers.data, companies.data, employees.data, users.data, catalog.data, suppliers.data, accounts.data, customers.isLoading, companies.isLoading, employees.isLoading, users.isLoading]
  );
}