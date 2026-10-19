import type { WorkflowTemplate } from '../types/cases';

/**
 * Initial business workflow templates. They are configurable starting points —
 * not a claim that every case requires every stage or this exact order.
 * A stage's expected cost is taken from the catalog service it references.
 */
export const workflowTemplates: WorkflowTemplate[] = [
{
  id: 'res-standard',
  caseType: 'residence',
  pathway: 'standard',
  nameAr: 'إقامة عمل — المسار القياسي',
  nameEn: 'Employment residence — standard',
  descriptionAr: 'مراحل متتابعة قابلة للتعديل مع مراحل اختيارية وشروط',
  descriptionEn: 'Sequential configurable stages with optional and conditional steps',
  stages: [
  { key: 'offer_contract', nameAr: 'عقد وعرض العمل', nameEn: 'Employment offer & contract', serviceId: 'svc-offer', mandatory: true, dependsOn: [], condition: 'always', slaDays: 3 },
  { key: 'wp_deposit', nameAr: 'تأمين تصريح العمل', nameEn: 'Work permit deposit', serviceId: 'svc-wp-deposit', mandatory: true, dependsOn: ['offer_contract'], condition: 'always', slaDays: 2 },
  { key: 'wp_fees', nameAr: 'رسوم تصريح العمل', nameEn: 'Work permit / labour card fees', serviceId: 'svc-wp-fee', mandatory: true, dependsOn: ['wp_deposit'], condition: 'always', slaDays: 3 },
  { key: 'entry_permit', nameAr: 'تصريح الدخول', nameEn: 'Entry permit', serviceId: 'svc-entry', mandatory: true, dependsOn: ['wp_fees'], condition: 'always', slaDays: 4 },
  { key: 'change_status', nameAr: 'تعديل الوضع', nameEn: 'Change of status', serviceId: 'svc-cos', mandatory: true, dependsOn: ['entry_permit'], condition: 'insideUae', slaDays: 3 },
  { key: 'medical', nameAr: 'الفحص الطبي', nameEn: 'Medical fitness test', serviceId: 'svc-medical', mandatory: true, dependsOn: ['entry_permit'], condition: 'always', slaDays: 4 },
  { key: 'tawjeeh', nameAr: 'التوجيه', nameEn: 'Orientation / Tawjeeh', serviceId: 'svc-tawjeeh', mandatory: false, dependsOn: ['entry_permit'], condition: 'always', slaDays: 5, defaultOn: false },
  { key: 'iloe', nameAr: 'تأمين التعطل عن العمل', nameEn: 'ILOE insurance', serviceId: 'svc-iloe', mandatory: false, dependsOn: [], condition: 'always', slaDays: 3, defaultOn: false },
  { key: 'emirates_id', nameAr: 'الهوية الإماراتية', nameEn: 'Emirates ID & biometrics', serviceId: 'svc-eid', mandatory: true, dependsOn: ['medical'], condition: 'always', slaDays: 5 },
  { key: 'residence', nameAr: 'إصدار وتثبيت الإقامة', nameEn: 'Residence permit issuance', serviceId: 'svc-residence', mandatory: true, dependsOn: ['medical', 'emirates_id'], condition: 'always', slaDays: 5 }]

},
{
  id: 'fam-standard',
  caseType: 'family',
  pathway: 'standard',
  nameAr: 'استقدام أسرة',
  nameEn: 'Family sponsorship',
  descriptionAr: 'تُحدَّد المراحل حسب وجود المكفول داخل الدولة وانطباق الفحص الطبي',
  descriptionEn: 'Stages apply based on location and medical eligibility',
  stages: [
  { key: 'entry_permit', nameAr: 'تأشيرة دخول من خارج الدولة', nameEn: 'Entry permit (outside UAE)', serviceId: 'svc-fam-entry', mandatory: true, dependsOn: [], condition: 'outsideUae', slaDays: 5 },
  { key: 'change_status', nameAr: 'تعديل الوضع داخل الدولة', nameEn: 'Change of status (inside UAE)', serviceId: 'svc-fam-cos', mandatory: true, dependsOn: [], condition: 'insideUae', slaDays: 4 },
  { key: 'medical', nameAr: 'الفحص الطبي عند انطباقه', nameEn: 'Medical fitness (when applicable)', serviceId: 'svc-fam-medical', mandatory: true, dependsOn: ['entry_permit', 'change_status'], condition: 'medicalRequired', slaDays: 4 },
  { key: 'emirates_id', nameAr: 'الهوية الإماراتية', nameEn: 'Emirates ID & biometrics', serviceId: 'svc-fam-eid', mandatory: true, dependsOn: ['entry_permit', 'change_status', 'medical'], condition: 'always', slaDays: 5 },
  { key: 'insurance', nameAr: 'التأمين الصحي عند انطباقه', nameEn: 'Health insurance (when applicable)', serviceId: 'svc-fam-insurance', mandatory: false, dependsOn: [], condition: 'always', slaDays: 3, defaultOn: false },
  { key: 'residence', nameAr: 'إصدار وتثبيت الإقامة', nameEn: 'Residence issuance', serviceId: 'svc-fam-residence', mandatory: true, dependsOn: ['emirates_id'], condition: 'always', slaDays: 5 }]

},
{
  id: 'visit-standard',
  caseType: 'visit',
  pathway: 'standard',
  nameAr: 'تأشيرة زيارة',
  nameEn: 'Visit visa',
  descriptionAr: 'طلب تأشيرة الزيارة ومتابعة إصدارها',
  descriptionEn: 'Visit visa application and issuance',
  stages: [
  { key: 'visit_application', nameAr: 'تقديم الطلب والمستندات', nameEn: 'Application & documents', serviceId: 'svc-visit', mandatory: true, dependsOn: [], condition: 'always', slaDays: 2 },
  { key: 'visit_entry_permit', nameAr: 'إصدار تصريح الدخول', nameEn: 'Entry permit issuance', mandatory: true, dependsOn: ['visit_application'], condition: 'always', slaDays: 3 }]

},
{
  id: 'form-mainland',
  caseType: 'formation',
  pathway: 'standard',
  nameAr: 'تأسيس شركة — البر الرئيسي',
  nameEn: 'Company formation — mainland',
  descriptionAr: 'تسلسل مقترح لدى سلطة الترخيص؛ قابل للتعديل',
  descriptionEn: 'Suggested sequence for mainland licensing; configurable',
  stages: [
  { key: 'consultation', nameAr: 'الاستشارة واختيار النشاط', nameEn: 'Consultation & activity selection', mandatory: true, dependsOn: [], condition: 'always', slaDays: 3 },
  { key: 'trade_name', nameAr: 'حجز الاسم التجاري', nameEn: 'Trade name reservation', serviceId: 'svc-trade-name', mandatory: true, dependsOn: ['consultation'], condition: 'always', slaDays: 3 },
  { key: 'initial_approval', nameAr: 'الموافقة المبدئية', nameEn: 'Initial approval', serviceId: 'svc-initial-approval', mandatory: true, dependsOn: ['trade_name'], condition: 'always', slaDays: 5 },
  { key: 'incorporation_docs', nameAr: 'مستندات التأسيس وتصديقها', nameEn: 'Incorporation documents & attestation', serviceId: 'svc-attest', mandatory: true, dependsOn: ['initial_approval'], condition: 'always', slaDays: 7 },
  { key: 'license_issue', nameAr: 'إصدار الرخصة', nameEn: 'License issuance', serviceId: 'svc-license-issue', mandatory: true, dependsOn: ['incorporation_docs'], condition: 'always', slaDays: 5 },
  { key: 'establishment_card', nameAr: 'بطاقة المنشأة', nameEn: 'Establishment card', serviceId: 'svc-est-card', mandatory: false, dependsOn: ['license_issue'], condition: 'always', slaDays: 7, defaultOn: false }]

},
{
  id: 'form-renewal',
  caseType: 'formation',
  pathway: 'renewal',
  nameAr: 'تجديد رخصة تجارية',
  nameEn: 'Trade license renewal',
  descriptionAr: 'تجديد الرخصة القائمة',
  descriptionEn: 'Renew an existing license',
  stages: [
  { key: 'renewal_docs', nameAr: 'تجهيز مستندات التجديد', nameEn: 'Renewal documents', mandatory: true, dependsOn: [], condition: 'always', slaDays: 3 },
  { key: 'renewal_payment', nameAr: 'سداد رسوم التجديد', nameEn: 'Renewal payment', serviceId: 'svc-license-renew', mandatory: true, dependsOn: ['renewal_docs'], condition: 'always', slaDays: 3 },
  { key: 'license_issue', nameAr: 'استلام الرخصة المجددة', nameEn: 'Renewed license issued', mandatory: true, dependsOn: ['renewal_payment'], condition: 'always', slaDays: 3 }]

},
{
  id: 'form-amendment',
  caseType: 'formation',
  pathway: 'amendment',
  nameAr: 'تعديل رخصة تجارية',
  nameEn: 'Trade license amendment',
  descriptionAr: 'إضافة نشاط أو شريك أو تعديل بيانات',
  descriptionEn: 'Add activity or partner, or amend details',
  stages: [
  { key: 'amendment_request', nameAr: 'طلب التعديل وسداد الرسوم', nameEn: 'Amendment request & fees', serviceId: 'svc-license-amend', mandatory: true, dependsOn: [], condition: 'always', slaDays: 3 },
  { key: 'amendment_approval', nameAr: 'موافقة الجهة', nameEn: 'Authority approval', mandatory: true, dependsOn: ['amendment_request'], condition: 'always', slaDays: 5 },
  { key: 'license_update', nameAr: 'تحديث الرخصة', nameEn: 'License updated', mandatory: true, dependsOn: ['amendment_approval'], condition: 'always', slaDays: 3 }]

},
{
  id: 'tawjeeh',
  caseType: 'residence',
  pathway: 'standard',
  nameAr: 'خطوات عمل التوجيه',
  nameEn: 'Tawjeeh procedure',
  descriptionAr: 'حسب دليل عمل المكتب (التوجية.pdf)',
  descriptionEn: 'Per the office procedure sheet',
  stages: [
  { key: 'tw_ids', nameAr: 'تجهيز رقم البطاقة والرقم الموحد', nameEn: 'Collect card number & unified number', serviceId: 'svc-tawjeeh', mandatory: true, dependsOn: [], condition: 'always', slaDays: 1 },
  { key: 'tw_company_app', nameAr: 'فتح تطبيق «مهري» من حساب الشركة التي عليها الشخص', nameEn: 'Open MOHRE app on the sponsoring company account', mandatory: true, dependsOn: ['tw_ids'], condition: 'always', slaDays: 1 },
  { key: 'tw_second_phone', nameAr: 'فتح «مهري» من هاتف آخر غير مسجل عليه شركة', nameEn: 'Open MOHRE app on a phone with no company registered', mandatory: true, dependsOn: ['tw_company_app'], condition: 'always', slaDays: 1 },
  { key: 'tw_search', nameAr: 'من الهاتف غير المسجل: البحث عن «توجيه»', nameEn: 'On the unregistered phone: search for Tawjeeh', mandatory: true, dependsOn: ['tw_second_phone'], condition: 'always', slaDays: 1 },
  { key: 'tw_attach', nameAr: 'إرفاق المتطلبات ثم التحضير', nameEn: 'Attach requirements, then prepare', mandatory: true, dependsOn: ['tw_search'], condition: 'always', slaDays: 1 },
  { key: 'tw_approve', nameAr: 'الرجوع لهاتف الشركة للاعتماد والتسليم', nameEn: 'Back on the company phone: approve and submit', mandatory: true, dependsOn: ['tw_attach'], condition: 'always', slaDays: 1 }]

},
{
  id: 'pro-general',
  caseType: 'pro',
  pathway: 'standard',
  nameAr: 'معاملة حكومية عامة',
  nameEn: 'General government transaction',
  descriptionAr: 'تقديم المعاملة ومتابعتها لدى الجهة وتسليمها',
  descriptionEn: 'Submission, authority follow-up and delivery',
  stages: [
  { key: 'pro_submission', nameAr: 'تقديم المعاملة', nameEn: 'Submission', serviceId: 'svc-pro', mandatory: true, dependsOn: [], condition: 'always', slaDays: 2 },
  { key: 'pro_processing', nameAr: 'المتابعة لدى الجهة', nameEn: 'Authority processing', mandatory: true, dependsOn: ['pro_submission'], condition: 'always', slaDays: 4 },
  { key: 'pro_delivery', nameAr: 'الاستلام والتسليم', nameEn: 'Collection & delivery', mandatory: true, dependsOn: ['pro_processing'], condition: 'always', slaDays: 2 }]

}];


export const templatesFor = (type: WorkflowTemplate['caseType']) => workflowTemplates.filter((t) => t.caseType === type);
export const templateById = (id?: string) => id ? workflowTemplates.find((t) => t.id === id) : undefined;
