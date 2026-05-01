/**
 * In the browser: use a relative URL so requests go to the same origin as
 * the Next.js app (which proxies them server-side to localhost:4000).
 * On the server (SSR / RSC): call localhost:4000 directly.
 */
const BASE =
  typeof window === "undefined"
    ? (process.env.API_BASE_INTERNAL ??
      process.env.NEXT_PUBLIC_API_BASE ??
      "http://localhost:4000")
    : (process.env.NEXT_PUBLIC_API_BASE ?? "");

export async function apiFetch<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const hasBody = init?.body !== undefined && init.body !== null;
  const r = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`API ${r.status}: ${text}`);
  }
  return r.json() as Promise<T>;
}
