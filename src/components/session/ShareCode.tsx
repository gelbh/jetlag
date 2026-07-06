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
      <div className="jl-stamp min-h-12 flex-1 justify-center text-center">
        <span className="jl-stamp-label">Code</span>
        <span className="jl-stamp-code text-lg">{code}</span>
      </div>
    );
  }

  return (
    <div className="jl-stamp w-full items-center py-3 text-center">
      <span className="jl-stamp-label">Session code</span>
      <span className="jl-stamp-code mt-0.5 text-3xl tracking-[0.35em]">
        {code}
      </span>
      <p className="mt-2 text-xs text-ink-dim">
        {remote
          ? "Share with others to sync live."
          : "Local-only session for solo play."}
      </p>
    </div>
  );
}
