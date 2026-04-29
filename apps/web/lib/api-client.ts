const BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4000';

export async function apiFetch<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const hasBody = init?.body !== undefined && init.body !== null;
  const r = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`API ${r.status}: ${text}`);
  }
  return r.json() as Promise<T>;
}