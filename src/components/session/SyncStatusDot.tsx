import type { SyncStatus } from "../../domain/device/sync";

interface SyncStatusBeaconProps {
  status: SyncStatus;
  size?: "sm" | "md";
  className?: string;
}

const SIZE_CLASS: Record<NonNullable<SyncStatusBeaconProps["size"]>, string> = {
  sm: "jl-sync-beacon--sm",
  md: "jl-sync-beacon--md",
};

/** Broadcast link-lamp sync indicator for the map HUD. */
export function SyncStatusBeacon({
  status,
  size = "md",
  className = "",
}: SyncStatusBeaconProps) {
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
