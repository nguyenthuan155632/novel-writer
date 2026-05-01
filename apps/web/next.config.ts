import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@novel/core"],
  experimental: { typedRoutes: true },
  // NOTE: Do NOT set a fallback for NEXT_PUBLIC_API_BASE here.
  // When undefined the browser will use relative URLs ("/api/...") which are
  // proxied server-side by app/api/[...path]/route.ts → localhost:4000.
  // Setting it to "http://localhost:4000" would make the browser try to
  // reach the server's localhost directly — which fails over Cloudflare Tunnel.
};

export default config;
