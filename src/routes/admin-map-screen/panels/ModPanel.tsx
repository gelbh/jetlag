import { Button, Divider, Stack, Text } from "@mantine/core";
import { useMemo } from "react";
import type { BoardOpPreview } from "@/domain/admin/applyBoardOpPreview";
import type { AnnotationRecord } from "@/domain/map/annotations";
import type { HidingZoneRecord } from "@/domain/session/hiding/hidingZone";
import type { SessionNoticeDraft } from "@/domain/session/opsNotice";
import { AdminBoardPanel } from "../../../components/admin/ops/AdminBoardPanel";
import { AdminNoticeComposer } from "../../../components/admin/ops/AdminNoticeComposer";
import type { ModerationAction } from "../useModerationConfirm";

interface ModPanelProps {
  sessionId: string;
  liveAnnotations: readonly AnnotationRecord[];
  hidingZones: readonly HidingZoneRecord[];
  pendingBoardOp: BoardOpPreview | null;
  onBoardPreview: (op: BoardOpPreview) => void;
  onClearBoardPreview: () => void;
  noticeDraft: SessionNoticeDraft | null;
  onNoticeDraftChange: (draft: SessionNoticeDraft | null) => void;
  moderationBusy: boolean;
  onModerationAction: (action: ModerationAction) => void;
}

export function ModPanel({
  sessionId,
  liveAnnotations,
  hidingZones,
  pendingBoardOp,
  onBoardPreview,
  onClearBoardPreview,
  noticeDraft,
  onNoticeDraftChange,
  moderationBusy,
  onModerationAction,
}: ModPanelProps) {
  const confirmedHide = useMemo(() => {
    const zone = hidingZones.find((entry) => entry.status === "confirmed");
    return zone?.center ?? null;
  }, [hidingZones]);

  return (
    <Stack gap="md">
      <AdminBoardPanel
        sessionId={sessionId}
        liveAnnotations={liveAnnotations}
        confirmedHide={confirmedHide}
        pendingOp={pendingBoardOp}
        onPreview={onBoardPreview}
        onClearPreview={onClearBoardPreview}
      />
      <Divider />
      <AdminNoticeComposer
        sessionId={sessionId}
        draft={noticeDraft}
        onDraftChange={onNoticeDraftChange}
      />
      <Divider />
      <Stack gap="sm">
        <Text size="sm" c="dimmed">
          Coarse session actions. Each asks before it runs.
        </Text>
        <Stack gap="xs">
          <Button
            variant="default"
            disabled={moderationBusy}
            onClick={() => onModerationAction("end")}
          >
            Force end
          </Button>
          <Button
            variant="default"
            disabled={moderationBusy}
            onClick={() => onModerationAction("resetBoard")}
          >
            Reset board
          </Button>
          <Button
            variant="default"
            c="halt"
            disabled={moderationBusy}
            onClick={() => onModerationAction("cleanupCode")}
          >
            Cleanup code
          </Button>
        </Stack>
      </Stack>
    </Stack>
  );
}
