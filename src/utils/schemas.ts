import { z } from 'zod';

/** Shared zod primitives. Messages are codes translated by useFormError. */
export const req = () => z.string().trim().min(1, 'required');
export const optStr = () => z.string().trim().optional().or(z.literal(''));
export const email = () => z.string().trim().min(1, 'required').email('email');
export const phone = () => z.string().trim().min(1, 'required').regex(/^[+\d\s-]{8,20}$/, 'phone');
export const money = () => z.coerce.number({ invalid_type_error: 'required' }).min(0, 'nonNegative');
export const positive = () => z.coerce.number({ invalid_type_error: 'required' }).gt(0, 'positive');