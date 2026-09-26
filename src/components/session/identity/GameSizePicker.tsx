import { useEffect, useMemo, useRef, useState } from "react";
import { Text } from "@mantine/core";
import type { GameArea } from "@/domain/map/annotations";
import type { DistanceUnit } from "@/domain/map/distance";
import type { GameSize } from "@/domain/session/size/gameSize";
import {
  GAME_SIZE_OPTIONS,
  formatPlayAreaSummary,
  gameAreaSquareKilometers,
  gameAreaSquareMiles,
  gameSizeLabel,
  playAreaValueForUnit,
  recommendGameSize,
} from "@/domain/session/size/gameSize";
import { gameSizeRulesSummary } from "@/domain/session/size/gameSizeRules";
import { RadioCardGroup } from "../../ui/forms/RadioCardGroup";
import { SectionLabel } from "@/components/ui/entry/entryChrome";

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
        <Text
          size="xs"
          fw={590}
          px={8}
          py={2}
          style={{
            borderRadius: 999,
            backgroundColor: "oklch(from var(--color-flag) l c h / 0.16)",
            color: "var(--color-flag)",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          Recommended
        </Text>
      ) : undefined,
    };
  });

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2 px-1">
        <SectionLabel>Game size</SectionLabel>
        {playAreaSummary ? (
          <Text size="xs" c="var(--color-field-ink-muted)">
            {playAreaSummary}
          </Text>
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
        <Text size="xs" c="var(--color-field-ink-muted)" px={4}>
          Compact area, good for a short local game.
        </Text>
      ) : null}
    </div>
  );
}
