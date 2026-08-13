const MULTIPLIERS = [0, 1, 6, 24];

export function backoffMs(attempt: number, baseDelayMs: number): number {
  const index = Math.min(Math.max(attempt - 1, 0), MULTIPLIERS.length - 1);
  const delay = (MULTIPLIERS[index] ?? 0) * baseDelayMs;
  const jitter = delay === 0 ? 0 : delay * 0.2 * (Math.random() * 2 - 1);
  return Math.max(0, Math.round(delay + jitter));
}

export async function sleep(ms: number): Promise<void> {
  if (ms <= 0) {
    return;
  }
  await new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}
