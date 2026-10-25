const MIN_DURATION_SECONDS = 0;
const MAX_DURATION_SECONDS = 1800;

/** Keeps a duration inside 0..1800. NaN and infinities are rejected. */
export function acceptDurationSeconds(value: number): number | null {
  if (!Number.isFinite(value)) return null;
  if (value < MIN_DURATION_SECONDS || value > MAX_DURATION_SECONDS) return null;
  return value;
}
