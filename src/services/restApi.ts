import type { ApiContract, EntityService, ReadService } from './contracts';
import { request } from './apiClient';

function restEntity<T extends {id: string;}>(path: string): EntityService<T> {
  return {
    list: () => request<T[]>(path),
    get: (id) => request<T>(`${path}/${id}`),
    create: (input) => request<T>(path, { method: 'POST', body: JSON.stringify(input) }),
    update: (id, patch) => request<T>(`${path}/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
    remove: (id) => request<void>(`${path}/${id}`, { method: 'DELETE' })
  };
}

function restRead<T>(path: string): ReadService<T> {
  return { list: () => request<T[]>(path), get: (id) => request<T>(`${path}/${id}`) };
}

const post = <T,>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });

/**
 * REST adapter — endpoints are placeholders to be aligned with the backend team.
 * The backend must enforce permissions, idempotency (requestId) and all financial rules itself.
 */
export const restApi: ApiContract = {
  auth: { login: (email, password) => post('/auth/login', { email, password }) },
  customers: restEntity('/customers'),
  companies: restEntity('/companies'),
  employees: restEntity('/employees'),
  transactions: {
    ...restRead('/transactions'),
    register: (input) => post('/transactions', input),
    update: (id, patch) => request(`/transactions/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
    updateFees: (id, fees, reason) => request(`/transactions/${id}/fees`, { method: 'PUT', body: JSON.stringify({ fees, reason }) }),
    setStatus: ({ id, ...body }) => post(`/transactions/${id}/status`, body),
    updateStage: ({ caseId, stageId, patch }) => request(`/transactions/${caseId}/stages/${stageId}`, { method: 'PATCH', body: JSON.stringify(patch) }),
    addNote: (id, body, channel) => post(`/transactions/${id}/notes`, { body, channel }),
    remove: (id) => request(`/transactions/${id}`, { method: 'DELETE' })
  },
  catalog: restEntity('/catalog'),
  invoices: {
    ...restRead('/invoices'),
    createFromTransactions: (input) => post('/invoices', input),
    setState: (id, state) => post(`/invoices/${id}/state`, { state })
  },
  receipts: { ...restRead('/receipts'), record: (input) => post('/receipts', input), remove: (id, reason) => request(`/receipts/${id}`, { method: 'DELETE', body: JSON.stringify({ reason }) }) },
  payments: { ...restRead('/payments'), record: (input) => post('/payments', input), remove: (id, reason) => request(`/payments/${id}`, { method: 'DELETE', body: JSON.stringify({ reason }) }) },
  expenses: restEntity('/expenses'),
  transfers: { ...restRead('/transfers'), record: (input) => post('/transfers', input) },
  accounts: restEntity('/accounts'),
  suppliers: restEntity('/suppliers'),
  documents: restEntity('/documents'),
  tasks: restEntity('/tasks'),
  users: restEntity('/users'),
  activity: { list: () => request('/activity') },
  priceHistory: { list: () => request('/catalog/history') },
  settings: {
    get: () => request('/settings'),
    update: (patch) => request('/settings', { method: 'PATCH', body: JSON.stringify(patch) })
  },
  demo: { reset: async () => undefined }
};
