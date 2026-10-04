import { NativeSelect, Text } from "@mantine/core";
import { useEffect, useMemo, useRef, useState } from "react";
import { insetTextInputStyles, SectionLabel } from "@/components/ui/entry/entryChrome";
import type { GameArea } from "@/domain/map/annotations";
import type { DistanceUnit } from "@/domain/map/distance";
import type { GameSize } from "@/domain/session/size/gameSize";
import {
  formatPlayAreaSummary,
  GAME_SIZE_OPTIONS,
  gameAreaSquareKilometers,
  gameAreaSquareMiles,
  gameSizeLabel,
  playAreaValueForUnit,
  recommendGameSize,
} from "@/domain/session/size/gameSize";
import { gameSizeRulesSummary } from "@/domain/session/size/gameSizeRules";
import { RadioCardGroup } from "../../ui/forms/RadioCardGroup";

interface GameSizePickerProps {
  gameArea: GameArea | null;
  value: GameSize;
  onChange: (size: GameSize) => void;
  distanceUnit?: DistanceUnit;
  disabled?: boolean;
  compact?: boolean;
  /** When set by a parent that survives remount, skips recommend overwrite. */
  userOverrode?: boolean;
  onUserOverride?: () => void;
}

export function GameSizePicker({
  gameArea,
  value,
  onChange,
  distanceUnit = "imperial",
  disabled,
  compact = false,
  userOverrode: userOverrodeProp,
  onUserOverride,
}: GameSizePickerProps) {
  const recommended = useMemo(
    () => (gameArea ? recommendGameSize(gameArea, distanceUnit) : null),
    [gameArea, distanceUnit],
  );
  const playAreaSummary = useMemo(() => {
    if (!gameArea) {
      return null;
    }

    return formatPlayAreaSummary(playAreaValueForUnit(gameArea, distanceUnit), distanceUnit);
  }, [gameArea, distanceUnit]);
  const [localUserOverrode, setLocalUserOverrode] = useState(false);
  const userOverrode = userOverrodeProp ?? localUserOverrode;
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

  const selectSize = (size: GameSize) => {
    setLocalUserOverrode(true);
    onUserOverride?.();
    onChange(size);
  };

  if (compact) {
    return (
      <div>
        <div className="flex items-baseline justify-between gap-2 px-4 pt-2">
          <SectionLabel>Game size</SectionLabel>
          {playAreaSummary ? (
            <Text size="xs" c="var(--color-field-ink-muted)">
              {playAreaSummary}
              {recommended ? ` · Rec ${gameSizeLabel(recommended, distanceUnit).label}` : ""}
            </Text>
          ) : null}
        </div>
        <NativeSelect
          aria-label="Game size"
          data={GAME_SIZE_OPTIONS.map((size) => ({
            value: size,
            label: gameSizeLabel(size, distanceUnit).label,
          }))}
          value={value}
          disabled={disabled}
          onChange={(event) => {
            selectSize(event.currentTarget.value as GameSize);
          }}
          styles={insetTextInputStyles}
        />
        {compactArea ? (
          <Text size="xs" c="var(--color-field-ink-muted)" px={16} pb={8}>
            Compact area, good for a short local game.
          </Text>
        ) : null}
      </div>
    );
  }

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
        onChange={selectSize}
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
