import type { SessionRecord } from "../../domain/map/annotations";
import { APP_VERSION } from "../../domain/device/changelog";
import { playerRoleLabel } from "../../domain/session/playerRole";
import type { PlayerRole } from "../../domain/session/playerRole";
import type { UseMapOverlayStateResult } from "../../hooks/map/useMapOverlayState";
import type { useSessionTimer } from "../../hooks/session/useSessionTimer";
import { ObserverMapScreenChrome } from "../observer-map-screen/ObserverMapScreenChrome";
import type { ObserverPerspective } from "../../domain/session/observerPerspective";

interface AdminMapScreenChromeProps {
  session: SessionRecord;
  myRole: PlayerRole;
  timer: ReturnType<typeof useSessionTimer>;
  overlay: UseMapOverlayStateResult;
  perspective: ObserverPerspective;
  onPerspectiveChange: (perspective: ObserverPerspective) => void;
  onLeave: () => void;
  diagnosticsOpen: boolean;
  onToggleDiagnostics: () => void;
  moderationBusy: boolean;
  moderationError: string | null;
  onModerationAction: (action: "end" | "resetBoard" | "cleanupCode") => void;
}

function formatTimestamp(value: string | undefined): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

export function AdminDiagnosticsPanel({
  open,
  onClose,
  session,
  syncStatusLabel,
}: {
  open: boolean;
  onClose: () => void;
  session: SessionRecord;
  syncStatusLabel: string;
}) {
  if (!open) {
    return null;
  }

  const rows: Array<{ label: string; value: string }> = [
    { label: "Session ID", value: session.id },
    { label: "Code", value: session.code ?? "—" },
    { label: "Host app version", value: session.hostAppVersion ?? "—" },
    { label: "Game size", value: session.gameSize ?? "—" },
    { label: "Tier", value: session.tier ?? "free" },
    { label: "Created", value: formatTimestamp(session.createdAt) },
    { label: "Sync", value: syncStatusLabel },
    { label: "Companion", value: APP_VERSION },
  ];

  return (
    <div className="pointer-events-none absolute inset-x-0 top-[calc(4.75rem+env(safe-area-inset-top))] z-[var(--z-panel)] px-3">
      <section
        className="pointer-events-auto mx-auto max-w-xl rounded-xl border border-border bg-surface-panel/95 p-3 shadow-hud-float backdrop-blur-sm"
        aria-label="Session diagnostics"
      >
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-ink">
            Diagnostics
          </h2>
          <button
            type="button"
            className="btn-secondary min-h-10 px-3 text-xs"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <dl className="space-y-2 text-xs">
          {rows.map((row) => (
            <div key={row.label} className="grid grid-cols-[8rem_1fr] gap-2">
              <dt className="font-semibold uppercase tracking-wide text-ink-dim">
                {row.label}
              </dt>
              <dd className="break-all font-mono text-ink">{row.value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}

export function AdminMapScreenChrome({
  session,
  myRole,
  timer,
  overlay,
  perspective,
  onPerspectiveChange,
  onLeave,
  diagnosticsOpen,
  onToggleDiagnostics,
  moderationBusy,
  moderationError,
  onModerationAction,
}: AdminMapScreenChromeProps) {
  return (
    <>
      <ObserverMapScreenChrome
        session={session}
        myRole={myRole}
        timer={timer}
        overlay={overlay}
        perspective={perspective}
        onPerspectiveChange={onPerspectiveChange}
        onLeave={onLeave}
      />

      <div className="pointer-events-none absolute inset-x-0 top-[calc(4.75rem+env(safe-area-inset-top))] z-[var(--z-dock)] px-3">
        <div className="pointer-events-auto mx-auto flex max-w-xl flex-col gap-2">
          <div className="rounded-xl border border-border bg-surface-panel/95 p-2 shadow-hud-float backdrop-blur-sm">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-secondary min-h-11 flex-1 px-3 text-xs"
                disabled={moderationBusy}
                onClick={() => onModerationAction("end")}
              >
                Force end
              </button>
              <button
                type="button"
                className="btn-secondary min-h-11 flex-1 px-3 text-xs"
                disabled={moderationBusy}
                onClick={() => onModerationAction("resetBoard")}
              >
                Reset board
              </button>
              <button
                type="button"
                className="btn-secondary min-h-11 flex-1 px-3 text-xs text-error"
                disabled={moderationBusy}
                onClick={() => onModerationAction("cleanupCode")}
              >
                Cleanup code
              </button>
              <button
                type="button"
                className={`min-h-11 flex-1 rounded-lg px-3 text-xs font-semibold uppercase tracking-wide ${
                  diagnosticsOpen
                    ? "bg-action text-action-ink"
                    : "bg-surface-raised text-ink"
                }`}
                onClick={onToggleDiagnostics}
              >
                Diagnostics
              </button>
            </div>
            {moderationError ? (
              <p className="mt-2 text-xs text-error" role="alert">
                {moderationError}
              </p>
            ) : null}
            <p className="mt-2 text-[0.65rem] uppercase tracking-wide text-ink-dim">
              {playerRoleLabel(myRole)} monitor
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
