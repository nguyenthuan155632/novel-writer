---
type: module
source: packages/core/src/logger.ts
---

# Module: Logger

**Type:** Module  
**Source:** `packages/core/src/logger.ts`

## Responsibility
Pino-based structured JSON logger factory — provides a root logger and helpers to create named child loggers for every service, agent, and job in the monorepo.

## Key exports / functions
- `rootLogger` — the singleton Pino logger instance
- `createLogger(name: string): Logger` — creates a child logger with `{ component: name }` binding
- `child(bindings: Record<string, unknown>): Logger` — creates a child logger with arbitrary bindings
- `Logger` — type alias for the Pino logger instance type

## Configuration
- Log level from `LOG_LEVEL` environment variable (default: `'info'`)
- Base fields: `{ service: 'novel-writer' }`
- Timestamps: ISO 8601 format (`pino.stdTimeFunctions.isoTime`)

## Usage pattern
```ts
import { createLogger } from '@novel/core/logger';
const log = createLogger('WriterAgent');
log.info({ chapterId }, 'Writing chapter');
```

## Depends on
- `pino` — structured logging library

## Used by
- [[apps/app-api]] — HTTP request logging
- [[apps/app-worker]] — job execution logging
- All agents and jobs for structured output

## Related flows
- (cross-cutting — used everywhere)
