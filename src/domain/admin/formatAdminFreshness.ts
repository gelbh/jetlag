export function formatFreshnessAge(
  iso: string | null | undefined,
  nowMs = Date.now(),
): string {
  if (!iso) {
    return "never";
  }

  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) {
    return "unknown";
  }

  const deltaMs = Math.max(0, nowMs - ms);
  if (deltaMs < 60_000) {
    return "just now";
  }

  const minutes = Math.floor(deltaMs / 60_000);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  return `${Math.floor(hours / 24)}d ago`;
}
