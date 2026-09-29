import type { SyncStatus } from "@/domain/device/sync/sync";
import {
  ArrowsClockwiseIcon,
  CheckCircleIcon,
  ClockCounterClockwiseIcon,
  CloudSlashIcon,
  WarningIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { syncBeaconStyle } from "@/components/ui/entry/entryChrome";
import { JlIcon, type PhosphorIcon } from "../../ui/brand/JlIcon";

interface SyncStatusBeaconProps {
  status: SyncStatus;
  size?: "sm" | "md";
  className?: string;
}

const SURVEY_ICON: Record<SyncStatus, PhosphorIcon> = {
  synced: CheckCircleIcon,
  saving: ArrowsClockwiseIcon,
  offline: CloudSlashIcon,
  degraded: WarningIcon,
  stale: ClockCounterClockwiseIcon,
  error: WarningCircleIcon,
};

/** Sync indicator for the map chrome status strip. */
export function SyncStatusBeacon({
  status,
  size = "md",
  className = "",
}: SyncStatusBeaconProps) {
  const iconPx = size === "sm" ? 14 : 18;

  return (
    <span
      className={`jl-sync-beacon jl-sync-beacon--${status} ${className}`.trim()}
      style={syncBeaconStyle(status, size)}
      aria-hidden="true"
    >
      <JlIcon icon={SURVEY_ICON[status]} size={iconPx} weight="bold" />
    </span>
  );
}

/** @deprecated Use SyncStatusBeacon — alias kept for existing imports. */
export const SyncStatusDot = SyncStatusBeacon;
