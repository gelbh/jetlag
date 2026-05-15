import type { SyncStatus } from "../../domain/sync";

interface SyncStatusBannerProps {
  status: SyncStatus;
  queuedWrites: number;
  message?: string | null;
}

export function SyncStatusBanner({
  status,
  queuedWrites,
  message,
}: SyncStatusBannerProps) {
  if (status === "synced" && !message) {
    return null;
  }

  const tone =
    status === "error"
      ? "border-rose-400/40 bg-rose-500/15 text-rose-100"
      : status === "offline"
        ? "border-amber-400/40 bg-amber-500/15 text-amber-100"
        : status === "saving"
          ? "border-sky-400/40 bg-sky-500/15 text-sky-100"
          : "border-slate-600 bg-slate-900/90 text-slate-200";

  const label =
    message ??
    (status === "error"
      ? "Sync failed. Changes may be queued."
      : status === "offline"
        ? queuedWrites > 0
          ? `Offline. ${queuedWrites} change${queuedWrites === 1 ? "" : "s"} queued.`
          : "Offline. Changes will queue until you reconnect."
        : status === "saving"
          ? "Saving changes…"
          : null);

  if (!label) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 top-[calc(env(safe-area-inset-top)+3.5rem)] z-[1001] px-3">
      <div
        className={`mx-auto max-w-xl rounded-2xl border px-3 py-2 text-center text-sm font-medium backdrop-blur ${tone}`}
      >
        {label}
      </div>
    </div>
  );
}
