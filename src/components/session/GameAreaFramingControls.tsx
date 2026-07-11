import type { FramingMode } from "../../hooks/session/useGameAreaFraming";
import type { GameArea } from "../../domain/map/annotations";
import {
  formatPlayAreaSummary,
  gameAreaSquareMiles,
  gameSizeLabel,
  recommendGameSize,
} from "../../domain/session/gameSize";
import { HudSegmentControl } from "../ui/HudSegmentControl";
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
    <HudSegmentControl
      value={value}
      options={FRAMING_MODE_OPTIONS}
      onChange={onChange}
      disabled={disabled}
      aria-label={ariaLabel}
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
    selectedGameSize !== undefined &&
    selectedGameSize !== null &&
    recommended !== selectedGameSize;

  return (
    <div
      className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${
        compact ? "text-xs" : "text-sm"
      }`}
      aria-live="polite"
    >
      <span className="font-mono text-xs tabular-nums text-ink">{summary}</span>
      <span className="text-ink-secondary">
        Suggested{" "}
        <span className="font-display font-semibold uppercase tracking-wide text-brand-blue">
          {gameSizeLabel(recommended).label}
        </span>
      </span>
      {sizeMismatch ? (
        <span className="text-status-warning text-xs">
          Differs from selected size
        </span>
      ) : null}
    </div>
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
  layout = "dock",
}: GameAreaFramingPolygonActionsProps) {
  const gridClass =
    layout === "inline" ? "grid grid-cols-2 gap-2" : "grid grid-cols-2 gap-2";

  return (
    <div className={gridClass}>
      <button
        type="button"
        onClick={onClose}
        disabled={vertexCount < 3}
        className="btn-primary min-h-11 disabled:opacity-50"
      >
        Close shape
      </button>
      <button
        type="button"
        onClick={onReset}
        disabled={vertexCount === 0}
        className="btn-secondary min-h-11 disabled:opacity-50"
      >
        Clear points
      </button>
    </div>
  );
}
