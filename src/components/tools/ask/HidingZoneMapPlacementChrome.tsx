/**
 * Map-first hiding-zone chrome: shared placement shell + place/confirm slots (no GPS).
 */
import { useLayoutEffect } from "react";
import { Button } from "@mantine/core";
import { CheckIcon } from "@phosphor-icons/react";
import { HudZoneIcon } from "@/components/map/icons/ToolIcons";
import { TransitStationPicker } from "@/components/hider/TransitStationPicker";
import {
  AskMapPlacementChrome,
  askMapPlacementSendStyles,
} from "@/components/tools/ask/AskMapPlacementChrome";
import { mapChromeSurfaceStyles } from "@/components/ui/entry/entryChrome";
import type { HidingZoneStepId } from "@/components/hider/hidingZoneSteps";
import type { HidingZoneToolPanelState } from "@/components/hider/hidingZoneToolPanelState";

export type HidingZoneMapPlacementChromeProps = {
  moveMode: boolean;
  radiusLabel: string;
  zoneTool: HidingZoneToolPanelState;
  onSearchThisArea: () => void;
  onStepChange?: (stepId: HidingZoneStepId) => void;
  onDismiss?: () => void;
  /** Re-open method chips (create flow only). */
  onBackToMethod?: () => void;
  /** Mirror sheet viewOnly: false disables Confirm. */
  writesEnabled?: boolean;
};

function resolveStep(
  moveMode: boolean,
  methodChosen: boolean,
  hasPlacement: boolean,
): HidingZoneStepId {
  if (moveMode) {
    return hasPlacement ? "confirm" : "location";
  }
  if (!methodChosen) {
    return "method";
  }
  return hasPlacement ? "confirm" : "location";
}

function placementSummary(zoneTool: HidingZoneToolPanelState): {
  label: string;
  detail?: string;
} {
  if (zoneTool.manualMode) {
    if (zoneTool.manualCenter) {
      return {
        label: "Dropped on the map",
        detail: `${zoneTool.manualCenter[0].toFixed(5)}, ${zoneTool.manualCenter[1].toFixed(5)}`,
      };
    }
    return { label: "Map placement" };
  }
  return {
    label: zoneTool.selectedStation?.name ?? "No station selected",
  };
}

export function HidingZoneMapPlacementChrome({
  moveMode,
  radiusLabel,
  zoneTool,
  onSearchThisArea,
  onStepChange,
  onDismiss,
  onBackToMethod,
  writesEnabled = true,
}: HidingZoneMapPlacementChromeProps) {
  const step = resolveStep(
    moveMode,
    zoneTool.methodChosen,
    zoneTool.hasPlacement,
  );
  const showStationPicker =
    !zoneTool.manualMode && (step === "location" || step === "confirm");

  // Layout: sync step before paint so mapPickEnabled / stations layer match overlay.
  useLayoutEffect(() => {
    onStepChange?.(step);
  }, [onStepChange, step]);

  const toolTitle = moveMode ? "Move zone" : "Set zone";
  const questionPrompt = zoneTool.manualMode
    ? step === "confirm"
      ? "Confirm your zone center, or tap the map to adjust."
      : "Tap the map inside the play area to set your zone center."
    : step === "confirm"
      ? "Confirm your station, or pick another on the map."
      : "Tap a transit station on the map to place your zone.";

  // Banner already owns questionPrompt + radius (configureLabel). Mid is
  // placement artifact only: station picker, manual confirm summary, or move cues.
  const summary =
    step === "confirm" && !showStationPicker
      ? placementSummary(zoneTool)
      : null;
  const showMoveCues = moveMode;
  const showMid =
    showStationPicker || summary !== null || showMoveCues;

  const midSlot = showMid ? (
    <div
      data-testid="hiding-zone-map-placement-mid"
      className="mx-auto w-full max-w-[22rem]"
      style={{
        ...mapChromeSurfaceStyles,
        borderRadius: 16,
        padding: "0.55rem",
        color: "var(--color-field-ink)",
      }}
    >
      {showMoveCues ? (
        <p
          className="m-0 mb-2 text-xs"
          style={{ color: "var(--color-field-ink-muted)" }}
        >
          Timer paused while you relocate.
        </p>
      ) : null}
      {showStationPicker ? (
        <div className="pointer-events-auto jl-scroll max-h-[min(36dvh,16rem)] overflow-y-auto">
          <TransitStationPicker
            layout="compact"
            query={zoneTool.query}
            onQueryChange={zoneTool.setQuery}
            stations={zoneTool.stations}
            stationsLoading={zoneTool.stationsLoading}
            stationsError={zoneTool.stationsError}
            selectedStation={zoneTool.selectedStation}
            onSelectStation={zoneTool.setSelectedStation}
            onClearStation={zoneTool.clearStationSelection}
            onSearchThisArea={onSearchThisArea}
            searchDisabled={zoneTool.stationsLoading}
          />
        </div>
      ) : null}
      {summary ? (
        <>
          <p
            className="m-0 text-xs font-medium uppercase tracking-wide"
            style={{ color: "var(--color-field-ink-muted)" }}
          >
            Zone center
          </p>
          <p
            className="m-0 mt-1 text-sm font-medium"
            title={summary.detail}
          >
            {summary.label}
          </p>
        </>
      ) : null}
      {showMoveCues ? (
        <p
          className="m-0 mt-1.5 text-xs"
          style={{ color: "var(--color-status-warning, var(--color-flag))" }}
        >
          Move must be at least 50 m from your previous zone.
        </p>
      ) : null}
    </div>
  ) : undefined;

  const answerSlot = (
    <div
      data-testid="hiding-zone-map-placement-answer"
      className="flex flex-col gap-2"
      style={{
        ...mapChromeSurfaceStyles,
        borderRadius: 16,
        padding: "0.55rem",
        color: "var(--color-field-ink)",
      }}
    >
      {zoneTool.error ? (
        <p
          className="m-0 px-1 text-xs leading-snug"
          style={{ color: "var(--color-halt)" }}
          role="alert"
        >
          {zoneTool.error}
        </p>
      ) : null}
      <Button
        type="button"
        fullWidth
        onClick={() => {
          void zoneTool.confirmZone();
        }}
        disabled={
          !writesEnabled || !zoneTool.hasPlacement || zoneTool.saving
        }
        aria-busy={zoneTool.saving || undefined}
        leftSection={
          zoneTool.saving ? undefined : (
            <CheckIcon size={16} weight="bold" aria-hidden />
          )
        }
        styles={askMapPlacementSendStyles}
      >
        {zoneTool.saving ? "Saving…" : "Confirm"}
      </Button>
      {onDismiss && !moveMode ? (
        <Button
          type="button"
          fullWidth
          variant="default"
          onClick={onDismiss}
          styles={{
            root: {
              minHeight: "2.5rem",
              height: "2.5rem",
              borderRadius: 8,
              fontSize: "0.8125rem",
            },
          }}
        >
          Cancel
        </Button>
      ) : null}
    </div>
  );

  return (
    <AskMapPlacementChrome
      testId="hiding-zone-map-placement"
      toolTitle={toolTitle}
      configureLabel={radiusLabel}
      questionPrompt={questionPrompt}
      phase="answer"
      onUseGps={() => undefined}
      statusTitle=""
      statusBody=""
      toolIcon={<HudZoneIcon width={20} height={20} />}
      questionAriaLabel={`${toolTitle} placement`}
      onChangeConfigure={
        !moveMode && onBackToMethod ? onBackToMethod : undefined
      }
      changeConfigureAriaLabel="Change placement method"
      midSlot={midSlot}
      answerSlot={answerSlot}
      answerTall={showStationPicker}
    />
  );
}
