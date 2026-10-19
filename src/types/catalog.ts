export type ServiceCategory = 'residence' | 'family' | 'visit' | 'insurance' | 'formation' | 'pro' | 'other';
export type VatTreatment = 'standard' | 'zero' | 'exempt' | 'out_of_scope';

/** Whether a link (company / beneficiary) is needed when registering the service. */
export type LinkRequirement = 'required' | 'optional' | 'none';

export interface ServiceCatalogItem {
  id: string;
  code: string;
  category: ServiceCategory;
  authority: string;
  nameAr: string;
  /** Optional English name. */
  nameEn: string;
  descriptionAr: string;
  /** Default demo amounts — snapshotted onto a transaction when it is registered. */
  governmentFee: number;
  providerCost: number;
  otherCosts: number;
  serviceFee: number;
  vatTreatment: VatTreatment;
  requiresCompany: LinkRequirement;
  requiresBeneficiary: LinkRequirement;
  /** Multi-step workflow template; when absent the service is a single-step transaction. */
  templateId?: string;
  requiredDocuments: string[];
  slaDays: number;
  effectiveFrom: string;
  active: boolean;
  isDemoPrice: boolean;
  notes: string;
}

export interface PriceChangeField {
  field: keyof ServiceCatalogItem;
  from: string | number | boolean;
  to: string | number | boolean;
}

export interface PriceChange {
  id: string;
  serviceId: string;
  serviceName: string;
  changedAt: string;
  userId: string;
  changes: PriceChangeField[];
}
