import { useMemo } from 'react';
import { companyHooks, employeeHooks, useSettings } from './useApi';
import { useLedger } from './useLedger';
import { buildReminders } from '../utils/reminders';

export function useReminders() {
  const employees = employeeHooks.useList();
  const companies = companyHooks.useList();
  const settings = useSettings();
  const { ledger, invoiceViews, isLoading } = useLedger({ ignoreBranch: true });

  const reminders = useMemo(() => {
    if (!settings.data) return [];
    return buildReminders({
      employees: employees.data ?? [],
      companies: companies.data ?? [],
      summaries: ledger.list,
      views: invoiceViews,
      settings: settings.data
    });
  }, [employees.data, companies.data, ledger.list, invoiceViews, settings.data]);

  return { reminders, isLoading: employees.isLoading || settings.isLoading || isLoading };
}
