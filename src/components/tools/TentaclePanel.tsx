import { type RefObject } from "react";
import { filterConfirmedTentaclePois } from "../../domain/geo/poiCandidateAdapters";
import type { TentaclePoi } from "../../domain/map/annotations";
import { type DistanceUnit, formatPresetDistance } from "../../domain/map/distance";
import {
  isTentacleCategoryAvailable,
  type TentacleExtendedCategoryId,
  tentacleCategoriesForGameSize,
  tentacleQuestionPrompt,
} from "../../domain/questions";
import type { GameSize } from "../../domain/session/size/gameSize";
import { useToolWizard } from "../../hooks/wizard/useToolWizard";
import { TentacleLocationsChord } from "./ask/tentacle/TentacleLocationsChord";
import { TentacleAnswerPicker } from "./shared/answers/TentacleAnswerPicker";
import { AnchorControls } from "./shared/controls/AnchorControls";
import { QuestionPromptBlock } from "./shared/controls/QuestionPromptBlock";
import { SendToHidersButton } from "./shared/controls/SendToHidersButton";
import { ToolPanelShell } from "./shared/panels/ToolPanelShell";
import { ToolSection } from "./shared/panels/ToolSection";
import { QuestionTruthReferenceHint } from "./shared/QuestionTruthReferenceHint";
import { ErrorWithRetry } from "./shared/readout/ErrorWithRetry";
import { LoadingReadout } from "./shared/readout/LoadingReadout";
import { ResolvedReadout } from "./shared/readout/ResolvedReadout";
import { TENTACLE_WIZARD } from "./shared/wizard/toolStepUtils";
import { toolWizardPhasePrimaryNav, toolWizardSwipeNext } from "./shared/wizard/toolWizardGuards";
import { WizardPanelFrame } from "./shared/wizard/WizardPanelFrame";
import { WizardSwipeSurface } from "./shared/wizard/WizardSwipeSurface";

/** Flat tentacle wizard fields bag for TentaclePanel (W4-F peel). */
export type TentaclePanelModel = {
  gameSize: GameSize;
  categoryId: TentacleExtendedCategoryId | null;
  categoryChosen: boolean;
  searchRadiusMeters: number;
  usedCategoryIds: ReadonlySet<TentacleExtendedCategoryId>;
  distanceUnit: DistanceUnit;
  poiOptions: TentaclePoi[];
  selectedPoiId: string | null;
  outOfReach: boolean;
  loading: boolean;
  awaitingPlacement: boolean;
  hasCenter: boolean;
  gpsLoading?: boolean;
  error?: string | null;
  onCategoryChange: (categoryId: TentacleExtendedCategoryId) => void;
  onUseGps: () => void;
  onPlaceAtMapTap: () => void;
  onSelectPoi: (poiId: string) => void;
  onOutOfReachChange: (outOfReach: boolean) => void;
  onCommit: () => void;
  awaitHiderAnswer?: boolean;
  costLabel?: string;
  isSubmitting?: boolean;
  onRetry?: () => void;
  wizardStepRef?: RefObject<string>;
};

export type TentaclePanelProps = {
  model: TentaclePanelModel;
};

export function TentaclePanel({ model }: TentaclePanelProps) {
  const {
    gameSize,
    categoryId,
    categoryChosen,
    searchRadiusMeters,
    distanceUnit,
    poiOptions,
    selectedPoiId,
    outOfReach,
    loading,
    awaitingPlacement,
    hasCenter,
    gpsLoading = false,
    error,
    onCategoryChange,
    onUseGps,
    onPlaceAtMapTap,
    onSelectPoi,
    onOutOfReachChange,
    onCommit,
    awaitHiderAnswer = false,
    costLabel = "D4P2",
    isSubmitting = false,
    onRetry,
    wizardStepRef,
  } = model;
  const { phaseId, stepId, phaseIndex, phaseCount, configureIndex, goNext, goBack, Stepper } =
    useToolWizard(TENTACLE_WIZARD, {
      wizardStepRef,
      awaitHiderAnswer,
      toolCommitLabel: awaitHiderAnswer ? `Send to hiders (${costLabel})` : "Add tentacle question",
      isSubmitting,
    });

  const prompt =
    categoryId !== null
      ? tentacleQuestionPrompt(categoryId, distanceUnit, searchRadiusMeters)
      : "Choose a category to build your tentacle question.";
  const searchRadiusLabel =
    categoryId !== null ? formatPresetDistance(searchRadiusMeters, distanceUnit) : null;
  const categorySelectionAvailable =
    categoryId !== null && isTentacleCategoryAvailable(gameSize, categoryId);
  const hasRecordedAnswer = outOfReach || selectedPoiId !== null;
  const confirmedPois = filterConfirmedTentaclePois(poiOptions);
  const locationsReady = confirmedPois.length > 0 || (!loading && hasCenter);
  const canCommit =
    categoryChosen &&
    categoryId !== null &&
    hasCenter &&
    confirmedPois.length > 0 &&
    (awaitHiderAnswer || hasRecordedAnswer) &&
    categorySelectionAvailable &&
    !isSubmitting;
  const availableCategories = tentacleCategoriesForGameSize(gameSize);

  const canGoNext =
    (phaseId === "place" && hasCenter && !loading) ||
    (phaseId === "configure" && stepId === "category" && categorySelectionAvailable) ||
    (phaseId === "configure" && stepId === "locations" && locationsReady && !loading);
  const canSwipeNext = toolWizardSwipeNext(canGoNext, phaseIndex, phaseCount);

  const tentacleSendActions =
    phaseId === "ask" &&
    awaitHiderAnswer &&
    locationsReady &&
    !loading &&
    confirmedPois.length > 0 ? (
      <SendToHidersButton
        costLabel={costLabel}
        isSubmitting={isSubmitting}
        disabled={!canCommit}
        onClick={onCommit}
        showButton={false}
        instruction='Hiders pick a location or "Not within reach" in game chat once you send this question.'
      />
    ) : null;

  const panelBody = (
    <>
      {phaseId === "configure" && stepId === "category" ? (
        <ToolSection first compact status="active">
          {awaitHiderAnswer ? <QuestionTruthReferenceHint /> : null}
          <QuestionPromptBlock
            prompt={prompt}
            ruleSummary={
              searchRadiusLabel
                ? `Search radius is fixed at ${searchRadiusLabel} from your anchor.`
                : undefined
            }
          />
          <label className="field-label">
            Location type
            <select
              value={categoryChosen && categoryId ? categoryId : ""}
              onChange={(event) => {
                const value = event.target.value;
                if (!value) {
                  return;
                }
                onCategoryChange(event.target.value as TentacleExtendedCategoryId);
              }}
              className="field-input"
            >
              <option value="">Choose a category</option>
              {availableCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </select>
          </label>
        </ToolSection>
      ) : null}

      {phaseId === "place" ? (
        <ToolSection first compact status="active">
          <AnchorControls
            awaitingPlacement={awaitingPlacement}
            hasAnchor={hasCenter}
            gpsLoading={gpsLoading}
            onUseGps={onUseGps}
            onPlaceAtMapTap={onPlaceAtMapTap}
            anchorHint="Anchor pinned on the map. Tap again to move it."
            gpsLoadingLabel="Locating…"
          />
          {loading && hasCenter && categoryChosen ? (
            <LoadingReadout>Loading locations within {searchRadiusLabel}…</LoadingReadout>
          ) : null}
        </ToolSection>
      ) : null}

      {phaseId === "configure" && stepId === "locations" ? (
        <ToolSection first compact status="active">
          {loading ? (
            <LoadingReadout>
              {poiOptions.length > 0
                ? `Confirming ${poiOptions.length} map preview${
                    poiOptions.length === 1 ? "" : "s"
                  }…`
                : `Loading locations within ${searchRadiusLabel}…`}
            </LoadingReadout>
          ) : poiOptions.length > 0 ? (
            <ResolvedReadout>
              {poiOptions.length} location{poiOptions.length === 1 ? "" : "s"} found within{" "}
              {searchRadiusLabel}.
            </ResolvedReadout>
          ) : (
            <ResolvedReadout variant="warning">
              No named locations were found within {searchRadiusLabel}.
            </ResolvedReadout>
          )}
        </ToolSection>
      ) : null}

      {phaseId === "ask" && !awaitHiderAnswer && categoryId ? (
        <TentacleLocationsChord className="ask-scroll-chord">
          <TentacleAnswerPicker
            poiOptions={poiOptions}
            selectedPoiId={selectedPoiId}
            outOfReach={outOfReach}
            onSelectPoi={onSelectPoi}
            onOutOfReachChange={onOutOfReachChange}
          />
        </TentacleLocationsChord>
      ) : null}
    </>
  );

  const stickyFooterActions = tentacleSendActions;

  const answerFooter = stickyFooterActions ? (
    <ToolSection first compact status="active">
      {stickyFooterActions}
    </ToolSection>
  ) : undefined;

  return (
    <ToolPanelShell
      toolId="tentacle"
      fillHeight
      stepper={
        <Stepper
          nav={{
            canGoBack: phaseIndex > 0 || (phaseId === "configure" && configureIndex > 0),
            onBack: goBack,
            ...toolWizardPhasePrimaryNav({
              phaseId,
              goNext,
              onCommit,
              canGoNext,
              canCommit,
            }),
          }}
        />
      }
    >
      <WizardPanelFrame
        scrollable
        stickyFooter={answerFooter}
        trailing={error ? <ErrorWithRetry error={error} onRetry={onRetry} /> : null}
      >
        <WizardSwipeSurface
          stepId={stepId}
          stepIndex={phaseIndex}
          canGoBack={phaseIndex > 0}
          canGoNext={canSwipeNext}
          onBack={goBack}
          onNext={goNext}
        >
          {panelBody}
        </WizardSwipeSurface>
      </WizardPanelFrame>
    </ToolPanelShell>
  );
}
