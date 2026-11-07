import { Button, Group, Text } from "@mantine/core";
import type { SessionNoticeDraft, SessionNoticeRecord } from "@/domain/session/opsNotice";
import { MapFloatSurface } from "../../ui/banners/MapFloatSurface";
import { HudBanner } from "../../ui/hud/HudBanner";

type NoticeLike = Pick<SessionNoticeRecord, "text" | "tone"> | SessionNoticeDraft;

interface SessionOpsNoticeBannerProps {
  notice: NoticeLike | null;
  onDismiss?: () => void;
  preview?: boolean;
}

export function SessionOpsNoticeBanner({
  notice,
  onDismiss,
  preview = false,
}: SessionOpsNoticeBannerProps) {
  if (!notice) {
    return null;
  }

  const tone = notice.tone === "warn" ? "warn" : "info";

  return (
    <HudBanner
      visible
      className="pointer-events-none absolute inset-x-3 top-[var(--map-banner-top)] z-[var(--z-banner)]"
    >
      <MapFloatSurface
        tone={tone}
        title={preview ? "Preview - From support" : "From support"}
        role="status"
        aria-live="polite"
        actionRow
        data-testid="session-ops-notice-banner"
        className="pointer-events-auto mx-auto max-w-md"
      >
        <Group justify="space-between" align="center" wrap="nowrap" gap="sm" w="100%">
          <Text size="sm" className="text-pretty">
            {notice.text}
          </Text>
          {onDismiss ? (
            <Button type="button" size="compact-sm" variant="default" onClick={onDismiss}>
              Dismiss
            </Button>
          ) : null}
        </Group>
      </MapFloatSurface>
    </HudBanner>
  );
}
