import { useEffect, useMemo, useState } from "react";
import type { GameArea } from "../../domain/annotations";
import type { DistanceUnit } from "../../domain/distance";
import type { GameSize } from "../../domain/gameSize";
import {
  GAME_SIZE_OPTIONS,
  formatPlayAreaSummary,
  gameAreaSquareKilometers,
  gameAreaSquareMiles,
  gameSizeLabel,
  playAreaValueForUnit,
  recommendGameSize,
} from "../../domain/gameSize";
import { gameSizeRulesSummary } from "../../domain/gameSizeRules";

interface GameSizePickerProps {
  gameArea: GameArea | null;
  value: GameSize;
  onChange: (size: GameSize) => void;
  distanceUnit?: DistanceUnit;
  disabled?: boolean;
}

export function GameSizePicker({
  gameArea,
  value,
  onChange,
  distanceUnit = "imperial",
  disabled,
}: GameSizePickerProps) {
  const recommended = useMemo(
    () => (gameArea ? recommendGameSize(gameArea, distanceUnit) : null),
    [gameArea, distanceUnit],
  );
  const playAreaSummary = useMemo(() => {
    if (!gameArea) {
      return null;
    }

    return formatPlayAreaSummary(
      playAreaValueForUnit(gameArea, distanceUnit),
      distanceUnit,
    );
  }, [gameArea, distanceUnit]);
  const [userOverrode, setUserOverrode] = useState(false);

  useEffect(() => {
    if (!gameArea || userOverrode) {
      return;
    }

    const next = recommendGameSize(gameArea, distanceUnit);
    if (next !== value) {
      onChange(next);
    }
  }, [gameArea, distanceUnit, onChange, userOverrode, value]);

  const compactArea = gameArea
    ? distanceUnit === "metric"
      ? gameAreaSquareKilometers(gameArea) < 25
      : gameAreaSquareMiles(gameArea) < 10
    : false;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-display text-xs font-semibold uppercase tracking-[0.1em] text-ink-dim">
          Game size
        </p>
        {playAreaSummary ? (
          <p className="text-xs text-ink-muted">{playAreaSummary}</p>
        ) : null}
      </div>
      <div role="radiogroup" aria-label="Game size" className="space-y-1.5">
        {GAME_SIZE_OPTIONS.map((size) => {
          const meta = gameSizeLabel(size, distanceUnit);
          const rules = gameSizeRulesSummary(size, distanceUnit);
          const isRecommended = recommended === size && gameArea !== null;

          return (
            <button
              key={size}
              type="button"
              role="radio"
              aria-checked={value === size}
              disabled={disabled}
              onClick={() => {
                setUserOverrode(true);
                onChange(size);
              }}
              className={`min-h-12 w-full border-2 px-3 py-2 text-left disabled:opacity-50 ${
                value === size
                  ? "border-highlight bg-highlight-soft text-highlight"
                  : "border-border bg-surface-deep text-ink hover:border-brand-blue"
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="font-display text-sm font-semibold uppercase tracking-wide">
                  {meta.label}
                </span>
                {isRecommended ? (
                  <span className="rounded-full bg-brand-blue/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-blue">
                    Recommended
                  </span>
                ) : null}
              </span>
              <span className="mt-0.5 block text-xs text-ink-muted">
                {meta.summary} · {rules.hidingPeriodLabel} · {rules.tentacleLabel}
              </span>
              <span className="mt-0.5 block text-xs text-ink-dim">
                {rules.thermometerMaxLabel}
              </span>
            </button>
          );
        })}
      </div>
      {compactArea ? (
        <p className="text-xs text-ink-dim">
          Compact area — good for a short local game.
        </p>
      ) : null}
    </div>
  );
}
