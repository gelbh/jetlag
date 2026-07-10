import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { LatLngBoundsExpression } from "leaflet";
import { AppLogo } from "../components/ui/AppLogo";
import { ScreenNav } from "../components/ui/ScreenNav";
import { CreateSessionMapPane } from "../components/session/CreateSessionMapPane";
import { GameAreaFramingModal } from "../components/session/GameAreaFramingModal";
import {
  FramingModeSegmentControl,
  GameAreaFramingPolygonActions,
} from "../components/session/GameAreaFramingControls";
import { framingModeHint } from "../components/session/gameAreaFramingUi";
import { MobileSheet } from "../components/ui/MobileSheet";
import { useGameAreaFraming } from "../hooks/session/useGameAreaFraming";
import {
  LOCAL_SESSION_ID,
  type GameArea,
  type SessionTier,
} from "../domain/map/annotations";
import type { LatLngTuple } from "../domain/geometry/geometry";
import {
  boundingBoxHasMinimumSpan,
  gameAreaToBoundingBox,
  placeToGameArea,
} from "../domain/geometry/geometry";
import { generateLocalCode } from "../domain/session/session";
import type { DistanceUnit } from "../domain/map/distance";
import { hidingZoneRadiusMeters, type GameSize } from "../domain/session/gameSize";
import type { PlayerRole } from "../domain/session/playerRole";
import { RolePicker } from "../components/session/RolePicker";
import { GameSizePicker } from "../components/session/GameSizePicker";
import {
  defaultAdvancedSessionSettings,
  sessionRulesPatchFromAdvancedSettings,
} from "../domain/session/advancedSessionSettings";
import { AdvancedSessionSettings } from "../components/session/AdvancedSessionSettings";
import { useSessionStore, useMapStore } from "../state/sessionStore";
import {
  isFirebaseConfigured,
  ensureAnonymousUser,
} from "../services/core/firebase";
import { createRemoteSession } from "../services/firestore/firestoreAnnotations";
import {
  preloadCriticalGameAreaCaches,
  preloadGameAreaCaches,
} from "../services/session/gameAreaPreload";
import { startSeaLevelBackgroundSampling } from "../services/geo/seaLevelProgressive";
import { retryAsync } from "../services/core/retryAsync";
import {
  inferTransitMetroId,
  listTransitMetros,
} from "../services/transit/transitCatalog";
import { searchPlaces, type GeocodedPlace } from "../services/geo/geocoding";
import { formatPlaceSearchSubtitle } from "../services/geo/geocodingRank";
import { getCurrentPosition } from "../services/core/geolocation";
import { grantAccess, hasAccessClaim } from "../services/core/accessControl";
import { setPremiumApiContext } from "../services/core/premiumApiContext";
import { unionGameAreas } from "../domain/geometry/unionGameAreas";
import { parseBoundaryFile } from "../services/core/kmzImport";
import {
  createSessionDraftToGamePreset,
  gamePresetToCreateSessionDraft,
} from "../domain/session/gamePreset";
import { useGamePresetStore } from "../state/gamePresetStore";
import type { RegionPackId } from "../domain/regions/regionPack";
import { loadRegionPackSessionBoundaries } from "../services/geo/regionPackBoundaries";
import {
  BUNDLED_GAME_PRESET_DEFINITIONS,
  isBundledPresetId,
} from "../domain/regions/bundledGamePresets";
import { buildBundledPresetSelectGroups } from "../domain/regions/bundledPresetHierarchy";

const TIER_OPTIONS: Array<{
  value: SessionTier;
  label: string;
  summary: string;
}> = [
  {
    value: "free",
    label: "Free",
    summary: "All tools, public map data.",
  },
  {
    value: "premium",
    label: "Premium",
    summary: "Live transit, faster map loads. Host enters access code once.",
  },
];

function placeToFocusBounds(place: GeocodedPlace): LatLngBoundsExpression {
  const { south, west, north, east } = place.bounds;
  return [
    [south, west],
    [north, east],
  ];
}

export function CreateSession() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presets = useGamePresetStore((state) => state.presets);
  const savePreset = useGamePresetStore((state) => state.savePreset);
  const bundledPresetSelectGroups = useMemo(
    () => buildBundledPresetSelectGroups(BUNDLED_GAME_PRESET_DEFINITIONS),
    [],
  );
  const userPresets = useMemo(
    () => presets.filter((preset) => !isBundledPresetId(preset.id)),
    [presets],
  );
  const setSession = useSessionStore((state) => state.setSession);
  const mapStyle = useMapStore((state) => state.mapStyle);
  const setMapStyle = useMapStore((state) => state.setMapStyle);
  const lowPowerMode = useMapStore((state) => state.lowPowerMode);
  const framing = useGameAreaFraming();
  const [framingModalOpen, setFramingModalOpen] = useState(false);
  const [locationQuery, setLocationQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GeocodedPlace[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<GeocodedPlace | null>(
    null,
  );
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessCodeError, setAccessCodeError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifyingAccess, setVerifyingAccess] = useState(false);
  const [sessionTier, setSessionTier] = useState<SessionTier>("free");
  const [playerRole, setPlayerRole] = useState<PlayerRole>("seeker");
  const [gameSize, setGameSize] = useState<GameSize>("medium");
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>("imperial");
  const [advancedSettings, setAdvancedSettings] = useState(() =>
    defaultAdvancedSessionSettings("medium", "imperial"),
  );
  const [accessCode, setAccessCode] = useState("");
  const [regionPackId, setRegionPackId] = useState<RegionPackId | undefined>();
  const [hostHasAccessClaim, setHostHasAccessClaim] = useState(false);
  const handleGameSizeChange = useCallback(
    (size: GameSize) => {
      setGameSize(size);
      setAdvancedSettings((current) => ({
        ...defaultAdvancedSessionSettings(size, distanceUnit),
        ...current,
        hidingZoneRadiusMeters: hidingZoneRadiusMeters(size, distanceUnit),
      }));
    },
    [distanceUnit],
  );
  const metros = useMemo(() => listTransitMetros(), []);
  const [importedGameArea, setImportedGameArea] = useState<GameArea | null>(
    null,
  );
  const [selectedAreas, setSelectedAreas] = useState<GameArea[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const userLocationRef = useRef<LatLngTuple | null>(null);
  const appliedPresetRef = useRef<string | null>(null);

  useEffect(() => {
    const presetId = searchParams.get("preset");
    if (!presetId) {
      return;
    }

    if (appliedPresetRef.current === presetId) {
      return;
    }

    const preset = presets.find((entry) => entry.id === presetId);
    if (!preset) {
      return;
    }

    appliedPresetRef.current = presetId;
    const draft = gamePresetToCreateSessionDraft(preset);
    const applyPreset = async () => {
      let customMatchingAreas =
        draft.customMatchingAreas ?? draft.advancedSettings.customMatchingAreas;
      let gameArea = draft.gameArea ?? null;

      if (draft.regionPackId) {
        setRegionPackId(draft.regionPackId);
        try {
          const boundaries = await loadRegionPackSessionBoundaries(
            draft.regionPackId,
            draft.councilFilter,
          );
          customMatchingAreas = boundaries.customMatchingAreas;
          gameArea = boundaries.playArea;
        } catch (loadError) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Couldn't load Dublin boundary data.",
          );
        }
      } else {
        setRegionPackId(undefined);
      }

      setGameSize(draft.gameSize);
      setDistanceUnit(draft.distanceUnit);
      setAdvancedSettings({
        ...draft.advancedSettings,
        customMatchingAreas,
        customCategories:
          draft.customCategories ?? draft.advancedSettings.customCategories,
        customLocationPins:
          draft.customLocationPins ?? draft.advancedSettings.customLocationPins,
      });
      if (draft.sessionTier) {
        setSessionTier(draft.sessionTier);
      }
      if (gameArea) {
        setImportedGameArea(gameArea);
        framing.applyFocusToGameArea(gameArea);
      }
      if (draft.placeLabel) {
        setLocationQuery(draft.placeLabel);
      }
    };

    void applyPreset();
  }, [framing.applyFocusToGameArea, presets, searchParams]);

  useEffect(() => {
    void getCurrentPosition({ highAccuracy: false })
      .then((reading) => {
        userLocationRef.current = [reading.lat, reading.lng];
      })
      .catch(() => {
        // Best-effort location bias only; search works without GPS.
      });
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const user = await ensureAnonymousUser();
        if (cancelled) {
          return;
        }

        setHostHasAccessClaim(await hasAccessClaim(user));
      } catch {
        if (!cancelled) {
          setHostHasAccessClaim(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const inferredTransitMetroId = useMemo(() => {
    const gameArea =
      importedGameArea ??
      (selectedPlace && !framing.userFramed
        ? placeToGameArea(selectedPlace)
        : framing.manualGameArea);

    if (!gameArea) {
      return "";
    }

    return inferTransitMetroId(gameArea) ?? "";
  }, [framing.manualGameArea, framing.userFramed, importedGameArea, selectedPlace]);
  const [transitMetroOverride, setTransitMetroOverride] = useState<
    string | null
  >(null);
  const [transitMetroInferenceSeed, setTransitMetroInferenceSeed] = useState(
    inferredTransitMetroId,
  );

  useEffect(() => {
    if (inferredTransitMetroId !== transitMetroInferenceSeed) {
      /* eslint-disable react-hooks/set-state-in-effect -- reset metro override when inference changes */
      setTransitMetroInferenceSeed(inferredTransitMetroId);
      setTransitMetroOverride(null);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [inferredTransitMetroId, transitMetroInferenceSeed]);

  const transitMetroId = transitMetroOverride ?? inferredTransitMetroId;
  const showAccessCodeField =
    isFirebaseConfigured() &&
    sessionTier === "premium" &&
    !hostHasAccessClaim;

  const previewGameArea = useMemo(() => {
    if (importedGameArea) {
      return importedGameArea;
    }

    if (selectedPlace && !framing.userFramed) {
      return placeToGameArea(selectedPlace);
    }

    return framing.manualGameArea;
  }, [framing.manualGameArea, framing.userFramed, importedGameArea, selectedPlace]);

  const manualFramingActive =
    !importedGameArea && (!selectedPlace || framing.userFramed);

  const handleUserViewportFramed = useCallback(() => {
    if ((selectedPlace || importedGameArea) && !framing.userFramed) {
      return;
    }

    framing.handleUserViewportFramed();
  }, [
    framing,
    framing.handleUserViewportFramed,
    framing.userFramed,
    importedGameArea,
    selectedPlace,
  ]);

  const mapFocusBounds = useMemo(() => {
    if (importedGameArea) {
      return framing.focusBounds;
    }

    if (selectedPlace && !framing.userFramed) {
      return placeToFocusBounds(selectedPlace);
    }

    return framing.focusBounds;
  }, [framing.focusBounds, framing.userFramed, importedGameArea, selectedPlace]);

  const mapPreviewGameArea = useMemo(() => {
    const areas = [...selectedAreas];
    if (previewGameArea) {
      areas.push(previewGameArea);
    }

    if (areas.length === 0) {
      return null;
    }

    if (areas.length === 1) {
      return areas[0] ?? null;
    }

    return unionGameAreas(areas);
  }, [previewGameArea, selectedAreas]);

  const addCurrentArea = () => {
    if (!previewGameArea) {
      setError("Frame or search for an area before adding another.");
      return;
    }

    setSelectedAreas((current) => [...current, previewGameArea]);
    setImportedGameArea(null);
    setSelectedPlaceId(null);
    setSelectedPlace(null);
    setSearchResults([]);
    setLocationQuery("");
    framing.resetManualFraming();
    setError(null);
  };

  const removeSelectedArea = (index: number) => {
    setSelectedAreas((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const applyImportedBoundary = (gameArea: GameArea, filename: string) => {
    setImportedGameArea(gameArea);
    setSelectedPlaceId(null);
    setSelectedPlace(null);
    setSearchResults([]);
    setLocationQuery(filename);
    framing.resetManualFraming();
    framing.applyFocusToGameArea(gameArea);
    setError(null);
  };

  const applyPlace = (place: GeocodedPlace) => {
    setImportedGameArea(null);
    setSelectedPlaceId(place.id);
    setSelectedPlace(place);
    setSearchResults([]);
    setLocationQuery(place.displayName);
    framing.resetManualFraming();
    framing.applyFocusToGameArea(placeToGameArea(place));
    setError(null);
  };

  const handleBoundaryImport = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    setImportLoading(true);
    setError(null);

    try {
      const gameArea = await parseBoundaryFile(file);
      applyImportedBoundary(gameArea, file.name);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Could not import boundary file.",
      );
    } finally {
      setImportLoading(false);
    }
  };

  const handleSearch = async () => {
    const trimmed = locationQuery.trim();
    if (trimmed.length < 2) {
      setError("Enter a city, county, state, or country.");
      return;
    }

    setSearchLoading(true);
    setError(null);

    try {
      const results = await searchPlaces(
        trimmed,
        userLocationRef.current ? { near: userLocationRef.current } : undefined,
      );
      if (results.length === 0) {
        setSearchResults([]);
        setError("No matching places found. Try a more specific name.");
        return;
      }

      if (results.length === 1) {
        applyPlace(results[0]);
        return;
      }

      setSearchResults(results);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Place search failed.",
      );
    } finally {
      setSearchLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!importedGameArea && !framing.manualGameArea && !selectedPlace) {
      setError(
        "Search for a place, import a boundary, or move the map until the play area is framed.",
      );
      return;
    }

    setLoading(true);
    setError(null);
    setAccessCodeError(null);

    try {
      const manualArea =
        framing.userFramed &&
        framing.manualGameArea &&
        boundingBoxHasMinimumSpan(
          gameAreaToBoundingBox(framing.manualGameArea),
        )
          ? framing.manualGameArea
          : null;
      const draftArea = importedGameArea
        ? importedGameArea
        : manualArea
          ? manualArea
          : selectedPlace
            ? placeToGameArea(selectedPlace)
            : framing.manualGameArea;

      const areasForSession = draftArea
        ? [...selectedAreas, draftArea]
        : selectedAreas;

      const gameArea =
        areasForSession.length === 0
          ? null
          : areasForSession.length === 1
            ? areasForSession[0]!
            : unionGameAreas(areasForSession);

      if (!gameArea) {
        setError(
          "Search for a place, import a boundary, or move the map until the play area is framed.",
        );
        return;
      }

      const metroId = transitMetroId || undefined;
      const tier =
        isFirebaseConfigured() && sessionTier === "premium" ? "premium" : "free";

      if (tier === "premium" && !hostHasAccessClaim) {
        const trimmedCode = accessCode.trim();
        if (!trimmedCode) {
          setAccessCodeError("Enter the host access code.");
          return;
        }

        setVerifyingAccess(true);
        try {
          await grantAccess(trimmedCode);
          setHostHasAccessClaim(true);
        } catch (nextError) {
          setAccessCodeError(
            nextError instanceof Error
              ? nextError.message
              : "Invalid access code.",
          );
          return;
        } finally {
          setVerifyingAccess(false);
        }
      }

      const rulesPatch = {
        ...sessionRulesPatchFromAdvancedSettings(
          gameSize,
          advancedSettings,
          distanceUnit,
        ),
        ...(regionPackId ? { regionPackId } : {}),
      };

      if (isFirebaseConfigured()) {
        const user = await retryAsync(() => ensureAnonymousUser());
        const session = await retryAsync(() =>
          createRemoteSession(
            gameArea,
            user.uid,
            tier,
            metroId,
            playerRole,
            gameSize,
            rulesPatch,
            distanceUnit,
          ),
        );
        setSession(session, user.uid);
        setPremiumApiContext(session);
      } else {
        const localSession = {
          id: LOCAL_SESSION_ID,
          code: generateLocalCode(),
          gameArea,
          createdAt: new Date().toISOString(),
          memberUids: [],
          memberRoles: { local: playerRole },
          gameSize,
          distanceUnit,
          tier: "free" as const,
          transitMetroId: metroId,
          ...rulesPatch,
          hidingZoneRadiusMeters:
            rulesPatch.hidingZoneRadiusMeters ??
            hidingZoneRadiusMeters(gameSize, distanceUnit),
        };
        setSession(localSession, "local");
        setPremiumApiContext(localSession);
      }

      if (!lowPowerMode) {
        preloadGameAreaCaches(gameArea, advancedSettings.customMatchingAreas);
        startSeaLevelBackgroundSampling(gameArea);
        if (navigator.onLine) {
          void preloadCriticalGameAreaCaches(
            gameArea,
            advancedSettings.customMatchingAreas,
          );
        }
      }
      navigate("/map");
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Couldn't create session.",
      );
    } finally {
      setLoading(false);
    }
  };

  const confirmLabel = verifyingAccess
    ? "Verifying…"
    : loading
      ? "Creating…"
      : "Confirm game area";

  return (
    <div className="flex h-full min-h-[100dvh] flex-col bg-surface-deep">
      <CreateSessionMapPane
        mapStyle={mapStyle}
        onMapStyleChange={setMapStyle}
        focusBounds={mapFocusBounds}
        previewGameArea={mapPreviewGameArea ?? previewGameArea}
        selectedGameSize={gameSize}
        manualFramingActive={manualFramingActive}
        framingMode={framing.framingMode}
        circleCenter={framing.circleCenter}
        circleRadiusMeters={framing.circleRadiusMeters}
        polygonVertices={framing.polygonVertices}
        onBoundsChange={framing.handleBoundsChange}
        onUserViewportFramed={handleUserViewportFramed}
        onMapClick={
          manualFramingActive &&
          (framing.framingMode === "circle" ||
            framing.framingMode === "polygon")
            ? framing.handleMapClick
            : undefined
        }
      />

      <GameAreaFramingModal
        open={framingModalOpen}
        mapStyle={mapStyle}
        onMapStyleChange={setMapStyle}
        framing={framing}
        referenceGameArea={!manualFramingActive ? previewGameArea : null}
        referenceFocusBounds={!manualFramingActive ? mapFocusBounds : null}
        onClose={() => setFramingModalOpen(false)}
        onConfirm={(result) => {
          if (framing.userFramed) {
            setImportedGameArea(null);
            setSelectedPlaceId(null);
            setSelectedPlace(null);
          }
          framing.loadFramingResult(result);
        }}
      />

      <MobileSheet
        variant="nested"
        layout="split"
        maxHeightClassName="max-h-[min(58dvh,640px)]"
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-pb-4 px-4 pt-[max(3rem,env(safe-area-inset-top))]">
        <ScreenNav backTo="/" backLabel="Back" />
        <div className="mt-4">
        <AppLogo variant="lockup" size="md" />
        </div>
        <p className="mt-3 font-display text-xs font-semibold uppercase tracking-[0.14em] text-brand-blue">
          New game
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold uppercase leading-tight tracking-tight text-ink">
          Frame the game area
        </h1>
        <p className="mt-2 text-pretty text-sm leading-relaxed text-ink-secondary">
          Search or import a boundary, or draw the play area on the map below.
        </p>

        <div className="mt-4 space-y-2">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.1em] text-ink-dim">
            Game preset
          </p>
          <div className="flex flex-wrap gap-2">
            <select
              disabled={loading || verifyingAccess}
              className="field-input min-h-11 flex-1"
              defaultValue=""
              onChange={(event) => {
                const presetId = event.target.value;
                if (!presetId) {
                  return;
                }
                navigate(`/create?preset=${presetId}`);
              }}
            >
              <option value="">Load preset…</option>
              {bundledPresetSelectGroups.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.options.map((option) => (
                    <option key={option.presetId} value={option.presetId}>
                      {option.name}
                    </option>
                  ))}
                </optgroup>
              ))}
              {userPresets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={loading || verifyingAccess}
              onClick={() => {
                const name = window.prompt("Preset name");
                if (!name?.trim()) {
                  return;
                }

                savePreset(
                  createSessionDraftToGamePreset(
                    {
                      gameSize,
                      distanceUnit,
                      advancedSettings,
                      gameArea: previewGameArea,
                      placeLabel: selectedPlace?.displayName ?? locationQuery,
                      sessionTier,
                    },
                    name.trim(),
                  ),
                );
              }}
              className="rounded-full border border-border px-3 py-2 text-xs font-semibold text-brand-blue disabled:opacity-50"
            >
              Save as preset
            </button>
          </div>
        </div>

        <div className="jl-field-frame mt-4 space-y-3">
          <div className="space-y-1">
            <p className="font-display text-xs font-semibold uppercase tracking-[0.1em] text-ink-dim">
              Draw on map
            </p>
            <p className="text-xs leading-snug text-ink-muted">
              {framingModeHint(framing.framingMode)}
            </p>
          </div>

          <FramingModeSegmentControl
            value={framing.framingMode}
            disabled={searchLoading || importLoading}
            onChange={(mode) => {
              setImportedGameArea(null);
              framing.setFramingMode(mode);
            }}
          />

          <button
            type="button"
            onClick={() => setFramingModalOpen(true)}
            disabled={searchLoading || importLoading}
            className="btn-primary w-full disabled:opacity-50"
          >
            Open fullscreen map
          </button>

          {framing.framingMode === "polygon" && manualFramingActive ? (
            <GameAreaFramingPolygonActions
              layout="inline"
              vertexCount={framing.polygonVertices.length}
              onClose={() => framing.closePolygon()}
              onReset={() => framing.resetPolygonVertices()}
            />
          ) : null}
        </div>

        {selectedAreas.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedAreas.map((area, index) => (
              <button
                key={`${index}-${area.type}`}
                type="button"
                onClick={() => removeSelectedArea(index)}
                className="rounded-full border border-border bg-surface-raised px-3 py-1.5 text-xs font-semibold text-ink"
              >
                Area {index + 1} · Remove
              </button>
            ))}
          </div>
        ) : null}

        <div className="jl-field-frame mt-4 space-y-3">
        <label className="field-label font-display text-xs uppercase tracking-[0.1em]">
          City, county, state, or country
          <input
            value={locationQuery}
            onChange={(event) => {
              setLocationQuery(event.target.value);
              setSelectedPlaceId(null);
              setSelectedPlace(null);
              setImportedGameArea(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void handleSearch();
              }
            }}
            className="field-input"
            placeholder="Dublin, Ireland"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            inputMode="search"
          />
        </label>

        <button
          type="button"
          onClick={() => void handleSearch()}
          disabled={searchLoading || importLoading}
          className="btn-secondary w-full disabled:opacity-50"
        >
          {searchLoading ? "Searching…" : "Find place"}
        </button>

        <button
          type="button"
          onClick={addCurrentArea}
          disabled={!previewGameArea || searchLoading || importLoading}
          className="btn-secondary w-full disabled:opacity-50"
        >
          Add another area
        </button>

        <input
          ref={importFileInputRef}
          type="file"
          accept=".kml,.kmz"
          className="hidden"
          onChange={(event) => void handleBoundaryImport(event)}
        />

        <button
          type="button"
          onClick={() => importFileInputRef.current?.click()}
          disabled={searchLoading || importLoading}
          className="btn-secondary w-full disabled:opacity-50"
        >
          {importLoading ? "Importing…" : "Import KML/KMZ"}
        </button>

        {searchResults.length > 0 ? (
          <div className="max-h-40 space-y-1 overflow-y-auto border-2 border-border bg-surface-deep p-1.5">
            {searchResults.map((place) => (
              <button
                key={place.id}
                type="button"
                onClick={() => applyPlace(place)}
                className={`min-h-11 w-full px-3 py-2 text-left text-sm ${
                  selectedPlaceId === place.id
                    ? "bg-highlight-soft font-display font-semibold uppercase tracking-wide text-highlight"
                    : "bg-transparent text-ink hover:bg-surface-raised"
                }`}
              >
                <span className="block">{place.displayName}</span>
                <span className="mt-0.5 block text-xs font-normal normal-case tracking-normal text-ink-dim">
                  {formatPlaceSearchSubtitle(place)}
                </span>
              </button>
            ))}
          </div>
        ) : null}

        {selectedPlace && searchResults.length === 0 ? (
          <p className="text-xs text-ink-dim">
            {formatPlaceSearchSubtitle(selectedPlace)}
          </p>
        ) : null}

        <label className="field-label font-display text-xs uppercase tracking-[0.1em]">
          Transit metro
          <select
            value={transitMetroId}
            onChange={(event) => setTransitMetroOverride(event.target.value)}
            className="field-input"
          >
            <option value="">Auto / none</option>
            {metros.map((metro) => (
              <option key={metro.id} value={metro.id}>
                {metro.label}
              </option>
            ))}
          </select>
        </label>

        {isFirebaseConfigured() ? (
          <div className="space-y-2">
            <p className="font-display text-xs font-semibold uppercase tracking-[0.1em] text-ink-dim">
              Session tier
            </p>
            <div
              role="radiogroup"
              aria-label="Session tier"
              className="space-y-1.5"
            >
              {TIER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={sessionTier === option.value}
                  disabled={loading || verifyingAccess}
                  onClick={() => {
                    setSessionTier(option.value);
                    setAccessCodeError(null);
                  }}
                  className={`min-h-12 w-full border-2 px-3 py-2 text-left disabled:opacity-50 ${
                    sessionTier === option.value
                      ? "border-highlight bg-highlight-soft text-highlight"
                      : "border-border bg-surface-deep text-ink hover:border-brand-blue"
                  }`}
                >
                  <span className="font-display text-sm font-semibold uppercase tracking-wide">
                    {option.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-muted">
                    {option.summary}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <RolePicker
          value={playerRole}
          onChange={setPlayerRole}
          disabled={loading || verifyingAccess}
        />

        <div className="space-y-2">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.1em] text-ink-dim">
            Distance edition
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(["imperial", "metric"] as const).map((unit) => (
              <button
                key={unit}
                type="button"
                disabled={loading || verifyingAccess}
                onClick={() => {
                  setDistanceUnit(unit);
                  setAdvancedSettings(defaultAdvancedSessionSettings(gameSize, unit));
                }}
                className={`min-h-11 border-2 px-3 py-2 text-sm font-semibold disabled:opacity-50 ${
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
          gameArea={previewGameArea}
          value={gameSize}
          distanceUnit={distanceUnit}
          onChange={handleGameSizeChange}
          disabled={loading || verifyingAccess}
        />

        <AdvancedSessionSettings
          gameSize={gameSize}
          distanceUnit={distanceUnit}
          gameArea={previewGameArea}
          value={advancedSettings}
          onChange={setAdvancedSettings}
          disabled={loading || verifyingAccess}
        />
        </div>

        <div
          className={`overflow-hidden motion-safe:transition-[max-height,opacity] motion-safe:duration-200 motion-safe:ease-[cubic-bezier(0.25,1,0.5,1)] motion-reduce:transition-none ${
            showAccessCodeField
              ? "max-h-40 opacity-100"
              : "max-h-0 opacity-0"
          }`}
        >
          <label className="field-label font-display text-xs uppercase tracking-[0.1em]">
            Host access code
            <input
              value={accessCode}
              onChange={(event) => {
                setAccessCode(event.target.value);
                setAccessCodeError(null);
              }}
              type="password"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="done"
              className="field-input"
            />
          </label>
          <p className="mt-1 text-xs text-ink-dim">
            Enter once. Friends join with the game code only.
          </p>
          {accessCodeError ? (
            <p className="text-error mt-2">{accessCodeError}</p>
          ) : null}
        </div>

        </div>

        <div className="sticky bottom-0 shrink-0 border-t border-border bg-surface-deep px-4 pt-3 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={() => void handleConfirm()}
          disabled={loading || verifyingAccess}
          className="btn-primary w-full disabled:opacity-50"
        >
          {confirmLabel}
        </button>
        {error ? <p className="text-error mt-2">{error}</p> : null}
        </div>
      </MobileSheet>
    </div>
  );
}
