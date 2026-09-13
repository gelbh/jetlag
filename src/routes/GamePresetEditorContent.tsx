import { useCallback, useMemo, useState } from "react";
import { AppLink } from "../components/navigation/AppLink";
import { useParams } from "react-router-dom";
import { useAppNavigate } from "../hooks/navigation/useAppNavigate";
import type { MapBoundsExpression } from "../domain/map/mapBounds";
import { Button } from "../components/ui/button";
import { AdvancedSessionSettings } from "../components/session/settings/AdvancedSessionSettings";
import { GameAreaFramingModal } from "../components/session/framing/GameAreaFramingModal";
import { GameAreaFramingStats } from "../components/session/framing/GameAreaFramingControls";
import { PlaceAreaSearchFields } from "../components/session/framing/PlaceAreaSearchFields";
import { GameSizePicker } from "../components/session/identity/GameSizePicker";
import {
  gameAreaToBoundingBox,
  placeToGameArea,
} from "../domain/geometry/gameArea/geometry";
import {
  defaultAdvancedSessionSettings,
  type AdvancedSessionSettingsValue,
} from "../domain/session/tools/advancedSessionSettings";
import type { DistanceUnit } from "../domain/map/distance";
import type { GameArea } from "../domain/map/annotations";
import type { BoundingBox } from "../domain/geometry/gameArea/gameAreaBounds";
import { hidingZoneRadiusMeters, type GameSize } from "../domain/session/size/gameSize";
import {
  createGamePresetId,
  createSessionDraftToGamePreset,
  migrateGamePreset,
  type CreateSessionDraft,
} from "../domain/session/presets/gamePreset";
import { useGameAreaFraming } from "../hooks/session/useGameAreaFraming";
import { usePlaceAreaSearch } from "../hooks/session/usePlaceAreaSearch";
import { useGamePresetStore } from "../state/gamePresetStore";
import { isBundledPresetId } from "../domain/regions/bundledGamePresets";
import { PackAttachChip } from "../components/presets/PackAttachChip";
import { RequestPackWhenUnavailable } from "../components/presets/RequestPackWhenUnavailable";
import { buildPreloadPresetSnapshot } from "../domain/preloadRequest/buildPreloadPresetSnapshot";
import { usePackAttachChrome } from "../hooks/session/usePackAttachChrome";
import { useMapStore } from "../state/sessionStore";
import type { GeocodedPlace } from "../services/geo/geocoding";

export function useGamePresetEditorModel() {
  const navigate = useAppNavigate();
  const { id } = useParams();
  const mapStyle = useMapStore((state) => state.mapStyle);
  const setMapStyle = useMapStore((state) => state.setMapStyle);
  const presets = useGamePresetStore((state) => state.presets);
  const savePreset = useGamePresetStore((state) => state.savePreset);
  const deletePreset = useGamePresetStore((state) => state.deletePreset);

  const existing = useMemo(
    () => (id ? presets.find((preset) => preset.id === id) : undefined),
    [id, presets],
  );
  const migratedExisting = useMemo(
    () => (existing ? migrateGamePreset(existing) : undefined),
    [existing],
  );
  const needsMigrationReview =
    migratedExisting?.migrationStatus === "manual_required";

  const framing = useGameAreaFraming({
    initialGameArea: existing?.gameArea ?? null,
    initialFocusBounds: existing?.focusBounds ?? null,
  });
  const [framingModalOpen, setFramingModalOpen] = useState(false);
  const [gameArea, setGameArea] = useState<GameArea | null>(
    existing?.gameArea ?? null,
  );
  const [placeLabel, setPlaceLabel] = useState(existing?.placeLabel ?? "");
  const [focusBounds, setFocusBounds] = useState<BoundingBox | null>(
    existing?.focusBounds ?? null,
  );
  const applyPlaceToPreset = useCallback(
    (place: GeocodedPlace) => {
      const area = placeToGameArea(place);
      setGameArea(area);
      setPlaceLabel(place.displayName);
      setFocusBounds(gameAreaToBoundingBox(area));
      framing.resetManualFraming();
      framing.applyFocusToGameArea(area);
    },
    [framing],
  );
  const placeSearch = usePlaceAreaSearch({
    initialQuery: existing?.placeLabel ?? "",
    onPlaceApplied: applyPlaceToPreset,
  });
  const [name, setName] = useState(existing?.name ?? "");
  const [gameSize, setGameSize] = useState<GameSize>(existing?.gameSize ?? "medium");
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>(
    existing?.distanceUnit ?? "imperial",
  );
  const [advancedSettings, setAdvancedSettings] =
    useState<AdvancedSessionSettingsValue>(
      () =>
        existing?.advancedSettings ??
        defaultAdvancedSessionSettings("medium", "imperial"),
    );
  const [error, setError] = useState<string | null>(null);
  const packAttach = usePackAttachChrome({
    gameArea,
    initialPackId: existing?.regionPackId,
  });

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Enter a preset name.");
      return;
    }

    const draft: CreateSessionDraft = {
      gameSize,
      distanceUnit,
      advancedSettings,
      gameArea,
      placeLabel: placeLabel || undefined,
      focusBounds,
      regionPackId: packAttach.packId,
    };

    const preset = createSessionDraftToGamePreset(
      draft,
      trimmed,
      existing?.id ?? createGamePresetId(),
    );

    savePreset({
      ...preset,
      createdAt: existing?.createdAt ?? preset.createdAt,
      updatedAt: new Date().toISOString(),
      sessionTier: existing?.sessionTier,
    });

    navigate("/presets");
  };

  const referenceFocusBounds = useMemo(() => {
    if (!focusBounds) {
      return null;
    }

    return [
      [focusBounds.south, focusBounds.west],
      [focusBounds.north, focusBounds.east],
    ] satisfies MapBoundsExpression;
  }, [focusBounds]);

  const isUserPreset = !existing || !isBundledPresetId(existing.id);
  const title = existing ? "Edit preset" : "New preset";

  return {
    title,
    existing,
    needsMigrationReview,
    framing,
    framingModalOpen,
    setFramingModalOpen,
    mapStyle,
    setMapStyle,
    gameArea,
    setGameArea,
    placeLabel,
    setPlaceLabel,
    focusBounds,
    setFocusBounds,
    placeSearch,
    name,
    setName,
    gameSize,
    setGameSize,
    distanceUnit,
    setDistanceUnit,
    advancedSettings,
    setAdvancedSettings,
    error,
    setError,
    packAttach,
    handleSave,
    referenceFocusBounds,
    isUserPreset,
    deletePreset,
    navigate,
  };
}

/**
 * Survey editor sections + GameAreaFramingModal map island.
 * Parent must set `data-player-ux-world="survey"` on a root that wraps this
 * (Create readiness: CSS selectors need the attribute on the right root).
 */
export function GamePresetEditorContent() {
  const model = useGamePresetEditorModel();

  return (
    <>
      <GameAreaFramingModal
        open={model.framingModalOpen}
        mapStyle={model.mapStyle}
        onMapStyleChange={model.setMapStyle}
        framing={model.framing}
        referenceGameArea={!model.framing.userFramed ? model.gameArea : null}
        referenceFocusBounds={
          !model.framing.userFramed ? model.referenceFocusBounds : null
        }
        onClose={() => model.setFramingModalOpen(false)}
        onConfirm={(result) => {
          const manualResult = model.framing.userFramed;
          model.setGameArea(result.gameArea);
          model.setFocusBounds(result.focusBounds);
          if (manualResult) {
            model.setPlaceLabel("");
            model.placeSearch.resetSearch();
          }
          model.framing.loadFramingResult(result);
        }}
      />

      <div className="space-y-4">
        <h1 className="font-display text-2xl font-bold uppercase tracking-tight text-field-ink">
          {model.title}
        </h1>

        {model.needsMigrationReview ? (
          <div
            className="rounded-[var(--radius-hud-md)] border border-status-warning/40 bg-status-warning-surface px-3 py-2 text-sm text-status-warning"
            role="status"
          >
            This preset uses an older format. Review settings and save to
            upgrade.
          </div>
        ) : null}

        <div className="jl-field-frame space-y-3">
          <div className="space-y-1">
            <p className="font-display text-xs font-semibold uppercase tracking-[0.1em] text-field-ink-muted">
              Play boundary
            </p>
            <p className="text-xs leading-snug text-field-ink-muted">
              Optional. Search for a place or draw the play area on the map.
            </p>
          </div>

          <PlaceAreaSearchFields
            locationQuery={model.placeSearch.locationQuery}
            onLocationQueryChange={model.placeSearch.setLocationQuery}
            onSearch={() => void model.placeSearch.handleSearch()}
            searchLoading={model.placeSearch.searchLoading}
            searchResults={model.placeSearch.searchResults}
            selectedPlaceId={model.placeSearch.selectedPlaceId}
            selectedPlace={model.placeSearch.selectedPlace}
            onSelectPlace={model.placeSearch.applyPlace}
          />

          {model.placeSearch.searchError ? (
            <p className="text-sm text-error">{model.placeSearch.searchError}</p>
          ) : null}

          <Button
            type="button"
            variant="flag"
            onClick={() => model.setFramingModalOpen(true)}
            disabled={model.placeSearch.searchLoading}
            className="min-h-11 w-full"
          >
            Open fullscreen map
          </Button>

          {model.gameArea ? (
            <div className="space-y-2 border-t border-rule pt-3">
              <GameAreaFramingStats gameArea={model.gameArea} compact />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => model.setFramingModalOpen(true)}
                  className="font-display text-xs font-semibold uppercase tracking-wide text-signal"
                >
                  Reframe
                </button>
                <button
                  type="button"
                  onClick={() => {
                    model.setGameArea(null);
                    model.setPlaceLabel("");
                    model.setFocusBounds(null);
                    model.placeSearch.resetSearch();
                    model.framing.resetManualFraming();
                  }}
                  className="font-display text-xs font-semibold uppercase tracking-wide text-error"
                >
                  Clear
                </button>
              </div>
              {model.packAttach.packId ? (
                <PackAttachChip
                  packId={model.packAttach.packId}
                  source={model.packAttach.source}
                  onClear={model.packAttach.clearPack}
                  onChangePack={model.packAttach.changePack}
                />
              ) : null}
            </div>
          ) : null}
        </div>

        <label className="field-label font-display text-xs uppercase tracking-[0.1em]">
          Preset name
          <input
            value={model.name}
            onChange={(event) => {
              model.setName(event.target.value);
              model.setError(null);
            }}
            className="field-input mt-2"
          />
        </label>

        <div className="space-y-2">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.1em] text-field-ink-muted">
            Distance edition
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(["imperial", "metric"] as const).map((unit) => (
              <button
                key={unit}
                type="button"
                onClick={() => {
                  model.setDistanceUnit(unit);
                  model.setAdvancedSettings(
                    defaultAdvancedSessionSettings(model.gameSize, unit),
                  );
                }}
                className={`min-h-11 border-2 px-3 py-2 text-sm font-semibold ${
                  model.distanceUnit === unit
                    ? "border-flag bg-flag-soft text-flag"
                    : "border-rule bg-canvas text-field-ink"
                }`}
              >
                {unit === "metric" ? "Metric (km)" : "Imperial (mi)"}
              </button>
            ))}
          </div>
        </div>

        <GameSizePicker
          gameArea={model.gameArea}
          value={model.gameSize}
          distanceUnit={model.distanceUnit}
          onChange={(size) => {
            model.setGameSize(size);
            model.setAdvancedSettings((current) => ({
              ...defaultAdvancedSessionSettings(size, model.distanceUnit),
              ...current,
              hidingZoneRadiusMeters: hidingZoneRadiusMeters(
                size,
                model.distanceUnit,
              ),
            }));
          }}
        />

        <AdvancedSessionSettings
          gameSize={model.gameSize}
          distanceUnit={model.distanceUnit}
          value={model.advancedSettings}
          onChange={model.setAdvancedSettings}
        />

        {model.isUserPreset && model.packAttach.showRequestCta ? (
          <RequestPackWhenUnavailable
            getSnapshot={() =>
              buildPreloadPresetSnapshot({
                name: model.name,
                placeLabel: model.placeLabel,
                gameSize: model.gameSize,
                distanceUnit: model.distanceUnit,
                focusBounds: model.focusBounds,
                gameArea: model.gameArea,
                regionPackId: model.packAttach.packId,
                presetId: model.existing?.id,
              })
            }
          />
        ) : null}

        {model.error ? <p className="text-error">{model.error}</p> : null}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="flag"
            className="min-h-11"
            onClick={model.handleSave}
          >
            Save preset
          </Button>
          {model.existing && !model.needsMigrationReview ? (
            <Button asChild variant="default" className="min-h-11">
              <AppLink to={`/create?preset=${model.existing.id}`}>Host</AppLink>
            </Button>
          ) : null}
          {model.existing ? (
            <Button
              type="button"
              variant="default"
              className="min-h-11"
              onClick={() => {
                model.deletePreset(model.existing!.id);
                model.navigate("/presets");
              }}
            >
              Delete
            </Button>
          ) : null}
          <Button asChild variant="default" className="min-h-11">
            <AppLink to="/presets">Cancel</AppLink>
          </Button>
        </div>
      </div>
    </>
  );
}
