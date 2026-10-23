import { Box, Button, Skeleton, Stack, Text } from "@mantine/core";
import { formatFreshnessAge } from "@/domain/admin/formatAdminFreshness";
import {
  type PreloadStatusChipTone,
  preloadRequestStatusChipLabel,
  preloadRequestStatusChipTone,
} from "@/domain/preloadRequest/preloadRequestAdmin";
import type { PreloadRequest } from "@/domain/preloadRequest/preloadRequestTypes";
import type { StatusTone } from "@/theme/adminTone";
import { AdminRegion } from "../shared/AdminRegion";
import { StatusMark } from "../shared/StatusMark";
import { AdminPreloadRequestDetail } from "./AdminPreloadRequestDetail";

const TONE: Record<PreloadStatusChipTone, StatusTone> = {
  open: "mispunch",
  active: "live",
  warning: "neutral",
  muted: "ok",
};

function titleCase(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/** Spec section 5: preset name heading, place / size / age meta, fields, then actions. */
export function AdminRequestFile({
  request,
  loading,
  onBack,
}: {
  request: PreloadRequest | null;
  loading: boolean;
  onBack(): void;
}) {
  if (!request) {
    return (
      <AdminRegion
        title="Preload request"
        headerless
        scroll={false}
        data-testid="admin-request-file"
      >
        {loading ? (
          <Stack gap={12} p={20} aria-busy="true">
            <Skeleton height={20} width={240} />
            <Skeleton height={28} />
          </Stack>
        ) : (
          <Stack gap={8} align="flex-start" p={20}>
            <Text fw={700} size="lg" c="var(--color-ink)">
              Preload request not found
            </Text>
            <Text size="sm" c="var(--color-ink-muted)">
              It may have been removed, or the link is wrong.
            </Text>
            <Button type="button" variant="default" onClick={onBack}>
              Back to table
            </Button>
          </Stack>
        )}
      </AdminRegion>
    );
  }

  const snapshot = request.presetSnapshot;
  const place = snapshot.placeLabel ?? snapshot.name;

  return (
    <AdminRegion title="Preload request" headerless data-testid="admin-request-file">
      <Stack gap={12} px={20} pt={18} pb={20}>
        <Box style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px 14px" }}>
          <Box
            component="span"
            style={{ color: "var(--color-flag)", fontSize: 13, fontWeight: 600 }}
          >
            Preload request
          </Box>
          <StatusMark
            tone={TONE[preloadRequestStatusChipTone(request.status)]}
            label={titleCase(preloadRequestStatusChipLabel(request.status))}
          />
          <Box component="span" style={{ color: "var(--color-ink-muted)" }}>
            {place} · {snapshot.gameSize} · {formatFreshnessAge(request.createdAt)}
          </Box>
        </Box>
        <Box
          component="h2"
          m={0}
          style={{
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: "-0.01em",
            lineHeight: 1.25,
            color: "var(--color-ink)",
            textWrap: "balance",
          }}
        >
          {snapshot.name}
        </Box>
        <AdminPreloadRequestDetail key={request.id} request={request} />
      </Stack>
    </AdminRegion>
  );
}
