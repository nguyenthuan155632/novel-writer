/**
 * Catch-all API proxy
 *
 * Every request to /api/* from the browser is forwarded server-side to the
 * backend at API_BASE_INTERNAL (default: http://localhost:4000).
 * This means the browser only needs to reach the Next.js origin (e.g. via
 * Cloudflare Tunnel) — it never tries to connect to localhost:4000 directly.
 */
import { type NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.API_BASE_INTERNAL ?? 'http://localhost:4000';

async function proxy(req: NextRequest): Promise<NextResponse> {
  // Reconstruct the full path including query string.
  const { pathname, search } = req.nextUrl;
  const targetUrl = `${BACKEND}${pathname}${search}`;

  // Forward body for methods that carry one.
  const hasBody = !['GET', 'HEAD'].includes(req.method);

  // Strip hop-by-hop / Next.js-internal headers the backend shouldn't see.
  const skipHeaders = new Set(['host', 'connection', 'keep-alive', 'transfer-encoding']);
  const forwardHeaders = new Headers();
  req.headers.forEach((value, key) => {
    if (!skipHeaders.has(key.toLowerCase())) {
      forwardHeaders.set(key, value);
    }
  });

  const upstream = await fetch(targetUrl, {
    method: req.method,
    headers: forwardHeaders,
    body: hasBody ? req.body : undefined,
    // Required for streaming request bodies in Node.js runtime
    // @ts-expect-error -- duplex is valid in undici / Node 18+
    duplex: hasBody ? 'half' : undefined,
    cache: 'no-store',
  });

  // Stream the response back to the browser.
  const responseHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    // Omit headers that Next.js manages itself.
    if (!['transfer-encoding', 'connection'].includes(key.toLowerCase())) {
      responseHeaders.set(key, value);
    }
  });

  return new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const HEAD = proxy;
export const OPTIONS = proxy;
