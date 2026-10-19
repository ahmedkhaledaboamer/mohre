import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import type { CreateInvoiceInput, EntityService, ReadService, RecordPaymentInput, RecordReceiptInput, RegisterTransactionInput, StageUpdateInput, TransactionPatch } from '../services/contracts';
import type { AppSettings, Task } from '../types/system';
import type { CaseStatus, TransactionFees } from '../types/cases';
import type { InvoiceState, Transfer } from '../types/finance';

export type QueryKeyName =
'customers' |
'companies' |
'employees' |
'transactions' |
'catalog' |
'invoices' |
'receipts' |
'payments' |
'expenses' |
'transfers' |
'accounts' |
'suppliers' |
'documents' |
'tasks' |
'users' |
'activity' |
'priceHistory' |
'settings';

/** Everything a money or transaction mutation can affect. Server state lives only in React Query. */
const MONEY_KEYS: QueryKeyName[] = ['transactions', 'receipts', 'payments', 'invoices', 'expenses', 'transfers', 'documents', 'activity'];

const invalidate = (qc: QueryClient, keys: QueryKeyName[]) => {
  keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
};

function readHooks<T>(key: QueryKeyName, service: ReadService<T>) {
  return {
    useList: () => useQuery({ queryKey: [key], queryFn: () => service.list() }),
    useOne: (id?: string) => useQuery({ queryKey: [key, 'detail', id], queryFn: () => service.get(id as string), enabled: Boolean(id) })
  };
}

/** Generic list/detail/create/update/remove hooks for an entity service. */
function entityHooks<T extends {id: string;}>(key: QueryKeyName, service: EntityService<T>, related: QueryKeyName[] = []) {
  const affected: QueryKeyName[] = [key, 'activity', ...related];
  return {
    ...readHooks(key, service),
    useCreate: () => {
      const qc = useQueryClient();
      return useMutation({ mutationFn: (input: Omit<T, 'id'>) => service.create(input), onSuccess: () => invalidate(qc, affected) });
    },
    useUpdate: () => {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: ({ id, patch }: {id: string;patch: Partial<T>;}) => service.update(id, patch),
        onSuccess: () => invalidate(qc, affected)
      });
    },
    useRemove: () => {
      const qc = useQueryClient();
      return useMutation({ mutationFn: (id: string) => service.remove(id), onSuccess: () => invalidate(qc, affected) });
    }
  };
}

export const customerHooks = entityHooks('customers', api.customers);
export const companyHooks = entityHooks('companies', api.companies);
export const employeeHooks = entityHooks('employees', api.employees);
export const transactionHooks = readHooks('transactions', api.transactions);
export const catalogHooks = entityHooks('catalog', api.catalog, ['priceHistory']);
export const invoiceHooks = readHooks('invoices', api.invoices);
export const receiptHooks = readHooks('receipts', api.receipts);
export const paymentHooks = readHooks('payments', api.payments);
export const transferHooks = readHooks('transfers', api.transfers);
export const expenseHooks = entityHooks('expenses', api.expenses);
export const accountHooks = entityHooks('accounts', api.accounts);
export const supplierHooks = entityHooks('suppliers', api.suppliers);
export const documentHooks = entityHooks('documents', api.documents);
export const taskHooks = entityHooks('tasks', api.tasks);
export const userHooks = entityHooks('users', api.users);

export const useActivity = () => useQuery({ queryKey: ['activity'], queryFn: () => api.activity.list() });
export const usePriceHistory = () => useQuery({ queryKey: ['priceHistory'], queryFn: () => api.priceHistory.list() });
export const useSettings = () => useQuery({ queryKey: ['settings'], queryFn: () => api.settings.get(), staleTime: 5 * 60_000 });

function useMoneyMutation<I, O>(fn: (input: I) => Promise<O>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => invalidate(qc, MONEY_KEYS) });
}

export const useRegisterTransaction = () => useMoneyMutation((input: RegisterTransactionInput) => api.transactions.register(input));
export const useUpdateTransaction = () => useMoneyMutation(({ id, patch }: {id: string;patch: TransactionPatch;}) => api.transactions.update(id, patch));
export const useUpdateFees = () => useMoneyMutation(({ id, fees, reason }: {id: string;fees: TransactionFees;reason: string;}) => api.transactions.updateFees(id, fees, reason));
export const useSetStatus = () => useMoneyMutation((input: {id: string;status: CaseStatus;reason?: string;override?: boolean;}) => api.transactions.setStatus(input));
export const useStageUpdate = () => useMoneyMutation((input: StageUpdateInput) => api.transactions.updateStage(input));
export const useAddNote = () => useMoneyMutation(({ id, body, channel }: {id: string;body: string;channel: 'note' | 'call' | 'email' | 'whatsapp' | 'meeting';}) => api.transactions.addNote(id, body, channel));
export const useRemoveTransaction = () => useMoneyMutation((id: string) => api.transactions.remove(id));
export const useRecordReceipt = () => useMoneyMutation((input: RecordReceiptInput) => api.receipts.record(input));
export const useRemoveReceipt = () => useMoneyMutation(({ id, reason }: {id: string;reason: string;}) => api.receipts.remove(id, reason));
export const useRecordPayment = () => useMoneyMutation((input: RecordPaymentInput) => api.payments.record(input));
export const useRemovePayment = () => useMoneyMutation(({ id, reason }: {id: string;reason: string;}) => api.payments.remove(id, reason));
export const useCreateInvoice = () => useMoneyMutation((input: CreateInvoiceInput) => api.invoices.createFromTransactions(input));
export const useSetInvoiceState = () => useMoneyMutation(({ id, state }: {id: string;state: InvoiceState;}) => api.invoices.setState(id, state));
export const useRecordTransfer = () =>
useMoneyMutation((input: Omit<Transfer, 'id' | 'number' | 'createdBy' | 'createdAt'> & {requestId: string;}) => api.transfers.record(input));

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<AppSettings>) => api.settings.update(patch),
    onSuccess: (data) => {
      qc.setQueryData(['settings'], data);
      invalidate(qc, ['activity']);
    }
  });
}

export function useResetDemo() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: () => api.demo.reset(), onSuccess: () => qc.invalidateQueries() });
}

export function useLogin() {
  return useMutation({ mutationFn: ({ email, password }: {email: string;password: string;}) => api.auth.login(email, password) });
}

/** Optimistic toggle — task completion is low-risk and benefits from instant feedback. */
export function useToggleTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (task: Task) => api.tasks.update(task.id, { status: task.status === 'open' ? 'done' : 'open' }),
    onMutate: async (task) => {
      await qc.cancelQueries({ queryKey: ['tasks'] });
      const prev = qc.getQueryData<Task[]>(['tasks']);
      qc.setQueryData<Task[]>(['tasks'], (old) =>
      (old ?? []).map((t) => t.id === task.id ? { ...t, status: t.status === 'open' ? 'done' : 'open' } : t)
      );
      return { prev };
    },
    onError: (_e, _task, ctx) => {
      if (ctx?.prev) qc.setQueryData(['tasks'], ctx.prev);
    },
    onSettled: () => invalidate(qc, ['tasks'])
  });
}
