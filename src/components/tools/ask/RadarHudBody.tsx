/**
 * Radar Ask HUD — Matching twin: question header + distance catalog, then map-first.
 * Sheet path keeps placement/answer when Mantine map-first is off.
 */
import { Text } from "@mantine/core";
import { useEffect, useRef } from "react";
import { Check, Crosshair, PencilSimple } from "@phosphor-icons/react";
import { AskCatalogRail } from "@/components/tools/ask/AskCatalogRail";
import { AskToolQuestionHeader } from "@/components/tools/ask/AskToolQuestionHeader";
import { HudRadarIcon } from "@/components/map/icons/ToolIcons";
import { RadarDistancePicker } from "@/components/tools/RadarDistancePicker";
import { yesNoAnswerOptions } from "@/components/tools/shared/answers/binaryAnswerOptions";
import { BinaryAnswerPicker } from "@/components/tools/shared/answers/BinaryAnswerPicker";
import { AnchorControls } from "@/components/tools/shared/controls/AnchorControls";
import { CatalogExhaustedMessage } from "@/components/tools/shared/readout/CatalogExhaustedMessage";
import { QuestionTruthReferenceHint } from "@/components/tools/shared/QuestionTruthReferenceHint";
import { ViewOnlyQuestionBanner } from "@/components/tools/shared/readout/ViewOnlyQuestionBanner";
import { iosAskInsetSurfaceStyle } from "@/components/ui/apple/iosEntryChrome";
import {
  distanceUnitLabel,
  formatDistance,
  milesToMeters,
  parseDistanceInput,
  type DistanceUnit,
} from "@/domain/map/distance";
import {
  availableRadarDistancePresets,
  isRadarRadiusAllowedForGameSize,
  maxRadarCustomRadiusMeters,
  radarDistanceOptionLabel,
  radarQuestionPrompt,
  type RadarAnswer,
  type RadarDistanceOptionKey,
} from "@/domain/questions";
import type { GameSize } from "@/domain/session/size/gameSize";
const RADAR_QUESTION_INTRO = {
  prompt: "Are you within [distance] of me?",
  ruleSummary:
    "Pick a distance below. After you set your center on the map, Yes means the hider is inside that range.",
};

const CHOOSE_ROW_ID = "choose";

/** Digits + one decimal; commas normalize to `.` for EU keyboards. */
function sanitizeRadarCustomRadiusInput(raw: string): string {
  let out = "";
  let seenDot = false;
  for (const ch of raw) {
    if (ch >= "0" && ch <= "9") {
      out += ch;
      continue;
    }
    if ((ch === "." || ch === ",") && !seenDot) {
      out += ".";
      seenDot = true;
    }
  }
  return out;
}

function radarCustomUnitShort(unit: DistanceUnit): string {
  return unit === "imperial" ? "mi" : "m";
}


export type RadarHudBodyProps = {
  radiusMeters: number | null;
  chooseCustom: boolean;
  customRadius: string;
  awaitingPlacement: boolean;
  hasCenter: boolean;
  distanceUnit: DistanceUnit;
  gameSize: GameSize;
  usedDistanceOptions: ReadonlySet<RadarDistanceOptionKey>;
  answer: RadarAnswer | null;
  onPresetSelect: (radiusMeters: number) => void;
  onChooseSelect: () => void;
  onCustomRadiusChange: (value: string) => void;
  /** Finish custom distance (Enter / blur) so map-first can continue. */
  onCustomDistanceCommit?: () => void;
  onAnswerChange: (answer: RadarAnswer) => void;
  onUseGps: () => void;
  onPlaceAtMapTap: () => void;
  gpsLoading: boolean;
  awaitHiderAnswer?: boolean;
  viewOnly?: boolean;
  costLabel?: string | null;
  toolLabel?: string;
  /** Reopen distance catalog (map-first change-distance). */
  editingDistance?: boolean;
};

function presetLabel(preset: number, distanceUnit: DistanceUnit): string {
  return distanceUnit === "metric"
    ? formatDistance(preset, distanceUnit)
    : radarDistanceOptionLabel(preset / milesToMeters(1), distanceUnit);
}

export function RadarHudBody({
  radiusMeters,
  chooseCustom,
  customRadius,
  awaitingPlacement,
  hasCenter,
  distanceUnit,
  gameSize,
  usedDistanceOptions,
  answer,
  onPresetSelect,
  onChooseSelect,
  onCustomRadiusChange,
  onCustomDistanceCommit,
  onAnswerChange,
  onUseGps,
  onPlaceAtMapTap,
  gpsLoading,
  awaitHiderAnswer = false,
  viewOnly = false,
  costLabel = null,
  toolLabel = "Radar",
  editingDistance = false,
}: RadarHudBodyProps) {
  const chooseInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!chooseCustom || !true) {
      return;
    }
    chooseInputRef.current?.focus();
  }, [chooseCustom, true]);
  const resolvedRadius = chooseCustom
    ? (parseDistanceInput(customRadius, distanceUnit) ?? radiusMeters)
    : radiusMeters;
  const distanceSelectionAvailable =
    resolvedRadius !== null &&
    isRadarRadiusAllowedForGameSize(
      gameSize,
      resolvedRadius,
      distanceUnit,
      chooseCustom,
    );
  const showAnswer =
    !awaitHiderAnswer &&
    !viewOnly &&
    hasCenter &&
    distanceSelectionAvailable;

  const availablePresets = availableRadarDistancePresets(
    gameSize,
    distanceUnit,
    usedDistanceOptions,
  );
  const chooseAvailable = !usedDistanceOptions.has("choose");
  const exhausted = availablePresets.length === 0 && !chooseAvailable;
  const maxCustomRadiusMeters = maxRadarCustomRadiusMeters(
    gameSize,
    distanceUnit,
  );
  const parsedCustomRadius = parseDistanceInput(customRadius, distanceUnit);
  const customRadiusOverLimit =
    chooseCustom &&
    parsedCustomRadius !== null &&
    parsedCustomRadius > maxCustomRadiusMeters;

  const distanceChosen =
    chooseCustom || (radiusMeters !== null && radiusMeters > 0);
  const question = distanceChosen
    ? {
        prompt: radarQuestionPrompt(
          resolvedRadius ?? radiusMeters ?? 0,
          distanceUnit,
        ),
        ruleSummary: RADAR_QUESTION_INTRO.ruleSummary,
      }
    : RADAR_QUESTION_INTRO;

  const unitShort = radarCustomUnitShort(distanceUnit);
  const canCommitCustom =
    chooseCustom &&
    distanceSelectionAvailable &&
    !customRadiusOverLimit;
  const catalogRows = [
    ...availablePresets.map((preset) => ({
      id: String(preset),
      label: presetLabel(preset, distanceUnit),
      icon: (
        <Crosshair
          size={20}
          weight="duotone"
          color="currentColor"
          aria-hidden
        />
      ),
    })),
    ...(chooseAvailable
      ? [
          {
            id: CHOOSE_ROW_ID,
            label: `Choose custom distance (${unitShort})`,
            icon: (
              <PencilSimple
                size={20}
                weight="duotone"
                color="currentColor"
                aria-hidden
              />
            ),
            content: (
              <span
                className="inline-flex w-full min-w-0 items-center justify-center gap-0.5 px-0.5"
                onClick={(event) => event.stopPropagation()}
              >
                <input
                  ref={chooseInputRef}
                  data-testid="radar-choose-distance-input"
                  value={customRadius}
                  onChange={(event) => {
                    const next = sanitizeRadarCustomRadiusInput(
                      event.currentTarget.value,
                    );
                    if (!chooseCustom) {
                      onChooseSelect();
                    }
                    onCustomRadiusChange(next);
                  }}
                  onFocus={() => {
                    if (!chooseCustom) {
                      onChooseSelect();
                    }
                  }}
                  onKeyDown={(event) => {
                    event.stopPropagation();
                    if (event.key !== "Enter") {
                      return;
                    }
                    event.preventDefault();
                    if (
                      distanceSelectionAvailable &&
                      !customRadiusOverLimit
                    ) {
                      onCustomDistanceCommit?.();
                    }
                  }}
                  inputMode="decimal"
                  enterKeyHint="done"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="0"
                  aria-label={`Custom distance in ${distanceUnitLabel(distanceUnit)}`}
                  aria-invalid={customRadiusOverLimit || undefined}
                  style={{
                    width: "100%",
                    minWidth: 0,
                    border: "none",
                    background: "transparent",
                    textAlign: "right",
                    font: "inherit",
                    fontWeight: 650,
                    fontSize: "0.8125rem",
                    lineHeight: 1.1,
                    color: customRadiusOverLimit
                      ? "var(--color-halt)"
                      : "var(--color-field-ink)",
                    outline: "none",
                    padding: 0,
                    caretColor: "var(--color-flag)",
                  }}
                />
                <span
                  aria-hidden
                  style={{
                    flexShrink: 0,
                    fontSize: "0.6875rem",
                    fontWeight: 650,
                    letterSpacing: "0.02em",
                    color: "var(--color-field-ink-muted)",
                    lineHeight: 1,
                  }}
                >
                  {unitShort}
                </span>
                {canCommitCustom ? (
                  <button
                    type="button"
                    data-testid="radar-choose-distance-commit"
                    aria-label="Use this distance"
                    onMouseDown={(event) => {
                      // Keep focus until click so blur does not double-commit.
                      event.preventDefault();
                    }}
                    onClick={(event) => {
                      event.stopPropagation();
                      onCustomDistanceCommit?.();
                    }}
                    style={{
                      flexShrink: 0,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 28,
                      height: 28,
                      marginLeft: 2,
                      border: "none",
                      borderRadius: 9,
                      backgroundColor:
                        "oklch(from var(--color-flag) l c h / 0.2)",
                      color: "var(--color-flag)",
                      padding: 0,
                      cursor: "pointer",
                    }}
                  >
                    <Check size={16} weight="bold" aria-hidden />
                  </button>
                ) : null}
              </span>
            ),
          },
        ]
      : []),
  ];

  const selectedCatalogId = chooseCustom
    ? CHOOSE_ROW_ID
    : radiusMeters
      ? String(radiusMeters)
      : null;

  /** Catalog-first: sheet is distance only; map-first owns placement after pick. */
  const chord: "distance" | "place" =
    editingDistance || !distanceSelectionAvailable ? "distance" : "place";

  if (true) {
    return (
      <div
        data-testid="radar-hud-body"
        data-player-ux-world="mantine"
        className="ask-hud-mode-body flex w-full flex-col gap-2"
      >
        {viewOnly ? <ViewOnlyQuestionBanner /> : null}

        <AskToolQuestionHeader
          toolLabel={toolLabel}
          costLabel={costLabel}
          icon={<HudRadarIcon width={22} height={22} />}
          prompt={question.prompt}
          ruleSummary={question.ruleSummary}
        />

        {chord === "distance" ? (
          <div className="space-y-2">
            {awaitHiderAnswer ? <QuestionTruthReferenceHint /> : null}
            {exhausted ? (
              <div className="pointer-events-auto ask-hud-panel p-3">
                <CatalogExhaustedMessage message="Every radar distance option has already been used this session." />
              </div>
            ) : (
              <>
                <AskCatalogRail
                  rows={catalogRows}
                  selectedId={selectedCatalogId}
                  onSelect={(id) => {
                    if (id === CHOOSE_ROW_ID) {
                      if (canCommitCustom) {
                        onCustomDistanceCommit?.();
                        return;
                      }
                      onChooseSelect();
                      chooseInputRef.current?.focus();
                      return;
                    }
                    const meters = Number(id);
                    if (Number.isFinite(meters)) {
                      onPresetSelect(meters);
                    }
                  }}
                  aria-label="Radar distance"
                  hint="Tap a distance, or type a custom one"
                  columns={3}
                />
                {chooseCustom && customRadiusOverLimit ? (
                  <Text
                    size="xs"
                    style={{ color: "var(--color-halt)", paddingInline: 4 }}
                  >
                    Max {formatDistance(maxCustomRadiusMeters, distanceUnit)}{" "}
                    for this game size.
                  </Text>
                ) : null}
              </>
            )}
          </div>
        ) : null}

        {chord === "place" ? (
          <div
            className="pointer-events-auto space-y-3 p-3"
            style={iosAskInsetSurfaceStyle}
          >
            <AnchorControls
              awaitingPlacement={awaitingPlacement}
              hasAnchor={hasCenter}
              gpsLoading={gpsLoading}
              onUseGps={onUseGps}
              onPlaceAtMapTap={onPlaceAtMapTap}
              anchorHint="Center pinned on the map. Tap again to move it."
              gpsLoadingLabel="Locating…"
            />
            {showAnswer ? (
              <BinaryAnswerPicker
                value={answer}
                onChange={onAnswerChange}
                options={yesNoAnswerOptions}
                label=""
              />
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      data-testid="radar-hud-body"
      className="ask-hud-mode-body flex w-full flex-col gap-2"
    >
      {viewOnly ? <ViewOnlyQuestionBanner /> : null}

      <div className="pointer-events-auto ask-hud-panel space-y-2 p-3">
        <AnchorControls
          awaitingPlacement={awaitingPlacement}
          hasAnchor={hasCenter}
          gpsLoading={gpsLoading}
          onUseGps={onUseGps}
          onPlaceAtMapTap={onPlaceAtMapTap}
          anchorHint="Center pinned on the map. Tap again to move it."
          gpsLoadingLabel="Locating…"
        />

        <RadarDistancePicker
          radiusMeters={radiusMeters ?? 0}
          chooseCustom={chooseCustom}
          customRadius={customRadius}
          distanceUnit={distanceUnit}
          gameSize={gameSize}
          usedDistanceOptions={usedDistanceOptions}
          onPresetSelect={onPresetSelect}
          onChooseSelect={onChooseSelect}
          onCustomRadiusChange={onCustomRadiusChange}
          showPrompt={hasCenter}
        />

        {showAnswer ? (
          <BinaryAnswerPicker
            value={answer}
            onChange={onAnswerChange}
            options={yesNoAnswerOptions}
            label=""
          />
        ) : null}
      </div>
    </div>
  );
}
