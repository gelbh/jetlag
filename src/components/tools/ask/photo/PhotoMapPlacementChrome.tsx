/**
 * Map-first Photo chrome: prompt + Send (no GPS; Photo has no placement).
 */
import { Button } from "@mantine/core";
import { PaperPlaneTiltIcon } from "@phosphor-icons/react";
import { HudPhotoIcon } from "@/components/map/icons/ToolIcons";
import {
  AskMapPlacementChrome,
  type AskMapPlacementPhase,
  askMapPlacementSendStyles,
} from "@/components/tools/ask/AskMapPlacementChrome";
import { mapChromeSurfaceStyles } from "@/components/ui/entry/entryChrome";

export type PhotoMapPlacementChromeProps = {
  categoryLabel: string;
  questionPrompt: string;
  costLabel?: string;
  error?: string | null;
  canCommit?: boolean;
  isSubmitting?: boolean;
  onCommit?: () => void;
  onChangeCategory?: () => void;
};

export function PhotoMapPlacementChrome({
  categoryLabel,
  questionPrompt,
  costLabel,
  error = null,
  canCommit = false,
  isSubmitting = false,
  onCommit,
  onChangeCategory,
}: PhotoMapPlacementChromeProps) {
  const phase: AskMapPlacementPhase = "answer";
  const answerSlot = (
    <div
      data-testid="photo-map-placement-answer"
      className="flex flex-col gap-2"
      style={{
        ...mapChromeSurfaceStyles,
        borderRadius: 16,
        padding: "0.55rem",
        color: "var(--color-field-ink)",
      }}
    >
      {error ? (
        <p className="m-0 px-1 text-xs leading-snug" style={{ color: "var(--color-halt)" }}>
          {error}
        </p>
      ) : null}
      <Button
        type="button"
        fullWidth
        onClick={onCommit}
        disabled={!canCommit || isSubmitting}
        aria-busy={isSubmitting || undefined}
        leftSection={
          isSubmitting ? undefined : <PaperPlaneTiltIcon size={16} weight="fill" aria-hidden />
        }
        styles={askMapPlacementSendStyles}
      >
        {isSubmitting ? "Sending…" : "Send to hiders"}
      </Button>
    </div>
  );

  return (
    <AskMapPlacementChrome
      testId="photo-map-placement"
      toolTitle="Photo"
      configureLabel={categoryLabel}
      questionPrompt={questionPrompt}
      costLabel={costLabel}
      phase={phase}
      onUseGps={() => undefined}
      error={null}
      statusTitle=""
      statusBody=""
      toolIcon={<HudPhotoIcon width={20} height={20} />}
      questionAriaLabel="Photo question"
      onChangeConfigure={onChangeCategory}
      changeConfigureAriaLabel="Change photo ask"
      changeConfigureTestId="photo-change-category"
      answerSlot={answerSlot}
      answerTall={false}
    />
  );
}
