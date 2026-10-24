import { useEffect, useState } from "react";
import type { StandoffTeamId, StandoffTurnState } from "@/domain/session/castleSiege/standoffTurn";

export type StandoffChromeProps = {
  active: boolean;
  turn: StandoffTurnState | null;
  deckRemaining: number;
  handCount: number;
  handLimit: number;
  endgameBanner?: "lastWord" | "dualSiege" | "dusk" | null;
  mirrorCleared?: boolean;
};

function formatClock(deadlineMs: number, nowMs: number): string {
  const remaining = Math.max(0, Math.floor((deadlineMs - nowMs) / 1000));
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function teamLabel(team: StandoffTeamId): string {
  return team === "teamA" ? "Team A" : "Team B";
}

/**
 * Skin-S3 Standoff strip: turn mast, deck well, hand rail, match ledger.
 * Hidden when `active` is false (classic / pre-standoff).
 */
export function StandoffChrome({
  active,
  turn,
  deckRemaining,
  handCount,
  handLimit,
  endgameBanner = null,
  mirrorCleared = false,
}: StandoffChromeProps) {
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

  return (
    <section
      aria-label="Castle Siege standoff"
      data-testid="castle-siege-standoff-chrome"
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
        data-testid="castle-siege-turn-mast"
      >
        {turn
          ? `${teamLabel(turn.activeTeam)} · Round ${turn.round}/10 · ${turn.phase} ${formatClock(turn.deadlineMs, nowMs)}`
          : "Standoff"}
      </p>

      <div
        className="flex flex-wrap items-center gap-3 text-sm"
        data-testid="castle-siege-deck-well"
      >
        <span style={{ color: "var(--color-signal)" }}>Deck {deckRemaining}</span>
        <span data-testid="castle-siege-hand-rail">
          Hand {handCount}/{handLimit}
        </span>
        {mirrorCleared ? (
          <span data-testid="castle-siege-mirror-chip" style={{ color: "var(--color-trail)" }}>
            Spyglass: mirror clear
          </span>
        ) : (
          <span data-testid="castle-siege-mirror-chip" style={{ color: "var(--color-halt)" }}>
            Mirror tax live
          </span>
        )}
      </div>

      {endgameBanner ? (
        <p
          className="m-0 text-sm font-semibold"
          data-testid="castle-siege-endgame-banner"
          style={{ color: "var(--color-halt)" }}
        >
          {endgameBanner === "lastWord"
            ? "Last Word armed"
            : endgameBanner === "dualSiege"
              ? "Dual Siege"
              : "Dusk"}
        </p>
      ) : null}
    </section>
  );
}
