# Global Provider Switcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a global UI switcher that changes live LLM calls between OpenCode and OpenRouter for the running API process.

**Architecture:** The API owns process-level provider state in a focused helper module. Admin routes expose the current provider and update it. The Next.js header renders a small client switcher that calls the admin API, while `buildLoggedProvider` uses the selected provider unless mock mode is active.

**Tech Stack:** Fastify, Zod, Vitest, Next.js App Router, React client component, existing `@novel/ai` providers.

---

## File Structure

- Create `apps/api/src/lib/provider-switcher.ts`: active provider state, option metadata, env default parsing, and live provider construction.
- Modify `apps/api/src/lib/llm-provider.ts`: delegate live provider selection to `provider-switcher.ts`, preserve mock bypass and logging.
- Modify `apps/api/src/routes/admin.ts`: add `GET /api/admin/provider` and `PUT /api/admin/provider`.
- Create `apps/api/test/lib/provider-switcher.test.ts`: unit tests for defaults, switching, provider construction, and mock bypass through `buildLoggedProvider`.
- Modify `apps/api/test/routes/admin.test.ts`: route tests for reading/updating provider state, or create it if absent.
- Create `apps/web/lib/api/provider.ts`: typed client calls for provider admin API.
- Create `apps/web/app/provider-switcher.tsx`: header client component.
- Modify `apps/web/app/layout.tsx`: render the switcher in the header.
- Modify `.env.local.example`: document `NOVEL_LLM_PROVIDER` and OpenRouter env vars.
- Modify `README.md`: document provider switching.

## Task 1: API Provider State Helper

**Files:**

- Create: `apps/api/src/lib/provider-switcher.ts`
- Test: `apps/api/test/lib/provider-switcher.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/api/test/lib/provider-switcher.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildLiveProvider,
  getActiveProvider,
  getProviderStatus,
  resetActiveProviderForTests,
  setActiveProvider,
} from "../../src/lib/provider-switcher.ts";

const OLD_ENV = process.env;

afterEach(() => {
  process.env = { ...OLD_ENV };
  resetActiveProviderForTests();
  vi.restoreAllMocks();
});

describe("provider switcher", () => {
  it("defaults to opencode when NOVEL_LLM_PROVIDER is unset", () => {
    delete process.env.NOVEL_LLM_PROVIDER;

    expect(getActiveProvider()).toBe("opencode");
    expect(getProviderStatus().provider).toBe("opencode");
  });

  it("uses openrouter as the startup default when configured", () => {
    process.env.NOVEL_LLM_PROVIDER = "openrouter";
    resetActiveProviderForTests();

    expect(getActiveProvider()).toBe("openrouter");
  });

  it("updates the active provider", () => {
    setActiveProvider("openrouter");

    expect(getActiveProvider()).toBe("openrouter");
    expect(getProviderStatus().options.map((o) => o.id)).toEqual([
      "opencode",
      "openrouter",
    ]);
  });

  it("builds an opencode live provider when selected", () => {
    setActiveProvider("opencode");
    process.env.OPENCODE_API_KEY = "opencode-key";

    const provider = buildLiveProvider();

    expect(provider.name).toBe("opencode");
  });

  it("builds an openrouter live provider when selected", () => {
    setActiveProvider("openrouter");
    process.env.OPENROUTER_API_KEY = "openrouter-key";

    const provider = buildLiveProvider();

    expect(provider.name).toBe("openrouter");
  });

  it("requires the selected provider api key", () => {
    setActiveProvider("openrouter");
    delete process.env.OPENROUTER_API_KEY;

    expect(() => buildLiveProvider()).toThrow(/OPENROUTER_API_KEY is required/);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
pnpm --filter @novel/api vitest run test/lib/provider-switcher.test.ts
```

Expected: FAIL because `apps/api/src/lib/provider-switcher.ts` does not exist.

- [ ] **Step 3: Implement the minimal helper**

Create `apps/api/src/lib/provider-switcher.ts`:

```ts
import { OpenCodeProvider } from "@novel/ai/providers/opencode";
import { OpenRouterProvider } from "@novel/ai/providers/openrouter";
import type { LLMProvider } from "@novel/ai/providers/types";

export type LlmProviderId = "opencode" | "openrouter";

export interface ProviderOption {
  id: LlmProviderId;
  label: string;
}

export interface ProviderStatus {
  provider: LlmProviderId;
  options: ProviderOption[];
}

export const PROVIDER_OPTIONS: ProviderOption[] = [
  { id: "opencode", label: "OpenCode" },
  { id: "openrouter", label: "OpenRouter" },
];

let activeProvider: LlmProviderId = readProviderFromEnv();

export function getActiveProvider(): LlmProviderId {
  return activeProvider;
}

export function setActiveProvider(provider: LlmProviderId): ProviderStatus {
  activeProvider = provider;
  return getProviderStatus();
}

export function getProviderStatus(): ProviderStatus {
  return {
    provider: activeProvider,
    options: PROVIDER_OPTIONS,
  };
}

export function buildLiveProvider(): LLMProvider {
  if (activeProvider === "openrouter") {
    return new OpenRouterProvider({
      apiKey: requireEnv("OPENROUTER_API_KEY"),
      baseUrl: process.env.OPENROUTER_BASE_URL,
      httpReferer: process.env.OPENROUTER_HTTP_REFERER,
      xTitle: process.env.OPENROUTER_X_TITLE,
    });
  }

  return new OpenCodeProvider({
    apiKey: requireEnv("OPENCODE_API_KEY"),
    baseUrl: process.env.OPENCODE_BASE_URL,
  });
}

export function resetActiveProviderForTests(): void {
  activeProvider = readProviderFromEnv();
}

function readProviderFromEnv(): LlmProviderId {
  return parseProvider(process.env.NOVEL_LLM_PROVIDER);
}

function parseProvider(value: string | undefined): LlmProviderId {
  if (value === "openrouter") return "openrouter";
  return "opencode";
}

function requireEnv(k: string): string {
  const v = process.env[k];
  if (!v) throw new Error(`${k} is required`);
  return v;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
pnpm --filter @novel/api vitest run test/lib/provider-switcher.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/lib/provider-switcher.ts apps/api/test/lib/provider-switcher.test.ts
git commit -m "feat: add api provider switcher state"
```

## Task 2: Wire Provider Builder and Preserve Mock Bypass

**Files:**

- Modify: `apps/api/src/lib/llm-provider.ts`
- Test: `apps/api/test/lib/provider-switcher.test.ts`

- [ ] **Step 1: Add failing tests for `buildLoggedProvider`**

Append to `apps/api/test/lib/provider-switcher.test.ts`:

```ts
import { buildLoggedProvider } from "../../src/lib/llm-provider.ts";

describe("buildLoggedProvider", () => {
  it("uses the selected live provider under the logger wrapper", () => {
    setActiveProvider("openrouter");
    process.env.OPENROUTER_API_KEY = "openrouter-key";

    const provider = buildLoggedProvider();

    expect(provider.name).toBe("logged");
  });

  it("uses mock provider when a mock response is supplied", async () => {
    setActiveProvider("openrouter");
    delete process.env.OPENROUTER_API_KEY;

    const provider = buildLoggedProvider({ mockResponse: '{"ok":true}' });
    const response = await provider.complete({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user", content: "ping" }],
    });

    expect(response.content).toBe('{"ok":true}');
  });
});
```

- [ ] **Step 2: Run tests to verify expected failure**

Run:

```bash
pnpm --filter @novel/api vitest run test/lib/provider-switcher.test.ts
```

Expected: FAIL because `buildLoggedProvider` still always constructs `OpenCodeProvider`, so selected OpenRouter without an OpenCode key fails.

- [ ] **Step 3: Update provider builder**

Modify `apps/api/src/lib/llm-provider.ts` to:

```ts
import { MockProvider } from "@novel/ai/providers/mock";
import {
  LoggedLLMProvider,
  makeDrizzleRecorder,
} from "@novel/ai/llm-call-logger";
import type { LLMProvider } from "@novel/ai/providers/types";
import { getDb } from "@novel/db";
import { buildLiveProvider } from "./provider-switcher.ts";

export function buildLoggedProvider(opts?: {
  mockResponse?: string;
}): LLMProvider {
  const forceMock = process.env.NOVEL_FORCE_MOCK_LLM === "1";
  const mockResponse =
    opts?.mockResponse ?? process.env.NOVEL_MOCK_LLM_RESPONSE;
  const inner: LLMProvider =
    forceMock || opts?.mockResponse
      ? new MockProvider({
          responder: { kind: "fixed", content: mockResponse ?? "{}" },
        })
      : buildLiveProvider();
  const recorder = makeDrizzleRecorder(getDb());
  return new LoggedLLMProvider({ inner, recordCall: recorder });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
pnpm --filter @novel/api vitest run test/lib/provider-switcher.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/lib/llm-provider.ts apps/api/test/lib/provider-switcher.test.ts
git commit -m "feat: route logged provider through switcher"
```

## Task 3: Admin Provider Routes

**Files:**

- Modify: `apps/api/src/routes/admin.ts`
- Test: `apps/api/test/routes/admin.test.ts`

- [ ] **Step 1: Inspect or create admin route test file**

If `apps/api/test/routes/admin.test.ts` does not exist, create it with tests below. If it exists, append the provider route tests.

Use this content for the provider route tests:

```ts
import { afterEach, describe, expect, it } from "vitest";
import { buildServer } from "../../../src/server.ts";
import {
  resetActiveProviderForTests,
  setActiveProvider,
} from "../../../src/lib/provider-switcher.ts";

afterEach(() => {
  resetActiveProviderForTests();
});

describe("admin provider routes", () => {
  it("returns the active provider and options", async () => {
    setActiveProvider("opencode");
    const app = buildServer();

    const res = await app.inject({ method: "GET", url: "/api/admin/provider" });
    await app.close();

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      provider: "opencode",
      options: [
        { id: "opencode", label: "OpenCode" },
        { id: "openrouter", label: "OpenRouter" },
      ],
    });
  });

  it("updates the active provider", async () => {
    const app = buildServer();

    const res = await app.inject({
      method: "PUT",
      url: "/api/admin/provider",
      payload: { provider: "openrouter" },
    });
    await app.close();

    expect(res.statusCode).toBe(200);
    expect(res.json().provider).toBe("openrouter");
  });

  it("rejects unsupported providers", async () => {
    const app = buildServer();

    const res = await app.inject({
      method: "PUT",
      url: "/api/admin/provider",
      payload: { provider: "bad-provider" },
    });
    await app.close();

    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
pnpm --filter @novel/api vitest run test/routes/admin.test.ts
```

Expected: FAIL because `/api/admin/provider` does not exist.

- [ ] **Step 3: Implement routes**

Add imports to `apps/api/src/routes/admin.ts`:

```ts
import { z } from "zod";
import {
  getProviderStatus,
  setActiveProvider,
} from "../lib/provider-switcher.ts";
```

Add route handlers inside the admin plugin:

```ts
const ProviderBodySchema = z.object({
  provider: z.enum(["opencode", "openrouter"]),
});

app.get("/api/admin/provider", async () => getProviderStatus());

app.put("/api/admin/provider", async (req) => {
  const body = ProviderBodySchema.parse(req.body);
  return setActiveProvider(body.provider);
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
pnpm --filter @novel/api vitest run test/routes/admin.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/routes/admin.ts apps/api/test/routes/admin.test.ts
git commit -m "feat: add admin provider routes"
```

## Task 4: Web Provider Switcher UI

**Files:**

- Create: `apps/web/lib/api/provider.ts`
- Create: `apps/web/app/provider-switcher.tsx`
- Modify: `apps/web/app/layout.tsx`

- [ ] **Step 1: Create typed API client**

Create `apps/web/lib/api/provider.ts`:

```ts
import { apiFetch } from "../api-client";

export type LlmProviderId = "opencode" | "openrouter";

export interface ProviderOption {
  id: LlmProviderId;
  label: string;
}

export interface ProviderStatus {
  provider: LlmProviderId;
  options: ProviderOption[];
}

export function getProviderStatus(): Promise<ProviderStatus> {
  return apiFetch<ProviderStatus>("/api/admin/provider");
}

export function updateProvider(
  provider: LlmProviderId,
): Promise<ProviderStatus> {
  return apiFetch<ProviderStatus>("/api/admin/provider", {
    method: "PUT",
    body: JSON.stringify({ provider }),
  });
}
```

- [ ] **Step 2: Create client switcher component**

Create `apps/web/app/provider-switcher.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import {
  getProviderStatus,
  updateProvider,
  type LlmProviderId,
  type ProviderOption,
} from "@/lib/api/provider";

export default function ProviderSwitcher() {
  const [provider, setProvider] = useState<LlmProviderId | null>(null);
  const [options, setOptions] = useState<ProviderOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getProviderStatus()
      .then((status) => {
        if (cancelled) return;
        setProvider(status.provider);
        setOptions(status.options);
      })
      .catch((e) => {
        if (cancelled) return;
        setError((e as Error).message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onChange(next: LlmProviderId) {
    const previous = provider;
    setProvider(next);
    setSaving(true);
    setError(null);
    try {
      const status = await updateProvider(next);
      setProvider(status.provider);
      setOptions(status.options);
    } catch (e) {
      setProvider(previous);
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="provider-switcher" aria-label="LLM provider">
      <select
        aria-label="LLM provider"
        value={provider ?? ""}
        disabled={!provider || saving}
        onChange={(e) => onChange(e.target.value as LlmProviderId)}
      >
        {!provider && <option value="">Provider...</option>}
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <span className="provider-switcher-error">{error}</span>}
    </div>
  );
}
```

- [ ] **Step 3: Render switcher in header**

Modify `apps/web/app/layout.tsx`:

```tsx
import "./globals.css";
import type { ReactNode } from "react";
import ProviderSwitcher from "./provider-switcher";

export const metadata = {
  title: "Novel Writer",
  description: "AI Novel Factory",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0 }}>
        <header
          style={{
            padding: 16,
            borderBottom: "1px solid #ddd",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <a
            href="/"
            style={{
              textDecoration: "none",
              color: "inherit",
              fontWeight: 600,
            }}
          >
            Novel Writer
          </a>
          <ProviderSwitcher />
        </header>
        <main style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Add CSS**

Append to `apps/web/app/globals.css`:

```css
.provider-switcher {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 160px;
}

.provider-switcher select {
  min-width: 136px;
  border: 1px solid #c7c7c7;
  border-radius: 6px;
  background: #fff;
  color: #111;
  font: inherit;
  padding: 6px 8px;
}

.provider-switcher-error {
  color: #b00020;
  font-size: 12px;
  max-width: 280px;
}
```

- [ ] **Step 5: Run web typecheck**

Run:

```bash
pnpm --filter @novel/web typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/api/provider.ts apps/web/app/provider-switcher.tsx apps/web/app/layout.tsx apps/web/app/globals.css
git commit -m "feat: add provider switcher ui"
```

## Task 5: Documentation and Final Verification

**Files:**

- Modify: `.env.local.example`
- Modify: `README.md`

- [ ] **Step 1: Update env documentation**

Add to `.env.local.example` near provider credentials:

```dotenv
# LLM provider switcher. Defaults to opencode.
NOVEL_LLM_PROVIDER=opencode

# OpenCode
OPENCODE_API_KEY=
OPENCODE_BASE_URL=

# OpenRouter
OPENROUTER_API_KEY=
OPENROUTER_BASE_URL=
OPENROUTER_HTTP_REFERER=
OPENROUTER_X_TITLE=Novel Writer
```

- [ ] **Step 2: Update README**

Add a short provider section to `README.md`:

```md
### Provider switcher

The app can switch live LLM calls globally between OpenCode and OpenRouter from the header UI.

- Startup default: `NOVEL_LLM_PROVIDER=opencode|openrouter`
- OpenCode requires `OPENCODE_API_KEY`
- OpenRouter requires `OPENROUTER_API_KEY`

The switch is process-local. Restarting the API returns to the env default.
Mock mode (`NOVEL_FORCE_MOCK_LLM=1`) still bypasses live providers.
```

- [ ] **Step 3: Run API tests**

Run:

```bash
pnpm --filter @novel/api test
```

Expected: PASS.

- [ ] **Step 4: Run web typecheck**

Run:

```bash
pnpm --filter @novel/web typecheck
```

Expected: PASS.

- [ ] **Step 5: Run full typecheck**

Run:

```bash
pnpm -r typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit docs**

```bash
git add .env.local.example README.md
git commit -m "docs: document provider switcher"
```

- [ ] **Step 7: Final status**

Run:

```bash
git status --short
```

Expected: only unrelated pre-existing changes remain, or clean if no unrelated changes exist.
