export interface Authority {
  id: string;
  nameAr: string;
  nameEn: string;
  kind: 'labour' | 'immigration' | 'identity' | 'licensing' | 'medical' | 'insurer' | 'typing' | 'freezone';
}

export const authorities: Authority[] = [
{ id: 'mohre', nameAr: 'وزارة الموارد البشرية والتوطين', nameEn: 'MOHRE', kind: 'labour' },
{ id: 'gdrfa', nameAr: 'الإقامة وشؤون الأجانب - دبي', nameEn: 'GDRFA Dubai', kind: 'immigration' },
{ id: 'icp', nameAr: 'الهيئة الاتحادية للهوية والجنسية', nameEn: 'ICP', kind: 'identity' },
{ id: 'det', nameAr: 'دائرة الاقتصاد والسياحة - دبي', nameEn: 'Dubai DET', kind: 'licensing' },
{ id: 'dmcc', nameAr: 'مركز دبي للسلع المتعددة', nameEn: 'DMCC', kind: 'freezone' },
{ id: 'dso', nameAr: 'واحة دبي للسيليكون', nameEn: 'Dubai Silicon Oasis', kind: 'freezone' },
{ id: 'medical', nameAr: 'مراكز الفحص الطبي المعتمدة', nameEn: 'Approved medical centers', kind: 'medical' },
{ id: 'insurer', nameAr: 'شركات التأمين', nameEn: 'Insurance providers', kind: 'insurer' },
{ id: 'typing', nameAr: 'مراكز الخدمة والطباعة', nameEn: 'Service & typing centers', kind: 'typing' }];


export const licensingAuthorities = authorities.filter((a) => a.kind === 'licensing' || a.kind === 'freezone');