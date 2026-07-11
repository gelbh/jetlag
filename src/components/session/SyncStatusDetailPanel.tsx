import type { SyncStatus } from "../../domain/device/sync";
import { SyncStatusBeacon } from "./SyncStatusDot";
import { HudDetailPanel } from "../ui/HudDetailPanel";

interface SyncStatusDetailPanelProps {
  status: SyncStatus;
  title: string;
  body: string;
  actionLabel?: string | null;
  onAction?: () => void;
  onClose: () => void;
}

const STATUS_TEXT_CLASS: Record<SyncStatus, string> = {
  synced: "text-status-success",
  saving: "text-status-info",
  offline: "text-status-warning",
  degraded: "text-status-warning",
  error: "text-status-error",
};

export function SyncStatusDetailPanel({
  status,
  title,
  body,
  actionLabel,
  onAction,
  onClose,
}: SyncStatusDetailPanelProps) {
  return (
    <HudDetailPanel
      panelClassName="jl-sync-detail-panel"
      ariaLabel="Sync status"
      leading={<SyncStatusBeacon status={status} size="sm" />}
      title={title}
      titleClassName={`jl-sync-detail-panel__status ${STATUS_TEXT_CLASS[status]}`}
      onClose={onClose}
      closeLabel="Close sync details"
      body={body}
      actionLabel={actionLabel ?? undefined}
      onAction={onAction}
    />
  );
}
