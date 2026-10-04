import {
  startTransition,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "react-router-dom";
import { useTimerStore } from "@/state/timerStore";
import {
  canSelectPremiumSessionTier,
  shouldDefaultSessionTierToPremium,
} from "../../domain/billing/premiumProducts";
import { APP_VERSION } from "../../domain/device/changelog";
import { isChunkLoadError } from "../../domain/device/updates/chunkLoadRecovery";
import type { LatLngTuple } from "../../domain/geometry/gameArea/geometry";
import {
  boundingBoxHasMinimumSpan,
  gameAreaToBoundingBox,
  placeToGameArea,
} from "../../domain/geometry/gameArea/geometry";
import { unionGameAreas } from "../../domain/geometry/masks/unionGameAreas";
import { type GameArea, LOCAL_SESSION_ID, type SessionTier } from "../../domain/map/annotations";
import type { DistanceUnit } from "../../domain/map/distance";
import {
  BUNDLED_GAME_PRESET_DEFINITIONS,
  isBundledPresetId,
} from "../../domain/regions/bundledGamePresets";
import { buildBundledPresetSelectGroups } from "../../domain/regions/bundledPresetHierarchy";
import {
  BUNDLED_REGION_PACK_GEO_REVISION,
  type RegionPackId,
} from "../../domain/regions/regionPack";
import { generateLocalCode } from "../../domain/session/meta/sessionCode";
import type { PlayerRole } from "../../domain/session/players/playerRole";
import { gamePresetToCreateSessionDraft } from "../../domain/session/presets/gamePreset";
import { buildFavouritePresetSelectOptions } from "../../domain/session/presets/presetFavourites";
import {
  type GameSize,
  hidingZoneRadiusMeters,
  recommendGameSize,
} from "../../domain/session/size/gameSize";
import {
  defaultAdvancedSessionSettings,
  sessionRulesPatchFromAdvancedSettings,
} from "../../domain/session/tools/advancedSessionSettings";
import { usePremiumEntitlements } from "../../hooks/billing/usePremiumEntitlements";
import { usePremiumHostEligibility } from "../../hooks/billing/usePremiumHostEligibility";
import { useLatestRequest } from "../../hooks/forms/useLatestRequest";
import { useSubmitLock } from "../../hooks/forms/useSubmitLock";
import { useAppNavigate } from "../../hooks/navigation/useAppNavigate";
import { useGameAreaFraming } from "../../hooks/session/useGameAreaFraming";
import { createPremiumRemoteSession } from "../../services/billing/premiumBilling";
import { ANALYTICS_EVENTS, track } from "../../services/core/analytics/analytics";
import { grantAccess, hasAccessClaim } from "../../services/core/auth/accessControl";
import { setPremiumApiContext } from "../../services/core/auth/premiumApiContext";
import { ensureAnonymousUser, isFirebaseConfigured } from "../../services/core/firebase/firebase";
import { requestLocationAccess } from "../../services/core/location/geolocation";
import { retryAsync } from "../../services/core/network/retryAsync";
import { createRemoteSession } from "../../services/firestore/firestoreAnnotations";
import { type GeocodedPlace, searchPlaces } from "../../services/geo/geocoding";
import { loadRegionPackSessionBoundaries } from "../../services/geo/matching/regionPackBoundaries";
import { resolveSessionMatchingAreas } from "../../services/geo/matching/resolveSessionMatchingAreas";
import { emitSessionStartedActivity } from "../../services/session/emitSessionActivity";
import {
  preloadCriticalGameAreaCaches,
  preloadGameAreaCaches,
} from "../../services/session/gameAreaPreload";
import { inferTransitMetroId, listTransitMetros } from "../../services/transit/transitCatalog";
import { useGamePresetStore } from "../../state/gamePresetStore";
import { useMapStore, useSessionStore } from "../../state/sessionStore";
import {
  CreateSessionMapMountAbortedError,
  useCreateSessionMapMount,
} from "./useCreateSessionMapMount";
import { placeToFocusBounds } from "./utils";

const MISSING_GAME_AREA_ERROR =
  "Search for a place, import a boundary, or move the map until the play area is framed.";
const MAP_LOAD_FAILED_ERROR =
  "The map couldn't load. Search for a place or import a boundary instead.";

export function useCreateSession() {
  const navigate = useAppNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { beginRequest, isLatestRequest } = useLatestRequest();
  const { isSubmitting, runLocked } = useSubmitLock();
  const presets = useGamePresetStore((state) => state.presets);
  const favouritePresetIds = useGamePresetStore((state) => state.favouritePresetIds);
  const bundledPresetSelectGroups = useMemo(
    () => buildBundledPresetSelectGroups(BUNDLED_GAME_PRESET_DEFINITIONS),
    [],
  );
  const favouritePresetSelectOptions = useMemo(
    () => buildFavouritePresetSelectOptions(presets, favouritePresetIds),
    [favouritePresetIds, presets],
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
  const mapMount = useCreateSessionMapMount();
  const { requestMap } = mapMount;
  const [framingModalOpen, setFramingModalOpen] = useState(false);
  const [locationQuery, setLocationQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GeocodedPlace[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<GeocodedPlace | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessCodeError, setAccessCodeError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifyingAccess, setVerifyingAccess] = useState(false);
  const [sessionTier, setSessionTier] = useState<SessionTier>("free");
  const [tierManuallySet, setTierManuallySet] = useState(false);
  const [playerRole, setPlayerRole] = useState<PlayerRole>("seeker");
  const [gameSize, setGameSize] = useState<GameSize>("medium");
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>("imperial");
  const [advancedSettings, setAdvancedSettings] = useState(() =>
    defaultAdvancedSessionSettings("medium", "imperial"),
  );
  const [accessCode, setAccessCode] = useState("");
  const [regionPackId, setRegionPackId] = useState<RegionPackId | undefined>();
  const [regionPackSubregionId, setRegionPackSubregionId] = useState<string | undefined>();
  const [hostHasAccessClaim, setHostHasAccessClaim] = useState(false);
  const [hostAuthReady, setHostAuthReady] = useState(() => !isFirebaseConfigured());
  const [hostAuthError, setHostAuthError] = useState<string | null>(null);
  const { entitlements: premiumEntitlements, refresh: refreshPremiumEntitlements } =
    usePremiumEntitlements();
  const [accessCodeExpanded, setAccessCodeExpanded] = useState(false);
  const handleGameSizeChange = useCallback(
    (size: GameSize) => {
      startTransition(() => {
        setGameSize(size);
        setAdvancedSettings((current) => ({
          ...defaultAdvancedSessionSettings(size, distanceUnit),
          ...current,
          hidingZoneRadiusMeters: hidingZoneRadiusMeters(size, distanceUnit),
        }));
      });
    },
    [distanceUnit],
  );
  const metros = useMemo(() => listTransitMetros(), []);
  const [importedGameArea, setImportedGameArea] = useState<GameArea | null>(null);
  const [selectedAreas, setSelectedAreas] = useState<GameArea[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const userLocationRef = useRef<LatLngTuple | null>(null);
  const appliedPresetRef = useRef<string | null>(null);
  const presetApplyGenerationRef = useRef(0);
  const [transitMetroOverride, setTransitMetroOverride] = useState<string | null>(null);

  useEffect(() => {
    const presetId = searchParams.get("preset");
    if (!presetId) {
      appliedPresetRef.current = null;
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
    const applyGeneration = ++presetApplyGenerationRef.current;
    const draft = gamePresetToCreateSessionDraft(preset);
    const applyPreset = async () => {
      requestMap();
      let customMatchingAreas =
        draft.customMatchingAreas ?? draft.advancedSettings.customMatchingAreas;
      let gameArea = draft.gameArea ?? null;
      const subregionId = draft.subregionId ?? draft.councilFilter;
      const unit = draft.distanceUnit;

      if (draft.regionPackId) {
        setRegionPackId(draft.regionPackId);
        setRegionPackSubregionId(subregionId);
        try {
          const boundaries = await loadRegionPackSessionBoundaries(draft.regionPackId, subregionId);
          if (applyGeneration !== presetApplyGenerationRef.current) {
            return;
          }
          customMatchingAreas = boundaries.customMatchingAreas;
          gameArea = boundaries.playArea;
        } catch (loadError) {
          if (applyGeneration !== presetApplyGenerationRef.current) {
            return;
          }
          setError(
            loadError instanceof Error ? loadError.message : "Couldn't load region boundary data.",
          );
        }
      } else {
        setRegionPackId(undefined);
        setRegionPackSubregionId(undefined);
      }

      if (applyGeneration !== presetApplyGenerationRef.current) {
        return;
      }

      const resolvedGameSize = gameArea ? recommendGameSize(gameArea, unit) : draft.gameSize;
      const resolvedAdvanced = {
        ...defaultAdvancedSessionSettings(resolvedGameSize, unit),
        ...draft.advancedSettings,
        customMatchingAreas,
        customCategories: draft.customCategories ?? draft.advancedSettings.customCategories,
        customLocationPins: draft.customLocationPins ?? draft.advancedSettings.customLocationPins,
        hidingZoneRadiusMeters: hidingZoneRadiusMeters(resolvedGameSize, unit),
      };

      setGameSize(resolvedGameSize);
      setDistanceUnit(unit);
      setAdvancedSettings(resolvedAdvanced);
      if (draft.transitMetroId) {
        setTransitMetroOverride(draft.transitMetroId);
      }
      if (draft.sessionTier) {
        setTierManuallySet(true);
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
  }, [framing.applyFocusToGameArea, presets, requestMap, searchParams]);

  const requestLocationBias = useCallback(() => {
    void requestLocationAccess({ highAccuracy: false, userGesture: true })
      .then((reading) => {
        userLocationRef.current = [reading.lat, reading.lng];
      })
      .catch(() => {
        // Best-effort location bias only; search works without GPS.
      });
  }, []);

  const bootstrapHostAuth = useCallback(async () => {
    if (!isFirebaseConfigured()) {
      return;
    }

    setHostAuthError(null);
    try {
      const user = await ensureAnonymousUser();
      setHostHasAccessClaim(await hasAccessClaim(user));
      setHostAuthReady(true);
    } catch {
      setHostHasAccessClaim(false);
      setHostAuthReady(false);
      setHostAuthError("Couldn't sign in to create a session. Tap Retry.");
    }
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
        setHostAuthReady(true);
        setHostAuthError(null);
      } catch {
        if (!cancelled) {
          setHostHasAccessClaim(false);
          setHostAuthReady(false);
          setHostAuthError("Couldn't sign in to create a session. Tap Retry.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const retryHostAuth = useCallback(() => {
    void bootstrapHostAuth();
  }, [bootstrapHostAuth]);

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
  const [transitMetroInferenceSeed, setTransitMetroInferenceSeed] =
    useState(inferredTransitMetroId);

  useEffect(() => {
    if (inferredTransitMetroId !== transitMetroInferenceSeed) {
      setTransitMetroInferenceSeed(inferredTransitMetroId);
      setTransitMetroOverride(null);
    }
  }, [inferredTransitMetroId, transitMetroInferenceSeed]);

  const transitMetroId = transitMetroOverride ?? inferredTransitMetroId;
  const canSelectPremiumTier = canSelectPremiumSessionTier(premiumEntitlements, hostHasAccessClaim);
  const autoSessionTier = useMemo((): SessionTier => {
    if (searchParams.get("tier") === "premium" && canSelectPremiumTier) {
      return "premium";
    }

    if (shouldDefaultSessionTierToPremium(premiumEntitlements, hostHasAccessClaim)) {
      return "premium";
    }

    return "free";
  }, [canSelectPremiumTier, hostHasAccessClaim, premiumEntitlements, searchParams]);
  const activeSessionTier = tierManuallySet ? sessionTier : autoSessionTier;
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
    sessionTier: activeSessionTier,
    premiumEntitlements,
    hostHasAccessClaim,
  });
  const showAccessCodeField = showPremiumUnlockPanel && accessCodeExpanded;

  const previewGameArea = useMemo(() => {
    if (importedGameArea) {
      return importedGameArea;
    }

    if (selectedPlace && !framing.userFramed) {
      return placeToGameArea(selectedPlace);
    }

    return framing.manualGameArea;
  }, [framing.manualGameArea, framing.userFramed, importedGameArea, selectedPlace]);

  const manualFramingActive = !importedGameArea && (!selectedPlace || framing.userFramed);

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

    requestMap();
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
    requestMap();
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
    requestMap();
    setImportedGameArea(null);
    setSelectedPlaceId(place.id);
    setSelectedPlace(place);
    setSearchResults([]);
    setLocationQuery(place.displayName);
    framing.resetManualFraming();
    framing.applyFocusToGameArea(placeToGameArea(place));
    setError(null);
  };

  const handleBoundaryImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    // Start constructing the map while the importer chunk and file parse run.
    requestMap();
    setImportLoading(true);
    setError(null);

    try {
      // Dynamic: jszip / @xmldom/xmldom / @tmcw/togeojson stay off the /create route chunk.
      const { parseBoundaryFile } = await import("../../services/core/capture/kmzImport");
      const gameArea = await parseBoundaryFile(file);
      applyImportedBoundary(gameArea, file.name);
    } catch (nextError) {
      setError(
        isChunkLoadError(nextError)
          ? "Couldn't load the importer. Check your connection and try again."
          : nextError instanceof Error
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

    // Start constructing the map in parallel with the geocoder round trip.
    requestMap();
    const requestId = beginRequest();
    setSearchLoading(true);
    setError(null);

    try {
      const results = await searchPlaces(
        trimmed,
        userLocationRef.current ? { near: userLocationRef.current } : undefined,
      );
      if (!isLatestRequest(requestId)) {
        return;
      }
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
      if (!isLatestRequest(requestId)) {
        return;
      }
      setError(nextError instanceof Error ? nextError.message : "Place search failed.");
    } finally {
      if (isLatestRequest(requestId)) {
        setSearchLoading(false);
      }
    }
  };

  const hasExplicitGameArea = Boolean(importedGameArea || framing.manualGameArea || selectedPlace);

  const confirmSession = async () => {
    if (!hasExplicitGameArea) {
      setError(MISSING_GAME_AREA_ERROR);
      return;
    }

    setLoading(true);
    setError(null);
    setAccessCodeError(null);

    try {
      const manualArea =
        framing.userFramed &&
        framing.manualGameArea &&
        boundingBoxHasMinimumSpan(gameAreaToBoundingBox(framing.manualGameArea))
          ? framing.manualGameArea
          : null;
      const draftArea = importedGameArea
        ? importedGameArea
        : manualArea
          ? manualArea
          : selectedPlace
            ? placeToGameArea(selectedPlace)
            : framing.manualGameArea;

      const areasForSession = draftArea ? [...selectedAreas, draftArea] : selectedAreas;

      const gameArea =
        areasForSession.length === 0
          ? null
          : areasForSession.length === 1
            ? areasForSession[0]!
            : unionGameAreas(areasForSession);

      if (!gameArea) {
        setError(MISSING_GAME_AREA_ERROR);
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
            nextError instanceof Error ? nextError.message : "Invalid access code.",
          );
          return;
        } finally {
          setVerifyingAccess(false);
        }
      }

      const rulesPatch = {
        ...sessionRulesPatchFromAdvancedSettings(gameSize, advancedSettings, distanceUnit),
        ...(regionPackId
          ? {
              regionPackId,
              bundledGeoRevision: BUNDLED_REGION_PACK_GEO_REVISION,
              ...(regionPackSubregionId ? { regionPackSubregionId } : {}),
            }
          : {}),
        ...(selectedPlace?.displayName?.trim() || locationQuery.trim()
          ? {
              gameAreaLabel: selectedPlace?.displayName.trim() || locationQuery.trim(),
            }
          : {}),
      };
      if (regionPackId) {
        delete rulesPatch.customMatchingAreas;
      }

      if (isFirebaseConfigured()) {
        const user = await retryAsync(() => ensureAnonymousUser());
        const premiumSubmitError = validatePremiumHostSubmit(user, tier, useAccessClaimForPremium);
        if (premiumSubmitError) {
          setError(premiumSubmitError);
          return;
        }

        const usePremiumCallable =
          tier === "premium" && !useAccessClaimForPremium && paidPremiumHost;
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
        emitSessionStartedActivity(session.id, user.uid);
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
            rulesPatch.hidingZoneRadiusMeters ?? hidingZoneRadiusMeters(gameSize, distanceUnit),
        };
        // Local id is fixed and the timer now persists in localStorage: drop an
        // abandoned local game's timer so the new game starts at zero.
        useTimerStore.getState().clearTimer(LOCAL_SESSION_ID);
        setSession(localSession, "local");
        setPremiumApiContext(localSession);
        emitSessionStartedActivity(LOCAL_SESSION_ID, "local");
      }

      track(ANALYTICS_EVENTS.session_created, {
        tier: isFirebaseConfigured() ? tier : "free",
        gameSize,
        role: playerRole,
      });

      if (!lowPowerMode) {
        const matchingAreas = await resolveSessionMatchingAreas({
          regionPackId,
          regionPackSubregionId,
          customMatchingAreas: regionPackId ? undefined : advancedSettings.customMatchingAreas,
        });
        preloadGameAreaCaches(gameArea, matchingAreas, regionPackId, tier);
        // Dynamic: submit-only sea-level sampling stays off the /create route chunk.
        void import("../../services/geo/elevation/seaLevelProgressive")
          .then(({ startSeaLevelBackgroundSampling }) => {
            startSeaLevelBackgroundSampling(gameArea, { regionPackId });
          })
          .catch(() => {
            // Head start only; /map restarts sampling on mount (deduped).
          });
        void preloadCriticalGameAreaCaches(gameArea, matchingAreas, regionPackId);
      }
      navigate("/map");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Couldn't create session.");
    } finally {
      setLoading(false);
    }
  };

  // Confirm may await map mount; the continuation must read the post-mount
  // render's framing state, not this render's closure.
  const confirmSessionRef = useRef(confirmSession);
  useLayoutEffect(() => {
    confirmSessionRef.current = confirmSession;
  });

  const handleConfirm = () =>
    void runLocked(async () => {
      if (!hasExplicitGameArea) {
        try {
          // Rectangle framing reads the live viewport (default view included).
          await mapMount.ensureMapMounted();
        } catch (mountError) {
          if (!(mountError instanceof CreateSessionMapMountAbortedError)) {
            setError(MAP_LOAD_FAILED_ERROR);
          }
          return;
        }
      }
      await confirmSessionRef.current();
    });

  const confirmBusy = loading || isSubmitting;
  const confirmLabel = verifyingAccess
    ? "Verifying…"
    : confirmBusy
      ? "Creating…"
      : "Confirm game area";

  const handleLocationQueryChange = (value: string) => {
    setLocationQuery(value);
    setSelectedPlaceId(null);
    setSelectedPlace(null);
    setImportedGameArea(null);
  };

  const handleFramingModeChange = (mode: Parameters<typeof framing.setFramingMode>[0]) => {
    // Circle / polygon framing is driven by taps on the live map.
    requestMap();
    setImportedGameArea(null);
    framing.setFramingMode(mode);
  };

  const handleFramingModalConfirm = (result: Parameters<typeof framing.loadFramingResult>[0]) => {
    requestMap();
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

  const handlePlayerRoleChange = useCallback((role: PlayerRole) => {
    startTransition(() => {
      setPlayerRole(role);
    });
  }, []);

  const handleSessionTierChange = (tier: SessionTier) => {
    startTransition(() => {
      setTierManuallySet(true);
      setSessionTier(tier);
      setAccessCodeError(null);
    });
  };

  const handleDistanceUnitChange = (unit: DistanceUnit) => {
    startTransition(() => {
      setDistanceUnit(unit);
      setAdvancedSettings(defaultAdvancedSessionSettings(gameSize, unit));
    });
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
    favouritePresetSelectOptions,
    userPresets,
    loading: confirmBusy,
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
    // Latched: every path that produces an area calls requestMap(), so the map
    // never tears down back to the facade when an area is cleared.
    mapRequested: mapMount.mapRequested,
    mapMounted: mapMount.mapMounted,
    requestMap,
    handleMapMounted: mapMount.handleMapMounted,
    mapFocusBounds,
    mapPreviewGameArea,
    transitMetroId,
    regionPackId,
    regionPackSubregionId,
    metros,
    setTransitMetroOverride,
    playerRole,
    handlePlayerRoleChange,
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
    hostAuthReady,
    hostAuthError,
    retryHostAuth,
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
    requestLocationBias,
  };
}
