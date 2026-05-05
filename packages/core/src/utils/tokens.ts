let encoderRef: { encode: (s: string) => unknown[] } | null | undefined = undefined;

function getEncoder(): { encode: (s: string) => unknown[] } | null {
  if (encoderRef !== undefined) return encoderRef;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    encoderRef = require('gpt-tokenizer') as { encode: (s: string) => unknown[] };
    return encoderRef;
  } catch {
    encoderRef = null;
    return null;
  }
}

export function estimateTokens(text: string): number {
  if (!text) return 0;
  const enc = getEncoder();
  if (enc) return enc.encode(text).length;
  return Math.ceil(text.length / 3.2);
}

export function estimateTokensJson(input: unknown): number {
  return estimateTokens(JSON.stringify(input));
}
