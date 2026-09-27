import { useCallback, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useAppNavigate } from "../hooks/navigation/useAppNavigate";
import type { MapBoundsExpression } from "../domain/map/mapBounds";
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
import type { GameSize } from "../domain/session/size/gameSize";
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
