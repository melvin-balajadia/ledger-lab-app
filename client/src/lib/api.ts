import { supabase } from './supabaseClient';

// Falls back to '' (same-origin, relative /api/... requests) when unset --
// correct for Vercel, where vercel.json serves the client and API from one
// domain. Local dev overrides this via client/.env's VITE_API_URL, since dev
// runs Vite and Express as two separate processes on different ports.
export const API_BASE = import.meta.env.VITE_API_URL || '';

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers: { ...headers, ...init?.headers } });
  if (!res.ok) {
    throw new Error(`${path} failed: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

async function sendJson<T>(method: 'POST' | 'PATCH', path: string, body: unknown): Promise<T> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) {
    const message = Array.isArray(json.error) ? json.error.join('; ') : (json.error ?? res.statusText);
    throw new Error(message);
  }
  return json as T;
}

export function postJson<T>(path: string, body: unknown): Promise<T> {
  return sendJson<T>('POST', path, body);
}

export function patchJson<T>(path: string, body: unknown): Promise<T> {
  return sendJson<T>('PATCH', path, body);
}

export async function deleteRequest(path: string, body?: { reason?: string }): Promise<void> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    ...(body ? { headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : { headers }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error ?? res.statusText);
  }
}

export async function postFormData<T>(path: string, formData: FormData): Promise<T> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}${path}`, { method: 'POST', headers, body: formData });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? res.statusText);
  return json as T;
}

// Client and server run on different origins, so the session cookie
// (SameSite=Lax) is never attached to a plain cross-origin <img src>. Fetch
// the bytes with credentials instead and hand the browser an object URL.
export async function fetchImageUrl(path: string): Promise<string> {
  const res = await fetch(`${API_BASE}${path}`, { credentials: 'include' });
  if (!res.ok) throw new Error(`${path} failed: ${res.status} ${res.statusText}`);
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}
