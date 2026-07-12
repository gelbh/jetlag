import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useAppNavigate } from "../../hooks/useAppNavigate";
import { useGameAreaFraming } from "../../hooks/session/useGameAreaFraming";
import {
  LOCAL_SESSION_ID,
  type GameArea,
  type SessionTier,
} from "../../domain/map/annotations";
import type { LatLngTuple } from "../../domain/geometry/geometry";
import {
  boundingBoxHasMinimumSpan,
  gameAreaToBoundingBox,
  placeToGameArea,
} from "../../domain/geometry/geometry";
import { generateLocalCode } from "../../domain/session/sessionCode";
import type { DistanceUnit } from "../../domain/map/distance";
import {
  hidingZoneRadiusMeters,
  recommendGameSize,
  type GameSize,
} from "../../domain/session/gameSize";
import type { PlayerRole } from "../../domain/session/playerRole";
import {
  defaultAdvancedSessionSettings,
  sessionRulesPatchFromAdvancedSettings,
} from "../../domain/session/advancedSessionSettings";
import { useSessionStore, useMapStore } from "../../state/sessionStore";
import {
  isFirebaseConfigured,
  ensureAnonymousUser,
} from "../../services/core/firebase";
import { usePremiumHostEligibility } from "../../hooks/billing/usePremiumHostEligibility";
import { usePremiumEntitlements } from "../../hooks/billing/usePremiumEntitlements";
import { createRemoteSession } from "../../services/firestore/firestoreAnnotations";
import {
  preloadCriticalGameAreaCaches,
  preloadGameAreaCaches,
} from "../../services/session/gameAreaPreload";
import { resolveSessionMatchingAreas } from "../../services/geo/resolveSessionMatchingAreas";
import { startSeaLevelBackgroundSampling } from "../../services/geo/seaLevelProgressive";
import { retryAsync } from "../../services/core/retryAsync";
import {
  inferTransitMetroId,
  listTransitMetros,
} from "../../services/transit/transitCatalog";
import { searchPlaces, type GeocodedPlace } from "../../services/geo/geocoding";
import { getCurrentPosition } from "../../services/core/geolocation";
import { APP_VERSION } from "../../domain/device/changelog";
import { grantAccess, hasAccessClaim } from "../../services/core/accessControl";
import {
  createPremiumRemoteSession,
} from "../../services/billing/premiumBilling";
import { setPremiumApiContext } from "../../services/core/premiumApiContext";
import { unionGameAreas } from "../../domain/geometry/unionGameAreas";
import { parseBoundaryFile } from "../../services/core/kmzImport";
import { gamePresetToCreateSessionDraft } from "../../domain/session/gamePreset";
import { useGamePresetStore } from "../../state/gamePresetStore";
import {
  BUNDLED_REGION_PACK_GEO_REVISION,
  type RegionPackId,
} from "../../domain/regions/regionPack";
import { loadRegionPackSessionBoundaries } from "../../services/geo/regionPackBoundaries";
import {
  BUNDLED_GAME_PRESET_DEFINITIONS,
  isBundledPresetId,
} from "../../domain/regions/bundledGamePresets";
import { buildBundledPresetSelectGroups } from "../../domain/regions/bundledPresetHierarchy";
import { placeToFocusBounds } from "./utils";

export function useCreateSession() {
  const navigate = useAppNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const presets = useGamePresetStore((state) => state.presets);
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
  const [regionPackSubregionId, setRegionPackSubregionId] = useState<
    string | undefined
  >();
  const [hostHasAccessClaim, setHostHasAccessClaim] = useState(false);
  const { entitlements: premiumEntitlements, refresh: refreshPremiumEntitlements } =
    usePremiumEntitlements();
  const [accessCodeExpanded, setAccessCodeExpanded] = useState(false);
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
  const [transitMetroOverride, setTransitMetroOverride] = useState<
    string | null
  >(null);

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
      const subregionId = draft.subregionId ?? draft.councilFilter;
      const unit = draft.distanceUnit;

      if (draft.regionPackId) {
        setRegionPackId(draft.regionPackId);
        setRegionPackSubregionId(subregionId);
        try {
          const boundaries = await loadRegionPackSessionBoundaries(
            draft.regionPackId,
            subregionId,
          );
          customMatchingAreas = boundaries.customMatchingAreas;
          gameArea = boundaries.playArea;
        } catch (loadError) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Couldn't load region boundary data.",
          );
        }
      } else {
        setRegionPackId(undefined);
        setRegionPackSubregionId(undefined);
      }

      const resolvedGameSize = gameArea
        ? recommendGameSize(gameArea, unit)
        : draft.gameSize;
      const resolvedAdvanced = {
        ...defaultAdvancedSessionSettings(resolvedGameSize, unit),
        ...draft.advancedSettings,
        customMatchingAreas,
        customCategories:
          draft.customCategories ?? draft.advancedSettings.customCategories,
        customLocationPins:
          draft.customLocationPins ?? draft.advancedSettings.customLocationPins,
        hidingZoneRadiusMeters: hidingZoneRadiusMeters(resolvedGameSize, unit),
      };

      setGameSize(resolvedGameSize);
      setDistanceUnit(unit);
      setAdvancedSettings(resolvedAdvanced);
      if (draft.transitMetroId) {
        setTransitMetroOverride(draft.transitMetroId);
      }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- apply preset once per preset id; framing stable via hook
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
  const {
    packCreditsLabel,
    packPremiumFlow,
    paidPremiumHost,
    resolvedSessionTier,
    requiresPremiumSignIn,
    showPremiumUnlockPanel,
    visibleTierOptions,
    resolveSubmitTier,
    validatePremiumHostSubmit,
  } = usePremiumHostEligibility({
    searchParams,
    setSearchParams,
    sessionTier,
    premiumEntitlements,
    hostHasAccessClaim,
  });
  const showAccessCodeField =
    showPremiumUnlockPanel && accessCodeExpanded;

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
  }, [framing, importedGameArea, selectedPlace]);

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
      const tier = resolveSubmitTier();
      let useAccessClaimForPremium = hostHasAccessClaim;

      if (tier === "premium" && !useAccessClaimForPremium && !paidPremiumHost) {
        const trimmedCode = accessCode.trim();
        if (!trimmedCode) {
          setAccessCodeError("Unlock premium or enter a host access code.");
          return;
        }

        setVerifyingAccess(true);
        try {
          await grantAccess(trimmedCode);
          setHostHasAccessClaim(true);
          useAccessClaimForPremium = true;
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
        ...(regionPackId
          ? {
              regionPackId,
              bundledGeoRevision: BUNDLED_REGION_PACK_GEO_REVISION,
              ...(regionPackSubregionId
                ? { regionPackSubregionId }
                : {}),
            }
          : {}),
      };
      if (regionPackId) {
        delete rulesPatch.customMatchingAreas;
      }

      if (isFirebaseConfigured()) {
        const user = await retryAsync(() => ensureAnonymousUser());
        const premiumSubmitError = validatePremiumHostSubmit(
          user,
          tier,
          useAccessClaimForPremium,
        );
        if (premiumSubmitError) {
          setError(premiumSubmitError);
          return;
        }

        const usePremiumCallable =
          tier === "premium" &&
          !useAccessClaimForPremium &&
          paidPremiumHost;
        const session = usePremiumCallable
          ? await retryAsync(() =>
              createPremiumRemoteSession({
                gameArea,
                hostUid: user.uid,
                tier,
                transitMetroId: metroId,
                hostRole: playerRole,
                gameSize,
                rulesPatch,
                distanceUnit,
                hostAppVersion: APP_VERSION,
              }),
            )
          : await retryAsync(() =>
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
        const matchingAreas = await resolveSessionMatchingAreas({
          regionPackId,
          regionPackSubregionId,
          customMatchingAreas: regionPackId
            ? undefined
            : advancedSettings.customMatchingAreas,
        });
        preloadGameAreaCaches(
          gameArea,
          matchingAreas,
          regionPackId,
          tier,
        );
        startSeaLevelBackgroundSampling(gameArea);
        if (navigator.onLine) {
          void preloadCriticalGameAreaCaches(
            gameArea,
            matchingAreas,
            regionPackId,
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

  const handleLocationQueryChange = (value: string) => {
    setLocationQuery(value);
    setSelectedPlaceId(null);
    setSelectedPlace(null);
    setImportedGameArea(null);
  };

  const handleFramingModeChange = (mode: Parameters<typeof framing.setFramingMode>[0]) => {
    setImportedGameArea(null);
    framing.setFramingMode(mode);
  };

  const handleFramingModalConfirm = (result: Parameters<typeof framing.loadFramingResult>[0]) => {
    if (framing.userFramed) {
      setImportedGameArea(null);
      setSelectedPlaceId(null);
      setSelectedPlace(null);
    }
    framing.loadFramingResult(result);
  };

  const handleAccessCodeChange = (value: string) => {
    setAccessCode(value);
    setAccessCodeError(null);
  };

  const handleSessionTierChange = (tier: SessionTier) => {
    setSessionTier(tier);
    setAccessCodeError(null);
  };

  const handleDistanceUnitChange = (unit: DistanceUnit) => {
    setDistanceUnit(unit);
    setAdvancedSettings(defaultAdvancedSessionSettings(gameSize, unit));
  };

  const handlePremiumSignedIn = () => {
    void refreshPremiumEntitlements();
  };

  return {
    navigate,
    mapStyle,
    setMapStyle,
    framing,
    framingModalOpen,
    setFramingModalOpen,
    bundledPresetSelectGroups,
    userPresets,
    loading,
    verifyingAccess,
    searchLoading,
    importLoading,
    importFileInputRef,
    locationQuery,
    searchResults,
    selectedPlaceId,
    selectedPlace,
    selectedAreas,
    previewGameArea,
    manualFramingActive,
    mapFocusBounds,
    mapPreviewGameArea,
    transitMetroId,
    metros,
    setTransitMetroOverride,
    playerRole,
    setPlayerRole,
    gameSize,
    distanceUnit,
    advancedSettings,
    setAdvancedSettings,
    sessionTier,
    premiumEntitlements,
    accessCode,
    accessCodeError,
    accessCodeExpanded,
    setAccessCodeExpanded,
    error,
    confirmLabel,
    resolvedSessionTier,
    visibleTierOptions,
    packCreditsLabel,
    packPremiumFlow,
    requiresPremiumSignIn,
    showPremiumUnlockPanel,
    showAccessCodeField,
    handleGameSizeChange,
    handleUserViewportFramed,
    addCurrentArea,
    removeSelectedArea,
    handleBoundaryImport,
    handleSearch,
    handleConfirm,
    applyPlace,
    handleLocationQueryChange,
    handleFramingModeChange,
    handleFramingModalConfirm,
    handleAccessCodeChange,
    handleSessionTierChange,
    handleDistanceUnitChange,
    handlePremiumSignedIn,
  };
}
