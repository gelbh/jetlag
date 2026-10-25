import { mapChromeSurfaceStyles } from "@/components/ui/entry/entryChrome";
import type {
  SeriesLength,
  SeriesOutcome,
  SeriesScore,
} from "@/domain/session/castleSiege/seriesScore";

export type SeriesChromeProps = {
  active: boolean;
  seriesLength: SeriesLength;
  gameIndex: number;
  score: SeriesScore;
  phase?: "setup" | "standoff" | "siege" | "betweenGames" | null;
  seriesOutcome?: SeriesOutcome | null;
  isHost?: boolean;
  onContinueSeries?: () => void;
  onForfeitSeries?: () => void;
  onAbandonSeries?: () => void;
};

function phaseMastLabel(
  phase: SeriesChromeProps["phase"],
  seriesOutcome: SeriesOutcome | null | undefined,
): string {
  if (seriesOutcome === "complete") {
    return "Match complete";
  }
  if (seriesOutcome === "abandoned") {
    return "Match abandoned";
  }
  switch (phase) {
    case "setup":
      return "Setup";
    case "standoff":
      return "Standoff";
    case "siege":
      return "Siege";
    case "betweenGames":
      return "Between games";
    default:
      return "Series";
  }
}

/**
 * Skin-S3 series pennants + phase mast (BO1/BO3 scoreboard).
 * Display-first; Continue / forfeit handlers optional stubs like SiegeChrome.
 */
export function SeriesChrome({
  active,
  seriesLength,
  gameIndex,
  score,
  phase = null,
  seriesOutcome = null,
  isHost = false,
  onContinueSeries,
  onForfeitSeries,
  onAbandonSeries,
}: SeriesChromeProps) {
  if (!active) {
    return null;
  }

  const format = seriesLength === 1 ? "BO1" : "BO3";
  const betweenGames = phase === "betweenGames" && seriesOutcome == null;

  return (
    <section
      aria-label="Castle Siege series"
      data-testid="castle-siege-series-chrome"
      className="flex flex-col gap-2 rounded-md border px-3 py-2.5"
      style={{
        ...mapChromeSurfaceStyles,
        color: "var(--color-field-ink)",
      }}
    >
      <p
        className="m-0 text-[0.6875rem] font-semibold uppercase tracking-[0.08em]"
        style={{ color: "var(--color-flag)" }}
        data-testid="castle-siege-series-mast"
      >
        {phaseMastLabel(phase, seriesOutcome)} · {format}
      </p>

      <p
        className="m-0 text-sm font-semibold tabular-nums"
        data-testid="castle-siege-series-pennants"
        style={{ color: "var(--color-field-ink)" }}
      >
        <span style={{ color: "var(--color-flag)" }}>{score.teamA}</span>
        <span aria-hidden="true"> – </span>
        <span style={{ color: "var(--color-signal)" }}>{score.teamB}</span>
        <span className="font-normal"> · Game {gameIndex}</span>
      </p>

      {betweenGames ? (
        <div className="flex flex-wrap gap-2" data-testid="castle-siege-between-games-actions">
          {isHost && onContinueSeries ? (
            <button
              type="button"
              data-testid="castle-siege-series-continue"
              className="rounded px-2.5 py-1.5 text-sm font-semibold"
              style={{
                background: "var(--color-flag)",
                color: "var(--color-canvas)",
                minHeight: "2.75rem",
              }}
              onClick={onContinueSeries}
            >
              Continue series
            </button>
          ) : null}
          {onForfeitSeries ? (
            <button
              type="button"
              data-testid="castle-siege-series-forfeit"
              className="rounded border px-2.5 py-1.5 text-sm font-semibold"
              style={{
                borderColor: "var(--color-halt)",
                color: "var(--color-halt)",
                minHeight: "2.75rem",
                background: "transparent",
              }}
              onClick={onForfeitSeries}
            >
              Forfeit series
            </button>
          ) : null}
          {isHost && onAbandonSeries ? (
            <button
              type="button"
              data-testid="castle-siege-series-abandon"
              className="rounded border px-2.5 py-1.5 text-sm font-semibold"
              style={{
                borderColor: "var(--color-rule)",
                color: "var(--color-trail)",
                minHeight: "2.75rem",
                background: "transparent",
              }}
              onClick={onAbandonSeries}
            >
              Abandon match
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
