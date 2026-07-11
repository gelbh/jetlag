import { useEffect, useMemo, useRef, useState } from "react";
import type { GameArea } from "../../domain/map/annotations";
import type { DistanceUnit } from "../../domain/map/distance";
import type { GameSize } from "../../domain/session/gameSize";
import {
  GAME_SIZE_OPTIONS,
  formatPlayAreaSummary,
  gameAreaSquareKilometers,
  gameAreaSquareMiles,
  gameSizeLabel,
  playAreaValueForUnit,
  recommendGameSize,
} from "../../domain/session/gameSize";
import { gameSizeRulesSummary } from "../../domain/session/gameSizeRules";
import { RadioCardGroup } from "../ui/RadioCardGroup";

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
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!gameArea || userOverrode || disabled) {
      return;
    }

    const next = recommendGameSize(gameArea, distanceUnit);
    if (next !== value) {
      onChangeRef.current(next);
    }
  }, [disabled, gameArea, distanceUnit, userOverrode, value]);

  const compactArea = gameArea
    ? distanceUnit === "metric"
      ? gameAreaSquareKilometers(gameArea) < 25
      : gameAreaSquareMiles(gameArea) < 10
    : false;

  const options = GAME_SIZE_OPTIONS.map((size) => {
    const meta = gameSizeLabel(size, distanceUnit);
    const rules = gameSizeRulesSummary(size, distanceUnit);
    const isRecommended = recommended === size && gameArea !== null;

    return {
      value: size,
      title: meta.label,
      description: `${meta.summary} · ${rules.hidingPeriodLabel} · ${rules.tentacleLabel}`,
      footer: rules.thermometerMaxLabel,
      badge: isRecommended ? (
        <span className="rounded-full bg-brand-blue/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-blue">
          Recommended
        </span>
      ) : undefined,
    };
  });

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
      <RadioCardGroup
        value={value}
        options={options}
        onChange={(size) => {
          setUserOverrode(true);
          onChange(size);
        }}
        aria-label="Game size"
        disabled={disabled}
      />
      {compactArea ? (
        <p className="text-xs text-ink-dim">
          Compact area, good for a short local game.
        </p>
      ) : null}
    </div>
  );
}
