import { Progress, Text } from "@mantine/core";
import { HudRefreshIcon } from "../../ui/brand/HudIcons";
import { HudDetailPanel } from "../../ui/hud/HudDetailPanel";
import { loadingSpinnerClass } from "../../ui/feedback/loadingSpinnerClass";
import { preloadBeaconStyle } from "@/components/ui/entry/entryChrome";

interface GameAreaPreloadDetailPanelProps {
  loading: boolean;
  failed: boolean;
  title: string;
  body: string;
  completedJobs: number;
  totalJobs: number;
  onClose: () => void;
  onDismiss?: () => void;
}

export function GameAreaPreloadDetailPanel({
  loading,
  failed,
  title,
  body,
  completedJobs,
  totalJobs,
  onClose,
  onDismiss,
}: GameAreaPreloadDetailPanelProps) {
  const progress =
    totalJobs > 0 ? Math.min(100, (completedJobs / totalJobs) * 100) : 0;
  const statusClass = failed
    ? "jl-preload-detail-panel--failed"
    : "jl-preload-detail-panel--loading";
  const titleColor = failed
    ? "var(--color-flag)"
    : loading
      ? "var(--color-signal)"
      : "var(--color-field-ink)";

  return (
    <HudDetailPanel
      panelClassName={`jl-preload-detail-panel ${statusClass}`}
      ariaLabel={title}
      leading={
        <span
          className="jl-preload-beacon"
          style={preloadBeaconStyle(failed ? "failed" : "loading", "sm")}
          aria-hidden="true"
        >
          <HudRefreshIcon
            className={`stroke-[2.5] ${loadingSpinnerClass(loading)}`}
            style={{ width: "0.875rem", height: "0.875rem" }}
          />
        </span>
      }
      title={<span style={{ color: titleColor }}>{title}</span>}
      onClose={onClose}
      closeLabel="Close map preload details"
      actionLabel={failed && onDismiss ? "Dismiss" : undefined}
      onAction={onDismiss}
    >
      {loading ? (
        <div style={{ marginTop: "0.375rem", paddingLeft: "1.625rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: "0.5rem",
              marginBottom: "0.25rem",
            }}
          >
            <Text
              component="span"
              size="xs"
              fw={600}
              tt="uppercase"
              style={{
                letterSpacing: "0.08em",
                color: "var(--color-field-ink-muted)",
              }}
            >
              Progress
            </Text>
            <Text
              component="span"
              size="xs"
              fw={700}
              ff="monospace"
              style={{ color: "var(--color-highlight)" }}
              aria-live="polite"
            >
              {completedJobs}/{totalJobs}
            </Text>
          </div>
          <Progress
            value={progress}
            size={4}
            radius="xl"
            aria-label={`Map preload progress, ${completedJobs} of ${totalJobs}`}
            styles={{
              root: {
                backgroundColor: "oklch(from var(--color-field-ink) l c h / 0.1)",
              },
              section: {
                backgroundColor: "var(--color-signal)",
              },
            }}
          />
        </div>
      ) : null}
      <Text
        component="p"
        size="sm"
        mt="xs"
        style={{
          paddingLeft: "1.625rem",
          color: "var(--color-field-ink-muted)",
          marginBottom: 0,
        }}
      >
        {body}
      </Text>
    </HudDetailPanel>
  );
}
