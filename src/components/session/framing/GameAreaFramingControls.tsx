import { Button, Group, SegmentedControl, Text } from "@mantine/core";
import { compactFilledStyles, grayStyles } from "@/components/ui/entry/entryStyles";
import type { GameArea } from "@/domain/map/annotations";
import {
  formatPlayAreaSummary,
  gameAreaSquareMiles,
  gameSizeLabel,
  recommendGameSize,
} from "@/domain/session/size/gameSize";
import type { FramingMode } from "@/hooks/session/useGameAreaFraming";
import { FRAMING_MODE_OPTIONS } from "./gameAreaFramingUi";

interface FramingModeSegmentControlProps {
  value: FramingMode;
  onChange: (mode: FramingMode) => void;
  disabled?: boolean;
  "aria-label"?: string;
}

export function FramingModeSegmentControl({
  value,
  onChange,
  disabled = false,
  "aria-label": ariaLabel = "Play area shape",
}: FramingModeSegmentControlProps) {
  return (
    <SegmentedControl
      fullWidth
      value={value}
      onChange={(next) => onChange(next as FramingMode)}
      disabled={disabled}
      aria-label={ariaLabel}
      data={FRAMING_MODE_OPTIONS.map((option) => ({
        value: option.value,
        label: option.label,
      }))}
      styles={{
        root: {
          backgroundColor: "oklch(from var(--color-field-ink) l c h / 0.08)",
          border: "0.33px solid oklch(from var(--color-field-ink) l c h / 0.12)",
          borderRadius: 12,
          padding: 2,
        },
        label: {
          color: "var(--color-field-ink)",
          fontWeight: 510,
          fontSize: "0.875rem",
        },
        indicator: {
          backgroundColor: "oklch(from var(--color-field-ink) l c h / 0.16)",
          borderRadius: 10,
        },
      }}
    />
  );
}

interface GameAreaFramingStatsProps {
  gameArea: GameArea | null;
  selectedGameSize?: string | null;
  compact?: boolean;
}

export function GameAreaFramingStats({
  gameArea,
  selectedGameSize,
  compact = false,
}: GameAreaFramingStatsProps) {
  if (!gameArea) {
    return null;
  }

  const summary = formatPlayAreaSummary(gameAreaSquareMiles(gameArea));
  const recommended = recommendGameSize(gameArea);
  const sizeMismatch =
    selectedGameSize !== undefined && selectedGameSize !== null && recommended !== selectedGameSize;

  return (
    <Group
      gap={compact ? "sm" : "md"}
      wrap="wrap"
      aria-live="polite"
      style={{ rowGap: compact ? 4 : 6 }}
    >
      <Text
        size={compact ? "xs" : "sm"}
        ff="monospace"
        c="var(--color-field-ink)"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {summary}
      </Text>
      <Text size={compact ? "xs" : "sm"} c="var(--color-field-ink-muted)">
        Suggested{" "}
        <Text
          span
          fw={700}
          tt="uppercase"
          c="var(--color-signal)"
          style={{ letterSpacing: "0.04em" }}
        >
          {gameSizeLabel(recommended).label}
        </Text>
      </Text>
      {sizeMismatch ? (
        <Text size="xs" c="var(--color-status-warning)">
          Differs from selected size
        </Text>
      ) : null}
    </Group>
  );
}

interface GameAreaFramingPolygonActionsProps {
  vertexCount: number;
  onClose: () => void;
  onReset: () => void;
  layout?: "inline" | "dock";
}

export function GameAreaFramingPolygonActions({
  vertexCount,
  onClose,
  onReset,
}: GameAreaFramingPolygonActionsProps) {
  return (
    <Group grow gap="sm">
      <Button
        type="button"
        styles={compactFilledStyles}
        onClick={onClose}
        disabled={vertexCount < 3}
      >
        Close shape
      </Button>
      <Button type="button" styles={grayStyles} onClick={onReset} disabled={vertexCount === 0}>
        Clear points
      </Button>
    </Group>
  );
}
