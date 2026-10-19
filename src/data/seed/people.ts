import type { Company, Customer, Employee, LegalForm, Jurisdiction } from '../../types/crm';
import type { User } from '../../types/system';
import type { BranchId } from '../../types/common';
import type { StageStatus } from '../../types/cases';
import { addDaysIso, dateFromToday } from '../../utils/dates';
import { createRng } from '../../utils/random';

/** All names, phone numbers, passports and license IDs below are fictional. */

export const seedUsers: User[] = [
{ id: 'u-owner', nameAr: 'خالد المنصوري', nameEn: 'Khalid Al Mansouri', email: 'owner@wifaq-demo.ae', mobile: '+971 50 555 0101', role: 'owner', branchId: 'deira', active: true, createdAt: '2024-01-10' },
{ id: 'u-acc', nameAr: 'ريم الحمادي', nameEn: 'Reem Al Hammadi', email: 'accounts@wifaq-demo.ae', mobile: '+971 50 555 0102', role: 'accountant', branchId: 'deira', active: true, createdAt: '2024-02-01' },
{ id: 'u-pro1', nameAr: 'أحمد يوسف', nameEn: 'Ahmed Youssef', email: 'ahmed.pro@wifaq-demo.ae', mobile: '+971 50 555 0103', role: 'pro', branchId: 'deira', active: true, createdAt: '2024-02-15' },
{ id: 'u-pro2', nameAr: 'سارة إبراهيم', nameEn: 'Sara Ibrahim', email: 'sara.pro@wifaq-demo.ae', mobile: '+971 50 555 0104', role: 'pro', branchId: 'business-bay', active: true, createdAt: '2024-03-01' },
{ id: 'u-mgr', nameAr: 'فاطمة النعيمي', nameEn: 'Fatima Al Nuaimi', email: 'manager@wifaq-demo.ae', mobile: '+971 50 555 0107', role: 'manager', branchId: 'deira', active: true, createdAt: '2024-01-15' }];


/** Staff who execute transactions in the demo data. */
export const PRO_IDS = ['u-pro1', 'u-pro2', 'u-owner'];

interface CompanyRow {
  nameAr: string;
  nameEn: string;
  shortAr: string;
  shortEn: string;
  authority: string;
  jurisdiction: Jurisdiction;
  legalForm: LegalForm;
  actAr: string[];
  actEn: string[];
  owner: string;
  contact: string;
  emailDomain: string;
}

const companyRows: CompanyRow[] = [
{ nameAr: 'شركة النخبة للمقاولات العامة ذ.م.م', nameEn: 'Al Nukhba General Contracting LLC', shortAr: 'النخبة للمقاولات', shortEn: 'Al Nukhba Contracting', authority: 'det', jurisdiction: 'mainland', legalForm: 'llc', actAr: ['المقاولات العامة', 'صيانة المباني'], actEn: ['General contracting', 'Building maintenance'], owner: 'سالم راشد الكعبي', contact: 'Rajesh Kumar', emailDomain: 'nukhba-demo.ae' },
{ nameAr: 'مطاعم ضفاف الخور ذ.م.م', nameEn: 'Creekside Restaurants LLC', shortAr: 'مطاعم ضفاف الخور', shortEn: 'Creekside Restaurants', authority: 'det', jurisdiction: 'mainland', legalForm: 'llc', actAr: ['مطعم', 'خدمات التموين'], actEn: ['Restaurant', 'Catering services'], owner: 'هشام عادل', contact: 'Anjali Sharma', emailDomain: 'creekside-demo.ae' },
{ nameAr: 'مؤسسة الرمال الذهبية للتجارة', nameEn: 'Golden Sands Trading Est.', shortAr: 'الرمال الذهبية', shortEn: 'Golden Sands Trading', authority: 'det', jurisdiction: 'mainland', legalForm: 'sole_establishment', actAr: ['تجارة عامة'], actEn: ['General trading'], owner: 'ماجد سعيد البلوشي', contact: 'Sunil Thapa', emailDomain: 'goldensands-demo.ae' },
{ nameAr: 'أفق التقنية م.م.ح ذ.م.م', nameEn: 'Ufuq Technology FZ-LLC', shortAr: 'أفق التقنية', shortEn: 'Ufuq Technology', authority: 'dso', jurisdiction: 'freezone', legalForm: 'fz_llc', actAr: ['تطوير البرمجيات', 'استشارات تقنية'], actEn: ['Software development', 'IT consultancy'], owner: 'جاد سليمان', contact: 'Omar Al Khatib', emailDomain: 'ufuq-demo.ae' },
{ nameAr: 'مركز اللؤلؤة للتجميل', nameEn: 'Pearl Beauty Center', shortAr: 'مركز اللؤلؤة', shortEn: 'Pearl Beauty', authority: 'det', jurisdiction: 'mainland', legalForm: 'sole_establishment', actAr: ['صالون تجميل نسائي'], actEn: ['Ladies beauty salon'], owner: 'نسرين حداد', contact: 'Nisreen Haddad', emailDomain: 'pearlbeauty-demo.ae' },
{ nameAr: 'شركة الريادة للشحن والخدمات اللوجستية ذ.م.م', nameEn: 'Riyada Shipping & Logistics LLC', shortAr: 'الريادة للشحن', shortEn: 'Riyada Shipping', authority: 'det', jurisdiction: 'mainland', legalForm: 'llc', actAr: ['الشحن البحري', 'التخليص الجمركي'], actEn: ['Sea freight', 'Customs clearance'], owner: 'طلال محمود', contact: 'Faisal Akhtar', emailDomain: 'riyada-demo.ae' },
{ nameAr: 'واحة الصحة الطبية م.م.ح', nameEn: 'Wahat Health Medical FZ-LLC', shortAr: 'واحة الصحة', shortEn: 'Wahat Health', authority: 'dmcc', jurisdiction: 'freezone', legalForm: 'fz_llc', actAr: ['عيادة طبية عامة'], actEn: ['General medical clinic'], owner: 'د. هالة يوسف', contact: 'Hala Youssef', emailDomain: 'wahathealth-demo.ae' },
{ nameAr: 'مؤسسة البناء الحديث للصيانة', nameEn: 'Modern Build Maintenance Est.', shortAr: 'البناء الحديث', shortEn: 'Modern Build', authority: 'det', jurisdiction: 'mainland', legalForm: 'sole_establishment', actAr: ['صيانة عامة', 'أعمال كهربائية'], actEn: ['General maintenance', 'Electrical works'], owner: 'عبدالله حسن الشحي', contact: 'Gurpreet Singh', emailDomain: 'modernbuild-demo.ae' },
{ nameAr: 'سما للاستشارات الإدارية م.م.ح', nameEn: 'Sama Management Consultancy FZE', shortAr: 'سما للاستشارات', shortEn: 'Sama Consultancy', authority: 'dmcc', jurisdiction: 'freezone', legalForm: 'fze', actAr: ['استشارات إدارية'], actEn: ['Management consultancy'], owner: 'إيمان الصالح', contact: 'Iman Al Saleh', emailDomain: 'sama-demo.ae' },
{ nameAr: 'شركة المرسى للسياحة ذ.م.م', nameEn: 'Al Marsa Tourism LLC', shortAr: 'المرسى للسياحة', shortEn: 'Al Marsa Tourism', authority: 'det', jurisdiction: 'mainland', legalForm: 'llc', actAr: ['وكالة سفر وسياحة'], actEn: ['Travel & tourism agency'], owner: 'وليد عثمان', contact: 'Walid Osman', emailDomain: 'almarsa-demo.ae' }];


const individuals: {ar: string;en: string;nat: string;}[] = [
{ ar: 'رامي نصر', en: 'Rami Nasr', nat: 'LB' },
{ ar: 'أنيل كومار مينون', en: 'Anil Kumar Menon', nat: 'IN' },
{ ar: 'هبة الشريف', en: 'Heba El Sherif', nat: 'EG' },
{ ar: 'طارق العلي', en: 'Tariq Al Ali', nat: 'JO' },
{ ar: 'ماريا سانتوس', en: 'Maria Santos', nat: 'PH' },
{ ar: 'عمران شيخ', en: 'Imran Sheikh', nat: 'PK' },
{ ar: 'ليلى حداد', en: 'Layla Haddad', nat: 'SY' },
{ ar: 'جون ماثيو', en: 'John Mathew', nat: 'IN' },
{ ar: 'نادين خوري', en: 'Nadine Khoury', nat: 'LB' },
{ ar: 'فيصل الدوري', en: 'Faisal Al Douri', nat: 'IQ' }];


const rng = createRng(20261018);
const pad = (n: number, w = 4) => String(n).padStart(w, '0');
const phone = (i: number) => `+971 5${i % 2 === 0 ? '0' : '5'} 555 ${pad(2000 + i * 37, 4)}`;
const branchFor = (i: number): BranchId => i % 3 === 2 ? 'business-bay' : 'deira';

export const seedCompanies: Company[] = companyRows.map((c, i) => {
  // license expiry: a few expiring soon, one expired
  const expiryOffsets = [210, 25, 160, 48, 300, -12, 120, 9, 260, 75];
  const expiry = dateFromToday(expiryOffsets[i]);
  return {
    id: `cmp-${i + 1}`,
    code: `CMP-${2001 + i}`,
    customerId: `cus-${i + 1}`,
    nameAr: c.nameAr,
    nameEn: c.nameEn,
    licenseNo: c.jurisdiction === 'freezone' ? `FZ-DEMO-${pad(31000 + i * 113, 5)}` : `TL-DEMO-${pad(840000 + i * 1371, 6)}`,
    authority: c.authority,
    jurisdiction: c.jurisdiction,
    licenseIssue: addDaysIso(expiry, -365),
    licenseExpiry: expiry,
    legalForm: c.legalForm,
    activitiesAr: c.actAr,
    activitiesEn: c.actEn,
    ownerName: c.owner,
    contactName: c.contact,
    mobile: phone(i + 1),
    email: `info@${c.emailDomain}`,
    address: i % 3 === 2 ? 'الخليج التجاري، دبي' : 'ديرة، دبي',
    status: expiryOffsets[i] < 0 ? 'expired' : 'active',
    branchId: branchFor(i),
    createdAt: dateFromToday(-400 + i * 20)
  };
});

export const seedCustomers: Customer[] = [
...companyRows.map<Customer>((c, i) => ({
  id: `cus-${i + 1}`,
  code: `CUS-${1001 + i}`,
  type: 'corporate',
  nameAr: c.shortAr,
  nameEn: c.shortEn,
  contactPerson: c.owner,
  mobile: phone(i + 1),
  email: `pro@${c.emailDomain}`,
  nationality: 'AE',
  address: seedCompanies[i].address,
  status: i === 7 ? 'inactive' : 'active',
  assignedUserId: i % 2 === 0 ? 'u-pro1' : 'u-pro2',
  branchId: branchFor(i),
  createdAt: dateFromToday(-380 + i * 22),
  notes: [
  { id: `note-c${i}`, body: 'العميل يفضّل التواصل عبر واتساب خلال ساعات الدوام.', authorId: 'u-pro1', createdAt: dateFromToday(-30 + i), channel: 'whatsapp' }]

})),
...individuals.map<Customer>((p, j) => ({
  id: `cus-${11 + j}`,
  code: `CUS-${1011 + j}`,
  type: 'individual',
  nameAr: p.ar,
  nameEn: p.en,
  mobile: phone(20 + j),
  email: `${p.en.toLowerCase().replace(/[^a-z]+/g, '.')}@mail-demo.ae`,
  nationality: p.nat,
  emiratesIdNo: `784-19${80 + j}-${pad(1000000 + j * 98765, 7)}-${j % 9}`,
  address: j % 2 === 0 ? 'البرشاء، دبي' : 'النهدة، دبي',
  status: j === 9 ? 'prospect' : 'active',
  assignedUserId: j % 2 === 0 ? 'u-pro1' : 'u-pro2',
  branchId: j % 2 === 0 ? 'deira' : 'business-bay',
  createdAt: dateFromToday(-200 + j * 18),
  notes: []
}))];


const employeeRows: [string, string, string, 'male' | 'female', string, string][] = [
['راجيش كومار', 'Rajesh Kumar', 'IN', 'male', 'مهندس موقع', 'Site Engineer'],
['محمد عرفان', 'Muhammad Irfan', 'PK', 'male', 'مشرف عمال', 'Labour Supervisor'],
['جوزيف رييس', 'Joseph Reyes', 'PH', 'male', 'فني كهرباء', 'Electrician'],
['أحمد عبد الرحمن', 'Ahmed Abdelrahman', 'EG', 'male', 'طاهٍ رئيسي', 'Head Chef'],
['أنجلي شارما', 'Anjali Sharma', 'IN', 'female', 'مديرة مطعم', 'Restaurant Manager'],
['كريم منصور', 'Karim Mansour', 'JO', 'male', 'مضيف', 'Host'],
['سونيل ثابا', 'Sunil Thapa', 'NP', 'male', 'أمين مستودع', 'Storekeeper'],
['رحيم الدين', 'Rahim Uddin', 'BD', 'male', 'سائق', 'Driver'],
['ليا فرنانديز', 'Lea Fernandez', 'PH', 'female', 'محاسبة', 'Accountant'],
['عمر الخطيب', 'Omar Al Khatib', 'SY', 'male', 'مطور برمجيات', 'Software Developer'],
['بريا مينون', 'Priya Menon', 'IN', 'female', 'مصممة واجهات', 'UI Designer'],
['جاد سليمان', 'Jad Suleiman', 'LB', 'male', 'مدير منتج', 'Product Manager'],
['ميرا توماس', 'Meera Thomas', 'IN', 'female', 'أخصائية تجميل', 'Beautician'],
['روزا ديلا كروز', 'Rosa Dela Cruz', 'PH', 'female', 'موظفة استقبال', 'Receptionist'],
['نسرين حداد', 'Nisreen Haddad', 'LB', 'female', 'مديرة صالون', 'Salon Manager'],
['فيصل أختر', 'Faisal Akhtar', 'PK', 'male', 'منسق شحن', 'Shipping Coordinator'],
['مايكل أوكونكو', 'Michael Okonkwo', 'NG', 'male', 'مسؤول عمليات', 'Operations Officer'],
['سانجاي باتيل', 'Sanjay Patel', 'IN', 'male', 'محاسب', 'Accountant'],
['هالة يوسف', 'Hala Youssef', 'EG', 'female', 'طبيبة عامة', 'General Practitioner'],
['أرون جورج', 'Arun George', 'IN', 'male', 'ممرض', 'Nurse'],
['ماريا لوبيز', 'Maria Lopez', 'PH', 'female', 'فنية مختبر', 'Lab Technician'],
['حسن عبد الكريم', 'Hassan Abdelkarim', 'SD', 'male', 'فني صيانة', 'Maintenance Technician'],
['غوربريت سينغ', 'Gurpreet Singh', 'IN', 'male', 'مشرف صيانة', 'Maintenance Supervisor'],
['إيمان الصالح', 'Iman Al Saleh', 'JO', 'female', 'مستشارة إدارية', 'Management Consultant'],
['توماس مولر', 'Thomas Muller', 'DE', 'male', 'شريك استشاري', 'Consulting Partner'],
['ياسمين فاروق', 'Yasmin Farouk', 'EG', 'female', 'محللة أعمال', 'Business Analyst'],
['خليل إبراهيم', 'Khalil Ibrahim', 'SY', 'male', 'مرشد سياحي', 'Tour Guide'],
['آنا بتروفا', 'Anna Petrova', 'RU', 'female', 'مسؤولة حجوزات', 'Reservations Officer'],
['ديباك راي', 'Deepak Rai', 'NP', 'male', 'سائق حافلة', 'Bus Driver'],
['وليد عثمان', 'Walid Osman', 'SD', 'male', 'مدير مبيعات', 'Sales Manager']];


export interface ResidencePlan {
  /** Residence history used to derive each employee's current permit data. */
  status: 'completed' | 'active' | 'paused' | 'draft' | 'cancelled';
  progress: number;
  current: StageStatus;
  ago: number;
  integrated?: boolean;
  insideUae?: boolean;
}

/** Shared plan so employee records and residence cases stay consistent. */
export const RES_PLAN: ResidencePlan[] = [
{ status: 'completed', progress: 99, current: 'completed', ago: 140 },
{ status: 'active', progress: 3, current: 'in_progress', ago: 20 },
{ status: 'active', progress: 5, current: 'waiting_customer', ago: 30, insideUae: true },
{ status: 'active', progress: 1, current: 'waiting_payment', ago: 12 },
{ status: 'completed', progress: 99, current: 'completed', ago: 120 },
{ status: 'active', progress: 8, current: 'submitted', ago: 42, insideUae: true },
{ status: 'paused', progress: 4, current: 'waiting_customer', ago: 35 },
{ status: 'active', progress: 6, current: 'in_progress', ago: 28 },
{ status: 'active', progress: 2, current: 'rejected', ago: 18 },
{ status: 'completed', progress: 99, current: 'completed', ago: 100 },
{ status: 'active', progress: 0, current: 'in_progress', ago: 60 },
{ status: 'cancelled', progress: 3, current: 'cancelled', ago: 75 },
{ status: 'active', progress: 7, current: 'waiting_payment', ago: 38, insideUae: true },
{ status: 'active', progress: 3, current: 'in_progress', ago: 25, integrated: true },
{ status: 'completed', progress: 99, current: 'completed', ago: 90 },
{ status: 'draft', progress: 0, current: 'not_started', ago: 2 },
{ status: 'active', progress: 4, current: 'waiting_customer', ago: 22 },
{ status: 'active', progress: 2, current: 'submitted', ago: 16, integrated: true },
{ status: 'completed', progress: 99, current: 'completed', ago: 70 },
{ status: 'active', progress: 2, current: 'in_progress', ago: 10 }];


export const seedEmployees: Employee[] = employeeRows.map((r, i) => {
  const companyIdx = Math.min(Math.floor(i / 3), 9);
  const plan = RES_PLAN[i];
  const resident = !plan || plan.status === 'completed';
  // existing residents (sponsors) get varied residence expiries
  const resExpiryOffsets = [400, 18, 220, 55, 600, -5, 140, 30, 500, 80];
  const resExpiry = plan ? dateFromToday(730 - plan.ago) : dateFromToday(resExpiryOffsets[i - 20] ?? 300);
  const passportOffsets = [900, 120, 1500, 60, 2000, 700, 40, 1100, 1300, 300];
  const createdAgo = plan ? plan.ago + 2 : 300 + i * 5;
  return {
    id: `emp-${i + 1}`,
    code: `EMP-${3001 + i}`,
    nameAr: r[0],
    nameEn: r[1],
    nationality: r[2],
    gender: r[3],
    jobTitleAr: r[4],
    jobTitleEn: r[5],
    passportNo: `${r[2][0]}${pad(rng.int(1000000, 9999999), 7)}`,
    passportExpiry: dateFromToday(passportOffsets[i % 10] + i * 3),
    dateOfBirth: `19${rng.int(78, 99)}-${pad(rng.int(1, 12), 2)}-${pad(rng.int(1, 28), 2)}`,
    mobile: phone(40 + i),
    companyId: `cmp-${companyIdx + 1}`,
    customerId: `cus-${companyIdx + 1}`,
    visaType: i === 24 ? 'partner' : i === 11 ? 'investor' : 'employment',
    entryDate: resident ? dateFromToday(-(createdAgo - 10)) : undefined,
    workPermitNo: resident ? `WP-DEMO-${pad(500000 + i * 731, 6)}` : undefined,
    workPermitExpiry: resident ? resExpiry : undefined,
    emiratesIdNo: resident ? `784-19${rng.int(78, 99)}-${pad(rng.int(1000000, 9999999), 7)}-${i % 9}` : undefined,
    emiratesIdExpiry: resident ? resExpiry : undefined,
    residenceIssue: resident ? addDaysIso(resExpiry, -730) : undefined,
    residenceExpiry: resident ? resExpiry : undefined,
    caseOfficerId: PRO_IDS[i % 3],
    status: plan?.status === 'cancelled' ? 'cancelled' : resident ? 'active' : 'in_process',
    createdAt: dateFromToday(-createdAgo)
  };
});