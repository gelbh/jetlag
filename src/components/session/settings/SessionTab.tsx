import { useState, type ReactNode } from "react";
import { Button, Stack } from "@mantine/core";
import {
  BookOpen,
  Export,
  Scroll,
  WarningCircle,
} from "@phosphor-icons/react";
import { SettingsToggleRow } from "../settings/SettingsToggleRow";
import {
  InsetGroup,
  SectionLabel,
} from "@/components/ui/entry/entryChrome";
import { InsetRow } from "@/components/ui/entry/InsetRow";

const haltQuietRoot = {
  minHeight: "2.875rem",
  borderRadius: 14,
  border: "none",
  fontWeight: 590,
  backgroundColor: "oklch(from var(--color-halt) l c h / 0.16)",
  color: "var(--color-field-ink)",
  "&:hover": {
    backgroundColor: "oklch(from var(--color-halt) l c h / 0.22)",
  },
  "&:disabled": {
    opacity: 0.45,
  },
} as const;

const haltSolidRoot = {
  minHeight: "2.875rem",
  borderRadius: 14,
  border: "none",
  fontWeight: 590,
  backgroundColor: "var(--color-halt)",
  color: "var(--color-field-ink)",
  "&:hover": {
    backgroundColor: "oklch(from var(--color-halt) calc(l + 0.03) c h)",
  },
} as const;

export interface MapSettingsSessionTabProps {
  remoteSession: boolean;
  keepScreenAwake: boolean;
  onKeepScreenAwakeChange: (enabled: boolean) => void;
  lowPowerMode: boolean;
  onLowPowerModeChange: (enabled: boolean) => void;
  onClearMap?: () => void;
  onExport?: () => void;
  isHost: boolean;
  onResetBoard?: () => void;
  onResetSession?: () => void;
  onEndSession?: () => void;
  onLeaveSession?: () => void;
  endGameBlocked?: boolean;
  expansionPackEnabled?: boolean;
  onOpenCurseReference?: () => void;
  onReportProblem?: () => void;
  onReviewMapTools?: () => void;
}

export function MapSettingsSessionTab({
  remoteSession,
  keepScreenAwake,
  onKeepScreenAwakeChange,
  lowPowerMode,
  onLowPowerModeChange,
  onClearMap,
  onExport,
  isHost,
  onResetBoard,
  onResetSession,
  onEndSession,
  onLeaveSession,
  endGameBlocked = false,
  expansionPackEnabled = false,
  onOpenCurseReference,
  onReportProblem,
  onReviewMapTools,
}: MapSettingsSessionTabProps) {
  const [resetMenuOpen, setResetMenuOpen] = useState(false);

  const helpItems: Array<{
    key: string;
    label: string;
    icon: ReactNode;
    onClick: () => void;
    tone?: "default" | "halt";
  }> = [];
  if (onReviewMapTools) {
    helpItems.push({
      key: "guide",
      label: "Map tools guide",
      icon: <BookOpen size={20} weight="duotone" />,
      onClick: onReviewMapTools,
    });
  }
  if (onReportProblem) {
    helpItems.push({
      key: "report",
      label: "Report a problem",
      icon: <WarningCircle size={20} weight="duotone" />,
      onClick: onReportProblem,
    });
  }
  if (expansionPackEnabled && onOpenCurseReference) {
    helpItems.push({
      key: "curse",
      label: "Expansion curse reference",
      icon: <Scroll size={20} weight="duotone" />,
      onClick: onOpenCurseReference,
    });
  }
  if (onExport) {
    helpItems.push({
      key: "export",
      label: "Export map",
      icon: <Export size={20} weight="duotone" />,
      onClick: onExport,
    });
  }

  return (
    <Stack gap="lg">
      <Stack gap="xs">
        <SectionLabel>Device & alerts</SectionLabel>
        <InsetGroup>
          <SettingsToggleRow
            label="Keep screen awake"
            checked={keepScreenAwake}
            onChange={onKeepScreenAwakeChange}
          />
          <SettingsToggleRow
            showSeparator
            label="Low power mode"
            description="Reduces GPS polling, live transit, animations, and background downloads. Core session sync and tools stay available."
            checked={lowPowerMode}
            onChange={onLowPowerModeChange}
          />
        </InsetGroup>
      </Stack>

      {helpItems.length > 0 ? (
        <Stack gap="xs">
          <SectionLabel>Help</SectionLabel>
          <InsetGroup>
            {helpItems.map((item, index) => (
              <InsetRow
                key={item.key}
                label={item.label}
                icon={item.icon}
                onClick={item.onClick}
                showSeparator={index > 0}
                tone={item.tone}
              />
            ))}
          </InsetGroup>
        </Stack>
      ) : null}

      <Stack gap="xs">
        <SectionLabel>Danger zone</SectionLabel>
        {endGameBlocked ? (
          <p className="px-1 text-sm text-[var(--color-field-ink-muted)]">
            Clear map and reset board are unavailable during end game.
          </p>
        ) : null}
        <Stack gap="sm">
          {onClearMap ? (
            <Button
              fullWidth
              styles={{ root: haltQuietRoot }}
              disabled={endGameBlocked}
              onClick={onClearMap}
            >
              Clear map
            </Button>
          ) : null}

          {isHost ? (
            <>
              <Button
                fullWidth
                styles={{ root: haltQuietRoot }}
                aria-expanded={resetMenuOpen}
                onClick={() => setResetMenuOpen((open) => !open)}
              >
                {resetMenuOpen ? "Hide reset options" : "Reset options"}
              </Button>
              {resetMenuOpen ? (
                <InsetGroup>
                  <div className="flex flex-col gap-2 p-3">
                    <Button
                      fullWidth
                      styles={{
                        root: { ...haltQuietRoot, minHeight: "2.75rem" },
                      }}
                      disabled={endGameBlocked}
                      onClick={() => {
                        setResetMenuOpen(false);
                        onResetBoard?.();
                      }}
                    >
                      Reset board for everyone
                    </Button>
                    {remoteSession && onResetSession ? (
                      <>
                        <Button
                          fullWidth
                          styles={{
                            root: { ...haltSolidRoot, minHeight: "2.75rem" },
                          }}
                          onClick={() => {
                            setResetMenuOpen(false);
                            void onResetSession();
                          }}
                        >
                          Reset session progress
                        </Button>
                        <p className="text-xs leading-relaxed text-[var(--color-field-ink-muted)]">
                          Keeps the code and roster. Clears timer, map,
                          questions, chat, zones, traps, and end-game state.
                        </p>
                      </>
                    ) : null}
                  </div>
                </InsetGroup>
              ) : null}
              <Button
                fullWidth
                styles={{ root: haltSolidRoot }}
                onClick={onEndSession}
              >
                End session for everyone
              </Button>
            </>
          ) : null}

          {onLeaveSession ? (
            <Button
              fullWidth
              styles={{
                root: {
                  minHeight: "2.875rem",
                  borderRadius: 14,
                  border: "none",
                  fontWeight: 590,
                  backgroundColor: "oklch(from var(--color-rule) l c h / 0.45)",
                  color: "var(--color-field-ink)",
                  "&:hover": {
                    backgroundColor: "oklch(from var(--color-rule) l c h / 0.55)",
                  },
                },
              }}
              onClick={onLeaveSession}
            >
              Leave session
            </Button>
          ) : null}
        </Stack>
      </Stack>
    </Stack>
  );
}
