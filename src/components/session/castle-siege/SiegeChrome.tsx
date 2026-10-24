import { useEffect, useState } from "react";
import type { PressureBand } from "@/domain/session/castleSiege/pressure";
import type { SiegeCaptureState } from "@/domain/session/castleSiege/siegeCapture";
import type { SiegeClockState, SiegePauseReason } from "@/domain/session/castleSiege/siegeClocks";
import { remainingSiegeMs } from "@/domain/session/castleSiege/siegeClocks";
import type { SiegeGuardEvent, SiegeGuardState } from "@/domain/session/castleSiege/siegeGuards";
import type { StandoffTeamId } from "@/domain/session/castleSiege/standoffTurn";

export type SiegeChromeProps = {
  active: boolean;
  clock: SiegeClockState | null;
  capture: SiegeCaptureState | null;
  guards?: SiegeGuardState | null;
  /** Latest soft/hard flash from guard samples. */
  guardFlash?: SiegeGuardEvent | null;
  /** Defenders-only H5 reading; omit for attackers. */
  pressure?: { scalar: number; band: PressureBand } | null;
  onSafetyStop?: () => void;
  onResolveGuards?: () => void;
  onConfirmCapture?: () => void;
  onDisputeCapture?: () => void;
};

function formatRemaining(ms: number): string {
  const remaining = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function teamLabel(team: StandoffTeamId): string {
  return team === "teamA" ? "Team A" : "Team B";
}

function roleLine(clock: SiegeClockState): string {
  const a = clock.roles.teamA === "attack" ? "A attack" : "A defend";
  const b = clock.roles.teamB === "attack" ? "B attack" : "B defend";
  return `${a} · ${b}`;
}

function pauseLabel(reason: SiegePauseReason | null): string {
  switch (reason) {
    case "geofence":
      return "Geofence pause";
    case "travel":
      return "Travel pause";
    case "dispute":
      return "Dispute pause";
    case "safetyStop":
      return "Safety stop";
    case null:
      return "Paused";
    default: {
      const _exhaustive: never = reason;
      return _exhaustive;
    }
  }
}

function bandColor(band: PressureBand): string {
  switch (band) {
    case "halt":
      return "var(--color-halt)";
    case "flag":
      return "var(--color-flag)";
    case "signal":
      return "var(--color-signal)";
    default: {
      const _exhaustive: never = band;
      return _exhaustive;
    }
  }
}

/**
 * Skin-S3 Siege strip: mast, guard flash, pressure plate, capture slate, safety stop.
 * Hidden when `active` is false (classic / pre-siege).
 */
export function SiegeChrome({
  active,
  clock,
  capture,
  guards = null,
  guardFlash = null,
  pressure = null,
  onSafetyStop,
  onResolveGuards,
  onConfirmCapture,
  onDisputeCapture,
}: SiegeChromeProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!active) {
      return;
    }
    setNowMs(Date.now());
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [active]);

  if (!active) {
    return null;
  }

  const remaining = clock ? remainingSiegeMs(clock, nowMs) : 0;
  const headStartActive =
    clock?.headStartEndsAtMs != null && nowMs < clock.headStartEndsAtMs && clock.headStartTeamId;
  const capturePending = capture?.status === "pending";
  const hardPaused = Boolean(clock?.paused);

  return (
    <section
      aria-label="Castle Siege siege"
      data-testid="castle-siege-siege-chrome"
      className="flex flex-col gap-2 rounded-md border px-3 py-2.5"
      style={{
        borderColor: "var(--color-rule)",
        background: "oklch(from var(--color-canvas) l c h / 92%)",
        color: "var(--color-field-ink)",
        boxShadow: "var(--shadow-hud-float)",
      }}
    >
      <p
        className="m-0 text-[0.6875rem] font-semibold uppercase tracking-[0.08em]"
        style={{ color: "var(--color-flag)" }}
        data-testid="castle-siege-siege-mast"
      >
        {clock ? `Siege · ${formatRemaining(remaining)} · ${roleLine(clock)}` : "Siege"}
        {headStartActive && clock?.headStartTeamId
          ? ` · Head start ${teamLabel(clock.headStartTeamId)}`
          : ""}
        {hardPaused && clock ? ` · ${pauseLabel(clock.pauseReason)}` : ""}
      </p>

      {guardFlash ? (
        <p
          className="m-0 text-sm font-semibold"
          data-testid="castle-siege-guard-flash"
          style={{
            color: guardFlash.severity === "hard" ? "var(--color-halt)" : "var(--color-signal)",
          }}
        >
          {guardFlash.severity === "hard" ? "Hard" : "Soft"}{" "}
          {guardFlash.kind === "geofence" ? "geofence" : "travel"}
        </p>
      ) : null}

      {pressure ? (
        <p
          className="m-0 text-sm"
          data-testid="castle-siege-pressure-plate"
          style={{ color: bandColor(pressure.band) }}
        >
          Pressure {pressure.scalar} · {pressure.band}
        </p>
      ) : null}

      <div className="flex flex-col gap-1.5" data-testid="castle-siege-capture-slate">
        <p className="m-0 text-sm" style={{ color: "var(--color-field-ink)" }}>
          Capture: {capture?.status ?? "idle"}
          {capturePending && capture.confirmDeadlineMs
            ? ` · confirm ${formatRemaining(Math.max(0, capture.confirmDeadlineMs - nowMs))}`
            : ""}
        </p>
        {capturePending ? (
          <div className="flex flex-wrap gap-2">
            {onConfirmCapture ? (
              <button
                type="button"
                data-testid="castle-siege-capture-confirm"
                className="rounded border px-2 py-1 text-xs font-semibold"
                style={{
                  borderColor: "var(--color-rule)",
                  color: "var(--color-field-ink)",
                  background: "transparent",
                }}
                onClick={onConfirmCapture}
              >
                Confirm capture
              </button>
            ) : null}
            {onDisputeCapture ? (
              <button
                type="button"
                data-testid="castle-siege-capture-dispute"
                className="rounded border px-2 py-1 text-xs font-semibold"
                style={{
                  borderColor: "var(--color-rule)",
                  color: "var(--color-halt)",
                  background: "transparent",
                }}
                onClick={onDisputeCapture}
              >
                Dispute
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {onSafetyStop ? (
          <button
            type="button"
            data-testid="castle-siege-safety-stop"
            className="rounded border px-2 py-1 text-xs font-semibold uppercase tracking-[0.06em]"
            style={{
              borderColor: "var(--color-halt)",
              color: "var(--color-halt)",
              background: "transparent",
            }}
            onClick={onSafetyStop}
          >
            Safety stop
          </button>
        ) : null}
        {hardPaused && onResolveGuards ? (
          <button
            type="button"
            data-testid="castle-siege-resolve-guards"
            className="rounded border px-2 py-1 text-xs font-semibold"
            style={{
              borderColor: "var(--color-rule)",
              color: "var(--color-signal)",
              background: "transparent",
            }}
            onClick={onResolveGuards}
          >
            Resolve pause
            {guards?.hardKind ? ` (${guards.hardKind})` : ""}
          </button>
        ) : null}
      </div>
    </section>
  );
}
