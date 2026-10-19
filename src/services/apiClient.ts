/**
 * Centralized HTTP client for the future backend.
 * Set VITE_API_BASE_URL to switch from the in-browser mock adapter to REST.
 */
const env = (import.meta as unknown as {env?: Record<string, string | undefined>;}).env ?? {};

export const API_BASE_URL = env.VITE_API_BASE_URL ?? '';
export const USE_MOCK_API = !API_BASE_URL;

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('wifaq-token');
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers
    }
  });
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as {message?: string;};
      message = body.message ?? message;
    } catch {

      // ignore
    }throw new ApiError(message, res.status);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}