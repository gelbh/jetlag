import { PaperPlaneTiltIcon } from "@phosphor-icons/react";
import { HudTentacleIcon } from "@/components/map/icons/ToolIcons";
import {
  AskMapPlacementChrome,
  type AskMapPlacementPhase,
  askMapPlacementSendStyles,
} from "@/components/tools/ask/AskMapPlacementChrome";
import { EntryAsyncButton } from "@/components/ui/entry/EntryAsyncButton";
import { mapChromeSurfaceStyles } from "@/components/ui/entry/entryChrome";
import type { TentaclePoi } from "@/domain/map/annotations";
import type { DistanceUnit } from "@/domain/map/distance";
import type { TentacleExtendedCategoryId } from "@/domain/questions";
import type { LoadTask } from "@/services/core/progress/loadTask";
import { TentacleMapAnswerStrip } from "./TentacleMapAnswerStrip";

export type TentacleMapPlacementPhase = AskMapPlacementPhase;

export type TentacleMapPlacementChromeProps = {
  categoryLabel: string;
  questionPrompt: string;
  costLabel?: string;
  phase: TentacleMapPlacementPhase;
  onUseGps: () => void;
  gpsLoading?: boolean;
  error?: string | null;
  /** Live progress for the resolve shown in the status card. */
  loadTask?: LoadTask | null;
  awaitHiderAnswer?: boolean;
  categoryId: TentacleExtendedCategoryId;
  distanceUnit: DistanceUnit;
  searchRadiusMeters: number;
  poiOptions: TentaclePoi[];
  selectedPoiId: string | null;
  outOfReach: boolean;
  onOutOfReachChange: (outOfReach: boolean) => void;
  canCommit?: boolean;
  isSubmitting?: boolean;
  onCommit?: () => void;
  onChangeCategory?: () => void;
  statusTitle: string;
  statusBody: string;
};

export function TentacleMapPlacementChrome({
  categoryLabel,
  questionPrompt,
  costLabel,
  phase,
  onUseGps,
  gpsLoading = false,
  error = null,
  loadTask = null,
  awaitHiderAnswer = false,
  categoryId,
  distanceUnit,
  searchRadiusMeters,
  poiOptions,
  selectedPoiId,
  outOfReach,
  onOutOfReachChange,
  canCommit = false,
  isSubmitting = false,
  onCommit,
  onChangeCategory,
  statusTitle,
  statusBody,
}: TentacleMapPlacementChromeProps) {
  const hasAnswer = outOfReach || selectedPoiId !== null;

  const answerSlot =
    phase === "answer" ? (
      <div data-testid="tentacle-map-placement-answer" className="flex flex-col gap-2">
        {!awaitHiderAnswer ? (
          <TentacleMapAnswerStrip
            categoryId={categoryId}
            distanceUnit={distanceUnit}
            searchRadiusMeters={searchRadiusMeters}
            poiOptions={poiOptions}
            selectedPoiId={selectedPoiId}
            outOfReach={outOfReach}
            onOutOfReachChange={onOutOfReachChange}
            showCopyForHider
          />
        ) : null}

        {awaitHiderAnswer || hasAnswer ? (
          <div
            data-testid="tentacle-map-placement-send"
            className="flex flex-col gap-2"
            style={{
              ...mapChromeSurfaceStyles,
              borderRadius: 16,
              padding: "0.55rem",
              color: "var(--color-field-ink)",
            }}
          >
            <EntryAsyncButton
              type="button"
              fullWidth
              busy={isSubmitting}
              unavailable={!canCommit}
              idleLabel={awaitHiderAnswer ? "Send to hiders" : "Send"}
              busyLabel={awaitHiderAnswer ? "Sending…" : "…"}
              leftSection={<PaperPlaneTiltIcon size={16} weight="fill" aria-hidden />}
              styles={askMapPlacementSendStyles}
              onClick={onCommit}
            />
          </div>
        ) : null}
      </div>
    ) : null;

  return (
    <AskMapPlacementChrome
      testId="tentacle-map-placement"
      toolTitle="Tentacles"
      configureLabel={categoryLabel}
      questionPrompt={questionPrompt}
      costLabel={costLabel}
      phase={phase}
      onUseGps={onUseGps}
      gpsLoading={gpsLoading}
      showSnapLocation
      isSubmitting={isSubmitting}
      error={error}
      statusTitle={statusTitle}
      statusBody={statusBody}
      statusTask={loadTask}
      toolIcon={<HudTentacleIcon width={20} height={20} />}
      questionAriaLabel="Tentacle question"
      onChangeConfigure={onChangeCategory}
      changeConfigureAriaLabel="Change category"
      answerSlot={answerSlot}
      answerTall={false}
    />
  );
}
