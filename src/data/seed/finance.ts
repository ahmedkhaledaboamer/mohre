import type { Account, Expense, ExpenseCategory, Invoice, LineItem, Payment, PaymentCategory, PaymentMethod, Receipt, Supplier, Transfer } from '../../types/finance';
import type { Transaction } from '../../types/cases';
import { addDaysIso, dateFromToday, minIso, todayIso } from '../../utils/dates';
import { feeTotals, round2 } from '../../utils/finance';
import { serviceCatalogSeed } from '../pricing';
import { seedRows, seedTransactions, SEED_VAT_RATE } from './transactions';

const pad = (n: number) => String(n).padStart(4, '0');

export const DEFAULT_INVOICE_TERMS =
'الرسوم الحكومية تُحصَّل نيابةً عن الجهات المختصة وتخضع لأي تعديل رسمي. أتعاب المكتب غير قابلة للاسترداد بعد بدء المعاملة. يُرجى السداد خلال 14 يوماً من تاريخ الفاتورة.';

/* ───────────── Cash & bank accounts (demo opening balances) ───────────── */
export const seedAccounts: Account[] = [
{ id: 'acc-cash', code: 'ACC-01', nameAr: 'الصندوق النقدي', nameEn: 'Cash box', kind: 'cash', openingBalance: 12000, openingDate: dateFromToday(-90), active: true },
{ id: 'acc-bank', code: 'ACC-02', nameAr: 'الحساب البنكي الرئيسي (تجريبي)', nameEn: 'Main bank account (demo)', kind: 'bank', openingBalance: 150000, openingDate: dateFromToday(-90), active: true },
{ id: 'acc-govcard', code: 'ACC-03', nameAr: 'بطاقة سداد الرسوم الحكومية (تجريبي)', nameEn: 'Government fees payment card (demo)', kind: 'other', openingBalance: 20000, openingDate: dateFromToday(-90), active: true }];


/** Default account a payment method settles into. */
export const accountForMethod = (m: PaymentMethod) => m === 'cash' ? 'acc-cash' : 'acc-bank';

export const seedSuppliers: Supplier[] = [
{ id: 'sup-gov-res', code: 'SUP-01', nameAr: 'حساب الرسوم الحكومية — الإقامة والهوية', nameEn: 'Gov. fees — Residency & ID', kind: 'government', mobile: '+971 4 555 0001', email: 'fees-res@gov-demo.ae', active: true },
{ id: 'sup-gov-lab', code: 'SUP-02', nameAr: 'حساب الرسوم الحكومية — العمل', nameEn: 'Gov. fees — Labour', kind: 'government', mobile: '+971 4 555 0002', email: 'fees-labour@gov-demo.ae', active: true },
{ id: 'sup-gov-det', code: 'SUP-03', nameAr: 'حساب رسوم الترخيص التجاري', nameEn: 'Licensing fees account', kind: 'government', mobile: '+971 4 555 0003', email: 'fees-license@gov-demo.ae', active: true },
{ id: 'sup-med', code: 'SUP-04', nameAr: 'مركز الشفاء للفحص الطبي (تجريبي)', nameEn: 'Al Shifa Medical Center (demo)', kind: 'medical', trn: '100555000100003', mobile: '+971 4 555 0004', email: 'billing@alshifa-demo.ae', active: true },
{ id: 'sup-ins-1', code: 'SUP-05', nameAr: 'درع للتأمين الصحي (تجريبي)', nameEn: 'Dir Health Insurance (demo)', kind: 'insurance', trn: '100555000200003', mobile: '+971 4 555 0005', email: 'corporate@dir-demo.ae', active: true },
{ id: 'sup-typing', code: 'SUP-06', nameAr: 'مركز السرعة للطباعة والخدمات', nameEn: 'Al Sur3a Typing Center', kind: 'typing', mobile: '+971 4 555 0007', email: 'office@sur3a-demo.ae', active: true },
{ id: 'sup-landlord', code: 'SUP-07', nameAr: 'عقارات البرج للتأجير', nameEn: 'Al Burj Leasing', kind: 'landlord', mobile: '+971 4 555 0008', email: 'leasing@burj-demo.ae', active: true },
{ id: 'sup-courier', code: 'SUP-08', nameAr: 'توصيل سريع للمستندات', nameEn: 'QuickDocs Courier', kind: 'courier', mobile: '+971 4 555 0009', email: 'ops@quickdocs-demo.ae', active: true }];


const svc = (id: string) => serviceCatalogSeed.find((s) => s.id === id)!;
const govSupplier = (authority: string) => authority === 'mohre' ? 'sup-gov-lab' : authority === 'det' ? 'sup-gov-det' : 'sup-gov-res';
const providerSupplier = (authority: string) => authority === 'medical' ? 'sup-med' : authority === 'insurer' ? 'sup-ins-1' : 'sup-typing';
const supplierName = (id: string) => seedSuppliers.find((s) => s.id === id)!.nameAr;

/* ───────────── Receipts (customer collections) ───────────── */
export const seedReceipts: Receipt[] = [];
const customerMethods: PaymentMethod[] = ['cash', 'bank_transfer', 'card', 'cash', 'cheque'];

function addReceipt(t: Transaction, amount: number, date: string, by: string, k: number, kind: Receipt['kind'] = 'receipt') {
  const n = seedReceipts.length + 1;
  const method = kind === 'refund' ? 'bank_transfer' : customerMethods[k % customerMethods.length];
  seedReceipts.push({
    id: `rcp-${n}`,
    number: `${kind === 'refund' ? 'RFD' : 'RCV'}-2026-${pad(n)}`,
    kind,
    customerId: t.customerId,
    allocations: [{ transactionId: t.id, amount }],
    date,
    amount,
    method,
    accountId: accountForMethod(method),
    reference: method === 'cash' ? undefined : method === 'cheque' ? `CHQ-${300100 + n}` : `TRF${70045000 + n * 13}`,
    receivedBy: by,
    createdAt: `${date}T${String(9 + n % 8).padStart(2, '0')}:${String(n * 7 % 60).padStart(2, '0')}:00`,
    notes: kind === 'refund' ? 'رد كامل المبلغ بعد إلغاء الطلب بناءً على رغبة العميل' : undefined,
    branchId: t.branchId
  });
}

seedTransactions.forEach((t, k) => {
  const r = seedRows[k];
  const due = feeTotals(t.fees, t.fees.vatRate).due;
  const by = r.collector ?? r.officer;
  const d = t.transactionDate;
  if (r.collect === 'full') addReceipt(t, due, d, by, k);else
  if (r.collect === 'split') {
    const first = round2(due / 2);
    addReceipt(t, first, d, by, k);
    addReceipt(t, round2(due - first), minIso(addDaysIso(d, 3), todayIso()), 'u-acc', k + 1);
  } else if (r.collect === 'partial') addReceipt(t, round2(Math.max(500, Math.round(due * 0.4 / 50) * 50)), d, by, k);else
  if (r.collect === 'refund') {
    addReceipt(t, due, d, by, k);
    addReceipt(t, due, minIso(addDaysIso(d, 2), todayIso()), 'u-acc', k, 'refund');
  }
});

/* ───────────── Payment vouchers to government bodies / providers ───────────── */
export const seedPayments: Payment[] = [];

function addPayment(t: Transaction, category: PaymentCategory, supplierId: string, amount: number, date: string, by: string, stageId?: string, notes?: string) {
  const n = seedPayments.length + 1;
  const method: PaymentMethod = category === 'government_fee' ? 'card' : n % 2 ? 'bank_transfer' : 'cash';
  seedPayments.push({
    id: `pay-${n}`,
    number: `PAY-2026-${pad(n)}`,
    category,
    supplierId,
    payeeName: supplierName(supplierId),
    transactionId: t.id,
    stageId,
    customerId: t.customerId,
    date,
    amount,
    method,
    accountId: category === 'government_fee' ? 'acc-govcard' : method === 'cash' ? 'acc-cash' : 'acc-bank',
    reference: `${t.externalRef ?? 'REF'}-${n}`,
    paidBy: by,
    createdAt: `${date}T${String(10 + n % 7).padStart(2, '0')}:${String(n * 11 % 60).padStart(2, '0')}:00`,
    notes,
    branchId: t.branchId
  });
}

seedTransactions.forEach((t, k) => {
  const r = seedRows[k];
  if (r.pay === 'none') return;
  const s = svc(t.serviceId);
  const d = minIso(addDaysIso(t.transactionDate, k % 3 === 0 ? 0 : 1), todayIso());
  const by = k % 5 === 4 ? 'u-acc' : r.officer;
  if (t.templateId) {
    // Multi-step: pay per completed (or in-progress) stage with an expected cost.
    const payable = t.stages.filter((st) => st.applicable && st.expectedCost > 0 && st.status !== 'not_started');
    const take = r.pay === 'partial' ? payable.slice(0, Math.max(1, Math.min(2, payable.length))) : payable;
    take.forEach((st) => {
      const stSvc = st.serviceId ? svc(st.serviceId) : s;
      const isGov = stSvc.governmentFee >= stSvc.providerCost;
      addPayment(t, isGov ? 'government_fee' : 'provider_cost', isGov ? govSupplier(stSvc.authority) : providerSupplier(stSvc.authority), st.expectedCost, d, by, st.id);
    });
    return;
  }
  const stageId = t.stages[0]?.id;
  if (t.fees.governmentFee > 0) addPayment(t, 'government_fee', govSupplier(s.authority), t.fees.governmentFee, d, by, stageId);
  if (t.fees.providerCost > 0) {
    // Partial: the provider charged less than expected and the cost was finalized.
    const amount = r.pay === 'partial' ? round2(t.fees.providerCost - 30) : t.fees.providerCost;
    addPayment(t, 'provider_cost', providerSupplier(s.authority), amount, d, by, stageId, r.pay === 'partial' ? 'المركز طبّق خصماً — اعتُمدت التكلفة النهائية' : undefined);
  }
  if (r.pay === 'overrun') addPayment(t, 'other_direct_cost', 'sup-courier', 40, d, by, undefined, 'رسوم توصيل مستندات عاجلة غير مفوترة للعميل');
});

/* ───────────── Invoices (snapshot of transaction fees) ───────────── */
const invoiceGroups: number[][] = [[33], [35, 20], [40, 28], [38], [39], [37], [36], [34], [32], [31], [30], [29], [27], [26], [24], [22], [19, 4], [12, 25], [16], [1]];

function lineFor(t: Transaction): LineItem {
  const s = svc(t.serviceId);
  return {
    id: `li-${t.id}`,
    serviceId: t.serviceId,
    transactionId: t.id,
    descriptionAr: s.nameAr,
    descriptionEn: s.nameEn,
    beneficiary: t.titleAr.split('—')[1]?.trim(),
    quantity: 1,
    governmentFee: t.fees.governmentFee,
    providerCost: t.fees.providerCost,
    otherCosts: t.fees.otherCosts,
    serviceFee: t.fees.serviceFee,
    discount: t.fees.discount,
    vatTreatment: t.fees.vatTreatment
  };
}

export const seedInvoices: Invoice[] = invoiceGroups.map((group, k) => {
  const txs = group.map((n) => seedTransactions[n - 1]);
  const date = txs.map((t) => t.transactionDate).sort()[0];
  const id = `inv-${k + 1}`;
  // Link receipts of the invoiced transactions to the invoice.
  seedReceipts.forEach((r) => {
    if (r.kind === 'receipt' && r.allocations.some((a) => txs.some((t) => t.id === a.transactionId))) r.invoiceId = id;
  });
  return {
    id,
    number: `INV-2026-${pad(k + 1)}`,
    customerId: txs[0].customerId,
    companyId: txs[0].companyId,
    date,
    dueDate: addDaysIso(date, 14),
    lines: txs.map(lineFor),
    vatRate: SEED_VAT_RATE,
    state: 'issued',
    notes: '',
    terms: DEFAULT_INVOICE_TERMS,
    createdBy: 'u-acc',
    createdAt: `${date}T16:30:00`,
    branchId: txs[0].branchId
  };
});

/* ───────────── Operating expenses (15) ───────────── */
let expSeq = 0;
const op = (category: ExpenseCategory, beneficiary: string, ago: number, amount: number, extra: Partial<Expense> = {}): Expense => {
  expSeq++;
  const date = dateFromToday(-ago);
  return {
    id: `exp-${expSeq}`,
    number: `EXP-2026-${pad(expSeq)}`,
    category,
    beneficiary,
    date,
    amount,
    method: 'bank_transfer',
    accountId: 'acc-bank',
    paid: true,
    createdBy: 'u-acc',
    createdAt: `${date}T15:${String(10 + expSeq).padStart(2, '0')}:00`,
    branchId: 'deira',
    ...extra
  };
};

export const seedExpenses: Expense[] = [
op('rent', 'عقارات البرج للتأجير', 2, 2200, { supplierId: 'sup-landlord', attachmentName: 'rent-current.pdf' }),
op('rent', 'عقارات البرج للتأجير', 33, 2200, { supplierId: 'sup-landlord', attachmentName: 'rent-previous.pdf' }),
op('salaries', 'رواتب الموظفين — الشهر الحالي', 5, 14500),
op('salaries', 'رواتب الموظفين — الشهر السابق', 36, 14500),
op('utilities', 'فاتورة الكهرباء والمياه (تجريبي)', 4, 380, { paid: false }),
op('utilities', 'الاتصالات والإنترنت', 12, 420),
op('marketing', 'حملة إعلانات رقمية', 9, 800, { method: 'card' }),
op('transport', 'مواصلات المندوبين', 0, 120, { method: 'cash', accountId: 'acc-cash', createdBy: 'u-pro1' }),
op('transport', 'مواصلات المندوبين', 7, 95, { method: 'cash', accountId: 'acc-cash', branchId: 'business-bay', createdBy: 'u-pro2' }),
op('office', 'قرطاسية وأحبار طابعات', 1, 340, { method: 'cash', accountId: 'acc-cash', supplierId: 'sup-typing' }),
op('office', 'صيانة أجهزة الحاسب', 20, 600, { paid: false, branchId: 'business-bay' }),
op('bank_fees', 'رسوم بنكية شهرية', 30, 75),
op('transport', 'توصيل مستندات', 15, 180, { supplierId: 'sup-courier', paid: false }),
op('other', 'ضيافة المكتب', 3, 150, { method: 'cash', accountId: 'acc-cash' }),
op('marketing', 'طباعة بروشورات', 45, 500)];


/* ───────────── Transfers between accounts ───────────── */
export const seedTransfers: Transfer[] = [
{ id: 'trf-1', number: 'TRF-2026-0001', fromAccountId: 'acc-bank', toAccountId: 'acc-govcard', date: dateFromToday(-20), amount: 15000, reference: 'TOPUP-20', notes: 'تعبئة رصيد بطاقة سداد الرسوم الحكومية', createdBy: 'u-acc', createdAt: `${dateFromToday(-20)}T09:00:00` },
{ id: 'trf-2', number: 'TRF-2026-0002', fromAccountId: 'acc-cash', toAccountId: 'acc-bank', date: dateFromToday(-7), amount: 10000, reference: 'DEP-07', notes: 'إيداع نقدية الصندوق في البنك', createdBy: 'u-acc', createdAt: `${dateFromToday(-7)}T17:00:00` },
{ id: 'trf-3', number: 'TRF-2026-0003', fromAccountId: 'acc-bank', toAccountId: 'acc-govcard', date: dateFromToday(-3), amount: 8000, reference: 'TOPUP-03', notes: 'تعبئة رصيد بطاقة سداد الرسوم الحكومية', createdBy: 'u-acc', createdAt: `${dateFromToday(-3)}T09:15:00` }];
