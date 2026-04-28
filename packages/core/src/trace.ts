import { randomUUID } from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';

export interface TraceContext {
  traceId: string;
}

const storage = new AsyncLocalStorage<TraceContext>();

export function newTraceId(): string {
  return randomUUID();
}

export function withTrace<T>(ctx: TraceContext, fn: () => T): T {
  return storage.run(ctx, fn);
}

export function getTraceId(): string | undefined {
  return storage.getStore()?.traceId;
}