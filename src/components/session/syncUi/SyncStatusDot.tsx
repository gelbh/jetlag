import type { SyncStatus } from "@/domain/device/sync/sync";
import {
  ArrowsClockwise,
  CheckCircle,
  CloudSlash,
  Warning,
  WarningCircle,
} from "@phosphor-icons/react";
import { usePlayerUxWorld } from "@/hooks/feature/usePlayerUxWorld";
import { JlIcon, type PhosphorIcon } from "../../ui/brand/JlIcon";

interface SyncStatusBeaconProps {
  status: SyncStatus;
  size?: "sm" | "md";
  className?: string;
}

const SIZE_CLASS: Record<NonNullable<SyncStatusBeaconProps["size"]>, string> = {
  sm: "jl-sync-beacon--sm",
  md: "jl-sync-beacon--md",
};

const SURVEY_ICON: Record<SyncStatus, PhosphorIcon> = {
  synced: CheckCircle,
  saving: ArrowsClockwise,
  offline: CloudSlash,
  degraded: Warning,
  error: WarningCircle,
};

/** Broadcast link-lamp sync indicator for the map HUD. */
export function SyncStatusBeacon({
  status,
  size = "md",
  className = "",
}: SyncStatusBeaconProps) {
  const survey = usePlayerUxWorld();
  const iconPx = size === "sm" ? 14 : 18;

  if (survey) {
    return (
      <span
        className={`jl-sync-beacon jl-sync-beacon--survey jl-sync-beacon--${status} ${SIZE_CLASS[size]} ${className}`.trim()}
        aria-hidden="true"
      >
        <JlIcon icon={SURVEY_ICON[status]} size={iconPx} weight="bold" />
      </span>
    );
  }

  return (
    <span
      className={`jl-sync-beacon jl-sync-beacon--${status} ${SIZE_CLASS[size]} ${className}`.trim()}
      aria-hidden="true"
    >
      <span className="jl-sync-beacon__lamp" />
    </span>
  );
}

/** @deprecated Use SyncStatusBeacon — alias kept for existing imports. */
export const SyncStatusDot = SyncStatusBeacon;
