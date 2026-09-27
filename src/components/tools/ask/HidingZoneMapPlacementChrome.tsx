/**
 * Map-first hiding-zone chrome: shared placement shell + place/confirm slots (no GPS).
 */
import { useEffect } from "react";
import { Button } from "@mantine/core";
import { Check } from "@phosphor-icons/react";
import { HudZoneIcon } from "@/components/map/icons/ToolIcons";
import {
  AskMapPlacementChrome,
  askMapPlacementSendStyles,
} from "@/components/tools/ask/AskMapPlacementChrome";
import { mapChromeSurfaceStyles } from "@/components/ui/entry/entryChrome";
import type { HidingZoneToolPanelState } from "@/components/hider/HidingZonePanel";
import type { HidingZoneStepId } from "@/components/hider/hidingZoneSteps";

export type HidingZoneMapPlacementChromeProps = {
  moveMode: boolean;
  radiusLabel: string;
  zoneTool: HidingZoneToolPanelState;
  onSearchThisArea: () => void;
  onStepChange?: (stepId: HidingZoneStepId) => void;
  onDismiss?: () => void;
  /** Re-open method chips (create flow only). */
  onBackToMethod?: () => void;
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

function placementSummary(zoneTool: HidingZoneToolPanelState): string {
  if (zoneTool.manualMode) {
    if (zoneTool.manualCenter) {
      return `Map · ${zoneTool.manualCenter[0].toFixed(5)}, ${zoneTool.manualCenter[1].toFixed(5)}`;
    }
    return "Map placement";
  }
  return zoneTool.selectedStation?.name ?? "No station selected";
}

export function HidingZoneMapPlacementChrome({
  moveMode,
  radiusLabel,
  zoneTool,
  onSearchThisArea,
  onStepChange,
  onDismiss,
  onBackToMethod,
}: HidingZoneMapPlacementChromeProps) {
  const step = resolveStep(
    moveMode,
    zoneTool.methodChosen,
    zoneTool.hasPlacement,
  );

  useEffect(() => {
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

  const midSlot = (
    <div
      data-testid="hiding-zone-map-placement-mid"
      className="mx-auto w-full max-w-[22rem]"
      style={{
        ...mapChromeSurfaceStyles,
        borderRadius: 16,
        padding: "0.7rem 0.85rem",
        color: "var(--color-field-ink)",
      }}
    >
      {step === "confirm" ? (
        <>
          <p className="m-0 text-xs font-medium uppercase tracking-wide"
            style={{ color: "var(--color-field-ink-muted)" }}
          >
            Zone center
          </p>
          <p className="m-0 mt-1 text-sm font-medium">
            {placementSummary(zoneTool)}
          </p>
        </>
      ) : (
        <p className="m-0 text-sm">{questionPrompt}</p>
      )}
      <p
        className="m-0 mt-1.5 text-xs"
        style={{ color: "var(--color-field-ink-muted)" }}
      >
        Radius: {radiusLabel}
      </p>
      {moveMode ? (
        <p
          className="m-0 mt-1.5 text-xs"
          style={{ color: "var(--color-status-warning, var(--color-flag))" }}
        >
          Move must be at least 50 m from your previous zone.
        </p>
      ) : null}
      {!zoneTool.manualMode && step === "location" ? (
        <button
          type="button"
          className="pointer-events-auto mt-2 w-full text-xs font-semibold underline-offset-2"
          style={{
            background: "none",
            border: "none",
            padding: 0,
            color: "var(--color-flag)",
            textAlign: "left",
            textDecoration: "underline",
            cursor: "pointer",
          }}
          onClick={onSearchThisArea}
        >
          Search stations in this area
        </button>
      ) : null}
    </div>
  );

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
        disabled={!zoneTool.hasPlacement || zoneTool.saving}
        aria-busy={zoneTool.saving || undefined}
        leftSection={
          zoneTool.saving ? undefined : (
            <Check size={16} weight="bold" aria-hidden />
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
      answerTall={false}
    />
  );
}
