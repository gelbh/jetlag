import { Button, Group, Stack, Table, Text } from "@mantine/core";
import { useCallback, useEffect, useState } from "react";
import type { BoardOpPreview } from "@/domain/admin/applyBoardOpPreview";
import type { AnnotationRecord } from "@/domain/map/annotations";
import {
  type AdminBoardAnnotationSummary,
  adminListBoardAnnotations,
  adminSessionBoardOps,
} from "@/services/admin/adminBoardOps";
import { AdminConfirm } from "../shared/AdminConfirm";

interface AdminBoardPanelProps {
  sessionId: string;
  liveAnnotations: readonly AnnotationRecord[];
  confirmedHide: { lat: number; lng: number } | null;
  pendingOp: BoardOpPreview | null;
  onPreview: (op: BoardOpPreview) => void;
  onClearPreview: () => void;
}

function confirmCopy(action: BoardOpPreview["action"], annotationId: string) {
  switch (action) {
    case "softDeleteAnnotation":
      return {
        title: "Soft-delete this annotation?",
        consequence: `Mark ${annotationId} deleted on the board. Players lose its shade until restored.`,
        confirmLabel: "Soft-delete",
      };
    case "restoreAnnotation":
      return {
        title: "Restore this annotation?",
        consequence: `Bring ${annotationId} back to active on the board.`,
        confirmLabel: "Restore",
      };
    case "recomputeThermometerFromHide":
      return {
        title: "Recompute thermometer from hide?",
        consequence: `Rewrite hotter/colder for ${annotationId} from the confirmed hide center.`,
        confirmLabel: "Recompute",
      };
  }
}

export function AdminBoardPanel({
  sessionId,
  liveAnnotations,
  confirmedHide,
  pendingOp,
  onPreview,
  onClearPreview,
}: AdminBoardPanelProps) {
  const [rows, setRows] = useState<AdminBoardAnnotationSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [executeOpen, setExecuteOpen] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setRows(await adminListBoardAnnotations(sessionId));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load annotations.");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const previewSoftDelete = (annotationId: string) => {
    onPreview({ action: "softDeleteAnnotation", annotationId });
  };

  const previewRestore = (annotationId: string) => {
    onPreview({ action: "restoreAnnotation", annotationId });
  };

  const previewRecompute = (annotationId: string) => {
    if (!confirmedHide) return;
    onPreview({
      action: "recomputeThermometerFromHide",
      annotationId,
      hide: confirmedHide,
    });
  };

  const copy = pendingOp ? confirmCopy(pendingOp.action, pendingOp.annotationId) : null;

  return (
    <Stack gap="sm" data-testid="admin-board-panel">
      <Group justify="space-between" align="center">
        <Text size="sm" fw={600}>
          Board annotations
        </Text>
        <Button size="xs" variant="default" loading={loading} onClick={() => void refresh()}>
          Refresh
        </Button>
      </Group>

      {loadError ? (
        <Text size="sm" c="halt" role="alert">
          {loadError}
        </Text>
      ) : null}

      <Table.ScrollContainer minWidth={280}>
        <Table horizontalSpacing="xs" verticalSpacing={4} withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Type</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Answer</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={4}>
                  <Text size="sm" c="dimmed">
                    {loading ? "Loading…" : "No annotations."}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              rows.map((row) => {
                const inStore = liveAnnotations.some((annotation) => annotation.id === row.id);
                const canRecompute = row.type === "thermometer" && confirmedHide != null && inStore;
                return (
                  <Table.Tr key={row.id}>
                    <Table.Td>
                      <Text size="xs">{row.type}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs">{row.status}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs">{row.answerSummary ?? "-"}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4} wrap="wrap">
                        {row.status !== "deleted" ? (
                          <Button
                            size="compact-xs"
                            variant="default"
                            onClick={() => previewSoftDelete(row.id)}
                          >
                            Preview delete
                          </Button>
                        ) : (
                          <Button
                            size="compact-xs"
                            variant="default"
                            onClick={() => previewRestore(row.id)}
                          >
                            Preview restore
                          </Button>
                        )}
                        {row.type === "thermometer" ? (
                          <Button
                            size="compact-xs"
                            variant="default"
                            disabled={!canRecompute}
                            onClick={() => previewRecompute(row.id)}
                          >
                            Preview recompute
                          </Button>
                        ) : null}
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                );
              })
            )}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>

      {pendingOp ? (
        <Stack gap="xs">
          <Text size="sm" c="flag" role="status">
            Preview - not saved
          </Text>
          <Group gap="xs">
            <Button
              size="sm"
              onClick={() => setExecuteOpen(true)}
              data-testid="admin-board-execute"
            >
              Execute
            </Button>
            <Button size="sm" variant="default" onClick={onClearPreview}>
              Cancel
            </Button>
          </Group>
        </Stack>
      ) : (
        <Text size="sm" c="dimmed">
          Preview an action on the map, then Execute to save.
        </Text>
      )}

      <AdminConfirm
        opened={executeOpen && pendingOp != null}
        title={copy?.title ?? ""}
        consequence={copy?.consequence ?? ""}
        confirmLabel={copy?.confirmLabel ?? "Execute"}
        destructive={pendingOp?.action === "softDeleteAnnotation"}
        onClose={() => setExecuteOpen(false)}
        onConfirm={async () => {
          if (!pendingOp) return;
          await adminSessionBoardOps(sessionId, pendingOp.action, pendingOp.annotationId);
          onClearPreview();
          await refresh();
        }}
      />
    </Stack>
  );
}
