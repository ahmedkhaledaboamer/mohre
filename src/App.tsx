import React, { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { store } from './store/store';
import { useAppSelector } from './store/hooks';
import { AppShell, RequirePermission } from './components/layout/AppShell';
import { usePermissions } from './hooks/usePermissions';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { NotFound } from './pages/NotFound';
import { PrintPage } from './pages/PrintPage';
import { Customers } from './pages/crm/Customers';
import { CustomerDetail } from './pages/crm/CustomerDetail';
import { Companies } from './pages/crm/Companies';
import { CompanyDetail } from './pages/crm/CompanyDetail';
import { Employees } from './pages/crm/Employees';
import { EmployeeDetail } from './pages/crm/EmployeeDetail';
import { CaseList } from './pages/cases/CaseList';
import { CaseDetail } from './pages/cases/CaseDetail';
import { NewTransaction } from './pages/cases/NewTransaction';
import { Invoices } from './pages/finance/Invoices';
import { InvoiceNew } from './pages/finance/InvoiceNew';
import { InvoiceDetail } from './pages/finance/InvoiceDetail';
import { Receipts } from './pages/finance/Receipts';
import { Payments } from './pages/finance/Payments';
import { Expenses } from './pages/finance/Expenses';
import { CashMovement } from './pages/finance/CashMovement';
import { Suppliers } from './pages/finance/Suppliers';
import { Reports } from './pages/reports/Reports';
import { ServiceCatalog } from './pages/system/ServiceCatalog';
import { Users } from './pages/system/Users';
import { Settings } from './pages/system/Settings';
import { Documents } from './pages/system/Documents';
import { Tasks } from './pages/system/Tasks';
import type { Permission } from './data/roles';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, gcTime: 10 * 60_000, retry: 1, refetchOnWindowFocus: false },
    mutations: { retry: 0 }
  }
});

function DirectionSync() {
  const lang = useAppSelector((s) => s.ui.lang);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);
  return <Toaster dir={lang === 'ar' ? 'rtl' : 'ltr'} position={lang === 'ar' ? 'top-left' : 'top-right'} richColors closeButton />;
}

/** Owners/accountants/managers land on the dashboard; staff without it land on transactions. */
function Home() {
  const { can } = usePermissions();
  return can('dashboard.view') ? <Dashboard /> : <Navigate to="/transactions?mine=1&status=open" replace />;
}

const guard = (p: Permission, el: React.ReactNode) => <RequirePermission permission={p}>{el}</RequirePermission>;

export function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <DirectionSync />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/print/:kind/:id" element={<PrintPage />} />
            <Route element={<AppShell />}>
              <Route index element={<Home />} />
              <Route path="transactions" element={guard('cases.view', <CaseList />)} />
              <Route path="transactions/new" element={guard('cases.edit', <NewTransaction />)} />
              <Route path="transactions/:id" element={guard('cases.view', <CaseDetail />)} />
              <Route path="residence" element={guard('cases.view', <CaseList type="residence" />)} />
              <Route path="family" element={guard('cases.view', <CaseList type="family" />)} />
              <Route path="visits" element={guard('cases.view', <CaseList type="visit" />)} />
              <Route path="formation" element={guard('cases.view', <CaseList type="formation" />)} />
              <Route path="customers" element={guard('crm.view', <Customers />)} />
              <Route path="customers/:id" element={guard('crm.view', <CustomerDetail />)} />
              <Route path="companies" element={guard('crm.view', <Companies />)} />
              <Route path="companies/:id" element={guard('crm.view', <CompanyDetail />)} />
              <Route path="employees" element={guard('crm.view', <Employees />)} />
              <Route path="employees/:id" element={guard('crm.view', <EmployeeDetail />)} />
              <Route path="invoices" element={guard('finance.view', <Invoices />)} />
              <Route path="invoices/new" element={guard('finance.edit', <InvoiceNew />)} />
              <Route path="invoices/:id" element={guard('finance.view', <InvoiceDetail />)} />
              <Route path="receipts" element={guard('finance.view', <Receipts />)} />
              <Route path="payments" element={guard('finance.view', <Payments />)} />
              <Route path="expenses" element={guard('finance.view', <Expenses />)} />
              <Route path="cash" element={guard('cash.view', <CashMovement />)} />
              <Route path="suppliers" element={guard('finance.view', <Suppliers />)} />
              <Route path="reports" element={guard('reports.view', <Reports />)} />
              <Route path="reports/:tab" element={guard('reports.view', <Reports />)} />
              <Route path="pricing" element={guard('pricing.view', <ServiceCatalog />)} />
              <Route path="users" element={guard('users.manage', <Users />)} />
              <Route path="settings" element={guard('settings.manage', <Settings />)} />
              <Route path="documents" element={guard('documents.view', <Documents />)} />
              <Route path="tasks" element={guard('tasks.view', <Tasks />)} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </Provider>);

}
