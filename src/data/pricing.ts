import type { ServiceCatalogItem, ServiceCategory } from '../types/catalog';
import { workflowTemplates } from './workflowTemplates';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  SINGLE SOURCE OF DEMO PRICES
 *  All amounts below are FICTIONAL placeholders for UI testing only.
 *  They are NOT verified government fees, official quotations, or universal prices.
 *  "Demo Price — Not Official" / "سعر تجريبي — غير رسمي"
 *  Edit prices here (seed) or at runtime from the Service Catalog & Pricing page.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const DEMO_PRICE_LABEL = { ar: 'سعر تجريبي — غير رسمي', en: 'Demo Price — Not Official' };

type Row = Pick<ServiceCatalogItem, 'id' | 'code' | 'category' | 'authority' | 'nameAr' | 'nameEn' | 'descriptionAr' | 'governmentFee' | 'providerCost' | 'serviceFee'> &
Partial<ServiceCatalogItem>;

const base = {
  otherCosts: 0,
  vatTreatment: 'standard' as const,
  requiresCompany: 'optional' as const,
  requiresBeneficiary: 'optional' as const,
  requiredDocuments: [] as string[],
  slaDays: 3,
  effectiveFrom: '2026-01-01',
  active: true,
  isDemoPrice: true,
  notes: ''
};

const WORK = { requiresCompany: 'required' as const, requiresBeneficiary: 'required' as const };
const FAMILY = { requiresCompany: 'none' as const, requiresBeneficiary: 'required' as const };
const PASSPORT_DOCS = ['صورة جواز السفر', 'صورة شخصية'];

const rows: Row[] = [
/* ── معاملات العمل والإقامة ── */
{ ...WORK, id: 'svc-offer', code: 'RES-01', category: 'residence', authority: 'mohre', nameAr: 'عقد وعرض العمل', nameEn: 'Employment offer & contract', descriptionAr: 'إعداد عرض العمل وعقد التوظيف وتقديمهما للجهة المختصة', governmentFee: 150, providerCost: 0, serviceFee: 100, requiredDocuments: [...PASSPORT_DOCS, 'الشهادة الدراسية (عند الطلب)'] },
{ ...WORK, id: 'svc-wp-deposit', code: 'RES-02', category: 'residence', authority: 'mohre', nameAr: 'تأمين تصريح العمل', nameEn: 'Work permit deposit', descriptionAr: 'إيداع ضمان تصريح العمل', governmentFee: 250, providerCost: 0, serviceFee: 50 },
{ ...WORK, id: 'svc-wp-fee', code: 'RES-03', category: 'residence', authority: 'mohre', nameAr: 'رسوم تصريح العمل وبطاقة العمل', nameEn: 'Work permit & labour card fees', descriptionAr: 'سداد رسوم تصريح العمل وبطاقة العمل', governmentFee: 800, providerCost: 0, serviceFee: 150 },
{ ...WORK, id: 'svc-entry', code: 'RES-04', category: 'residence', authority: 'gdrfa', nameAr: 'تصريح الدخول', nameEn: 'Entry permit', descriptionAr: 'إصدار تصريح دخول للعمل', governmentFee: 500, providerCost: 0, serviceFee: 150, requiredDocuments: PASSPORT_DOCS },
{ ...WORK, id: 'svc-visa-inside', code: 'RES-05', category: 'residence', authority: 'gdrfa', nameAr: 'تأشيرة داخل الدولة', nameEn: 'In-country visa', descriptionAr: 'إصدار تأشيرة لمتقدم موجود داخل الدولة', governmentFee: 650, providerCost: 0, serviceFee: 150, requiredDocuments: [...PASSPORT_DOCS, 'صفحة الدخول أو التأشيرة الحالية'] },
{ ...WORK, id: 'svc-cos', code: 'RES-06', category: 'residence', authority: 'gdrfa', nameAr: 'تعديل الوضع', nameEn: 'Change of status', descriptionAr: 'تعديل وضع المتقدم الموجود داخل الدولة', governmentFee: 700, providerCost: 0, serviceFee: 150 },
{ ...WORK, id: 'svc-medical', code: 'RES-07', category: 'residence', authority: 'medical', nameAr: 'الفحص الطبي', nameEn: 'Medical fitness test', descriptionAr: 'حجز ومتابعة الفحص الطبي لدى مركز معتمد', governmentFee: 0, providerCost: 350, serviceFee: 100, requiredDocuments: PASSPORT_DOCS },
{ ...WORK, id: 'svc-tawjeeh', code: 'RES-08', category: 'residence', authority: 'mohre', nameAr: 'التوجيه', nameEn: 'Orientation (Tawjeeh)', descriptionAr: 'حضور جلسة التوجيه عند انطباقها', governmentFee: 0, providerCost: 200, serviceFee: 50 },
{ ...WORK, id: 'svc-iloe', code: 'RES-09', category: 'residence', authority: 'insurer', nameAr: 'تأمين التعطل عن العمل', nameEn: 'Involuntary loss of employment insurance', descriptionAr: 'تسجيل ومتابعة الاشتراك في تأمين التعطل عن العمل', governmentFee: 0, providerCost: 100, serviceFee: 30 },
{ ...WORK, id: 'svc-eid', code: 'RES-10', category: 'residence', authority: 'icp', nameAr: 'الهوية الإماراتية', nameEn: 'Emirates ID', descriptionAr: 'طلب الهوية وحجز موعد البصمات', governmentFee: 400, providerCost: 0, serviceFee: 100, requiredDocuments: PASSPORT_DOCS },
{ ...WORK, id: 'svc-residence', code: 'RES-11', category: 'residence', authority: 'gdrfa', nameAr: 'إصدار الإقامة أو تثبيتها', nameEn: 'Residence issuance / stamping', descriptionAr: 'إصدار الإقامة وتثبيتها', governmentFee: 600, providerCost: 0, serviceFee: 200, requiredDocuments: [...PASSPORT_DOCS, 'نتيجة الفحص الطبي'] },
{ ...WORK, id: 'svc-res-renew', code: 'RES-12', category: 'residence', authority: 'gdrfa', nameAr: 'تجديد الإقامة', nameEn: 'Residence renewal', descriptionAr: 'تجديد الإقامة للموظف الحالي', governmentFee: 550, providerCost: 0, serviceFee: 200, requiredDocuments: [...PASSPORT_DOCS, 'الإقامة الحالية'] },
{ ...WORK, id: 'svc-res-cancel', code: 'RES-13', category: 'residence', authority: 'gdrfa', nameAr: 'إلغاء الإقامة', nameEn: 'Residence cancellation', descriptionAr: 'إلغاء إقامة الموظف وتصريح العمل', governmentFee: 150, providerCost: 0, serviceFee: 150, requiredDocuments: ['صورة جواز السفر', 'نموذج الإلغاء الموقّع'] },
{ ...WORK, id: 'svc-wp-renew', code: 'RES-14', category: 'residence', authority: 'mohre', nameAr: 'تجديد تصريح العمل', nameEn: 'Work permit renewal', descriptionAr: 'تجديد تصريح العمل للموظف', governmentFee: 800, providerCost: 0, serviceFee: 150 },
{ ...WORK, id: 'svc-res-package', code: 'RES-20', category: 'residence', authority: 'gdrfa', templateId: 'res-standard', slaDays: 21, nameAr: 'باقة إقامة عمل كاملة', nameEn: 'Full employment residence package', descriptionAr: 'مسار متعدد الخطوات من عرض العمل حتى تثبيت الإقامة', governmentFee: 0, providerCost: 0, serviceFee: 0, requiredDocuments: [...PASSPORT_DOCS, 'الشهادة الدراسية (عند الطلب)'] },

/* ── استقدام الأسرة ── */
{ ...FAMILY, id: 'svc-fam-entry', code: 'FAM-01', category: 'family', authority: 'gdrfa', nameAr: 'تأشيرة دخول من خارج الدولة', nameEn: 'Family entry permit (outside UAE)', descriptionAr: 'إصدار تأشيرة دخول للمكفول من خارج الدولة', governmentFee: 450, providerCost: 0, serviceFee: 150, requiredDocuments: [...PASSPORT_DOCS, 'شهادة القرابة المصدقة', 'عقد السكن'] },
{ ...FAMILY, id: 'svc-fam-cos', code: 'FAM-02', category: 'family', authority: 'gdrfa', nameAr: 'تعديل الوضع (أسرة)', nameEn: 'Family change of status', descriptionAr: 'عند انطباقه للمكفول الموجود داخل الدولة', governmentFee: 700, providerCost: 0, serviceFee: 150 },
{ ...FAMILY, id: 'svc-fam-medical', code: 'FAM-03', category: 'family', authority: 'medical', nameAr: 'الفحص الطبي (أسرة)', nameEn: 'Family medical fitness', descriptionAr: 'عند انطباقه حسب العمر والفئة', governmentFee: 0, providerCost: 350, serviceFee: 100 },
{ ...FAMILY, id: 'svc-fam-eid', code: 'FAM-04', category: 'family', authority: 'icp', nameAr: 'الهوية الإماراتية (أسرة)', nameEn: 'Family Emirates ID', descriptionAr: 'طلب هوية المكفول والبصمات', governmentFee: 400, providerCost: 0, serviceFee: 100 },
{ ...FAMILY, id: 'svc-fam-insurance', code: 'FAM-05', category: 'family', authority: 'insurer', nameAr: 'التأمين الصحي (أسرة)', nameEn: 'Family health insurance', descriptionAr: 'عند انطباقه — القسط يُدفع لشركة التأمين ولا يُعد إيراداً للمكتب', governmentFee: 0, providerCost: 750, serviceFee: 100 },
{ ...FAMILY, id: 'svc-fam-residence', code: 'FAM-06', category: 'family', authority: 'gdrfa', nameAr: 'إصدار إقامة الأسرة', nameEn: 'Family residence issuance', descriptionAr: 'إصدار وتثبيت إقامة المكفول', governmentFee: 550, providerCost: 0, serviceFee: 200 },
{ ...FAMILY, id: 'svc-fam-renew', code: 'FAM-07', category: 'family', authority: 'gdrfa', nameAr: 'تجديد إقامة الأسرة', nameEn: 'Family residence renewal', descriptionAr: 'تجديد إقامة المكفولين', governmentFee: 500, providerCost: 0, serviceFee: 200, requiredDocuments: [...PASSPORT_DOCS, 'الإقامة الحالية', 'عقد السكن'] },
{ ...FAMILY, id: 'svc-fam-cancel', code: 'FAM-08', category: 'family', authority: 'gdrfa', nameAr: 'إلغاء إقامة الأسرة', nameEn: 'Family residence cancellation', descriptionAr: 'إلغاء إقامة المكفول', governmentFee: 150, providerCost: 0, serviceFee: 100 },
{ ...FAMILY, id: 'svc-fam-package', code: 'FAM-20', category: 'family', authority: 'gdrfa', templateId: 'fam-standard', slaDays: 20, nameAr: 'باقة استقدام أسرة', nameEn: 'Family sponsorship package', descriptionAr: 'مسار متعدد الخطوات لاستقدام فرد من الأسرة', governmentFee: 0, providerCost: 0, serviceFee: 0, requiredDocuments: [...PASSPORT_DOCS, 'شهادة القرابة المصدقة', 'عقد السكن', 'شهادة الراتب'] },

/* ── خدمات أخرى ── */
{ ...FAMILY, id: 'svc-visit', code: 'VIS-01', category: 'visit', authority: 'gdrfa', templateId: 'visit-standard', slaDays: 5, nameAr: 'الزيارات العائلية', nameEn: 'Family visit visa', descriptionAr: 'تأشيرة زيارة عائلية لمدة 30 يوماً', governmentFee: 350, providerCost: 0, serviceFee: 150, requiredDocuments: PASSPORT_DOCS },
{ ...FAMILY, id: 'svc-health-ins', code: 'INS-01', category: 'insurance', authority: 'insurer', nameAr: 'التأمين الصحي', nameEn: 'Health insurance', descriptionAr: 'إصدار وثيقة تأمين صحي — القسط ليس إيراداً للمكتب', governmentFee: 0, providerCost: 600, serviceFee: 100, requiredDocuments: ['صورة جواز السفر', 'صورة الهوية أو التأشيرة'] },
{ id: 'svc-formation', code: 'FRM-01', category: 'formation', authority: 'det', templateId: 'form-mainland', slaDays: 30, requiresCompany: 'none', requiresBeneficiary: 'none', nameAr: 'تأسيس الشركات', nameEn: 'Company formation', descriptionAr: 'الاستشارة وحجز الاسم والموافقات وإصدار الرخصة', governmentFee: 0, providerCost: 0, serviceFee: 1500, requiredDocuments: ['جوازات الشركاء', 'عقد إيجار المقر'] },
{ id: 'svc-license-issue', code: 'FRM-02', category: 'formation', authority: 'det', requiresCompany: 'optional', requiresBeneficiary: 'none', nameAr: 'إصدار الرخص التجارية', nameEn: 'Trade license issuance', descriptionAr: 'سداد رسوم إصدار الرخصة التجارية', governmentFee: 8500, providerCost: 0, serviceFee: 750 },
{ id: 'svc-license-renew', code: 'FRM-03', category: 'formation', authority: 'det', templateId: 'form-renewal', slaDays: 7, requiresCompany: 'required', requiresBeneficiary: 'none', nameAr: 'تجديد الرخص التجارية', nameEn: 'Trade license renewal', descriptionAr: 'تجديد الرخصة وتحديث البيانات', governmentFee: 6000, providerCost: 0, serviceFee: 750, requiredDocuments: ['الرخصة الحالية', 'عقد الإيجار الساري'] },
{ id: 'svc-license-amend', code: 'FRM-04', category: 'formation', authority: 'det', templateId: 'form-amendment', slaDays: 10, requiresCompany: 'required', requiresBeneficiary: 'none', nameAr: 'تعديل بيانات الرخص', nameEn: 'Trade license amendment', descriptionAr: 'إضافة نشاط أو شريك أو تعديل بيانات', governmentFee: 1500, providerCost: 0, serviceFee: 500 },
{ id: 'svc-trade-name', code: 'FRM-05', category: 'formation', authority: 'det', requiresCompany: 'none', requiresBeneficiary: 'none', nameAr: 'حجز الاسم التجاري', nameEn: 'Trade name reservation', descriptionAr: 'حجز الاسم التجاري لدى سلطة الترخيص', governmentFee: 620, providerCost: 0, serviceFee: 200 },
{ id: 'svc-initial-approval', code: 'FRM-06', category: 'formation', authority: 'det', requiresCompany: 'none', requiresBeneficiary: 'none', nameAr: 'الموافقة المبدئية', nameEn: 'Initial approval', descriptionAr: 'الحصول على الموافقة المبدئية للنشاط', governmentFee: 120, providerCost: 0, serviceFee: 150 },
{ id: 'svc-pro', code: 'PRO-01', category: 'pro', authority: 'typing', templateId: 'pro-general', requiresBeneficiary: 'optional', nameAr: 'خدمات PRO', nameEn: 'PRO services', descriptionAr: 'تقديم ومتابعة معاملة حكومية عامة وتسليمها', governmentFee: 150, providerCost: 0, serviceFee: 100 },
{ id: 'svc-attest', code: 'PRO-02', category: 'pro', authority: 'typing', nameAr: 'تصديق مستندات', nameEn: 'Document attestation', descriptionAr: 'تصديق العقود والشهادات', governmentFee: 200, providerCost: 0, serviceFee: 150 },
{ id: 'svc-est-card', code: 'PRO-03', category: 'pro', authority: 'gdrfa', requiresCompany: 'required', requiresBeneficiary: 'none', nameAr: 'بطاقة المنشأة', nameEn: 'Establishment card', descriptionAr: 'إصدار أو تجديد بطاقة المنشأة', governmentFee: 2000, providerCost: 0, serviceFee: 300 }];


/** Package services are priced as the sum of their default workflow steps (plus their own office fee). */
function priceFromTemplate(items: ServiceCatalogItem[]): ServiceCatalogItem[] {
  const byId = new Map(items.map((s) => [s.id, s]));
  return items.map((s) => {
    if (!s.templateId) return s;
    const tpl = workflowTemplates.find((t) => t.id === s.templateId);
    if (!tpl) return s;
    const steps = tpl.stages.filter((st) => st.serviceId && st.serviceId !== s.id && st.condition !== 'insideUae' && (st.defaultOn ?? true)).map((st) => byId.get(st.serviceId!)).filter(Boolean) as ServiceCatalogItem[];
    return {
      ...s,
      governmentFee: s.governmentFee + steps.reduce((a, x) => a + x.governmentFee, 0),
      providerCost: s.providerCost + steps.reduce((a, x) => a + x.providerCost, 0),
      serviceFee: s.serviceFee + steps.reduce((a, x) => a + x.serviceFee, 0)
    };
  });
}

/* ─────────────────────────────────────────────────────────────────────────────
 *  OFFICE PRICE LIST (from the office price sheet "التوجية.pdf")
 *  system = what the office pays the government system / provider ("سعر السيستم")
 *  customer = final price charged to the customer ("سعر العميل")
 *  Office fee = customer − system. VAT is not added on top, so the amount due equals the
 *  customer price on the sheet — change the VAT treatment per service if fees are taxable.
 * ───────────────────────────────────────────────────────────────────────────── */
const PRICE_SHEET = 'قائمة أسعار المكتب (التوجية.pdf)';

interface SheetPrice {
  system: number;
  customer: number;
  /** Medical / insurance costs are paid to a provider rather than a government body. */
  provider?: boolean;
}

const sheet = (p: SheetPrice): Partial<ServiceCatalogItem> => ({
  governmentFee: p.provider ? 0 : p.system,
  providerCost: p.provider ? p.system : 0,
  serviceFee: Math.max(Math.round((p.customer - p.system) * 100) / 100, 0),
  vatTreatment: 'out_of_scope',
  isDemoPrice: false,
  effectiveFrom: '2026-10-19',
  notes: p.customer < p.system ? `${PRICE_SHEET} — سعر العميل في القائمة ${p.customer}: تحقّق هل يدفع العميل هذا المبلغ مباشرة؟` : PRICE_SHEET
});

/** Existing services re-priced from the sheet. */
const sheetOverrides: Record<string, SheetPrice> = {
  'svc-offer': { system: 50, customer: 276 },
  'svc-wp-deposit': { system: 189, customer: 0 },
  'svc-wp-fee': { system: 3474, customer: 3550 },
  'svc-entry': { system: 375, customer: 476 },
  'svc-cos': { system: 575, customer: 676 },
  'svc-tawjeeh': { system: 0, customer: 151, provider: true },
  'svc-iloe': { system: 126, customer: 126, provider: true },
  'svc-eid': { system: 353, customer: 387 },
  'svc-residence': { system: 446, customer: 546 },
  'svc-medical': { system: 266.65, customer: 330, provider: true },
  'svc-est-card': { system: 476, customer: 476 },
  'svc-visit': { system: 1401, customer: 1501 }
};

type SheetRow = [id: string, nameAr: string, category: ServiceCategory, authority: string, price: SheetPrice, extra?: Partial<ServiceCatalogItem>];
const W = { requiresCompany: 'required' as const, requiresBeneficiary: 'required' as const };
const F = { requiresCompany: 'none' as const, requiresBeneficiary: 'required' as const };
const C = { requiresCompany: 'required' as const, requiresBeneficiary: 'none' as const };

/** Services on the sheet that did not exist in the catalog. Two-price items become two services. */
const sheetRows: SheetRow[] = [
['svc-wp-deposit-2', 'تأمين تصريح العمل (السعر الثاني)', 'residence', 'mohre', { system: 144, customer: 0 }, W],
['svc-wp-fee-2', 'رسوم تصريح العمل وبطاقة العمل (السعر الثاني)', 'residence', 'mohre', { system: 1208, customer: 1286 }, W],
['svc-entry-2', 'إذن الدخول (السعر الثاني)', 'residence', 'gdrfa', { system: 1025, customer: 1125 }, W],
['svc-medical-2', 'الفحص الطبي (السعر الثاني)', 'residence', 'medical', { system: 270, customer: 330, provider: true }, W],
['svc-work-renew', 'التجديد (عمل)', 'residence', 'mohre', { system: 0, customer: 76 }, W],
['svc-work-cancel', 'إلغاء عمل وعمال', 'residence', 'mohre', { system: 0, customer: 76 }, W],
['svc-work-handover', 'تسليم عمل وعمال', 'residence', 'mohre', { system: 0, customer: 76 }, W],
['svc-quota-request', 'طلب الكوتة', 'residence', 'mohre', { system: 0, customer: 76 }, C],
['svc-absconding', 'تعميم شكوى انقطاع', 'residence', 'mohre', { system: 0, customer: 76 }, W],
['svc-work-amend', 'تعديل البيانات (عمل)', 'residence', 'mohre', { system: 0, customer: 76 }, W],
['svc-work-volume', 'تقدير حجم عمل', 'residence', 'mohre', { system: 409.65, customer: 459.65 }, C],
['svc-est-update-work', 'تحديث منشأة (عمل)', 'residence', 'mohre', { system: 447.3, customer: 523.3 }, C],
['svc-quota-amend', 'تعديل كوتة', 'residence', 'mohre', { system: 0, customer: 76 }, C],
['svc-loan', 'الإعارة', 'residence', 'mohre', { system: 50, customer: 126 }, W],
['svc-loan-handover', 'تسليم إعارة', 'residence', 'mohre', { system: 0, customer: 76 }, W],
['svc-loan-handover-fee', 'رسوم تسليم إعارة', 'residence', 'mohre', { system: 0, customer: 76 }, W],
['svc-family-loan', 'إعارة على كفالة ذويهم', 'residence', 'mohre', { system: 50, customer: 126 }, F],
['svc-family-loan-handover', 'تسليم على كفالة ذويهم', 'residence', 'mohre', { system: 0, customer: 76 }, F],
['svc-family-loan-fee', 'رسوم على كفالة ذويهم', 'residence', 'mohre', { system: 254, customer: 294 }, F],
['svc-imm-cancel-out', 'إلغاء جوازات (خارج الدولة)', 'family', 'gdrfa', { system: 125.65, customer: 225.65 }, F],
['svc-imm-cancel-in', 'إلغاء جوازات (داخل الدولة)', 'family', 'gdrfa', { system: 225.65, customer: 325.65 }, F],
['svc-sponsor-file', 'ملف كفالة', 'family', 'gdrfa', { system: 204, customer: 283 }, F],
['svc-imm-amend-family', 'تعديل بيانات جوازات (أسر)', 'family', 'gdrfa', { system: 109, customer: 209 }, F],
['svc-imm-amend-phone', 'تعديل بيانات رقم هاتف (جوازات)', 'family', 'gdrfa', { system: 89, customer: 189 }, F],
['svc-review-family', 'إعادة نظر (أسر)', 'family', 'gdrfa', { system: 89, customer: 189 }, F],
['svc-family-cancel-out', 'كنسلة أسر خارج الدولة', 'family', 'gdrfa', { system: 189, customer: 289 }, F],
['svc-family-cancel-in', 'كنسلة أسر داخل الدولة', 'family', 'gdrfa', { system: 89, customer: 189 }, F],
['svc-family-stamping', 'تثبيت أسر', 'family', 'gdrfa', { system: 409, customer: 509 }, F],
['svc-visit-2m', 'زيارة شهرين (أسر)', 'visit', 'gdrfa', { system: 1526, customer: 1626 }, F],
['svc-visit-3m', 'زيارة 3 أشهر (أسر)', 'visit', 'gdrfa', { system: 1652, customer: 1752 }, F],
['svc-imm-amend-company', 'تعديل بيانات جوازات (شركة)', 'pro', 'gdrfa', { system: 247, customer: 247 }, C],
['svc-est-card-renew', 'تجديد بطاقة منشأة', 'pro', 'gdrfa', { system: 576, customer: 576 }, C],
['svc-imm-circular', 'تعميم جوازات', 'pro', 'gdrfa', { system: 457, customer: 457 }, C],
['svc-review-company', 'إعادة نظر (شركات)', 'pro', 'gdrfa', { system: 125, customer: 225 }, C]];


const RENAMES: Record<string, string> = { 'svc-entry': 'إذن الدخول', 'svc-visit': 'زيارة شهر (أسر)', 'svc-residence': 'التثبيت (إصدار / تثبيت الإقامة)' };

const priced = rows.map((r) => {
  const o = sheetOverrides[r.id];
  return { ...base, ...r, ...(o ? sheet(o) : {}), ...(RENAMES[r.id] ? { nameAr: RENAMES[r.id] } : {}), ...(r.id === 'svc-tawjeeh' ? { templateId: 'tawjeeh' } : {}) } as ServiceCatalogItem;
});
const added = sheetRows.map(([id, nameAr, category, authority, price, extra], i) => ({
  ...base,
  ...extra,
  id,
  code: `OFC-${String(i + 1).padStart(2, '0')}`,
  category,
  authority,
  nameAr,
  nameEn: '',
  descriptionAr: '',
  ...sheet(price)
}) as ServiceCatalogItem);

export const serviceCatalogSeed: ServiceCatalogItem[] = priceFromTemplate([...priced, ...added]);
