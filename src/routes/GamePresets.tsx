import { useCallback, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { LatLngBoundsExpression } from "leaflet";
import { AppLogo } from "../components/ui/AppLogo";
import { AdvancedSessionSettings } from "../components/session/AdvancedSessionSettings";
import { GameAreaFramingModal } from "../components/session/GameAreaFramingModal";
import { GameAreaFramingStats } from "../components/session/GameAreaFramingControls";
import { PlaceAreaSearchFields } from "../components/session/PlaceAreaSearchFields";
import { GameSizePicker } from "../components/session/GameSizePicker";
import {
  gameAreaToBoundingBox,
  placeToGameArea,
} from "../domain/geometry/geometry";
import {
  defaultAdvancedSessionSettings,
  type AdvancedSessionSettingsValue,
} from "../domain/session/advancedSessionSettings";
import type { DistanceUnit } from "../domain/map/distance";
import type { GameArea } from "../domain/map/annotations";
import type { BoundingBox } from "../domain/geometry/gameAreaBounds";
import { hidingZoneRadiusMeters, type GameSize } from "../domain/session/gameSize";
import {
  createGamePresetId,
  createSessionDraftToGamePreset,
  migrateGamePreset,
  type CreateSessionDraft,
} from "../domain/session/gamePreset";
import { ScreenNav } from "../components/ui/ScreenNav";
import { useGameAreaFraming } from "../hooks/session/useGameAreaFraming";
import { usePlaceAreaSearch } from "../hooks/session/usePlaceAreaSearch";
import { useGamePresetStore } from "../state/gamePresetStore";
import { useMapStore } from "../state/sessionStore";
import type { GeocodedPlace } from "../services/geo/geocoding";

export function GamePresetEditor() {
  const navigate = useNavigate();
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
    ] satisfies LatLngBoundsExpression;
  }, [focusBounds]);

  return (
    <main className="home-poster flex min-h-[100dvh] flex-col px-5 py-8">
      <GameAreaFramingModal
        open={framingModalOpen}
        mapStyle={mapStyle}
        onMapStyleChange={setMapStyle}
        framing={framing}
        referenceGameArea={!framing.userFramed ? gameArea : null}
        referenceFocusBounds={
          !framing.userFramed ? referenceFocusBounds : null
        }
        onClose={() => setFramingModalOpen(false)}
        onConfirm={(result) => {
          const manualResult = framing.userFramed;
          setGameArea(result.gameArea);
          setFocusBounds(result.focusBounds);
          if (manualResult) {
            setPlaceLabel("");
            placeSearch.resetSearch();
          }
          framing.loadFramingResult(result);
        }}
      />

      <div className="space-y-4 pt-[max(3rem,env(safe-area-inset-top))]">
        <ScreenNav backTo="/presets" backLabel="Back" />
        <AppLogo variant="mark" size="sm" />
        <h1 className="font-display text-2xl font-bold uppercase tracking-tight text-ink">
          {existing ? "Edit preset" : "New preset"}
        </h1>

        {needsMigrationReview ? (
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
            <p className="font-display text-xs font-semibold uppercase tracking-[0.1em] text-ink-dim">
              Play boundary
            </p>
            <p className="text-xs leading-snug text-ink-muted">
              Optional. Search for a place or draw the play area on the map.
            </p>
          </div>

          <PlaceAreaSearchFields
            locationQuery={placeSearch.locationQuery}
            onLocationQueryChange={placeSearch.setLocationQuery}
            onSearch={() => void placeSearch.handleSearch()}
            searchLoading={placeSearch.searchLoading}
            searchResults={placeSearch.searchResults}
            selectedPlaceId={placeSearch.selectedPlaceId}
            selectedPlace={placeSearch.selectedPlace}
            onSelectPlace={placeSearch.applyPlace}
          />

          {placeSearch.searchError ? (
            <p className="text-sm text-error">{placeSearch.searchError}</p>
          ) : null}

          <button
            type="button"
            onClick={() => setFramingModalOpen(true)}
            disabled={placeSearch.searchLoading}
            className="btn-primary w-full disabled:opacity-50"
          >
            Open fullscreen map
          </button>

          {gameArea ? (
            <div className="space-y-2 border-t border-border pt-3">
              <GameAreaFramingStats gameArea={gameArea} compact />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setFramingModalOpen(true)}
                  className="font-display text-xs font-semibold uppercase tracking-wide text-brand-blue"
                >
                  Reframe
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGameArea(null);
                    setPlaceLabel("");
                    setFocusBounds(null);
                    placeSearch.resetSearch();
                    framing.resetManualFraming();
                  }}
                  className="font-display text-xs font-semibold uppercase tracking-wide text-error"
                >
                  Clear
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <label className="field-label font-display text-xs uppercase tracking-[0.1em]">
          Preset name
          <input
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setError(null);
            }}
            className="field-input mt-2"
          />
        </label>

        <div className="space-y-2">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.1em] text-ink-dim">
            Distance edition
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(["imperial", "metric"] as const).map((unit) => (
              <button
                key={unit}
                type="button"
                onClick={() => {
                  setDistanceUnit(unit);
                  setAdvancedSettings(defaultAdvancedSessionSettings(gameSize, unit));
                }}
                className={`min-h-11 border-2 px-3 py-2 text-sm font-semibold ${
                  distanceUnit === unit
                    ? "border-highlight bg-highlight-soft text-highlight"
                    : "border-border bg-surface-deep text-ink"
                }`}
              >
                {unit === "metric" ? "Metric (km)" : "Imperial (mi)"}
              </button>
            ))}
          </div>
        </div>

        <GameSizePicker
          gameArea={gameArea}
          value={gameSize}
          distanceUnit={distanceUnit}
          onChange={(size) => {
            setGameSize(size);
            setAdvancedSettings((current) => ({
              ...defaultAdvancedSessionSettings(size, distanceUnit),
              ...current,
              hidingZoneRadiusMeters: hidingZoneRadiusMeters(size, distanceUnit),
            }));
          }}
        />

        <AdvancedSessionSettings
          gameSize={gameSize}
          distanceUnit={distanceUnit}
          value={advancedSettings}
          onChange={setAdvancedSettings}
        />

        {error ? <p className="text-error">{error}</p> : null}

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={handleSave} className="btn-primary">
            Save preset
          </button>
          {existing && !needsMigrationReview ? (
            <Link to={`/create?preset=${existing.id}`} className="btn-secondary">
              Host
            </Link>
          ) : null}
          {existing ? (
            <button
              type="button"
              onClick={() => {
                deletePreset(existing.id);
                navigate("/presets");
              }}
              className="btn-secondary"
            >
              Delete
            </button>
          ) : null}
          <Link to="/presets" className="btn-secondary">
            Cancel
          </Link>
        </div>
      </div>
    </main>
  );
}

export function GamePresetList() {
  const presets = useGamePresetStore((state) => state.presets);
  const deletePreset = useGamePresetStore((state) => state.deletePreset);
  const migratedPresets = useMemo(
    () => presets.map((preset) => migrateGamePreset(preset)),
    [presets],
  );

  return (
    <main className="home-poster flex min-h-[100dvh] flex-col px-5 py-8">
      <div className="space-y-4 pt-[max(3rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
        <ScreenNav backTo="/" backLabel="Back" />
        <AppLogo variant="mark" size="sm" />
        <h1 className="font-display text-2xl font-bold uppercase tracking-tight text-ink">
          Custom games
        </h1>
        <p className="text-sm text-ink-muted">
          Saved templates pre-fill create session. Game area can be added when
          hosting.
        </p>

        <Link to="/presets/new" className="home-card-btn home-card-btn-primary">
          <span>New preset</span>
        </Link>

        {migratedPresets.length === 0 ? (
          <p className="text-sm text-ink-dim">No presets saved on this device.</p>
        ) : (
          <ul className="space-y-3">
            {migratedPresets.map((preset) => (
              <li
                key={preset.id}
                className="home-card-btn home-card-btn-secondary flex-col items-stretch gap-3 !min-h-0 !h-auto py-3"
              >
                <div className="flex w-full items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display text-base tracking-wide text-ink">
                      {preset.name}
                    </p>
                    <p className="mt-1 text-xs text-ink-muted">
                      {preset.gameSize} · {preset.distanceUnit}
                      {preset.placeLabel ? ` · ${preset.placeLabel}` : ""}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {preset.advancedSettings.expansionPackEnabled ? (
                        <span className="rounded-full border border-border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-brand-blue">
                          Expansion
                        </span>
                      ) : null}
                      {preset.advancedSettings.customQuestionPackEnabled ? (
                        <span className="rounded-full border border-border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-brand-blue">
                          Custom Q
                        </span>
                      ) : null}
                      {preset.migrationStatus === "manual_required" ? (
                        <span className="rounded-full border border-status-warning/40 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-status-warning">
                          Review
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {preset.migrationStatus === "manual_required" ? (
                    <Link
                      to={`/presets/${preset.id}/edit`}
                      className="btn-primary min-h-10 px-3 text-xs"
                    >
                      Review
                    </Link>
                  ) : (
                    <Link
                      to={`/create?preset=${preset.id}`}
                      className="btn-primary min-h-10 px-3 text-xs"
                    >
                      Host
                    </Link>
                  )}
                  <Link
                    to={`/presets/${preset.id}/edit`}
                    className="btn-secondary min-h-10 px-3 text-xs"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => deletePreset(preset.id)}
                    className="btn-secondary min-h-10 px-3 text-xs text-error"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
