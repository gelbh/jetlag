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
      <div className="min-h-12 flex-1 rounded-xl border border-slate-700 bg-slate-900/90 px-3 py-2 text-center backdrop-blur">
        <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
          Code
        </p>
        <p className="text-lg font-bold tracking-[0.28em] text-sky-300">
          {code}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-center backdrop-blur">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
        Session code
      </p>
      <p className="mt-1 text-3xl font-bold tracking-[0.35em] text-sky-300">
        {code}
      </p>
      <p className="mt-2 text-xs text-slate-400">
        {remote
          ? "Share with others to sync live."
          : "Local-only session for solo play."}
      </p>
    </div>
  );
}
