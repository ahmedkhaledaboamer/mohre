import { describe, expect, it } from 'vitest';
import { normalize } from './GlobalSearch';

describe('search normalization', () => {
  it('treats Arabic letter variants and digits the same', () => {
    expect(normalize('أحمد')).toBe(normalize('احمد'));
    expect(normalize('إقامة')).toBe(normalize('اقامه'));
    expect(normalize('مصطفى')).toBe(normalize('مصطفي'));
    expect(normalize('٠٥٠١٢٣')).toBe('050123');
    expect(normalize('TRX-2026')).toBe('trx-2026');
  });
});
