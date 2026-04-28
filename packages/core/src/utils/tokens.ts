export function estimateTokens(input: string): number {
  if (!input) return 0;
  const charCount = input.length;
  return Math.ceil(charCount / 3.2);
}

export function estimateTokensJson(input: unknown): number {
  return estimateTokens(JSON.stringify(input));
}