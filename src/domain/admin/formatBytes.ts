const UNITS = ["B", "kB", "MB", "GB"] as const;

/** Decimal byte units for admin fields, e.g. 412_000 becomes "412 kB". */
export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return "–";
  let value = bytes;
  let unit = 0;
  while (value >= 1000 && unit < UNITS.length - 1) {
    value /= 1000;
    unit += 1;
  }
  const text = unit === 0 || value >= 100 ? String(Math.round(value)) : value.toFixed(1);
  return `${text.replace(/\.0$/, "")} ${UNITS[unit]}`;
}
