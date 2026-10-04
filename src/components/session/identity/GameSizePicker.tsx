import { Text } from "@mantine/core";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { SectionLabel } from "@/components/ui/entry/entryChrome";
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
import { gameSizeRulesSummary, hidingPeriodMinutes } from "@/domain/session/size/gameSizeRules";
import { RadioCardGroup } from "../../ui/forms/RadioCardGroup";

interface GameSizePickerProps {
  gameArea: GameArea | null;
  value: GameSize;
  onChange: (size: GameSize) => void;
  distanceUnit?: DistanceUnit;
  disabled?: boolean;
  compact?: boolean;
  accessory?: ReactNode;
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
  accessory,
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
      <div className="px-1 py-2">
        <div className="flex items-center justify-between gap-2">
          <SectionLabel>Choose game size</SectionLabel>
          {accessory}
        </div>
        {playAreaSummary ? (
          <Text size="xs" c="var(--color-field-ink-muted)" mt={4}>
            {playAreaSummary}
            {recommended ? ` · Rec ${gameSizeLabel(recommended, distanceUnit).label}` : ""}
          </Text>
        ) : null}
        <div role="radiogroup" aria-label="Game size" className="mt-3 grid grid-cols-3 gap-2">
          {GAME_SIZE_OPTIONS.map((size) => {
            const meta = gameSizeLabel(size, distanceUnit);
            const rules = gameSizeRulesSummary(size, distanceUnit);
            const hidingMinutes = hidingPeriodMinutes(size);
            const hidingShort =
              hidingMinutes < 60 ? `${hidingMinutes} min` : `${hidingMinutes / 60} hr`;
            const selected = value === size;
            const isRecommended = recommended === size && gameArea !== null;
            return (
              <button
                key={size}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={`${meta.label}. ${rules.hidingPeriodLabel}${isRecommended ? ". Recommended" : ""}`}
                disabled={disabled}
                onClick={() => selectSize(size)}
                className={`flex min-h-24 flex-col items-center justify-center gap-1 rounded-xl border px-2 py-3 text-center disabled:opacity-50 ${
                  selected
                    ? "border-flag bg-flag-soft text-flag"
                    : "border-rule bg-canvas text-field-ink"
                }`}
              >
                <span className="text-[1.0625rem] font-semibold tracking-[-0.01em]">
                  {meta.label}
                </span>
                <span className="text-xs text-field-ink-muted">{hidingShort}</span>
              </button>
            );
          })}
        </div>
        {compactArea ? (
          <Text size="xs" c="var(--color-field-ink-muted)" mt={8}>
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
