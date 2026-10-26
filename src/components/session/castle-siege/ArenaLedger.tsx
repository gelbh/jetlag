import { mapChromeSurfaceStyles } from "@/components/ui/entry/entryChrome";
import type { CastleSiegeArena } from "@/domain/session/castleSiege/arena";
import {
  type CastleSiegeDials,
  DEFAULT_CASTLE_SIEGE_DIALS,
} from "@/domain/session/castleSiege/dials";

export type ArenaLedgerProps = {
  arena?: CastleSiegeArena | null;
  setupMode?: "pregame" | "fairSplit" | null;
  dials?: CastleSiegeDials | null;
};

function dialsSummary(dials: CastleSiegeDials): string {
  return [
    `zone ${dials.zoneRadiusMeters}m`,
    `turn ${dials.turnLengthSeconds}s`,
    `rounds ${dials.maxRounds}`,
    `belt ${dials.beltWidthMeters}m`,
  ].join(" · ");
}

const SOURCE_LABEL: Record<CastleSiegeArena["source"], string> = {
  gameArea: "Imported game area",
  regionPack: "Region pack",
  drawn: "Drawn",
};

export function ArenaLedger({ arena, setupMode, dials }: ArenaLedgerProps) {
  const resolvedDials = dials ?? DEFAULT_CASTLE_SIEGE_DIALS;
  const sourceLabel = arena ? SOURCE_LABEL[arena.source] : "No arena yet";
  const modeLabel =
    setupMode === "fairSplit" ? "Fair-split" : setupMode === "pregame" ? "Pregame" : "Unset";

  return (
    <section
      aria-label="Arena ledger"
      data-testid="castle-siege-arena-ledger"
      className="rounded-md border border-rule bg-canvas px-3 py-2.5"
      style={{
        ...mapChromeSurfaceStyles,
        color: "var(--color-field-ink)",
      }}
    >
      <p
        className="m-0 text-[0.6875rem] font-semibold uppercase tracking-[0.08em]"
        style={{ color: "var(--color-flag)" }}
      >
        Arena ledger
      </p>
      <dl className="m-0 mt-2 flex flex-col gap-1.5 text-sm">
        <div className="flex justify-between gap-3">
          <dt style={{ color: "var(--color-field-ink-muted)" }}>Source</dt>
          <dd className="m-0 font-medium">{sourceLabel}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt style={{ color: "var(--color-field-ink-muted)" }}>Setup</dt>
          <dd className="m-0 font-medium">{modeLabel}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt style={{ color: "var(--color-field-ink-muted)" }}>Dials</dt>
          <dd className="m-0 text-xs leading-snug" style={{ color: "var(--color-field-ink)" }}>
            {dialsSummary(resolvedDials)}
          </dd>
        </div>
      </dl>
    </section>
  );
}
