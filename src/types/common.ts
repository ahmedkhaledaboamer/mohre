export type BranchId = 'deira' | 'business-bay';
export type Lang = 'ar' | 'en';

export interface Bilingual {
  ar: string;
  en: string;
}

export type NoteChannel = 'note' | 'call' | 'email' | 'whatsapp' | 'meeting';

export interface Note {
  id: string;
  body: string;
  authorId: string;
  createdAt: string;
  channel: NoteChannel;
}