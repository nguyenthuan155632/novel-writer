import pino from 'pino';

export const rootLogger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  base: { service: 'novel-writer' },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export type Logger = typeof rootLogger;

export function child(bindings: Record<string, unknown>): Logger {
  return rootLogger.child(bindings);
}