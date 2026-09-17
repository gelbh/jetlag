import type { ReactNode } from "react";
import { Button, Group, Paper, Text } from "@mantine/core";
import { SheetCloseButton } from "../sheets/SheetCloseButton";
import {
  iosGrayStyles,
  iosMapChromeSurfaceStyles,
} from "../apple/iosEntryChrome";
import { usePlayerUiMantine } from "@/hooks/feature/usePlayerUiMantine";

interface HudDetailPanelProps {
  panelClassName: string;
  ariaLabel: string;
  leading: ReactNode;
  title: ReactNode;
  titleClassName?: string;
  onClose: () => void;
  closeLabel: string;
  body?: ReactNode;
  children?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

export function HudDetailPanel({
  panelClassName,
  ariaLabel,
  leading,
  title,
  titleClassName = "",
  onClose,
  closeLabel,
  body,
  children,
  actionLabel,
  onAction,
}: HudDetailPanelProps) {
  const mantinePlayerUi = usePlayerUiMantine();

  if (mantinePlayerUi) {
    return (
      <Paper
        className={`${panelClassName} jl-panel-enter pointer-events-auto`}
        role="dialog"
        aria-label={ariaLabel}
        radius={16}
        p="sm"
        styles={{
          root: {
            ...iosMapChromeSurfaceStyles,
            borderRadius: 16,
            minWidth: "14rem",
            maxWidth: "min(20rem, calc(100vw - 1.5rem))",
            color: "var(--color-field-ink)",
          },
        }}
      >
        <Group justify="space-between" align="flex-start" gap="sm" wrap="nowrap">
          <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
            {leading}
            <Text
              component="p"
              fw={700}
              size="sm"
              className={titleClassName}
              style={{ margin: 0, lineHeight: 1.25 }}
            >
              {title}
            </Text>
          </Group>
          <SheetCloseButton onClick={onClose} label={closeLabel} variant="icon" />
        </Group>

        {children}

        {body ? (
          <Text
            component="p"
            size="sm"
            mt="sm"
            style={{ color: "var(--color-field-ink-muted)", marginBottom: 0 }}
          >
            {body}
          </Text>
        ) : null}

        {actionLabel && onAction ? (
          <Button
            fullWidth
            mt="sm"
            onClick={onAction}
            styles={iosGrayStyles}
          >
            {actionLabel}
          </Button>
        ) : null}
      </Paper>
    );
  }

  return (
    <div
      className={`${panelClassName} jl-panel-enter pointer-events-auto`}
      role="dialog"
      aria-label={ariaLabel}
    >
      <div className="jl-sync-detail-panel__row">
        {leading}
        <p className={titleClassName}>{title}</p>
        <SheetCloseButton
          onClick={onClose}
          label={closeLabel}
          variant="icon"
        />
      </div>

      {children}

      {body ? <p className="jl-sync-detail-panel__detail">{body}</p> : null}

      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="btn-secondary jl-sync-detail-panel__action"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
