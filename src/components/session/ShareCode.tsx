interface ShareCodeProps {
  code: string;
  remote?: boolean;
  compact?: boolean;
}

export function ShareCode({
  code,
  remote = false,
  compact = false,
}: ShareCodeProps) {
  if (compact) {
    return (
      <div className="min-h-12 flex-1 rounded-xl border border-border bg-surface-base/90 px-3 py-2 text-center">
        <p className="text-[10px] uppercase tracking-[0.18em] text-ink-dim">
          Code
        </p>
        <p className="text-lg font-bold tracking-[0.28em] text-status-info">
          {code}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-surface-base/90 px-4 py-3 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-ink-dim">
        Session code
      </p>
      <p className="mt-1 text-3xl font-bold tracking-[0.35em] text-status-info">
        {code}
      </p>
      <p className="mt-2 text-xs text-ink-dim">
        {remote
          ? "Share with others to sync live."
          : "Local-only session for solo play."}
      </p>
    </div>
  );
}
