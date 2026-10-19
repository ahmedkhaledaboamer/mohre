import type { ApiContract } from './contracts';
import { USE_MOCK_API } from './apiClient';
import { mockApi } from './mockApi';
import { restApi } from './restApi';

/** Single entry point used by query hooks. Swap adapters without touching pages. */
export const api: ApiContract = USE_MOCK_API ? mockApi : restApi;